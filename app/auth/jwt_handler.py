import os
from datetime import datetime, timedelta
from typing import Dict, Any

import jwt
from flask import current_app


class AuthError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 401):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


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


def create_token(user_id: int, username: str, is_admin: bool = False) -> str:
    issued_at = datetime.utcnow()
    payload = {
        "sub": user_id,
        "username": username,
        "is_admin": is_admin,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(hours=24)).timestamp()),
    }
    return jwt.encode(payload, _get_secret(), algorithm="HS256")


def verify_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, _get_secret(), algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("TOKEN_EXPIRED", "Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("INVALID_TOKEN", "Invalid token") from exc
