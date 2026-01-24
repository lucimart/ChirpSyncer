"""
Tests for Content Recycling Engine.

TDD tests for app/features/recycling/ module.
"""

import json
import os
import sqlite3
import tempfile
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest


def create_test_db_with_content():
    """Create a test database with content_library and suggestions tables."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create content_library table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS content_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            original_post_id TEXT NOT NULL,
            content TEXT NOT NULL,
            media_urls TEXT DEFAULT '[]',
            engagement_score REAL DEFAULT 0.0,
            evergreen_score REAL DEFAULT 0.0,
            recycle_score REAL DEFAULT 0.0,
            tags TEXT DEFAULT '[]',
            last_recycled_at INTEGER,
            recycle_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            UNIQUE(user_id, platform, original_post_id)
        )
    """)

    # Create recycle_suggestions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recycle_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_id INTEGER NOT NULL,
            suggested_platforms TEXT DEFAULT '[]',
            suggested_at INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            scheduled_for INTEGER,
            FOREIGN KEY (content_id) REFERENCES content_library(id)
        )
    """)

    now = int(time.time())
    one_month_ago = now - (30 * 24 * 60 * 60)
    six_months_ago = now - (180 * 24 * 60 * 60)
    one_year_ago = now - (365 * 24 * 60 * 60)

    # Insert test content with varying engagement and evergreen scores
    content_items = [
        # High engagement, evergreen content (good candidate)
        (1, "twitter", "tw_001", "10 tips for better productivity that work every time",
         '[]', 0.85, 0.9, 0.0, '["productivity", "tips"]', None, 0, one_year_ago),
        # High engagement, dated content (bad candidate - has date reference)
        (1, "twitter", "tw_002", "Breaking: News about the 2023 election results",
         '[]', 0.9, 0.2, 0.0, '["news"]', None, 0, six_months_ago),
        # Medium engagement, evergreen (decent candidate)
        (1, "twitter", "tw_003", "How to learn any programming language in 3 steps",
         '[]', 0.5, 0.85, 0.0, '["programming", "learning"]', None, 0, six_months_ago),
        # Low engagement, evergreen (poor candidate)
        (1, "twitter", "tw_004", "Basic cooking tips for beginners",
         '[]', 0.15, 0.8, 0.0, '["cooking"]', None, 0, one_year_ago),
        # High engagement, recently recycled (penalized)
        (1, "twitter", "tw_005", "The ultimate guide to remote work",
         '[]', 0.8, 0.9, 0.0, '["remote", "work"]', now - 86400, 2, one_year_ago),
        # Bluesky content
        (1, "bluesky", "bs_001", "Understanding async/await in JavaScript",
         '[]', 0.7, 0.95, 0.0, '["javascript", "async"]', None, 0, six_months_ago),
        # Different user
        (2, "twitter", "tw_user2_001", "My personal journey with fitness",
         '[]', 0.6, 0.7, 0.0, '["fitness"]', None, 0, one_year_ago),
        # Trending hashtag content (not evergreen)
        (1, "twitter", "tw_006", "My take on #trending #viral content today",
         '[]', 0.75, 0.3, 0.0, '["trending"]', None, 0, one_month_ago),
    ]

    cursor.executemany("""
        INSERT INTO content_library
        (user_id, platform, original_post_id, content, media_urls, engagement_score,
         evergreen_score, recycle_score, tags, last_recycled_at, recycle_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, content_items)

    conn.commit()
    conn.close()
    return path


class TestContentScorerEngagement:
    """Tests for engagement score calculation."""

    def test_calculate_engagement_score_high_engagement(self):
        """Test engagement score for high-performing post."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        post = {
            "likes_count": 500,
            "reposts_count": 100,
            "replies_count": 50,
            "views_count": 10000
        }
        score = scorer.calculate_engagement_score(post)

        assert 0.0 <= score <= 1.0
        assert score > 0.7  # High engagement should have high score

    def test_calculate_engagement_score_low_engagement(self):
        """Test engagement score for low-performing post."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        post = {
            "likes_count": 2,
            "reposts_count": 0,
            "replies_count": 1,
            "views_count": 1000
        }
        score = scorer.calculate_engagement_score(post)

        assert 0.0 <= score <= 1.0
        assert score < 0.3  # Low engagement should have low score

    def test_calculate_engagement_score_zero_views(self):
        """Test engagement score handles zero views gracefully."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        post = {
            "likes_count": 0,
            "reposts_count": 0,
            "replies_count": 0,
            "views_count": 0
        }
        score = scorer.calculate_engagement_score(post)

        assert score == 0.0

    def test_calculate_engagement_score_missing_fields(self):
        """Test engagement score handles missing fields."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        post = {"likes_count": 100}  # Only likes provided
        score = scorer.calculate_engagement_score(post)

        assert 0.0 <= score <= 1.0


class TestContentScorerEvergreen:
    """Tests for evergreen score calculation."""

    def test_calculate_evergreen_score_educational_content(self):
        """Test evergreen score for educational/timeless content."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content = "10 tips for better productivity that work every time"
        score = scorer.calculate_evergreen_score(content)

        assert 0.0 <= score <= 1.0
        assert score > 0.7  # Educational content should be evergreen

    def test_calculate_evergreen_score_dated_content(self):
        """Test evergreen score for content with date references."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content = "Breaking news: What happened on January 15, 2024"
        score = scorer.calculate_evergreen_score(content)

        assert 0.0 <= score <= 1.0
        assert score < 0.5  # Dated content should score low

    def test_calculate_evergreen_score_trending_hashtags(self):
        """Test evergreen score for content with trending hashtags."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content = "My thoughts on #trending #viral #today's topic"
        score = scorer.calculate_evergreen_score(content)

        assert 0.0 <= score <= 1.0
        assert score < 0.5  # Trending content is not evergreen

    def test_calculate_evergreen_score_news_content(self):
        """Test evergreen score for news/current events content."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content = "Breaking: The president announced new policies today"
        score = scorer.calculate_evergreen_score(content)

        assert 0.0 <= score <= 1.0
        assert score < 0.4  # News is definitely not evergreen

    def test_calculate_evergreen_score_how_to_content(self):
        """Test evergreen score for how-to/tutorial content."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content = "How to learn Python: A beginner's guide to programming"
        score = scorer.calculate_evergreen_score(content)

        assert 0.0 <= score <= 1.0
        assert score > 0.7  # How-to content is evergreen


class TestContentScorerRecycle:
    """Tests for recycle score calculation."""

    def test_calculate_recycle_score_high_quality_old_content(self):
        """Test recycle score for high engagement, evergreen, old content."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content_item = {
            "engagement_score": 0.85,
            "evergreen_score": 0.9,
            "created_at": int(time.time()) - (365 * 24 * 60 * 60),  # 1 year ago
            "last_recycled_at": None,
            "recycle_count": 0
        }
        score = scorer.calculate_recycle_score(content_item)

        assert 0.0 <= score <= 1.0
        assert score > 0.6  # Good candidate for recycling

    def test_calculate_recycle_score_recently_recycled(self):
        """Test recycle score applies recency penalty for recently recycled content."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content_item = {
            "engagement_score": 0.85,
            "evergreen_score": 0.9,
            "created_at": int(time.time()) - (365 * 24 * 60 * 60),
            "last_recycled_at": int(time.time()) - 86400,  # Recycled yesterday
            "recycle_count": 1
        }
        score = scorer.calculate_recycle_score(content_item)

        # Compare with same content that wasn't recently recycled
        content_not_recycled = content_item.copy()
        content_not_recycled["last_recycled_at"] = None
        content_not_recycled["recycle_count"] = 0
        score_not_recycled = scorer.calculate_recycle_score(content_not_recycled)

        assert score < score_not_recycled  # Recently recycled should score lower

    def test_calculate_recycle_score_new_content(self):
        """Test recycle score for very recent content (not good for recycling)."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content_item = {
            "engagement_score": 0.85,
            "evergreen_score": 0.9,
            "created_at": int(time.time()) - 86400,  # Posted yesterday
            "last_recycled_at": None,
            "recycle_count": 0
        }
        score = scorer.calculate_recycle_score(content_item)

        # Also test old content for comparison
        old_content = content_item.copy()
        old_content["created_at"] = int(time.time()) - (180 * 24 * 60 * 60)  # 6 months ago
        old_score = scorer.calculate_recycle_score(old_content)

        assert 0.0 <= score <= 1.0
        # New content should score lower than old content
        assert score < old_score

    def test_calculate_recycle_score_low_evergreen(self):
        """Test recycle score for content with low evergreen score."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        content_item = {
            "engagement_score": 0.9,  # High engagement
            "evergreen_score": 0.2,   # But not evergreen
            "created_at": int(time.time()) - (365 * 24 * 60 * 60),
            "last_recycled_at": None,
            "recycle_count": 0
        }
        score = scorer.calculate_recycle_score(content_item)

        # Test high evergreen content for comparison
        high_evergreen = content_item.copy()
        high_evergreen["evergreen_score"] = 0.9
        high_score = scorer.calculate_recycle_score(high_evergreen)

        assert 0.0 <= score <= 1.0
        # Low evergreen should score lower than high evergreen
        assert score < high_score


class TestRecencyPenalty:
    """Tests for recency penalty calculation."""

    def test_recency_penalty_recent_recycle(self):
        """Test recency penalty for content recycled within 7 days."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        # Content recycled 2 days ago
        last_recycled = int(time.time()) - (2 * 24 * 60 * 60)
        penalty = scorer._calculate_recency_penalty(last_recycled)

        assert penalty > 0.5  # High penalty for recent recycle

    def test_recency_penalty_old_recycle(self):
        """Test recency penalty for content recycled long ago."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        # Content recycled 90 days ago
        last_recycled = int(time.time()) - (90 * 24 * 60 * 60)
        penalty = scorer._calculate_recency_penalty(last_recycled)

        assert penalty < 0.2  # Low penalty for old recycle

    def test_recency_penalty_never_recycled(self):
        """Test recency penalty for content never recycled."""
        from app.features.recycling.scorer import ContentScorer

        scorer = ContentScorer()
        penalty = scorer._calculate_recency_penalty(None)

        assert penalty == 0.0  # No penalty if never recycled


class TestRecycleSuggester:
    """Tests for RecycleSuggester."""

    def test_generate_suggestions_returns_top_candidates(self):
        """Test that suggestions returns top recycle candidates."""
        from app.features.recycling.suggester import RecycleSuggester

        db_path = create_test_db_with_content()
        try:
            suggester = RecycleSuggester(db_path=db_path)
            suggestions = suggester.generate_suggestions(user_id=1, limit=5)

            assert len(suggestions) <= 5
            assert len(suggestions) > 0

            # Verify suggestions are sorted by recycle_score descending
            for i in range(len(suggestions) - 1):
                assert suggestions[i]["recycle_score"] >= suggestions[i + 1]["recycle_score"]
        finally:
            os.unlink(db_path)

    def test_generate_suggestions_filters_by_user(self):
        """Test that suggestions only returns content for specified user."""
        from app.features.recycling.suggester import RecycleSuggester

        db_path = create_test_db_with_content()
        try:
            suggester = RecycleSuggester(db_path=db_path)
            suggestions = suggester.generate_suggestions(user_id=1, limit=10)

            for suggestion in suggestions:
                assert suggestion["user_id"] == 1
        finally:
            os.unlink(db_path)

    def test_generate_suggestions_excludes_recently_recycled(self):
        """Test that recently recycled content has lower priority."""
        from app.features.recycling.suggester import RecycleSuggester

        db_path = create_test_db_with_content()
        try:
            suggester = RecycleSuggester(db_path=db_path)
            suggestions = suggester.generate_suggestions(user_id=1, limit=10)

            # The recently recycled content (tw_005) should not be in top suggestions
            top_ids = [s["original_post_id"] for s in suggestions[:3]]
            # tw_005 was recycled yesterday, should be deprioritized
            assert "tw_005" not in top_ids or len(suggestions) <= 3
        finally:
            os.unlink(db_path)

    def test_generate_suggestions_empty_library(self):
        """Test suggestions returns empty list for empty library."""
        from app.features.recycling.suggester import RecycleSuggester

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS content_library (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                platform TEXT,
                original_post_id TEXT,
                content TEXT,
                engagement_score REAL,
                evergreen_score REAL,
                recycle_score REAL,
                tags TEXT,
                last_recycled_at INTEGER,
                recycle_count INTEGER,
                created_at INTEGER
            )
        """)
        conn.commit()
        conn.close()

        try:
            suggester = RecycleSuggester(db_path=db_path)
            suggestions = suggester.generate_suggestions(user_id=1)
            assert suggestions == []
        finally:
            os.unlink(db_path)

    def test_get_best_platforms_for_content(self):
        """Test determining best platforms for recycling content."""
        from app.features.recycling.suggester import RecycleSuggester

        db_path = create_test_db_with_content()
        try:
            suggester = RecycleSuggester(db_path=db_path)
            # Content originally from Twitter
            platforms = suggester.get_best_platforms_for_content(content_id=1)

            assert isinstance(platforms, list)
            # Should suggest cross-posting to other platforms
            assert "bluesky" in platforms or "twitter" in platforms
        finally:
            os.unlink(db_path)


class TestContentLibraryModel:
    """Tests for ContentLibrary model operations."""

    def test_content_library_init(self):
        """Test ContentLibrary can be initialized with database."""
        from app.features.recycling.models import ContentLibrary

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            library = ContentLibrary(db_path=db_path)
            library.init_db()

            # Verify table exists
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='content_library'")
            assert cursor.fetchone() is not None
            conn.close()
        finally:
            os.unlink(db_path)

    def test_add_content_to_library(self):
        """Test adding content to library."""
        from app.features.recycling.models import ContentLibrary

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            library = ContentLibrary(db_path=db_path)
            library.init_db()

            content_id = library.add_content(
                user_id=1,
                platform="twitter",
                original_post_id="tw_test_001",
                content="Test content for library",
                media_urls=[],
                engagement_score=0.5,
                evergreen_score=0.7
            )

            assert content_id is not None
            assert content_id > 0
        finally:
            os.unlink(db_path)

    def test_get_content_by_id(self):
        """Test retrieving content by ID."""
        from app.features.recycling.models import ContentLibrary

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            library = ContentLibrary(db_path=db_path)
            library.init_db()

            content_id = library.add_content(
                user_id=1,
                platform="twitter",
                original_post_id="tw_test_001",
                content="Test content",
                media_urls=["https://example.com/img.jpg"],
                engagement_score=0.5,
                evergreen_score=0.7
            )

            content = library.get_content(content_id)

            assert content is not None
            assert content["content"] == "Test content"
            assert content["platform"] == "twitter"
        finally:
            os.unlink(db_path)

    def test_update_content_tags(self):
        """Test updating content tags."""
        from app.features.recycling.models import ContentLibrary

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            library = ContentLibrary(db_path=db_path)
            library.init_db()

            content_id = library.add_content(
                user_id=1,
                platform="twitter",
                original_post_id="tw_test_001",
                content="Test content",
                media_urls=[],
                engagement_score=0.5,
                evergreen_score=0.7,
                tags=["original"]
            )

            success = library.update_tags(content_id, ["updated", "new_tag"])
            content = library.get_content(content_id)

            assert success is True
            assert "updated" in content["tags"]
            assert "new_tag" in content["tags"]
        finally:
            os.unlink(db_path)

    def test_mark_as_recycled(self):
        """Test marking content as recycled."""
        from app.features.recycling.models import ContentLibrary

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            library = ContentLibrary(db_path=db_path)
            library.init_db()

            content_id = library.add_content(
                user_id=1,
                platform="twitter",
                original_post_id="tw_test_001",
                content="Test content",
                media_urls=[],
                engagement_score=0.5,
                evergreen_score=0.7
            )

            library.mark_as_recycled(content_id)
            content = library.get_content(content_id)

            assert content["recycle_count"] == 1
            assert content["last_recycled_at"] is not None
        finally:
            os.unlink(db_path)


class TestRecycleSuggestionModel:
    """Tests for RecycleSuggestion model operations."""

    def test_create_suggestion(self):
        """Test creating a recycle suggestion."""
        from app.features.recycling.models import RecycleSuggestion

        db_path = create_test_db_with_content()
        try:
            suggestion_model = RecycleSuggestion(db_path=db_path)
            suggestion_model.init_db()

            suggestion_id = suggestion_model.create_suggestion(
                content_id=1,
                suggested_platforms=["twitter", "bluesky"]
            )

            assert suggestion_id is not None
            assert suggestion_id > 0
        finally:
            os.unlink(db_path)

    def test_get_pending_suggestions(self):
        """Test getting pending suggestions for a user."""
        from app.features.recycling.models import RecycleSuggestion

        db_path = create_test_db_with_content()
        try:
            suggestion_model = RecycleSuggestion(db_path=db_path)
            suggestion_model.init_db()

            # Create some suggestions
            suggestion_model.create_suggestion(content_id=1, suggested_platforms=["bluesky"])
            suggestion_model.create_suggestion(content_id=3, suggested_platforms=["twitter"])

            pending = suggestion_model.get_pending_suggestions(user_id=1)

            assert len(pending) >= 2
            for s in pending:
                assert s["status"] == "pending"
        finally:
            os.unlink(db_path)

    def test_schedule_suggestion(self):
        """Test scheduling a suggestion for future posting."""
        from app.features.recycling.models import RecycleSuggestion

        db_path = create_test_db_with_content()
        try:
            suggestion_model = RecycleSuggestion(db_path=db_path)
            suggestion_model.init_db()

            suggestion_id = suggestion_model.create_suggestion(
                content_id=1,
                suggested_platforms=["twitter"]
            )

            scheduled_time = int(time.time()) + 3600  # 1 hour from now
            success = suggestion_model.schedule_suggestion(suggestion_id, scheduled_time)

            suggestion = suggestion_model.get_suggestion(suggestion_id)

            assert success is True
            assert suggestion["status"] == "scheduled"
            assert suggestion["scheduled_for"] == scheduled_time
        finally:
            os.unlink(db_path)
