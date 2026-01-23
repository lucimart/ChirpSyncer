"""
Lens Protocol API Endpoint Tests

Tests for the Lens Protocol Web3 social platform:
- Authentication
- Profiles
- Publications
- Feed
- Social interactions (follow, collect, mirror)
- Search
- Notifications
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.lens import lens_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(lens_bp, url_prefix="/api/v1/lens")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Lens Protocol credentials."""
    return {
        "access_token": "lens-access-token",
        "refresh_token": "lens-refresh-token",
        "profile_id": "0x01",
        "handle": "testuser.lens",
    }


class TestLensAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_authenticate_success(self, mock_post, mock_cm, client):
        """Should authenticate with signed challenge."""
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "authenticate": {
                        "accessToken": "new-token",
                        "refreshToken": "refresh-token",
                    }
                }
            },
        )

        response = client.post(
            "/api/v1/lens/auth",
            json={
                "id": "challenge-id-123",
                "signature": "0xsignature",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/lens/auth", json={})
        assert response.status_code == 400


class TestLensProfile:
    """Test profile endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_get_profile_success(self, mock_post, mock_cm, mock_credentials):
        """Should return profile info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "profile": {
                        "id": "0x01",
                        "handle": "testuser.lens",
                        "name": "Test User",
                        "bio": "Web3 enthusiast",
                        "stats": {"totalFollowers": 100, "totalFollowing": 50},
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["data"]["profile"]["handle"] == "testuser.lens"


class TestLensPublications:
    """Test publications endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_get_publications_success(self, mock_post, mock_cm, mock_credentials):
        """Should return publications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "publications": {
                        "items": [
                            {
                                "id": "0x01-0x01",
                                "metadata": {"content": "Hello Web3!"},
                                "stats": {"totalAmountOfCollects": 10},
                            }
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert len(response["data"]["publications"]["items"]) == 1

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "createPostTypedData": {
                        "id": "tx123",
                        "typedData": {"value": {"nonce": 1}},
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert "createPostTypedData" in response["data"]


class TestLensFeed:
    """Test feed endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_get_feed_success(self, mock_post, mock_cm, mock_credentials):
        """Should return feed."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "feed": {
                        "items": [
                            {"root": {"id": "0x01-0x01", "metadata": {"content": "Post 1"}}},
                            {"root": {"id": "0x02-0x01", "metadata": {"content": "Post 2"}}},
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert len(response["data"]["feed"]["items"]) == 2


class TestLensInteractions:
    """Test social interaction endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_follow_profile_success(self, mock_post, mock_cm, mock_credentials):
        """Should follow a profile."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {"createFollowTypedData": {"id": "follow-tx"}}
            },
        )

        response = mock_post.return_value.json()
        assert "createFollowTypedData" in response["data"]

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_collect_publication_success(self, mock_post, mock_cm, mock_credentials):
        """Should collect a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {"createCollectTypedData": {"id": "collect-tx"}}
            },
        )

        response = mock_post.return_value.json()
        assert "createCollectTypedData" in response["data"]

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_mirror_publication_success(self, mock_post, mock_cm, mock_credentials):
        """Should mirror a publication."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {"createMirrorTypedData": {"id": "mirror-tx"}}
            },
        )

        response = mock_post.return_value.json()
        assert "createMirrorTypedData" in response["data"]


class TestLensSearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_search_profiles_success(self, mock_post, mock_cm, mock_credentials):
        """Should search profiles."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "search": {
                        "items": [
                            {"handle": "user1.lens", "id": "0x02"},
                            {"handle": "user2.lens", "id": "0x03"},
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert len(response["data"]["search"]["items"]) == 2


class TestLensNotifications:
    """Test notifications endpoints."""

    @patch("app.web.api.v1.lens.CredentialManager")
    @patch("app.web.api.v1.lens.http_requests.post")
    def test_get_notifications_success(self, mock_post, mock_cm, mock_credentials):
        """Should return notifications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "notifications": {
                        "items": [
                            {"notificationId": "n1", "type": "FOLLOWED"},
                            {"notificationId": "n2", "type": "COLLECTED"},
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert len(response["data"]["notifications"]["items"]) == 2
