"""
Cross Post Action - Post content to multiple platforms.
"""

from typing import Any, Dict, List

from app.features.workflows.actions.base import BaseAction


def post_to_platform(platform: str, content: str, media: List[str] = None) -> Dict[str, Any]:
    """
    Post content to a platform.

    This is a stub that will be replaced with actual platform posting logic.

    Args:
        platform: Target platform
        content: Post content
        media: Optional media attachments

    Returns:
        Dict with success status and post_id
    """
    # This will be implemented with actual platform connectors
    # For now, return a mock response
    return {"success": True, "post_id": f"{platform}_post_123"}


class CrossPostAction(BaseAction):
    """
    Action that posts content to multiple platforms.

    Config:
        platforms: List of target platforms (bluesky, threads, mastodon, etc.)
        adapt_content: Whether to adapt content for each platform (default: True)
    """

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post content to configured platforms.

        Args:
            context: Context with content and media

        Returns:
            Dict with success status and results per platform
        """
        platforms = self.config.get("platforms", [])
        adapt_content = self.config.get("adapt_content", True)

        content = context.get("content", "")
        media = context.get("media", [])

        results = []
        all_success = True

        for platform in platforms:
            try:
                # Optionally adapt content for platform
                platform_content = content
                if adapt_content:
                    platform_content = self._adapt_content(content, platform)

                result = post_to_platform(platform, platform_content, media)
                results.append({
                    "platform": platform,
                    "success": result.get("success", False),
                    "post_id": result.get("post_id"),
                })

                if not result.get("success"):
                    all_success = False

            except Exception as e:
                results.append({
                    "platform": platform,
                    "success": False,
                    "error": str(e),
                })
                all_success = False

        return {
            "success": all_success,
            "results": results,
        }

    def _adapt_content(self, content: str, platform: str) -> str:
        """
        Adapt content for a specific platform.

        Args:
            content: Original content
            platform: Target platform

        Returns:
            Adapted content string
        """
        # Platform-specific character limits
        limits = {
            "twitter": 280,
            "bluesky": 300,
            "mastodon": 500,
            "threads": 500,
        }

        limit = limits.get(platform, 500)

        if len(content) > limit:
            # Truncate with ellipsis
            return content[: limit - 3] + "..."

        return content
