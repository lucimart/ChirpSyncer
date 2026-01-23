"""
Video Pipeline for Content Atomization.

Handles YouTube and video content analysis.
"""

import re
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from app.features.atomization.pipelines.base import BasePipeline


class VideoPipeline(BasePipeline):
    """
    Pipeline for video content (YouTube, etc.).

    Analyzes video metadata and transcripts to extract
    key points and generate platform-specific content.
    """

    def analyze(self, source: str) -> Dict[str, Any]:
        """
        Analyze video URL and extract structured data.

        Args:
            source: Video URL (YouTube, etc.)

        Returns:
            Analyzed content with title, key points, etc.
        """
        # Fetch video metadata
        metadata = self._fetch_video_metadata(source)

        # Extract key points from transcript
        key_points = self._extract_key_points(metadata.get("transcript", ""))

        # Extract topics for hashtags
        topics = self._extract_topics(
            metadata.get("title", ""),
            metadata.get("description", ""),
            metadata.get("transcript", ""),
        )

        return {
            "source_type": "youtube",
            "url": source,
            "title": metadata.get("title", ""),
            "description": metadata.get("description", ""),
            "channel": metadata.get("channel", ""),
            "duration": metadata.get("duration", 0),
            "transcript": metadata.get("transcript", ""),
            "key_points": key_points,
            "topics": topics,
            "summary": self._generate_summary(metadata),
        }

    def transform(
        self, source: str, target_platform: str, options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Transform video content for target platform.

        Args:
            source: Video URL
            target_platform: Target platform
            options: Optional transformation options

        Returns:
            Transformed content for the platform
        """
        analyzed = self.analyze(source)

        # Use appropriate transformer
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

    def _fetch_video_metadata(self, url: str) -> Dict[str, Any]:
        """
        Fetch video metadata from URL.

        This is a placeholder - real implementation would use
        YouTube Data API and transcript services.

        Args:
            url: Video URL

        Returns:
            Video metadata dictionary
        """
        # Extract video ID from URL
        video_id = self._extract_video_id(url)

        # In production, this would call YouTube API
        # For now, return placeholder structure
        return {
            "video_id": video_id,
            "title": "",
            "description": "",
            "channel": "",
            "duration": 0,
            "transcript": "",
        }

    def _extract_video_id(self, url: str) -> Optional[str]:
        """Extract YouTube video ID from URL."""
        parsed = urlparse(url)

        # Standard youtube.com/watch?v= format
        if "youtube.com" in parsed.netloc:
            query = parse_qs(parsed.query)
            return query.get("v", [None])[0]

        # Short youtu.be format
        if "youtu.be" in parsed.netloc:
            return parsed.path.strip("/")

        return None

    def _extract_key_points(self, transcript: str) -> List[str]:
        """
        Extract key points from video transcript.

        Args:
            transcript: Video transcript text

        Returns:
            List of key points
        """
        if not transcript:
            return []

        key_points = []

        # Look for numbered points (1., First, etc.)
        numbered_pattern = r"(?:^|\n)\s*(?:\d+[\.\):]|(?:first|second|third|fourth|fifth|next|finally)[,:]?)\s*(.+?)(?=\n|$)"
        matches = re.findall(numbered_pattern, transcript, re.IGNORECASE)
        key_points.extend([m.strip() for m in matches if len(m.strip()) > 20])

        # Look for "tip" patterns
        tip_pattern = r"(?:tip|point|key|important|remember)[:\s]+(.+?)(?=\n|$)"
        tip_matches = re.findall(tip_pattern, transcript, re.IGNORECASE)
        key_points.extend([m.strip() for m in tip_matches if len(m.strip()) > 20])

        # Deduplicate and limit
        seen = set()
        unique_points = []
        for point in key_points:
            point_lower = point.lower()[:50]
            if point_lower not in seen:
                seen.add(point_lower)
                unique_points.append(point)

        return unique_points[:10]

    def _extract_topics(
        self, title: str, description: str, transcript: str
    ) -> List[str]:
        """
        Extract topics/keywords for hashtags.

        Args:
            title: Video title
            description: Video description
            transcript: Video transcript

        Returns:
            List of topic keywords
        """
        # Common tech/content keywords to look for
        tech_keywords = [
            "python",
            "javascript",
            "react",
            "programming",
            "coding",
            "developer",
            "software",
            "api",
            "data",
            "machine learning",
            "ai",
            "web",
            "mobile",
            "cloud",
            "startup",
            "business",
            "marketing",
            "design",
            "productivity",
            "career",
        ]

        combined_text = f"{title} {description} {transcript}".lower()
        found_topics = []

        for keyword in tech_keywords:
            if keyword in combined_text:
                found_topics.append(keyword.replace(" ", ""))

        # Extract hashtags from description if present
        existing_hashtags = re.findall(r"#(\w+)", description)
        found_topics.extend([h.lower() for h in existing_hashtags])

        # Deduplicate
        return list(dict.fromkeys(found_topics))[:10]

    def _generate_summary(self, metadata: Dict[str, Any]) -> str:
        """Generate a brief summary from metadata."""
        title = metadata.get("title", "")
        description = metadata.get("description", "")

        if description:
            # Use first sentence or line of description
            first_line = description.split("\n")[0].strip()
            if len(first_line) > 200:
                return first_line[:197] + "..."
            return first_line

        return title
