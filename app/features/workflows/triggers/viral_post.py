"""
Viral Post Trigger - Fires when a post exceeds engagement thresholds.
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class ViralPostTrigger(BaseTrigger):
    """
    Trigger that fires when a post exceeds engagement thresholds.

    Config:
        platform: Platform to watch
        threshold: Dict with metric thresholds (likes, retweets, replies, etc.)
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if post engagement exceeds all configured thresholds.

        Args:
            context: Event context with engagement metrics

        Returns:
            True if all thresholds are met
        """
        if context.get("event_type") != "engagement_update":
            return False

        platform = self.config.get("platform")
        if platform and context.get("platform") != platform:
            return False

        thresholds = self.config.get("threshold", {})

        for metric, threshold_value in thresholds.items():
            current_value = context.get(metric, 0)
            if current_value < threshold_value:
                return False

        return True

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract engagement data from context.

        Args:
            context: Event context

        Returns:
            Dict with post and engagement data
        """
        return {
            "post_id": context.get("post_id"),
            "platform": context.get("platform"),
            "content": context.get("content"),
            "likes": context.get("likes", 0),
            "retweets": context.get("retweets", 0),
            "replies": context.get("replies", 0),
            "impressions": context.get("impressions", 0),
        }
