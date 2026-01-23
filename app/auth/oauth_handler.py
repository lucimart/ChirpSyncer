"""
OAuth Handler - SSO Authentication Flow

Handles OAuth 2.0 flow for Google, GitHub, and Twitter/X providers.
Manages user creation/linking for SSO authentication.
"""

import os
import json
import time
import secrets
import sqlite3
import logging
from typing import Optional, Tuple
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.auth.oauth_providers import (
    get_provider_config,
    is_provider_configured,
    OAUTH_REDIRECT_BASE,
)
from app.auth.security_utils import log_audit


logger = logging.getLogger(__name__)


@dataclass
class OAuthUserInfo:
    """Normalized user info from OAuth provider."""

    provider: str
    provider_user_id: str
    email: Optional[str]
    username: Optional[str]
    name: Optional[str]
    avatar_url: Optional[str] = None


class OAuthHandler:
    """
    Handles OAuth 2.0 authentication flow and user management.

    Supports Google, GitHub, and Twitter/X providers.
    """

    def __init__(self, db_path: str = "chirpsyncer.db", master_key: Optional[bytes] = None):
        """
        Initialize OAuthHandler.

        Args:
            db_path: Path to SQLite database
            master_key: 32-byte key for token encryption (optional)
        """
        self.db_path = db_path
        self.master_key = master_key
        self.aesgcm = AESGCM(master_key) if master_key else None
        self._state_store: dict[str, dict] = {}  # In-memory state store

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize OAuth database tables."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create oauth_accounts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL,
                provider_user_id TEXT NOT NULL,
                provider_email TEXT,
                provider_username TEXT,
                access_token BLOB,
                refresh_token BLOB,
                token_iv BLOB,
                token_expires_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(provider, provider_user_id)
            )
        """)

        # Create indexes
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id)"
        )

        # Create oauth_states table for CSRF state storage
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                redirect_uri TEXT NOT NULL,
                code_verifier TEXT,
                created_at INTEGER NOT NULL
            )
        """)

        # Clean up expired states (older than 10 minutes)
        cursor.execute(
            "DELETE FROM oauth_states WHERE created_at < ?",
            (int(time.time()) - 600,),
        )

        # Add has_password column to users if not exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [row["name"] for row in cursor.fetchall()]
        if "has_password" not in columns:
            cursor.execute(
                "ALTER TABLE users ADD COLUMN has_password INTEGER DEFAULT 1"
            )

        conn.commit()
        conn.close()

    def _encrypt_token(self, token: str) -> Tuple[bytes, bytes]:
        """Encrypt OAuth token with AES-256-GCM."""
        if not self.aesgcm:
            # No encryption key - store as plain bytes (dev mode)
            return token.encode("utf-8"), b""

        iv = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(iv, token.encode("utf-8"), None)
        return ciphertext, iv

    def _decrypt_token(self, encrypted: bytes, iv: bytes) -> str:
        """Decrypt OAuth token."""
        if not self.aesgcm or not iv:
            # No encryption - stored as plain bytes
            return encrypted.decode("utf-8")

        plaintext = self.aesgcm.decrypt(iv, encrypted, None)
        return plaintext.decode("utf-8")

    def generate_auth_url(self, provider: str, redirect_uri: str) -> Optional[str]:
        """
        Generate OAuth authorization URL.

        Args:
            provider: OAuth provider name
            redirect_uri: Callback URL after authorization

        Returns:
            Authorization URL or None if provider not configured
        """
        config = get_provider_config(provider)
        if not config or not is_provider_configured(provider):
            return None

        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        code_verifier = None

        # Provider-specific handling
        if provider == "twitter":
            # Twitter OAuth 2.0 requires PKCE
            code_verifier = secrets.token_urlsafe(64)

        # Store state in database (persistent across requests)
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO oauth_states (state, provider, redirect_uri, code_verifier, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (state, provider, redirect_uri, code_verifier, int(time.time())),
        )
        conn.commit()
        conn.close()

        params = {
            "client_id": config.client_id,
            "redirect_uri": redirect_uri,
            "scope": config.scope,
            "state": state,
            "response_type": "code",
        }

        # Provider-specific params
        if provider == "google":
            params["access_type"] = "offline"
            params["prompt"] = "consent"
        elif provider == "twitter":
            # For simplicity, using plain challenge (production should use S256)
            params["code_challenge"] = code_verifier
            params["code_challenge_method"] = "plain"

        return f"{config.authorize_url}?{urlencode(params)}"

    def validate_state(self, state: str) -> Optional[dict]:
        """
        Validate OAuth state parameter.

        Args:
            state: State value from callback

        Returns:
            State data dict or None if invalid/expired
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Get and delete state in one operation
        cursor.execute(
            "SELECT provider, redirect_uri, code_verifier, created_at FROM oauth_states WHERE state = ?",
            (state,),
        )
        row = cursor.fetchone()

        if row:
            # Delete used state
            cursor.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            conn.commit()

        conn.close()

        if not row:
            return None

        # Check expiration (10 minutes)
        if time.time() - row["created_at"] > 600:
            return None

        return {
            "provider": row["provider"],
            "redirect_uri": row["redirect_uri"],
            "code_verifier": row["code_verifier"],
            "created_at": row["created_at"],
        }

    def exchange_code(
        self, provider: str, code: str, redirect_uri: str, code_verifier: Optional[str] = None
    ) -> Optional[dict]:
        """
        Exchange authorization code for tokens.

        Args:
            provider: OAuth provider name
            code: Authorization code from callback
            redirect_uri: Redirect URI used in authorization
            code_verifier: PKCE verifier (for Twitter)

        Returns:
            Token response dict or None on error
        """
        config = get_provider_config(provider)
        if not config:
            return None

        data = {
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        if code_verifier:
            data["code_verifier"] = code_verifier

        headers = {"Accept": "application/json"}
        if provider == "github":
            headers["Accept"] = "application/json"

        try:
            response = requests.post(
                config.token_url,
                data=data,
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"OAuth token exchange failed for {provider}: {e}")
            return None

    def fetch_user_info(self, provider: str, access_token: str) -> Optional[OAuthUserInfo]:
        """
        Fetch user info from OAuth provider.

        Args:
            provider: OAuth provider name
            access_token: OAuth access token

        Returns:
            OAuthUserInfo or None on error
        """
        config = get_provider_config(provider)
        if not config:
            return None

        headers = {"Authorization": f"Bearer {access_token}"}

        # Twitter requires different auth header format
        if provider == "twitter":
            headers["Authorization"] = f"Bearer {access_token}"

        try:
            response = requests.get(
                config.userinfo_url,
                headers=headers,
                timeout=10,
                params={"fields": "id,name,username"} if provider == "twitter" else None,
            )
            response.raise_for_status()
            data = response.json()

            # Normalize user info based on provider
            return self._normalize_user_info(provider, data, access_token, config)

        except requests.RequestException as e:
            logger.error(f"OAuth userinfo fetch failed for {provider}: {e}")
            return None

    def _normalize_user_info(
        self, provider: str, data: dict, access_token: str, config
    ) -> OAuthUserInfo:
        """Normalize user info from different providers."""
        if provider == "google":
            return OAuthUserInfo(
                provider=provider,
                provider_user_id=data["sub"],
                email=data.get("email"),
                username=data.get("email", "").split("@")[0],
                name=data.get("name"),
                avatar_url=data.get("picture"),
            )
        elif provider == "github":
            email = data.get("email")
            # GitHub may require separate API call for email
            if not email and config.emails_url:
                email = self._fetch_github_email(access_token, config.emails_url)

            return OAuthUserInfo(
                provider=provider,
                provider_user_id=str(data["id"]),
                email=email,
                username=data.get("login"),
                name=data.get("name"),
                avatar_url=data.get("avatar_url"),
            )
        elif provider == "twitter":
            user_data = data.get("data", data)
            return OAuthUserInfo(
                provider=provider,
                provider_user_id=user_data["id"],
                email=None,  # Twitter doesn't provide email by default
                username=user_data.get("username"),
                name=user_data.get("name"),
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def _fetch_github_email(self, access_token: str, emails_url: str) -> Optional[str]:
        """Fetch primary email from GitHub."""
        try:
            response = requests.get(
                emails_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            response.raise_for_status()
            emails = response.json()

            # Find primary verified email
            for email in emails:
                if email.get("primary") and email.get("verified"):
                    return email["email"]
            # Fallback to first verified email
            for email in emails:
                if email.get("verified"):
                    return email["email"]
            return None
        except requests.RequestException:
            return None

    def find_oauth_account(
        self, provider: str, provider_user_id: str
    ) -> Optional[dict]:
        """
        Find existing OAuth account.

        Args:
            provider: OAuth provider name
            provider_user_id: User ID from provider

        Returns:
            OAuth account dict or None
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT oa.*, u.username, u.email as user_email, u.is_admin
                FROM oauth_accounts oa
                JOIN users u ON oa.user_id = u.id
                WHERE oa.provider = ? AND oa.provider_user_id = ?
                """,
                (provider, provider_user_id),
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
        finally:
            conn.close()

    def find_user_by_email(self, email: str) -> Optional[dict]:
        """Find user by email."""
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
        finally:
            conn.close()

    def create_sso_user(self, user_info: OAuthUserInfo) -> int:
        """
        Create new user from SSO login.

        Args:
            user_info: Normalized user info from OAuth provider

        Returns:
            New user ID
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Generate unique username
            base_username = user_info.username or user_info.email.split("@")[0] if user_info.email else f"user_{user_info.provider_user_id[:8]}"
            username = self._generate_unique_username(cursor, base_username)

            # Create user without password
            created_at = int(time.time())
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin, has_password)
                VALUES (?, ?, '', ?, 1, 0, 0)
                """,
                (username, user_info.email, created_at),
            )
            user_id = cursor.lastrowid
            conn.commit()

            log_audit(
                user_id,
                "user_created_sso",
                success=True,
                details={"provider": user_info.provider, "username": username},
            )

            return user_id

        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to create SSO user: {e}")
            raise
        finally:
            conn.close()

    def _generate_unique_username(self, cursor, base_username: str) -> str:
        """Generate unique username by appending numbers if needed."""
        username = base_username
        suffix = 0

        while True:
            cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
            if not cursor.fetchone():
                return username
            suffix += 1
            username = f"{base_username}{suffix}"

    def link_oauth_account(
        self,
        user_id: int,
        user_info: OAuthUserInfo,
        tokens: dict,
    ) -> bool:
        """
        Link OAuth account to existing user.

        Args:
            user_id: User ID to link to
            user_info: OAuth user info
            tokens: Token response from provider

        Returns:
            True if successful
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Encrypt tokens if we have a key
            access_token = tokens.get("access_token", "")
            refresh_token = tokens.get("refresh_token", "")

            enc_access, iv = self._encrypt_token(access_token)
            enc_refresh, _ = self._encrypt_token(refresh_token) if refresh_token else (b"", b"")

            expires_in = tokens.get("expires_in")
            expires_at = int(time.time()) + expires_in if expires_in else None

            created_at = int(time.time())

            cursor.execute(
                """
                INSERT OR REPLACE INTO oauth_accounts
                (user_id, provider, provider_user_id, provider_email, provider_username,
                 access_token, refresh_token, token_iv, token_expires_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    user_info.provider,
                    user_info.provider_user_id,
                    user_info.email,
                    user_info.username,
                    enc_access,
                    enc_refresh,
                    iv,
                    expires_at,
                    created_at,
                    created_at,
                ),
            )
            conn.commit()

            log_audit(
                user_id,
                "oauth_account_linked",
                success=True,
                details={"provider": user_info.provider},
            )

            return True

        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to link OAuth account: {e}")
            return False
        finally:
            conn.close()

    def unlink_oauth_account(self, user_id: int, provider: str) -> bool:
        """
        Unlink OAuth account from user.

        Args:
            user_id: User ID
            provider: OAuth provider to unlink

        Returns:
            True if successful
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check user has password or other OAuth accounts
            cursor.execute("SELECT has_password FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                return False

            has_password = row["has_password"]

            cursor.execute(
                "SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = ?",
                (user_id,),
            )
            oauth_count = cursor.fetchone()["count"]

            # Don't allow unlinking if it's the only auth method
            if not has_password and oauth_count <= 1:
                logger.warning(f"Cannot unlink {provider}: no other auth method for user {user_id}")
                return False

            cursor.execute(
                "DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?",
                (user_id, provider),
            )
            conn.commit()

            log_audit(
                user_id,
                "oauth_account_unlinked",
                success=True,
                details={"provider": provider},
            )

            return cursor.rowcount > 0

        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to unlink OAuth account: {e}")
            return False
        finally:
            conn.close()

    def get_user_oauth_accounts(self, user_id: int) -> list[dict]:
        """Get all OAuth accounts linked to user."""
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                """
                SELECT provider, provider_email, provider_username, created_at
                FROM oauth_accounts
                WHERE user_id = ?
                ORDER BY created_at
                """,
                (user_id,),
            )
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
