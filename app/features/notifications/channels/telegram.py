"""
Telegram notification channel.

Sends notifications via Telegram Bot API.
"""

from typing import Any, Dict, Optional

import requests

from app.core.logger import setup_logger

logger = setup_logger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramChannel:
    """
    Telegram notification channel using Bot API.

    Sends formatted messages to a Telegram chat via bot.
    """

    def __init__(self, bot_token: Optional[str] = None):
        """
        Initialize Telegram channel.

        Args:
            bot_token: Telegram bot token from @BotFather
        """
        self.bot_token = bot_token

    def send(
        self,
        chat_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        bot_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send notification to Telegram chat.

        Args:
            chat_id: Telegram chat ID
            title: Notification title
            body: Notification body
            data: Additional data for formatting
            bot_token: Override bot token

        Returns:
            Dict with success status and message_id or error
        """
        token = bot_token or self.bot_token
        if not token:
            return {"success": False, "error": "No bot token configured"}

        if not chat_id:
            return {"success": False, "error": "No chat_id provided"}

        message = self.format_message(title, body, data)

        try:
            url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            }

            response = requests.post(url, json=payload, timeout=10)
            result = response.json()

            if response.status_code == 200 and result.get("ok"):
                message_id = result.get("result", {}).get("message_id")
                logger.info(f"Telegram message sent to {chat_id}: {message_id}")
                return {"success": True, "message_id": message_id}
            else:
                error = result.get("description", f"HTTP {response.status_code}")
                logger.error(f"Telegram send failed: {error}")
                return {"success": False, "error": error}

        except requests.RequestException as e:
            logger.error(f"Telegram request error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Telegram unexpected error: {e}")
            return {"success": False, "error": str(e)}

    def format_message(
        self,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Format notification message for Telegram.

        Uses HTML formatting for better readability.

        Args:
            title: Notification title
            body: Notification body
            data: Additional data to include

        Returns:
            Formatted HTML message
        """
        # Build message with HTML formatting
        lines = [f"<b>{self._escape_html(title)}</b>", "", self._escape_html(body)]

        # Add data summary if present
        if data:
            lines.append("")
            for key, value in data.items():
                formatted_key = key.replace("_", " ").title()
                lines.append(f"<i>{formatted_key}:</i> {value}")

        return "\n".join(lines)

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    def test_connection(self, bot_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Test Telegram bot connection.

        Args:
            bot_token: Bot token to test

        Returns:
            Dict with success status and bot info
        """
        token = bot_token or self.bot_token
        if not token:
            return {"success": False, "error": "No bot token configured"}

        try:
            url = f"{TELEGRAM_API_BASE}/bot{token}/getMe"
            response = requests.get(url, timeout=10)
            result = response.json()

            if response.status_code == 200 and result.get("ok"):
                bot_info = result.get("result", {})
                return {
                    "success": True,
                    "bot_username": bot_info.get("username"),
                    "bot_name": bot_info.get("first_name"),
                }
            else:
                return {
                    "success": False,
                    "error": result.get("description", "Unknown error"),
                }

        except requests.RequestException as e:
            return {"success": False, "error": str(e)}
