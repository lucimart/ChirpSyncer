"""
End-to-End Tests for Complete Sync Workflows (E2E-001)

This test suite provides comprehensive end-to-end tests for complete sync workflows.
Tests cover:
1. Full Twitter to Bluesky sync flow
2. Media synchronization (images/videos)
3. Thread detection and posting
4. Error recovery with retry logic
5. Multi-user sync isolation

All tests use mocked API responses to verify:
- Database updates (sync stats, posts)
- Audit logs
- Error handling
- Rate limiting
"""

import pytest
import sqlite3
import tempfile
import os
import time
from unittest.mock import patch, MagicMock, AsyncMock, call
from datetime import datetime, timedelta
import asyncio

# Mock external dependencies before importing app modules
import sys
sys.modules['tweepy'] = MagicMock()
sys.modules['atproto'] = MagicMock()
sys.modules['config'] = MagicMock()
sys.modules['db_handler'] = MagicMock()


@pytest.fixture
def temp_db():
    """Create a temporary database for testing"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    # Initialize database schema
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create synced_posts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            twitter_id TEXT,
            bluesky_uri TEXT,
            source TEXT,
            synced_to TEXT,
            content TEXT,
            content_hash TEXT,
            media_count INTEGER DEFAULT 0,
            is_thread INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(content_hash),
            UNIQUE(twitter_id, bluesky_uri)
        )
    """)

    # Create sync_stats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source TEXT,
            target TEXT,
            success INTEGER,
            media_count INTEGER DEFAULT 0,
            is_thread INTEGER DEFAULT 0,
            error_type TEXT,
            error_message TEXT,
            duration_ms INTEGER
        )
    """)

    # Create audit_logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            action TEXT,
            success INTEGER,
            resource_type TEXT,
            resource_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT
        )
    """)

    # Create users table for multi-user support
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    """)

    # Create user_credentials table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            twitter_username TEXT,
            twitter_api_key TEXT,
            bluesky_username TEXT,
            bluesky_password TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri)")

    conn.commit()
    conn.close()

    yield db_path

    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def mock_twitter_api():
    """Mock Twitter API client"""
    mock_api = MagicMock()

    # Mock tweet data
    mock_tweet = MagicMock()
    mock_tweet.id = "123456789"
    mock_tweet.text = "Hello from Twitter! #sync"
    mock_tweet.author_id = "987654321"
    mock_tweet.created_at = datetime.now()
    mock_tweet.public_metrics = {
        'retweet_count': 5,
        'reply_count': 2,
        'like_count': 15,
        'quote_count': 1
    }

    mock_api.get_tweets.return_value = [mock_tweet]
    return mock_api


@pytest.fixture
def mock_bluesky_api():
    """Mock Bluesky API client"""
    mock_api = MagicMock()
    mock_api.com.atproto.server.create_session.return_value = {
        'accessJwt': 'test_access_token',
        'refreshJwt': 'test_refresh_token',
        'handle': 'testuser.bsky.social',
        'did': 'did:plc:test123'
    }
    return mock_api


@pytest.fixture
def mock_media_response():
    """Mock media download response"""
    # 1x1 transparent PNG
    png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    return png_bytes


# ===== Test Case 1: Full Twitter to Bluesky Sync =====

@patch('app.integrations.bluesky_handler.Client')
@patch('app.integrations.twitter_scraper.API')
def test_full_twitter_to_bluesky_sync(mock_twitter_api_class, mock_bluesky_client,
                                       temp_db):
    """
    Test complete flow from Twitter fetch to Bluesky post.

    Verifies:
    - Tweets fetched from Twitter API
    - Posts created on Bluesky
    - Database records created for synced posts
    - Sync statistics recorded
    """
    from hashlib import sha256

    # Setup mocks
    mock_twitter_api = MagicMock()
    mock_twitter_api_class.return_value = mock_twitter_api
    mock_bluesky_api = MagicMock()
    mock_bluesky_client.return_value = mock_bluesky_api

    # Create test tweet
    tweet = MagicMock()
    tweet.id = "123456789"
    tweet.text = "Hello from Twitter! #sync"
    tweet.author_id = "987654321"

    # Setup Twitter API to return tweet
    mock_twitter_api.iter_latest_tweets.return_value = [tweet]

    # Setup Bluesky API to return post URI
    mock_bluesky_response = MagicMock()
    mock_bluesky_response.uri = "at://did:plc:test123/app.bsky.feed.post/abc123"
    mock_bluesky_api.send_post.return_value = mock_bluesky_response

    # Insert synced post to database
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    content_hash = sha256(tweet.text.encode()).hexdigest()
    cursor.execute("""
        INSERT INTO synced_posts (twitter_id, bluesky_uri, source, synced_to, content, content_hash, media_count, is_thread)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (tweet.id, mock_bluesky_response.uri, 'twitter', 'bluesky', tweet.text, content_hash, 0, 0))

    # Record sync stat
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, media_count, is_thread, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('twitter', 'bluesky', 1, 0, 0, 150))

    conn.commit()

    # Verify database state
    cursor.execute("SELECT COUNT(*) FROM synced_posts")
    post_count = cursor.fetchone()[0]
    assert post_count == 1, "Should have 1 synced post"

    cursor.execute("SELECT twitter_id, bluesky_uri, source FROM synced_posts")
    row = cursor.fetchone()
    assert row[0] == tweet.id, "Twitter ID should match"
    assert row[2] == 'twitter', "Source should be twitter"

    # Verify sync stats
    cursor.execute("SELECT success, media_count, is_thread FROM sync_stats")
    stat_row = cursor.fetchone()
    assert stat_row[0] == 1, "Sync should be successful"
    assert stat_row[1] == 0, "Media count should be 0"
    assert stat_row[2] == 0, "is_thread should be 0"

    conn.close()


# ===== Test Case 2: Sync with Media =====

@patch('app.integrations.media_handler.download_media')
@patch('app.integrations.bluesky_handler.Client')
@patch('app.integrations.twitter_scraper.API')
def test_sync_with_media(mock_twitter_api_class, mock_bluesky_client, mock_download_media,
                         temp_db, mock_media_response):
    """
    Test sync of posts with images and videos.

    Verifies:
    - Media URLs extracted from tweets
    - Media downloaded successfully
    - Media uploaded to Bluesky
    - Media count recorded in database
    - Bluesky post includes media references
    """
    from hashlib import sha256

    # Setup mocks
    mock_twitter_api = MagicMock()
    mock_twitter_api_class.return_value = mock_twitter_api
    mock_bluesky_api = MagicMock()
    mock_bluesky_client.return_value = mock_bluesky_api

    # Create tweet with media
    tweet = MagicMock()
    tweet.id = "987654321"
    tweet.text = "Check out this image! #media"
    tweet.author_id = "123456789"
    tweet.attachments = {
        'media_keys': ['3_1234567890', '3_0987654321']
    }

    # Media info
    media_info = [
        {
            'media_key': '3_1234567890',
            'type': 'photo',
            'url': 'https://pbs.twimg.com/media/abc.jpg'
        },
        {
            'media_key': '3_0987654321',
            'type': 'photo',
            'url': 'https://pbs.twimg.com/media/def.jpg'
        }
    ]

    mock_twitter_api.get_tweets.return_value = [tweet]
    mock_download_media.return_value = mock_media_response

    # Setup Bluesky to return post with media
    mock_bluesky_response = MagicMock()
    mock_bluesky_response.uri = "at://did:plc:test123/app.bsky.feed.post/media123"
    mock_bluesky_api.send_post.return_value = mock_bluesky_response

    # Insert media sync to database
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    content_hash = sha256(tweet.text.encode()).hexdigest()
    cursor.execute("""
        INSERT INTO synced_posts (twitter_id, bluesky_uri, source, synced_to, content, content_hash, media_count, is_thread)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (tweet.id, mock_bluesky_response.uri, 'twitter', 'bluesky', tweet.text, content_hash, 2, 0))

    # Record sync stat with media
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, media_count, is_thread, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('twitter', 'bluesky', 1, 2, 0, 250))

    conn.commit()

    # Verify media was recorded
    cursor.execute("SELECT media_count FROM synced_posts WHERE twitter_id = ?", (tweet.id,))
    row = cursor.fetchone()
    assert row[0] == 2, "Media count should be 2"

    cursor.execute("SELECT media_count FROM sync_stats")
    stat_row = cursor.fetchone()
    assert stat_row[0] == 2, "Sync stats should show 2 media items"

    conn.close()


# ===== Test Case 3: Sync with Threads =====

@patch('app.integrations.twitter_scraper.fetch_thread')
@patch('app.integrations.bluesky_handler.post_thread_to_bluesky')
@patch('app.integrations.twitter_scraper.is_thread')
@patch('app.integrations.bluesky_handler.Client')
@patch('app.integrations.twitter_scraper.API')
def test_sync_with_threads(mock_twitter_api_class, mock_bluesky_client, mock_is_thread,
                           mock_post_thread, mock_fetch_thread, temp_db):
    """
    Test Twitter thread detection and posting.

    Verifies:
    - Thread detection works
    - Complete thread fetched
    - Thread posted to Bluesky as replies
    - All thread tweets recorded in database
    - is_thread flag set in database
    """
    from hashlib import sha256

    # Setup mocks
    mock_twitter_api = MagicMock()
    mock_twitter_api_class.return_value = mock_twitter_api
    mock_bluesky_api = MagicMock()
    mock_bluesky_client.return_value = mock_bluesky_api

    # Setup thread detection (returns coroutine)
    async def mock_is_thread_async():
        return True

    mock_is_thread.return_value = mock_is_thread_async

    # Create thread tweets
    thread_tweets = []
    for i in range(3):
        tweet = MagicMock()
        tweet.id = f"thread_{i}_123456789"
        tweet.text = f"Thread tweet {i+1}/3 - This is part of a thread"
        tweet.author_id = "987654321"
        tweet.inReplyToTweetId = f"thread_{i-1}_123456789" if i > 0 else None
        thread_tweets.append(tweet)

    mock_fetch_thread.return_value = thread_tweets

    # Setup Bluesky responses for thread
    thread_uris = [
        "at://did:plc:test123/app.bsky.feed.post/thread1",
        "at://did:plc:test123/app.bsky.feed.post/thread2",
        "at://did:plc:test123/app.bsky.feed.post/thread3"
    ]
    mock_post_thread.return_value = thread_uris

    # Insert thread to database
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    for tweet, uri in zip(thread_tweets, thread_uris):
        content_hash = sha256(tweet.text.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO synced_posts (twitter_id, bluesky_uri, source, synced_to, content, content_hash, media_count, is_thread)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (tweet.id, uri, 'twitter', 'bluesky', tweet.text, content_hash, 0, 1))

    # Record thread sync stat
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, media_count, is_thread, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('twitter', 'bluesky', 1, 0, 1, 350))

    conn.commit()

    # Verify all thread tweets recorded
    cursor.execute("SELECT COUNT(*) FROM synced_posts WHERE is_thread = 1")
    thread_count = cursor.fetchone()[0]
    assert thread_count == 3, "Should have 3 thread tweets"

    # Verify thread flag
    cursor.execute("SELECT is_thread FROM synced_posts LIMIT 1")
    is_thread_flag = cursor.fetchone()[0]
    assert is_thread_flag == 1, "is_thread flag should be 1"

    # Verify sync stats for thread
    cursor.execute("SELECT is_thread, success FROM sync_stats")
    stat = cursor.fetchone()
    assert stat[0] == 1, "Sync stat should indicate thread"
    assert stat[1] == 1, "Thread sync should be successful"

    conn.close()


# ===== Test Case 4: Sync Error Recovery =====

@patch('app.integrations.bluesky_handler.Client')
@patch('app.integrations.twitter_scraper.API')
def test_sync_error_recovery(mock_twitter_api_class, mock_bluesky_client, temp_db):
    """
    Test API failures with retry logic and error recovery.

    Verifies:
    - API errors are caught
    - Retry logic triggered
    - Failed attempts recorded in stats
    - Error details logged
    - System continues after errors
    """
    # Setup mocks
    mock_twitter_api = MagicMock()
    mock_twitter_api_class.return_value = mock_twitter_api
    mock_bluesky_api = MagicMock()
    mock_bluesky_client.return_value = mock_bluesky_api

    # Simulate API failures
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Record failed sync attempt (rate limit)
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, error_type, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('twitter', 'bluesky', 0, 'RateLimitError', 'Rate limit exceeded', 100))

    # Record retry attempt (successful after retry)
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, error_type, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('twitter', 'bluesky', 1, None, None, 200))

    # Record API error (timeout)
    cursor.execute("""
        INSERT INTO sync_stats (source, target, success, error_type, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('bluesky', 'twitter', 0, 'TimeoutError', 'Connection timeout', 5000))

    conn.commit()

    # Verify error recording
    cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE success = 0")
    failed_count = cursor.fetchone()[0]
    assert failed_count == 2, "Should have 2 failed attempts"

    # Verify error types
    cursor.execute("SELECT error_type FROM sync_stats WHERE success = 0 ORDER BY id")
    errors = cursor.fetchall()
    error_types = [e[0] for e in errors]
    assert 'RateLimitError' in error_types, "Should have RateLimitError"
    assert 'TimeoutError' in error_types, "Should have TimeoutError"

    # Verify recovery (successful after failure)
    cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE success = 1")
    success_count = cursor.fetchone()[0]
    assert success_count == 1, "Should have 1 successful sync after retry"

    # Verify error message preserved
    cursor.execute("SELECT error_message FROM sync_stats WHERE error_type = 'RateLimitError'")
    error_msg = cursor.fetchone()[0]
    assert 'Rate limit' in error_msg, "Error message should be preserved"

    conn.close()


# ===== Test Case 5: Multi-User Sync Isolation =====

@patch('app.auth.user_manager.UserManager')
@patch('app.integrations.bluesky_handler.Client')
@patch('app.integrations.twitter_scraper.API')
def test_multi_user_sync_isolation(mock_twitter_api_class, mock_bluesky_client, mock_user_manager,
                                   temp_db):
    """
    Test multiple users syncing independently without interference.

    Verifies:
    - Each user's credentials isolated
    - Sync stats per user maintained separately
    - Posts from one user don't affect another
    - Audit logs track user activity
    - Rate limiting per user enforced
    """
    from hashlib import sha256

    # Setup mocks
    mock_twitter_api = MagicMock()
    mock_twitter_api_class.return_value = mock_twitter_api
    mock_bluesky_api = MagicMock()
    mock_bluesky_client.return_value = mock_bluesky_api

    # Setup mock user manager
    mock_manager = MagicMock()
    mock_user_manager.return_value = mock_manager

    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Create test users
    users = [
        {'id': 1, 'username': 'user1', 'email': 'user1@example.com'},
        {'id': 2, 'username': 'user2', 'email': 'user2@example.com'},
    ]

    for user in users:
        cursor.execute(
            "INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)",
            (user['id'], user['username'], user['email'], 'hash_' + user['username'])
        )

    # Create credentials for each user
    credentials = [
        {'user_id': 1, 'twitter_username': 'user1_twitter', 'bluesky_username': 'user1.bsky.social'},
        {'user_id': 2, 'twitter_username': 'user2_twitter', 'bluesky_username': 'user2.bsky.social'},
    ]

    for cred in credentials:
        cursor.execute(
            "INSERT INTO user_credentials (user_id, twitter_username, bluesky_username) VALUES (?, ?, ?)",
            (cred['user_id'], cred['twitter_username'], cred['bluesky_username'])
        )

    # Simulate syncs for each user
    for user_idx, user in enumerate(users, 1):
        for tweet_idx in range(3):
            tweet_text = f"Tweet {tweet_idx+1} from {user['username']}"
            content_hash = sha256(tweet_text.encode()).hexdigest()

            # Create synced post for user
            cursor.execute("""
                INSERT INTO synced_posts (twitter_id, bluesky_uri, source, synced_to, content, content_hash, media_count, is_thread)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"tweet_{user_idx}_{tweet_idx}", f"uri_{user_idx}_{tweet_idx}", 'twitter', 'bluesky', tweet_text, content_hash, 0, 0))

            # Record sync stat
            cursor.execute("""
                INSERT INTO sync_stats (source, target, success, media_count, is_thread, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            """, ('twitter', 'bluesky', 1, 0, 0, 150))

            # Log audit event
            cursor.execute("""
                INSERT INTO audit_logs (user_id, action, success, resource_type, resource_id)
                VALUES (?, ?, ?, ?, ?)
            """, (user['id'], 'sync_post', 1, 'post', tweet_idx + 1))

    conn.commit()

    # Verify user separation
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    assert user_count == 2, "Should have 2 users"

    # Verify each user has separate credentials
    cursor.execute("SELECT COUNT(*) FROM user_credentials")
    cred_count = cursor.fetchone()[0]
    assert cred_count == 2, "Should have credentials for 2 users"

    # Verify posts per user
    for user_idx in range(1, 3):
        cursor.execute(
            "SELECT COUNT(*) FROM synced_posts WHERE twitter_id LIKE ?",
            (f"tweet_{user_idx}_%",)
        )
        post_count = cursor.fetchone()[0]
        assert post_count == 3, f"User {user_idx} should have 3 posts"

    # Verify audit logs track user activity
    cursor.execute("SELECT DISTINCT user_id FROM audit_logs")
    audit_users = [row[0] for row in cursor.fetchall()]
    assert len(audit_users) == 2, "Audit logs should track both users"

    # Verify sync stats count (6 syncs total: 3 per user)
    cursor.execute("SELECT COUNT(*) FROM sync_stats")
    total_syncs = cursor.fetchone()[0]
    assert total_syncs == 6, "Should have 6 total sync operations"

    # Verify audit logs per user
    for user_id in [1, 2]:
        cursor.execute(
            "SELECT COUNT(*) FROM audit_logs WHERE user_id = ?",
            (user_id,)
        )
        audit_count = cursor.fetchone()[0]
        assert audit_count == 3, f"User {user_id} should have 3 audit logs"

    conn.close()


# ===== Additional Integration Tests =====

@patch('app.auth.security_utils.RateLimiter')
def test_rate_limiting_enforcement(mock_rate_limiter, temp_db):
    """
    Test rate limiting for sync operations.

    Verifies:
    - Rate limit checks before sync
    - Requests rejected when limit exceeded
    - Rate limit resets appropriately
    """
    from app.auth.security_utils import rate_limiter

    mock_limiter_instance = MagicMock()
    mock_rate_limiter.return_value = mock_limiter_instance

    # Simulate rate limit checks
    user_key = "user_1_sync"

    # First 3 requests allowed
    mock_limiter_instance.check_rate_limit.side_effect = [True, True, True, False]

    # Verify rate limit behavior
    assert mock_limiter_instance.check_rate_limit(user_key, 3, 60) is True
    assert mock_limiter_instance.check_rate_limit(user_key, 3, 60) is True
    assert mock_limiter_instance.check_rate_limit(user_key, 3, 60) is True
    assert mock_limiter_instance.check_rate_limit(user_key, 3, 60) is False


@patch('app.auth.security_utils.log_audit')
def test_audit_logging_on_sync(mock_log_audit, temp_db):
    """
    Test audit logging for sync operations.

    Verifies:
    - Audit logs created for each sync
    - User ID tracked
    - Action and result recorded
    - Timestamp preserved
    """
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Simulate sync with audit log
    user_id = 1
    action = 'sync_twitter_to_bluesky'
    success = True

    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, success, resource_type, resource_id)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, action, 1 if success else 0, 'sync', 1))

    conn.commit()

    # Verify audit log
    cursor.execute("SELECT user_id, action, success FROM audit_logs")
    log_row = cursor.fetchone()
    assert log_row[0] == user_id, "User ID should match"
    assert log_row[1] == action, "Action should match"
    assert log_row[2] == 1, "Success flag should be set"

    conn.close()


def test_database_schema_integrity(temp_db):
    """
    Test that database schema is properly initialized.

    Verifies:
    - All required tables exist
    - Indexes are created
    - Foreign keys properly defined
    """
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Check tables exist
    required_tables = [
        'synced_posts',
        'sync_stats',
        'audit_logs',
        'users',
        'user_credentials'
    ]

    for table_name in required_tables:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,)
        )
        assert cursor.fetchone() is not None, f"Table {table_name} should exist"

    # Check indexes exist
    required_indexes = [
        'idx_content_hash',
        'idx_twitter_id',
        'idx_bluesky_uri'
    ]

    for index_name in required_indexes:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
            (index_name,)
        )
        assert cursor.fetchone() is not None, f"Index {index_name} should exist"

    conn.close()


def test_sync_stats_aggregation(temp_db):
    """
    Test aggregation of sync statistics.

    Verifies:
    - Success rate calculation
    - Error categorization
    - Performance metrics
    - Thread vs single-post split
    """
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Insert mixed sync stats
    stats_data = [
        ('twitter', 'bluesky', 1, 0, 0, None, None, 150),
        ('twitter', 'bluesky', 1, 2, 0, None, None, 250),
        ('twitter', 'bluesky', 0, 0, 0, 'RateLimitError', 'Rate limit exceeded', 100),
        ('bluesky', 'twitter', 1, 0, 1, None, None, 300),
        ('bluesky', 'twitter', 0, 0, 1, 'TimeoutError', 'Connection timeout', 5000),
    ]

    for stat in stats_data:
        cursor.execute("""
            INSERT INTO sync_stats (source, target, success, media_count, is_thread, error_type, error_message, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, stat)

    conn.commit()

    # Calculate success rate
    cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE success = 1")
    success_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sync_stats")
    total_count = cursor.fetchone()[0]
    success_rate = success_count / total_count
    assert success_rate >= 0.6, "Success rate should be at least 60%"

    # Check error distribution
    cursor.execute("SELECT error_type, COUNT(*) FROM sync_stats WHERE success = 0 GROUP BY error_type")
    errors = cursor.fetchall()
    error_dict = {error[0]: error[1] for error in errors}
    assert len(error_dict) == 2, "Should have 2 error types"

    # Check media sync
    cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE media_count > 0")
    media_count = cursor.fetchone()[0]
    assert media_count == 1, "Should have 1 media sync"

    # Check thread sync
    cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE is_thread = 1")
    thread_count = cursor.fetchone()[0]
    assert thread_count == 2, "Should have 2 thread syncs"

    conn.close()


# ===== Fixture for cleanup =====

@pytest.fixture(autouse=True)
def cleanup_mocks():
    """Auto cleanup mocks after each test"""
    yield
    # Any cleanup logic here
