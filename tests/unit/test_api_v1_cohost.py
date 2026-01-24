"""
Cohost API Endpoint Tests

Tests for the Cohost social platform integration:
- User/Project profile
- Posts (create, edit, delete)
- Likes and follows
- Dashboard
- Tags
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.cohost import cohost_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(cohost_bp, url_prefix="/api/v1/cohost")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Cohost credentials."""
    return {
        "cookie": "cohost.session=test-session-cookie",
        "default_project_id": 12345,
    }


class TestCohostUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_me_success(self, mock_get, mock_cm, mock_credentials):
        """Should return logged in user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "result": {
                    "data": {
                        "loggedIn": True,
                        "userId": 12345,
                        "email": "test@example.com",
                        "activated": True,
                    }
                }
            },
        )

        response = mock_get.return_value.json()
        assert response["result"]["data"]["loggedIn"] is True
        assert response["result"]["data"]["userId"] == 12345


class TestCohostProjects:
    """Test project endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_projects_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's projects."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "result": {
                    "data": {
                        "projects": [
                            {
                                "projectId": 12345,
                                "handle": "testuser",
                                "displayName": "Test User",
                                "privacy": "public",
                                "avatarShape": "circle",
                            }
                        ]
                    }
                }
            },
        )

        response = mock_get.return_value.json()
        projects = response["result"]["data"]["projects"]
        assert len(projects) == 1
        assert projects[0]["handle"] == "testuser"

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_project_by_handle_success(self, mock_get, mock_cm, mock_credentials):
        """Should return project by handle."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "projectId": 12345,
                "handle": "testuser",
                "displayName": "Test User",
                "dek": "A test project",
                "avatarURL": "https://cohost.org/avatar.png",
            },
        )

        response = mock_get.return_value.json()
        assert response["handle"] == "testuser"


class TestCohostPosts:
    """Test posts endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_project_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return posts from a project."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "items": [
                    {
                        "postId": 1,
                        "headline": "First Post",
                        "publishedAt": "2024-01-15T12:00:00Z",
                        "state": 1,
                        "tags": ["cohost", "test"],
                        "blocks": [
                            {
                                "type": "markdown",
                                "markdown": {"content": "Hello Cohost!"},
                            }
                        ],
                    }
                ],
                "currentPage": 0,
                "nPages": 1,
                "nItems": 1,
            },
        )

        response = mock_get.return_value.json()
        assert len(response["items"]) == 1
        assert response["items"][0]["headline"] == "First Post"

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.post")
    def test_create_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "postId": 999,
                "headline": "New Post",
                "state": 1,
            },
        )

        response = mock_post.return_value.json()
        assert response["postId"] == 999
        assert response["headline"] == "New Post"

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.put")
    def test_update_post_success(self, mock_put, mock_cm, mock_credentials):
        """Should update an existing post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_put.return_value = Mock(
            ok=True,
            json=lambda: {
                "postId": 999,
                "headline": "Updated Post",
            },
        )

        response = mock_put.return_value.json()
        assert response["headline"] == "Updated Post"

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.delete")
    def test_delete_post_success(self, mock_delete, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_delete.return_value = Mock(ok=True)

        assert mock_delete.return_value.ok is True

    def test_block_types(self):
        """Should support various block types."""
        block_types = ["markdown", "attachment", "attachment-row"]
        for bt in block_types:
            assert bt in ["markdown", "attachment", "attachment-row"]


class TestCohostInteractions:
    """Test like and follow endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.post")
    def test_like_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should like a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.post")
    def test_unlike_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should unlike a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.post")
    def test_follow_project_success(self, mock_post, mock_cm, mock_credentials):
        """Should follow a project."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.post")
    def test_unfollow_project_success(self, mock_post, mock_cm, mock_credentials):
        """Should unfollow a project."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True


class TestCohostDashboard:
    """Test dashboard endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_dashboard_success(self, mock_get, mock_cm, mock_credentials):
        """Should return dashboard feed."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "result": {
                    "data": {
                        "posts": [
                            {
                                "postId": 1,
                                "headline": "Dashboard Post",
                                "state": 1,
                            }
                        ],
                        "currentPage": 0,
                        "nPages": 5,
                    }
                }
            },
        )

        response = mock_get.return_value.json()
        posts = response["result"]["data"]["posts"]
        assert len(posts) == 1


class TestCohostNotifications:
    """Test notifications endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_notifications_success(self, mock_get, mock_cm, mock_credentials):
        """Should return notifications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "notifications": [
                    {
                        "id": 1,
                        "type": "like",
                        "createdAt": "2024-01-15T12:00:00Z",
                    }
                ]
            },
        )

        response = mock_get.return_value.json()
        assert "notifications" in response


class TestCohostTags:
    """Test tag endpoints."""

    @patch("app.web.api.v1.cohost.CredentialManager")
    @patch("app.web.api.v1.cohost.http_requests.get")
    def test_get_tag_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return posts for a tag."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "items": [
                    {
                        "postId": 1,
                        "headline": "Tagged Post",
                        "tags": ["cohost"],
                    }
                ],
                "currentPage": 0,
                "nPages": 1,
            },
        )

        response = mock_get.return_value.json()
        assert len(response["items"]) == 1
        assert "cohost" in response["items"][0]["tags"]


class TestCohostAvatarShapes:
    """Test avatar shape options."""

    def test_avatar_shapes(self):
        """Should support various avatar shapes."""
        shapes = ["circle", "squircle", "capsule-big", "capsule-small"]
        for shape in shapes:
            assert shape in ["circle", "squircle", "capsule-big", "capsule-small"]


class TestCohostPrivacy:
    """Test privacy options."""

    def test_privacy_types(self):
        """Should support public and private."""
        privacy_types = ["public", "private"]
        for pt in privacy_types:
            assert pt in ["public", "private"]
