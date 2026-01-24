"""
RSS Trigger - Fires when RSS feed has new items.
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class RSSTrigger(BaseTrigger):
    """
    Trigger that fires when an RSS feed has new items.

    Config:
        feed_url: URL of the RSS feed to monitor
        keywords: Optional list of keywords to filter items
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if this is an RSS feed update event.

        Args:
            context: Event context

        Returns:
            True if RSS feed has new matching items
        """
        if context.get("event_type") != "rss_update":
            return False

        # Check if feed_url matches
        feed_url = self.config.get("feed_url")
        if feed_url and context.get("feed_url") != feed_url:
            return False

        # Optional keyword filtering
        keywords = self.config.get("keywords", [])
        if keywords:
            item_title = context.get("title", "").lower()
            item_content = context.get("content", "").lower()
            combined = item_title + " " + item_content

            if not any(keyword.lower() in combined for keyword in keywords):
                return False

        return True

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract RSS item data from context.

        Args:
            context: Event context

        Returns:
            Dict with RSS item data
        """
        return {
            "feed_url": context.get("feed_url"),
            "item_id": context.get("item_id"),
            "title": context.get("title"),
            "content": context.get("content"),
            "link": context.get("link"),
            "published_at": context.get("published_at"),
        }
