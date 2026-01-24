"""
Blog Pipeline for Content Atomization.

Handles blog post and article content analysis.
"""

import re
from typing import Any, Dict, List, Optional

from app.features.atomization.pipelines.base import BasePipeline


class BlogPipeline(BasePipeline):
    """
    Pipeline for blog post content.

    Analyzes blog structure, sections, and key points
    to generate platform-specific content.
    """

    def analyze(self, source: str) -> Dict[str, Any]:
        """
        Analyze blog post content.

        Args:
            source: Blog post content (markdown or plain text)

        Returns:
            Analyzed content with title, sections, key points, etc.
        """
        title = self._extract_title(source)
        sections = self._extract_sections(source)
        key_points = self._extract_key_points(source)
        word_count = len(source.split())
        topics = self._extract_topics(source)

        return {
            "source_type": "blog",
            "title": title,
            "sections": sections,
            "key_points": key_points,
            "word_count": word_count,
            "topics": topics,
            "summary": self._extract_summary(source),
            "detailed_content": source,
        }

    def transform(
        self, source: str, target_platform: str, options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Transform blog content for target platform.

        Args:
            source: Blog post content
            target_platform: Target platform
            options: Optional transformation options

        Returns:
            Transformed content for the platform
        """
        analyzed = self.analyze(source)

        from app.features.atomization.transformers import (
            TwitterTransformer,
            LinkedInTransformer,
            MediumTransformer,
            InstagramTransformer,
        )

        transformers = {
            "twitter": TwitterTransformer(),
            "linkedin": LinkedInTransformer(),
            "medium": MediumTransformer(),
            "instagram": InstagramTransformer(),
        }

        transformer = transformers.get(target_platform)
        if not transformer:
            raise ValueError(f"Unsupported platform: {target_platform}")

        return transformer.transform(analyzed, **(options or {}))

    def _extract_sections(self, content: str) -> List[Dict[str, str]]:
        """
        Extract sections from blog post.

        Args:
            content: Blog post content

        Returns:
            List of section dictionaries with title and content
        """
        sections = []

        # Split by markdown headers (allow leading whitespace)
        header_pattern = r"^\s*(#{1,3})\s+(.+)$"
        lines = content.split("\n")

        current_section = None
        current_content = []

        for line in lines:
            match = re.match(header_pattern, line.rstrip())
            if match:
                # Save previous section
                if current_section:
                    sections.append(
                        {
                            "level": len(current_section["level"]),
                            "title": current_section["title"],
                            "content": "\n".join(current_content).strip(),
                        }
                    )

                # Start new section
                current_section = {"level": match.group(1), "title": match.group(2)}
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section:
            sections.append(
                {
                    "level": len(current_section["level"]),
                    "title": current_section["title"],
                    "content": "\n".join(current_content).strip(),
                }
            )

        return sections

    def _extract_key_points(self, content: str) -> List[str]:
        """
        Extract key points from blog content.

        Args:
            content: Blog post content

        Returns:
            List of key points
        """
        key_points = []

        # Look for bullet points
        bullet_pattern = r"^\s*[-*]\s*\*?\*?(.+?)\*?\*?\s*$"
        for line in content.split("\n"):
            match = re.match(bullet_pattern, line)
            if match:
                point = match.group(1).strip()
                if len(point) > 20 and len(point) < 200:
                    key_points.append(point)

        # Look for numbered lists
        numbered_pattern = r"^\s*\d+[\.\)]\s*\*?\*?(.+?)\*?\*?\s*$"
        for line in content.split("\n"):
            match = re.match(numbered_pattern, line)
            if match:
                point = match.group(1).strip()
                if len(point) > 20 and len(point) < 200:
                    key_points.append(point)

        # Look for bold text as key points
        bold_pattern = r"\*\*(.+?)\*\*"
        bold_matches = re.findall(bold_pattern, content)
        for match in bold_matches:
            if len(match) > 10 and len(match) < 100:
                key_points.append(match)

        # Deduplicate while preserving order
        seen = set()
        unique_points = []
        for point in key_points:
            point_lower = point.lower()
            if point_lower not in seen:
                seen.add(point_lower)
                unique_points.append(point)

        return unique_points[:10]

    def _extract_topics(self, content: str) -> List[str]:
        """
        Extract topics/keywords from blog content.

        Args:
            content: Blog post content

        Returns:
            List of topic keywords
        """
        # Look for existing hashtags
        existing = re.findall(r"#(\w+)", content)

        # Extract from common patterns
        common_keywords = [
            "python",
            "javascript",
            "react",
            "api",
            "programming",
            "coding",
            "developer",
            "software",
            "web",
            "data",
            "machine learning",
            "ai",
            "cloud",
            "devops",
            "startup",
            "business",
            "marketing",
            "productivity",
            "career",
            "tutorial",
            "guide",
            "tips",
        ]

        content_lower = content.lower()
        found = [kw for kw in common_keywords if kw in content_lower]

        # Combine and deduplicate
        all_topics = [h.lower() for h in existing] + [
            kw.replace(" ", "") for kw in found
        ]
        return list(dict.fromkeys(all_topics))[:10]
