"""
LinkedIn Transformer for Content Atomization.

Transforms content into LinkedIn-optimized format.
"""

import re
from typing import Any, Dict, List


class LinkedInTransformer:
    """
    Transform content for LinkedIn platform.

    Rules:
    - max_length: 3000 characters
    - tone: professional
    - add_cta: true (always include call-to-action)
    """

    MAX_LENGTH = 3000
    TONE = "professional"

    def transform(
        self, source_content: Dict[str, Any], **options
    ) -> Dict[str, Any]:
        """
        Transform content for LinkedIn.

        Args:
            source_content: Analyzed content dictionary
            **options: Additional options

        Returns:
            Transformed content for LinkedIn
        """
        title = source_content.get("title", "")
        key_points = source_content.get("key_points", [])
        summary = source_content.get("summary", "")
        topics = source_content.get("topics", [])

        # Build LinkedIn post structure
        content_parts = []

        # Hook/Opening
        hook = self._create_professional_hook(title, summary)
        content_parts.append(hook)

        # Key points with professional formatting
        if key_points:
            content_parts.append("")  # Empty line for spacing
            points_section = self._format_key_points(key_points)
            content_parts.append(points_section)

        # Insights/Takeaway
        takeaway = self._create_takeaway(source_content)
        if takeaway:
            content_parts.append("")
            content_parts.append(takeaway)

        # CTA
        cta = self._create_professional_cta()
        content_parts.append("")
        content_parts.append(cta)

        # Hashtags
        hashtags = self._generate_professional_hashtags(topics, title)
        if hashtags:
            content_parts.append("")
            content_parts.append(" ".join(f"#{h}" for h in hashtags))

        full_content = "\n".join(content_parts)

        # Truncate if needed
        if len(full_content) > self.MAX_LENGTH:
            full_content = self._truncate(full_content)

        return {
            "content": full_content,
            "tone": self.TONE,
            "format": "post",
            "hashtags": hashtags,
            "character_count": len(full_content),
        }

    def _create_professional_hook(self, title: str, summary: str) -> str:
        """Create professional opening hook."""
        hooks = [
            f"I've been thinking about {title.lower()} lately.",
            f"Here's what I learned about {title.lower()}:",
            f"Let's talk about {title.lower()}.",
            f"An insight on {title.lower()} that changed my perspective:",
        ]

        import random
        hook = random.choice(hooks)

        if summary:
            hook = f"{hook}\n\n{summary}"

        return hook

    def _format_key_points(self, key_points: List[str]) -> str:
        """Format key points with professional bullets."""
        formatted = []

        for point in key_points[:5]:  # Limit to 5 points
            # Clean up the point
            clean = point.strip()
            clean = re.sub(r"^[-*]\s*", "", clean)
            clean = re.sub(r"^\d+[\.\)]\s*", "", clean)

            # Add professional formatting
            formatted.append(f"-> {clean}")

        return "\n\n".join(formatted)

    def _create_takeaway(self, source_content: Dict[str, Any]) -> str:
        """Create professional takeaway section."""
        title = source_content.get("title", "")
        key_points = source_content.get("key_points", [])

        if not key_points:
            return ""

        takeaways = [
            "The key takeaway? Focus on what matters most to your audience.",
            "Remember: consistency and quality always win in the long run.",
            "The bottom line: start small, iterate fast, and keep learning.",
            f"My take: {title} is more important than ever in today's landscape.",
        ]

        import random
        return random.choice(takeaways)

    def _create_professional_cta(self) -> str:
        """Create professional call-to-action."""
        ctas = [
            "What are your thoughts on this? I'd love to hear your perspective in the comments.",
            "Agree or disagree? Share your experience below.",
            "Have you faced similar challenges? Let's discuss in the comments.",
            "What would you add to this list? Drop your insights below.",
            "Follow for more insights on topics like this.",
            "If you found this valuable, consider sharing it with your network.",
        ]

        import random
        return random.choice(ctas)

    def _generate_professional_hashtags(
        self, topics: List[str], title: str
    ) -> List[str]:
        """Generate professional hashtags for LinkedIn."""
        hashtags = []

        # Professional/business focused hashtags
        professional_tags = [
            "leadership",
            "business",
            "innovation",
            "growth",
            "success",
            "learning",
            "career",
            "productivity",
            "technology",
            "strategy",
        ]

        # Add from topics
        for topic in topics[:3]:
            clean = topic.lower().replace(" ", "")
            if len(clean) >= 3:
                hashtags.append(clean)

        # Add professional tags that might be relevant
        title_lower = title.lower()
        for tag in professional_tags:
            if tag in title_lower:
                hashtags.append(tag)

        # Always add a couple of general professional hashtags
        if "tips" in title_lower or "advice" in title_lower:
            hashtags.append("careeradvice")
        if "learn" in title_lower or "tutorial" in title_lower:
            hashtags.append("continuouslearning")

        # Deduplicate
        seen = set()
        clean_hashtags = []
        for h in hashtags:
            if h not in seen:
                seen.add(h)
                clean_hashtags.append(h)

        return clean_hashtags[:5]

    def _truncate(self, content: str) -> str:
        """Truncate content to fit LinkedIn limit."""
        if len(content) <= self.MAX_LENGTH:
            return content

        # Find a good breaking point
        truncated = content[: self.MAX_LENGTH - 50]

        # Try to break at paragraph
        last_newline = truncated.rfind("\n\n")
        if last_newline > self.MAX_LENGTH - 500:
            truncated = truncated[:last_newline]

        truncated += "\n\n[Read more...]"
        return truncated
