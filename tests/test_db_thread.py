import sqlite3
import os
import tempfile
from app.db_handler import (
    migrate_database,
    migrate_database_v2,
    save_synced_thread,
    is_thread_synced
)


def test_migration_v2_adds_thread_columns():
    """Test that migration v2 adds thread_id and thread_position columns"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Create base schema first
        migrate_database(db_path=db_path)

        # Run v2 migration
        migrate_database_v2(db_path=db_path)

        # Verify new columns exist
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get table info
        cursor.execute("PRAGMA table_info(synced_posts)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        assert 'thread_id' in column_names, "thread_id column should exist"
        assert 'thread_position' in column_names, "thread_position column should exist"

        # Verify index on thread_id exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_thread_id'")
        assert cursor.fetchone() is not None, "idx_thread_id should exist"

        conn.close()
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_save_synced_thread_single_post():
    """Test saving a thread with a single post"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Setup database
        migrate_database(db_path=db_path)
        migrate_database_v2(db_path=db_path)

        # Save single-post thread
        posts = [
            {
                'twitter_id': 'tweet_1',
                'bluesky_uri': 'at://user/post/1',
                'content': 'Single post thread'
            }
        ]

        save_synced_thread(
            posts=posts,
            source='twitter',
            synced_to='bluesky',
            thread_id='twitter_tweet_1',
            db_path=db_path
        )

        # Verify saved correctly
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT twitter_id, bluesky_uri, thread_id, thread_position, original_text FROM synced_posts WHERE thread_id = ?",
            ('twitter_tweet_1',)
        )
        rows = cursor.fetchall()
        conn.close()

        assert len(rows) == 1, "Should have 1 post"
        assert rows[0][0] == 'tweet_1', "twitter_id should match"
        assert rows[0][1] == 'at://user/post/1', "bluesky_uri should match"
        assert rows[0][2] == 'twitter_tweet_1', "thread_id should match"
        assert rows[0][3] == 0, "thread_position should be 0"
        assert rows[0][4] == 'Single post thread', "content should match"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_save_synced_thread_multiple_posts():
    """Test saving a thread with 3 posts"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Setup database
        migrate_database(db_path=db_path)
        migrate_database_v2(db_path=db_path)

        # Save 3-post thread
        posts = [
            {
                'twitter_id': 'tweet_1',
                'bluesky_uri': 'at://user/post/1',
                'content': 'First post in thread'
            },
            {
                'twitter_id': 'tweet_2',
                'bluesky_uri': 'at://user/post/2',
                'content': 'Second post in thread'
            },
            {
                'twitter_id': 'tweet_3',
                'bluesky_uri': 'at://user/post/3',
                'content': 'Third post in thread'
            }
        ]

        save_synced_thread(
            posts=posts,
            source='twitter',
            synced_to='bluesky',
            thread_id='twitter_tweet_1',
            db_path=db_path
        )

        # Verify all 3 posts saved
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM synced_posts WHERE thread_id = ?",
            ('twitter_tweet_1',)
        )
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 3, "Should have 3 posts in thread"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_thread_position_ordering():
    """Test that thread_position is correctly assigned (0-indexed)"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Setup database
        migrate_database(db_path=db_path)
        migrate_database_v2(db_path=db_path)

        # Save 3-post thread
        posts = [
            {
                'twitter_id': 'tweet_1',
                'bluesky_uri': 'at://user/post/1',
                'content': 'First'
            },
            {
                'twitter_id': 'tweet_2',
                'bluesky_uri': 'at://user/post/2',
                'content': 'Second'
            },
            {
                'twitter_id': 'tweet_3',
                'bluesky_uri': 'at://user/post/3',
                'content': 'Third'
            }
        ]

        save_synced_thread(
            posts=posts,
            source='twitter',
            synced_to='bluesky',
            thread_id='twitter_tweet_1',
            db_path=db_path
        )

        # Verify positions are 0, 1, 2 in order
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT thread_position, original_text FROM synced_posts WHERE thread_id = ? ORDER BY thread_position",
            ('twitter_tweet_1',)
        )
        rows = cursor.fetchall()
        conn.close()

        assert len(rows) == 3, "Should have 3 posts"
        assert rows[0][0] == 0 and rows[0][1] == 'First', "First post should be position 0"
        assert rows[1][0] == 1 and rows[1][1] == 'Second', "Second post should be position 1"
        assert rows[2][0] == 2 and rows[2][1] == 'Third', "Third post should be position 2"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_is_thread_synced_returns_true():
    """Test that existing thread is detected"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Setup database
        migrate_database(db_path=db_path)
        migrate_database_v2(db_path=db_path)

        # Save a thread
        posts = [
            {
                'twitter_id': 'tweet_1',
                'bluesky_uri': 'at://user/post/1',
                'content': 'Thread post'
            }
        ]

        save_synced_thread(
            posts=posts,
            source='twitter',
            synced_to='bluesky',
            thread_id='twitter_existing',
            db_path=db_path
        )

        # Check if thread is synced
        result = is_thread_synced('twitter_existing', db_path=db_path)
        assert result is True, "Existing thread should be detected"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_is_thread_synced_returns_false():
    """Test that non-existent thread is not detected"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Setup database
        migrate_database(db_path=db_path)
        migrate_database_v2(db_path=db_path)

        # Check for non-existent thread
        result = is_thread_synced('twitter_nonexistent', db_path=db_path)
        assert result is False, "Non-existent thread should not be detected"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)
