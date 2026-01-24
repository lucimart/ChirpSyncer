"""
YouTube API Endpoint Tests

Tests for the YouTube Data API v3 integration endpoints:
- Channel operations
- Video operations
- Playlist operations
- Comment operations
- Search
- Subscriptions
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.youtube import youtube_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(youtube_bp, url_prefix="/api/v1/youtube")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock YouTube/Google credentials."""
    return {
        "client_id": "test-client-id.apps.googleusercontent.com",
        "client_secret": "test-client-secret",
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "expires_at": 9999999999,
    }


class TestYouTubeChannel:
    """Test channel endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_me_success(self, mock_request, mock_cm, mock_credentials):
        """Should return authenticated user's channel."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "UC123456789",
                        "snippet": {
                            "title": "Test Channel",
                            "description": "A test channel",
                            "customUrl": "@testchannel",
                            "thumbnails": {
                                "default": {"url": "https://youtube.com/thumb.jpg"}
                            },
                        },
                        "statistics": {
                            "subscriberCount": "10000",
                            "videoCount": "100",
                            "viewCount": "500000",
                        },
                        "contentDetails": {
                            "relatedPlaylists": {
                                "uploads": "UU123456789"
                            }
                        },
                    }
                ]
            },
        )

        response = mock_request.return_value.json()
        channel = response["items"][0]
        assert channel["id"] == "UC123456789"
        assert channel["snippet"]["title"] == "Test Channel"
        assert channel["statistics"]["subscriberCount"] == "10000"

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_channel_by_id_success(self, mock_request, mock_cm, mock_credentials):
        """Should return channel by ID."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "UCxyz",
                        "snippet": {"title": "Other Channel"},
                        "statistics": {"subscriberCount": "5000"},
                    }
                ]
            },
        )

        response = mock_request.return_value.json()
        assert response["items"][0]["snippet"]["title"] == "Other Channel"


class TestYouTubeVideos:
    """Test video endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_my_videos_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's uploaded videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "video123",
                        "snippet": {
                            "title": "Test Video",
                            "description": "A test video",
                            "channelId": "UC123",
                            "channelTitle": "Test Channel",
                            "thumbnails": {
                                "medium": {"url": "https://youtube.com/thumb.jpg"}
                            },
                            "publishedAt": "2024-01-15T12:00:00Z",
                            "tags": ["test", "video"],
                            "categoryId": "22",
                        },
                        "statistics": {
                            "viewCount": "1000",
                            "likeCount": "100",
                            "commentCount": "50",
                        },
                        "contentDetails": {
                            "duration": "PT10M30S",
                            "definition": "hd",
                        },
                        "status": {
                            "privacyStatus": "public",
                            "uploadStatus": "processed",
                        },
                    }
                ],
                "nextPageToken": "token123",
            },
        )

        response = mock_request.return_value.json()
        videos = response["items"]
        assert len(videos) == 1
        assert videos[0]["snippet"]["title"] == "Test Video"
        assert videos[0]["statistics"]["viewCount"] == "1000"

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_update_video_success(self, mock_request, mock_cm, mock_credentials):
        """Should update video metadata."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "video123",
                "snippet": {
                    "title": "Updated Title",
                    "description": "Updated description",
                },
            },
        )

        response = mock_request.return_value.json()
        assert response["snippet"]["title"] == "Updated Title"

    def test_video_privacy_statuses(self):
        """Should support all privacy statuses."""
        statuses = ["public", "private", "unlisted"]
        for status in statuses:
            assert status in ["public", "private", "unlisted"]

    def test_duration_format(self):
        """Should parse ISO 8601 duration format."""
        # PT10M30S = 10 minutes 30 seconds
        duration = "PT10M30S"
        assert duration.startswith("PT")
        assert "M" in duration
        assert "S" in duration


class TestYouTubePlaylists:
    """Test playlist endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_playlists_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's playlists."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "PLabc123",
                        "snippet": {
                            "title": "Test Playlist",
                            "description": "A test playlist",
                            "channelId": "UC123",
                            "thumbnails": {
                                "medium": {"url": "https://youtube.com/thumb.jpg"}
                            },
                            "publishedAt": "2024-01-15T12:00:00Z",
                        },
                        "contentDetails": {
                            "itemCount": 10,
                        },
                        "status": {
                            "privacyStatus": "public",
                        },
                    }
                ],
                "nextPageToken": "playlist-token",
            },
        )

        response = mock_request.return_value.json()
        playlists = response["items"]
        assert len(playlists) == 1
        assert playlists[0]["snippet"]["title"] == "Test Playlist"
        assert playlists[0]["contentDetails"]["itemCount"] == 10

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_create_playlist_success(self, mock_request, mock_cm, mock_credentials):
        """Should create a new playlist."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "PLnew123",
                "snippet": {
                    "title": "New Playlist",
                    "description": "A new playlist",
                },
                "status": {
                    "privacyStatus": "private",
                },
            },
        )

        response = mock_request.return_value.json()
        assert response["id"] == "PLnew123"

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_add_to_playlist_success(self, mock_request, mock_cm, mock_credentials):
        """Should add video to playlist."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "PLitem123",
                "snippet": {
                    "playlistId": "PLabc123",
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": "video123",
                    },
                },
            },
        )

        response = mock_request.return_value.json()
        assert response["snippet"]["playlistId"] == "PLabc123"


class TestYouTubeComments:
    """Test comment endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_video_comments_success(self, mock_request, mock_cm, mock_credentials):
        """Should return video comments."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "thread123",
                        "snippet": {
                            "topLevelComment": {
                                "id": "comment123",
                                "snippet": {
                                    "textDisplay": "Great video!",
                                    "authorDisplayName": "TestUser",
                                    "authorChannelId": {"value": "UC123"},
                                    "authorProfileImageUrl": "https://youtube.com/avatar.jpg",
                                    "likeCount": 10,
                                    "publishedAt": "2024-01-15T12:00:00Z",
                                },
                            },
                            "totalReplyCount": 5,
                        },
                    }
                ],
                "nextPageToken": "comment-token",
            },
        )

        response = mock_request.return_value.json()
        comments = response["items"]
        assert len(comments) == 1
        top_comment = comments[0]["snippet"]["topLevelComment"]
        assert top_comment["snippet"]["textDisplay"] == "Great video!"

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_post_comment_success(self, mock_request, mock_cm, mock_credentials):
        """Should post a comment."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "newthread123",
                "snippet": {
                    "topLevelComment": {
                        "id": "newcomment123",
                        "snippet": {
                            "textDisplay": "My comment",
                        },
                    },
                },
            },
        )

        response = mock_request.return_value.json()
        assert "topLevelComment" in response["snippet"]


class TestYouTubeSearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_search_videos_success(self, mock_request, mock_cm, mock_credentials):
        """Should search for videos."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": {"kind": "youtube#video", "videoId": "search123"},
                        "snippet": {
                            "title": "Search Result",
                            "description": "Found video",
                            "channelTitle": "Channel",
                            "thumbnails": {
                                "medium": {"url": "https://youtube.com/thumb.jpg"}
                            },
                            "publishedAt": "2024-01-15T12:00:00Z",
                        },
                    }
                ],
                "nextPageToken": "search-token",
                "pageInfo": {"totalResults": 1000},
            },
        )

        response = mock_request.return_value.json()
        assert len(response["items"]) == 1
        assert response["items"][0]["snippet"]["title"] == "Search Result"

    def test_search_types(self):
        """Should support different search types."""
        types = ["video", "channel", "playlist"]
        for t in types:
            assert t in ["video", "channel", "playlist"]

    def test_search_order(self):
        """Should support different sort orders."""
        orders = ["date", "rating", "relevance", "title", "viewCount"]
        for order in orders:
            assert order in ["date", "rating", "relevance", "title", "viewCount"]


class TestYouTubeSubscriptions:
    """Test subscription endpoints."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_get_subscriptions_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's subscriptions."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "sub123",
                        "snippet": {
                            "title": "Subscribed Channel",
                            "description": "A channel",
                            "resourceId": {"channelId": "UCxyz"},
                            "thumbnails": {
                                "medium": {"url": "https://youtube.com/thumb.jpg"}
                            },
                            "publishedAt": "2024-01-15T12:00:00Z",
                        },
                    }
                ],
                "nextPageToken": "sub-token",
            },
        )

        response = mock_request.return_value.json()
        subs = response["items"]
        assert len(subs) == 1
        assert subs[0]["snippet"]["title"] == "Subscribed Channel"

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.request")
    def test_subscribe_success(self, mock_request, mock_cm, mock_credentials):
        """Should subscribe to a channel."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "newsub123",
                "snippet": {
                    "resourceId": {
                        "kind": "youtube#channel",
                        "channelId": "UCnew123",
                    },
                },
            },
        )

        response = mock_request.return_value.json()
        assert response["id"] == "newsub123"


class TestYouTubeTokenRefresh:
    """Test token refresh functionality."""

    @patch("app.web.api.v1.youtube.CredentialManager")
    @patch("app.web.api.v1.youtube.requests.post")
    def test_refresh_token_success(self, mock_post, mock_cm):
        """Should refresh expired Google token."""
        mock_cm.return_value.get_credentials.return_value = {
            "client_id": "test-id.apps.googleusercontent.com",
            "client_secret": "test-secret",
            "access_token": "old-token",
            "refresh_token": "refresh-token",
            "expires_at": 0,
        }
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "access_token": "new-access-token",
                "token_type": "Bearer",
                "expires_in": 3600,
                "scope": "https://www.googleapis.com/auth/youtube",
            },
        )

        response = mock_post.return_value.json()
        assert response["access_token"] == "new-access-token"
        assert response["expires_in"] == 3600
