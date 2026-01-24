"""
Unit tests for JWT refresh token rotation.
"""

import pytest
import time
import sqlite3
from unittest.mock import patch

from app.auth.jwt_handler import (
    create_token,
    create_refresh_token,
    verify_refresh_token,
    rotate_refresh_token,
    revoke_all_user_tokens,
    init_refresh_tokens_table,
    verify_token,
    AuthError,
    ACCESS_TOKEN_EXPIRY_HOURS,
    REFRESH_TOKEN_EXPIRY_DAYS,
)


class TestRefreshTokenCreation:
    """Tests for refresh token creation."""

    @pytest.fixture
    def db_path(self, tmp_path):
        """Create temp database with users table."""
        db_path = str(tmp_path / "test.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0
            )
        """)
        cursor.execute("INSERT INTO users (id, username, is_admin) VALUES (1, 'testuser', 0)")
        conn.commit()
        conn.close()
        return db_path

    @patch("app.auth.jwt_handler._get_db_path")
    def test_create_refresh_token(self, mock_db_path, db_path):
        """Test creating a refresh token."""
        mock_db_path.return_value = db_path
        init_refresh_tokens_table(db_path)

        token = create_refresh_token(user_id=1)

        assert token is not None
        assert len(token) > 20  # Should be a secure random string

        # Verify token stored in database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, family_id FROM refresh_tokens")
        row = cursor.fetchone()
        conn.close()

        assert row is not None
        assert row[0] == 1  # user_id
        assert row[1] is not None  # family_id

    @patch("app.auth.jwt_handler._get_db_path")
    def test_create_refresh_token_with_family(self, mock_db_path, db_path):
        """Test creating refresh token with existing family ID."""
        mock_db_path.return_value = db_path
        init_refresh_tokens_table(db_path)

        family_id = "test-family-123"
        token = create_refresh_token(user_id=1, family_id=family_id)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT family_id FROM refresh_tokens")
        row = cursor.fetchone()
        conn.close()

        assert row[0] == family_id


class TestRefreshTokenVerification:
    """Tests for refresh token verification."""

    @pytest.fixture
    def db_with_token(self, tmp_path):
        """Create database with a valid refresh token."""
        import hashlib
        import secrets

        db_path = str(tmp_path / "test.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create tables
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0
            )
        """)
        cursor.execute("INSERT INTO users (id, username, is_admin) VALUES (1, 'testuser', 0)")

        cursor.execute("""
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT
            )
        """)

        # Create a valid token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = int(time.time())
        expires_at = now + (30 * 24 * 60 * 60)  # 30 days

        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (1, token_hash, "family-123", expires_at, now))

        conn.commit()
        conn.close()

        return db_path, token

    @patch("app.auth.jwt_handler._get_db_path")
    def test_verify_valid_token(self, mock_db_path, db_with_token):
        """Test verifying a valid refresh token."""
        db_path, token = db_with_token
        mock_db_path.return_value = db_path

        user_id, family_id = verify_refresh_token(token)

        assert user_id == 1
        assert family_id == "family-123"

    @patch("app.auth.jwt_handler._get_db_path")
    def test_verify_invalid_token(self, mock_db_path, db_with_token):
        """Test verifying an invalid token raises error."""
        db_path, _ = db_with_token
        mock_db_path.return_value = db_path

        with pytest.raises(AuthError) as exc_info:
            verify_refresh_token("invalid-token")

        assert exc_info.value.code == "INVALID_TOKEN"

    @patch("app.auth.jwt_handler._get_db_path")
    def test_verify_expired_token(self, mock_db_path, tmp_path):
        """Test verifying an expired token raises error."""
        import hashlib
        import secrets

        db_path = str(tmp_path / "test.db")
        mock_db_path.return_value = db_path

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Create tables with full schema
        cursor.execute("""
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT,
                user_agent TEXT,
                ip_address TEXT,
                last_used_at INTEGER
            )
        """)

        # Create expired token (1 day ago)
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = int(time.time())

        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (1, token_hash, "family-123", now - 86400, now - 86400 * 2))  # Expired 1 day ago

        conn.commit()
        conn.close()

        with pytest.raises(AuthError) as exc_info:
            verify_refresh_token(token)

        assert exc_info.value.code == "TOKEN_EXPIRED"

    @patch("app.auth.jwt_handler._get_db_path")
    def test_token_reuse_detection(self, mock_db_path, tmp_path):
        """Test that reusing a revoked token triggers family revocation."""
        import hashlib
        import secrets

        db_path = str(tmp_path / "test.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT
            )
        """)

        # Create a revoked token (already used)
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = int(time.time())

        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at, revoked_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (1, token_hash, "family-123", now + 10000, now, now + 10))  # Revoked

        # Create another token in same family (not revoked yet)
        token2 = secrets.token_urlsafe(32)
        token2_hash = hashlib.sha256(token2.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (1, token2_hash, "family-123", now + 10000, now))

        conn.commit()
        conn.close()

        mock_db_path.return_value = db_path

        # Try to reuse the revoked token - should revoke entire family
        with pytest.raises(AuthError) as exc_info:
            verify_refresh_token(token)

        assert exc_info.value.code == "TOKEN_REUSED"

        # Verify the other token in family was also revoked
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT revoked_at FROM refresh_tokens WHERE token_hash = ?", (token2_hash,))
        row = cursor.fetchone()
        conn.close()

        assert row[0] is not None  # Should be revoked


class TestTokenRotation:
    """Tests for refresh token rotation."""

    @pytest.fixture
    def db_with_user_and_token(self, tmp_path):
        """Create database with user and valid refresh token."""
        import hashlib
        import secrets

        db_path = str(tmp_path / "test.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0
            )
        """)
        cursor.execute("INSERT INTO users (id, username, is_admin) VALUES (1, 'testuser', 0)")

        cursor.execute("""
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT
            )
        """)

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        now = int(time.time())

        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (1, token_hash, "family-123", now + 10000, now))

        conn.commit()
        conn.close()

        return db_path, token, token_hash

    @patch("app.auth.jwt_handler._get_secret")
    @patch("app.auth.jwt_handler._get_db_path")
    def test_rotate_refresh_token(self, mock_db_path, mock_secret, db_with_user_and_token):
        """Test rotating a refresh token."""
        db_path, old_token, old_hash = db_with_user_and_token
        mock_db_path.return_value = db_path
        mock_secret.return_value = "test-secret-key-for-jwt"

        new_access, new_refresh = rotate_refresh_token(old_token)

        # Verify new tokens are returned
        assert new_access is not None
        assert new_refresh is not None
        assert new_refresh != old_token

        # Verify old token is revoked
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT revoked_at, replaced_by FROM refresh_tokens WHERE token_hash = ?", (old_hash,))
        row = cursor.fetchone()
        conn.close()

        assert row[0] is not None  # revoked_at
        assert row[1] is not None  # replaced_by (hash of new token)


class TestRevokeAllTokens:
    """Tests for revoking all user tokens."""

    @patch("app.auth.jwt_handler._get_db_path")
    def test_revoke_all_user_tokens(self, mock_db_path, tmp_path):
        """Test revoking all refresh tokens for a user."""
        db_path = str(tmp_path / "test.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE refresh_tokens (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT
            )
        """)

        now = int(time.time())
        # Create multiple tokens for user 1
        for i in range(3):
            cursor.execute("""
                INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (1, f"hash-{i}", f"family-{i}", now + 10000, now))

        # Create token for different user
        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (2, "other-hash", "other-family", now + 10000, now))

        conn.commit()
        conn.close()

        mock_db_path.return_value = db_path

        count = revoke_all_user_tokens(1)

        assert count == 3  # Only user 1's tokens

        # Verify user 1's tokens are revoked
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT revoked_at FROM refresh_tokens WHERE user_id = 1")
        rows = cursor.fetchall()
        for row in rows:
            assert row[0] is not None

        # Verify user 2's token is NOT revoked
        cursor.execute("SELECT revoked_at FROM refresh_tokens WHERE user_id = 2")
        row = cursor.fetchone()
        conn.close()

        assert row[0] is None


class TestAccessTokenExpiry:
    """Tests for access token configuration."""

    def test_access_token_expiry_is_short(self):
        """Verify access token has short expiry."""
        assert ACCESS_TOKEN_EXPIRY_HOURS <= 2  # Should be 1-2 hours max

    def test_refresh_token_expiry_is_long(self):
        """Verify refresh token has long expiry."""
        assert REFRESH_TOKEN_EXPIRY_DAYS >= 7  # Should be at least a week

    @patch("app.auth.jwt_handler._get_secret")
    def test_access_token_contains_type(self, mock_secret):
        """Verify access token includes type claim."""
        import jwt

        mock_secret.return_value = "test-secret"

        token = create_token(1, "testuser", False)
        # Decode without verifying expiration to avoid timing issues
        payload = jwt.decode(token, "test-secret", algorithms=["HS256"], options={"verify_exp": False})

        assert payload.get("type") == "access"
        assert payload.get("sub") == 1
        assert payload.get("username") == "testuser"
