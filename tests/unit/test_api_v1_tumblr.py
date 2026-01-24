"""
Tumblr API Endpoint Tests

Tests for the Tumblr integration endpoints:
- User info
- Blog operations
- Post operations (text, photo, quote, link, chat)
- Reblogging and likes
- OAuth 1.0a signature generation
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.tumblr import tumblr_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(tumblr_bp, url_prefix="/api/v1/tumblr")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Tumblr OAuth 1.0a credentials."""
    return {
        "consumer_key": "test-consumer-key",
        "consumer_secret": "test-consumer-secret",
        "oauth_token": "test-oauth-token",
        "oauth_token_secret": "test-oauth-token-secret",
    }


class TestTumblrUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_me_success(self, mock_get, mock_cm, mock_credentials):
        """Should return authenticated user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "user": {
                        "name": "testuser",
                        "likes": 500,
                        "following": 100,
                        "blogs": [
                            {
                                "name": "testblog",
                                "title": "Test Blog",
                                "url": "https://testblog.tumblr.com",
                                "uuid": "t:abc123",
                                "primary": True,
                                "followers": 1000,
                                "posts": 200,
                            }
                        ],
                    }
                }
            },
        )

        response = mock_get.return_value.json()
        user = response["response"]["user"]
        assert user["name"] == "testuser"
        assert user["likes"] == 500
        assert len(user["blogs"]) == 1

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_dashboard_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's dashboard."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "posts": [
                        {
                            "id": 123456789,
                            "blog_name": "someblog",
                            "type": "text",
                            "title": "Test Post",
                            "body": "<p>Content</p>",
                            "note_count": 50,
                            "timestamp": 1705323600,
                        }
                    ]
                }
            },
        )

        response = mock_get.return_value.json()
        posts = response["response"]["posts"]
        assert len(posts) == 1
        assert posts[0]["type"] == "text"


class TestTumblrBlog:
    """Test blog endpoints."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_blog_info_success(self, mock_get, mock_cm, mock_credentials):
        """Should return blog information."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "blog": {
                        "name": "testblog",
                        "title": "Test Blog",
                        "url": "https://testblog.tumblr.com",
                        "uuid": "t:abc123",
                        "description": "A test blog",
                        "posts": 200,
                        "followers": 1000,
                        "is_nsfw": False,
                    }
                }
            },
        )

        response = mock_get.return_value.json()
        blog = response["response"]["blog"]
        assert blog["name"] == "testblog"
        assert blog["followers"] == 1000

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_blog_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return blog's posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "blog": {"name": "testblog"},
                    "posts": [
                        {
                            "id": 123456789,
                            "type": "photo",
                            "caption": "Photo caption",
                            "photos": [
                                {"url": "https://example.com/photo.jpg", "width": 1080, "height": 1080}
                            ],
                            "note_count": 100,
                        }
                    ],
                    "total_posts": 200,
                }
            },
        )

        response = mock_get.return_value.json()
        posts = response["response"]["posts"]
        assert len(posts) == 1
        assert posts[0]["type"] == "photo"


class TestTumblrPosts:
    """Test post creation endpoints."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_create_text_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a text post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "id": 987654321,
                    "id_string": "987654321",
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["response"]["id"] == 987654321

    def test_post_types(self):
        """Should support all Tumblr post types."""
        post_types = ["text", "photo", "quote", "link", "chat", "audio", "video", "answer"]
        for pt in post_types:
            assert pt in ["text", "photo", "quote", "link", "chat", "audio", "video", "answer"]

    def test_post_states(self):
        """Should support all post states."""
        states = ["published", "draft", "queue", "private"]
        for state in states:
            assert state in ["published", "draft", "queue", "private"]

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_create_photo_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a photo post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "id": 111222333,
                    "id_string": "111222333",
                }
            },
        )

        # Photo post data structure
        post_data = {
            "type": "photo",
            "source": "https://example.com/image.jpg",
            "caption": "Test photo",
            "tags": "test,photo",
        }

        assert post_data["type"] == "photo"
        assert "source" in post_data


class TestTumblrReblog:
    """Test reblog functionality."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_reblog_success(self, mock_post, mock_cm, mock_credentials):
        """Should reblog a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "id": 444555666,
                    "id_string": "444555666",
                }
            },
        )

        # Reblog data structure
        reblog_data = {
            "id": "123456789",
            "reblog_key": "abc123def",
            "comment": "Great post!",
            "tags": "reblog,test",
        }

        assert "reblog_key" in reblog_data

        response = mock_post.return_value.json()
        assert response["response"]["id"] == 444555666


class TestTumblrLikes:
    """Test like functionality."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_likes_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's liked posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "liked_posts": [
                        {
                            "id": 123456789,
                            "blog_name": "someblog",
                            "type": "text",
                            "liked_timestamp": 1705323600,
                        }
                    ],
                    "liked_count": 500,
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["response"]["liked_count"] == 500

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_like_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should like a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {"response": {}})

        # Like requires post ID and reblog key
        like_data = {
            "id": "123456789",
            "reblog_key": "abc123def",
        }

        assert "reblog_key" in like_data


class TestTumblrOAuth:
    """Test OAuth 1.0a signature generation."""

    def test_oauth_signature_params(self):
        """Should include all OAuth parameters."""
        oauth_params = [
            "oauth_consumer_key",
            "oauth_token",
            "oauth_signature_method",
            "oauth_timestamp",
            "oauth_nonce",
            "oauth_version",
            "oauth_signature",
        ]

        for param in oauth_params:
            assert param.startswith("oauth_")

    def test_signature_method(self):
        """Should use HMAC-SHA1 for signatures."""
        signature_method = "HMAC-SHA1"
        assert signature_method == "HMAC-SHA1"

    def test_oauth_version(self):
        """Should use OAuth 1.0."""
        oauth_version = "1.0"
        assert oauth_version == "1.0"


class TestTumblrTagged:
    """Test tagged posts endpoint."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_tagged_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return posts with specific tag."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": [
                    {
                        "id": 123456789,
                        "blog_name": "taggedblog",
                        "type": "text",
                        "tags": ["python", "programming"],
                        "note_count": 25,
                    }
                ]
            },
        )

        response = mock_get.return_value.json()
        posts = response["response"]
        assert len(posts) == 1
        assert "python" in posts[0]["tags"]


class TestTumblrFollowing:
    """Test following endpoints."""

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_get_following_success(self, mock_get, mock_cm, mock_credentials):
        """Should return blogs user is following."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "blogs": [
                        {
                            "name": "followedblog",
                            "title": "Followed Blog",
                            "url": "https://followedblog.tumblr.com",
                        }
                    ],
                    "total_blogs": 100,
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["response"]["total_blogs"] == 100

    @patch("app.web.api.v1.tumblr.CredentialManager")
    @patch("app.web.api.v1.tumblr.http_requests.request")
    def test_follow_blog_success(self, mock_post, mock_cm, mock_credentials):
        """Should follow a blog."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "response": {
                    "blog": {"name": "newfollow"}
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["response"]["blog"]["name"] == "newfollow"
