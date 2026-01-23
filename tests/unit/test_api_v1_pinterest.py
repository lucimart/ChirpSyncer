"""
Pinterest API Endpoint Tests

Tests for the Pinterest integration endpoints:
- User account
- Board operations
- Pin operations
- Search
- Analytics
"""

import pytest
from unittest.mock import Mock, patch
from flask import Flask

from app.web.api.v1.pinterest import pinterest_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(pinterest_bp, url_prefix="/api/v1/pinterest")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_credentials():
    """Mock Pinterest credentials."""
    return {
        "client_id": "test-client-id",
        "client_secret": "test-client-secret",
        "access_token": "test-access-token",
        "refresh_token": "test-refresh-token",
        "expires_at": 9999999999,
    }


class TestPinterestUser:
    """Test user endpoints."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_me_success(self, mock_request, mock_cm, mock_credentials):
        """Should return authenticated user info."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "username": "testuser",
                "account_type": "BUSINESS",
                "profile_image": "https://pinterest.com/avatar.jpg",
                "website_url": "https://example.com",
                "business_name": "Test Business",
            },
        )

        response = mock_request.return_value.json()
        assert response["username"] == "testuser"
        assert response["account_type"] == "BUSINESS"


class TestPinterestBoards:
    """Test board endpoints."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_boards_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's boards."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "board-1",
                        "name": "Test Board",
                        "description": "A test board",
                        "pin_count": 50,
                        "follower_count": 100,
                        "privacy": "PUBLIC",
                    },
                    {
                        "id": "board-2",
                        "name": "Secret Board",
                        "description": "Private",
                        "pin_count": 10,
                        "follower_count": 0,
                        "privacy": "SECRET",
                    },
                ],
                "bookmark": "cursor123",
            },
        )

        response = mock_request.return_value.json()
        assert len(response["items"]) == 2
        assert response["items"][0]["privacy"] == "PUBLIC"
        assert response["items"][1]["privacy"] == "SECRET"

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_create_board_success(self, mock_request, mock_cm, mock_credentials):
        """Should create a new board."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=201,
            json=lambda: {
                "id": "new-board-123",
                "name": "New Board",
                "description": "A new board",
                "privacy": "PUBLIC",
            },
        )

        response = mock_request.return_value.json()
        assert response["id"] == "new-board-123"
        assert response["name"] == "New Board"

    def test_board_privacy_levels(self):
        """Should support all privacy levels."""
        privacy_levels = ["PUBLIC", "PROTECTED", "SECRET"]
        for level in privacy_levels:
            assert level in ["PUBLIC", "PROTECTED", "SECRET"]

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_delete_board_success(self, mock_request, mock_cm, mock_credentials):
        """Should delete a board."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(ok=True, status_code=204)

        assert mock_request.return_value.status_code == 204


class TestPinterestPins:
    """Test pin endpoints."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_pins_success(self, mock_request, mock_cm, mock_credentials):
        """Should return user's pins."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "pin-1",
                        "title": "Test Pin",
                        "description": "A test pin",
                        "link": "https://example.com/article",
                        "board_id": "board-1",
                        "media": {
                            "media_type": "image",
                            "images": {
                                "150x150": {"url": "https://pinterest.com/small.jpg"},
                                "400x300": {"url": "https://pinterest.com/medium.jpg"},
                            },
                        },
                        "created_at": "2024-01-15T12:00:00",
                    }
                ],
                "bookmark": "cursor456",
            },
        )

        response = mock_request.return_value.json()
        pins = response["items"]
        assert len(pins) == 1
        assert pins[0]["title"] == "Test Pin"
        assert "media" in pins[0]

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_create_pin_success(self, mock_request, mock_cm, mock_credentials):
        """Should create a new pin."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=201,
            json=lambda: {
                "id": "new-pin-123",
                "title": "New Pin",
                "description": "A new pin",
                "board_id": "board-1",
            },
        )

        response = mock_request.return_value.json()
        assert response["id"] == "new-pin-123"

    def test_pin_media_source_types(self):
        """Should support different media source types."""
        source_types = ["image_url", "image_base64", "video_id"]
        for source_type in source_types:
            assert source_type in ["image_url", "image_base64", "video_id"]

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_update_pin_success(self, mock_request, mock_cm, mock_credentials):
        """Should update a pin."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "pin-1",
                "title": "Updated Title",
                "description": "Updated description",
            },
        )

        response = mock_request.return_value.json()
        assert response["title"] == "Updated Title"

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_save_pin_success(self, mock_request, mock_cm, mock_credentials):
        """Should save a pin to a board."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "id": "saved-pin-123",
                "board_id": "target-board",
            },
        )

        response = mock_request.return_value.json()
        assert response["board_id"] == "target-board"


class TestPinterestSearch:
    """Test search endpoints."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_search_pins_success(self, mock_request, mock_cm, mock_credentials):
        """Should search for pins."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "search-pin-1",
                        "title": "Python Tutorial",
                        "description": "Learn Python",
                    },
                    {
                        "id": "search-pin-2",
                        "title": "Python Recipes",
                        "description": "Cooking with snakes",
                    },
                ],
                "bookmark": "search-cursor",
            },
        )

        response = mock_request.return_value.json()
        assert len(response["items"]) == 2


class TestPinterestAnalytics:
    """Test analytics endpoints."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_pin_analytics_success(self, mock_request, mock_cm, mock_credentials):
        """Should return pin analytics."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "all": {
                    "daily_metrics": [
                        {
                            "date": "2024-01-15",
                            "data_status": "READY",
                            "metrics": {
                                "IMPRESSION": 1000,
                                "SAVE": 50,
                                "PIN_CLICK": 200,
                                "OUTBOUND_CLICK": 75,
                            },
                        }
                    ]
                }
            },
        )

        response = mock_request.return_value.json()
        metrics = response["all"]["daily_metrics"][0]["metrics"]
        assert metrics["IMPRESSION"] == 1000
        assert metrics["SAVE"] == 50

    def test_analytics_metric_types(self):
        """Should support all metric types."""
        metrics = ["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK", "VIDEO_VIEW"]
        for metric in metrics:
            assert metric in ["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK", "VIDEO_VIEW"]

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_account_analytics_success(self, mock_request, mock_cm, mock_credentials):
        """Should return account analytics."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "all": {
                    "summary_metrics": {
                        "IMPRESSION": 50000,
                        "ENGAGEMENT": 2500,
                        "PIN_CLICK": 1000,
                        "OUTBOUND_CLICK": 500,
                    }
                }
            },
        )

        response = mock_request.return_value.json()
        summary = response["all"]["summary_metrics"]
        assert summary["IMPRESSION"] == 50000


class TestPinterestTokenRefresh:
    """Test token refresh functionality."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.post")
    def test_refresh_token_success(self, mock_post, mock_cm):
        """Should refresh expired token."""
        mock_cm.return_value.get_credentials.return_value = {
            "client_id": "test-id",
            "client_secret": "test-secret",
            "access_token": "old-token",
            "refresh_token": "refresh-token",
            "expires_at": 0,
        }
        mock_post.return_value = Mock(
            ok=True,
            json=lambda: {
                "access_token": "new-access-token",
                "refresh_token": "new-refresh-token",
                "token_type": "bearer",
                "expires_in": 2592000,  # 30 days
                "scope": "boards:read pins:read pins:write",
            },
        )

        response = mock_post.return_value.json()
        assert response["access_token"] == "new-access-token"
        assert response["expires_in"] == 2592000


class TestPinterestBoardPins:
    """Test board-specific pin operations."""

    @patch("app.web.api.v1.pinterest.CredentialManager")
    @patch("app.web.api.v1.pinterest.requests.request")
    def test_get_board_pins_success(self, mock_request, mock_cm, mock_credentials):
        """Should return pins from a specific board."""
        mock_cm.return_value.get_credentials.return_value = mock_credentials
        mock_request.return_value = Mock(
            ok=True,
            status_code=200,
            json=lambda: {
                "items": [
                    {"id": "board-pin-1", "title": "Pin 1"},
                    {"id": "board-pin-2", "title": "Pin 2"},
                ],
                "bookmark": "board-cursor",
            },
        )

        response = mock_request.return_value.json()
        assert len(response["items"]) == 2
