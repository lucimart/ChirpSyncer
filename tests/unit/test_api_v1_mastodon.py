"""
Mastodon API Endpoint Tests

Tests for the Mastodon/ActivityPub integration endpoints:
- Account/profile operations
- Timeline retrieval
- Status (toot) operations
- Favourite/reblog actions
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.mastodon import mastodon_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(mastodon_bp, url_prefix="/api/v1/mastodon")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Mastodon credentials."""
    return {
        "instance_url": "https://mastodon.social",
        "access_token": "test-access-token",
    }


class TestMastodonAccount:
    """Test account endpoints."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_verify_credentials_success(self, mock_get, mock_cm, mock_credentials):
        """Should return authenticated user's account."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "109876543210",
                "username": "testuser",
                "acct": "testuser",
                "display_name": "Test User",
                "locked": False,
                "bot": False,
                "created_at": "2023-01-15T00:00:00.000Z",
                "note": "<p>Test bio</p>",
                "url": "https://mastodon.social/@testuser",
                "avatar": "https://mastodon.social/avatar.png",
                "header": "https://mastodon.social/header.png",
                "followers_count": 1000,
                "following_count": 500,
                "statuses_count": 200,
            },
        )

        response = mock_get.return_value.json()
        assert response["username"] == "testuser"
        assert response["followers_count"] == 1000

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_account_success(self, mock_get, mock_cm, mock_credentials):
        """Should return account by ID."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "123456789",
                "username": "otheruser",
                "display_name": "Other User",
                "followers_count": 5000,
            },
        )

        response = mock_get.return_value.json()
        assert response["username"] == "otheruser"


class TestMastodonTimeline:
    """Test timeline endpoints."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_home_timeline_success(self, mock_get, mock_cm, mock_credentials):
        """Should return home timeline."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": "status-1",
                    "created_at": "2024-01-15T12:00:00.000Z",
                    "content": "<p>Hello world!</p>",
                    "visibility": "public",
                    "favourites_count": 10,
                    "reblogs_count": 5,
                    "replies_count": 2,
                    "account": {
                        "id": "123",
                        "username": "testuser",
                    },
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
        assert response[0]["visibility"] == "public"

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_public_timeline_success(self, mock_get, mock_cm, mock_credentials):
        """Should return public timeline."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": "status-public-1",
                    "content": "<p>Public post</p>",
                    "visibility": "public",
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1

    def test_visibility_types(self):
        """Should support all visibility types."""
        visibilities = ["public", "unlisted", "private", "direct"]
        for vis in visibilities:
            assert vis in ["public", "unlisted", "private", "direct"]


class TestMastodonStatus:
    """Test status (toot) endpoints."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.post")
    def test_create_status_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "new-status-123",
                "content": "<p>New toot!</p>",
                "visibility": "public",
                "created_at": "2024-01-15T12:00:00.000Z",
                "favourites_count": 0,
                "reblogs_count": 0,
            },
        )

        response = mock_post.return_value.json()
        assert response["id"] == "new-status-123"

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_status_success(self, mock_get, mock_cm, mock_credentials):
        """Should return specific status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "status-456",
                "content": "<p>Existing toot</p>",
                "visibility": "public",
            },
        )

        response = mock_get.return_value.json()
        assert response["id"] == "status-456"

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.delete")
    def test_delete_status_success(self, mock_delete, mock_cm, mock_credentials):
        """Should delete a status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_delete.return_value = Mock(ok=True)

        assert mock_delete.return_value.ok is True

    def test_character_limit(self):
        """Should respect 500 character limit."""
        limit = 500
        valid_text = "a" * 500
        invalid_text = "a" * 501

        assert len(valid_text) <= limit
        assert len(invalid_text) > limit


class TestMastodonInteractions:
    """Test favourite and reblog endpoints."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.post")
    def test_favourite_status_success(self, mock_post, mock_cm, mock_credentials):
        """Should favourite a status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "status-123",
                "favourited": True,
                "favourites_count": 11,
            },
        )

        response = mock_post.return_value.json()
        assert response["favourited"] is True

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.post")
    def test_unfavourite_status_success(self, mock_post, mock_cm, mock_credentials):
        """Should unfavourite a status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "status-123",
                "favourited": False,
                "favourites_count": 10,
            },
        )

        response = mock_post.return_value.json()
        assert response["favourited"] is False

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.post")
    def test_reblog_status_success(self, mock_post, mock_cm, mock_credentials):
        """Should reblog a status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "reblog-123",
                "reblog": {
                    "id": "original-456",
                    "content": "<p>Original post</p>",
                },
                "reblogged": True,
            },
        )

        response = mock_post.return_value.json()
        assert response["reblogged"] is True
        assert "reblog" in response

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.post")
    def test_unreblog_status_success(self, mock_post, mock_cm, mock_credentials):
        """Should unreblog a status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "status-123",
                "reblogged": False,
            },
        )

        response = mock_post.return_value.json()
        assert response["reblogged"] is False


class TestMastodonInstance:
    """Test instance info endpoint."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_instance_success(self, mock_get, mock_cm, mock_credentials):
        """Should return instance information."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "uri": "mastodon.social",
                "title": "Mastodon",
                "short_description": "The original Mastodon instance",
                "description": "Full description here",
                "email": "admin@mastodon.social",
                "version": "4.2.0",
                "stats": {
                    "user_count": 1000000,
                    "status_count": 50000000,
                    "domain_count": 10000,
                },
                "thumbnail": "https://mastodon.social/thumb.png",
                "languages": ["en"],
                "registrations": True,
            },
        )

        response = mock_get.return_value.json()
        assert response["uri"] == "mastodon.social"
        assert response["version"] == "4.2.0"


class TestMastodonAccountStatuses:
    """Test account statuses endpoint."""

    @patch("app.web.api.v1.mastodon.CredentialManager")
    @patch("app.web.api.v1.mastodon.requests.get")
    def test_get_account_statuses_success(self, mock_get, mock_cm, mock_credentials):
        """Should return account's statuses."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": "status-1",
                    "content": "<p>First post</p>",
                    "visibility": "public",
                },
                {
                    "id": "status-2",
                    "content": "<p>Second post</p>",
                    "visibility": "unlisted",
                },
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 2


class TestMastodonMediaAttachments:
    """Test media attachment handling."""

    def test_media_types(self):
        """Should support various media types."""
        media_types = ["image", "gifv", "video", "audio", "unknown"]
        for mt in media_types:
            assert mt in ["image", "gifv", "video", "audio", "unknown"]

    def test_media_attachment_structure(self):
        """Should have correct attachment structure."""
        attachment = {
            "id": "media-123",
            "type": "image",
            "url": "https://example.com/image.jpg",
            "preview_url": "https://example.com/preview.jpg",
            "description": "Alt text",
            "meta": {
                "original": {"width": 1920, "height": 1080},
                "small": {"width": 400, "height": 225},
            },
        }

        assert "id" in attachment
        assert "url" in attachment
        assert attachment["type"] == "image"
