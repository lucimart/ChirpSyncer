import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

import jwt
from flask import current_app


class AuthError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 401):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


# Token expiration settings
ACCESS_TOKEN_EXPIRY_HOURS = 1  # Short-lived access token
REFRESH_TOKEN_EXPIRY_DAYS = 30  # Long-lived refresh token


def _get_secret() -> str:
    """Get JWT secret from environment or Flask config.

    Raises:
        RuntimeError: If no JWT_SECRET or SECRET_KEY is configured.
    """
    secret = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
    if not secret:
        try:
            secret = current_app.config.get("JWT_SECRET") or current_app.config.get("SECRET_KEY")
        except RuntimeError:
            secret = None
    if not secret:
        raise RuntimeError(
            "JWT_SECRET or SECRET_KEY must be configured. "
            "Set JWT_SECRET environment variable or configure SECRET_KEY in Flask app."
        )
    return secret


def _get_db_path() -> str:
    """Get database path from Flask config or environment."""
    try:
        return current_app.config.get("DB_PATH", "chirpsyncer.db")
    except RuntimeError:
        return os.getenv("DATABASE_PATH", "chirpsyncer.db")


def init_refresh_tokens_table(db_path: Optional[str] = None) -> None:
    """Create refresh_tokens table if not exists."""
    if db_path is None:
        db_path = _get_db_path()
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                family_id TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                revoked_at INTEGER,
                replaced_by TEXT,
                user_agent TEXT,
                ip_address TEXT,
                last_used_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
            ON refresh_tokens(user_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
            ON refresh_tokens(family_id)
        """)
        conn.commit()


def create_token(user_id: int, username: str, is_admin: bool = False) -> str:
    """Create a short-lived access token."""
    issued_at = datetime.utcnow()
    payload = {
        "sub": user_id,
        "username": username,
        "is_admin": is_admin,
        "type": "access",
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(hours=ACCESS_TOKEN_EXPIRY_HOURS)).timestamp()),
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


def create_refresh_token(
    user_id: int,
    family_id: Optional[str] = None,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    """Create a refresh token and store its hash in the database.

    Args:
        user_id: The user ID for the token
        family_id: Optional family ID for token rotation tracking
        user_agent: Optional user agent string for session tracking
        ip_address: Optional IP address for session tracking

    Returns:
        The refresh token string
    """
    import hashlib

    db_path = _get_db_path()
    init_refresh_tokens_table(db_path)

    # Generate token and family
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    if family_id is None:
        family_id = secrets.token_urlsafe(16)

    now = int(datetime.utcnow().timestamp())
    expires_at = int((datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)).timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO refresh_tokens
            (user_id, token_hash, family_id, expires_at, created_at, user_agent, ip_address, last_used_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, token_hash, family_id, expires_at, now, user_agent, ip_address, now))
        conn.commit()

    return token


def verify_refresh_token(token: str) -> Tuple[int, str]:
    """Verify a refresh token and return (user_id, family_id).

    Raises:
        AuthError: If token is invalid, expired, or revoked
    """
    import hashlib

    db_path = _get_db_path()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_id, family_id, expires_at, revoked_at
            FROM refresh_tokens
            WHERE token_hash = ?
        """, (token_hash,))
        row = cursor.fetchone()

        if not row:
            raise AuthError("INVALID_TOKEN", "Invalid refresh token")

        user_id, family_id, expires_at, revoked_at = row

        if revoked_at is not None:
            # Token reuse detected! Revoke entire family (security measure)
            cursor.execute("""
                UPDATE refresh_tokens
                SET revoked_at = ?
                WHERE family_id = ? AND revoked_at IS NULL
            """, (now, family_id))
            conn.commit()
            raise AuthError("TOKEN_REUSED", "Refresh token reuse detected, all tokens revoked", 401)

        if expires_at < now:
            raise AuthError("TOKEN_EXPIRED", "Refresh token has expired")

        return user_id, family_id


def rotate_refresh_token(old_token: str) -> Tuple[str, str]:
    """Rotate a refresh token: invalidate old one, create new one.

    Returns:
        Tuple of (new_access_token, new_refresh_token)

    Raises:
        AuthError: If old token is invalid
    """
    import hashlib

    db_path = _get_db_path()

    # Verify old token
    user_id, family_id = verify_refresh_token(old_token)

    # Mark old token as used (revoked)
    old_token_hash = hashlib.sha256(old_token.encode()).hexdigest()
    now = int(datetime.utcnow().timestamp())

    # Get user info for access token
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username, is_admin FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            raise AuthError("USER_NOT_FOUND", "User not found")

        username, is_admin = user_row

        # Create new refresh token
        new_refresh = secrets.token_urlsafe(32)
        new_token_hash = hashlib.sha256(new_refresh.encode()).hexdigest()
        expires_at = int((datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)).timestamp())

        # Revoke old token and link to new one
        cursor.execute("""
            UPDATE refresh_tokens
            SET revoked_at = ?, replaced_by = ?
            WHERE token_hash = ?
        """, (now, new_token_hash, old_token_hash))

        # Insert new token in same family
        cursor.execute("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, new_token_hash, family_id, expires_at, now))

        conn.commit()

    # Create new access token
    new_access = create_token(user_id, username, bool(is_admin))

    return new_access, new_refresh


def revoke_all_user_tokens(user_id: int) -> int:
    """Revoke all refresh tokens for a user. Returns count of revoked tokens."""
    db_path = _get_db_path()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE refresh_tokens
            SET revoked_at = ?
            WHERE user_id = ? AND revoked_at IS NULL
        """, (now, user_id))
        conn.commit()
        return cursor.rowcount


def get_user_sessions(user_id: int) -> list:
    """Get all active sessions for a user.

    Returns list of session dicts with id, created_at, last_used_at, user_agent, ip_address.
    """
    db_path = _get_db_path()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, family_id, created_at, last_used_at, user_agent, ip_address, expires_at
            FROM refresh_tokens
            WHERE user_id = ?
              AND revoked_at IS NULL
              AND expires_at > ?
            ORDER BY last_used_at DESC
        """, (user_id, now))
        rows = cursor.fetchall()

        return [
            {
                "id": row["id"],
                "family_id": row["family_id"],
                "created_at": row["created_at"],
                "last_used_at": row["last_used_at"],
                "user_agent": row["user_agent"],
                "ip_address": row["ip_address"],
                "expires_at": row["expires_at"],
            }
            for row in rows
        ]


def revoke_session(user_id: int, session_id: int) -> bool:
    """Revoke a specific session by ID.

    Args:
        user_id: User ID (for authorization check)
        session_id: The refresh token ID to revoke

    Returns:
        True if session was revoked, False if not found or unauthorized
    """
    db_path = _get_db_path()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        # Only revoke if belongs to user
        cursor.execute("""
            UPDATE refresh_tokens
            SET revoked_at = ?
            WHERE id = ? AND user_id = ? AND revoked_at IS NULL
        """, (now, session_id, user_id))
        conn.commit()
        return cursor.rowcount > 0


def revoke_other_sessions(user_id: int, current_family_id: str) -> int:
    """Revoke all sessions except the current one.

    Args:
        user_id: User ID
        current_family_id: Family ID of the current session to keep

    Returns:
        Number of sessions revoked
    """
    db_path = _get_db_path()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE refresh_tokens
            SET revoked_at = ?
            WHERE user_id = ? AND family_id != ? AND revoked_at IS NULL
        """, (now, user_id, current_family_id))
        conn.commit()
        return cursor.rowcount


def update_session_last_used(token: str) -> None:
    """Update the last_used_at timestamp for a session."""
    import hashlib

    db_path = _get_db_path()
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = int(datetime.utcnow().timestamp())

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE refresh_tokens
            SET last_used_at = ?
            WHERE token_hash = ?
        """, (now, token_hash))
        conn.commit()


def verify_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, _get_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("TOKEN_EXPIRED", "Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("INVALID_TOKEN", "Invalid token") from exc
