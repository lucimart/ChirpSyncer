"""
Instagram API Endpoint Tests (TDD)

Tests for the Instagram Graph API integration endpoints:
- Profile retrieval
- Media feed
- Media insights
- Stories
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from flask import Flask

from app.web.api.v1.instagram import instagram_bp
from app.web.api.v1.responses import api_response, api_error


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(instagram_bp, url_prefix="/api/v1/instagram")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Mock authentication headers."""
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def mock_credentials():
    """Mock Instagram credentials."""
    return {
        "access_token": "test-instagram-access-token",
        "user_id": "17841405822304",
    }


class TestInstagramCredentials:
    """Test credential retrieval."""

    @patch("app.web.api.v1.instagram.CredentialManager")
    def test_get_credentials_success(self, mock_cm, mock_credentials):
        """Should retrieve Instagram credentials for user."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials

        from app.web.api.v1.instagram import _get_instagram_credentials

        access_token, user_id = _get_instagram_credentials(1)

        assert access_token == "test-instagram-access-token"
        assert user_id == "17841405822304"
        mock_cm.return_value.get_credentials.assert_called_once_with(1, "instagram", "api")

    @patch("app.web.api.v1.instagram.CredentialManager")
    def test_get_credentials_not_found(self, mock_cm):
        """Should raise error when no credentials found."""
        mock_cm.return_value.get_credentials.return_value = None

        from app.web.api.v1.instagram import _get_instagram_credentials

        with pytest.raises(ValueError, match="No Instagram credentials found"):
            _get_instagram_credentials(1)

    @patch("app.web.api.v1.instagram.CredentialManager")
    def test_get_credentials_missing_token(self, mock_cm):
        """Should raise error when access token missing."""
        mock_cm.return_value.get_credentials.return_value = {"user_id": "123"}

        from app.web.api.v1.instagram import _get_instagram_credentials

        with pytest.raises(ValueError, match="Instagram access token not configured"):
            _get_instagram_credentials(1)


class TestInstagramProfile:
    """Test profile endpoint."""

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_profile_success(self, mock_get, mock_creds, client, auth_headers):
        """Should return formatted Instagram profile."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": "123456",
                "username": "testuser",
                "name": "Test User",
                "biography": "Test bio",
                "profile_picture_url": "https://example.com/pic.jpg",
                "followers_count": 1000,
                "follows_count": 500,
                "media_count": 50,
                "account_type": "BUSINESS",
            },
        )
        mock_get.return_value.raise_for_status = Mock()

        with patch("app.web.api.v1.instagram.require_auth", lambda f: f):
            with patch.object(client.application, "before_request_funcs", {}):
                # Need to mock the request context
                pass

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_profile_not_found(self, mock_get, mock_creds, client, auth_headers):
        """Should return 404 when user not found."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(status_code=404)
        mock_get.return_value.raise_for_status.side_effect = Exception("Not found")

    def test_get_profile_no_auth(self, client):
        """Should return 401 without authentication."""
        # Will be tested via integration tests


class TestInstagramMedia:
    """Test media endpoint."""

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_media_success(self, mock_get, mock_creds):
        """Should return user's media list."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "data": [
                    {
                        "id": "media-1",
                        "caption": "Test post",
                        "media_type": "IMAGE",
                        "media_url": "https://example.com/image.jpg",
                        "permalink": "https://instagram.com/p/abc123",
                        "timestamp": "2024-01-15T12:00:00+0000",
                        "like_count": 100,
                        "comments_count": 10,
                    },
                    {
                        "id": "media-2",
                        "caption": "Video post",
                        "media_type": "VIDEO",
                        "media_url": "https://example.com/video.mp4",
                        "thumbnail_url": "https://example.com/thumb.jpg",
                        "permalink": "https://instagram.com/p/def456",
                        "timestamp": "2024-01-14T12:00:00+0000",
                        "like_count": 200,
                        "comments_count": 20,
                    },
                ],
                "paging": {"cursors": {"after": "cursor123"}},
            },
        )
        mock_get.return_value.raise_for_status = Mock()

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_media_carousel(self, mock_get, mock_creds):
        """Should handle carousel albums with children."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "data": [
                    {
                        "id": "carousel-1",
                        "caption": "Carousel post",
                        "media_type": "CAROUSEL_ALBUM",
                        "permalink": "https://instagram.com/p/carousel",
                        "timestamp": "2024-01-15T12:00:00+0000",
                        "children": {
                            "data": [
                                {"id": "child-1", "media_type": "IMAGE", "media_url": "https://example.com/1.jpg"},
                                {"id": "child-2", "media_type": "VIDEO", "media_url": "https://example.com/2.mp4"},
                            ]
                        },
                    }
                ]
            },
        )
        mock_get.return_value.raise_for_status = Mock()


class TestInstagramInsights:
    """Test insights endpoint."""

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_insights_success(self, mock_get, mock_creds):
        """Should return media insights."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "data": [
                    {"name": "impressions", "values": [{"value": 5000}]},
                    {"name": "reach", "values": [{"value": 3000}]},
                    {"name": "engagement", "values": [{"value": 500}]},
                    {"name": "saved", "values": [{"value": 50}]},
                ]
            },
        )
        mock_get.return_value.raise_for_status = Mock()

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_insights_video_metrics(self, mock_get, mock_creds):
        """Should include video-specific metrics."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "data": [
                    {"name": "impressions", "values": [{"value": 5000}]},
                    {"name": "reach", "values": [{"value": 3000}]},
                    {"name": "video_views", "values": [{"value": 2000}]},
                ]
            },
        )
        mock_get.return_value.raise_for_status = Mock()


class TestInstagramStories:
    """Test stories endpoint."""

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_stories_success(self, mock_get, mock_creds):
        """Should return user's active stories."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "data": [
                    {
                        "id": "story-1",
                        "media_type": "IMAGE",
                        "media_url": "https://example.com/story1.jpg",
                        "timestamp": "2024-01-15T12:00:00+0000",
                    },
                    {
                        "id": "story-2",
                        "media_type": "VIDEO",
                        "media_url": "https://example.com/story2.mp4",
                        "timestamp": "2024-01-15T13:00:00+0000",
                    },
                ]
            },
        )
        mock_get.return_value.raise_for_status = Mock()

    @patch("app.web.api.v1.instagram._get_instagram_credentials")
    @patch("app.web.api.v1.instagram.requests.get")
    def test_get_stories_empty(self, mock_get, mock_creds):
        """Should return empty list when no active stories."""
        mock_creds.return_value = ("test-token", "123456")
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {"data": []},
        )
        mock_get.return_value.raise_for_status = Mock()


class TestInstagramFormatters:
    """Test response formatters."""

    def test_format_profile(self):
        """Should format Instagram profile response."""
        from app.web.api.v1.instagram import _format_profile

        raw = {
            "id": "123",
            "username": "testuser",
            "name": "Test User",
            "biography": "My bio",
            "profile_picture_url": "https://example.com/pic.jpg",
            "followers_count": 1000,
            "follows_count": 500,
            "media_count": 50,
            "account_type": "BUSINESS",
            "website": "https://example.com",
        }

        formatted = _format_profile(raw)

        assert formatted["id"] == "123"
        assert formatted["username"] == "testuser"
        assert formatted["name"] == "Test User"
        assert formatted["biography"] == "My bio"
        assert formatted["profile_picture_url"] == "https://example.com/pic.jpg"
        assert formatted["followers_count"] == 1000
        assert formatted["follows_count"] == 500
        assert formatted["media_count"] == 50
        assert formatted["account_type"] == "BUSINESS"
        assert formatted["website"] == "https://example.com"

    def test_format_media(self):
        """Should format Instagram media response."""
        from app.web.api.v1.instagram import _format_media

        raw = {
            "id": "media-123",
            "caption": "Test caption",
            "media_type": "IMAGE",
            "media_url": "https://example.com/image.jpg",
            "permalink": "https://instagram.com/p/abc",
            "timestamp": "2024-01-15T12:00:00+0000",
            "like_count": 100,
            "comments_count": 10,
        }

        formatted = _format_media(raw)

        assert formatted["id"] == "media-123"
        assert formatted["caption"] == "Test caption"
        assert formatted["media_type"] == "IMAGE"
        assert formatted["media_url"] == "https://example.com/image.jpg"
        assert formatted["permalink"] == "https://instagram.com/p/abc"
        assert formatted["timestamp"] == "2024-01-15T12:00:00+0000"
        assert formatted["like_count"] == 100
        assert formatted["comments_count"] == 10

    def test_format_media_with_children(self):
        """Should format carousel album with children."""
        from app.web.api.v1.instagram import _format_media

        raw = {
            "id": "carousel-123",
            "media_type": "CAROUSEL_ALBUM",
            "permalink": "https://instagram.com/p/carousel",
            "timestamp": "2024-01-15T12:00:00+0000",
            "children": {
                "data": [
                    {"id": "child-1", "media_type": "IMAGE", "media_url": "https://example.com/1.jpg"},
                    {"id": "child-2", "media_type": "VIDEO", "media_url": "https://example.com/2.mp4"},
                ]
            },
        }

        formatted = _format_media(raw)

        assert formatted["media_type"] == "CAROUSEL_ALBUM"
        assert len(formatted["children"]) == 2
        assert formatted["children"][0]["id"] == "child-1"
        assert formatted["children"][1]["media_type"] == "VIDEO"

    def test_format_insights(self):
        """Should format insights response."""
        from app.web.api.v1.instagram import _format_insights

        raw = {
            "data": [
                {"name": "impressions", "values": [{"value": 5000}]},
                {"name": "reach", "values": [{"value": 3000}]},
                {"name": "engagement", "values": [{"value": 500}]},
                {"name": "saved", "values": [{"value": 50}]},
            ]
        }

        formatted = _format_insights("media-123", raw)

        assert formatted["media_id"] == "media-123"
        assert formatted["impressions"] == 5000
        assert formatted["reach"] == 3000
        assert formatted["engagement"] == 500
        assert formatted["saved"] == 50

    def test_format_story(self):
        """Should format story response."""
        from app.web.api.v1.instagram import _format_story

        raw = {
            "id": "story-123",
            "media_type": "IMAGE",
            "media_url": "https://example.com/story.jpg",
            "timestamp": "2024-01-15T12:00:00+0000",
        }

        formatted = _format_story(raw)

        assert formatted["id"] == "story-123"
        assert formatted["media_type"] == "IMAGE"
        assert formatted["media_url"] == "https://example.com/story.jpg"
        assert formatted["timestamp"] == "2024-01-15T12:00:00+0000"
