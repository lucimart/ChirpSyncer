"""Unit tests for search filters functionality."""

import pytest
import sqlite3
import tempfile
import os
import time

from app.features.search_engine import SearchEngine


class TestSearchFilters:
    """Test search_with_filters functionality."""

    @pytest.fixture
    def db_path(self):
        """Create a temporary database for testing."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        yield path
        if os.path.exists(path):
            os.unlink(path)

    @pytest.fixture
    def search_engine(self, db_path):
        """Create a search engine with test data."""
        # Create synced_posts table first
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
        conn.commit()
        conn.close()

        engine = SearchEngine(db_path)
        engine.init_fts_index()
        return engine

    @pytest.fixture
    def populated_engine(self, search_engine, db_path):
        """Populate search engine with test data."""
        conn = sqlite3.connect(db_path)
        now = int(time.time())
        day = 86400  # seconds in a day

        # Insert test posts
        test_posts = [
            # (twitter_id, text, hashtags, author, posted_at, has_media, likes, retweets)
            (
                "tweet1",
                "Hello world from Twitter",
                "hello world",
                "user1",
                now - day * 1,
                0,
                10,
                5,
            ),
            (
                "tweet2",
                "Python programming is fun",
                "python coding",
                "user1",
                now - day * 7,
                1,
                50,
                20,
            ),
            (
                "tweet3",
                "Machine learning rocks",
                "ml ai",
                "user2",
                now - day * 30,
                1,
                100,
                50,
            ),
            ("tweet4", "Just a simple tweet", "", "user1", now - day * 60, 0, 5, 2),
            (
                "tweet5",
                "Photo from vacation",
                "travel photo",
                "user1",
                now - day * 2,
                1,
                200,
                100,
            ),
        ]

        for (
            tweet_id,
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
                (user_id, twitter_id, original_text, hashtags, twitter_username, posted_at, has_media, likes_count, retweets_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    1,
                    tweet_id,
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

        # Rebuild index
        search_engine.rebuild_index(user_id=1)
        return search_engine

    def test_search_without_filters(self, populated_engine):
        """Test basic search without filters."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters=None
        )
        assert len(results) == 5

    def test_search_with_text_query(self, populated_engine):
        """Test search with text query."""
        results = populated_engine.search_with_filters(
            query="Python", user_id=1, filters=None
        )
        assert len(results) == 1
        assert "Python" in results[0]["content"]

    def test_filter_by_date_range(self, populated_engine):
        """Test filtering by date range."""
        now = int(time.time())
        day = 86400

        # Last 7 days
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"date_from": now - day * 7}
        )
        # Should include tweet1 (1 day ago), tweet2 (7 days ago), tweet5 (2 days ago)
        assert len(results) >= 2

    def test_filter_by_has_media(self, populated_engine):
        """Test filtering by media presence."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"has_media": True}
        )
        # tweet2, tweet3, tweet5 have media
        assert len(results) == 3
        for result in results:
            assert result.get("has_media") is True

    def test_filter_by_min_likes(self, populated_engine):
        """Test filtering by minimum likes."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"min_likes": 50}
        )
        # tweet2 (50), tweet3 (100), tweet5 (200)
        assert len(results) == 3
        for result in results:
            assert result.get("likes", 0) >= 50

    def test_filter_by_min_retweets(self, populated_engine):
        """Test filtering by minimum retweets."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"min_retweets": 50}
        )
        # tweet3 (50), tweet5 (100)
        assert len(results) == 2
        for result in results:
            assert result.get("retweets", 0) >= 50

    def test_filter_by_hashtag(self, populated_engine):
        """Test filtering by hashtag."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"hashtags": ["python"]}
        )
        assert len(results) == 1
        assert "python" in results[0]["hashtags"].lower()

    def test_filter_by_author(self, populated_engine):
        """Test filtering by author."""
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"author": "user2"}
        )
        assert len(results) == 1
        assert results[0]["author"] == "user2"

    def test_combined_filters(self, populated_engine):
        """Test combining multiple filters."""
        results = populated_engine.search_with_filters(
            query="",
            user_id=1,
            filters={
                "has_media": True,
                "min_likes": 50,
            },
        )
        # tweet2 (media, 50 likes), tweet3 (media, 100 likes), tweet5 (media, 200 likes)
        assert len(results) == 3

    def test_query_with_filters(self, populated_engine):
        """Test text query combined with filters."""
        results = populated_engine.search_with_filters(
            query="programming", user_id=1, filters={"has_media": True}
        )
        assert len(results) == 1
        assert "programming" in results[0]["content"].lower()

    def test_user_isolation(self, populated_engine, db_path):
        """Test that filters respect user isolation."""
        # Add a post for user 2
        conn = sqlite3.connect(db_path)
        conn.execute(
            """
            INSERT INTO synced_posts 
            (user_id, twitter_id, original_text, hashtags, twitter_username, posted_at, has_media, likes_count, retweets_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                2,
                "tweet_user2",
                "User 2 post",
                "",
                "other",
                int(time.time()),
                0,
                1000,
                500,
            ),
        )
        conn.commit()
        conn.close()

        populated_engine.rebuild_index()

        # User 1 should not see user 2's posts
        results = populated_engine.search_with_filters(
            query="", user_id=1, filters={"min_likes": 500}
        )
        # Only user 1's posts with 500+ likes (none)
        assert len(results) == 0

    def test_empty_results_with_strict_filters(self, populated_engine):
        """Test that strict filters return empty results."""
        results = populated_engine.search_with_filters(
            query="",
            user_id=1,
            filters={"min_likes": 10000},  # No posts have this many likes
        )
        assert len(results) == 0
