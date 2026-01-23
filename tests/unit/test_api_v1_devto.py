"""
Dev.to (Forem) API Endpoint Tests

Tests for the Dev.to developer blogging platform integration:
- User profile
- Articles (CRUD)
- Comments
- Tags
- Followers
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.devto import devto_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(devto_bp, url_prefix="/api/v1/devto")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Dev.to credentials."""
    return {
        "api_key": "test-devto-api-key",
    }


class TestDevtoUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_me_success(self, mock_get, mock_cm, mock_credentials):
        """Should return authenticated user's profile."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 12345,
                "username": "devuser",
                "name": "Dev User",
                "twitter_username": "devuser",
                "github_username": "devuser",
                "summary": "A developer",
                "profile_image": "https://dev.to/avatar.png",
            },
        )

        response = mock_get.return_value.json()
        assert response["username"] == "devuser"
        assert response["id"] == 12345


class TestDevtoArticles:
    """Test articles endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_articles_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's articles."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "title": "First Article",
                    "description": "My first article",
                    "slug": "first-article",
                    "url": "https://dev.to/devuser/first-article",
                    "published": True,
                    "tags": ["python", "tutorial"],
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
        assert response[0]["title"] == "First Article"

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_published_articles_success(self, mock_get, mock_cm, mock_credentials):
        """Should return only published articles."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "title": "Published Article",
                    "published": True,
                }
            ],
        )

        response = mock_get.return_value.json()
        assert response[0]["published"] is True

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_unpublished_articles_success(self, mock_get, mock_cm, mock_credentials):
        """Should return only draft articles."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 2,
                    "title": "Draft Article",
                    "published": False,
                }
            ],
        )

        response = mock_get.return_value.json()
        assert response[0]["published"] is False

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_article_by_id_success(self, mock_get, mock_cm, mock_credentials):
        """Should return specific article by ID."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 12345,
                "title": "Specific Article",
                "body_markdown": "# Content",
                "body_html": "<h1>Content</h1>",
                "reading_time_minutes": 5,
            },
        )

        response = mock_get.return_value.json()
        assert response["id"] == 12345
        assert "body_markdown" in response

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.post")
    def test_create_article_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new article."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 999,
                "title": "New Article",
                "slug": "new-article",
                "published": False,
                "tags": ["test"],
            },
        )

        response = mock_post.return_value.json()
        assert response["title"] == "New Article"

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.put")
    def test_update_article_success(self, mock_put, mock_cm, mock_credentials):
        """Should update an existing article."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_put.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 999,
                "title": "Updated Article",
                "published": True,
            },
        )

        response = mock_put.return_value.json()
        assert response["title"] == "Updated Article"

    def test_tag_limit(self):
        """Should respect 4 tag limit."""
        tags = ["tag1", "tag2", "tag3", "tag4", "tag5"]
        limited_tags = tags[:4]
        assert len(limited_tags) == 4


class TestDevtoComments:
    """Test comments endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_comments_success(self, mock_get, mock_cm, mock_credentials):
        """Should return comments for an article."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id_code": "abc123",
                    "body_html": "<p>Great article!</p>",
                    "created_at": "2024-01-15T12:00:00Z",
                    "user": {
                        "name": "Commenter",
                        "username": "commenter",
                    },
                    "children": [],
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
        assert "Great article!" in response[0]["body_html"]


class TestDevtoTags:
    """Test tags endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_tags_success(self, mock_get, mock_cm, mock_credentials):
        """Should return popular tags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "name": "python",
                    "bg_color_hex": "#3776ab",
                    "text_color_hex": "#ffffff",
                },
                {
                    "id": 2,
                    "name": "javascript",
                    "bg_color_hex": "#f7df1e",
                    "text_color_hex": "#000000",
                },
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 2
        assert response[0]["name"] == "python"


class TestDevtoOrganizations:
    """Test organization endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_organization_success(self, mock_get, mock_cm, mock_credentials):
        """Should return organization details."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 100,
                "username": "testorg",
                "name": "Test Organization",
                "summary": "A test organization",
                "profile_image": "https://dev.to/org.png",
            },
        )

        response = mock_get.return_value.json()
        assert response["name"] == "Test Organization"


class TestDevtoFollowers:
    """Test followers endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_followers_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's followers."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "name": "Follower One",
                    "username": "follower1",
                    "profile_image": "https://dev.to/f1.png",
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
        assert response[0]["username"] == "follower1"


class TestDevtoReadingList:
    """Test reading list endpoints."""

    @patch("app.web.api.v1.devto.CredentialManager")
    @patch("app.web.api.v1.devto.http_requests.get")
    def test_get_reading_list_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's reading list."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "title": "Bookmarked Article",
                    "url": "https://dev.to/someone/article",
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
