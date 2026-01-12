"""
Security Utilities (Sprint 6 - SECURITY-001)

Provides password validation, rate limiting, and audit logging functionality.
"""

import sqlite3
import time
import re
from typing import Optional, List, Dict
from collections import defaultdict
import threading


# Password validation requirements
PASSWORD_MIN_LENGTH = 8
PASSWORD_PATTERNS = {
    "uppercase": re.compile(r"[A-Z]"),
    "lowercase": re.compile(r"[a-z]"),
    "digit": re.compile(r"\d"),
    "special": re.compile(r'[!@#$%^&*(),.?":{}|<>]'),
}


def validate_password(password: str) -> bool:
    """
    Validate password strength.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character

    Args:
        password: Password to validate

    Returns:
        True if password meets requirements, False otherwise
    """
    if not password or len(password) < PASSWORD_MIN_LENGTH:
        return False

    # Check all pattern requirements
    if not PASSWORD_PATTERNS["uppercase"].search(password):
        return False

    if not PASSWORD_PATTERNS["lowercase"].search(password):
        return False

    if not PASSWORD_PATTERNS["digit"].search(password):
        return False

    if not PASSWORD_PATTERNS["special"].search(password):
        return False

    return True


class RateLimiter:
    """
    In-memory rate limiter for login attempts and API calls.

    Uses sliding window approach to track requests.
    """

    def __init__(self):
        self._attempts = defaultdict(list)  # key -> [(timestamp, ...)]
        self._lock = threading.Lock()

    def check_rate_limit(
        self, key: str, max_attempts: int, window_seconds: int
    ) -> bool:
        """
        Check if rate limit is exceeded.

        Args:
            key: Unique key (e.g., username, IP address, user_id)
            max_attempts: Maximum attempts allowed
            window_seconds: Time window in seconds

        Returns:
            True if within limits, False if exceeded
        """
        with self._lock:
            now = time.time()
            cutoff = now - window_seconds

            # Get attempts for this key
            attempts = self._attempts[key]

            # Remove old attempts outside window
            attempts = [t for t in attempts if t > cutoff]
            self._attempts[key] = attempts

            # Check if limit exceeded
            if len(attempts) >= max_attempts:
                return False

            # Add current attempt
            attempts.append(now)
            return True

    def reset(self, key: str):
        """Reset rate limit for a key"""
        with self._lock:
            if key in self._attempts:
                del self._attempts[key]


# Global rate limiter instance
rate_limiter = RateLimiter()


def log_audit(
    user_id: Optional[int],
    action: str,
    success: bool,
    resource_type: str = None,
    resource_id: int = None,
    ip_address: str = None,
    user_agent: str = None,
    details: dict = None,
    db_path: str = "chirpsyncer.db",
):
    """
    Log audit event to database.

    Args:
        user_id: User ID (can be None for failed logins)
        action: Action performed (e.g., 'login', 'logout', 'create_cred')
        success: Whether action succeeded
        resource_type: Type of resource (e.g., 'user', 'credential')
        resource_id: ID of resource
        ip_address: Client IP address
        user_agent: Client user agent
        details: Additional details as dict (will be stored as JSON)
        db_path: Database path
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create audit_log table if not exists
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER,
                details TEXT,
                created_at INTEGER NOT NULL
            )
        """
        )

        # Convert details to JSON string
        import json

        details_json = json.dumps(details) if details else None

        # Insert audit log
        cursor.execute(
            """
            INSERT INTO audit_log (user_id, action, resource_type, resource_id,
                                  ip_address, user_agent, success, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                user_id,
                action,
                resource_type,
                resource_id,
                ip_address,
                user_agent,
                int(success),
                details_json,
                int(time.time()),
            ),
        )

        conn.commit()
        conn.close()

    except Exception as e:
        # Don't let audit logging break the main flow
        print(f"Warning: Failed to log audit event: {e}")


def get_audit_log(
    user_id: Optional[int] = None, limit: int = 100, db_path: str = "chirpsyncer.db"
) -> List[Dict]:
    """
    Get audit log entries.

    Args:
        user_id: Filter by user ID (None for all users)
        limit: Maximum number of entries to return
        db_path: Database path

    Returns:
        List of audit log entries as dicts
    """
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        if user_id is not None:
            cursor.execute(
                """
                SELECT * FROM audit_log
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (user_id, limit),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM audit_log
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (limit,),
            )

        rows = cursor.fetchall()
        conn.close()

        # Convert to dicts
        import json

        logs = []
        for row in rows:
            log_entry = dict(row)
            # Parse JSON details
            if log_entry.get("details"):
                try:
                    log_entry["details"] = json.loads(log_entry["details"])
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass  # Keep details as string if JSON parsing fails
            logs.append(log_entry)

        return logs

    except Exception as e:
        print(f"Warning: Failed to retrieve audit log: {e}")
        return []


def check_rate_limit(user_id: int, action: str) -> bool:
    """
    Check rate limit for a user action.

    Limits:
    - Login: 5 attempts / 15 minutes
    - API calls: 100 requests / minute

    Args:
        user_id: User ID
        action: Action type ('login', 'api_call', etc.)

    Returns:
        True if within limits, False if exceeded
    """
    key = f"{user_id}:{action}"

    if action == "login":
        # 5 attempts per 15 minutes
        return rate_limiter.check_rate_limit(key, max_attempts=5, window_seconds=900)

    elif action == "api_call":
        # 100 requests per minute
        return rate_limiter.check_rate_limit(key, max_attempts=100, window_seconds=60)

    else:
        # Default: 50 requests per minute
        return rate_limiter.check_rate_limit(key, max_attempts=50, window_seconds=60)
