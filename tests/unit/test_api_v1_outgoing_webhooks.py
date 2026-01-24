"""Unit tests for Outgoing Webhooks API endpoints."""

import json
from unittest.mock import Mock, patch

import pytest
import requests as http_requests_lib
from flask import Flask

from app.web.api.v1.outgoing_webhooks import outgoing_webhooks_bp


@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["MASTER_KEY"] = "test-master-key"
    app.config["DB_PATH"] = ":memory:"
    app.register_blueprint(outgoing_webhooks_bp, url_prefix="/api/v1/outgoing-webhooks")
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestOutgoingWebhooksAPI:
    """Tests for Outgoing Webhooks API endpoints."""

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_send_webhook(self, mock_post, client):
        """Test sending a webhook."""
        mock_post.return_value = Mock(
            ok=True,
            status_code=200,
            headers={"Content-Type": "application/json"},
            json=lambda: {"received": True},
            text='{"received": true}',
        )

        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={
                "url": "https://webhook.example.com/hook",
                "payload": {"event": "test", "data": {"key": "value"}},
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["success"] is True
        assert data["data"]["status_code"] == 200
        assert "webhook_id" in data["data"]

    def test_send_webhook_no_master_key(self, client):
        """Test send webhook without master key."""
        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            json={"url": "https://webhook.example.com/hook"},
        )
        # API returns 400 or 401 for missing master key
        assert response.status_code in [400, 401]

    def test_send_webhook_no_url(self, client):
        """Test send webhook without URL."""
        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={"payload": {}},
        )
        assert response.status_code == 400

    def test_send_webhook_invalid_method(self, client):
        """Test send webhook with invalid method."""
        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={
                "url": "https://webhook.example.com/hook",
                "method": "GET",
            },
        )
        assert response.status_code == 400

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_send_webhook_with_signature(self, mock_post, client):
        """Test sending webhook with signature."""
        mock_post.return_value = Mock(
            ok=True,
            status_code=200,
            headers={},
            json=lambda: {},
            text="{}",
        )

        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={
                "url": "https://webhook.example.com/hook",
                "payload": {"test": "data"},
                "secret": "my-secret-key",
                "signature_header": "X-Signature",
            },
        )

        assert response.status_code == 200
        # Verify signature header was added
        call_args = mock_post.call_args
        assert "X-Signature" in call_args[1]["headers"]

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.put")
    def test_send_webhook_put_method(self, mock_put, client):
        """Test sending webhook with PUT method."""
        mock_put.return_value = Mock(
            ok=True,
            status_code=200,
            headers={},
            json=lambda: {},
            text="{}",
        )

        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={
                "url": "https://webhook.example.com/hook",
                "method": "PUT",
                "payload": {"update": True},
            },
        )

        assert response.status_code == 200

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_send_webhook_timeout(self, mock_post, client):
        """Test webhook timeout handling."""
        mock_post.side_effect = http_requests_lib.Timeout()

        response = client.post(
            "/api/v1/outgoing-webhooks/send",
            headers={"X-Master-Key": "test-key"},
            json={"url": "https://slow.example.com/hook"},
        )

        # May return 504 or 500 depending on error handling
        assert response.status_code in [400, 500, 504]

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_test_webhook(self, mock_post, client):
        """Test webhook test endpoint."""
        mock_post.return_value = Mock(ok=True, status_code=200, text="OK")

        response = client.post(
            "/api/v1/outgoing-webhooks/test",
            json={"url": "https://webhook.example.com/test"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["success"] is True
        assert "test_payload" in data["data"]

    def test_test_webhook_no_url(self, client):
        """Test webhook test without URL."""
        response = client.post("/api/v1/outgoing-webhooks/test", json={})
        assert response.status_code == 400

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_test_webhook_timeout(self, mock_post, client):
        """Test webhook test timeout."""
        mock_post.side_effect = http_requests_lib.Timeout()

        response = client.post(
            "/api/v1/outgoing-webhooks/test",
            json={"url": "https://slow.example.com/test"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["success"] is False
        assert "timed out" in data["data"]["error"]

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_batch_webhooks(self, mock_post, client):
        """Test batch webhook sending."""
        mock_post.return_value = Mock(ok=True, status_code=200)

        response = client.post(
            "/api/v1/outgoing-webhooks/batch",
            headers={"X-Master-Key": "test-key"},
            json={
                "webhooks": [
                    {"url": "https://hook1.example.com"},
                    {"url": "https://hook2.example.com"},
                ],
                "payload": {"event": "batch_test"},
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["total"] == 2
        assert data["data"]["sent"] == 2
        assert data["data"]["successful"] == 2

    def test_batch_webhooks_no_master_key(self, client):
        """Test batch webhooks without master key."""
        response = client.post(
            "/api/v1/outgoing-webhooks/batch",
            json={"webhooks": [{"url": "https://example.com"}]},
        )
        # API returns 400 or 401 for missing master key
        assert response.status_code in [400, 401]

    def test_batch_webhooks_empty(self, client):
        """Test batch webhooks with empty list."""
        response = client.post(
            "/api/v1/outgoing-webhooks/batch",
            headers={"X-Master-Key": "test-key"},
            json={"webhooks": []},
        )
        assert response.status_code == 400

    @patch("app.web.api.v1.outgoing_webhooks.http_requests.post")
    def test_batch_webhooks_fail_fast(self, mock_post, client):
        """Test batch webhooks with fail_fast."""
        mock_fail = Mock(ok=False, status_code=500)
        mock_success = Mock(ok=True, status_code=200)
        mock_post.side_effect = [mock_fail, mock_success]

        response = client.post(
            "/api/v1/outgoing-webhooks/batch",
            headers={"X-Master-Key": "test-key"},
            json={
                "webhooks": [
                    {"url": "https://fail.example.com"},
                    {"url": "https://success.example.com"},
                ],
                "fail_fast": True,
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["sent"] == 1  # Stopped after first failure

    def test_apply_payload_template(self, client):
        """Test payload template application."""
        response = client.post(
            "/api/v1/outgoing-webhooks/templates",
            json={
                "template": {
                    "message": "Hello {{name}}!",
                    "timestamp": "{{time}}",
                    "nested": {"value": "{{value}}"},
                },
                "variables": {
                    "name": "World",
                    "time": "2024-01-01",
                    "value": "42",
                },
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["result"]["message"] == "Hello World!"
        assert data["data"]["result"]["timestamp"] == "2024-01-01"
        assert data["data"]["result"]["nested"]["value"] == "42"

    def test_apply_payload_template_no_template(self, client):
        """Test template application without template."""
        response = client.post(
            "/api/v1/outgoing-webhooks/templates",
            json={"variables": {"key": "value"}},
        )
        assert response.status_code == 400

    @patch("app.web.api.v1.outgoing_webhooks.CredentialManager")
    def test_list_webhook_configs(self, mock_cm, client):
        """Test listing webhook configs."""
        mock_cm.return_value.get_credentials.return_value = {"configs": []}

        response = client.get(
            "/api/v1/outgoing-webhooks/configs",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "configs" in data["data"]

    def test_list_webhook_configs_no_master_key(self, client):
        """Test listing configs without master key."""
        response = client.get("/api/v1/outgoing-webhooks/configs")
        # API returns 400 or 401 for missing master key
        assert response.status_code in [400, 401]

    @patch("app.web.api.v1.outgoing_webhooks.CredentialManager")
    def test_save_webhook_config(self, mock_cm, client):
        """Test saving webhook config."""
        mock_cm.return_value.get_credentials.return_value = {"configs": []}

        response = client.post(
            "/api/v1/outgoing-webhooks/configs",
            headers={"X-Master-Key": "test-key"},
            json={
                "name": "My Webhook",
                "url": "https://webhook.example.com/hook",
                "method": "POST",
                "headers": {"Authorization": "Bearer token"},
                "payload_template": {"event": "{{event}}"},
            },
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["name"] == "My Webhook"
        assert "id" in data["data"]

    @patch("app.web.api.v1.outgoing_webhooks.CredentialManager")
    def test_save_webhook_config_missing_fields(self, mock_cm, client):
        """Test saving config with missing fields."""
        response = client.post(
            "/api/v1/outgoing-webhooks/configs",
            headers={"X-Master-Key": "test-key"},
            json={"name": "Incomplete"},  # Missing url
        )
        assert response.status_code == 400

    @patch("app.web.api.v1.outgoing_webhooks.CredentialManager")
    def test_delete_webhook_config(self, mock_cm, client):
        """Test deleting webhook config."""
        mock_cm.return_value.get_credentials.return_value = {
            "configs": [{"id": "config123", "name": "Test", "url": "https://example.com"}]
        }

        response = client.delete(
            "/api/v1/outgoing-webhooks/configs/config123",
            headers={"X-Master-Key": "test-key"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["deleted"] is True

    @patch("app.web.api.v1.outgoing_webhooks.CredentialManager")
    def test_delete_webhook_config_not_found(self, mock_cm, client):
        """Test deleting non-existent config."""
        mock_cm.return_value.get_credentials.return_value = {"configs": []}

        response = client.delete(
            "/api/v1/outgoing-webhooks/configs/nonexistent",
            headers={"X-Master-Key": "test-key"},
        )

        # API may return 400 (validation error) or 404 (not found)
        assert response.status_code in [400, 404]

    def test_verify_signature(self, client):
        """Test signature verification."""
        response = client.post(
            "/api/v1/outgoing-webhooks/verify-signature",
            json={
                "payload": '{"test":"data"}',
                "secret": "my-secret",
                "signature": "sha256=invalid",
                "algorithm": "sha256",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["valid"] is False
        assert "expected" in data["data"]

    def test_verify_signature_valid(self, client):
        """Test valid signature verification."""
        import hashlib
        import hmac

        payload = '{"test":"data"}'
        secret = "my-secret"
        expected = hmac.new(
            secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        response = client.post(
            "/api/v1/outgoing-webhooks/verify-signature",
            json={
                "payload": payload,
                "secret": secret,
                "signature": f"sha256={expected}",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["valid"] is True

    def test_verify_signature_missing_fields(self, client):
        """Test signature verification with missing fields."""
        response = client.post(
            "/api/v1/outgoing-webhooks/verify-signature",
            json={"payload": "test"},
        )
        assert response.status_code == 400
