"""
New Post Trigger - Fires when user creates a new post on a platform.
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class NewPostTrigger(BaseTrigger):
    """
    Trigger that fires when a user creates a new post.

    Config:
        platform: Platform to watch (twitter, bluesky, etc.)
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if this is a new post event on the configured platform.

        Args:
            context: Event context with event_type and platform

        Returns:
            True if new post event matches configured platform
        """
        if context.get("event_type") != "new_post":
            return False

        platform = self.config.get("platform")
        if platform and context.get("platform") != platform:
            return False

        return True

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract post data from context.

        Args:
            context: Event context

        Returns:
            Dict with post_id, platform, content, author
        """
        return {
            "post_id": context.get("post_id"),
            "platform": context.get("platform"),
            "content": context.get("content"),
            "author": context.get("author"),
            "media": context.get("media", []),
            "created_at": context.get("created_at"),
        }
