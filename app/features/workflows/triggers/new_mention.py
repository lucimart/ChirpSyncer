"""
New Mention Trigger - Fires when someone mentions the user.
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class NewMentionTrigger(BaseTrigger):
    """
    Trigger that fires when someone mentions the user.

    Config:
        platform: Platform to watch for mentions
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if this is a mention event on the configured platform.

        Args:
            context: Event context

        Returns:
            True if mention event matches platform
        """
        if context.get("event_type") != "new_mention":
            return False

        platform = self.config.get("platform")
        if platform and context.get("platform") != platform:
            return False

        return True

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract mention data from context.

        Args:
            context: Event context

        Returns:
            Dict with mention details
        """
        return {
            "post_id": context.get("post_id"),
            "platform": context.get("platform"),
            "mentioned_user": context.get("mentioned_user"),
            "mentioning_user": context.get("mentioning_user"),
            "content": context.get("content"),
            "created_at": context.get("created_at"),
        }
