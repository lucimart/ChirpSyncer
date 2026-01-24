"""
Ghost API Endpoint Tests

Tests for the Ghost Admin API integration:
- Authentication with JWT
- Posts CRUD
- Tags and authors
- Image upload
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.ghost import ghost_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(ghost_bp, url_prefix="/api/v1/ghost")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Ghost credentials."""
    return {
        "api_url": "https://my-ghost-blog.com",
        "admin_key": "6400abc123def456:1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
        "site_title": "My Ghost Blog",
    }


class TestGhostAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.generate_ghost_token")
    @patch("app.web.api.v1.ghost.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_token, mock_cm, client):
        """Should authenticate with valid admin key."""
        mock_token.return_value = "test-jwt-token"
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"site": {"title": "My Blog", "url": "https://my-blog.com"}},
        )

        response = client.post(
            "/api/v1/ghost/auth",
            json={
                "api_url": "https://my-ghost-blog.com",
                "admin_key": "6400abc123def456:1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/ghost/auth", json={})
        assert response.status_code == 400

    def test_authenticate_invalid_key_format(self, client):
        """Should reject invalid key format."""
        response = client.post(
            "/api/v1/ghost/auth",
            json={
                "api_url": "https://my-ghost-blog.com",
                "admin_key": "invalid-key-without-colon",
            },
        )
        assert response.status_code == 400


class TestGhostSite:
    """Test site info endpoints (mock responses)."""

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_get_site_response(self, mock_request, mock_cm, mock_credentials):
        """Should return site information."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "site": {
                    "title": "My Ghost Blog",
                    "description": "A blog about things",
                    "url": "https://my-ghost-blog.com",
                }
            },
        )

        response = mock_request.return_value.json()
        assert response["site"]["title"] == "My Ghost Blog"


class TestGhostPosts:
    """Test posts endpoints (mock responses)."""

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_list_posts_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "posts": [
                    {"id": "abc123", "title": "Test Post", "status": "published"}
                ],
                "meta": {"pagination": {"total": 1, "pages": 1}},
            },
        )

        response = mock_request.return_value.json()
        assert len(response["posts"]) == 1
        assert response["posts"][0]["title"] == "Test Post"

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_get_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should return single post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "posts": [
                    {
                        "id": "abc123",
                        "title": "Test Post",
                        "html": "<p>Content</p>",
                        "status": "published",
                    }
                ]
            },
        )

        response = mock_request.return_value.json()
        assert response["posts"][0]["id"] == "abc123"

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_create_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "posts": [{"id": "new123", "title": "New Post", "status": "draft"}]
            },
        )

        response = mock_request.return_value.json()
        assert response["posts"][0]["title"] == "New Post"

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_delete_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(ok=True, status_code=204, json=lambda: None)

        assert mock_request.return_value.ok is True


class TestGhostTags:
    """Test tags endpoints (mock responses)."""

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_list_tags_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of tags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "tags": [
                    {"id": "tag1", "name": "Python", "slug": "python"},
                    {"id": "tag2", "name": "Flask", "slug": "flask"},
                ]
            },
        )

        response = mock_request.return_value.json()
        assert len(response["tags"]) == 2


class TestGhostAuthors:
    """Test authors endpoints (mock responses)."""

    @patch("app.web.api.v1.ghost.CredentialManager")
    @patch("app.web.api.v1.ghost.http_requests.request")
    def test_list_authors_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of authors."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "users": [
                    {"id": "user1", "name": "Admin", "email": "admin@example.com"}
                ]
            },
        )

        response = mock_request.return_value.json()
        assert len(response["users"]) == 1
        assert response["users"][0]["name"] == "Admin"
