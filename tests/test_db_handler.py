import sqlite3
import os
import tempfile
from app.db_handler import (
    initialize_db,
    is_tweet_seen,
    mark_tweet_as_seen,
    migrate_database,
    should_sync_post,
    save_synced_post,
    get_post_by_hash
)

def test_db_operations():
    # Use a temporary file for testing (in-memory doesn't work with separate connections)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Initialize the database
        initialize_db(db_path=db_path)

        # Create connection for testing
        conn = sqlite3.connect(db_path)

        # Perform some database operations to test functionality
        tweet_id = "12345"
        assert not is_tweet_seen(tweet_id, conn=conn)
        mark_tweet_as_seen(tweet_id, conn=conn)
        assert is_tweet_seen(tweet_id, conn=conn)

        # Close the connection after the test
        conn.close()
    finally:
        # Clean up the temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)


# BIDIR-003: New tests for database schema migration

def test_migration_from_seen_tweets():
    """Test migration from old seen_tweets schema to new synced_posts schema"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        # Create old schema with some data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE seen_tweets (
            id INTEGER PRIMARY KEY,
            tweet_id TEXT NOT NULL UNIQUE
        )
        """)
        cursor.execute("INSERT INTO seen_tweets (tweet_id) VALUES ('old_tweet_1')")
        cursor.execute("INSERT INTO seen_tweets (tweet_id) VALUES ('old_tweet_2')")
        conn.commit()
        conn.close()

        # Run migration
        migrate_database(db_path=db_path)

        # Verify new schema exists
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check synced_posts table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='synced_posts'")
        assert cursor.fetchone() is not None, "synced_posts table should exist"

        # Check indexes exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_twitter_id'")
        assert cursor.fetchone() is not None, "idx_twitter_id should exist"

        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_bluesky_uri'")
        assert cursor.fetchone() is not None, "idx_bluesky_uri should exist"

        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_content_hash'")
        assert cursor.fetchone() is not None, "idx_content_hash should exist"

        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_source'")
        assert cursor.fetchone() is not None, "idx_source should exist"

        conn.close()
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_should_sync_post_new_post():
    """Test that a new post should be synced"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        # New post should sync
        result = should_sync_post(
            content="This is a brand new post",
            source="twitter",
            post_id="tweet_123",
            db_path=db_path
        )
        assert result is True, "New post should be marked for sync"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_should_sync_post_duplicate_hash():
    """Test that duplicate content hash is not synced"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        content = "Duplicate content test"

        # First sync should succeed
        assert should_sync_post(content, "twitter", "tweet_1", db_path=db_path) is True
        save_synced_post(
            twitter_id="tweet_1",
            source="twitter",
            synced_to="bluesky",
            content=content,
            db_path=db_path
        )

        # Second sync with same content should fail (duplicate hash)
        result = should_sync_post(content, "bluesky", "post_1", db_path=db_path)
        assert result is False, "Duplicate content hash should not sync"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_should_sync_post_duplicate_twitter_id():
    """Test that duplicate Twitter ID is not synced"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        # Save a post with twitter_id
        save_synced_post(
            twitter_id="tweet_999",
            source="twitter",
            synced_to="bluesky",
            content="Original tweet",
            db_path=db_path
        )

        # Try to sync same twitter_id again
        result = should_sync_post(
            content="Different content",
            source="twitter",
            post_id="tweet_999",
            db_path=db_path
        )
        assert result is False, "Duplicate twitter_id should not sync"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_should_sync_post_duplicate_bluesky_uri():
    """Test that duplicate Bluesky URI is not synced"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        # Save a post with bluesky_uri
        save_synced_post(
            bluesky_uri="at://user/post/abc123",
            source="bluesky",
            synced_to="twitter",
            content="Original bluesky post",
            db_path=db_path
        )

        # Try to sync same bluesky_uri again
        result = should_sync_post(
            content="Different content",
            source="bluesky",
            post_id="at://user/post/abc123",
            db_path=db_path
        )
        assert result is False, "Duplicate bluesky_uri should not sync"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_save_synced_post_twitter_source():
    """Test saving a post from Twitter source"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        # Save Twitter post
        save_synced_post(
            twitter_id="tweet_456",
            bluesky_uri="at://user/post/xyz789",
            source="twitter",
            synced_to="bluesky",
            content="Hello from Twitter",
            db_path=db_path
        )

        # Verify it was saved
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM synced_posts WHERE twitter_id = ?", ("tweet_456",))
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Post should be saved"
        # Row format: (id, twitter_id, bluesky_uri, source, content_hash, synced_to, synced_at, original_text)
        assert row[1] == "tweet_456", "twitter_id should match"
        assert row[2] == "at://user/post/xyz789", "bluesky_uri should match"
        assert row[3] == "twitter", "source should be twitter"
        assert row[5] == "bluesky", "synced_to should be bluesky"
        assert row[7] == "Hello from Twitter", "content should match"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_save_synced_post_bluesky_source():
    """Test saving a post from Bluesky source"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        # Save Bluesky post
        save_synced_post(
            twitter_id="tweet_789",
            bluesky_uri="at://user/post/def456",
            source="bluesky",
            synced_to="twitter",
            content="Hello from Bluesky",
            db_path=db_path
        )

        # Verify it was saved
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM synced_posts WHERE bluesky_uri = ?", ("at://user/post/def456",))
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Post should be saved"
        assert row[2] == "at://user/post/def456", "bluesky_uri should match"
        assert row[3] == "bluesky", "source should be bluesky"
        assert row[5] == "twitter", "synced_to should be twitter"
        assert row[7] == "Hello from Bluesky", "content should match"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_post_by_hash():
    """Test querying post by content hash"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        migrate_database(db_path=db_path)

        content = "Test content for hash lookup"

        # Save a post
        save_synced_post(
            twitter_id="tweet_hash_test",
            source="twitter",
            synced_to="bluesky",
            content=content,
            db_path=db_path
        )

        # Get content hash (we'll need utils.py for this)
        from app.utils import compute_content_hash
        content_hash = compute_content_hash(content)

        # Query by hash
        result = get_post_by_hash(content_hash, db_path=db_path)

        assert result is not None, "Post should be found by hash"
        assert result[7] == content, "Content should match"
        assert result[1] == "tweet_hash_test", "twitter_id should match"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)
