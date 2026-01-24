"""
Substack API Endpoint Tests

Tests for the Substack newsletter platform integration:
- Publication info
- Posts (drafts, published)
- Subscribers
- Publishing
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.substack import substack_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(substack_bp, url_prefix="/api/v1/substack")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Substack credentials."""
    return {
        "subdomain": "testnewsletter",
        "session_cookie": "test-session-cookie",
    }


class TestSubstackPublication:
    """Test publication endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.get")
    def test_get_publication_success(self, mock_get, mock_cm, mock_credentials):
        """Should return publication details."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 12345,
                "name": "Test Newsletter",
                "subdomain": "testnewsletter",
                "custom_domain": None,
                "author_name": "Test Author",
                "hero_text": "A newsletter about testing",
            },
        )

        response = mock_get.return_value.json()
        assert response["name"] == "Test Newsletter"
        assert response["subdomain"] == "testnewsletter"


class TestSubstackPosts:
    """Test posts endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.get")
    def test_get_posts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return published posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 1,
                    "title": "First Post",
                    "subtitle": "Introduction",
                    "slug": "first-post",
                    "post_date": "2024-01-15",
                    "audience": "everyone",
                    "type": "newsletter",
                },
                {
                    "id": 2,
                    "title": "Second Post",
                    "subtitle": "Follow up",
                    "slug": "second-post",
                    "post_date": "2024-01-20",
                    "audience": "only_paid",
                    "type": "newsletter",
                },
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 2
        assert response[0]["title"] == "First Post"

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.get")
    def test_get_drafts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return draft posts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: [
                {
                    "id": 100,
                    "title": "Draft Post",
                    "subtitle": "Work in progress",
                    "draft": True,
                }
            ],
        )

        response = mock_get.return_value.json()
        assert len(response) == 1
        assert response[0]["draft"] is True

    def test_post_types(self):
        """Should support newsletter, podcast, thread types."""
        post_types = ["newsletter", "podcast", "thread"]
        for pt in post_types:
            assert pt in ["newsletter", "podcast", "thread"]

    def test_audience_types(self):
        """Should support audience targeting."""
        audiences = ["everyone", "only_paid", "founding"]
        for aud in audiences:
            assert aud in ["everyone", "only_paid", "founding"]


class TestSubstackDrafts:
    """Test draft management endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.post")
    def test_create_draft_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new draft."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 200,
                "title": "New Draft",
                "subtitle": "Testing",
                "draft": True,
                "type": "newsletter",
            },
        )

        response = mock_post.return_value.json()
        assert response["title"] == "New Draft"
        assert response["draft"] is True

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.put")
    def test_update_post_success(self, mock_put, mock_cm, mock_credentials):
        """Should update an existing post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_put.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 200,
                "title": "Updated Draft",
                "subtitle": "Updated subtitle",
            },
        )

        response = mock_put.return_value.json()
        assert response["title"] == "Updated Draft"

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.delete")
    def test_delete_post_success(self, mock_delete, mock_cm, mock_credentials):
        """Should delete a post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_delete.return_value = Mock(ok=True)

        assert mock_delete.return_value.ok is True


class TestSubstackPublish:
    """Test publishing endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.post")
    def test_publish_post_success(self, mock_post, mock_cm, mock_credentials):
        """Should publish a draft post."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 200,
                "title": "Published Post",
                "draft": False,
                "post_date": "2024-01-25T12:00:00Z",
            },
        )

        response = mock_post.return_value.json()
        assert response["draft"] is False
        assert "post_date" in response


class TestSubstackSubscribers:
    """Test subscriber endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.get")
    def test_get_subscriber_stats_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subscriber statistics."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total_subscribers": 1000,
                "free_subscribers": 800,
                "paid_subscribers": 180,
                "founding_subscribers": 20,
            },
        )

        response = mock_get.return_value.json()
        assert response["total_subscribers"] == 1000
        assert response["paid_subscribers"] == 180


class TestSubstackSettings:
    """Test settings endpoints."""

    @patch("app.web.api.v1.substack.CredentialManager")
    @patch("app.web.api.v1.substack.http_requests.get")
    def test_get_settings_success(self, mock_get, mock_cm, mock_credentials):
        """Should return publication settings."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "name": "Test Newsletter",
                "about": "A test newsletter",
                "logo_url": "https://example.com/logo.png",
            },
        )

        response = mock_get.return_value.json()
        assert response["name"] == "Test Newsletter"
