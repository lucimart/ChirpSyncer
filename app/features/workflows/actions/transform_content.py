"""
Transform Content Action - Adapt content for different platforms.
"""

import re
from typing import Any, Dict

from app.features.workflows.actions.base import BaseAction


class TransformContentAction(BaseAction):
    """
    Action that transforms content for a target platform.

    Config:
        target_platform: Platform to transform content for
        max_length: Maximum content length
        strip_hashtags: Remove hashtags (default: False)
        strip_mentions: Remove mentions (default: False)
        add_source: Add source attribution (default: False)
    """

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content based on configuration.

        Args:
            context: Context with content to transform

        Returns:
            Dict with success status and transformed_content
        """
        content = context.get("content", "")
        target_platform = self.config.get("target_platform", "generic")

        try:
            transformed = self._transform(content, target_platform)

            return {
                "success": True,
                "transformed_content": transformed,
                "original_length": len(content),
                "transformed_length": len(transformed),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def _transform(self, content: str, platform: str) -> str:
        """
        Apply transformations to content.

        Args:
            content: Original content
            platform: Target platform

        Returns:
            Transformed content
        """
        result = content

        # Strip hashtags if configured
        if self.config.get("strip_hashtags", False):
            result = re.sub(r"#\w+", "", result)

        # Strip mentions if configured
        if self.config.get("strip_mentions", False):
            result = re.sub(r"@\w+", "", result)

        # Clean up extra whitespace
        result = re.sub(r"\s+", " ", result).strip()

        # Apply max length
        max_length = self.config.get("max_length")
        if not max_length:
            # Platform defaults
            max_length = {
                "twitter": 280,
                "bluesky": 300,
                "mastodon": 500,
                "threads": 500,
                "generic": 500,
            }.get(platform, 500)

        if len(result) > max_length:
            result = result[: max_length - 3] + "..."

        # Add source attribution if configured
        if self.config.get("add_source", False):
            source = context.get("platform", "original")
            attribution = f"\n\n(via {source})"
            if len(result) + len(attribution) <= max_length:
                result += attribution

        return result
