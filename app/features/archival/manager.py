"""
ArchivalManager for managing old posts.

Archives posts older than a retention period to JSON cold storage
and provides restore functionality.
"""

import json
import os
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, List, Optional


class ArchivalManager:
    """
    Manages archival of old posts to cold storage.

    Archives posts older than retention_days to JSON files,
    marks them as archived in the database, and provides
    restore functionality.
    """

    def __init__(
        self,
        db_path: str,
        archive_dir: str,
        retention_days: int = 365,
    ) -> None:
        """
        Initialize ArchivalManager.

        Args:
            db_path: Path to the SQLite database.
            archive_dir: Directory to store archive JSON files.
            retention_days: Number of days before posts are eligible for archival.
        """
        self.db_path = db_path
        self.archive_dir = archive_dir
        self.retention_days = retention_days

        # Ensure archive directory exists
        os.makedirs(archive_dir, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _get_cutoff_timestamp(self) -> int:
        """Get the timestamp cutoff for archivable posts."""
        return int(time.time()) - (self.retention_days * 24 * 60 * 60)

    def find_archivable_posts(
        self, user_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Find posts eligible for archival.

        Args:
            user_id: Optional user ID to filter by.

        Returns:
            List of posts older than retention period that are not yet archived.
        """
        cutoff = self._get_cutoff_timestamp()
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            if user_id is not None:
                cursor.execute(
                    """
                    SELECT * FROM synced_posts
                    WHERE created_at < ? AND archived = 0 AND user_id = ?
                    ORDER BY created_at ASC
                    """,
                    (cutoff, user_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT * FROM synced_posts
                    WHERE created_at < ? AND archived = 0
                    ORDER BY created_at ASC
                    """,
                    (cutoff,),
                )

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def archive_old_posts(self, user_id: int) -> Dict[str, Any]:
        """
        Archive old posts for a user to JSON cold storage.

        Args:
            user_id: User ID whose posts to archive.

        Returns:
            Dictionary with archived_count and archive_path.
        """
        posts = self.find_archivable_posts(user_id=user_id)

        if not posts:
            return {"archived_count": 0, "archive_path": None}

        # Generate archive filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_filename = f"archive_user{user_id}_{timestamp}.json"
        archive_path = os.path.join(self.archive_dir, archive_filename)

        # Write posts to JSON file
        archive_data = {
            "user_id": user_id,
            "archived_at": int(time.time()),
            "retention_days": self.retention_days,
            "posts": posts,
        }

        with open(archive_path, "w", encoding="utf-8") as f:
            json.dump(archive_data, f, indent=2, ensure_ascii=False)

        # Mark posts as archived in database
        conn = self._get_connection()
        cursor = conn.cursor()
        archived_at = int(time.time())

        try:
            post_ids = [p["id"] for p in posts]
            placeholders = ",".join("?" * len(post_ids))
            cursor.execute(
                f"""
                UPDATE synced_posts
                SET archived = 1, archived_at = ?, archive_path = ?
                WHERE id IN ({placeholders})
                """,  # nosec B608
                [archived_at, archive_path] + post_ids,
            )
            conn.commit()
        finally:
            conn.close()

        return {"archived_count": len(posts), "archive_path": archive_path}

    def restore_from_archive(self, archive_path: str) -> Dict[str, Any]:
        """
        Restore posts from an archive file.

        Args:
            archive_path: Path to the archive JSON file.

        Returns:
            Dictionary with restored_count.
        """
        if not os.path.exists(archive_path):
            raise FileNotFoundError(f"Archive file not found: {archive_path}")

        with open(archive_path, "r", encoding="utf-8") as f:
            archive_data = json.load(f)

        posts = archive_data.get("posts", [])
        if not posts:
            return {"restored_count": 0}

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            post_ids = [p["id"] for p in posts]
            placeholders = ",".join("?" * len(post_ids))
            cursor.execute(
                f"""
                UPDATE synced_posts
                SET archived = 0, archived_at = NULL, archive_path = NULL
                WHERE id IN ({placeholders})
                """,  # nosec B608
                post_ids,
            )
            conn.commit()
        finally:
            conn.close()

        return {"restored_count": len(posts)}

    def get_archival_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get archival statistics for a user.

        Args:
            user_id: User ID to get stats for.

        Returns:
            Dictionary with total_posts, archived_posts, archivable_posts.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Total posts
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE user_id = ?",
                (user_id,),
            )
            total_posts = cursor.fetchone()[0]

            # Archived posts
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE user_id = ? AND archived = 1",
                (user_id,),
            )
            archived_posts = cursor.fetchone()[0]

            # Archivable posts (old but not yet archived)
            cutoff = self._get_cutoff_timestamp()
            cursor.execute(
                """
                SELECT COUNT(*) FROM synced_posts
                WHERE user_id = ? AND archived = 0 AND created_at < ?
                """,
                (user_id, cutoff),
            )
            archivable_posts = cursor.fetchone()[0]

            return {
                "total_posts": total_posts,
                "archived_posts": archived_posts,
                "archivable_posts": archivable_posts,
            }
        finally:
            conn.close()
