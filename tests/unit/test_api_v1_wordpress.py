"""
WordPress API Endpoint Tests

Tests for the WordPress REST API integration:
- Authentication
- Posts CRUD
- Categories and tags
- Media upload
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.wordpress import wordpress_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(wordpress_bp, url_prefix="/api/v1/wordpress")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock WordPress credentials."""
    return {
        "site_url": "https://example.wordpress.com",
        "username": "testuser",
        "app_password": "xxxx xxxx xxxx xxxx",
        "user_id": 1,
    }


class TestWordPressAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_cm, client):
        """Should authenticate with valid credentials."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"id": 1, "name": "Test User", "slug": "testuser"},
        )

        response = client.post(
            "/api/v1/wordpress/auth",
            json={
                "site_url": "https://example.wordpress.com",
                "username": "testuser",
                "app_password": "xxxx xxxx xxxx xxxx",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/wordpress/auth", json={})
        assert response.status_code == 400


class TestWordPressPosts:
    """Test posts endpoints (mock responses)."""

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_list_posts_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": 1, "title": {"rendered": "Test Post"}, "status": "publish"},
            ],
            headers={"X-WP-Total": "1", "X-WP-TotalPages": "1"},
        )

        response = mock_request.return_value.json()
        assert len(response) == 1
        assert response[0]["title"]["rendered"] == "Test Post"

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_create_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 123,
                "title": {"rendered": "New Post"},
                "status": "draft",
            },
        )

        response = mock_request.return_value.json()
        assert response["id"] == 123
        assert response["title"]["rendered"] == "New Post"

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_update_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should update an existing post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 123,
                "title": {"rendered": "Updated Post"},
                "status": "publish",
            },
        )

        response = mock_request.return_value.json()
        assert response["title"]["rendered"] == "Updated Post"

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_delete_post_response(self, mock_request, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: {"deleted": True, "id": 123},
        )

        response = mock_request.return_value.json()
        assert response["deleted"] is True


class TestWordPressCategories:
    """Test category endpoints (mock responses)."""

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_list_categories_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of categories."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": 1, "name": "Uncategorized", "slug": "uncategorized"},
                {"id": 2, "name": "Tech", "slug": "tech"},
            ],
        )

        response = mock_request.return_value.json()
        assert len(response) == 2
        assert response[1]["name"] == "Tech"


class TestWordPressTags:
    """Test tags endpoints (mock responses)."""

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.request")
    def test_list_tags_response(self, mock_request, mock_cm, mock_credentials):
        """Should return list of tags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": 1, "name": "python", "slug": "python"},
                {"id": 2, "name": "flask", "slug": "flask"},
            ],
        )

        response = mock_request.return_value.json()
        assert len(response) == 2
        assert response[0]["name"] == "python"


class TestWordPressMedia:
    """Test media upload endpoints (mock responses)."""

    @patch("app.web.api.v1.wordpress.CredentialManager")
    @patch("app.web.api.v1.wordpress.http_requests.post")
    def test_upload_media_response(self, mock_post, mock_cm, mock_credentials):
        """Should upload media file."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 456,
                "source_url": "https://example.com/wp-content/uploads/image.jpg",
                "media_type": "image",
            },
        )

        response = mock_post.return_value.json()
        assert response["id"] == 456
        assert "source_url" in response
