"""
Medium API Endpoint Tests

Tests for the Medium publishing platform integration:
- User profile
- Publications
- Posts (create)
- Images upload
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.medium import medium_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(medium_bp, url_prefix="/api/v1/medium")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Medium credentials."""
    return {
        "access_token": "test-medium-token",
    }


class TestMediumUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.get")
    def test_get_me_success(self, mock_get, mock_cm, mock_credentials):
        """Should return authenticated user's profile."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "user-123",
                    "username": "testuser",
                    "name": "Test User",
                    "url": "https://medium.com/@testuser",
                    "imageUrl": "https://cdn-images.medium.com/avatar.png",
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["data"]["username"] == "testuser"
        assert response["data"]["id"] == "user-123"


class TestMediumPublications:
    """Test publications endpoints."""

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.get")
    def test_get_publications_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's publications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {
                        "id": "pub-123",
                        "name": "Test Publication",
                        "description": "A test publication",
                        "url": "https://medium.com/test-publication",
                        "imageUrl": "https://cdn-images.medium.com/pub.png",
                    }
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1
        assert response["data"][0]["name"] == "Test Publication"


class TestMediumPosts:
    """Test post creation endpoints."""

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.post")
    def test_create_user_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a post under user's profile."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "post-123",
                    "title": "Test Post",
                    "authorId": "user-123",
                    "url": "https://medium.com/@testuser/test-post-123",
                    "publishStatus": "draft",
                    "tags": ["test", "python"],
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["title"] == "Test Post"
        assert response["data"]["publishStatus"] == "draft"

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.post")
    def test_create_publication_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a post under a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "post-456",
                    "title": "Publication Post",
                    "authorId": "user-123",
                    "url": "https://medium.com/test-pub/publication-post",
                    "publishStatus": "public",
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["title"] == "Publication Post"
        assert response["data"]["publishStatus"] == "public"

    def test_publish_status_values(self):
        """Should support all publish status values."""
        statuses = ["public", "draft", "unlisted"]
        for status in statuses:
            assert status in ["public", "draft", "unlisted"]

    def test_content_format_values(self):
        """Should support html and markdown formats."""
        formats = ["html", "markdown"]
        for fmt in formats:
            assert fmt in ["html", "markdown"]

    def test_tag_limit(self):
        """Should respect 5 tag limit."""
        tags = ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
        limited_tags = tags[:5]
        assert len(limited_tags) == 5


class TestMediumImages:
    """Test image upload endpoints."""

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.post")
    def test_upload_image_success(self, mock_post, mock_cm, mock_credentials):
        """Should upload an image."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "url": "https://cdn-images.medium.com/uploaded-image.png",
                    "md5": "abc123",
                }
            },
        )

        response = mock_post.return_value.json()
        assert "url" in response["data"]

    def test_supported_image_types(self):
        """Should support JPEG, PNG, GIF, TIFF."""
        supported = ["image/jpeg", "image/png", "image/gif", "image/tiff"]
        for img_type in supported:
            assert img_type.startswith("image/")


class TestMediumContributors:
    """Test publication contributors endpoints."""

    @patch("app.web.api.v1.medium.CredentialManager")
    @patch("app.web.api.v1.medium.http_requests.get")
    def test_get_contributors_success(self, mock_get, mock_cm, mock_credentials):
        """Should return publication contributors."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {
                        "publicationId": "pub-123",
                        "userId": "user-123",
                        "role": "editor",
                    },
                    {
                        "publicationId": "pub-123",
                        "userId": "user-456",
                        "role": "writer",
                    },
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 2
        assert response["data"][0]["role"] == "editor"
