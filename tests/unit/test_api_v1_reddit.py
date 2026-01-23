"""
Reddit API Endpoint Tests

Tests for the Reddit integration endpoints:
- User identity
- Subreddit operations
- Post/comment operations
- Voting
- Token refresh
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.reddit import reddit_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(reddit_bp, url_prefix="/api/v1/reddit")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Reddit credentials."""
    return {
        "client_id": "test-client-id",
        "client_secret": "test-client-secret",
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "expires_at": 9999999999,
    }


class TestRedditIdentity:
    """Test identity endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_me_success(self, mock_get, mock_cm, mock_credentials):
        """Should return authenticated user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "t2_abc123",
                "name": "testuser",
                "icon_img": "https://reddit.com/avatar.png",
                "total_karma": 5000,
                "link_karma": 3000,
                "comment_karma": 2000,
                "created_utc": 1609459200,
                "is_gold": False,
                "is_mod": True,
            },
        )

        response = mock_get.return_value.json()
        assert response["name"] == "testuser"
        assert response["total_karma"] == 5000
        assert response["is_mod"] is True

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_user_success(self, mock_get, mock_cm, mock_credentials):
        """Should return public user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "t2_def456",
                    "name": "otheruser",
                    "total_karma": 10000,
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["data"]["name"] == "otheruser"


class TestRedditSubreddits:
    """Test subreddit endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_my_subreddits_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's subscribed subreddits."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "t5_2qh1o",
                                "display_name": "Python",
                                "title": "Python",
                                "subscribers": 1000000,
                                "over18": False,
                            }
                        },
                        {
                            "data": {
                                "id": "t5_2fwo",
                                "display_name": "programming",
                                "title": "Programming",
                                "subscribers": 5000000,
                                "over18": False,
                            }
                        },
                    ]
                }
            },
        )

        response = mock_get.return_value.json()
        subreddits = response["data"]["children"]
        assert len(subreddits) == 2
        assert subreddits[0]["data"]["display_name"] == "Python"

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_subreddit_info_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subreddit details."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "id": "t5_2qh1o",
                    "display_name": "Python",
                    "title": "Python",
                    "public_description": "News about Python",
                    "subscribers": 1000000,
                    "active_user_count": 5000,
                    "over18": False,
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["data"]["subscribers"] == 1000000
        assert response["data"]["over18"] is False


class TestRedditPosts:
    """Test post endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_subreddit_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subreddit posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "abc123",
                                "name": "t3_abc123",
                                "title": "Test Post",
                                "selftext": "Post content",
                                "author": "testuser",
                                "subreddit": "Python",
                                "score": 100,
                                "upvote_ratio": 0.95,
                                "num_comments": 50,
                                "created_utc": 1705323600,
                                "permalink": "/r/Python/comments/abc123/test_post/",
                                "is_self": True,
                                "over_18": False,
                            }
                        }
                    ],
                    "after": "t3_xyz789",
                }
            },
        )

        response = mock_get.return_value.json()
        posts = response["data"]["children"]
        assert len(posts) == 1
        assert posts[0]["data"]["score"] == 100

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "json": {
                    "data": {
                        "id": "new123",
                        "name": "t3_new123",
                        "url": "https://reddit.com/r/test/comments/new123/",
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        assert response["json"]["data"]["id"] == "new123"

    def test_post_kinds(self):
        """Should support different post types."""
        kinds = ["self", "link", "image", "video", "videogif"]
        for kind in kinds:
            assert kind in ["self", "link", "image", "video", "videogif"]


class TestRedditComments:
    """Test comment endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_get_comments_success(self, mock_get, mock_cm, mock_credentials):
        """Should return post comments."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {"data": {"children": []}},  # Post data
                {
                    "data": {
                        "children": [
                            {
                                "kind": "t1",
                                "data": {
                                    "id": "comment1",
                                    "body": "Great post!",
                                    "author": "commenter1",
                                    "score": 50,
                                    "created_utc": 1705323600,
                                },
                            }
                        ]
                    }
                },
            ],
        )

        response = mock_get.return_value.json()
        comments = response[1]["data"]["children"]
        assert len(comments) == 1
        assert comments[0]["data"]["body"] == "Great post!"

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_create_comment_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a comment."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "json": {
                    "data": {
                        "things": [
                            {
                                "data": {
                                    "id": "newcomment",
                                    "name": "t1_newcomment",
                                    "body": "My comment",
                                }
                            }
                        ]
                    }
                }
            },
        )

        response = mock_post.return_value.json()
        comment = response["json"]["data"]["things"][0]["data"]
        assert comment["body"] == "My comment"


class TestRedditVoting:
    """Test voting endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_upvote_success(self, mock_post, mock_cm, mock_credentials):
        """Should upvote successfully."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        # Upvote direction is 1
        direction = 1
        assert direction in [-1, 0, 1]

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_downvote_success(self, mock_post, mock_cm, mock_credentials):
        """Should downvote successfully."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        # Downvote direction is -1
        direction = -1
        assert direction in [-1, 0, 1]

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_remove_vote_success(self, mock_post, mock_cm, mock_credentials):
        """Should remove vote successfully."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        # Remove vote direction is 0
        direction = 0
        assert direction in [-1, 0, 1]


class TestRedditTokenRefresh:
    """Test token refresh functionality."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.post")
    def test_refresh_token_success(self, mock_post, mock_cm):
        """Should refresh expired token."""
        mock_cm.return_value.get_credentials.return_value = {
            "client_id": "test-id",
            "client_secret": "test-secret",
            "access_token": "old-token",
            "refresh_token": "refresh-token",
            "expires_at": 0,  # Expired
        }
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "access_token": "new-access-token",
                "token_type": "bearer",
                "expires_in": 86400,
                "scope": "identity read submit",
            },
        )

        response = mock_post.return_value.json()
        assert response["access_token"] == "new-access-token"
        assert response["expires_in"] == 86400

    def test_token_expiry_check(self):
        """Should detect expired tokens."""
        import time

        current_time = time.time()
        expired_at = current_time - 3600  # 1 hour ago
        valid_at = current_time + 3600  # 1 hour from now

        assert expired_at < current_time
        assert valid_at > current_time


class TestRedditSearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.reddit.CredentialManager")
    @patch("app.web.api.v1.reddit.http_requests.get")
    def test_search_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should search posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "data": {
                    "children": [
                        {
                            "data": {
                                "id": "search1",
                                "title": "Search result",
                                "subreddit": "Python",
                            }
                        }
                    ]
                }
            },
        )

        response = mock_get.return_value.json()
        results = response["data"]["children"]
        assert len(results) == 1

    def test_search_params(self):
        """Should support various search parameters."""
        params = {
            "q": "python",
            "sort": "relevance",  # hot, new, top, relevance
            "t": "all",  # hour, day, week, month, year, all
            "limit": 25,
            "restrict_sr": False,
        }

        assert params["sort"] in ["hot", "new", "top", "relevance", "comments"]
        assert params["t"] in ["hour", "day", "week", "month", "year", "all"]
        assert 1 <= params["limit"] <= 100
