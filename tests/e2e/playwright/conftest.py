"""
Playwright E2E Test Configuration and Fixtures

Provides shared pytest-playwright fixtures for E2E testing including:
- Temporary SQLite database with schema initialization
- Flask application startup in background process
- Test user creation and authentication
- Master encryption key for credentials
- Playwright page fixture with app running
"""

import os
import sys
import sqlite3
import tempfile
import time
import subprocess
import socket
from pathlib import Path
from contextlib import closing

import pytest

# Add app directory to path for imports
sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "app",
    ),
)


# =============================================================================
# DATABASE FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def test_db_path():
    """
    Create a temporary database file path for E2E testing.

    Creates a unique temporary file path that will be used for test database
    operations. The file is cleaned up after the test completes.

    Yields:
        str: Path to temporary database file
    """
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture(scope="function")
def test_db(test_db_path):
    """
    Create and initialize a temporary SQLite database with all required tables for E2E tests.

    Sets up a complete database schema including:
    - Users and authentication tables (users, user_sessions)
    - Credentials table for multi-user support (user_credentials)
    - Sync tracking and statistics tables

    Args:
        test_db_path: Path to temporary database file

    Yields:
        sqlite3.Connection: Database connection with row factory configured
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

    # Create user_credentials table for encrypted credentials storage (AES-256-GCM)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            credential_type TEXT NOT NULL,
            encrypted_data BLOB NOT NULL,
            encryption_iv BLOB NOT NULL,
            encryption_tag BLOB NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_used INTEGER,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, platform, credential_type)
        )
    """
    )

    # Create synced_posts table for tracking bidirectional sync
    # Extended with engagement/media columns for Sprint 9 search filters
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
            user_id INTEGER,
            twitter_username TEXT,
            hashtags TEXT,
            posted_at INTEGER,
            has_media INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            retweets_count INTEGER DEFAULT 0,
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

    # Create sync_stats table
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

    # Create hourly_stats table
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

    # Create audit_log table
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

    # Create cleanup_rules table
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

    # Create scheduled_tweets table for scheduling API
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS scheduled_tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            media_paths TEXT,
            platform TEXT DEFAULT 'twitter',
            scheduled_time INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            posted_at INTEGER,
            tweet_id TEXT,
            error TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    # Create indexes for scheduled_tweets
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_tweets(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_tweets(status)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_tweets(scheduled_time)"
    )

    conn.commit()
    yield conn
    conn.close()


# =============================================================================
# USER FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def test_user(test_db):
    """
    Create a test user in the database with standard credentials.

    Creates a test user suitable for E2E testing with bcrypt hashed password.

    Returns:
        dict: Test user data containing:
            - id: User ID in database
            - username: Username for login (default: 'testuser')
            - email: Email address (default: 'testuser@example.com')
            - password: Plain text password for testing (default: 'TestPassword123!')
            - is_admin: Admin flag (default: False)

    Args:
        test_db: Database connection fixture
    """
    import bcrypt

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
def test_admin_user(test_db):
    """
    Create a test admin user in the database.

    Similar to test_user fixture but creates a user with admin privileges.

    Returns:
        dict: Test admin user data
    """
    import bcrypt

    username = "admin"
    email = "admin@example.com"
    password = "AdminPassword123!"

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
# ENCRYPTION KEY FIXTURE
# =============================================================================


@pytest.fixture(scope="function")
def master_encryption_key():
    """
    Generate a master encryption key for credential encryption.

    Returns:
        bytes: 32-byte encryption key
    """
    return os.urandom(32)


# =============================================================================
# FLASK APP FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def flask_app(test_db_path, master_encryption_key):
    """
    Create and configure a Flask application instance for E2E testing.

    Creates a fully configured Flask app with test configuration and test database.
    Does NOT start the server (use app_server fixture for that).

    Args:
        test_db_path: Path to temporary test database
        master_encryption_key: Master encryption key for credentials

    Yields:
        Flask: Configured Flask application instance
    """
    from app.web.dashboard import create_app

    # Create app with test database
    app = create_app(db_path=test_db_path, master_key=master_encryption_key)

    # Configure for testing
    app.config["TESTING"] = True
    app.config["DEBUG"] = True
    app.config["JSON_SORT_KEYS"] = False
    app.config["PRESERVE_CONTEXT_ON_EXCEPTION"] = False
    app.config["WTF_CSRF_ENABLED"] = False

    yield app


@pytest.fixture(scope="function")
def app_server(flask_app, test_db_path):
    """
    Start Flask application server in background for E2E testing.

    Starts the Flask development server on port 5000 before tests and stops it
    after tests complete. Waits for server to be ready before returning.

    Args:
        flask_app: Flask application instance
        test_db_path: Path to test database (passed as env var to subprocess)

    Yields:
        None: Server is running in background
    """
    # Set environment variables for the subprocess
    env = os.environ.copy()
    env["DB_PATH"] = test_db_path
    env["FLASK_ENV"] = "test"
    env["PYTHONPATH"] = str(Path(__file__).parent.parent.parent.parent)

    # Start Flask server
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "flask",
            "--app",
            "app.web.dashboard:create_app",
            "run",
            "--port",
            "5000",
        ],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for server to be ready
    max_retries = 30
    retry_count = 0
    while retry_count < max_retries:
        try:
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                result = sock.connect_ex(("localhost", 5000))
                if result == 0:
                    break
        except Exception:
            pass  # Ignore connection errors during server startup
        time.sleep(0.5)
        retry_count += 1

    if retry_count >= max_retries:
        process.terminate()
        process.wait()
        raise TimeoutError("Flask server did not start within 15 seconds")

    yield

    # Cleanup: terminate the server
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


# =============================================================================
# PLAYWRIGHT FIXTURES
# =============================================================================


@pytest.fixture(scope="function")
def browser(app_server, playwright):
    """
    Create a Playwright browser for E2E testing.

    Ensures Flask app server is running before browser launch.

    Args:
        app_server: Flask application server fixture (ensures server is running)
        playwright: pytest-playwright's playwright fixture (provided by plugin)

    Yields:
        Browser: Playwright browser instance
    """
    browser = playwright.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture(scope="function")
def context(browser):
    """
    Create a Playwright browser context.

    Args:
        browser: Browser fixture

    Yields:
        BrowserContext: Playwright browser context
    """
    context = browser.new_context(
        base_url="http://localhost:5000",
        viewport={"width": 1280, "height": 720},
    )
    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context):
    """
    Create a Playwright page for E2E testing.

    Args:
        context: Browser context fixture

    Yields:
        Page: Playwright page object for interacting with the app
    """
    page = context.new_page()
    yield page
    page.close()
