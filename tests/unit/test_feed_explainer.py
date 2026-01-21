"""Unit tests for Feed Lab explainer with real data."""

import pytest
import sqlite3
import tempfile
import os
import time

from app.features.feed.explainer import (
    preview_feed,
    explain_post,
    _fetch_real_posts,
    _get_post_by_id,
    _evaluate_condition,
)


class TestConditionEvaluation:
    """Test condition evaluation logic."""

    def test_contains_in_string(self):
        """Test contains operator with string field."""
        post = {"content": "Hello world from Python"}
        condition = {"field": "content", "operator": "contains", "value": "Python"}
        assert _evaluate_condition(condition, post) is True

    def test_contains_case_insensitive(self):
        """Test contains is case insensitive."""
        post = {"content": "Hello WORLD"}
        condition = {"field": "content", "operator": "contains", "value": "world"}
        assert _evaluate_condition(condition, post) is True

    def test_contains_in_list(self):
        """Test contains operator with list field (hashtags)."""
        post = {"hashtags": ["python", "coding", "ai"]}
        condition = {"field": "hashtags", "operator": "contains", "value": "python"}
        assert _evaluate_condition(condition, post) is True

    def test_equals_operator(self):
        """Test equals operator."""
        post = {"author": "tech_user"}
        condition = {"field": "author", "operator": "equals", "value": "tech_user"}
        assert _evaluate_condition(condition, post) is True

    def test_greater_than_operator(self):
        """Test greater_than operator."""
        post = {"likes": 100}
        condition = {"field": "likes", "operator": "greater_than", "value": 50}
        assert _evaluate_condition(condition, post) is True

        condition = {"field": "likes", "operator": "greater_than", "value": 150}
        assert _evaluate_condition(condition, post) is False

    def test_less_than_operator(self):
        """Test less_than operator."""
        post = {"retweets": 10}
        condition = {"field": "retweets", "operator": "less_than", "value": 50}
        assert _evaluate_condition(condition, post) is True

    def test_is_true_operator(self):
        """Test is_true operator."""
        post = {"has_media": True}
        condition = {"field": "has_media", "operator": "is_true", "value": None}
        assert _evaluate_condition(condition, post) is True

        post = {"has_media": False}
        assert _evaluate_condition(condition, post) is False

    def test_is_false_operator(self):
        """Test is_false operator."""
        post = {"has_media": False}
        condition = {"field": "has_media", "operator": "is_false", "value": None}
        assert _evaluate_condition(condition, post) is True


class TestFeedExplainerWithRealData:
    """Test Feed Lab with real database data."""

    @pytest.fixture
    def db_path(self):
        """Create a temporary database for testing."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        yield path
        if os.path.exists(path):
            os.unlink(path)

    @pytest.fixture
    def populated_db(self, db_path):
        """Create and populate test database."""
        conn = sqlite3.connect(db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS synced_posts (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                twitter_id TEXT,
                bluesky_uri TEXT,
                original_text TEXT,
                hashtags TEXT,
                twitter_username TEXT,
                posted_at INTEGER,
                has_media INTEGER DEFAULT 0,
                likes_count INTEGER DEFAULT 0,
                retweets_count INTEGER DEFAULT 0
            )
        """)

        now = int(time.time())
        day = 86400

        test_posts = [
            (
                1,
                "tweet1",
                None,
                "AI is transforming everything",
                "ai ml",
                "tech_guru",
                now - day,
                1,
                500,
                200,
            ),
            (
                1,
                "tweet2",
                None,
                "Just had coffee",
                "",
                "daily_user",
                now - day * 2,
                0,
                10,
                2,
            ),
            (
                1,
                "tweet3",
                None,
                "Python programming tips",
                "python coding",
                "dev_user",
                now - day * 3,
                1,
                100,
                50,
            ),
            (
                1,
                "tweet4",
                None,
                "Beautiful sunset photo",
                "photo nature",
                "photo_user",
                now - day * 4,
                1,
                300,
                100,
            ),
            (
                2,
                "tweet5",
                None,
                "Other user post",
                "",
                "other",
                now,
                0,
                5,
                1,
            ),  # Different user
        ]

        for (
            user_id,
            twitter_id,
            bluesky_uri,
            text,
            hashtags,
            author,
            posted_at,
            has_media,
            likes,
            retweets,
        ) in test_posts:
            conn.execute(
                """
                INSERT INTO synced_posts 
                (user_id, twitter_id, bluesky_uri, original_text, hashtags, twitter_username, posted_at, has_media, likes_count, retweets_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    user_id,
                    twitter_id,
                    bluesky_uri,
                    text,
                    hashtags,
                    author,
                    posted_at,
                    has_media,
                    likes,
                    retweets,
                ),
            )

        conn.commit()
        conn.close()
        return db_path

    def test_fetch_real_posts(self, populated_db):
        """Test fetching real posts from database."""
        posts = _fetch_real_posts(populated_db, user_id=1, limit=10)

        # Should only get user 1's posts
        assert len(posts) == 4

        # Should be ordered by posted_at DESC
        assert posts[0]["content"] == "AI is transforming everything"

        # Should have all expected fields
        assert "id" in posts[0]
        assert "content" in posts[0]
        assert "author" in posts[0]
        assert "likes" in posts[0]
        assert "retweets" in posts[0]
        assert "has_media" in posts[0]

    def test_fetch_posts_user_isolation(self, populated_db):
        """Test that posts are isolated by user."""
        user1_posts = _fetch_real_posts(populated_db, user_id=1)
        user2_posts = _fetch_real_posts(populated_db, user_id=2)

        assert len(user1_posts) == 4
        assert len(user2_posts) == 1

    def test_get_post_by_id(self, populated_db):
        """Test fetching a specific post by ID."""
        post = _get_post_by_id(populated_db, user_id=1, post_id="tweet1")

        assert post is not None
        assert post["id"] == "tweet1"
        assert "AI" in post["content"]

    def test_get_post_by_id_not_found(self, populated_db):
        """Test fetching non-existent post."""
        post = _get_post_by_id(populated_db, user_id=1, post_id="nonexistent")
        assert post is None

    def test_preview_feed_with_real_data(self, populated_db):
        """Test preview_feed with real database data."""
        rules = [
            {
                "id": 1,
                "name": "Boost AI content",
                "type": "boost",
                "conditions": [
                    {"field": "content", "operator": "contains", "value": "AI"}
                ],
                "weight": 50,
                "enabled": True,
            },
            {
                "id": 2,
                "name": "Boost high engagement",
                "type": "boost",
                "conditions": [
                    {"field": "likes", "operator": "greater_than", "value": 100}
                ],
                "weight": 30,
                "enabled": True,
            },
        ]

        result = preview_feed(rules, db_path=populated_db, user_id=1)

        assert "posts" in result
        assert "rules_applied" in result
        assert len(result["posts"]) == 4

        # Posts should be sorted by score
        # AI post should be first (50 + 30 = 80 points)
        assert result["posts"][0]["content"] == "AI is transforming everything"
        assert result["posts"][0]["score"] == 80

    def test_preview_feed_filters_by_conditions(self, populated_db):
        """Test that rules only apply when conditions match."""
        rules = [
            {
                "id": 1,
                "name": "Boost media posts",
                "type": "boost",
                "conditions": [
                    {"field": "has_media", "operator": "is_true", "value": None}
                ],
                "weight": 100,
                "enabled": True,
            },
        ]

        result = preview_feed(rules, db_path=populated_db, user_id=1)

        # Posts with media should have score 100, others 0
        for post in result["posts"]:
            if post["has_media"]:
                assert post["score"] == 100
            else:
                assert post["score"] == 0

    def test_explain_post_with_real_data(self, populated_db):
        """Test explain_post with real database data."""
        rules = [
            {
                "id": 1,
                "name": "Boost AI content",
                "type": "boost",
                "conditions": [
                    {"field": "content", "operator": "contains", "value": "AI"}
                ],
                "weight": 50,
                "enabled": True,
            },
            {
                "id": 2,
                "name": "Boost media",
                "type": "boost",
                "conditions": [
                    {"field": "has_media", "operator": "is_true", "value": None}
                ],
                "weight": 30,
                "enabled": True,
            },
        ]

        result = explain_post("tweet1", rules, db_path=populated_db, user_id=1)

        assert result["post_id"] == "tweet1"
        assert result["final_score"] == 80  # 50 (AI) + 30 (media)
        assert "post" in result  # Should include the actual post data
        assert result["post"]["content"] == "AI is transforming everything"

        # Check rules_applied
        assert len(result["rules_applied"]) == 2
        ai_rule = next(r for r in result["rules_applied"] if r["rule_id"] == 1)
        assert ai_rule["matched"] is True
        assert ai_rule["contribution"] == 50

    def test_explain_post_unmatched_rules(self, populated_db):
        """Test explain_post shows unmatched rules with 0 contribution."""
        rules = [
            {
                "id": 1,
                "name": "Boost Python content",
                "type": "boost",
                "conditions": [
                    {"field": "content", "operator": "contains", "value": "Python"}
                ],
                "weight": 50,
                "enabled": True,
            },
        ]

        # tweet1 doesn't contain "Python"
        result = explain_post("tweet1", rules, db_path=populated_db, user_id=1)

        assert result["final_score"] == 0
        assert result["rules_applied"][0]["matched"] is False
        assert result["rules_applied"][0]["contribution"] == 0

    def test_disabled_rules_dont_contribute(self, populated_db):
        """Test that disabled rules don't contribute to score."""
        rules = [
            {
                "id": 1,
                "name": "Disabled rule",
                "type": "boost",
                "conditions": [
                    {"field": "content", "operator": "contains", "value": "AI"}
                ],
                "weight": 100,
                "enabled": False,
            },
        ]

        result = preview_feed(rules, db_path=populated_db, user_id=1)

        # All posts should have score 0 since rule is disabled
        for post in result["posts"]:
            assert post["score"] == 0

    def test_fallback_to_sample_posts(self):
        """Test fallback to sample posts when no db_path provided."""
        rules = []
        result = preview_feed(rules)

        # Should use sample posts
        assert len(result["posts"]) == 2
        assert result["posts"][0]["author"] in ["tech_user", "daily_user"]
