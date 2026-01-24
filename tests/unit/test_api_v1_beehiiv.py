"""
Beehiiv API Endpoint Tests

Tests for the Beehiiv newsletter platform:
- Authentication
- Publications
- Posts
- Subscriptions
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.beehiiv import beehiiv_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(beehiiv_bp, url_prefix="/api/v1/beehiiv")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Beehiiv credentials."""
    return {
        "api_key": "test-beehiiv-api-key",
        "publication_id": "pub_123",
    }


class TestBeehiivAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_cm, client):
        """Should authenticate with valid API key."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"data": [{"id": "pub_123", "name": "My Newsletter"}]},
        )

        response = client.post(
            "/api/v1/beehiiv/auth",
            json={"api_key": "test-api-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_key(self, client):
        """Should reject missing API key."""
        response = client.post("/api/v1/beehiiv/auth", json={})
        assert response.status_code == 400


class TestBeehiivPublications:
    """Test publications endpoints."""

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.get")
    def test_list_publications_success(self, mock_get, mock_cm, mock_credentials):
        """Should return publications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {"id": "pub_123", "name": "My Newsletter", "subscriber_count": 1000}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1
        assert response["data"][0]["name"] == "My Newsletter"


class TestBeehiivPosts:
    """Test posts endpoints."""

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.get")
    def test_list_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [
                    {"id": "post_1", "title": "Welcome Post", "status": "published"}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {"id": "post_new", "title": "New Post", "status": "draft"}
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["title"] == "New Post"


class TestBeehiivSubscriptions:
    """Test subscriptions endpoints."""

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.get")
    def test_list_subscriptions_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subscriptions."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": [{"email": "sub@example.com", "status": "active"}]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1

    @patch("app.web.api.v1.beehiiv.CredentialManager")
    @patch("app.web.api.v1.beehiiv.http_requests.post")
    def test_create_subscription_success(self, mock_post, mock_cm, mock_credentials):
        """Should add a new subscriber."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"data": {"email": "new@example.com", "id": "sub_123"}},
        )

        response = mock_post.return_value.json()
        assert response["data"]["email"] == "new@example.com"
