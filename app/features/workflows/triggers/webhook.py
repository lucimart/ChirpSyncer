"""
Webhook Trigger - Fires when webhook receives data.
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class WebhookTrigger(BaseTrigger):
    """
    Trigger that fires when a webhook receives data.

    Config:
        secret: Webhook secret for validation
        filter: Optional filter conditions for payload
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if this is a webhook event.

        Args:
            context: Event context

        Returns:
            True if this is a webhook event
        """
        if context.get("event_type") != "webhook":
            return False

        # Optional: validate against filter conditions
        filter_config = self.config.get("filter")
        if filter_config:
            payload = context.get("payload", {})
            for key, expected_value in filter_config.items():
                if payload.get(key) != expected_value:
                    return False

        return True

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract webhook data from context.

        Args:
            context: Event context

        Returns:
            Dict with webhook payload
        """
        return {
            "payload": context.get("payload", {}),
            "headers": context.get("headers", {}),
            "received_at": context.get("received_at"),
        }
