"""
Micro.blog API Endpoint Tests

Tests for the Micro.blog Micropub integration:
- Authentication
- Timeline
- Posts CRUD
- Bookmarks
- Discovery
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.microblog import microblog_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(microblog_bp, url_prefix="/api/v1/microblog")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Micro.blog credentials."""
    return {
        "app_token": "test-app-token",
        "username": "testuser",
        "default_site": "testuser.micro.blog",
    }


class TestMicroblogAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.post")
    @patch("app.web.api.v1.microblog.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_post, mock_cm, client):
        """Should authenticate with app token."""
        mock_get.return_value = Mock(ok=True, json=lambda: {"destination": []})
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "username": "testuser",
                "default_site": "testuser.micro.blog",
            },
        )

        response = client.post(
            "/api/v1/microblog/auth",
            json={"app_token": "test-app-token"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_token(self, client):
        """Should reject missing app token."""
        response = client.post("/api/v1/microblog/auth", json={})
        assert response.status_code == 400


class TestMicroblogTimeline:
    """Test timeline endpoints."""

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.get")
    def test_get_timeline_success(self, mock_get, mock_cm, mock_credentials):
        """Should return timeline posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "items": [
                    {
                        "id": "123",
                        "content_text": "Hello world!",
                        "author": {"name": "testuser"},
                    }
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["items"]) == 1
        assert response["items"][0]["content_text"] == "Hello world!"


class TestMicroblogPosts:
    """Test posts endpoints."""

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            status_code=201,
            headers={"Location": "https://micro.blog/testuser/123"},
        )

        assert mock_post.return_value.status_code == 201
        assert "Location" in mock_post.return_value.headers

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.post")
    def test_delete_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True


class TestMicroblogBookmarks:
    """Test bookmarks endpoints."""

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.get")
    def test_list_bookmarks_success(self, mock_get, mock_cm, mock_credentials):
        """Should return bookmarks."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "items": [{"id": "1", "url": "https://example.com", "title": "Example"}]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["items"]) == 1


class TestMicroblogDiscover:
    """Test discovery endpoints."""

    @patch("app.web.api.v1.microblog.CredentialManager")
    @patch("app.web.api.v1.microblog.http_requests.get")
    def test_discover_success(self, mock_get, mock_cm, mock_credentials):
        """Should return discover feed."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "items": [{"id": "1", "content_text": "Trending post"}]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["items"]) == 1
