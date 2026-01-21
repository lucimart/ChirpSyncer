"""
TDD Tests for Sprint C - Webhooks

These tests define the expected behavior BEFORE implementation.
Run with: pytest tests/unit/test_webhooks.py -v
"""

import hashlib
import hmac
import json
import time
import pytest
from unittest.mock import patch, MagicMock


class TestWebhookModel:
    """Tests for Webhook model/schema."""

    def test_create_webhook_with_required_fields(self):
        """Webhook requires user_id, url, events, and generates secret."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/webhook",
            events=["sync.completed", "cleanup.completed"],
            name="My Webhook",
        )

        assert webhook["id"] is not None
        assert webhook["user_id"] == 1
        assert webhook["url"] == "https://example.com/webhook"
        assert webhook["events"] == ["sync.completed", "cleanup.completed"]
        assert webhook["name"] == "My Webhook"
        assert webhook["secret"] is not None  # Auto-generated
        assert len(webhook["secret"]) == 64  # 32 bytes hex
        assert webhook["enabled"] is True
        assert webhook["created_at"] is not None

    def test_create_webhook_generates_unique_secrets(self):
        """Each webhook gets a unique secret."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook1 = service.create_webhook(
            user_id=1, url="https://example.com/hook1", events=["sync.completed"]
        )
        webhook2 = service.create_webhook(
            user_id=1, url="https://example.com/hook2", events=["sync.completed"]
        )

        assert webhook1["secret"] != webhook2["secret"]

    def test_get_webhook_by_id(self):
        """Can retrieve webhook by ID."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        created = service.create_webhook(
            user_id=1, url="https://example.com/webhook", events=["sync.completed"]
        )

        webhook = service.get_webhook(created["id"], user_id=1)

        assert webhook is not None
        assert webhook["id"] == created["id"]
        assert webhook["url"] == "https://example.com/webhook"

    def test_get_webhook_returns_none_for_wrong_user(self):
        """Cannot access another user's webhook."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        created = service.create_webhook(
            user_id=1, url="https://example.com/webhook", events=["sync.completed"]
        )

        webhook = service.get_webhook(created["id"], user_id=999)

        assert webhook is None

    def test_list_webhooks_for_user(self):
        """List all webhooks for a user."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        service.create_webhook(
            user_id=1, url="https://a.com", events=["sync.completed"]
        )
        service.create_webhook(
            user_id=1, url="https://b.com", events=["cleanup.completed"]
        )
        service.create_webhook(
            user_id=2, url="https://c.com", events=["sync.completed"]
        )

        webhooks = service.list_webhooks(user_id=1)

        assert len(webhooks) == 2
        assert all(w["user_id"] == 1 for w in webhooks)

    def test_update_webhook(self):
        """Can update webhook URL, events, name, enabled."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        created = service.create_webhook(
            user_id=1, url="https://old.com", events=["sync.completed"], name="Old"
        )

        updated = service.update_webhook(
            webhook_id=created["id"],
            user_id=1,
            url="https://new.com",
            events=["cleanup.completed"],
            name="New",
            enabled=False,
        )

        assert updated["url"] == "https://new.com"
        assert updated["events"] == ["cleanup.completed"]
        assert updated["name"] == "New"
        assert updated["enabled"] is False
        # Secret should NOT change on update
        assert updated["secret"] == created["secret"]

    def test_delete_webhook(self):
        """Can delete a webhook."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        created = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )

        result = service.delete_webhook(created["id"], user_id=1)

        assert result is True
        assert service.get_webhook(created["id"], user_id=1) is None

    def test_regenerate_secret(self):
        """Can regenerate webhook secret."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        created = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )
        old_secret = created["secret"]

        updated = service.regenerate_secret(created["id"], user_id=1)

        assert updated["secret"] != old_secret
        assert len(updated["secret"]) == 64


class TestWebhookDeliveryModel:
    """Tests for WebhookDelivery model/schema."""

    def test_record_delivery_success(self):
        """Record successful delivery."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )

        delivery = service.record_delivery(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123", "synced": 10},
            status_code=200,
            response_body="OK",
            success=True,
        )

        assert delivery["id"] is not None
        assert delivery["webhook_id"] == webhook["id"]
        assert delivery["event_type"] == "sync.completed"
        assert delivery["payload"] == {"job_id": "123", "synced": 10}
        assert delivery["status_code"] == 200
        assert delivery["response_body"] == "OK"
        assert delivery["success"] is True
        assert delivery["attempt"] == 1
        assert delivery["created_at"] is not None

    def test_record_delivery_failure(self):
        """Record failed delivery with error."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )

        delivery = service.record_delivery(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            status_code=500,
            response_body="Internal Server Error",
            success=False,
            error="Connection timeout",
        )

        assert delivery["success"] is False
        assert delivery["status_code"] == 500
        assert delivery["error"] == "Connection timeout"

    def test_list_deliveries_for_webhook(self):
        """List delivery history for a webhook."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )

        service.record_delivery(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={},
            status_code=200,
            response_body="OK",
            success=True,
        )
        service.record_delivery(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={},
            status_code=500,
            response_body="Error",
            success=False,
        )

        deliveries = service.list_deliveries(webhook["id"], user_id=1)

        assert len(deliveries) == 2

    def test_list_deliveries_with_limit(self):
        """Can limit delivery history results."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com", events=["sync.completed"]
        )

        for i in range(10):
            service.record_delivery(
                webhook_id=webhook["id"],
                event_type="sync.completed",
                payload={},
                status_code=200,
                response_body="OK",
                success=True,
            )

        deliveries = service.list_deliveries(webhook["id"], user_id=1, limit=5)

        assert len(deliveries) == 5


class TestHMACSigning:
    """Tests for HMAC signature generation and verification."""

    def test_sign_payload_generates_valid_hmac(self):
        """Sign payload with HMAC-SHA256."""
        from app.services.webhooks import sign_payload

        secret = "test-secret-key"
        payload = {"event": "sync.completed", "data": {"synced": 10}}

        signature = sign_payload(payload, secret)

        # Verify signature format
        assert signature.startswith("sha256=")

        # Verify signature is correct
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
        expected = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()

        assert signature == f"sha256={expected}"

    def test_verify_signature_valid(self):
        """Verify valid signature returns True."""
        from app.services.webhooks import sign_payload, verify_signature

        secret = "test-secret-key"
        payload = {"event": "sync.completed"}
        signature = sign_payload(payload, secret)

        assert verify_signature(payload, signature, secret) is True

    def test_verify_signature_invalid(self):
        """Verify invalid signature returns False."""
        from app.services.webhooks import verify_signature

        secret = "test-secret-key"
        payload = {"event": "sync.completed"}
        wrong_signature = "sha256=invalid"

        assert verify_signature(payload, wrong_signature, secret) is False

    def test_verify_signature_tampered_payload(self):
        """Verify tampered payload fails verification."""
        from app.services.webhooks import sign_payload, verify_signature

        secret = "test-secret-key"
        original_payload = {"event": "sync.completed", "synced": 10}
        signature = sign_payload(original_payload, secret)

        tampered_payload = {"event": "sync.completed", "synced": 999}

        assert verify_signature(tampered_payload, signature, secret) is False


class TestWebhookDispatcher:
    """Tests for webhook dispatcher with retry logic."""

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_successful_delivery(self, mock_post):
        """Dispatch webhook and record successful delivery."""
        from app.services.webhooks import WebhookService

        mock_post.return_value = MagicMock(status_code=200, text="OK")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123", "synced": 10},
        )

        assert result["success"] is True
        assert result["status_code"] == 200

        # Verify HTTP call
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[0][0] == "https://example.com/hook"
        assert "X-Webhook-Signature" in call_args[1]["headers"]

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_failed_delivery(self, mock_post):
        """Dispatch webhook and record failed delivery."""
        from app.services.webhooks import WebhookService

        mock_post.return_value = MagicMock(status_code=500, text="Server Error")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
        )

        assert result["success"] is False
        assert result["status_code"] == 500

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_with_retry_on_failure(self, mock_post):
        """Retry dispatch on failure with exponential backoff."""
        from app.services.webhooks import WebhookService

        # First 2 calls fail, third succeeds
        mock_post.side_effect = [
            MagicMock(status_code=500, text="Error"),
            MagicMock(status_code=500, text="Error"),
            MagicMock(status_code=200, text="OK"),
        ]

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            max_retries=3,
        )

        assert result["success"] is True
        assert result["attempts"] == 3
        assert mock_post.call_count == 3

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_max_retries_exceeded(self, mock_post):
        """Stop retrying after max attempts."""
        from app.services.webhooks import WebhookService

        mock_post.return_value = MagicMock(status_code=500, text="Error")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            max_retries=3,
        )

        assert result["success"] is False
        assert result["attempts"] == 3
        assert mock_post.call_count == 3

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_connection_error(self, mock_post):
        """Handle connection errors gracefully."""
        from app.services.webhooks import WebhookService
        import requests

        mock_post.side_effect = requests.exceptions.ConnectionError(
            "Connection refused"
        )

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            max_retries=1,
        )

        assert result["success"] is False
        assert "Connection" in result["error"]

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_timeout(self, mock_post):
        """Handle timeout errors gracefully."""
        from app.services.webhooks import WebhookService
        import requests

        mock_post.side_effect = requests.exceptions.Timeout("Request timed out")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            max_retries=1,
        )

        assert result["success"] is False
        assert "timeout" in result["error"].lower()

    def test_dispatch_skips_disabled_webhook(self):
        """Don't dispatch to disabled webhooks."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )
        service.update_webhook(webhook["id"], user_id=1, enabled=False)

        result = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
        )

        assert result["skipped"] is True
        assert result["reason"] == "webhook_disabled"


class TestWebhookEventFiltering:
    """Tests for event type filtering."""

    @patch("app.services.webhooks.requests.post")
    def test_dispatch_only_subscribed_events(self, mock_post):
        """Only dispatch events the webhook is subscribed to."""
        from app.services.webhooks import WebhookService

        mock_post.return_value = MagicMock(status_code=200, text="OK")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1,
            url="https://example.com/hook",
            events=["sync.completed"],  # Only sync events
        )

        # This should dispatch
        result1 = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={},
        )

        # This should be skipped
        result2 = service.dispatch(
            webhook_id=webhook["id"],
            event_type="cleanup.completed",
            payload={},
        )

        assert result1["success"] is True
        assert result2["skipped"] is True
        assert result2["reason"] == "event_not_subscribed"

    def test_get_webhooks_for_event(self):
        """Get all webhooks subscribed to an event type."""
        from app.services.webhooks import WebhookService

        service = WebhookService(db_path=":memory:")
        service.create_webhook(
            user_id=1, url="https://a.com", events=["sync.completed"]
        )
        service.create_webhook(
            user_id=1,
            url="https://b.com",
            events=["sync.completed", "cleanup.completed"],
        )
        service.create_webhook(
            user_id=1, url="https://c.com", events=["cleanup.completed"]
        )

        sync_webhooks = service.get_webhooks_for_event(
            user_id=1, event_type="sync.completed"
        )
        cleanup_webhooks = service.get_webhooks_for_event(
            user_id=1, event_type="cleanup.completed"
        )

        assert len(sync_webhooks) == 2
        assert len(cleanup_webhooks) == 2


class TestIdempotency:
    """Tests for idempotent delivery."""

    @patch("app.services.webhooks.requests.post")
    def test_idempotency_key_prevents_duplicate_delivery(self, mock_post):
        """Same idempotency key prevents duplicate delivery."""
        from app.services.webhooks import WebhookService

        mock_post.return_value = MagicMock(status_code=200, text="OK")

        service = WebhookService(db_path=":memory:")
        webhook = service.create_webhook(
            user_id=1, url="https://example.com/hook", events=["sync.completed"]
        )

        idempotency_key = "unique-event-123"

        # First dispatch should succeed
        result1 = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            idempotency_key=idempotency_key,
        )

        # Second dispatch with same key should be skipped
        result2 = service.dispatch(
            webhook_id=webhook["id"],
            event_type="sync.completed",
            payload={"job_id": "123"},
            idempotency_key=idempotency_key,
        )

        assert result1["success"] is True
        assert result2["skipped"] is True
        assert result2["reason"] == "duplicate_delivery"
        assert mock_post.call_count == 1  # Only called once
