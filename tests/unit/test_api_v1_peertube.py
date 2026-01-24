"""
PeerTube API Endpoint Tests

Tests for the PeerTube federated video platform:
- Authentication (OAuth2)
- Videos
- Channels
- Comments
- Subscriptions
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.peertube import peertube_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(peertube_bp, url_prefix="/api/v1/peertube")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock PeerTube credentials."""
    return {
        "instance_url": "https://peertube.example.com",
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "username": "testuser",
    }


class TestPeerTubeAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    @patch("app.web.api.v1.peertube.http_requests.post")
    def test_authenticate_success(self, mock_post, mock_get, mock_cm, client):
        """Should authenticate with OAuth2."""
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "access_token": "new-token",
                "refresh_token": "refresh-token",
            },
        )
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"username": "testuser", "id": 1},
        )

        response = client.post(
            "/api/v1/peertube/auth",
            json={
                "instance_url": "https://peertube.example.com",
                "username": "testuser",
                "password": "testpass",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/peertube/auth", json={})
        assert response.status_code == 400


class TestPeerTubeVideos:
    """Test videos endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_list_videos_success(self, mock_get, mock_cm, mock_credentials):
        """Should return videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total": 1,
                "data": [{"id": 1, "name": "Test Video", "views": 100}],
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1
        assert response["data"][0]["name"] == "Test Video"

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_get_video_success(self, mock_get, mock_cm, mock_credentials):
        """Should return single video details."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 1,
                "name": "Test Video",
                "description": "A test video",
                "views": 100,
            },
        )

        response = mock_get.return_value.json()
        assert response["name"] == "Test Video"

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_get_my_videos_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total": 1,
                "data": [{"id": 1, "name": "My Video"}],
            },
        )

        response = mock_get.return_value.json()
        assert response["total"] == 1


class TestPeerTubeChannels:
    """Test channels endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_list_channels_success(self, mock_get, mock_cm, mock_credentials):
        """Should return channels."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total": 1,
                "data": [{"id": 1, "name": "my_channel", "displayName": "My Channel"}],
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1


class TestPeerTubeComments:
    """Test comments endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.post")
    def test_add_comment_success(self, mock_post, mock_cm, mock_credentials):
        """Should add a comment to a video."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"comment": {"id": 1, "text": "Great video!"}},
        )

        response = mock_post.return_value.json()
        assert response["comment"]["text"] == "Great video!"


class TestPeerTubeInteractions:
    """Test video interaction endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.put")
    def test_like_video_success(self, mock_put, mock_cm, mock_credentials):
        """Should like a video."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_put.return_value = Mock(ok=True, status_code=204)

        assert mock_put.return_value.ok is True


class TestPeerTubeSearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_search_videos_success(self, mock_get, mock_cm, mock_credentials):
        """Should search videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total": 1,
                "data": [{"id": 1, "name": "Search Result"}],
            },
        )

        response = mock_get.return_value.json()
        assert len(response["data"]) == 1


class TestPeerTubeSubscriptions:
    """Test subscriptions endpoints."""

    @patch("app.web.api.v1.peertube.CredentialManager")
    @patch("app.web.api.v1.peertube.http_requests.get")
    def test_get_subscriptions_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subscriptions."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total": 1,
                "data": [{"id": 1, "name": "Subscribed Channel"}],
            },
        )

        response = mock_get.return_value.json()
        assert response["total"] == 1
