"""
Send Notification Action - Send notifications via Telegram, Discord, etc.
"""

from typing import Any, Dict

from app.features.workflows.actions.base import BaseAction


def send_telegram_message(chat_id: str, message: str) -> Dict[str, Any]:
    """
    Send a message via Telegram.

    This is a stub that will be replaced with actual Telegram API call.

    Args:
        chat_id: Telegram chat ID
        message: Message to send

    Returns:
        Dict with success status
    """
    # Will be implemented with actual Telegram bot API
    return {"success": True, "message_id": "tg_123"}


def send_discord_message(webhook_url: str, message: str) -> Dict[str, Any]:
    """
    Send a message via Discord webhook.

    Args:
        webhook_url: Discord webhook URL
        message: Message to send

    Returns:
        Dict with success status
    """
    # Will be implemented with actual Discord webhook
    return {"success": True}


def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Send an email notification.

    Args:
        to: Recipient email
        subject: Email subject
        body: Email body

    Returns:
        Dict with success status
    """
    # Will be implemented with actual email sending
    return {"success": True}


class SendNotificationAction(BaseAction):
    """
    Action that sends notifications to various channels.

    Config:
        channel: Notification channel (telegram, discord, email)
        chat_id: Telegram chat ID (for telegram)
        webhook_url: Discord webhook URL (for discord)
        email: Email address (for email)
        template: Optional message template
    """

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification based on channel configuration.

        Args:
            context: Context with data to include in notification

        Returns:
            Dict with success status
        """
        channel = self.config.get("channel", "telegram")
        message = self._format_message(context)

        try:
            if channel == "telegram":
                chat_id = self.config.get("chat_id")
                result = send_telegram_message(chat_id, message)

            elif channel == "discord":
                webhook_url = self.config.get("webhook_url")
                result = send_discord_message(webhook_url, message)

            elif channel == "email":
                email = self.config.get("email")
                subject = self.config.get("subject", "Workflow Notification")
                result = send_email(email, subject, message)

            else:
                return {
                    "success": False,
                    "error": f"Unknown channel: {channel}",
                }

            return {
                "success": result.get("success", False),
                "channel": channel,
                "message_id": result.get("message_id"),
            }

        except Exception as e:
            return {
                "success": False,
                "channel": channel,
                "error": str(e),
            }

    def _format_message(self, context: Dict[str, Any]) -> str:
        """
        Format notification message from context.

        Args:
            context: Workflow context

        Returns:
            Formatted message string
        """
        template = self.config.get("template")

        if template:
            # Simple template substitution
            message = template
            for key, value in context.items():
                message = message.replace(f"{{{key}}}", str(value))
            return message

        # Default message format
        parts = []

        if context.get("post_id"):
            parts.append(f"Post ID: {context['post_id']}")

        if context.get("platform"):
            parts.append(f"Platform: {context['platform']}")

        if context.get("content"):
            content = context["content"]
            if len(content) > 100:
                content = content[:100] + "..."
            parts.append(f"Content: {content}")

        if context.get("likes"):
            parts.append(f"Likes: {context['likes']}")

        if context.get("retweets"):
            parts.append(f"Retweets: {context['retweets']}")

        return "\n".join(parts) if parts else "Workflow triggered"
