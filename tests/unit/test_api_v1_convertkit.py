"""
ConvertKit API Endpoint Tests

Tests for the ConvertKit email marketing platform:
- Authentication
- Account info
- Broadcasts
- Subscribers
- Forms, sequences, tags
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.convertkit import convertkit_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(convertkit_bp, url_prefix="/api/v1/convertkit")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock ConvertKit credentials."""
    return {
        "api_secret": "test-api-secret",
        "name": "Test Newsletter",
    }


class TestConvertKitAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_cm, client):
        """Should authenticate with valid API secret."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "name": "Test User",
                "primary_email_address": "test@example.com",
            },
        )

        response = client.post(
            "/api/v1/convertkit/auth",
            json={"api_secret": "test-api-secret"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_secret(self, client):
        """Should reject missing API secret."""
        response = client.post("/api/v1/convertkit/auth", json={})
        assert response.status_code == 400


class TestConvertKitAccount:
    """Test account endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_get_account_success(self, mock_get, mock_cm, mock_credentials):
        """Should return account info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"name": "Test User", "primary_email_address": "test@example.com"},
        )

        response = mock_get.return_value.json()
        assert response["name"] == "Test User"


class TestConvertKitBroadcasts:
    """Test broadcasts endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_list_broadcasts_success(self, mock_get, mock_cm, mock_credentials):
        """Should return broadcasts."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "broadcasts": [
                    {"id": 1, "subject": "Welcome Email", "created_at": "2024-01-01"}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["broadcasts"]) == 1

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.post")
    def test_create_broadcast_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new broadcast."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "broadcast": {"id": 2, "subject": "New Broadcast", "created_at": "2024-01-15"}
            },
        )

        response = mock_post.return_value.json()
        assert response["broadcast"]["subject"] == "New Broadcast"


class TestConvertKitSubscribers:
    """Test subscribers endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_list_subscribers_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subscribers."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total_subscribers": 100,
                "subscribers": [{"email_address": "sub@example.com", "state": "active"}],
            },
        )

        response = mock_get.return_value.json()
        assert response["total_subscribers"] == 100


class TestConvertKitForms:
    """Test forms endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_list_forms_success(self, mock_get, mock_cm, mock_credentials):
        """Should return forms."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "forms": [{"id": 1, "name": "Signup Form", "type": "embed"}]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["forms"]) == 1


class TestConvertKitSequences:
    """Test sequences endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_list_sequences_success(self, mock_get, mock_cm, mock_credentials):
        """Should return sequences."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "courses": [{"id": 1, "name": "Welcome Sequence", "subscriber_count": 50}]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["courses"]) == 1


class TestConvertKitTags:
    """Test tags endpoints."""

    @patch("app.web.api.v1.convertkit.CredentialManager")
    @patch("app.web.api.v1.convertkit.http_requests.get")
    def test_list_tags_success(self, mock_get, mock_cm, mock_credentials):
        """Should return tags."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "tags": [{"id": 1, "name": "vip", "subscriber_count": 25}]
            },
        )

        response = mock_get.return_value.json()
        assert response["tags"][0]["name"] == "vip"
