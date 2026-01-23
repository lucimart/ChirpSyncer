"""
Notification models for the Notifications Hub.

Provides:
- Notification: Core notification entity with priority, category, and metadata
- NotificationCategory: Enum for notification categories
- NotificationPriority: Enum for priority levels (1-5)
- NotificationChannelPreferences: User channel preferences with quiet hours
"""

import json
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum, StrEnum
from typing import Any, Dict, List, Optional

from app.core.logger import setup_logger

logger = setup_logger(__name__)


class NotificationPriority(IntEnum):
    """Priority levels for notifications (1-5)."""

    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4
    CRITICAL = 5


class NotificationCategory(StrEnum):
    """Categories for notifications."""

    SYNC = "sync"
    ALERT = "alert"
    SYSTEM = "system"
    ENGAGEMENT = "engagement"
    SECURITY = "security"


@dataclass
class Notification:
    """
    Core notification entity.

    Attributes:
        id: Unique identifier (set after save)
        user_id: Owner user ID
        type: Notification type (e.g., sync_complete, rate_limit)
        category: Category for grouping/filtering
        title: Short notification title
        body: Full notification message
        data: Additional JSON metadata
        priority: Priority level (1-5)
        is_read: Whether user has read the notification
        created_at: Creation timestamp
    """

    user_id: int
    type: str
    category: NotificationCategory
    title: str
    body: str
    data: Dict[str, Any] = field(default_factory=dict)
    priority: NotificationPriority = NotificationPriority.NORMAL
    is_read: bool = False
    created_at: Optional[datetime] = None
    id: Optional[int] = None

    def save(self, db_path: str) -> int:
        """
        Save notification to database.

        Args:
            db_path: Path to SQLite database

        Returns:
            Notification ID
        """
        conn = sqlite3.connect(db_path)
        try:
            cursor = conn.cursor()
            now = int(time.time())

            cursor.execute(
                """
                INSERT INTO notifications_hub (
                    user_id, type, category, title, body, data_json,
                    priority, is_read, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    self.user_id,
                    self.type,
                    self.category.value if isinstance(self.category, NotificationCategory) else self.category,
                    self.title,
                    self.body,
                    json.dumps(self.data),
                    self.priority.value if isinstance(self.priority, NotificationPriority) else self.priority,
                    1 if self.is_read else 0,
                    now,
                ),
            )

            self.id = cursor.lastrowid
            self.created_at = datetime.fromtimestamp(now)
            conn.commit()

            logger.info(f"Created notification {self.id} for user {self.user_id}")
            return self.id

        finally:
            conn.close()

    def mark_as_read(self, db_path: str) -> bool:
        """
        Mark notification as read.

        Args:
            db_path: Path to SQLite database

        Returns:
            True if updated successfully
        """
        if not self.id:
            return False

        conn = sqlite3.connect(db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE notifications_hub SET is_read = 1 WHERE id = ?",
                (self.id,),
            )
            conn.commit()
            self.is_read = True
            return cursor.rowcount > 0
        finally:
            conn.close()

    @classmethod
    def get_by_id(cls, db_path: str, notification_id: int) -> Optional["Notification"]:
        """
        Get notification by ID.

        Args:
            db_path: Path to SQLite database
            notification_id: Notification ID

        Returns:
            Notification instance or None
        """
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM notifications_hub WHERE id = ?",
                (notification_id,),
            )
            row = cursor.fetchone()

            if not row:
                return None

            return cls._from_row(row)
        finally:
            conn.close()

    @classmethod
    def get_for_user(
        cls,
        db_path: str,
        user_id: int,
        unread_only: bool = False,
        category: Optional[NotificationCategory] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List["Notification"]:
        """
        Get notifications for a user.

        Args:
            db_path: Path to SQLite database
            user_id: User ID
            unread_only: If True, only return unread notifications
            category: Filter by category
            limit: Maximum notifications to return
            offset: Pagination offset

        Returns:
            List of Notification instances
        """
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()

            query = "SELECT * FROM notifications_hub WHERE user_id = ?"
            params: List[Any] = [user_id]

            if unread_only:
                query += " AND is_read = 0"

            if category:
                query += " AND category = ?"
                params.append(category.value if isinstance(category, NotificationCategory) else category)

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [cls._from_row(row) for row in rows]
        finally:
            conn.close()

    @classmethod
    def _from_row(cls, row: sqlite3.Row) -> "Notification":
        """Create Notification from database row."""
        data = {}
        if row["data_json"]:
            try:
                data = json.loads(row["data_json"])
            except json.JSONDecodeError:
                pass

        return cls(
            id=row["id"],
            user_id=row["user_id"],
            type=row["type"],
            category=NotificationCategory(row["category"]),
            title=row["title"],
            body=row["body"],
            data=data,
            priority=NotificationPriority(row["priority"]),
            is_read=bool(row["is_read"]),
            created_at=datetime.fromtimestamp(row["created_at"]),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "category": self.category.value if isinstance(self.category, NotificationCategory) else self.category,
            "title": self.title,
            "body": self.body,
            "data": self.data,
            "priority": self.priority.value if isinstance(self.priority, NotificationPriority) else self.priority,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_notifications_hub_db(db_path: str) -> None:
    """
    Initialize notifications hub database tables.

    Creates:
    - notifications_hub: Main notifications table
    - notification_channel_preferences: User channel preferences

    Args:
        db_path: Path to SQLite database
    """
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        # Main notifications table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications_hub (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                data_json TEXT,
                priority INTEGER DEFAULT 2,
                is_read INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        # Indexes for notifications
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_hub_user_id ON notifications_hub(user_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_hub_created_at ON notifications_hub(created_at)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_hub_category ON notifications_hub(category)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_hub_is_read ON notifications_hub(is_read)"
        )

        # Channel preferences table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS notification_channel_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                in_app_enabled INTEGER DEFAULT 1,
                push_enabled INTEGER DEFAULT 0,
                telegram_enabled INTEGER DEFAULT 0,
                telegram_chat_id TEXT,
                discord_enabled INTEGER DEFAULT 0,
                discord_webhook_url TEXT,
                email_digest_enabled INTEGER DEFAULT 0,
                email_digest_frequency TEXT DEFAULT 'daily',
                quiet_hours_start INTEGER,
                quiet_hours_end INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_channel_prefs_user_id ON notification_channel_preferences(user_id)"
        )

        conn.commit()
        logger.info("Notifications hub database tables initialized")

    finally:
        conn.close()
