"""
Email notification channel.

Queues notifications for email digest delivery.
"""

import json
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.logger import setup_logger
from app.services.notification_service import NotificationService

logger = setup_logger(__name__)


class EmailChannel:
    """
    Email notification channel with digest support.

    Queues notifications and sends digests at configured frequency.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize email channel.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.notification_service = NotificationService()

    def queue_for_digest(
        self,
        user_id: int,
        title: str,
        body: str,
        category: str,
        priority: int,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Queue notification for email digest.

        Args:
            user_id: User ID
            title: Notification title
            body: Notification body
            category: Notification category
            priority: Priority level
            data: Additional metadata

        Returns:
            Dict with success status
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()

            # Ensure table exists
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS email_digest_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    category TEXT NOT NULL,
                    priority INTEGER DEFAULT 2,
                    data_json TEXT,
                    created_at INTEGER NOT NULL,
                    sent_at INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )

            cursor.execute(
                """
                INSERT INTO email_digest_queue (
                    user_id, title, body, category, priority, data_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    title,
                    body,
                    category,
                    priority,
                    json.dumps(data) if data else None,
                    int(time.time()),
                ),
            )

            conn.commit()
            logger.info(f"Queued email digest for user {user_id}: {title}")
            return {"success": True, "queued": True}

        except Exception as e:
            logger.error(f"Failed to queue email digest: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def get_pending_digests(
        self, user_id: int, since: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get pending digest items for a user.

        Args:
            user_id: User ID
            since: Only items after this timestamp

        Returns:
            List of pending digest items
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()

            query = """
                SELECT * FROM email_digest_queue
                WHERE user_id = ? AND sent_at IS NULL
            """
            params: List[Any] = [user_id]

            if since:
                query += " AND created_at > ?"
                params.append(since)

            query += " ORDER BY priority DESC, created_at ASC"

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "body": row["body"],
                    "category": row["category"],
                    "priority": row["priority"],
                    "data": json.loads(row["data_json"]) if row["data_json"] else {},
                    "created_at": row["created_at"],
                }
                for row in rows
            ]

        finally:
            conn.close()

    def send_digest(
        self,
        user_id: int,
        email: str,
        items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Send email digest to user.

        Args:
            user_id: User ID
            email: User email address
            items: Optional items to include (fetches pending if None)

        Returns:
            Dict with success status
        """
        if items is None:
            items = self.get_pending_digests(user_id)

        if not items:
            return {"success": True, "message": "No items to send"}

        # Build digest email
        html_body = self._render_digest_template(items)
        subject = f"ChirpSyncer Digest - {len(items)} notifications"

        success = self.notification_service.send_email(
            to=email,
            subject=subject,
            body=html_body,
            html=True,
        )

        if success:
            # Mark items as sent
            self._mark_items_sent(user_id, [item["id"] for item in items])
            logger.info(f"Sent digest email to {email} with {len(items)} items")
            return {"success": True, "items_sent": len(items)}
        else:
            logger.error(f"Failed to send digest email to {email}")
            return {"success": False, "error": "Failed to send email"}

    def _mark_items_sent(self, user_id: int, item_ids: List[int]) -> None:
        """Mark digest items as sent."""
        if not item_ids:
            return

        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            now = int(time.time())

            placeholders = ",".join("?" * len(item_ids))
            cursor.execute(
                f"UPDATE email_digest_queue SET sent_at = ? WHERE id IN ({placeholders})",  # nosec B608
                [now] + item_ids,
            )
            conn.commit()
        finally:
            conn.close()

    def _render_digest_template(self, items: List[Dict[str, Any]]) -> str:
        """Render digest email template."""
        # Group by category
        by_category: Dict[str, List[Dict[str, Any]]] = {}
        for item in items:
            cat = item.get("category", "system")
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(item)

        # Build HTML
        items_html = ""
        for category, cat_items in by_category.items():
            items_html += f'<h3 style="color: #2196F3; margin-top: 20px;">{category.title()}</h3>'
            for item in cat_items:
                priority_badge = ""
                if item.get("priority", 2) >= 4:
                    priority_badge = '<span style="background: #f44336; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em;">URGENT</span> '
                items_html += f"""
                <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 3px solid #2196F3; border-radius: 3px;">
                    <strong>{priority_badge}{item['title']}</strong>
                    <p style="margin: 5px 0 0 0; color: #666;">{item['body']}</p>
                </div>
                """

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ChirpSyncer Digest</h1>
            <p>{len(items)} notifications</p>
        </div>
        <div class="content">
            {items_html}
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')}</p>
        </div>
    </div>
</body>
</html>
"""
        return html
