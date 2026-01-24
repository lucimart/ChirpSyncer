"""
Base Pipeline for Content Atomization.

Abstract base class defining the pipeline interface.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BasePipeline(ABC):
    """
    Abstract base class for content analysis pipelines.

    Pipelines analyze source content and extract structured data
    that can be transformed into platform-specific formats.
    """

    @abstractmethod
    def analyze(self, source: str) -> Dict[str, Any]:
        """
        Analyze source content and extract structured data.

        Args:
            source: Source content (URL or raw text)

        Returns:
            Dictionary with analyzed content structure:
            - title: Content title
            - key_points: List of key points/takeaways
            - summary: Brief summary
            - source_type: Type of source content
            - Additional fields based on content type
        """
        pass

    @abstractmethod
    def transform(
        self, source: str, target_platform: str, options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Transform source content for a target platform.

        Args:
            source: Source content (URL or raw text)
            target_platform: Target platform (twitter, linkedin, etc.)
            options: Optional transformation options

        Returns:
            Dictionary with transformed content for the platform
        """
        pass

    def _extract_title(self, content: str) -> str:
        """Extract title from content."""
        lines = content.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line:
                # Remove markdown header prefix
                if line.startswith("#"):
                    return line.lstrip("#").strip()
                return line[:100]
        return "Untitled"

    def _extract_summary(self, content: str, max_length: int = 200) -> str:
        """Extract summary from content."""
        # Remove markdown formatting
        clean = content.replace("#", "").replace("*", "").replace("_", "")
        lines = [line.strip() for line in clean.split("\n") if line.strip()]

        # Skip title, get first substantial paragraph
        for line in lines[1:]:
            if len(line) > 50:
                if len(line) > max_length:
                    return line[:max_length].rsplit(" ", 1)[0] + "..."
                return line

        return lines[0][:max_length] if lines else ""
