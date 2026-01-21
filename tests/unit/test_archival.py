"""
Tests for ArchivalManager.

TDD tests for app/features/archival/manager.py
"""

import json
import os
import sqlite3
import tempfile
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest


def create_test_db_with_posts():
    """Create a test database with synced_posts table and sample data."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create synced_posts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            platform_id TEXT NOT NULL,
            content TEXT,
            created_at INTEGER NOT NULL,
            likes_count INTEGER DEFAULT 0,
            retweets_count INTEGER DEFAULT 0,
            replies_count INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            archived_at INTEGER,
            archive_path TEXT
        )
    """)

    # Insert test posts - some old, some recent
    now = int(time.time())
    one_year_ago = now - (365 * 24 * 60 * 60)
    two_years_ago = now - (2 * 365 * 24 * 60 * 60)
    one_month_ago = now - (30 * 24 * 60 * 60)

    posts = [
        (
            1,
            "twitter",
            "tw_old_1",
            "Old tweet 1",
            two_years_ago,
            10,
            5,
            2,
            0,
            None,
            None,
        ),
        (
            1,
            "twitter",
            "tw_old_2",
            "Old tweet 2",
            two_years_ago + 1000,
            20,
            10,
            5,
            0,
            None,
            None,
        ),
        (
            1,
            "twitter",
            "tw_old_3",
            "Old tweet 3",
            one_year_ago - 1000,
            5,
            2,
            1,
            0,
            None,
            None,
        ),
        (
            1,
            "twitter",
            "tw_recent_1",
            "Recent tweet",
            one_month_ago,
            100,
            50,
            25,
            0,
            None,
            None,
        ),
        (
            1,
            "twitter",
            "tw_recent_2",
            "Very recent tweet",
            now - 3600,
            50,
            25,
            10,
            0,
            None,
            None,
        ),
        (
            1,
            "bluesky",
            "bs_old_1",
            "Old bluesky post",
            two_years_ago,
            15,
            8,
            3,
            0,
            None,
            None,
        ),
        (
            2,
            "twitter",
            "tw_user2_old",
            "User 2 old tweet",
            two_years_ago,
            30,
            15,
            7,
            0,
            None,
            None,
        ),
    ]

    cursor.executemany(
        """
        INSERT INTO synced_posts 
        (user_id, platform, platform_id, content, created_at, likes_count, retweets_count, replies_count, archived, archived_at, archive_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        posts,
    )

    conn.commit()
    conn.close()
    return path


class TestArchivalManagerInit:
    """Test ArchivalManager initialization."""

    def test_archival_manager_init(self):
        """Test ArchivalManager can be initialized."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            assert manager is not None
            assert manager.db_path == db_path
            assert manager.archive_dir == archive_dir
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)

    def test_archival_manager_default_retention_days(self):
        """Test ArchivalManager has default retention of 365 days."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            assert manager.retention_days == 365
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)

    def test_archival_manager_custom_retention_days(self):
        """Test ArchivalManager accepts custom retention days."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(
                db_path=db_path, archive_dir=archive_dir, retention_days=180
            )
            assert manager.retention_days == 180
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)


class TestArchivalManagerFindOldPosts:
    """Test finding posts eligible for archival."""

    def test_find_archivable_posts(self):
        """Test finding posts older than retention period."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            posts = manager.find_archivable_posts()

            # Should find posts older than 1 year (4 old posts from user 1, 1 from user 2, 1 bluesky)
            assert len(posts) >= 4
            for post in posts:
                assert post["archived"] == 0
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)

    def test_find_archivable_posts_by_user(self):
        """Test finding archivable posts for specific user."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            posts = manager.find_archivable_posts(user_id=1)

            # Should only find user 1's old posts
            for post in posts:
                assert post["user_id"] == 1
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)

    def test_find_archivable_posts_excludes_already_archived(self):
        """Test that already archived posts are not returned."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()

        # Mark one post as archived
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE synced_posts SET archived = 1 WHERE platform_id = 'tw_old_1'"
        )
        conn.commit()
        conn.close()

        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            posts = manager.find_archivable_posts()

            platform_ids = [p["platform_id"] for p in posts]
            assert "tw_old_1" not in platform_ids
        finally:
            os.unlink(db_path)
            os.rmdir(archive_dir)


class TestArchivalManagerArchive:
    """Test archiving posts."""

    def test_archive_posts_creates_json_file(self):
        """Test archiving creates JSON file with post data."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            result = manager.archive_old_posts(user_id=1)

            assert result["archived_count"] > 0
            assert result["archive_path"] is not None

            # Verify file exists
            assert os.path.exists(result["archive_path"])

            # Verify JSON content
            with open(result["archive_path"], "r") as f:
                archived_data = json.load(f)
            assert len(archived_data["posts"]) > 0
        finally:
            # Cleanup
            for f in os.listdir(archive_dir):
                os.unlink(os.path.join(archive_dir, f))
            os.rmdir(archive_dir)
            os.unlink(db_path)

    def test_archive_posts_marks_as_archived(self):
        """Test archiving marks posts as archived in database."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            result = manager.archive_old_posts(user_id=1)

            # Check database
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE user_id = 1 AND archived = 1"
            )
            archived_count = cursor.fetchone()[0]
            conn.close()

            assert archived_count == result["archived_count"]
        finally:
            for f in os.listdir(archive_dir):
                os.unlink(os.path.join(archive_dir, f))
            os.rmdir(archive_dir)
            os.unlink(db_path)

    def test_archive_posts_stores_archive_path(self):
        """Test archiving stores archive path in database."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            result = manager.archive_old_posts(user_id=1)

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT archive_path FROM synced_posts WHERE user_id = 1 AND archived = 1 LIMIT 1"
            )
            row = cursor.fetchone()
            conn.close()

            assert row[0] is not None
            assert row[0] == result["archive_path"]
        finally:
            for f in os.listdir(archive_dir):
                os.unlink(os.path.join(archive_dir, f))
            os.rmdir(archive_dir)
            os.unlink(db_path)

    def test_archive_posts_returns_zero_when_nothing_to_archive(self):
        """Test archiving returns zero when no posts to archive."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()

        # Mark all posts as archived
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("UPDATE synced_posts SET archived = 1")
        conn.commit()
        conn.close()

        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)
            result = manager.archive_old_posts(user_id=1)

            assert result["archived_count"] == 0
            assert result["archive_path"] is None
        finally:
            os.rmdir(archive_dir)
            os.unlink(db_path)


class TestArchivalManagerRestore:
    """Test restoring archived posts."""

    def test_restore_archived_posts(self):
        """Test restoring posts from archive."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)

            # First archive
            archive_result = manager.archive_old_posts(user_id=1)
            archive_path = archive_result["archive_path"]

            # Then restore
            restore_result = manager.restore_from_archive(archive_path)

            assert restore_result["restored_count"] == archive_result["archived_count"]

            # Verify posts are no longer marked as archived
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM synced_posts WHERE user_id = 1 AND archived = 1"
            )
            still_archived = cursor.fetchone()[0]
            conn.close()

            assert still_archived == 0
        finally:
            for f in os.listdir(archive_dir):
                os.unlink(os.path.join(archive_dir, f))
            os.rmdir(archive_dir)
            os.unlink(db_path)


class TestArchivalManagerStats:
    """Test archival statistics."""

    def test_get_archival_stats(self):
        """Test getting archival statistics."""
        from app.features.archival.manager import ArchivalManager

        db_path = create_test_db_with_posts()
        archive_dir = tempfile.mkdtemp()
        try:
            manager = ArchivalManager(db_path=db_path, archive_dir=archive_dir)

            # Archive some posts first
            manager.archive_old_posts(user_id=1)

            stats = manager.get_archival_stats(user_id=1)

            assert "total_posts" in stats
            assert "archived_posts" in stats
            assert "archivable_posts" in stats
            assert stats["archived_posts"] > 0
        finally:
            for f in os.listdir(archive_dir):
                os.unlink(os.path.join(archive_dir, f))
            os.rmdir(archive_dir)
            os.unlink(db_path)
