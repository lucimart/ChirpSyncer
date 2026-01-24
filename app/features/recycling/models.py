"""
Models for Content Recycling Engine.

Defines ContentLibrary and RecycleSuggestion for storing and managing recyclable content.
"""

import json
import sqlite3
import time
from typing import Any, Dict, List, Optional


class ContentLibrary:
    """
    Manages the content library for recycling.

    Stores posts with engagement metrics and evergreen scores for recycling suggestions.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize ContentLibrary.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def init_db(self) -> None:
        """Initialize database tables and indexes."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_library (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                original_post_id TEXT NOT NULL,
                content TEXT NOT NULL,
                media_urls TEXT DEFAULT '[]',
                engagement_score REAL DEFAULT 0.0,
                evergreen_score REAL DEFAULT 0.0,
                recycle_score REAL DEFAULT 0.0,
                tags TEXT DEFAULT '[]',
                last_recycled_at INTEGER,
                recycle_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, platform, original_post_id)
            )
        """)

        # Create indexes for efficient queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_content_library_user
            ON content_library(user_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_content_library_recycle_score
            ON content_library(recycle_score DESC)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_content_library_platform
            ON content_library(platform)
        """)

        conn.commit()
        conn.close()

    def add_content(
        self,
        user_id: int,
        platform: str,
        original_post_id: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        engagement_score: float = 0.0,
        evergreen_score: float = 0.0,
        tags: Optional[List[str]] = None,
    ) -> Optional[int]:
        """
        Add content to the library.

        Args:
            user_id: User ID who owns the content
            platform: Source platform (twitter, bluesky, etc.)
            original_post_id: Original post ID on the platform
            content: Post content text
            media_urls: List of media URLs
            engagement_score: Calculated engagement score (0.0-1.0)
            evergreen_score: Calculated evergreen score (0.0-1.0)
            tags: Content tags/categories

        Returns:
            Content ID if successful, None otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            media_json = json.dumps(media_urls or [])
            tags_json = json.dumps(tags or [])
            created_at = int(time.time())

            cursor.execute("""
                INSERT INTO content_library
                (user_id, platform, original_post_id, content, media_urls,
                 engagement_score, evergreen_score, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, platform, original_post_id, content, media_json,
                engagement_score, evergreen_score, tags_json, created_at
            ))

            content_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return content_id

        except sqlite3.IntegrityError:
            # Content already exists
            return None
        except Exception:
            return None

    def get_content(self, content_id: int) -> Optional[Dict[str, Any]]:
        """
        Get content by ID.

        Args:
            content_id: Content library ID

        Returns:
            Content dictionary or None if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM content_library WHERE id = ?
            """, (content_id,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return self._row_to_dict(row)
            return None

        except Exception:
            return None

    def get_user_content(
        self,
        user_id: int,
        platform: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get content for a user with optional platform filter.

        Args:
            user_id: User ID
            platform: Optional platform filter
            limit: Maximum results to return
            offset: Result offset for pagination

        Returns:
            List of content dictionaries
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if platform:
                cursor.execute("""
                    SELECT * FROM content_library
                    WHERE user_id = ? AND platform = ?
                    ORDER BY recycle_score DESC
                    LIMIT ? OFFSET ?
                """, (user_id, platform, limit, offset))
            else:
                cursor.execute("""
                    SELECT * FROM content_library
                    WHERE user_id = ?
                    ORDER BY recycle_score DESC
                    LIMIT ? OFFSET ?
                """, (user_id, limit, offset))

            rows = cursor.fetchall()
            conn.close()

            return [self._row_to_dict(row) for row in rows]

        except Exception:
            return []

    def update_tags(self, content_id: int, tags: List[str]) -> bool:
        """
        Update tags for content.

        Args:
            content_id: Content ID
            tags: New tags list

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            tags_json = json.dumps(tags)
            cursor.execute("""
                UPDATE content_library SET tags = ? WHERE id = ?
            """, (tags_json, content_id))

            conn.commit()
            success = cursor.rowcount > 0
            conn.close()

            return success

        except Exception:
            return False

    def update_scores(
        self,
        content_id: int,
        engagement_score: Optional[float] = None,
        evergreen_score: Optional[float] = None,
        recycle_score: Optional[float] = None,
    ) -> bool:
        """
        Update scores for content.

        Args:
            content_id: Content ID
            engagement_score: New engagement score
            evergreen_score: New evergreen score
            recycle_score: New recycle score

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            updates = []
            params = []

            if engagement_score is not None:
                updates.append("engagement_score = ?")
                params.append(engagement_score)
            if evergreen_score is not None:
                updates.append("evergreen_score = ?")
                params.append(evergreen_score)
            if recycle_score is not None:
                updates.append("recycle_score = ?")
                params.append(recycle_score)

            if not updates:
                return False

            params.append(content_id)
            query = f"UPDATE content_library SET {', '.join(updates)} WHERE id = ?"

            cursor.execute(query, params)
            conn.commit()
            success = cursor.rowcount > 0
            conn.close()

            return success

        except Exception:
            return False

    def mark_as_recycled(self, content_id: int) -> bool:
        """
        Mark content as recycled (increment count and update timestamp).

        Args:
            content_id: Content ID

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            now = int(time.time())
            cursor.execute("""
                UPDATE content_library
                SET last_recycled_at = ?, recycle_count = recycle_count + 1
                WHERE id = ?
            """, (now, content_id))

            conn.commit()
            success = cursor.rowcount > 0
            conn.close()

            return success

        except Exception:
            return False

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to dictionary."""
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "platform": row["platform"],
            "original_post_id": row["original_post_id"],
            "content": row["content"],
            "media_urls": json.loads(row["media_urls"] or "[]"),
            "engagement_score": row["engagement_score"],
            "evergreen_score": row["evergreen_score"],
            "recycle_score": row["recycle_score"],
            "tags": json.loads(row["tags"] or "[]"),
            "last_recycled_at": row["last_recycled_at"],
            "recycle_count": row["recycle_count"],
            "created_at": row["created_at"],
        }


class RecycleSuggestion:
    """
    Manages recycle suggestions.

    Stores and tracks suggestions for recycling content.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize RecycleSuggestion.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def init_db(self) -> None:
        """Initialize database tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recycle_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_id INTEGER NOT NULL,
                suggested_platforms TEXT DEFAULT '[]',
                suggested_at INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                scheduled_for INTEGER,
                FOREIGN KEY (content_id) REFERENCES content_library(id)
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_suggestions_content
            ON recycle_suggestions(content_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_suggestions_status
            ON recycle_suggestions(status)
        """)

        conn.commit()
        conn.close()

    def create_suggestion(
        self,
        content_id: int,
        suggested_platforms: List[str],
    ) -> Optional[int]:
        """
        Create a new recycle suggestion.

        Args:
            content_id: Content library ID
            suggested_platforms: List of platforms to recycle to

        Returns:
            Suggestion ID if successful, None otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            platforms_json = json.dumps(suggested_platforms)
            suggested_at = int(time.time())

            cursor.execute("""
                INSERT INTO recycle_suggestions
                (content_id, suggested_platforms, suggested_at, status)
                VALUES (?, ?, ?, 'pending')
            """, (content_id, platforms_json, suggested_at))

            suggestion_id = cursor.lastrowid
            conn.commit()
            conn.close()

            return suggestion_id

        except Exception:
            return None

    def get_suggestion(self, suggestion_id: int) -> Optional[Dict[str, Any]]:
        """
        Get suggestion by ID.

        Args:
            suggestion_id: Suggestion ID

        Returns:
            Suggestion dictionary or None
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM recycle_suggestions WHERE id = ?
            """, (suggestion_id,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return self._row_to_dict(row)
            return None

        except Exception:
            return None

    def get_pending_suggestions(
        self,
        user_id: int,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get pending suggestions for a user.

        Args:
            user_id: User ID
            limit: Maximum results

        Returns:
            List of suggestion dictionaries
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("""
                SELECT rs.* FROM recycle_suggestions rs
                JOIN content_library cl ON rs.content_id = cl.id
                WHERE cl.user_id = ? AND rs.status = 'pending'
                ORDER BY rs.suggested_at DESC
                LIMIT ?
            """, (user_id, limit))

            rows = cursor.fetchall()
            conn.close()

            return [self._row_to_dict(row) for row in rows]

        except Exception:
            return []

    def schedule_suggestion(
        self,
        suggestion_id: int,
        scheduled_for: int,
    ) -> bool:
        """
        Schedule a suggestion for future posting.

        Args:
            suggestion_id: Suggestion ID
            scheduled_for: Unix timestamp for scheduled time

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE recycle_suggestions
                SET status = 'scheduled', scheduled_for = ?
                WHERE id = ?
            """, (scheduled_for, suggestion_id))

            conn.commit()
            success = cursor.rowcount > 0
            conn.close()

            return success

        except Exception:
            return False

    def update_status(self, suggestion_id: int, status: str) -> bool:
        """
        Update suggestion status.

        Args:
            suggestion_id: Suggestion ID
            status: New status (pending, scheduled, completed, dismissed)

        Returns:
            True if successful, False otherwise
        """
        valid_statuses = {"pending", "scheduled", "completed", "dismissed"}
        if status not in valid_statuses:
            return False

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE recycle_suggestions SET status = ? WHERE id = ?
            """, (status, suggestion_id))

            conn.commit()
            success = cursor.rowcount > 0
            conn.close()

            return success

        except Exception:
            return False

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert database row to dictionary."""
        return {
            "id": row["id"],
            "content_id": row["content_id"],
            "suggested_platforms": json.loads(row["suggested_platforms"] or "[]"),
            "suggested_at": row["suggested_at"],
            "status": row["status"],
            "scheduled_for": row["scheduled_for"],
        }
