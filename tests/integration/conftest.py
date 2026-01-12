"""
Integration Tests Fixtures - Pytest Configuration (Sprint 7)

Provides shared pytest fixtures for integration tests including:
- Temporary SQLite database with schema initialization
- Test user creation and authentication
- Mock Twitter API responses
- Mock Bluesky API responses
- Flask application instance for testing

All fixtures are session-scoped or function-scoped as appropriate to provide
clean state for each test while maintaining performance.

Usage:
    Simply import fixtures in test modules via pytest's automatic discovery.
    Fixtures can be requested as function arguments:

    def test_sync_workflow(test_db, test_user, mock_twitter_api, integration_app):
        '''Test complete sync workflow'''
        pass
"""

import os
import sys
import sqlite3
import tempfile
import hashlib
import json
from pathlib import Path
from unittest.mock import MagicMock, patch, Mock
from typing import Dict, Optional, Tuple

import pytest

# Add app directory to path for imports
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)


# =============================================================================
# DATABASE FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def test_db_path():
    """
    Create a temporary database file path for testing.

    This fixture creates a unique temporary file path that will be used
    for test database operations. The file is cleaned up after the test
    completes.

    Yields:
        str: Path to temporary database file

    Example:
        def test_database(test_db_path):
            db = Database(test_db_path)
            # Test database operations
    """
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture(scope="function")
def test_db(test_db_path):
    """
    Create and initialize a temporary SQLite database with all required tables.

    This fixture sets up a complete database schema including:
    - Users and authentication tables (users, user_sessions)
    - Sync tracking tables (synced_posts)
    - Statistics tables (sync_stats, hourly_stats)
    - Credentials table for multi-user support

    All tables are created with proper indexes and constraints to match
    the production schema.

    Args:
        test_db_path: Path to temporary database file

    Yields:
        sqlite3.Connection: Database connection with row factory configured

    Example:
        def test_user_creation(test_db):
            cursor = test_db.cursor()
            cursor.execute('INSERT INTO users ...')
            test_db.commit()
    """
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create users table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_login INTEGER,
            is_active INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            settings_json TEXT
        )
    """
    )

    # Create user_sessions table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    # Create user_credentials table for encrypted credentials storage
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            credential_type TEXT NOT NULL,
            encrypted_data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, platform, credential_type)
        )
    """
    )

    # Create synced_posts table for tracking bidirectional sync
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            twitter_id TEXT,
            bluesky_uri TEXT,
            source TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            synced_to TEXT,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            original_text TEXT NOT NULL,
            CHECK (source IN ('twitter', 'bluesky')),
            CHECK (synced_to IN ('bluesky', 'twitter', 'both'))
        )
    """
    )

    # Create indexes for synced_posts
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash)"
    )
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON synced_posts(source)")

    # Create sync_stats table for tracking sync metrics
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            success INTEGER NOT NULL,
            media_count INTEGER DEFAULT 0,
            is_thread INTEGER DEFAULT 0,
            error_type TEXT,
            error_message TEXT,
            duration_ms INTEGER,
            user_id INTEGER
        )
    """
    )

    # Create hourly_stats table for aggregated metrics
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS hourly_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hour_timestamp INTEGER NOT NULL UNIQUE,
            total_syncs INTEGER DEFAULT 0,
            successful_syncs INTEGER DEFAULT 0,
            failed_syncs INTEGER DEFAULT 0,
            twitter_to_bluesky INTEGER DEFAULT 0,
            bluesky_to_twitter INTEGER DEFAULT 0,
            total_media INTEGER DEFAULT 0,
            total_threads INTEGER DEFAULT 0,
            avg_duration_ms REAL DEFAULT 0
        )
    """
    )

    # Create indexes for stats tables
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_sync_stats_timestamp ON sync_stats(timestamp)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_sync_stats_success ON sync_stats(success)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_hourly_stats_timestamp ON hourly_stats(hour_timestamp)"
    )

    # Create audit_log table for security tracking
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            success INTEGER NOT NULL,
            details TEXT,
            timestamp INTEGER NOT NULL,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """
    )

    # Create cleanup_rules table for cleanup engine
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cleanup_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            rule_type TEXT NOT NULL,
            rule_config TEXT NOT NULL,
            last_run INTEGER,
            deleted_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    # Create cleanup_history table for tracking cleanup executions
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cleanup_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            tweets_deleted INTEGER DEFAULT 0,
            executed_at INTEGER NOT NULL,
            dry_run INTEGER DEFAULT 1,
            FOREIGN KEY (rule_id) REFERENCES cleanup_rules(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    # Create indexes for cleanup tables
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_rules_user ON cleanup_rules(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_history_user ON cleanup_history(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_cleanup_history_rule ON cleanup_history(rule_id)"
    )

    conn.commit()
    yield conn
    conn.close()


# =============================================================================
# USER FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def test_user(test_db) -> Dict:
    """
    Create a test user in the database with standard credentials.

    This fixture creates a test user with pre-defined credentials suitable
    for integration testing. The user is created with bcrypt hashed password
    and is set as active by default.

    Database Schema Used:
        - users table: Stores user account information
        - password_hash: bcrypt hashed version of the test password

    Returns:
        Dict: Test user data containing:
            - id: User ID in database
            - username: Username for login (default: 'testuser')
            - email: Email address (default: 'testuser@example.com')
            - password: Plain text password for testing (default: 'TestPassword123!')
            - is_admin: Admin flag (default: False)

    Args:
        test_db: Database connection fixture

    Example:
        def test_user_login(test_db, test_user):
            assert test_user['username'] == 'testuser'
            assert test_user['email'] == 'testuser@example.com'
    """
    import bcrypt
    import time

    username = "testuser"
    email = "testuser@example.com"
    password = "TestPassword123!"

    # Hash password with bcrypt (cost factor 12)
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))

    cursor = test_db.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 0)
    """,
        (username, email, password_hash.decode("utf-8"), int(time.time())),
    )

    user_id = cursor.lastrowid
    test_db.commit()

    return {
        "id": user_id,
        "username": username,
        "email": email,
        "password": password,
        "is_admin": False,
    }


@pytest.fixture(scope="function")
def test_admin_user(test_db) -> Dict:
    """
    Create a test admin user in the database.

    Similar to test_user fixture but creates a user with admin privileges.
    Useful for testing admin-only operations and role-based access control.

    Returns:
        Dict: Test admin user data containing:
            - id: User ID in database
            - username: Username (default: 'admin')
            - email: Email address (default: 'admin@example.com')
            - password: Plain text password (default: 'AdminPassword123!')
            - is_admin: Admin flag (always True)

    Args:
        test_db: Database connection fixture

    Example:
        def test_admin_operations(test_db, test_admin_user):
            cursor = test_db.cursor()
            cursor.execute('SELECT is_admin FROM users WHERE id = ?', (test_admin_user['id'],))
            row = cursor.fetchone()
            assert row['is_admin'] == 1
    """
    import bcrypt
    import time

    username = "admin"
    email = "admin@example.com"
    password = "AdminPassword123!"

    # Hash password with bcrypt
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))

    cursor = test_db.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 1)
    """,
        (username, email, password_hash.decode("utf-8"), int(time.time())),
    )

    user_id = cursor.lastrowid
    test_db.commit()

    return {
        "id": user_id,
        "username": username,
        "email": email,
        "password": password,
        "is_admin": True,
    }


# =============================================================================
# MOCK API FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def mock_twitter_api():
    """
    Create a mock Twitter API client for testing.

    Returns a MagicMock object that simulates Twitter API responses for
    common operations. The mock is pre-configured with typical response
    patterns that match the actual Twitter API structure.

    Mocked Methods:
        - get_user(): Returns mock user data
        - search_tweets(): Returns list of mock tweets
        - get_home_timeline(): Returns mock timeline tweets
        - post_tweet(): Returns tweet ID
        - get_tweet(): Returns mock tweet data
        - get_media_upload(): Simulates media upload

    Returns:
        MagicMock: Configured mock Twitter API client

    Example:
        def test_twitter_integration(mock_twitter_api):
            mock_twitter_api.search_tweets.return_value = [
                {'id': '123', 'text': 'Test tweet', 'created_at': '2024-01-01T00:00:00Z'}
            ]
            tweets = mock_twitter_api.search_tweets(q='test')
            assert len(tweets) == 1
            assert tweets[0]['text'] == 'Test tweet'
    """
    api = MagicMock()

    # Mock user data
    api.get_user.return_value = {
        "id": "123456789",
        "screen_name": "testuser",
        "name": "Test User",
        "followers_count": 100,
        "friends_count": 50,
        "verified": False,
        "created_at": "Mon Jan 01 00:00:00 +0000 2024",
    }

    # Mock search tweets
    api.search_tweets.return_value = [
        {
            "id": "1001",
            "text": "Test tweet 1",
            "created_at": "Mon Jan 01 12:00:00 +0000 2024",
            "author_id": "123456789",
            "author": {"username": "testuser"},
            "public_metrics": {
                "retweet_count": 5,
                "reply_count": 2,
                "like_count": 10,
                "quote_count": 1,
            },
        },
        {
            "id": "1002",
            "text": "Test tweet 2 with #hashtag",
            "created_at": "Mon Jan 01 13:00:00 +0000 2024",
            "author_id": "123456789",
            "author": {"username": "testuser"},
            "public_metrics": {
                "retweet_count": 3,
                "reply_count": 1,
                "like_count": 7,
                "quote_count": 0,
            },
        },
    ]

    # Mock home timeline
    api.get_home_timeline.return_value = [
        {
            "id": "2001",
            "text": "Timeline tweet 1",
            "created_at": "Mon Jan 01 14:00:00 +0000 2024",
            "author_id": "987654321",
            "author": {"username": "other_user"},
        }
    ]

    # Mock post tweet
    api.post_tweet.return_value = {
        "data": {"id": "3001", "text": "Posted tweet"},
        "errors": None,
    }

    # Mock get tweet
    api.get_tweet.return_value = {
        "id": "1001",
        "text": "Test tweet 1",
        "author_id": "123456789",
    }

    # Mock media upload
    api.upload_media.return_value = {
        "media_id": "media_123",
        "size": 2048,
        "expires_after_secs": 3600,
    }

    # Mock like/retweet operations
    api.like.return_value = {"data": {"liked": True}}
    api.retweet.return_value = {"data": {"retweeted": True}}
    api.unlike.return_value = {"data": {"liked": False}}
    api.unretweet.return_value = {"data": {"retweeted": False}}

    # Add side effects for more complex scenarios
    api.search_tweets.side_effect = None  # Clear side effects

    return api


@pytest.fixture(scope="function")
def mock_bluesky_api():
    """
    Create a mock Bluesky API client for testing.

    Returns a MagicMock object that simulates Bluesky API responses for
    common operations. The mock is pre-configured with typical response
    patterns that match the AT Protocol structure.

    Mocked Methods:
        - login(): Simulates session creation
        - get_profile(): Returns mock profile data
        - get_timeline(): Returns mock feed posts
        - send_post(): Returns post URI
        - get_post(): Returns mock post data
        - delete_post(): Simulates post deletion
        - like(): Simulates liking a post
        - repost(): Simulates reposting

    Returns:
        MagicMock: Configured mock Bluesky API client

    Example:
        def test_bluesky_integration(mock_bluesky_api):
            mock_bluesky_api.get_timeline.return_value = {
                'feed': [
                    {
                        'post': {
                            'uri': 'at://did:plc:test/app.bsky.feed.post/123',
                            'cid': 'cid123',
                            'record': {'text': 'Test post', 'createdAt': '2024-01-01T00:00:00Z'}
                        }
                    }
                ]
            }
            timeline = mock_bluesky_api.get_timeline()
            assert len(timeline['feed']) == 1
    """
    api = MagicMock()

    # Mock login
    api.login.return_value = {
        "accessJwt": "jwt_token_123",
        "refreshJwt": "refresh_token_123",
        "handle": "testuser.bsky.social",
        "did": "did:plc:testuser123",
    }

    # Mock get profile
    api.get_profile.return_value = {
        "did": "did:plc:testuser123",
        "handle": "testuser.bsky.social",
        "displayName": "Test User",
        "description": "Test description",
        "followersCount": 100,
        "followsCount": 50,
        "postsCount": 25,
        "created_at": "2023-01-01T00:00:00Z",
    }

    # Mock get timeline (feed)
    api.get_timeline.return_value = {
        "feed": [
            {
                "post": {
                    "uri": "at://did:plc:testuser123/app.bsky.feed.post/bsky001",
                    "cid": "cid_bsky001",
                    "record": {
                        "text": "Test Bluesky post 1",
                        "createdAt": "2024-01-01T12:00:00Z",
                        "facets": [],
                        "reply": None,
                    },
                    "author": {
                        "did": "did:plc:testuser123",
                        "handle": "testuser.bsky.social",
                    },
                },
                "likeCount": 10,
                "replyCount": 2,
                "repostCount": 5,
            },
            {
                "post": {
                    "uri": "at://did:plc:testuser123/app.bsky.feed.post/bsky002",
                    "cid": "cid_bsky002",
                    "record": {
                        "text": "Test Bluesky post 2 with #hashtag",
                        "createdAt": "2024-01-01T13:00:00Z",
                        "facets": [],
                        "reply": None,
                    },
                    "author": {
                        "did": "did:plc:testuser123",
                        "handle": "testuser.bsky.social",
                    },
                },
                "likeCount": 7,
                "replyCount": 1,
                "repostCount": 3,
            },
        ],
        "cursor": "next_cursor_123",
    }

    # Mock send post (create post)
    api.send_post.return_value = {
        "uri": "at://did:plc:testuser123/app.bsky.feed.post/posted001",
        "cid": "cid_posted001",
    }

    # Mock get post
    api.get_post.return_value = {
        "post": {
            "uri": "at://did:plc:testuser123/app.bsky.feed.post/bsky001",
            "cid": "cid_bsky001",
            "record": {
                "text": "Test Bluesky post 1",
                "createdAt": "2024-01-01T12:00:00Z",
            },
            "author": {
                "did": "did:plc:testuser123",
                "handle": "testuser.bsky.social",
            },
        }
    }

    # Mock delete post
    api.delete_post.return_value = {"success": True}

    # Mock like operation
    api.like.return_value = {
        "uri": "at://did:plc:testuser123/app.bsky.feed.like/like001",
        "cid": "cid_like001",
    }

    # Mock repost operation
    api.repost.return_value = {
        "uri": "at://did:plc:testuser123/app.bsky.feed.repost/repost001",
        "cid": "cid_repost001",
    }

    # Mock unlike operation
    api.unlike.return_value = None

    # Mock unrepost operation
    api.unrepost.return_value = None

    return api


# =============================================================================
# FLASK APP FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def integration_app(test_db_path):
    """
    Create a Flask application instance configured for integration testing.

    This fixture creates a fully configured Flask app with:
    - Test configuration (DEBUG=True, TESTING=True)
    - SQLite database connected (using test_db_path)
    - In-memory session storage
    - All necessary extensions initialized
    - Secret key configured for session handling

    The app is configured to use the temporary test database instead of the
    production database, ensuring test isolation.

    Configuration:
        - SECRET_KEY: Generated secure random key
        - TESTING: True (enables test mode with full error reports)
        - SQLALCHEMY_DATABASE_URI: Points to test database
        - SESSION_TYPE: filesystem (in-memory for tests)
        - JSON_SORT_KEYS: False (for readable test output)

    Args:
        test_db_path: Path to temporary test database

    Yields:
        Flask: Configured Flask application instance

    Example:
        def test_app_creation(integration_app):
            assert integration_app.config['TESTING'] is True
            assert integration_app.config['DB_PATH'] == test_db_path

        def test_app_routes(integration_app):
            client = integration_app.test_client()
            response = client.get('/health')
            assert response.status_code in [200, 404]  # Depends on routes
    """
    # Import Flask app factory
    from app.web.dashboard import create_app

    # Create app with test database
    app = create_app(db_path=test_db_path, master_key=None)

    # Configure for testing
    app.config["TESTING"] = True
    app.config["DEBUG"] = True
    app.config["JSON_SORT_KEYS"] = False
    app.config["PRESERVE_CONTEXT_ON_EXCEPTION"] = False

    # Disable CSRF for testing
    app.config["WTF_CSRF_ENABLED"] = False

    yield app


@pytest.fixture(scope="function")
def test_client(integration_app):
    """
    Create a Flask test client for making requests to the app.

    This fixture provides a test client that can be used to make HTTP requests
    to the Flask application without running a live server. Useful for
    integration testing routes, request handling, and responses.

    Args:
        integration_app: Flask application fixture

    Returns:
        FlaskClient: Test client for making requests

    Example:
        def test_login_route(test_client, test_user):
            response = test_client.post('/login', data={
                'username': test_user['username'],
                'password': test_user['password']
            })
            assert response.status_code in [200, 302]
    """
    return integration_app.test_client()


@pytest.fixture(scope="function")
def app_context(integration_app):
    """
    Create an application context for the Flask app.

    This fixture provides an application context which is required for
    accessing context-local objects like current_app and g in tests.

    Args:
        integration_app: Flask application fixture

    Yields:
        AppContext: Application context for the Flask app

    Example:
        def test_app_context(app_context, integration_app):
            from flask import current_app
            assert current_app is integration_app
    """
    with integration_app.app_context():
        yield


# =============================================================================
# HELPER FIXTURES AND UTILITIES
# =============================================================================


@pytest.fixture(scope="function")
def user_session(test_db, test_user) -> str:
    """
    Create an authenticated session for a test user.

    This fixture creates a user session token that can be used to simulate
    an authenticated user for protected routes and operations.

    Returns:
        str: Session token for authenticated requests

    Args:
        test_db: Database connection fixture
        test_user: Test user fixture

    Example:
        def test_protected_route(test_client, user_session):
            response = test_client.get('/dashboard', headers={
                'Authorization': f'Bearer {user_session}'
            })
            assert response.status_code == 200
    """
    import secrets
    import time

    session_token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + 3600  # 1 hour expiry

    cursor = test_db.cursor()
    cursor.execute(
        """
        INSERT INTO user_sessions
        (user_id, session_token, created_at, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        (
            test_user["id"],
            session_token,
            int(time.time()),
            expires_at,
            "127.0.0.1",
            "TestClient/1.0",
        ),
    )
    test_db.commit()

    return session_token


@pytest.fixture(scope="function")
def sample_tweets():
    """
    Provide sample tweet data for testing.

    Returns a list of mock tweet objects that simulate Twitter API responses.
    Useful for testing sync operations and tweet processing.

    Returns:
        list: List of sample tweet dictionaries

    Example:
        def test_tweet_processing(sample_tweets):
            assert len(sample_tweets) > 0
            assert 'id' in sample_tweets[0]
            assert 'text' in sample_tweets[0]
    """
    return [
        {
            "id": "1001",
            "text": "Sample tweet 1 for testing",
            "created_at": "2024-01-01T12:00:00Z",
            "author_id": "123456789",
            "public_metrics": {
                "retweet_count": 5,
                "reply_count": 2,
                "like_count": 10,
                "quote_count": 1,
            },
        },
        {
            "id": "1002",
            "text": "Sample tweet 2 with multiple lines\nand line breaks",
            "created_at": "2024-01-01T13:00:00Z",
            "author_id": "123456789",
            "public_metrics": {
                "retweet_count": 3,
                "reply_count": 1,
                "like_count": 7,
                "quote_count": 0,
            },
        },
        {
            "id": "1003",
            "text": "Sample tweet 3 with media",
            "created_at": "2024-01-01T14:00:00Z",
            "author_id": "123456789",
            "attachments": {
                "media_keys": ["3_1234567890"],
            },
            "public_metrics": {
                "retweet_count": 2,
                "reply_count": 0,
                "like_count": 5,
                "quote_count": 0,
            },
        },
    ]


@pytest.fixture(scope="function")
def sample_bluesky_posts():
    """
    Provide sample Bluesky post data for testing.

    Returns a list of mock Bluesky post objects that simulate AT Protocol
    responses. Useful for testing Bluesky sync operations and post processing.

    Returns:
        list: List of sample Bluesky post dictionaries

    Example:
        def test_bluesky_posts(sample_bluesky_posts):
            assert len(sample_bluesky_posts) > 0
            assert 'uri' in sample_bluesky_posts[0]
            assert 'record' in sample_bluesky_posts[0]
    """
    return [
        {
            "uri": "at://did:plc:testuser/app.bsky.feed.post/bsky001",
            "cid": "cid_bsky001",
            "record": {
                "text": "Sample Bluesky post 1",
                "createdAt": "2024-01-01T12:00:00Z",
                "facets": [],
            },
            "author": {
                "did": "did:plc:testuser",
                "handle": "testuser.bsky.social",
            },
        },
        {
            "uri": "at://did:plc:testuser/app.bsky.feed.post/bsky002",
            "cid": "cid_bsky002",
            "record": {
                "text": "Sample Bluesky post 2 with multiple lines\nand formatting",
                "createdAt": "2024-01-01T13:00:00Z",
                "facets": [],
            },
            "author": {
                "did": "did:plc:testuser",
                "handle": "testuser.bsky.social",
            },
        },
        {
            "uri": "at://did:plc:testuser/app.bsky.feed.post/bsky003",
            "cid": "cid_bsky003",
            "record": {
                "text": "Sample Bluesky post 3 with image",
                "createdAt": "2024-01-01T14:00:00Z",
                "facets": [],
                "embed": {
                    "$type": "app.bsky.embed.images",
                    "images": [
                        {
                            "image": {"$type": "blob", "link": "image_link"},
                            "alt": "Test image",
                        }
                    ],
                },
            },
            "author": {
                "did": "did:plc:testuser",
                "handle": "testuser.bsky.social",
            },
        },
    ]


# =============================================================================
# PYTEST HOOKS AND CONFIGURATION
# =============================================================================


def pytest_configure(config):
    """
    Configure pytest with custom markers for integration tests.

    Registers custom markers that can be used to categorize and filter tests:
    - integration: Marks integration tests
    - slow: Marks tests that take longer to run
    - database: Marks tests that use database operations
    - api: Marks tests that use API mocks
    """
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line("markers", "slow: mark test as slow running")
    config.addinivalue_line(
        "markers", "database: mark test as using database operations"
    )
    config.addinivalue_line("markers", "api: mark test as using API mocks")
