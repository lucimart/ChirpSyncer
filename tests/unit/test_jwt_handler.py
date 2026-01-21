import time

import pytest
import jwt

from app.auth.jwt_handler import AuthError, create_token, verify_token


def test_create_token():
    token = create_token(1, "testuser", False)
    assert isinstance(token, str)
    assert len(token) > 0


def test_verify_valid_token():
    token = create_token(1, "testuser", True)
    payload = verify_token(token)
    assert payload["sub"] == 1
    assert payload["username"] == "testuser"
    assert payload["is_admin"] is True


def test_verify_expired_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    payload = {
        "sub": 1,
        "username": "testuser",
        "is_admin": False,
        "iat": int(time.time()) - 10,
        "exp": int(time.time()) - 5,
    }
    token = jwt.encode(payload, "test-jwt-secret", algorithm="HS256")
    with pytest.raises(AuthError) as exc:
        verify_token(token)
    assert exc.value.code == "TOKEN_EXPIRED"
