"""
Discord notification channel.

Sends notifications via Discord webhooks with rich embeds.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import requests

from app.core.logger import setup_logger
from app.features.notifications.models import NotificationCategory, NotificationPriority

logger = setup_logger(__name__)

# Discord webhook URL pattern
WEBHOOK_PATTERN = re.compile(r"https://discord\.com/api/webhooks/\d+/[\w-]+")

# Category colors for embeds
CATEGORY_COLORS = {
    NotificationCategory.SYNC: 0x4CAF50,  # Green
    NotificationCategory.ALERT: 0xFF9800,  # Orange
    NotificationCategory.SYSTEM: 0x2196F3,  # Blue
    NotificationCategory.ENGAGEMENT: 0x9C27B0,  # Purple
    NotificationCategory.SECURITY: 0xF44336,  # Red
}

# Priority colors override category colors for urgent/critical
PRIORITY_COLORS = {
    NotificationPriority.URGENT: 0xFF5722,  # Deep Orange
    NotificationPriority.CRITICAL: 0xF44336,  # Red
}


class DiscordChannel:
    """
    Discord notification channel using webhooks.

    Sends formatted embeds to Discord channels via webhook.
    """

    def __init__(self, default_webhook_url: Optional[str] = None):
        """
        Initialize Discord channel.

        Args:
            default_webhook_url: Default webhook URL to use
        """
        self.default_webhook_url = default_webhook_url

    def send(
        self,
        webhook_url: str,
        title: str,
        body: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send notification to Discord via webhook.

        Args:
            webhook_url: Discord webhook URL
            title: Notification title
            body: Notification body
            category: Notification category for color coding
            priority: Notification priority
            data: Additional data for embed fields

        Returns:
            Dict with success status or error
        """
        url = webhook_url or self.default_webhook_url
        if not url:
            return {"success": False, "error": "No webhook URL configured"}

        # Validate webhook URL
        if not WEBHOOK_PATTERN.match(url):
            return {"success": False, "error": "Invalid Discord webhook URL format"}

        embed = self.create_embed(title, body, category, priority, data)
        payload = {
            "username": "ChirpSyncer",
            "embeds": [embed],
        }

        try:
            response = requests.post(url, json=payload, timeout=10)

            if response.status_code == 204:
                logger.info(f"Discord notification sent: {title}")
                return {"success": True}
            elif response.status_code == 429:
                # Rate limited
                retry_after = response.json().get("retry_after", 1)
                logger.warning(f"Discord rate limited, retry after {retry_after}s")
                return {
                    "success": False,
                    "error": f"Rate limited, retry after {retry_after}s",
                    "rate_limited": True,
                    "retry_after": retry_after,
                }
            else:
                error = f"Discord webhook returned {response.status_code}"
                try:
                    error_data = response.json()
                    error = error_data.get("message", error)
                except Exception:
                    pass
                logger.error(f"Discord send failed: {error}")
                return {"success": False, "error": error}

        except requests.RequestException as e:
            logger.error(f"Discord request error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Discord unexpected error: {e}")
            return {"success": False, "error": str(e)}

    def create_embed(
        self,
        title: str,
        body: str,
        category: NotificationCategory = NotificationCategory.SYSTEM,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create Discord embed for notification.

        Args:
            title: Embed title
            body: Embed description
            category: Category for color
            priority: Priority (overrides color for urgent/critical)
            data: Additional fields to add

        Returns:
            Discord embed object
        """
        # Determine color
        if priority in PRIORITY_COLORS:
            color = PRIORITY_COLORS[priority]
        else:
            color = CATEGORY_COLORS.get(category, 0x607D8B)  # Default grey

        embed = {
            "title": title[:256],  # Discord limit
            "description": body[:4096],  # Discord limit
            "color": color,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "footer": {
                "text": f"ChirpSyncer | {category.value.title()}"
            },
        }

        # Add fields from data
        if data:
            fields = []
            for key, value in list(data.items())[:25]:  # Max 25 fields
                formatted_key = key.replace("_", " ").title()
                fields.append({
                    "name": formatted_key[:256],
                    "value": str(value)[:1024],
                    "inline": True,
                })
            if fields:
                embed["fields"] = fields

        # Add priority indicator for urgent/critical
        if priority >= NotificationPriority.URGENT:
            priority_names = {
                NotificationPriority.URGENT: "URGENT",
                NotificationPriority.CRITICAL: "CRITICAL",
            }
            embed["title"] = f"[{priority_names.get(priority, 'URGENT')}] {embed['title']}"

        return embed

    def test_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """
        Test Discord webhook with a sample message.

        Args:
            webhook_url: Webhook URL to test

        Returns:
            Dict with success status
        """
        if not WEBHOOK_PATTERN.match(webhook_url):
            return {"success": False, "error": "Invalid webhook URL format"}

        payload = {
            "username": "ChirpSyncer",
            "content": "ChirpSyncer webhook test - Connection successful!",
        }

        try:
            response = requests.post(webhook_url, json=payload, timeout=10)
            return {
                "success": response.status_code == 204,
                "status_code": response.status_code,
            }
        except requests.RequestException as e:
            return {"success": False, "error": str(e)}
