"""
Unified Inbox Service

Business logic for the unified inbox feature.
"""

import sqlite3
from typing import Optional, Tuple

from app.features.inbox.models import (
    UnifiedMessage,
    CREATE_TABLE_SQL,
    CREATE_INDEXES_SQL,
)


class InboxService:
    """Service class for managing the unified inbox."""

    def __init__(self, db_path: str):
        """
        Initialize the inbox service.

        Args:
            db_path: Path to the SQLite database
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        """Initialize the database table and indexes."""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(CREATE_TABLE_SQL)
            for index_sql in CREATE_INDEXES_SQL:
                cursor.execute(index_sql)
            conn.commit()
        finally:
            conn.close()

    def get_messages(
        self,
        user_id: int,
        filters: dict,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[list, int]:
        """
        Get messages from the unified inbox with optional filters.

        Args:
            user_id: The user's ID
            filters: Dictionary of filters (platform, unread, starred, archived, message_type)
            page: Page number (1-based)
            limit: Number of messages per page

        Returns:
            Tuple of (list of messages as dicts, total count)
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Build WHERE clause
            conditions = ["user_id = ?"]
            params = [user_id]

            # Platform filter
            if filters.get("platform"):
                conditions.append("platform = ?")
                params.append(filters["platform"])

            # Unread filter
            if filters.get("unread"):
                conditions.append("is_read = 0")

            # Starred filter
            if filters.get("starred"):
                conditions.append("is_starred = 1")

            # Archived filter - by default exclude archived
            if filters.get("archived"):
                conditions.append("is_archived = 1")
            else:
                conditions.append("is_archived = 0")

            # Message type filter
            if filters.get("message_type"):
                conditions.append("message_type = ?")
                params.append(filters["message_type"])

            where_clause = " AND ".join(conditions)

            # Get total count
            count_sql = f"SELECT COUNT(*) FROM unified_messages WHERE {where_clause}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()[0]

            # Get paginated messages
            offset = (page - 1) * limit
            query_sql = f"""
                SELECT * FROM unified_messages
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query_sql, params + [limit, offset])
            rows = cursor.fetchall()

            messages = [UnifiedMessage.from_row(dict(row)).to_dict() for row in rows]
            return messages, total
        finally:
            conn.close()

    def get_message(self, user_id: int, message_id: str) -> Optional[dict]:
        """
        Get a single message by ID.

        Args:
            user_id: The user's ID
            message_id: The message ID

        Returns:
            Message as dict or None if not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM unified_messages WHERE id = ? AND user_id = ?",
                (message_id, user_id),
            )
            row = cursor.fetchone()
            if row:
                return UnifiedMessage.from_row(dict(row)).to_dict()
            return None
        finally:
            conn.close()

    def mark_as_read(self, user_id: int, message_id: str) -> bool:
        """
        Mark a message as read.

        Args:
            user_id: The user's ID
            message_id: The message ID

        Returns:
            True if successful, False if message not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE unified_messages SET is_read = 1 WHERE id = ? AND user_id = ?",
                (message_id, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def toggle_star(self, user_id: int, message_id: str) -> Optional[bool]:
        """
        Toggle the starred status of a message.

        Args:
            user_id: The user's ID
            message_id: The message ID

        Returns:
            New starred status (True/False) or None if message not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Get current status
            cursor.execute(
                "SELECT is_starred FROM unified_messages WHERE id = ? AND user_id = ?",
                (message_id, user_id),
            )
            row = cursor.fetchone()
            if not row:
                return None

            new_status = 0 if row["is_starred"] else 1
            cursor.execute(
                "UPDATE unified_messages SET is_starred = ? WHERE id = ? AND user_id = ?",
                (new_status, message_id, user_id),
            )
            conn.commit()
            return bool(new_status)
        finally:
            conn.close()

    def archive(self, user_id: int, message_id: str) -> bool:
        """
        Archive a message.

        Args:
            user_id: The user's ID
            message_id: The message ID

        Returns:
            True if successful, False if message not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE unified_messages SET is_archived = 1 WHERE id = ? AND user_id = ?",
                (message_id, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_stats(self, user_id: int) -> dict:
        """
        Get inbox statistics (unread counts per platform).

        Args:
            user_id: The user's ID

        Returns:
            Dictionary with total_unread and by_platform counts
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Get total unread (non-archived)
            cursor.execute(
                """
                SELECT COUNT(*) FROM unified_messages
                WHERE user_id = ? AND is_read = 0 AND is_archived = 0
                """,
                (user_id,),
            )
            total_unread = cursor.fetchone()[0]

            # Get unread counts by platform
            cursor.execute(
                """
                SELECT platform, COUNT(*) as count FROM unified_messages
                WHERE user_id = ? AND is_read = 0 AND is_archived = 0
                GROUP BY platform
                """,
                (user_id,),
            )
            by_platform = {row["platform"]: row["count"] for row in cursor.fetchall()}

            return {
                "total_unread": total_unread,
                "by_platform": by_platform,
            }
        finally:
            conn.close()
