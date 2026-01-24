"""Integration tests for Webhooks API endpoints."""

import json
import pytest
from unittest.mock import patch, MagicMock
import tempfile
import os

from app.services.webhooks import WebhookService


class TestWebhooksAPIIntegration:
    """Integration tests for webhook API endpoints."""

    @pytest.fixture
    def db_path(self):
        """Create a temporary database for testing."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        yield path
        if os.path.exists(path):
            os.unlink(path)

    @pytest.fixture
    def service(self, db_path):
        """Create a webhook service instance."""
        return WebhookService(db_path=db_path)

    def test_create_and_list_webhooks(self, service):
        """Test creating webhooks and listing them."""
        # Create first webhook
        webhook1 = service.create_webhook(
            user_id=1,
            url="https://example.com/hook1",
            events=["sync.completed"],
            name="Hook 1",
        )
        assert webhook1["id"] is not None
        assert webhook1["url"] == "https://example.com/hook1"
        assert webhook1["events"] == ["sync.completed"]
        assert webhook1["name"] == "Hook 1"
        assert webhook1["enabled"] is True
        assert "secret" in webhook1

        # Create second webhook
        webhook2 = service.create_webhook(
            user_id=1,
            url="https://example.com/hook2",
            events=["cleanup.completed", "sync.failed"],
            name="Hook 2",
        )
        assert webhook2["id"] != webhook1["id"]

        # List webhooks
        webhooks = service.list_webhooks(user_id=1)
        assert len(webhooks) == 2

        # Verify user isolation
        webhooks_user2 = service.list_webhooks(user_id=2)
        assert len(webhooks_user2) == 0

    def test_update_webhook(self, service):
        """Test updating a webhook."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
            name="Original",
        )

        # Update webhook
        updated = service.update_webhook(
            webhook_id=webhook["id"],
            user_id=1,
            url="https://new-url.com/hook",
            events=["cleanup.completed"],
            name="Updated",
            enabled=False,
        )

        assert updated["url"] == "https://new-url.com/hook"
        assert updated["events"] == ["cleanup.completed"]
        assert updated["name"] == "Updated"
        assert updated["enabled"] is False

    def test_delete_webhook(self, service):
        """Test deleting a webhook."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )

        # Delete webhook
        deleted = service.delete_webhook(webhook["id"], user_id=1)
        assert deleted is True

        # Verify it's gone
        result = service.get_webhook(webhook["id"], user_id=1)
        assert result is None

        # Verify can't delete again
        deleted_again = service.delete_webhook(webhook["id"], user_id=1)
        assert deleted_again is False

    def test_regenerate_secret(self, service):
        """Test regenerating webhook secret."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )
        original_secret = webhook["secret"]

        # Regenerate secret
        updated = service.regenerate_secret(webhook["id"], user_id=1)
        assert updated["secret"] != original_secret
        assert len(updated["secret"]) == len(original_secret)

    def test_dispatch_records_delivery(self, service):
        """Test that dispatching records delivery history."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )

        # Mock the HTTP request
        with patch("requests.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = '{"ok": true}'  # Use text instead of MagicMock
            mock_response.raise_for_status = MagicMock()
            mock_post.return_value = mock_response

            result = service.dispatch(
                webhook_id=webhook["id"],
                event_type="sync.completed",
                payload={"test": True},
            )

            assert result["success"] is True
            assert result["status_code"] == 200

        # Check delivery was recorded
        deliveries = service.list_deliveries(webhook["id"], user_id=1)
        assert len(deliveries) == 1
        assert deliveries[0]["event_type"] == "sync.completed"
        assert deliveries[0]["success"] is True
        assert deliveries[0]["status_code"] == 200

    def test_dispatch_records_failure(self, service):
        """Test that failed dispatches are recorded."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )

        # Mock a failed HTTP request
        with patch("requests.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"
            mock_response.raise_for_status.side_effect = Exception("Server error")
            mock_post.return_value = mock_response

            result = service.dispatch(
                webhook_id=webhook["id"],
                event_type="sync.completed",
                payload={"test": True},
                max_retries=1,
            )

            assert result["success"] is False

        # Check delivery was recorded as failed
        deliveries = service.list_deliveries(webhook["id"], user_id=1)
        assert len(deliveries) >= 1
        assert deliveries[0]["success"] is False

    def test_dispatch_skips_unsubscribed_events(self, service):
        """Test that dispatch skips events the webhook isn't subscribed to."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],  # Only subscribed to sync.completed
        )

        with patch("requests.post") as mock_post:
            result = service.dispatch(
                webhook_id=webhook["id"],
                event_type="cleanup.completed",  # Not subscribed
                payload={"test": True},
            )

            # Should be skipped, not sent
            assert result.get("skipped") is True
            mock_post.assert_not_called()

    def test_dispatch_skips_disabled_webhook(self, service):
        """Test that dispatch skips disabled webhooks."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )

        # Disable the webhook
        service.update_webhook(webhook["id"], user_id=1, enabled=False)

        with patch("requests.post") as mock_post:
            result = service.dispatch(
                webhook_id=webhook["id"],
                event_type="sync.completed",
                payload={"test": True},
            )

            assert result.get("skipped") is True
            mock_post.assert_not_called()

    def test_get_webhooks_for_event(self, service):
        """Test getting all webhooks subscribed to an event."""
        # Create webhooks with different subscriptions
        service.create_webhook(
            user_id=1,
            url="https://example.com/hook1",
            events=["sync.completed", "sync.failed"],
        )
        service.create_webhook(
            user_id=1,
            url="https://example.com/hook2",
            events=["cleanup.completed"],
        )
        service.create_webhook(
            user_id=1,
            url="https://example.com/hook3",
            events=["sync.completed"],
        )

        # Get webhooks for sync.completed
        webhooks = service.get_webhooks_for_event(
            user_id=1, event_type="sync.completed"
        )
        assert len(webhooks) == 2

        # Get webhooks for cleanup.completed
        webhooks = service.get_webhooks_for_event(
            user_id=1, event_type="cleanup.completed"
        )
        assert len(webhooks) == 1

    def test_hmac_signature_verification(self, service):
        """Test that HMAC signatures can be verified."""
        from app.services.webhooks import sign_payload, verify_signature

        secret = "test-secret-key"
        payload = {"event": "sync.completed", "data": {"synced": 10}}

        # Sign the payload
        signature = sign_payload(payload, secret)
        assert signature.startswith("sha256=")

        # Verify the signature (note: verify_signature takes payload, signature, secret)
        assert verify_signature(payload, signature, secret) is True

        # Verify with wrong secret fails
        assert verify_signature(payload, signature, "wrong-secret") is False

        # Verify with tampered payload fails
        tampered = {"event": "sync.completed", "data": {"synced": 999}}
        assert verify_signature(tampered, signature, secret) is False

    def test_delivery_limit(self, service):
        """Test that delivery listing respects limit."""
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],
        )

        # Create multiple deliveries
        with patch("requests.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = '{"ok": true}'
            mock_response.raise_for_status = MagicMock()
            mock_post.return_value = mock_response

            for i in range(10):
                service.dispatch(
                    webhook_id=webhook["id"],
                    event_type="sync.completed",
                    payload={"iteration": i},
                )

        # Get with limit
        deliveries = service.list_deliveries(webhook["id"], user_id=1, limit=5)
        assert len(deliveries) == 5

        # Get all
        all_deliveries = service.list_deliveries(webhook["id"], user_id=1, limit=100)
        assert len(all_deliveries) == 10
