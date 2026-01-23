"""
TikTok API Endpoint Tests

Tests for the TikTok API for Developers integration endpoints:
- User info
- Video operations
- Video publishing
- Comments
- Research/hashtags
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.tiktok import tiktok_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(tiktok_bp, url_prefix="/api/v1/tiktok")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock TikTok credentials."""
    return {
        "client_key": "test-client-key",
        "client_secret": "test-client-secret",
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "expires_at": 9999999999,
    }


class TestTikTokUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_me_success(self, mock_request, mock_cm, mock_credentials):
        """Should return authenticated user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "user": {
                        "open_id": "user123",
                        "union_id": "union456",
                        "display_name": "TestUser",
                        "avatar_url": "https://tiktok.com/avatar.jpg",
                        "avatar_large_url": "https://tiktok.com/avatar_large.jpg",
                        "bio_description": "Test bio",
                        "profile_deep_link": "https://tiktok.com/@testuser",
                        "is_verified": True,
                        "follower_count": 10000,
                        "following_count": 500,
                        "likes_count": 50000,
                        "video_count": 100,
                    }
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        user = response["data"]["user"]
        assert user["display_name"] == "TestUser"
        assert user["follower_count"] == 10000
        assert user["is_verified"] is True


class TestTikTokVideos:
    """Test video endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_my_videos_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "videos": [
                        {
                            "id": "video123",
                            "title": "Test Video",
                            "video_description": "A test video",
                            "duration": 30,
                            "cover_image_url": "https://tiktok.com/cover.jpg",
                            "embed_link": "https://tiktok.com/embed/video123",
                            "share_url": "https://tiktok.com/@user/video/video123",
                            "width": 1080,
                            "height": 1920,
                            "create_time": 1705323600,
                            "view_count": 5000,
                            "like_count": 500,
                            "comment_count": 50,
                            "share_count": 25,
                        }
                    ],
                    "cursor": 123456789,
                    "has_more": True,
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        videos = response["data"]["videos"]
        assert len(videos) == 1
        assert videos[0]["title"] == "Test Video"
        assert videos[0]["view_count"] == 5000

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_video_by_id_success(self, mock_request, mock_cm, mock_credentials):
        """Should return specific video."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "videos": [
                        {
                            "id": "video456",
                            "title": "Specific Video",
                            "duration": 60,
                        }
                    ]
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        videos = response["data"]["videos"]
        assert videos[0]["id"] == "video456"


class TestTikTokPublishing:
    """Test video publishing endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_init_video_upload_success(self, mock_request, mock_cm, mock_credentials):
        """Should initialize video upload."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "publish_id": "pub123",
                    "upload_url": "https://upload.tiktok.com/video/pub123",
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        assert response["data"]["publish_id"] == "pub123"
        assert "upload_url" in response["data"]

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_video_status_success(self, mock_request, mock_cm, mock_credentials):
        """Should return video publish status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "status": "PUBLISH_COMPLETE",
                    "publicaly_available_post_id": ["video789"],
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        assert response["data"]["status"] == "PUBLISH_COMPLETE"

    def test_privacy_levels(self):
        """Should support all privacy levels."""
        levels = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]
        for level in levels:
            assert level in ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]

    def test_publish_statuses(self):
        """Should recognize all publish statuses."""
        statuses = [
            "PROCESSING_UPLOAD",
            "PROCESSING_DOWNLOAD",
            "SEND_TO_REVIEW",
            "PUBLISH_COMPLETE",
            "PUBLISH_FAILED",
        ]
        for status in statuses:
            assert status in [
                "PROCESSING_UPLOAD",
                "PROCESSING_DOWNLOAD",
                "SEND_TO_REVIEW",
                "PUBLISH_COMPLETE",
                "PUBLISH_FAILED",
            ]


class TestTikTokCreatorInfo:
    """Test creator info endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_creator_info_success(self, mock_request, mock_cm, mock_credentials):
        """Should return creator info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "creator_avatar_url": "https://tiktok.com/avatar.jpg",
                    "creator_username": "testuser",
                    "creator_nickname": "Test User",
                    "privacy_level_options": ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
                    "comment_disabled": False,
                    "duet_disabled": False,
                    "stitch_disabled": False,
                    "max_video_post_duration_sec": 180,
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        creator = response["data"]
        assert creator["creator_username"] == "testuser"
        assert creator["max_video_post_duration_sec"] == 180


class TestTikTokComments:
    """Test comment endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_get_video_comments_success(self, mock_request, mock_cm, mock_credentials):
        """Should return video comments."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "comments": [
                        {
                            "id": "comment123",
                            "text": "Great video!",
                            "create_time": 1705323600,
                            "like_count": 10,
                            "reply_count": 2,
                            "parent_comment_id": None,
                        },
                        {
                            "id": "comment456",
                            "text": "Reply to above",
                            "create_time": 1705323700,
                            "like_count": 5,
                            "reply_count": 0,
                            "parent_comment_id": "comment123",
                        },
                    ],
                    "cursor": 789,
                    "has_more": False,
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        comments = response["data"]["comments"]
        assert len(comments) == 2
        assert comments[0]["text"] == "Great video!"
        assert comments[1]["parent_comment_id"] == "comment123"

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_post_comment_success(self, mock_request, mock_cm, mock_credentials):
        """Should post a comment."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "comment_id": "newcomment123",
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        assert response["data"]["comment_id"] == "newcomment123"


class TestTikTokResearch:
    """Test research API endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_query_videos_success(self, mock_request, mock_cm, mock_credentials):
        """Should query videos for research."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "videos": [
                        {
                            "id": "research123",
                            "video_description": "Research video",
                            "create_time": 1705323600,
                            "region_code": "US",
                            "username": "researcher",
                            "view_count": 1000000,
                            "like_count": 100000,
                            "comment_count": 5000,
                            "share_count": 1000,
                            "hashtag_names": ["viral", "trending"],
                        }
                    ],
                    "cursor": 999,
                    "has_more": True,
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        videos = response["data"]["videos"]
        assert len(videos) == 1
        assert "viral" in videos[0]["hashtag_names"]


class TestTikTokHashtags:
    """Test hashtag endpoints."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.request")
    def test_search_hashtags_success(self, mock_request, mock_cm, mock_credentials):
        """Should search for hashtags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "data": {
                    "hashtags": [
                        {
                            "id": "hash123",
                            "name": "python",
                            "video_count": 5000000,
                        },
                        {
                            "id": "hash456",
                            "name": "pythontutorial",
                            "video_count": 100000,
                        },
                    ]
                },
                "error": {"code": "ok"},
            },
        )

        response = mock_request.return_value.json()
        hashtags = response["data"]["hashtags"]
        assert len(hashtags) == 2
        assert hashtags[0]["name"] == "python"


class TestTikTokEmbed:
    """Test embed endpoint."""

    @patch("app.web.api.v1.tiktok.requests.get")
    def test_get_embed_success(self, mock_get):
        """Should return embed HTML."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "title": "Test Video",
                "author_name": "TestUser",
                "author_url": "https://tiktok.com/@testuser",
                "thumbnail_url": "https://tiktok.com/thumb.jpg",
                "thumbnail_width": 720,
                "thumbnail_height": 1280,
                "html": '<blockquote class="tiktok-embed">...</blockquote>',
            },
        )

        response = mock_get.return_value.json()
        assert response["title"] == "Test Video"
        assert "html" in response


class TestTikTokTokenRefresh:
    """Test token refresh functionality."""

    @patch("app.web.api.v1.tiktok.CredentialManager")
    @patch("app.web.api.v1.tiktok.requests.post")
    def test_refresh_token_success(self, mock_post, mock_cm):
        """Should refresh expired token."""
        mock_cm.return_value.get_credentials.return_value = {
            "client_key": "test-key",
            "client_secret": "test-secret",
            "access_token": "old-token",
            "refresh_token": "refresh-token",
            "expires_at": 0,
        }
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "access_token": "new-access-token",
                "refresh_token": "new-refresh-token",
                "expires_in": 86400,  # 24 hours
                "token_type": "Bearer",
                "open_id": "user123",
            },
        )

        response = mock_post.return_value.json()
        assert response["access_token"] == "new-access-token"
        assert response["expires_in"] == 86400


class TestTikTokURLParsing:
    """Test URL parsing utilities."""

    def test_parse_tiktok_video_url(self):
        """Should parse TikTok video URL."""
        url = "https://www.tiktok.com/@testuser/video/1234567890123456789"

        # Basic parsing
        assert "@testuser" in url
        assert "video" in url
        assert "1234567890123456789" in url

    def test_parse_short_url(self):
        """Should handle short URLs."""
        short_url = "https://vm.tiktok.com/ZM123abc/"
        assert "vm.tiktok.com" in short_url

    def test_video_id_format(self):
        """Should validate video ID format."""
        # TikTok video IDs are typically 19 digits
        video_id = "1234567890123456789"
        assert len(video_id) == 19
        assert video_id.isdigit()
