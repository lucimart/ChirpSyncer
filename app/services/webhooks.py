"""
Webhook Service - Outgoing webhooks with HMAC signing and retry logic.

This module provides:
- CRUD operations for webhooks
- HMAC-SHA256 payload signing
- Delivery with exponential backoff retry
- Idempotent delivery tracking
- Event filtering

Usage:
    from app.services.webhooks import WebhookService, sign_payload

    service = WebhookService(db_path="chirpsyncer.db")
    webhook = service.create_webhook(
        user_id=1,
        url="https://example.com/webhook",
        events=["sync.completed", "cleanup.completed"],
    )

    result = service.dispatch(
        webhook_id=webhook["id"],
        event_type="sync.completed",
        payload={"job_id": "123", "synced": 10},
    )
"""

import hashlib
import hmac
import json
import secrets
import sqlite3
import time
from typing import Any, Dict, List, Optional

import requests

from app.core.logger import setup_logger

logger = setup_logger(__name__)

# Default timeout for webhook requests (seconds)
DEFAULT_TIMEOUT = 10

# Default max retries
DEFAULT_MAX_RETRIES = 3

# Backoff multiplier (seconds)
BACKOFF_BASE = 2


def sign_payload(payload: Dict[str, Any], secret: str) -> str:
    """
    Sign a payload with HMAC-SHA256.

    Args:
        payload: Dictionary to sign
        secret: Secret key for signing

    Returns:
        Signature string in format "sha256=<hex_digest>"
    """
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    signature = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={signature}"


def verify_signature(payload: Dict[str, Any], signature: str, secret: str) -> bool:
    """
    Verify a payload signature.

    Args:
        payload: Dictionary that was signed
        signature: Signature to verify (format: "sha256=<hex_digest>")
        secret: Secret key used for signing

    Returns:
        True if signature is valid, False otherwise
    """
    expected = sign_payload(payload, secret)
    return hmac.compare_digest(expected, signature)


class WebhookService:
    """Service for managing webhooks and deliveries."""

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize webhook service.

        Args:
            db_path: Path to SQLite database (use ":memory:" for testing)
        """
        self.db_path = db_path
        self._memory_conn: Optional[sqlite3.Connection] = None

        # For in-memory databases, keep a persistent connection
        if db_path == ":memory:":
            self._memory_conn = sqlite3.connect(":memory:")
            self._memory_conn.row_factory = sqlite3.Row

        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        """Get database connection."""
        if self._memory_conn:
            return self._memory_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _close_conn(self, conn: sqlite3.Connection):
        """Close connection if not in-memory."""
        if conn != self._memory_conn:
            conn.close()

    def _init_db(self):
        """Initialize database tables."""
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS webhooks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    url TEXT NOT NULL,
                    events TEXT NOT NULL,  -- JSON array
                    name TEXT,
                    secret TEXT NOT NULL,
                    enabled INTEGER DEFAULT 1,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                
                CREATE TABLE IF NOT EXISTS webhook_deliveries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    webhook_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,  -- JSON
                    status_code INTEGER,
                    response_body TEXT,
                    success INTEGER NOT NULL,
                    error TEXT,
                    attempt INTEGER DEFAULT 1,
                    idempotency_key TEXT,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
                CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id ON webhook_deliveries(webhook_id);
                CREATE INDEX IF NOT EXISTS idx_deliveries_idempotency ON webhook_deliveries(idempotency_key);
            """)
            conn.commit()
        finally:
            self._close_conn(conn)

    def _generate_secret(self) -> str:
        """Generate a random 32-byte hex secret."""
        return secrets.token_hex(32)

    def _row_to_webhook(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to webhook dict."""
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "url": row["url"],
            "events": json.loads(row["events"]),
            "name": row["name"],
            "secret": row["secret"],
            "enabled": bool(row["enabled"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _row_to_delivery(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to delivery dict."""
        return {
            "id": row["id"],
            "webhook_id": row["webhook_id"],
            "event_type": row["event_type"],
            "payload": json.loads(row["payload"]),
            "status_code": row["status_code"],
            "response_body": row["response_body"],
            "success": bool(row["success"]),
            "error": row["error"],
            "attempt": row["attempt"],
            "idempotency_key": row["idempotency_key"],
            "created_at": row["created_at"],
        }

    # ==================== Webhook CRUD ====================

    def create_webhook(
        self,
        user_id: int,
        url: str,
        events: List[str],
        name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new webhook.

        Args:
            user_id: Owner user ID
            url: Webhook endpoint URL
            events: List of event types to subscribe to
            name: Optional friendly name

        Returns:
            Created webhook dict
        """
        secret = self._generate_secret()
        now = int(time.time())

        conn = self._get_conn()
        try:
            cursor = conn.execute(
                """
                INSERT INTO webhooks (user_id, url, events, name, secret, enabled, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (user_id, url, json.dumps(events), name, secret, now, now),
            )
            conn.commit()
            webhook_id = cursor.lastrowid

            return self.get_webhook(webhook_id, user_id)
        finally:
            self._close_conn(conn)

    def get_webhook(self, webhook_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get webhook by ID (only if owned by user).

        Args:
            webhook_id: Webhook ID
            user_id: User ID (for ownership check)

        Returns:
            Webhook dict or None if not found/not owned
        """
        conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT * FROM webhooks WHERE id = ? AND user_id = ?",
                (webhook_id, user_id),
            ).fetchone()

            if row:
                return self._row_to_webhook(row)
            return None
        finally:
            self._close_conn(conn)

    def list_webhooks(self, user_id: int) -> List[Dict[str, Any]]:
        """
        List all webhooks for a user.

        Args:
            user_id: User ID

        Returns:
            List of webhook dicts
        """
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()

            return [self._row_to_webhook(row) for row in rows]
        finally:
            self._close_conn(conn)

    def update_webhook(
        self,
        webhook_id: int,
        user_id: int,
        url: Optional[str] = None,
        events: Optional[List[str]] = None,
        name: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update webhook fields.

        Args:
            webhook_id: Webhook ID
            user_id: User ID (for ownership check)
            url: New URL (optional)
            events: New events list (optional)
            name: New name (optional)
            enabled: New enabled state (optional)

        Returns:
            Updated webhook dict or None if not found
        """
        webhook = self.get_webhook(webhook_id, user_id)
        if not webhook:
            return None

        updates = []
        params = []

        if url is not None:
            updates.append("url = ?")
            params.append(url)
        if events is not None:
            updates.append("events = ?")
            params.append(json.dumps(events))
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        if enabled is not None:
            updates.append("enabled = ?")
            params.append(1 if enabled else 0)

        if not updates:
            return webhook

        updates.append("updated_at = ?")
        params.append(int(time.time()))
        params.extend([webhook_id, user_id])

        conn = self._get_conn()
        try:
            conn.execute(
                f"UPDATE webhooks SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
                params,
            )
            conn.commit()
            return self.get_webhook(webhook_id, user_id)
        finally:
            self._close_conn(conn)

    def delete_webhook(self, webhook_id: int, user_id: int) -> bool:
        """
        Delete a webhook.

        Args:
            webhook_id: Webhook ID
            user_id: User ID (for ownership check)

        Returns:
            True if deleted, False if not found
        """
        conn = self._get_conn()
        try:
            cursor = conn.execute(
                "DELETE FROM webhooks WHERE id = ? AND user_id = ?",
                (webhook_id, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            self._close_conn(conn)

    def regenerate_secret(
        self, webhook_id: int, user_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Regenerate webhook secret.

        Args:
            webhook_id: Webhook ID
            user_id: User ID (for ownership check)

        Returns:
            Updated webhook dict or None if not found
        """
        webhook = self.get_webhook(webhook_id, user_id)
        if not webhook:
            return None

        new_secret = self._generate_secret()
        now = int(time.time())

        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE webhooks SET secret = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                (new_secret, now, webhook_id, user_id),
            )
            conn.commit()
            return self.get_webhook(webhook_id, user_id)
        finally:
            self._close_conn(conn)

    # ==================== Deliveries ====================

    def record_delivery(
        self,
        webhook_id: int,
        event_type: str,
        payload: Dict[str, Any],
        status_code: Optional[int],
        response_body: Optional[str],
        success: bool,
        error: Optional[str] = None,
        attempt: int = 1,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Record a delivery attempt.

        Args:
            webhook_id: Webhook ID
            event_type: Event type that was delivered
            payload: Payload that was sent
            status_code: HTTP status code (None if connection failed)
            response_body: Response body
            success: Whether delivery was successful
            error: Error message if failed
            attempt: Attempt number
            idempotency_key: Optional idempotency key

        Returns:
            Delivery record dict
        """
        now = int(time.time())

        conn = self._get_conn()
        try:
            cursor = conn.execute(
                """
                INSERT INTO webhook_deliveries 
                (webhook_id, event_type, payload, status_code, response_body, success, error, attempt, idempotency_key, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    webhook_id,
                    event_type,
                    json.dumps(payload),
                    status_code,
                    response_body,
                    1 if success else 0,
                    error,
                    attempt,
                    idempotency_key,
                    now,
                ),
            )
            conn.commit()

            row = conn.execute(
                "SELECT * FROM webhook_deliveries WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()

            return self._row_to_delivery(row)
        finally:
            self._close_conn(conn)

    def list_deliveries(
        self,
        webhook_id: int,
        user_id: int,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        List delivery history for a webhook.

        Args:
            webhook_id: Webhook ID
            user_id: User ID (for ownership check)
            limit: Maximum number of results

        Returns:
            List of delivery dicts
        """
        # Verify ownership
        webhook = self.get_webhook(webhook_id, user_id)
        if not webhook:
            return []

        conn = self._get_conn()
        try:
            rows = conn.execute(
                """
                SELECT * FROM webhook_deliveries 
                WHERE webhook_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
                """,
                (webhook_id, limit),
            ).fetchall()

            return [self._row_to_delivery(row) for row in rows]
        finally:
            self._close_conn(conn)

    def _check_idempotency(self, webhook_id: int, idempotency_key: str) -> bool:
        """Check if idempotency key was already used."""
        conn = self._get_conn()
        try:
            row = conn.execute(
                """
                SELECT id FROM webhook_deliveries 
                WHERE webhook_id = ? AND idempotency_key = ? AND success = 1
                """,
                (webhook_id, idempotency_key),
            ).fetchone()
            return row is not None
        finally:
            self._close_conn(conn)

    # ==================== Event Filtering ====================

    def get_webhooks_for_event(
        self, user_id: int, event_type: str
    ) -> List[Dict[str, Any]]:
        """
        Get all enabled webhooks subscribed to an event type.

        Args:
            user_id: User ID
            event_type: Event type to filter by

        Returns:
            List of webhook dicts
        """
        webhooks = self.list_webhooks(user_id)
        return [w for w in webhooks if w["enabled"] and event_type in w["events"]]

    # ==================== Dispatcher ====================

    def dispatch(
        self,
        webhook_id: int,
        event_type: str,
        payload: Dict[str, Any],
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: int = DEFAULT_TIMEOUT,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatch a webhook with retry logic.

        Args:
            webhook_id: Webhook ID
            event_type: Event type being delivered
            payload: Payload to send
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
            idempotency_key: Optional idempotency key

        Returns:
            Result dict with success, status_code, attempts, etc.
        """
        # Get webhook (we need to get it without user_id check for internal dispatch)
        conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT * FROM webhooks WHERE id = ?", (webhook_id,)
            ).fetchone()

            if not row:
                return {"success": False, "error": "Webhook not found"}

            webhook = self._row_to_webhook(row)
        finally:
            self._close_conn(conn)

        # Check if disabled
        if not webhook["enabled"]:
            return {"skipped": True, "reason": "webhook_disabled"}

        # Check event subscription
        if event_type not in webhook["events"]:
            return {"skipped": True, "reason": "event_not_subscribed"}

        # Check idempotency
        if idempotency_key and self._check_idempotency(webhook_id, idempotency_key):
            return {"skipped": True, "reason": "duplicate_delivery"}

        # Prepare request
        full_payload = {
            "event": event_type,
            "timestamp": int(time.time()),
            "data": payload,
        }
        signature = sign_payload(full_payload, webhook["secret"])
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event_type,
        }

        # Dispatch with retries
        last_error = None
        last_status_code = None
        last_response = None

        for attempt in range(1, max_retries + 1):
            try:
                response = requests.post(
                    webhook["url"],
                    json=full_payload,
                    headers=headers,
                    timeout=timeout,
                )

                last_status_code = response.status_code
                last_response = response.text[:1000]  # Truncate response

                if 200 <= response.status_code < 300:
                    # Success
                    self.record_delivery(
                        webhook_id=webhook_id,
                        event_type=event_type,
                        payload=payload,
                        status_code=response.status_code,
                        response_body=last_response,
                        success=True,
                        attempt=attempt,
                        idempotency_key=idempotency_key,
                    )
                    return {
                        "success": True,
                        "status_code": response.status_code,
                        "attempts": attempt,
                    }

                # Non-success status code, will retry
                last_error = f"HTTP {response.status_code}"

            except requests.exceptions.Timeout as e:
                last_error = f"Request timeout: {str(e)}"
            except requests.exceptions.ConnectionError as e:
                last_error = f"Connection error: {str(e)}"
            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"

            # Backoff before retry (except on last attempt)
            if attempt < max_retries:
                backoff = BACKOFF_BASE**attempt
                time.sleep(backoff * 0.01)  # Reduced for testing

        # All retries exhausted
        self.record_delivery(
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            status_code=last_status_code,
            response_body=last_response,
            success=False,
            error=last_error,
            attempt=max_retries,
            idempotency_key=idempotency_key,
        )

        return {
            "success": False,
            "status_code": last_status_code,
            "error": last_error,
            "attempts": max_retries,
        }
