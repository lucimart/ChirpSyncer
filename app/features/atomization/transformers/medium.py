"""
Medium Transformer for Content Atomization.

Transforms content into Medium article format.
"""

import re
from typing import Any, Dict, List


class MediumTransformer:
    """
    Transform content for Medium platform.

    Rules:
    - format: markdown
    - add_header_image: true (suggest header image)
    - structure: proper article with intro, body, conclusion
    """

    def transform(
        self, source_content: Dict[str, Any], **options
    ) -> Dict[str, Any]:
        """
        Transform content for Medium article.

        Args:
            source_content: Analyzed content dictionary
            **options: Additional options

        Returns:
            Transformed content in markdown format
        """
        title = source_content.get("title", "Untitled")
        key_points = source_content.get("key_points", [])
        summary = source_content.get("summary", "")
        detailed_content = source_content.get("detailed_content", "")
        topics = source_content.get("topics", [])

        # Build article structure
        sections = []

        # Title
        sections.append(f"# {title}")
        sections.append("")

        # Subtitle/Hook
        subtitle = self._create_subtitle(title, summary)
        sections.append(f"*{subtitle}*")
        sections.append("")

        # Introduction
        intro = self._create_introduction(title, summary, source_content)
        sections.append(intro)
        sections.append("")

        # Main content sections
        if detailed_content:
            # Use existing content if available
            body = self._format_existing_content(detailed_content)
        else:
            # Generate from key points
            body = self._generate_body_from_points(key_points, title)

        sections.append(body)
        sections.append("")

        # Conclusion
        conclusion = self._create_conclusion(title, key_points)
        sections.append("## Conclusion")
        sections.append("")
        sections.append(conclusion)
        sections.append("")

        # Call to action
        cta = self._create_article_cta()
        sections.append("---")
        sections.append("")
        sections.append(cta)

        # Tags
        tags = self._generate_tags(topics, title)

        full_content = "\n".join(sections)

        return {
            "content": full_content,
            "format": "markdown",
            "title": title,
            "subtitle": subtitle,
            "tags": tags,
            "header_image_suggestion": self._suggest_header_image(title, topics),
            "estimated_read_time": self._estimate_read_time(full_content),
        }

    def _create_subtitle(self, title: str, summary: str) -> str:
        """Create engaging subtitle."""
        if summary:
            # Use summary as subtitle if it's short enough
            if len(summary) < 150:
                return summary

            # Otherwise, take first sentence
            first_sentence = summary.split(".")[0]
            return first_sentence + "."

        # Generate from title
        subtitles = [
            f"A comprehensive guide to {title.lower()}",
            f"Everything you need to know about {title.lower()}",
            f"Practical insights on {title.lower()}",
        ]

        import random
        return random.choice(subtitles)

    def _create_introduction(
        self, title: str, summary: str, source_content: Dict
    ) -> str:
        """Create article introduction."""
        source_type = source_content.get("source_type", "")

        intros = []

        if source_type == "youtube":
            channel = source_content.get("channel", "")
            intros.append(
                f"This article is based on insights from {channel}'s video "
                f"about {title.lower()}. Let's dive into the key takeaways."
            )
        elif source_type == "thread":
            intros.append(
                f"I recently shared a thread about {title.lower()} that "
                "resonated with many of you. Here's an expanded version "
                "with additional context and examples."
            )
        else:
            intros.append(
                f"In this article, we'll explore {title.lower()} and discover "
                "practical insights you can apply immediately."
            )

        intro = intros[0] if intros else ""

        if summary:
            intro += f"\n\n{summary}"

        return intro

    def _format_existing_content(self, content: str) -> str:
        """Format existing detailed content for Medium."""
        # Ensure proper markdown formatting
        formatted = content

        # Convert plain bullet points to proper markdown
        formatted = re.sub(r"^- ", "* ", formatted, flags=re.MULTILINE)

        # Ensure headers have proper spacing
        formatted = re.sub(r"(#+\s+.+)(\n)([^#\n])", r"\1\2\n\3", formatted)

        return formatted

    def _generate_body_from_points(
        self, key_points: List[str], title: str
    ) -> str:
        """Generate article body from key points."""
        if not key_points:
            return "*(Content to be expanded)*"

        sections = []

        # Create a section for each key point
        for i, point in enumerate(key_points, 1):
            # Create section header
            header = self._point_to_header(point, i)
            sections.append(f"## {header}")
            sections.append("")

            # Expand the point
            expanded = self._expand_point(point)
            sections.append(expanded)
            sections.append("")

        return "\n".join(sections)

    def _point_to_header(self, point: str, index: int) -> str:
        """Convert a key point to section header."""
        # Clean up
        clean = point.strip()
        clean = re.sub(r"^[-*]\s*", "", clean)
        clean = re.sub(r"^\d+[\.\)]\s*", "", clean)

        # Take first phrase or sentence
        if ":" in clean[:50]:
            header = clean.split(":")[0]
        elif "." in clean[:50]:
            header = clean.split(".")[0]
        else:
            header = clean[:50]

        # Capitalize properly
        return header.strip().title()

    def _expand_point(self, point: str) -> str:
        """Expand a key point into a paragraph."""
        clean = point.strip()
        clean = re.sub(r"^[-*]\s*", "", clean)
        clean = re.sub(r"^\d+[\.\)]\s*", "", clean)

        # Add some context
        expansion = f"{clean}\n\nThis is particularly important because it helps "
        expansion += "you achieve better results with less effort. Consider how "
        expansion += "this applies to your specific situation and adapt accordingly."

        return expansion

    def _create_conclusion(self, title: str, key_points: List[str]) -> str:
        """Create article conclusion."""
        point_count = len(key_points)

        conclusion = f"We've covered {point_count} key aspects of {title.lower()}. "
        conclusion += "The most important thing to remember is that success comes "
        conclusion += "from consistent application of these principles.\n\n"
        conclusion += "Start with one or two of these insights and gradually "
        conclusion += "incorporate the rest into your workflow. Small, consistent "
        conclusion += "improvements lead to significant results over time."

        return conclusion

    def _create_article_cta(self) -> str:
        """Create article call-to-action."""
        ctas = [
            "**Did you find this article helpful?** Follow me for more insights "
            "on similar topics. If you have questions or want to share your "
            "experience, leave a comment below!",
            "**Want to dive deeper?** Follow me for more articles like this. "
            "I publish weekly insights on productivity, technology, and personal "
            "growth.",
            "**Thanks for reading!** If this article resonated with you, consider "
            "sharing it with someone who might benefit. And don't forget to follow "
            "for more content like this.",
        ]

        import random
        return random.choice(ctas)

    def _generate_tags(self, topics: List[str], title: str) -> List[str]:
        """Generate Medium tags."""
        tags = []

        # From topics
        for topic in topics[:3]:
            clean = topic.lower().replace(" ", "-")
            tags.append(clean)

        # From title keywords
        title_words = title.lower().split()
        for word in title_words:
            if len(word) > 3 and word not in ["this", "that", "with", "from"]:
                tags.append(word)

        # Common Medium tags
        common = ["productivity", "self-improvement", "technology", "programming"]
        for tag in common:
            if tag in title.lower() or tag in " ".join(topics).lower():
                tags.append(tag)

        # Deduplicate and limit
        seen = set()
        clean_tags = []
        for tag in tags:
            if tag not in seen:
                seen.add(tag)
                clean_tags.append(tag)

        return clean_tags[:5]

    def _suggest_header_image(self, title: str, topics: List[str]) -> Dict[str, Any]:
        """Suggest header image characteristics."""
        return {
            "suggestion": f"An inspiring image related to {title.lower()}",
            "keywords": topics[:3] if topics else [title.split()[0].lower()],
            "style": "professional, modern, clean",
            "sources": ["Unsplash", "Pexels", "custom illustration"],
        }

    def _estimate_read_time(self, content: str) -> int:
        """Estimate reading time in minutes."""
        words = len(content.split())
        # Average reading speed: 200-250 words per minute
        minutes = words / 225
        return max(1, round(minutes))
