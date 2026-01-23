"""Unit tests for Lemmy API endpoints."""

import json
from unittest.mock import Mock, patch

import pytest
from flask import Flask

from app.web.api.v1.lemmy import lemmy_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(lemmy_bp, url_prefix="/api/v1/lemmy")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Lemmy credentials."""
    return {
        "instance_url": "https://lemmy.ml",
        "jwt": "test-jwt-token",
    }


class TestLemmyAPI:
    """Tests for Lemmy API endpoints."""

    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_login(self, mock_post, client):
        """Test login endpoint."""
        mock_post.return_value = Mock(ok=True, json=lambda: {"jwt": "test-jwt-token"})

        response = client.post(
            "/api/v1/lemmy/login",
            json={
                "instance_url": "https://lemmy.ml",
                "username_or_email": "testuser",
                "password": "testpass",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "jwt" in data["data"]

    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post(
            "/api/v1/lemmy/login",
            json={"instance_url": "https://lemmy.ml"},
        )

        assert response.status_code == 400

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_get_site(self, mock_get, mock_cm, client, mock_credentials):
        """Test get site info endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True, json=lambda: {"site_view": {"site": {"name": "Test Lemmy"}}}
        )

        response = client.get(
            "/api/v1/lemmy/site",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_get_user(self, mock_get, mock_cm, client, mock_credentials):
        """Test get user endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "person_view": {
                    "person": {"name": "testuser"},
                    "counts": {"post_count": 10},
                }
            },
        )

        response = client.get(
            "/api/v1/lemmy/user",
            headers={"X-Master-Key": "test-key"},
            query_string={"username": "testuser"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_list_communities(self, mock_get, mock_cm, client, mock_credentials):
        """Test list communities endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "communities": [
                    {"community": {"name": "test", "title": "Test Community"}}
                ]
            },
        )

        response = client.get(
            "/api/v1/lemmy/community/list",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "communities" in data["data"]

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_get_community(self, mock_get, mock_cm, client, mock_credentials):
        """Test get community endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "community_view": {
                    "community": {"name": "test", "title": "Test"},
                    "counts": {"subscribers": 100},
                }
            },
        )

        response = client.get(
            "/api/v1/lemmy/community",
            headers={"X-Master-Key": "test-key"},
            query_string={"name": "test"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_follow_community(self, mock_post, mock_cm, client, mock_credentials):
        """Test follow community endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True, json=lambda: {"community_view": {"community": {"name": "test"}}}
        )

        response = client.post(
            "/api/v1/lemmy/community/follow",
            headers={"X-Master-Key": "test-key"},
            json={"community_id": 1, "follow": True},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_list_posts(self, mock_get, mock_cm, client, mock_credentials):
        """Test list posts endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "posts": [
                    {
                        "post": {"id": 1, "name": "Test Post"},
                        "counts": {"score": 10},
                    }
                ]
            },
        )

        response = client.get(
            "/api/v1/lemmy/post/list",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "posts" in data["data"]

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_get_post(self, mock_get, mock_cm, client, mock_credentials):
        """Test get post endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "post_view": {
                    "post": {"id": 1, "name": "Test Post"},
                    "counts": {"score": 10},
                }
            },
        )

        response = client.get(
            "/api/v1/lemmy/post",
            headers={"X-Master-Key": "test-key"},
            query_string={"id": 1},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_create_post(self, mock_post, mock_cm, client, mock_credentials):
        """Test create post endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"post_view": {"post": {"id": 2, "name": "New Post"}}},
        )

        response = client.post(
            "/api/v1/lemmy/post",
            headers={"X-Master-Key": "test-key"},
            json={"name": "New Post", "community_id": 1},
        )

        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201]
        data = response.get_json()
        assert data["success"] is True

    @patch("app.web.api.v1.lemmy.CredentialManager")
    def test_create_post_missing_fields(self, mock_cm, client, mock_credentials):
        """Test create post with missing fields."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials

        response = client.post(
            "/api/v1/lemmy/post",
            headers={"X-Master-Key": "test-key"},
            json={"community_id": 1},  # Missing name
        )

        assert response.status_code == 400

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.put")
    def test_edit_post(self, mock_put, mock_cm, client, mock_credentials):
        """Test edit post endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_put.return_value = Mock(
            ok=True,
            json=lambda: {"post_view": {"post": {"id": 1, "name": "Updated Post"}}},
        )

        response = client.put(
            "/api/v1/lemmy/post",
            headers={"X-Master-Key": "test-key"},
            json={"post_id": 1, "name": "Updated Post"},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_delete_post(self, mock_post, mock_cm, client, mock_credentials):
        """Test delete post endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"post_view": {"post": {"id": 1, "deleted": True}}},
        )

        response = client.post(
            "/api/v1/lemmy/post/delete",
            headers={"X-Master-Key": "test-key"},
            json={"post_id": 1},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_vote_post(self, mock_post, mock_cm, client, mock_credentials):
        """Test vote on post endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"post_view": {"post": {"id": 1}, "my_vote": 1}},
        )

        response = client.post(
            "/api/v1/lemmy/post/like",
            headers={"X-Master-Key": "test-key"},
            json={"post_id": 1, "score": 1},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_list_comments(self, mock_get, mock_cm, client, mock_credentials):
        """Test list comments endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "comments": [
                    {
                        "comment": {"id": 1, "content": "Test comment"},
                        "counts": {"score": 5},
                    }
                ]
            },
        )

        response = client.get(
            "/api/v1/lemmy/comment/list",
            headers={"X-Master-Key": "test-key"},
            query_string={"post_id": 1},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_create_comment(self, mock_post, mock_cm, client, mock_credentials):
        """Test create comment endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "comment_view": {"comment": {"id": 2, "content": "New comment"}}
            },
        )

        response = client.post(
            "/api/v1/lemmy/comment",
            headers={"X-Master-Key": "test-key"},
            json={"content": "New comment", "post_id": 1},
        )

        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201]

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.post")
    def test_vote_comment(self, mock_post, mock_cm, client, mock_credentials):
        """Test vote on comment endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"comment_view": {"comment": {"id": 1}, "my_vote": -1}},
        )

        response = client.post(
            "/api/v1/lemmy/comment/like",
            headers={"X-Master-Key": "test-key"},
            json={"comment_id": 1, "score": -1},
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.lemmy.CredentialManager")
    @patch("app.web.api.v1.lemmy.http_requests.get")
    def test_search(self, mock_get, mock_cm, client, mock_credentials):
        """Test search endpoint."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "posts": [],
                "comments": [],
                "communities": [],
                "users": [],
            },
        )

        response = client.get(
            "/api/v1/lemmy/search",
            headers={"X-Master-Key": "test-key"},
            query_string={"q": "test"},
        )

        assert response.status_code == 200

    def test_no_master_key(self, client):
        """Test endpoint without master key."""
        response = client.get("/api/v1/lemmy/site")
        # API returns 400 or 401 for missing master key
        assert response.status_code in [400, 401]
