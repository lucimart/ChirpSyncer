"""
Twitter Transformer for Content Atomization.

Transforms content into Twitter-optimized format.
"""

import re
from typing import Any, Dict, List, Optional


class TwitterTransformer:
    """
    Transform content for Twitter/X platform.

    Rules:
    - max_length: 280 characters per tweet
    - thread_split: true (split long content into thread)
    - hashtags: extract or generate relevant hashtags
    """

    MAX_TWEET_LENGTH = 280
    MAX_HASHTAGS = 5

    def transform(
        self, source_content: Dict[str, Any], format: str = "thread", **options
    ) -> Dict[str, Any]:
        """
        Transform content for Twitter.

        Args:
            source_content: Analyzed content dictionary
            format: Output format ('thread' or 'single')
            **options: Additional options

        Returns:
            Transformed content with tweets and hashtags
        """
        if format == "single":
            return self._transform_single(source_content)
        return self._transform_thread(source_content)

    def _transform_thread(self, source_content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content into Twitter thread.

        Args:
            source_content: Analyzed content

        Returns:
            Thread content with individual tweets
        """
        tweets = []
        hashtags = self._generate_hashtags(source_content)

        title = source_content.get("title", "")
        key_points = source_content.get("key_points", [])
        summary = source_content.get("summary", "")

        # First tweet: Hook with title
        first_tweet = self._create_hook_tweet(title, summary)
        tweets.append(first_tweet)

        # Middle tweets: Key points
        for i, point in enumerate(key_points, 1):
            tweet = self._format_point_tweet(point, i, len(key_points))
            tweets.append(tweet)

        # Last tweet: Conclusion with CTA
        last_tweet = self._create_closing_tweet(title, hashtags)
        tweets.append(last_tweet)

        return {
            "tweets": tweets,
            "tweet_count": len(tweets),
            "hashtags": hashtags,
            "format": "thread",
        }

    def _transform_single(self, source_content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform content into single tweet.

        Args:
            source_content: Analyzed content

        Returns:
            Single tweet content
        """
        title = source_content.get("title", "")
        summary = source_content.get("summary", "")
        hashtags = self._generate_hashtags(source_content)

        # Create concise tweet
        tweet_text = summary or title
        hashtag_text = " ".join(f"#{h}" for h in hashtags[:3])

        # Ensure we stay under limit
        max_content = self.MAX_TWEET_LENGTH - len(hashtag_text) - 2
        if len(tweet_text) > max_content:
            tweet_text = tweet_text[: max_content - 3] + "..."

        final_tweet = f"{tweet_text}\n\n{hashtag_text}".strip()

        return {
            "tweets": [final_tweet],
            "tweet_count": 1,
            "hashtags": hashtags,
            "format": "single",
        }

    def _create_hook_tweet(self, title: str, summary: str) -> str:
        """Create engaging first tweet."""
        # Use title as hook
        hook = title

        # Add thread indicator
        if len(hook) + 5 <= self.MAX_TWEET_LENGTH:
            hook = f"{hook}\n\n[Thread]"

        return self._truncate(hook)

    def _format_point_tweet(self, point: str, index: int, total: int) -> str:
        """Format a key point as a tweet."""
        # Add number prefix
        prefix = f"{index}/"

        # Clean up point
        clean_point = point.strip()
        clean_point = re.sub(r"^[-*]\s*", "", clean_point)  # Remove bullet
        clean_point = re.sub(r"^\d+[\.\)]\s*", "", clean_point)  # Remove numbering

        tweet = f"{prefix} {clean_point}"
        return self._truncate(tweet)

    def _create_closing_tweet(self, title: str, hashtags: List[str]) -> str:
        """Create closing tweet with CTA."""
        cta_options = [
            "Found this helpful? Follow for more!",
            "Save this thread for later!",
            "Like & retweet if you found this useful!",
            "What would you add to this list?",
        ]

        # Pick a CTA
        import random

        cta = random.choice(cta_options)

        # Add hashtags
        hashtag_text = " ".join(f"#{h}" for h in hashtags[: self.MAX_HASHTAGS])

        closing = f"{cta}\n\n{hashtag_text}"
        return self._truncate(closing)

    def _generate_hashtags(self, source_content: Dict[str, Any]) -> List[str]:
        """
        Generate relevant hashtags.

        Args:
            source_content: Analyzed content

        Returns:
            List of hashtag strings (without #)
        """
        hashtags = []

        # Use topics if available
        topics = source_content.get("topics", [])
        hashtags.extend(topics)

        # Extract from title
        title = source_content.get("title", "").lower()
        title_words = re.findall(r"\b(\w{4,})\b", title)
        for word in title_words:
            if word not in ["this", "that", "with", "from", "about", "have", "your"]:
                hashtags.append(word)

        # Common tech hashtags based on content type
        source_type = source_content.get("source_type", "")
        if source_type == "youtube":
            hashtags.extend(["youtube", "video"])
        elif source_type == "blog":
            hashtags.extend(["blog", "article"])

        # Deduplicate and clean
        seen = set()
        clean_hashtags = []
        for h in hashtags:
            h_clean = h.lower().replace(" ", "").replace("-", "")
            if h_clean and h_clean not in seen and len(h_clean) <= 20:
                seen.add(h_clean)
                clean_hashtags.append(h_clean)

        return clean_hashtags[: self.MAX_HASHTAGS * 2]

    def _truncate(self, text: str) -> str:
        """Truncate text to fit Twitter limit."""
        if len(text) <= self.MAX_TWEET_LENGTH:
            return text

        # Find a good breaking point
        truncated = text[: self.MAX_TWEET_LENGTH - 3]

        # Try to break at word boundary
        last_space = truncated.rfind(" ")
        if last_space > self.MAX_TWEET_LENGTH - 50:
            truncated = truncated[:last_space]

        return truncated + "..."
