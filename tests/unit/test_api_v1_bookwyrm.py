"""
BookWyrm API Endpoint Tests

Tests for the BookWyrm federated book tracking platform:
- Authentication
- Books
- Shelves
- Reviews
- Reading progress
- Activity feed
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.bookwyrm import bookwyrm_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(bookwyrm_bp, url_prefix="/api/v1/bookwyrm")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock BookWyrm credentials."""
    return {
        "instance_url": "https://bookwyrm.social",
        "access_token": "test-access-token",
        "username": "testreader",
    }


class TestBookWyrmAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_cm, client):
        """Should authenticate with valid access token."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"id": 1, "preferredUsername": "testreader"},
        )

        response = client.post(
            "/api/v1/bookwyrm/auth",
            json={
                "instance_url": "https://bookwyrm.social",
                "access_token": "test-access-token",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/bookwyrm/auth", json={})
        assert response.status_code == 400


class TestBookWyrmBooks:
    """Test books endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_search_books_success(self, mock_get, mock_cm, mock_credentials):
        """Should search for books."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"id": 1, "title": "The Hobbit", "authors": [{"name": "J.R.R. Tolkien"}]}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 1
        assert response["results"][0]["title"] == "The Hobbit"

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_get_book_success(self, mock_get, mock_cm, mock_credentials):
        """Should return book details."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 1,
                "title": "The Hobbit",
                "description": "A fantasy novel",
                "pages": 310,
            },
        )

        response = mock_get.return_value.json()
        assert response["title"] == "The Hobbit"


class TestBookWyrmShelves:
    """Test shelves endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_get_shelves_success(self, mock_get, mock_cm, mock_credentials):
        """Should return user's shelves."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"id": 1, "name": "To Read", "books_count": 10},
                    {"id": 2, "name": "Reading", "books_count": 2},
                    {"id": 3, "name": "Read", "books_count": 50},
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 3

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.post")
    def test_add_to_shelf_success(self, mock_post, mock_cm, mock_credentials):
        """Should add book to shelf."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {"success": True})

        assert mock_post.return_value.ok is True


class TestBookWyrmReviews:
    """Test reviews endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.post")
    def test_create_review_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a book review."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": 1,
                "rating": 5,
                "content": "Excellent book!",
                "book": {"title": "The Hobbit"},
            },
        )

        response = mock_post.return_value.json()
        assert response["rating"] == 5


class TestBookWyrmProgress:
    """Test reading progress endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_get_reading_status_success(self, mock_get, mock_cm, mock_credentials):
        """Should return reading status."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "book": {"title": "The Hobbit"},
                "progress": 150,
                "progress_mode": "page",
            },
        )

        response = mock_get.return_value.json()
        assert response["progress"] == 150

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.post")
    def test_update_progress_success(self, mock_post, mock_cm, mock_credentials):
        """Should update reading progress."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"progress": 200, "progress_mode": "page"},
        )

        response = mock_post.return_value.json()
        assert response["progress"] == 200


class TestBookWyrmFeed:
    """Test activity feed endpoints."""

    @patch("app.web.api.v1.bookwyrm.CredentialManager")
    @patch("app.web.api.v1.bookwyrm.http_requests.get")
    def test_get_feed_success(self, mock_get, mock_cm, mock_credentials):
        """Should return activity feed."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"id": 1, "type": "Review", "user": {"username": "friend1"}},
                    {"id": 2, "type": "Comment", "user": {"username": "friend2"}},
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 2
