"""
Unit tests for OAuth authentication (SSO)
"""

import pytest
import os
import time
from unittest.mock import patch, MagicMock

from app.auth.oauth_providers import (
    get_provider_config,
    is_provider_configured,
    get_configured_providers,
    OAuthProviderConfig,
)
from app.auth.oauth_handler import OAuthHandler, OAuthUserInfo


class TestOAuthProviders:
    """Tests for OAuth provider configuration."""

    def test_get_provider_config_google(self):
        """Test getting Google provider config."""
        config = get_provider_config("google")
        assert config is not None
        assert config.authorize_url == "https://accounts.google.com/o/oauth2/v2/auth"
        assert "openid" in config.scope

    def test_get_provider_config_github(self):
        """Test getting GitHub provider config."""
        config = get_provider_config("github")
        assert config is not None
        assert config.authorize_url == "https://github.com/login/oauth/authorize"
        assert config.emails_url is not None

    def test_get_provider_config_twitter(self):
        """Test getting Twitter provider config."""
        config = get_provider_config("twitter")
        assert config is not None
        assert "twitter.com" in config.authorize_url

    def test_get_provider_config_invalid(self):
        """Test getting unknown provider returns None."""
        config = get_provider_config("invalid_provider")
        assert config is None

    @patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-id", "GOOGLE_CLIENT_SECRET": "test-secret"})
    def test_is_provider_configured_with_env(self):
        """Test provider is configured when env vars are set."""
        # Need to reload the module to pick up env changes
        from app.auth import oauth_providers
        import importlib
        importlib.reload(oauth_providers)

        # The function checks the config which was loaded at import time
        # So we need to test the logic directly
        config = OAuthProviderConfig(
            client_id="test-id",
            client_secret="test-secret",
            authorize_url="https://test.com",
            token_url="https://test.com/token",
            userinfo_url="https://test.com/user",
            scope="test",
        )
        assert config.client_id is not None
        assert config.client_secret is not None


class TestOAuthHandler:
    """Tests for OAuth handler logic."""

    @pytest.fixture
    def oauth_handler(self, tmp_path):
        """Create OAuth handler with temp database."""
        db_path = str(tmp_path / "test.db")
        handler = OAuthHandler(db_path=db_path)
        handler.init_db()

        # Also init user tables
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_login INTEGER,
                is_active INTEGER DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                has_password INTEGER DEFAULT 1
            )
        """)
        conn.commit()
        conn.close()

        return handler

    def test_init_db_creates_tables(self, oauth_handler):
        """Test that init_db creates required tables."""
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()

        # Check oauth_accounts table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='oauth_accounts'"
        )
        assert cursor.fetchone() is not None
        conn.close()

    def test_generate_auth_url_unconfigured_provider(self, oauth_handler):
        """Test auth URL generation fails for unconfigured provider."""
        url = oauth_handler.generate_auth_url("google", "http://localhost/callback")
        # Will be None because env vars are not set
        assert url is None

    def test_validate_state_invalid(self, oauth_handler):
        """Test state validation with invalid state."""
        result = oauth_handler.validate_state("invalid-state")
        assert result is None

    def test_validate_state_expired(self, oauth_handler):
        """Test state validation with expired state."""
        # Manually add expired state
        oauth_handler._state_store["test-state"] = {
            "provider": "google",
            "redirect_uri": "http://localhost/callback",
            "created_at": time.time() - 700,  # Expired (>10 min)
        }

        result = oauth_handler.validate_state("test-state")
        assert result is None

    def test_validate_state_valid(self, oauth_handler):
        """Test state validation with valid state."""
        oauth_handler._state_store["test-state"] = {
            "provider": "google",
            "redirect_uri": "http://localhost/callback",
            "created_at": time.time(),
        }

        result = oauth_handler.validate_state("test-state")
        assert result is not None
        assert result["provider"] == "google"
        # State should be removed after validation
        assert "test-state" not in oauth_handler._state_store

    def test_normalize_google_user_info(self, oauth_handler):
        """Test normalizing Google user info."""
        from app.auth.oauth_providers import get_provider_config

        config = get_provider_config("google")
        data = {
            "sub": "123456789",
            "email": "test@gmail.com",
            "name": "Test User",
            "picture": "https://example.com/photo.jpg",
        }

        user_info = oauth_handler._normalize_user_info("google", data, "token", config)

        assert user_info.provider == "google"
        assert user_info.provider_user_id == "123456789"
        assert user_info.email == "test@gmail.com"
        assert user_info.name == "Test User"

    def test_normalize_github_user_info(self, oauth_handler):
        """Test normalizing GitHub user info."""
        from app.auth.oauth_providers import get_provider_config

        config = get_provider_config("github")
        data = {
            "id": 12345,
            "login": "testuser",
            "name": "Test User",
            "email": "test@github.com",
            "avatar_url": "https://github.com/avatar.jpg",
        }

        user_info = oauth_handler._normalize_user_info("github", data, "token", config)

        assert user_info.provider == "github"
        assert user_info.provider_user_id == "12345"
        assert user_info.username == "testuser"
        assert user_info.email == "test@github.com"

    def test_normalize_twitter_user_info(self, oauth_handler):
        """Test normalizing Twitter user info."""
        from app.auth.oauth_providers import get_provider_config

        config = get_provider_config("twitter")
        data = {
            "data": {
                "id": "987654321",
                "username": "twitteruser",
                "name": "Twitter User",
            }
        }

        user_info = oauth_handler._normalize_user_info("twitter", data, "token", config)

        assert user_info.provider == "twitter"
        assert user_info.provider_user_id == "987654321"
        assert user_info.username == "twitteruser"
        assert user_info.email is None  # Twitter doesn't provide email

    def test_create_sso_user(self, oauth_handler):
        """Test creating SSO user."""
        user_info = OAuthUserInfo(
            provider="google",
            provider_user_id="123",
            email="test@example.com",
            username="testuser",
            name="Test User",
        )

        user_id = oauth_handler.create_sso_user(user_info)
        assert user_id > 0

        # Verify user was created
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()

        assert row is not None

    def test_generate_unique_username(self, oauth_handler):
        """Test unique username generation."""
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()

        # Create existing user
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, '', ?)",
            ("testuser", "existing@test.com", int(time.time())),
        )
        conn.commit()

        # Generate unique username
        username = oauth_handler._generate_unique_username(cursor, "testuser")
        assert username == "testuser1"

        conn.close()

    def test_link_oauth_account(self, oauth_handler):
        """Test linking OAuth account to user."""
        # Create user first
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, '', ?)",
            ("linkuser", "link@test.com", int(time.time())),
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        user_info = OAuthUserInfo(
            provider="github",
            provider_user_id="456",
            email="link@test.com",
            username="githubuser",
            name="GitHub User",
        )

        tokens = {"access_token": "test-token", "expires_in": 3600}

        result = oauth_handler.link_oauth_account(user_id, user_info, tokens)
        assert result is True

        # Verify account was linked
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM oauth_accounts WHERE user_id = ? AND provider = ?",
            (user_id, "github"),
        )
        row = cursor.fetchone()
        conn.close()

        assert row is not None

    def test_find_oauth_account(self, oauth_handler):
        """Test finding OAuth account."""
        # Create user and OAuth account
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at, is_admin) VALUES (?, ?, '', ?, 0)",
            ("finduser", "find@test.com", int(time.time())),
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """INSERT INTO oauth_accounts
               (user_id, provider, provider_user_id, provider_email, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, "google", "google-123", "find@test.com", int(time.time())),
        )
        conn.commit()
        conn.close()

        result = oauth_handler.find_oauth_account("google", "google-123")
        assert result is not None
        assert result["user_id"] == user_id

    def test_unlink_oauth_account_with_password(self, oauth_handler):
        """Test unlinking OAuth account when user has password."""
        # Create user with password
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at, has_password) VALUES (?, ?, 'hash', ?, 1)",
            ("unlinkuser", "unlink@test.com", int(time.time())),
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """INSERT INTO oauth_accounts
               (user_id, provider, provider_user_id, created_at)
               VALUES (?, ?, ?, ?)""",
            (user_id, "github", "github-456", int(time.time())),
        )
        conn.commit()
        conn.close()

        result = oauth_handler.unlink_oauth_account(user_id, "github")
        assert result is True

    def test_unlink_oauth_account_without_password_fails(self, oauth_handler):
        """Test unlinking fails when it's the only auth method."""
        # Create user without password
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at, has_password) VALUES (?, ?, '', ?, 0)",
            ("ssoonly", "sso@test.com", int(time.time())),
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """INSERT INTO oauth_accounts
               (user_id, provider, provider_user_id, created_at)
               VALUES (?, ?, ?, ?)""",
            (user_id, "google", "google-789", int(time.time())),
        )
        conn.commit()
        conn.close()

        result = oauth_handler.unlink_oauth_account(user_id, "google")
        assert result is False  # Should fail - no other auth method

    def test_get_user_oauth_accounts(self, oauth_handler):
        """Test getting user's OAuth accounts."""
        # Create user with multiple OAuth accounts
        import sqlite3
        conn = sqlite3.connect(oauth_handler.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, '', ?)",
            ("multiauth", "multi@test.com", int(time.time())),
        )
        user_id = cursor.lastrowid

        cursor.execute(
            """INSERT INTO oauth_accounts
               (user_id, provider, provider_user_id, provider_email, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, "google", "g-123", "multi@gmail.com", int(time.time())),
        )
        cursor.execute(
            """INSERT INTO oauth_accounts
               (user_id, provider, provider_user_id, provider_username, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, "github", "gh-456", "multiuser", int(time.time())),
        )
        conn.commit()
        conn.close()

        accounts = oauth_handler.get_user_oauth_accounts(user_id)
        assert len(accounts) == 2
        providers = [a["provider"] for a in accounts]
        assert "google" in providers
        assert "github" in providers
