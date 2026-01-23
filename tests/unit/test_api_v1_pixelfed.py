"""Unit tests for Pixelfed API endpoints."""

import json
from unittest.mock import Mock, patch

import pytest
from flask import Flask

from app.web.api.v1.pixelfed import pixelfed_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(pixelfed_bp, url_prefix="/api/v1/pixelfed")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Pixelfed credentials."""
    return {
        "instance_url": "https://pixelfed.example",
        "access_token": "test-pixelfed-token",
    }


class TestPixelfedAPI:
    """Tests for Pixelfed API endpoints."""

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_verify_credentials(self, mock_get, mock_cm, client, mock_credentials):
        """Test verify credentials endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "123",
                "username": "testuser",
                "display_name": "Test User",
                "avatar": "https://pixelfed.example/avatar.jpg",
            },
        )

        response = client.get(
            "/api/v1/pixelfed/verify_credentials",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["username"] == "testuser"

    def test_verify_credentials_no_master_key(self, client):
        """Test verify credentials without master key."""
        response = client.get("/api/v1/pixelfed/verify_credentials")
        # API returns 400 for missing master key
        assert response.status_code in [400, 401]

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_get_account(self, mock_get, mock_cm, client, mock_credentials):
        """Test get account endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "456",
                "username": "otheruser",
                "display_name": "Other User",
            },
        )

        response = client.get(
            "/api/v1/pixelfed/accounts/456",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["username"] == "otheruser"

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_get_home_timeline(self, mock_get, mock_cm, client, mock_credentials):
        """Test home timeline endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": "post1",
                    "content": "Test post",
                    "created_at": "2024-01-01T00:00:00Z",
                }
            ],
        )

        response = client.get(
            "/api/v1/pixelfed/timelines/home",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "statuses" in data["data"]

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_get_public_timeline(self, mock_get, mock_cm, client, mock_credentials):
        """Test public timeline endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [{"id": "post2", "content": "Public post"}],
        )

        response = client.get(
            "/api/v1/pixelfed/timelines/public",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_create_status(self, mock_post, mock_cm, client, mock_credentials):
        """Test create status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "newpost",
                "content": "Hello Pixelfed!",
                "created_at": "2024-01-01T12:00:00Z",
            },
        )

        response = client.post(
            "/api/v1/pixelfed/statuses",
            headers={"X-Master-Key": "test-key"},
            json={"status": "Hello Pixelfed!", "media_ids": ["media1"]},
        )

        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201]
        data = response.get_json()
        assert data["success"] is True

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    def test_create_status_without_media(self, mock_cm, client, mock_credentials):
        """Test create status without media fails."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials

        response = client.post(
            "/api/v1/pixelfed/statuses",
            headers={"X-Master-Key": "test-key"},
            json={"status": "Text only post"},
        )

        # Pixelfed requires media
        assert response.status_code == 400

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.delete")
    def test_delete_status(self, mock_delete, mock_cm, client, mock_credentials):
        """Test delete status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_delete.return_value = Mock(ok=True, json=lambda: {})

        response = client.delete(
            "/api/v1/pixelfed/statuses/post123",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["deleted"] is True

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_favourite_status(self, mock_post, mock_cm, client, mock_credentials):
        """Test favourite status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"id": "post1", "favourited": True}
        )

        response = client.post(
            "/api/v1/pixelfed/statuses/post1/favourite",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_unfavourite_status(self, mock_post, mock_cm, client, mock_credentials):
        """Test unfavourite status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"id": "post1", "favourited": False}
        )

        response = client.post(
            "/api/v1/pixelfed/statuses/post1/unfavourite",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_reblog_status(self, mock_post, mock_cm, client, mock_credentials):
        """Test reblog status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"id": "post1", "reblogged": True}
        )

        response = client.post(
            "/api/v1/pixelfed/statuses/post1/reblog",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_follow_account(self, mock_post, mock_cm, client, mock_credentials):
        """Test follow account endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"id": "user123", "following": True}
        )

        response = client.post(
            "/api/v1/pixelfed/accounts/user123/follow",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.post")
    def test_unfollow_account(self, mock_post, mock_cm, client, mock_credentials):
        """Test unfollow account endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"id": "user123", "following": False}
        )

        response = client.post(
            "/api/v1/pixelfed/accounts/user123/unfollow",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_get_account_statuses(self, mock_get, mock_cm, client, mock_credentials):
        """Test get account statuses endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True, json=lambda: [{"id": "post1", "content": "User's post"}]
        )

        response = client.get(
            "/api/v1/pixelfed/accounts/user123/statuses",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "statuses" in data["data"]

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_get_status(self, mock_get, mock_cm, client, mock_credentials):
        """Test get single status endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"id": "post1", "content": "Single post content"},
        )

        response = client.get(
            "/api/v1/pixelfed/statuses/post1",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_discover_posts(self, mock_get, mock_cm, client, mock_credentials):
        """Test discover posts endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True, json=lambda: [{"id": "discover1", "content": "Trending post"}]
        )

        response = client.get(
            "/api/v1/pixelfed/discover/posts",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.pixelfed.CredentialManager")
    @patch("app.web.api.v1.pixelfed.http_requests.get")
    def test_api_error_handling(self, mock_get, mock_cm, client, mock_credentials):
        """Test API error handling."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(ok=False, status_code=401, text="Unauthorized")

        response = client.get(
            "/api/v1/pixelfed/verify_credentials",
            headers={"X-Master-Key": "test-key"},
        )

        # API may return 400, 401 or 500 for upstream errors
        assert response.status_code in [400, 401, 500]
        data = response.get_json()
        assert data["success"] is False
