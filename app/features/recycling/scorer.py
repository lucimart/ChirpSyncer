"""
Content Scorer for Recycling Engine.

Calculates engagement, evergreen, and recycle scores for content.
"""

import re
import time
from typing import Any, Dict, Optional


class ContentScorer:
    """
    Calculates scores for content recycling potential.

    Scoring algorithm:
    recycle_score = engagement * 0.4 + evergreen * 0.3 + age_factor * 0.2 - recency_penalty * 0.3
    """

    # Patterns for detecting non-evergreen content
    DATE_PATTERNS = [
        r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}',
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        r'\b(20\d{2}|19\d{2})\b',  # Years
        r'\btoday\b',
        r'\byesterday\b',
        r'\bthis (week|month|year)\b',
        r'\blast (week|month|year)\b',
        r'\bnext (week|month|year)\b',
    ]

    # Patterns for trending/temporal content
    TRENDING_PATTERNS = [
        r'#trending',
        r'#viral',
        r'#breaking',
        r'\bbreaking\s*(news|:)',
        r'\bjust\s+in\b',
        r'\bbreaking\b',
        r'\btoday\'s\b',
        r'\bcurrent(ly)?\b',
        r'\blatest\b',
        r'\bupdate\b',
    ]

    # Patterns for evergreen content indicators
    EVERGREEN_PATTERNS = [
        r'\bhow\s+to\b',
        r'\btips?\s+(for|to|on)\b',
        r'\bguide\s+(to|for)\b',
        r'\blearn(ing)?\b',
        r'\btutorial\b',
        r'\bbeginners?\b',
        r'\bfundamentals?\b',
        r'\bprinciples?\b',
        r'\balways\b',
        r'\bnever\b',
        r'\bevery\s+(time|day)\b',
        r'\bsteps?\s+(to|for)\b',
        r'\bways?\s+to\b',
        r'\brules?\s+(of|for)\b',
    ]

    # Weights for recycle score calculation
    ENGAGEMENT_WEIGHT = 0.4
    EVERGREEN_WEIGHT = 0.3
    AGE_WEIGHT = 0.2
    RECENCY_PENALTY_WEIGHT = 0.3

    # Minimum content age (in days) before considering for recycling
    MIN_AGE_DAYS = 30

    # Optimal age range for recycling (in days)
    OPTIMAL_AGE_MIN = 90
    OPTIMAL_AGE_MAX = 365

    # Minimum days between recycles
    MIN_RECYCLE_INTERVAL_DAYS = 30

    def calculate_engagement_score(self, post: Dict[str, Any]) -> float:
        """
        Calculate engagement score for a post.

        Uses likes, reposts, replies, and views to calculate engagement rate.
        Score is normalized to 0.0-1.0 range.

        Args:
            post: Dictionary with engagement metrics:
                - likes_count: Number of likes
                - reposts_count: Number of reposts/retweets
                - replies_count: Number of replies
                - views_count: Number of views/impressions

        Returns:
            Engagement score from 0.0 to 1.0
        """
        likes = post.get("likes_count", 0) or 0
        reposts = post.get("reposts_count", 0) or 0
        replies = post.get("replies_count", 0) or 0
        views = post.get("views_count", 0) or 0

        if views == 0:
            return 0.0

        # Calculate weighted engagement
        # Reposts are most valuable, then replies, then likes
        engagement = (likes * 1.0) + (reposts * 2.0) + (replies * 1.5)

        # Calculate engagement rate (engagement per 100 views)
        engagement_rate = (engagement / views) * 100

        # Normalize to 0-1 range using logarithmic scale
        # Typical engagement rates: 1-3% is good, 5%+ is excellent
        if engagement_rate <= 0:
            return 0.0
        elif engagement_rate >= 10:
            return 1.0
        else:
            # Logarithmic scaling for better distribution
            import math
            # Map 0.1-10% to 0-1 range
            normalized = math.log10(engagement_rate * 10) / 2
            return max(0.0, min(1.0, normalized))

    def calculate_evergreen_score(self, content: str) -> float:
        """
        Calculate evergreen score for content.

        Analyzes content for temporal references, trending topics,
        and educational/timeless patterns.

        Content is evergreen if:
        - No date references
        - No trending hashtags
        - Educational/informational tone
        - Not news/current events

        Args:
            content: Post content text

        Returns:
            Evergreen score from 0.0 to 1.0
        """
        if not content:
            return 0.0

        content_lower = content.lower()
        score = 0.7  # Start with moderate score

        # Check for date patterns (negative)
        date_penalty = 0
        for pattern in self.DATE_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE):
                date_penalty += 0.15
        score -= min(date_penalty, 0.4)

        # Check for trending/news patterns (negative)
        trending_penalty = 0
        for pattern in self.TRENDING_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE):
                trending_penalty += 0.2
        score -= min(trending_penalty, 0.5)

        # Check for evergreen patterns (positive)
        evergreen_bonus = 0
        for pattern in self.EVERGREEN_PATTERNS:
            if re.search(pattern, content_lower, re.IGNORECASE):
                evergreen_bonus += 0.1
        score += min(evergreen_bonus, 0.3)

        # Ensure score is in valid range
        return max(0.0, min(1.0, score))

    def calculate_recycle_score(self, content_item: Dict[str, Any]) -> float:
        """
        Calculate overall recycle score for content.

        Formula:
        recycle_score = (engagement * 0.4) + (evergreen * 0.3) + (age_factor * 0.2) - (recency_penalty * 0.3)

        Args:
            content_item: Dictionary with:
                - engagement_score: Pre-calculated engagement score (0.0-1.0)
                - evergreen_score: Pre-calculated evergreen score (0.0-1.0)
                - created_at: Unix timestamp of original post
                - last_recycled_at: Unix timestamp of last recycle (or None)
                - recycle_count: Number of times recycled

        Returns:
            Recycle score from 0.0 to 1.0
        """
        engagement = content_item.get("engagement_score", 0.0) or 0.0
        evergreen = content_item.get("evergreen_score", 0.0) or 0.0
        created_at = content_item.get("created_at", 0) or 0
        last_recycled = content_item.get("last_recycled_at")
        recycle_count = content_item.get("recycle_count", 0) or 0

        # Calculate age factor
        age_factor = self._calculate_age_factor(created_at)

        # Calculate recency penalty
        recency_penalty = self._calculate_recency_penalty(last_recycled)

        # Apply diminishing returns for frequently recycled content
        recycle_fatigue = min(recycle_count * 0.1, 0.3)

        # Calculate final score
        score = (
            (engagement * self.ENGAGEMENT_WEIGHT) +
            (evergreen * self.EVERGREEN_WEIGHT) +
            (age_factor * self.AGE_WEIGHT) -
            (recency_penalty * self.RECENCY_PENALTY_WEIGHT) -
            recycle_fatigue
        )

        return max(0.0, min(1.0, score))

    def _calculate_age_factor(self, created_at: int) -> float:
        """
        Calculate age factor for recycling.

        Content that is too new shouldn't be recycled.
        Optimal age is 3-12 months.

        Args:
            created_at: Unix timestamp of content creation

        Returns:
            Age factor from 0.0 to 1.0
        """
        if not created_at:
            return 0.0

        now = int(time.time())
        age_days = (now - created_at) / (24 * 60 * 60)

        # Too new - not ready for recycling
        if age_days < self.MIN_AGE_DAYS:
            return 0.0

        # Optimal range
        if self.OPTIMAL_AGE_MIN <= age_days <= self.OPTIMAL_AGE_MAX:
            return 1.0

        # Ramping up to optimal range
        if age_days < self.OPTIMAL_AGE_MIN:
            return (age_days - self.MIN_AGE_DAYS) / (self.OPTIMAL_AGE_MIN - self.MIN_AGE_DAYS)

        # Gradual decay after optimal range
        if age_days > self.OPTIMAL_AGE_MAX:
            # Decay over 2 years
            decay = (age_days - self.OPTIMAL_AGE_MAX) / (730 - self.OPTIMAL_AGE_MAX)
            return max(0.3, 1.0 - decay)

        return 0.5

    def _calculate_recency_penalty(self, last_recycled_at: Optional[int]) -> float:
        """
        Calculate recency penalty for recently recycled content.

        Content recycled recently should have a high penalty.
        Penalty decays over time.

        Args:
            last_recycled_at: Unix timestamp of last recycle, or None if never recycled

        Returns:
            Recency penalty from 0.0 to 1.0
        """
        if last_recycled_at is None:
            return 0.0

        now = int(time.time())
        days_since_recycle = (now - last_recycled_at) / (24 * 60 * 60)

        # Within minimum interval - maximum penalty
        if days_since_recycle < self.MIN_RECYCLE_INTERVAL_DAYS:
            return 1.0

        # Decay penalty over 90 days
        if days_since_recycle < 90:
            return 1.0 - ((days_since_recycle - self.MIN_RECYCLE_INTERVAL_DAYS) / 60)

        return 0.0

    def score_post(self, post: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculate all scores for a post.

        Convenience method to calculate engagement and evergreen scores
        for a new post being added to the library.

        Args:
            post: Dictionary with post data:
                - content: Post text
                - likes_count, reposts_count, replies_count, views_count: Metrics

        Returns:
            Dictionary with engagement_score and evergreen_score
        """
        engagement = self.calculate_engagement_score(post)
        evergreen = self.calculate_evergreen_score(post.get("content", ""))

        return {
            "engagement_score": engagement,
            "evergreen_score": evergreen,
        }
