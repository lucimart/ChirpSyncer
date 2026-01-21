import os
import tempfile

import pytest

from app.auth.jwt_handler import create_token
from app.auth.user_manager import UserManager
from app.web.dashboard import create_app


@pytest.fixture
def test_db_path():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def app(test_db_path, monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    app = create_app(db_path=test_db_path, master_key=b"0" * 32)
    app.config.update(TESTING=True, JSON_SORT_KEYS=False)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def test_user(test_db_path):
    manager = UserManager(test_db_path)
    manager.init_db()
    user_id = manager.create_user(
        "testuser",
        "testuser@example.com",
        "TestPassword123!",
        is_admin=False,
    )
    return {
        "id": user_id,
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "TestPassword123!",
        "is_admin": False,
    }


@pytest.fixture
def auth_headers(app, test_user):
    token = create_token(test_user["id"], test_user["username"], test_user["is_admin"])
    return {"Authorization": f"Bearer {token}"}
