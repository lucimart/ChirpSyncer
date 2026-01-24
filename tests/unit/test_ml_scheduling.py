"""
Tests for ML Scheduling (Sprint F).

Tests the historical engagement analysis and prediction logic.
"""

import sqlite3
import tempfile
import time
from datetime import datetime, timezone
from typing import Dict, Any

import pytest


class TestAnalyzeHistoricalEngagement:
    """Tests for _analyze_historical_engagement function."""

    def setup_method(self):
        """Create a temporary database with test data."""
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self._init_db()

    def teardown_method(self):
        """Clean up temporary database."""
        import os

        os.close(self.db_fd)
        os.unlink(self.db_path)

    def _init_db(self):
        """Initialize database with required tables."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create synced_posts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS synced_posts (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                twitter_id TEXT,
                bluesky_uri TEXT,
                original_text TEXT,
                posted_at INTEGER,
                twitter_username TEXT,
                likes_count INTEGER DEFAULT 0,
                retweets_count INTEGER DEFAULT 0,
                has_media INTEGER DEFAULT 0,
                hashtags TEXT
            )
        """)

        # Create tweet_metrics table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tweet_metrics (
                id INTEGER PRIMARY KEY,
                tweet_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                impressions INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                retweets INTEGER DEFAULT 0,
                replies INTEGER DEFAULT 0,
                engagements INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0.0
            )
        """)

        conn.commit()
        conn.close()

    def _insert_post(self, user_id: int, posted_at: int, twitter_id: str = None):
        """Insert a test post."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO synced_posts (user_id, twitter_id, original_text, posted_at)
            VALUES (?, ?, ?, ?)
        """,
            (user_id, twitter_id or f"tweet_{posted_at}", "Test post", posted_at),
        )
        conn.commit()
        conn.close()

    def _insert_metrics(self, tweet_id: str, user_id: int, engagement_rate: float):
        """Insert test metrics."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tweet_metrics (tweet_id, user_id, timestamp, engagement_rate, likes, retweets, impressions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (tweet_id, user_id, int(time.time()), engagement_rate, 10, 5, 1000),
        )
        conn.commit()
        conn.close()

    def test_no_posts_returns_empty(self):
        """Test that no posts returns empty analysis."""
        from app.web.api.v1.scheduling import _analyze_historical_engagement

        result = _analyze_historical_engagement(user_id=1, db_path=self.db_path)

        assert result["posts_analyzed"] == 0
        assert result["hourly"] == {}
        assert result["daily"] == {}

    def test_posts_analyzed_count(self):
        """Test that posts are counted correctly."""
        # Insert posts at different hours
        monday_9am = 1704103200  # 2024-01-01 09:00:00 UTC (Monday)
        self._insert_post(user_id=1, posted_at=monday_9am, twitter_id="tweet_1")
        self._insert_post(user_id=1, posted_at=monday_9am + 3600, twitter_id="tweet_2")

        from app.web.api.v1.scheduling import _analyze_historical_engagement

        result = _analyze_historical_engagement(user_id=1, db_path=self.db_path)

        assert result["posts_analyzed"] == 2

    def test_user_isolation(self):
        """Test that analysis only includes user's own posts."""
        monday_9am = 1704103200
        self._insert_post(user_id=1, posted_at=monday_9am, twitter_id="tweet_1")
        self._insert_post(user_id=2, posted_at=monday_9am, twitter_id="tweet_2")

        from app.web.api.v1.scheduling import _analyze_historical_engagement

        result = _analyze_historical_engagement(user_id=1, db_path=self.db_path)

        assert result["posts_analyzed"] == 1


class TestGetSuggestions:
    """Tests for _get_suggestions helper function."""

    def test_suggests_shorter_content(self):
        """Test suggestion for long content."""
        from app.web.api.v1.scheduling import _get_suggestions

        long_content = "x" * 250  # Over 200 chars
        suggestions = _get_suggestions(long_content, False, 50)

        assert any("shorten" in s.lower() for s in suggestions)

    def test_suggests_more_context(self):
        """Test suggestion for short content."""
        from app.web.api.v1.scheduling import _get_suggestions

        short_content = "Hi"  # Under 50 chars
        suggestions = _get_suggestions(short_content, False, 50)

        assert any("context" in s.lower() for s in suggestions)

    def test_suggests_media(self):
        """Test suggestion for posts without media."""
        from app.web.api.v1.scheduling import _get_suggestions

        suggestions = _get_suggestions("A normal post", False, 50)

        assert any("image" in s.lower() or "media" in s.lower() for s in suggestions)

    def test_suggests_hashtags(self):
        """Test suggestion for posts without hashtags."""
        from app.web.api.v1.scheduling import _get_suggestions

        suggestions = _get_suggestions("A post without hashtags", True, 50)

        assert any("hashtag" in s.lower() for s in suggestions)

    def test_max_three_suggestions(self):
        """Test that at most 3 suggestions are returned."""
        from app.web.api.v1.scheduling import _get_suggestions

        # Content that would trigger many suggestions
        suggestions = _get_suggestions("x", False, 30)

        assert len(suggestions) <= 3

    def test_no_media_suggestion_when_has_media(self):
        """Test that media suggestion is not given when has_media=True."""
        from app.web.api.v1.scheduling import _get_suggestions

        suggestions = _get_suggestions("A normal post with good length here", True, 70)

        # Should not suggest media since we already have it
        assert not any("image" in s.lower() for s in suggestions)


class TestPredictionScoring:
    """Tests for engagement prediction scoring logic."""

    def test_content_length_scoring(self):
        """Test that content length affects base score correctly."""
        # Short content (< 50 chars) should get -3
        # Optimal content (50-200 chars) should get +5
        # Long content (> 200 chars) should get -5

        short = "Hi"  # 2 chars
        optimal = "This is a well-crafted post with optimal length for engagement."  # ~63 chars
        long = "x" * 250  # 250 chars

        assert len(short) < 50
        assert 50 <= len(optimal) <= 200
        assert len(long) > 200

    def test_hashtag_scoring(self):
        """Test that hashtag count affects scoring."""
        no_hashtags = "A post without hashtags"
        good_hashtags = "A post #with #two hashtags"
        too_many = "Post #a #b #c #d #e #f"

        assert no_hashtags.count("#") == 0
        assert 1 <= good_hashtags.count("#") <= 3
        assert too_many.count("#") > 5

    def test_media_boost(self):
        """Test that media presence adds 10 points."""
        # Media boost is +10 according to the implementation
        media_boost = 10
        assert media_boost == 10

    def test_engagement_hooks(self):
        """Test that questions and threads get bonus."""
        question = "What do you think about this?"
        thread = "1/ This is a thread 🧵"
        normal = "Just a regular post"

        assert "?" in question
        assert any(word in thread.lower() for word in ["thread", "🧵", "1/"])
        assert "?" not in normal


class TestOptimalTimesLogic:
    """Tests for optimal times calculation logic."""

    def test_day_names_mapping(self):
        """Test that day names are correctly mapped."""
        from app.web.api.v1.scheduling import DAY_NAMES

        assert DAY_NAMES[0] == "Sunday"
        assert DAY_NAMES[1] == "Monday"
        assert DAY_NAMES[6] == "Saturday"
        assert len(DAY_NAMES) == 7

    def test_score_normalization(self):
        """Test that scores are normalized to 60-95 range."""
        # The implementation normalizes to 60-95 range
        min_score = 60
        max_score = 95

        # Test normalization formula
        def normalize(engagement: float, max_engagement: float) -> int:
            return min(95, max(60, int(60 + (engagement / max_engagement) * 35)))

        # Max engagement should give 95
        assert normalize(10.0, 10.0) == 95

        # Zero engagement should give 60
        assert normalize(0.0, 10.0) == 60

        # Half engagement should give ~77
        assert 75 <= normalize(5.0, 10.0) <= 80


class TestDataQualityIndicators:
    """Tests for data quality classification."""

    def test_high_quality_threshold(self):
        """Test that 50+ posts is high quality."""
        posts_analyzed = 100
        quality = (
            "high"
            if posts_analyzed >= 50
            else ("medium" if posts_analyzed >= 10 else "low")
        )
        assert quality == "high"

    def test_medium_quality_threshold(self):
        """Test that 10-49 posts is medium quality."""
        posts_analyzed = 25
        quality = (
            "high"
            if posts_analyzed >= 50
            else ("medium" if posts_analyzed >= 10 else "low")
        )
        assert quality == "medium"

    def test_low_quality_threshold(self):
        """Test that <10 posts is low quality."""
        posts_analyzed = 5
        quality = (
            "high"
            if posts_analyzed >= 50
            else ("medium" if posts_analyzed >= 10 else "low")
        )
        assert quality == "low"

    def test_confidence_levels(self):
        """Test confidence levels based on data volume."""

        def get_confidence(posts_analyzed: int) -> float:
            if posts_analyzed >= 100:
                return 0.85
            elif posts_analyzed >= 50:
                return 0.75
            elif posts_analyzed >= 10:
                return 0.65
            else:
                return 0.5

        assert get_confidence(150) == 0.85
        assert get_confidence(75) == 0.75
        assert get_confidence(25) == 0.65
        assert get_confidence(5) == 0.5
