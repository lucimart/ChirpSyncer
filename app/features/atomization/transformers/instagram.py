"""
Instagram Transformer for Content Atomization.

Transforms content into Instagram-optimized format.
"""

import re
from typing import Any, Dict, List


class InstagramTransformer:
    """
    Transform content for Instagram platform.

    Rules:
    - max_length: 2200 characters for caption
    - hashtags: 20-30 relevant hashtags
    - carousel_slides: extract key points for carousel
    """

    MAX_CAPTION_LENGTH = 2200
    MIN_HASHTAGS = 20
    MAX_HASHTAGS = 30

    def transform(
        self, source_content: Dict[str, Any], format: str = "post", **options
    ) -> Dict[str, Any]:
        """
        Transform content for Instagram.

        Args:
            source_content: Analyzed content dictionary
            format: Output format ('post' or 'carousel')
            **options: Additional options

        Returns:
            Transformed content for Instagram
        """
        if format == "carousel":
            return self._transform_carousel(source_content)
        return self._transform_post(source_content)

    def _transform_post(self, source_content: Dict[str, Any]) -> Dict[str, Any]:
        """Transform content for Instagram post."""
        title = source_content.get("title", "")
        key_points = source_content.get("key_points", [])
        summary = source_content.get("summary", "")
        topics = source_content.get("topics", [])

        # Build caption
        caption_parts = []

        # Hook
        hook = self._create_instagram_hook(title)
        caption_parts.append(hook)
        caption_parts.append("")

        # Key points (condensed)
        if key_points:
            points_text = self._format_points_for_caption(key_points[:5])
            caption_parts.append(points_text)
            caption_parts.append("")

        # CTA
        cta = self._create_instagram_cta()
        caption_parts.append(cta)
        caption_parts.append("")

        # Separator
        caption_parts.append(".")
        caption_parts.append(".")
        caption_parts.append(".")
        caption_parts.append("")

        # Hashtags
        hashtags = self._generate_instagram_hashtags(topics, title)
        hashtag_text = " ".join(f"#{h}" for h in hashtags)
        caption_parts.append(hashtag_text)

        caption = "\n".join(caption_parts)

        # Truncate if needed
        if len(caption) > self.MAX_CAPTION_LENGTH:
            caption = self._truncate_caption(caption, hashtags)

        return {
            "caption": caption,
            "hashtags": hashtags,
            "format": "post",
            "image_suggestions": self._suggest_post_images(title, key_points),
        }

    def _transform_carousel(self, source_content: Dict[str, Any]) -> Dict[str, Any]:
        """Transform content for Instagram carousel."""
        title = source_content.get("title", "")
        key_points = source_content.get("key_points", [])
        topics = source_content.get("topics", [])

        # Generate carousel slides
        slides = self._generate_carousel_slides(title, key_points)

        # Generate caption
        caption_parts = []

        hook = self._create_carousel_hook(title, len(slides))
        caption_parts.append(hook)
        caption_parts.append("")

        cta = "Swipe to see all the tips! Save this post for later!"
        caption_parts.append(cta)
        caption_parts.append("")

        # Separator
        caption_parts.append(".")
        caption_parts.append(".")
        caption_parts.append(".")
        caption_parts.append("")

        # Hashtags
        hashtags = self._generate_instagram_hashtags(topics, title)
        hashtag_text = " ".join(f"#{h}" for h in hashtags)
        caption_parts.append(hashtag_text)

        caption = "\n".join(caption_parts)

        return {
            "caption": caption,
            "hashtags": hashtags,
            "carousel_slides": slides,
            "format": "carousel",
            "slide_count": len(slides),
        }

    def _create_instagram_hook(self, title: str) -> str:
        """Create engaging Instagram hook."""
        hooks = [
            f"Stop scrolling! Here's what you need to know about {title.lower()}",
            f"Save this for later! {title}",
            f"This is IMPORTANT. {title}",
            f"POV: You finally understand {title.lower()}",
        ]

        import random
        return random.choice(hooks)

    def _create_carousel_hook(self, title: str, slide_count: int) -> str:
        """Create hook for carousel post."""
        return f"{slide_count} things you need to know about {title.lower()}"

    def _format_points_for_caption(self, key_points: List[str]) -> str:
        """Format key points for Instagram caption."""
        formatted = []

        for i, point in enumerate(key_points, 1):
            clean = point.strip()
            clean = re.sub(r"^[-*]\s*", "", clean)
            clean = re.sub(r"^\d+[\.\)]\s*", "", clean)

            # Truncate if too long
            if len(clean) > 100:
                clean = clean[:97] + "..."

            formatted.append(f"{i}. {clean}")

        return "\n".join(formatted)

    def _create_instagram_cta(self) -> str:
        """Create Instagram call-to-action."""
        ctas = [
            "Double tap if you agree! Follow @yourhandle for more tips like this.",
            "Save this post! Which tip resonates with you most? Comment below!",
            "Tag someone who needs to see this!",
            "Follow for daily tips! Drop a comment if you found this helpful.",
        ]

        import random
        return random.choice(ctas)

    def _generate_instagram_hashtags(
        self, topics: List[str], title: str
    ) -> List[str]:
        """
        Generate Instagram hashtags (20-30 tags).

        Args:
            topics: List of content topics
            title: Content title

        Returns:
            List of hashtags
        """
        hashtags = []

        # Niche/topic specific hashtags
        for topic in topics:
            clean = topic.lower().replace(" ", "")
            if clean:
                hashtags.append(clean)
                # Add variations
                hashtags.append(f"{clean}tips")
                hashtags.append(f"{clean}101")

        # Title keywords
        title_words = re.findall(r"\b(\w{4,})\b", title.lower())
        for word in title_words:
            if word not in ["this", "that", "with", "from", "about", "your", "have"]:
                hashtags.append(word)

        # General engagement hashtags
        general_hashtags = [
            "tips",
            "advice",
            "motivation",
            "inspiration",
            "growth",
            "success",
            "learn",
            "knowledge",
            "education",
            "selfimprovement",
            "personaldevelopment",
            "mindset",
            "lifestyle",
            "goals",
            "daily",
            "instagood",
            "instadaily",
            "viral",
            "trending",
            "explore",
            "explorepage",
        ]
        hashtags.extend(general_hashtags)

        # Tech/professional hashtags if relevant
        tech_keywords = ["coding", "programming", "tech", "developer", "software"]
        title_lower = title.lower()
        topics_lower = " ".join(topics).lower()
        if any(kw in title_lower or kw in topics_lower for kw in tech_keywords):
            tech_hashtags = [
                "coding",
                "programming",
                "developer",
                "webdeveloper",
                "softwareengineer",
                "codinglife",
                "programminglife",
                "learntocode",
                "coder",
                "tech",
            ]
            hashtags.extend(tech_hashtags)

        # Deduplicate and limit
        seen = set()
        clean_hashtags = []
        for h in hashtags:
            h_clean = h.lower().replace(" ", "").replace("-", "")
            if h_clean and h_clean not in seen and len(h_clean) <= 30:
                seen.add(h_clean)
                clean_hashtags.append(h_clean)

        # Ensure we have 20-30 hashtags
        if len(clean_hashtags) < self.MIN_HASHTAGS:
            filler = [
                "content",
                "creator",
                "community",
                "follow",
                "share",
                "save",
                "like",
                "comment",
                "engage",
                "grow",
            ]
            for f in filler:
                if f not in seen and len(clean_hashtags) < self.MIN_HASHTAGS:
                    clean_hashtags.append(f)
                    seen.add(f)

        return clean_hashtags[: self.MAX_HASHTAGS]

    def _generate_carousel_slides(
        self, title: str, key_points: List[str]
    ) -> List[Dict[str, str]]:
        """Generate carousel slide content."""
        slides = []

        # Cover slide
        slides.append(
            {
                "type": "cover",
                "text": title,
                "subtext": f"{len(key_points)} key insights",
            }
        )

        # Content slides
        for i, point in enumerate(key_points[:8], 1):  # Max 8 content slides
            clean = point.strip()
            clean = re.sub(r"^[-*]\s*", "", clean)
            clean = re.sub(r"^\d+[\.\)]\s*", "", clean)

            slides.append(
                {
                    "type": "content",
                    "number": i,
                    "text": clean[:150],  # Keep text short for slides
                }
            )

        # Closing slide
        slides.append(
            {
                "type": "closing",
                "text": "Save this post!",
                "subtext": "Follow for more tips",
            }
        )

        return slides

    def _suggest_post_images(
        self, title: str, key_points: List[str]
    ) -> List[Dict[str, str]]:
        """Suggest images for post."""
        return [
            {
                "suggestion": f"Visual representing {title.lower()}",
                "style": "Clean, minimal design with bold typography",
                "colors": "Brand colors or trending palette",
            }
        ]

    def _truncate_caption(self, caption: str, hashtags: List[str]) -> str:
        """Truncate caption to fit Instagram limit."""
        # Calculate space needed for hashtags
        hashtag_text = " ".join(f"#{h}" for h in hashtags)
        separator = "\n.\n.\n.\n\n"
        reserved = len(separator) + len(hashtag_text)

        max_content = self.MAX_CAPTION_LENGTH - reserved - 10

        # Find content part (before separator)
        parts = caption.split(".\n.\n.")
        content = parts[0] if parts else caption

        if len(content) > max_content:
            content = content[:max_content - 3] + "..."

        # Rebuild caption
        return f"{content}{separator}{hashtag_text}"
