"""
End-to-End Test Configuration (conftest.py)

Provides shared pytest fixtures for E2E tests including:
- Flask app configuration with test database
- Test client for HTTP requests
- Pre-authenticated test clients (regular and admin)
- Seeded test data (users, credentials, posts)

All fixtures use function scope for test isolation and include proper cleanup.

Usage:
    def test_login_flow(authenticated_client):
        '''Test user login flow using pre-authenticated client'''
        response = authenticated_client.get('/dashboard')
        assert response.status_code == 200
"""

import os
import sys
import tempfile
import sqlite3
import pytest
from typing import Generator, Tuple
import hashlib
from unittest.mock import Mock, patch, MagicMock

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from app.web.dashboard import create_app
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager


# ============================================================================
# TEST CONSTANTS
# ============================================================================

TEST_SECRET_KEY = "test-secret-key-for-e2e-tests"
TEST_MASTER_KEY = hashlib.sha256("test-master-key".encode()).digest()

# Test user credentials (passwords meet security requirements)
TEST_USER_PASSWORD = "TestPassword123!@#"
TEST_ADMIN_PASSWORD = "AdminPassword456!@#"

# Test user data
TEST_USERS = {
    "regular": {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": TEST_USER_PASSWORD,
        "is_admin": False,
    },
    "admin": {
        "username": "adminuser",
        "email": "admin@example.com",
        "password": TEST_ADMIN_PASSWORD,
        "is_admin": True,
    },
    "secondary": {
        "username": "secondaryuser",
        "email": "secondary@example.com",
        "password": TEST_USER_PASSWORD,
        "is_admin": False,
    },
}

# Test credentials for platforms
TEST_CREDENTIALS = {
    "twitter_scraping": {
        "platform": "twitter",
        "credential_type": "scraping",
        "data": {
            "username": "test_twitter_user",
            "password": "TestTwitterPassword123!",
            "email": "twitter@example.com",
            "email_password": "TestEmailPassword123!",
        },
    },
    "twitter_api": {
        "platform": "twitter",
        "credential_type": "api",
        "data": {
            "api_key": "test_api_key_12345678",
            "api_secret": "test_api_secret_abcdefgh",
            "access_token": "test_access_token_ijklmnop",
            "access_secret": "test_access_secret_qrstuvwx",
        },
    },
    "bluesky_api": {
        "platform": "bluesky",
        "credential_type": "api",
        "data": {
            "username": "test.bsky.social",
            "password": "TestBlueskyPassword123!",
        },
    },
}

# Test posts/content data
TEST_POSTS = [
    {
        "id": "post_001",
        "content": "Test post from Twitter #testing",
        "source": "twitter",
        "created_at": 1704067200,
    },
    {
        "id": "post_002",
        "content": "Another test post #e2e",
        "source": "twitter",
        "created_at": 1704153600,
    },
    {
        "id": "post_003",
        "content": "Test post from Bluesky",
        "source": "bluesky",
        "created_at": 1704240000,
    },
]


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture(scope="function")
def temp_db_path() -> Generator[str, None, None]:
    """
    Create temporary database file for testing.

    Yields a temporary database path and cleans up after the test.

    Yields:
        str: Path to temporary database file

    Example:
        def test_something(temp_db_path):
            assert os.path.exists(temp_db_path)
    """
    # Create temporary file
    fd, db_path = tempfile.mkstemp(suffix=".db", prefix="test_e2e_")
    os.close(fd)

    yield db_path

    # Cleanup
    if os.path.exists(db_path):
        try:
            os.unlink(db_path)
        except OSError:
            pass


@pytest.fixture(scope="function")
def e2e_app(temp_db_path) -> Generator:
    """
    Create Flask application with test configuration.

    Configures the Flask app with:
    - Test database (temporary SQLite file)
    - Test SECRET_KEY for session management
    - Test MASTER_KEY for credential encryption
    - Proper initialization of database tables

    Yields:
        Flask: Configured Flask application instance

    Example:
        def test_app_creation(e2e_app):
            assert e2e_app is not None
            assert e2e_app.config['TESTING'] is True
            assert e2e_app.config['DB_PATH'] == temp_db_path
    """
    # Create app with test configuration
    app = create_app(db_path=temp_db_path, master_key=TEST_MASTER_KEY)

    # Override configuration for testing
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = TEST_SECRET_KEY
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["PROPAGATE_EXCEPTIONS"] = True
    app.config["DB_PATH"] = temp_db_path
    app.config["MASTER_KEY"] = TEST_MASTER_KEY

    # Disable CSRF for testing
    app.config["WTF_CSRF_ENABLED"] = False

    # Setup task scheduler database tables and mock scheduler for testing
    from app.services.task_scheduler import TaskScheduler

    real_scheduler = TaskScheduler(db_path=temp_db_path)
    real_scheduler.init_db()  # Create tables

    # Create side effect function that logs execution to database
    def trigger_task_side_effect(task_name):
        import time

        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(
            """
            INSERT INTO task_executions (task_name, started_at, completed_at, status, duration_ms)
            VALUES (?, ?, ?, ?, ?)
        """,
            (task_name, now, now, "success", 100),
        )
        conn.commit()
        conn.close()
        return True

    # Create mock scheduler with real database backing
    mock_scheduler = MagicMock()
    mock_scheduler.get_all_tasks.return_value = [
        {
            "id": "sync_task",
            "name": "sync_task",
            "schedule": "0 * * * *",
            "enabled": True,
            "last_run": None,
            "next_run": None,
        }
    ]
    mock_scheduler.get_task_status.return_value = {
        "id": "sync_task",
        "name": "sync_task",
        "schedule": "0 * * * *",
        "enabled": True,
        "last_run": None,
        "next_run": None,
    }
    mock_scheduler.trigger_task_now.side_effect = trigger_task_side_effect
    mock_scheduler.db_path = temp_db_path
    app.config["TASK_SCHEDULER"] = mock_scheduler

    yield app


@pytest.fixture(scope="function")
def test_app(e2e_app):
    """
    Alias for e2e_app fixture for backwards compatibility.

    Args:
        e2e_app: Flask application fixture

    Yields:
        Flask: Configured Flask application instance
    """
    yield e2e_app


@pytest.fixture(scope="function")
def client(e2e_app):
    """
    Create Flask test client for HTTP requests.

    Provides an unauthenticated Flask test client that can be used to make
    HTTP requests to the application.

    Args:
        e2e_app: Flask application fixture

    Yields:
        FlaskClient: Test client for making HTTP requests

    Example:
        def test_login_page(client):
            response = client.get('/login')
            assert response.status_code == 200
            assert b'login' in response.data.lower()
    """
    yield e2e_app.test_client()


@pytest.fixture(scope="function")
def test_data(e2e_app) -> dict:
    """
    Seed database with test users, credentials, and posts.

    Creates:
    - Multiple test users (regular, admin, secondary)
    - Twitter and Bluesky credentials for users
    - Test posts for syncing

    The fixture initializes the database with test data and returns metadata
    about created resources for use in tests.

    Args:
        e2e_app: Flask application fixture

    Returns:
        dict: Test data metadata containing:
            - users: Dict of created users by role
            - credentials: Dict of created credentials
            - posts: List of test posts

    Example:
        def test_user_dashboard(authenticated_client, test_data):
            user = test_data['users']['regular']
            assert user.username == 'testuser'
    """
    data = {
        "users": {},
        "credentials": {},
        "posts": [],
    }

    db_path = e2e_app.config["DB_PATH"]
    master_key = e2e_app.config["MASTER_KEY"]

    # Initialize managers
    user_manager = UserManager(db_path=db_path)
    cred_manager = CredentialManager(master_key=master_key, db_path=db_path)

    # Create test users
    for role, user_info in TEST_USERS.items():
        try:
            user_id = user_manager.create_user(
                username=user_info["username"],
                email=user_info["email"],
                password=user_info["password"],
                is_admin=user_info["is_admin"],
            )

            # Retrieve created user
            user = user_manager.get_user_by_id(user_id)
            data["users"][role] = user

        except ValueError as e:
            pytest.fail(f"Failed to create test user {role}: {e}")

    # Create test credentials for each user
    regular_user_id = data["users"]["regular"].id
    admin_user_id = data["users"]["admin"].id

    # Add Twitter scraping credentials to regular user
    try:
        cred_manager.save_credentials(
            user_id=regular_user_id,
            platform=TEST_CREDENTIALS["twitter_scraping"]["platform"],
            credential_type=TEST_CREDENTIALS["twitter_scraping"]["credential_type"],
            data=TEST_CREDENTIALS["twitter_scraping"]["data"],
        )
        data["credentials"]["twitter_scraping_regular"] = {
            "user_id": regular_user_id,
            **TEST_CREDENTIALS["twitter_scraping"],
        }
    except Exception as e:
        pytest.fail(f"Failed to save Twitter scraping credentials: {e}")

    # Add Twitter API credentials to admin user
    try:
        cred_manager.save_credentials(
            user_id=admin_user_id,
            platform=TEST_CREDENTIALS["twitter_api"]["platform"],
            credential_type=TEST_CREDENTIALS["twitter_api"]["credential_type"],
            data=TEST_CREDENTIALS["twitter_api"]["data"],
        )
        data["credentials"]["twitter_api_admin"] = {
            "user_id": admin_user_id,
            **TEST_CREDENTIALS["twitter_api"],
        }
    except Exception as e:
        pytest.fail(f"Failed to save Twitter API credentials: {e}")

    # Add Bluesky credentials to both users
    for user_role, user_id_key in [
        ("regular", regular_user_id),
        ("admin", admin_user_id),
    ]:
        try:
            cred_manager.save_credentials(
                user_id=user_id_key,
                platform=TEST_CREDENTIALS["bluesky_api"]["platform"],
                credential_type=TEST_CREDENTIALS["bluesky_api"]["credential_type"],
                data=TEST_CREDENTIALS["bluesky_api"]["data"],
            )
            data["credentials"][f"bluesky_{user_role}"] = {
                "user_id": user_id_key,
                **TEST_CREDENTIALS["bluesky_api"],
            }
        except Exception as e:
            pytest.fail(f"Failed to save Bluesky credentials for {user_role}: {e}")

    # Store test posts
    data["posts"] = TEST_POSTS.copy()

    return data


@pytest.fixture(scope="function")
def authenticated_client(client, test_data) -> Tuple:
    """
    Create pre-authenticated test client for regular user.

    Sets up a test client with an active session for a regular (non-admin) user.
    The user session is properly initialized and ready for authenticated requests.

    Args:
        client: Flask test client fixture
        test_data: Test data fixture with seeded database

    Yields:
        Tuple containing:
            - client: Authenticated Flask test client
            - user: Regular user object with user data

    Example:
        def test_dashboard_access(authenticated_client):
            client, user = authenticated_client
            response = client.get('/dashboard')
            assert response.status_code == 200
    """
    user = test_data["users"]["regular"]

    # Create a session for the authenticated user
    with client.session_transaction() as sess:
        sess["user_id"] = user.id
        sess["username"] = user.username
        sess["is_admin"] = user.is_admin

    yield client, user


@pytest.fixture(scope="function")
def admin_client(client, test_data) -> Tuple:
    """
    Create pre-authenticated test client for admin user.

    Sets up a test client with an active session for an admin user.
    The user has full administrative privileges and can access all
    protected admin routes.

    Args:
        client: Flask test client fixture
        test_data: Test data fixture with seeded database

    Yields:
        Tuple containing:
            - client: Authenticated Flask test client with admin session
            - user: Admin user object with admin privileges

    Example:
        def test_admin_dashboard(admin_client):
            client, admin_user = admin_client
            response = client.get('/users')
            assert response.status_code == 200
            assert admin_user.is_admin is True
    """
    user = test_data["users"]["admin"]

    # Create a session for the admin user
    with client.session_transaction() as sess:
        sess["user_id"] = user.id
        sess["username"] = user.username
        sess["is_admin"] = user.is_admin

    yield client, user


# ============================================================================
# HELPER FIXTURES
# ============================================================================


@pytest.fixture(scope="function")
def db_manager(e2e_app) -> UserManager:
    """
    Provide UserManager instance for direct database access in tests.

    Useful for verifying database state or directly manipulating test data
    without going through the HTTP client.

    Args:
        e2e_app: Flask application fixture

    Returns:
        UserManager: Instance for database operations

    Example:
        def test_user_count(db_manager, test_data):
            users = db_manager.list_users()
            assert len(users) == len(TEST_USERS)
    """
    return UserManager(db_path=e2e_app.config["DB_PATH"])


@pytest.fixture(scope="function")
def user_manager(e2e_app) -> UserManager:
    """
    Provide UserManager instance for user management operations in tests.

    Alias for db_manager to maintain consistency with test naming conventions.

    Args:
        e2e_app: Flask application fixture

    Returns:
        UserManager: Instance for user management operations

    Example:
        def test_create_user(user_manager):
            user_id = user_manager.create_user('testuser', 'test@example.com', 'Password123!')
            assert user_id is not None
    """
    um = UserManager(db_path=e2e_app.config["DB_PATH"])
    um.init_db()
    return um


@pytest.fixture(scope="function")
def analytics_tracker(e2e_app):
    """
    Provide AnalyticsTracker instance for analytics operations in tests.

    Allows direct manipulation and verification of analytics data
    in tests without going through the HTTP client.

    Args:
        e2e_app: Flask application fixture

    Returns:
        AnalyticsTracker: Instance for analytics operations

    Example:
        def test_record_metrics(analytics_tracker):
            analytics_tracker.record_metrics(user_id=1, tweet_id='123', metrics={...})
            top_tweets = analytics_tracker.get_top_tweets(user_id=1, metric='likes')
            assert len(top_tweets) > 0
    """
    from app.features.analytics_tracker import AnalyticsTracker

    at = AnalyticsTracker(db_path=e2e_app.config["DB_PATH"])
    at.init_db()
    return at


@pytest.fixture(scope="function")
def credential_manager(e2e_app) -> CredentialManager:
    """
    Provide CredentialManager instance for credential operations in tests.

    Allows direct manipulation and verification of encrypted credentials
    in tests without going through the HTTP client.

    Args:
        e2e_app: Flask application fixture

    Returns:
        CredentialManager: Instance for credential operations

    Example:
        def test_credential_encryption(credential_manager, test_data):
            creds = credential_manager.get_credentials(
                user_id=test_data['users']['regular'].id,
                platform='twitter',
                credential_type='scraping'
            )
            assert creds['username'] == 'test_twitter_user'
    """
    return CredentialManager(
        master_key=e2e_app.config["MASTER_KEY"],
        db_path=e2e_app.config["DB_PATH"],
    )


@pytest.fixture(scope="function")
def db_connection(e2e_app) -> Generator[sqlite3.Connection, None, None]:
    """
    Provide direct SQLite database connection for raw SQL queries in tests.

    Useful for verifying database schema, constraints, or for advanced
    testing scenarios that require direct SQL access.

    Args:
        e2e_app: Flask application fixture

    Yields:
        sqlite3.Connection: Database connection with row factory

    Example:
        def test_user_table_schema(db_connection):
            cursor = db_connection.cursor()
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
            schema = cursor.fetchone()
            assert 'username' in schema[0]
    """
    conn = sqlite3.connect(e2e_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row

    yield conn

    conn.close()


# ============================================================================
# SESSION AND CLEANUP
# ============================================================================


def pytest_configure(config):
    """
    Configure pytest with custom markers for E2E tests.

    Registers custom pytest markers:
    - e2e: Mark tests as end-to-end tests
    - authentication: Tests related to authentication flows
    - authorization: Tests related to authorization and permissions
    - credentials: Tests related to credential management
    - integration: Integration tests

    Args:
        config: Pytest config object
    """
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "authentication: Authentication flow tests")
    config.addinivalue_line(
        "markers", "authorization: Authorization and permission tests"
    )
    config.addinivalue_line("markers", "credentials: Credential management tests")
    config.addinivalue_line("markers", "integration: Integration tests")


@pytest.fixture(autouse=True)
def _cleanup_flask_session(e2e_app):
    """
    Auto-cleanup fixture to ensure Flask session is cleaned between tests.

    This fixture runs automatically for each test to ensure proper session
    isolation between test functions.

    Args:
        e2e_app: Flask application fixture
    """
    yield
    # Cleanup happens automatically with function-scoped fixtures


@pytest.fixture(autouse=True)
def mock_tweepy():
    """
    Mock tweepy for all E2E tests to avoid real API calls.

    Invalid credentials (containing 'invalid') will fail authentication.
    Valid-looking credentials will succeed.
    """
    with patch("app.integrations.credential_validator.tweepy") as mock_tweepy_module:
        # Create mock API instance
        mock_api_instance = MagicMock()

        # Create a side effect function that checks credentials
        def verify_credentials_side_effect():
            # Access the auth that was passed to OAuthHandler
            # If credentials contain 'invalid', raise Unauthorized
            mock_user = MagicMock()
            mock_user.screen_name = "test_user"
            return mock_user

        # Mock OAuthHandler
        mock_auth = MagicMock()
        mock_tweepy_module.OAuthHandler.return_value = mock_auth

        # Mock API class
        def api_init_side_effect(auth):
            # Check if the auth has invalid tokens
            # We'll check via the call args
            return mock_api_instance

        mock_tweepy_module.API.return_value = mock_api_instance
        mock_api_instance.verify_credentials.side_effect = (
            verify_credentials_side_effect
        )

        # Mock error classes
        mock_tweepy_module.errors = MagicMock()
        mock_tweepy_module.errors.Unauthorized = type("Unauthorized", (Exception,), {})
        mock_tweepy_module.errors.Forbidden = type("Forbidden", (Exception,), {})
        mock_tweepy_module.errors.TweepyException = type(
            "TweepyException", (Exception,), {}
        )

        # Track calls to detect invalid credentials
        original_oauth_handler = mock_tweepy_module.OAuthHandler

        def oauth_handler_with_validation(api_key, api_secret):
            # If credentials contain 'invalid', we'll make verify_credentials fail
            if "invalid" in api_key.lower() or "invalid" in api_secret.lower():
                mock_api_instance.verify_credentials.side_effect = (
                    mock_tweepy_module.errors.Unauthorized("Invalid credentials")
                )
            else:
                mock_api_instance.verify_credentials.side_effect = (
                    verify_credentials_side_effect
                )
            return mock_auth

        mock_tweepy_module.OAuthHandler.side_effect = oauth_handler_with_validation

        yield mock_tweepy_module


# ============================================================================
# PYTEST HOOKS FOR E2E TESTING
# ============================================================================


def pytest_runtest_logreport(report):
    """
    Log test results with additional context for E2E tests.

    Provides detailed logging of test outcomes that can be useful for
    debugging E2E test failures.

    Args:
        report: Pytest report object
    """
    if report.when == "call":
        if hasattr(report, "markers") and "e2e" in [m.name for m in report.markers]:
            # Could add custom logging here
            pass
