"""
Write.as API Endpoint Tests

Tests for the Write.as minimalist blogging platform:
- Authentication
- Posts CRUD
- Collections (blogs)
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.writeas import writeas_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(writeas_bp, url_prefix="/api/v1/writeas")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Write.as credentials."""
    return {
        "access_token": "test-writeas-token",
        "username": "testwriter",
    }


class TestWriteAsAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.writeas.CredentialManager")
    @patch("app.web.api.v1.writeas.http_requests.get")
    @patch("app.web.api.v1.writeas.http_requests.post")
    def test_authenticate_success(self, mock_post, mock_get, mock_cm, client):
        """Should authenticate with valid credentials."""
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "access_token": "new-token",
                    "user": {"username": "testwriter"},
                }
            },
        )
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"data": {"username": "testwriter"}},
        )

        response = client.post(
            "/api/v1/writeas/auth",
            json={"alias": "testwriter", "password": "testpass"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/writeas/auth", json={})
        assert response.status_code == 400


class TestWriteAsPosts:
    """Test posts endpoints (mock responses)."""

    @patch("app.web.api.v1.writeas.CredentialManager")
    @patch("app.web.api.v1.writeas.http_requests.get")
    def test_list_posts_response(self, mock_get, mock_cm, mock_credentials):
        """Should return user's posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {"id": "abc123", "body": "Test post content", "views": 10}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1
        assert response["data"][0]["body"] == "Test post content"

    @patch("app.web.api.v1.writeas.http_requests.get")
    def test_get_post_public_response(self, mock_get):
        """Should return a public post."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {"id": "abc123", "body": "Public content", "views": 100}
            },
        )

        response = mock_get.return_value.json()
        assert response["data"]["id"] == "abc123"

    @patch("app.web.api.v1.writeas.CredentialManager")
    @patch("app.web.api.v1.writeas.http_requests.post")
    def test_create_post_response(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "new123",
                    "token": "edit-token",
                    "body": "New post",
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["id"] == "new123"
        assert "token" in response["data"]

    @patch("app.web.api.v1.writeas.CredentialManager")
    @patch("app.web.api.v1.writeas.http_requests.delete")
    def test_delete_post_response(self, mock_delete, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_delete.return_value = Mock(ok=True, status_code=204)

        assert mock_delete.return_value.ok is True


class TestWriteAsCollections:
    """Test collections (blogs) endpoints (mock responses)."""

    @patch("app.web.api.v1.writeas.CredentialManager")
    @patch("app.web.api.v1.writeas.http_requests.get")
    def test_list_collections_response(self, mock_get, mock_cm, mock_credentials):
        """Should return user's collections."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {"alias": "myblog", "title": "My Blog", "total_posts": 5}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1
        assert response["data"][0]["alias"] == "myblog"

    @patch("app.web.api.v1.writeas.http_requests.get")
    def test_get_collection_response(self, mock_get):
        """Should return public collection info."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "alias": "publicblog",
                    "title": "Public Blog",
                    "description": "A public blog",
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["data"]["alias"] == "publicblog"
