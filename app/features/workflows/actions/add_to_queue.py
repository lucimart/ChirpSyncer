"""
Add to Queue Action - Add content to posting queue for later.
"""

from datetime import datetime, timedelta
from typing import Any, Dict

from app.features.workflows.actions.base import BaseAction


def schedule_post(
    user_id: int,
    content: str,
    platform: str,
    scheduled_time: datetime,
    media: list = None,
) -> Dict[str, Any]:
    """
    Schedule a post for later.

    This is a stub that will be replaced with actual scheduling logic.

    Args:
        user_id: User ID
        content: Post content
        platform: Target platform
        scheduled_time: When to post
        media: Optional media attachments

    Returns:
        Dict with scheduled_id
    """
    # Will be implemented with actual TweetScheduler integration
    return {"scheduled_id": 123, "scheduled_time": scheduled_time.isoformat()}


class AddToQueueAction(BaseAction):
    """
    Action that adds content to the posting queue.

    Config:
        delay_minutes: Delay before posting (default: 0)
        platform: Target platform for the scheduled post
        optimal_time: Use ML-based optimal time selection (default: False)
    """

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add content to posting queue.

        Args:
            context: Context with content and user_id

        Returns:
            Dict with success status and scheduled_id
        """
        content = context.get("content", "")
        user_id = context.get("user_id")
        media = context.get("media", [])

        if not user_id:
            return {
                "success": False,
                "error": "user_id required",
            }

        platform = self.config.get("platform", "twitter")
        delay_minutes = self.config.get("delay_minutes", 0)
        use_optimal_time = self.config.get("optimal_time", False)

        try:
            if use_optimal_time:
                scheduled_time = self._get_optimal_time(user_id, platform)
            else:
                scheduled_time = datetime.now() + timedelta(minutes=delay_minutes)

            result = schedule_post(
                user_id=user_id,
                content=content,
                platform=platform,
                scheduled_time=scheduled_time,
                media=media,
            )

            return {
                "success": True,
                "scheduled_id": result.get("scheduled_id"),
                "scheduled_time": result.get("scheduled_time"),
                "platform": platform,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def _get_optimal_time(self, user_id: int, platform: str) -> datetime:
        """
        Get optimal posting time for user.

        Args:
            user_id: User ID
            platform: Target platform

        Returns:
            Optimal datetime for posting
        """
        # This would integrate with the ML scheduling system
        # For now, return a reasonable default (next hour)
        now = datetime.now()
        next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        return next_hour
