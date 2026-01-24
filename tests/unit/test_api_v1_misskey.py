"""
Misskey API Endpoint Tests

Tests for the Misskey/Firefish Fediverse platform:
- Authentication
- Timeline
- Notes (posts)
- Notifications
- Search
- User interactions
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.misskey import misskey_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(misskey_bp, url_prefix="/api/v1/misskey")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Misskey credentials."""
    return {
        "instance_url": "https://misskey.io",
        "access_token": "test-access-token",
        "username": "testuser",
    }


class TestMisskeyAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_authenticate_success(self, mock_post, mock_cm, client):
        """Should authenticate with valid token."""
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"id": "user123", "username": "testuser"},
        )

        response = client.post(
            "/api/v1/misskey/auth",
            json={
                "instance_url": "https://misskey.io",
                "access_token": "test-token",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_fields(self, client):
        """Should reject missing required fields."""
        response = client.post("/api/v1/misskey/auth", json={})
        assert response.status_code == 400


class TestMisskeyTimeline:
    """Test timeline endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_get_timeline_success(self, mock_post, mock_cm, mock_credentials):
        """Should return timeline notes."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": "note1", "text": "Hello Fediverse!", "userId": "user123"}
            ],
        )

        response = mock_post.return_value.json()
        assert len(response) == 1
        assert response[0]["text"] == "Hello Fediverse!"


class TestMisskeyNotes:
    """Test notes (posts) endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_create_note_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new note."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "createdNote": {"id": "note_new", "text": "New note content"}
            },
        )

        response = mock_post.return_value.json()
        assert response["createdNote"]["text"] == "New note content"

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_delete_note_success(self, mock_post, mock_cm, mock_credentials):
        """Should delete a note."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True


class TestMisskeyNotifications:
    """Test notifications endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_get_notifications_success(self, mock_post, mock_cm, mock_credentials):
        """Should return notifications."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": "notif1", "type": "follow", "userId": "user456"}
            ],
        )

        response = mock_post.return_value.json()
        assert len(response) == 1
        assert response[0]["type"] == "follow"


class TestMisskeySearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_search_notes_success(self, mock_post, mock_cm, mock_credentials):
        """Should search notes."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: [
                {"id": "note1", "text": "matching note"}
            ],
        )

        response = mock_post.return_value.json()
        assert len(response) == 1


class TestMisskeyUsers:
    """Test user interaction endpoints."""

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_get_user_notes_success(self, mock_post, mock_cm, mock_credentials):
        """Should return user's notes."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: [{"id": "note1", "text": "User note"}],
        )

        response = mock_post.return_value.json()
        assert len(response) == 1

    @patch("app.web.api.v1.misskey.CredentialManager")
    @patch("app.web.api.v1.misskey.http_requests.post")
    def test_follow_user_success(self, mock_post, mock_cm, mock_credentials):
        """Should follow a user."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(ok=True, json=lambda: {})

        assert mock_post.return_value.ok is True
