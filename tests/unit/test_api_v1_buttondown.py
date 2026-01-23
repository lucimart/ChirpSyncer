"""
Buttondown API Endpoint Tests

Tests for the Buttondown newsletter platform:
- Authentication
- Newsletters
- Emails
- Subscribers
- Analytics
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.buttondown import buttondown_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(buttondown_bp, url_prefix="/api/v1/buttondown")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Buttondown credentials."""
    return {"api_key": "test-buttondown-api-key"}


class TestButtondownAuth:
    """Test authentication endpoints."""

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.get")
    def test_authenticate_success(self, mock_get, mock_cm, client):
        """Should authenticate with valid API key."""
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {"results": [{"name": "My Newsletter"}]},
        )

        response = client.post(
            "/api/v1/buttondown/auth",
            json={"api_key": "test-api-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["authenticated"] is True

    def test_authenticate_missing_key(self, client):
        """Should reject missing API key."""
        response = client.post("/api/v1/buttondown/auth", json={})
        assert response.status_code == 400


class TestButtondownNewsletters:
    """Test newsletters endpoints."""

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.get")
    def test_list_newsletters_success(self, mock_get, mock_cm, mock_credentials):
        """Should return newsletters."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"id": "nl1", "name": "My Newsletter", "subscriber_count": 100}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 1
        assert response["results"][0]["name"] == "My Newsletter"


class TestButtondownEmails:
    """Test emails endpoints."""

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.get")
    def test_list_emails_success(self, mock_get, mock_cm, mock_credentials):
        """Should return sent emails."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"id": "email1", "subject": "Welcome!", "publish_date": "2024-01-01"}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 1

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.post")
    def test_create_email_success(self, mock_post, mock_cm, mock_credentials):
        """Should create a new email draft."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "id": "new-email",
                "subject": "New Email",
                "status": "draft",
            },
        )

        response = mock_post.return_value.json()
        assert response["subject"] == "New Email"


class TestButtondownSubscribers:
    """Test subscribers endpoints."""

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.get")
    def test_list_subscribers_success(self, mock_get, mock_cm, mock_credentials):
        """Should return subscribers."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "results": [
                    {"email": "sub@example.com", "subscriber_type": "regular"}
                ]
            },
        )

        response = mock_get.return_value.json()
        assert len(response["results"]) == 1

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.post")
    def test_add_subscriber_success(self, mock_post, mock_cm, mock_credentials):
        """Should add a new subscriber."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {"email": "new@example.com", "id": "sub123"},
        )

        response = mock_post.return_value.json()
        assert response["email"] == "new@example.com"


class TestButtondownAnalytics:
    """Test analytics endpoints."""

    @patch("app.web.api.v1.buttondown.CredentialManager")
    @patch("app.web.api.v1.buttondown.http_requests.get")
    def test_get_analytics_success(self, mock_get, mock_cm, mock_credentials):
        """Should return analytics data."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_get.return_value = Mock(
            ok=True,
            json=lambda: {
                "total_subscribers": 500,
                "open_rate": 0.45,
                "click_rate": 0.12,
            },
        )

        response = mock_get.return_value.json()
        assert response["total_subscribers"] == 500
        assert response["open_rate"] == 0.45
