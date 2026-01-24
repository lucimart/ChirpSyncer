"""
Thread Pipeline for Content Atomization.

Handles Twitter/X thread content analysis.
"""

import re
from typing import Any, Dict, List, Optional

from app.features.atomization.pipelines.base import BasePipeline


class ThreadPipeline(BasePipeline):
    """
    Pipeline for thread content (Twitter threads, etc.).

    Analyzes thread structure and content to enable
    transformation to other formats.
    """

    def analyze(self, source: str) -> Dict[str, Any]:
        """
        Analyze thread content.

        Args:
            source: Thread content (numbered tweets)

        Returns:
            Analyzed content with individual tweets and metadata
        """
        tweets = self._parse_thread(source)
        title = self._extract_thread_title(tweets)
        key_points = self._extract_key_points_from_tweets(tweets)
        topics = self._extract_topics(source)

        return {
            "source_type": "thread",
            "tweets": tweets,
            "tweet_count": len(tweets),
            "title": title,
            "key_points": key_points,
            "topics": topics,
            "full_text": source,
            "summary": self._generate_thread_summary(tweets),
        }

    def transform(
        self, source: str, target_platform: str, options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Transform thread content for target platform.

        Args:
            source: Thread content
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

    def _parse_thread(self, content: str) -> List[str]:
        """
        Parse thread content into individual tweets.

        Args:
            content: Thread content

        Returns:
            List of individual tweet texts
        """
        tweets = []

        # Pattern for numbered tweets: 1/ , 2/ , 1), 2), etc.
        # Split on newlines first
        lines = content.strip().split("\n")

        current_tweet = []
        tweet_pattern = r"^\s*(\d+)[\/\)\.]\s*"

        for line in lines:
            line = line.strip()
            if not line:
                continue

            match = re.match(tweet_pattern, line)
            if match:
                # Save previous tweet if exists
                if current_tweet:
                    tweets.append(" ".join(current_tweet))

                # Start new tweet (remove the number prefix)
                tweet_text = re.sub(tweet_pattern, "", line)
                current_tweet = [tweet_text]
            else:
                # Continue current tweet
                current_tweet.append(line)

        # Save last tweet
        if current_tweet:
            tweets.append(" ".join(current_tweet))

        # If no numbered tweets found, split by double newlines
        if not tweets:
            paragraphs = re.split(r"\n\s*\n", content)
            tweets = [p.strip() for p in paragraphs if p.strip()]

        return tweets

    def _extract_thread_title(self, tweets: List[str]) -> str:
        """
        Extract title from thread (usually first tweet).

        Args:
            tweets: List of tweet texts

        Returns:
            Thread title
        """
        if not tweets:
            return "Thread"

        first_tweet = tweets[0]

        # Clean up common patterns
        # Remove "Here's a thread about..." type intros
        intro_patterns = [
            r"^(?:here'?s?|this is)\s+(?:a\s+)?thread\s+(?:about|on)\s+",
            r"^thread:?\s+",
        ]

        title = first_tweet
        for pattern in intro_patterns:
            title = re.sub(pattern, "", title, flags=re.IGNORECASE)

        # Take first sentence or first 100 chars
        if "." in title[:100]:
            title = title.split(".")[0]

        return title[:100].strip()

    def _extract_key_points_from_tweets(self, tweets: List[str]) -> List[str]:
        """
        Extract key points from tweets.

        Args:
            tweets: List of tweet texts

        Returns:
            List of key points
        """
        # Skip first (intro) and last (outro) tweets
        middle_tweets = tweets[1:-1] if len(tweets) > 2 else tweets

        key_points = []
        for tweet in middle_tweets:
            # Clean up the tweet
            clean = tweet.strip()

            # Skip very short tweets
            if len(clean) < 30:
                continue

            # Look for "tip" or "point" markers
            if re.search(r"(?:tip|point|key|important)[:s]", clean, re.IGNORECASE):
                key_points.append(clean)
            # Look for emoji bullets
            elif re.match(r"^[^\w\s]", clean):  # Starts with emoji/symbol
                key_points.append(clean)
            # Otherwise take substantive tweets
            elif len(clean) > 50:
                key_points.append(clean[:200])

        return key_points[:10]

    def _extract_topics(self, content: str) -> List[str]:
        """
        Extract topics from thread content.

        Args:
            content: Thread content

        Returns:
            List of topic keywords
        """
        # Extract existing hashtags
        hashtags = re.findall(r"#(\w+)", content)
        topics = [h.lower() for h in hashtags]

        # Common topic keywords
        keywords = [
            "python",
            "javascript",
            "programming",
            "coding",
            "developer",
            "startup",
            "business",
            "marketing",
            "productivity",
            "career",
            "tips",
            "advice",
        ]

        content_lower = content.lower()
        for kw in keywords:
            if kw in content_lower and kw not in topics:
                topics.append(kw)

        return list(dict.fromkeys(topics))[:10]

    def _generate_thread_summary(self, tweets: List[str]) -> str:
        """
        Generate summary from thread tweets.

        Args:
            tweets: List of tweet texts

        Returns:
            Summary text
        """
        if not tweets:
            return ""

        # Combine first tweet with key points
        summary_parts = [tweets[0]]

        # Add middle tweets that look like key points
        for tweet in tweets[1:3]:
            if len(tweet) > 50:
                summary_parts.append(tweet[:100])

        return " ".join(summary_parts)[:300]
