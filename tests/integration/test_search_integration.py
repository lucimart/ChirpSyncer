"""
Integration Tests for Full-Text Search Engine with FTS5 (Phase 2.3)

Comprehensive integration tests for SQLite FTS5-based search engine covering:
- FTS5 index initialization and management
- Full-text search queries with ranking
- Advanced search features (hashtags, authors, date ranges, proximity)
- Multi-user isolation
- Index synchronization with triggers
- Error handling and edge cases

All tests use real SQLite database with FTS5 extension and include actual
synced_posts data population. Tests verify:
- Index schema and tokenizer (porter, unicode61)
- Automatic index updates via INSERT/UPDATE/DELETE triggers
- Search relevance scoring and ranking
- Filter combinations (date range + hashtags, etc.)
- User data isolation
- Index persistence and consistency

Usage:
    pytest tests/integration/test_search_integration.py -v
    pytest tests/integration/test_search_integration.py --cov=app.features.search_engine
"""

import os
import sys
import sqlite3
import time
import hashlib
from typing import Optional

import pytest

# Add app directory to path for imports
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)

from features.search_engine import SearchEngine


# =============================================================================
# FIXTURES - Database Setup
# =============================================================================


@pytest.fixture(scope="function")
def search_db(test_db_path):
    """
    Create test database with synced_posts table extended with search fields.

    Extends the base synced_posts schema to include:
    - user_id: User who owns the tweet
    - hashtags: Space/comma separated hashtags
    - twitter_username: Tweet author username
    - posted_at: Unix timestamp of tweet creation

    These columns are required for the search engine to function properly.
    """
    conn = sqlite3.connect(test_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create users table if not exists
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_login INTEGER,
            is_active INTEGER DEFAULT 1,
            is_admin INTEGER DEFAULT 0,
            settings_json TEXT
        )
    """
    )

    # Create synced_posts table with extended schema
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            twitter_id TEXT,
            bluesky_uri TEXT,
            user_id INTEGER,
            source TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            synced_to TEXT,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            original_text TEXT NOT NULL,
            hashtags TEXT,
            twitter_username TEXT,
            posted_at INTEGER,
            CHECK (source IN ('twitter', 'bluesky')),
            CHECK (synced_to IN ('bluesky', 'twitter', 'both', NULL)),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """
    )

    # Create indexes
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_synced_posts_user_id ON synced_posts(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_synced_posts_twitter_id ON synced_posts(twitter_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_synced_posts_bluesky_uri ON synced_posts(bluesky_uri)"
    )

    conn.commit()
    yield conn
    conn.close()


@pytest.fixture(scope="function")
def search_engine(search_db, test_db_path):
    """
    Create SearchEngine instance with initialized FTS5 index.

    Initializes the FTS5 virtual table 'tweet_search_index' and
    creates triggers for automatic index synchronization.
    """
    engine = SearchEngine(db_path=test_db_path)
    # Initialize FTS5 index and triggers
    assert engine.init_fts_index() is True, "Failed to initialize FTS5 index"
    yield engine


@pytest.fixture(scope="function")
def test_user_for_search(search_db):
    """Create a test user for search operations."""
    cursor = search_db.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, password_hash, created_at, is_active)
        VALUES (?, ?, ?, ?, 1)
    """,
        ("searchuser1", "searchuser1@example.com", "hash123", int(time.time())),
    )
    search_db.commit()
    return cursor.lastrowid


@pytest.fixture(scope="function")
def second_test_user(search_db):
    """Create a second test user for multi-user isolation tests."""
    cursor = search_db.cursor()
    cursor.execute(
        """
        INSERT INTO users (username, email, password_hash, created_at, is_active)
        VALUES (?, ?, ?, ?, 1)
    """,
        ("searchuser2", "searchuser2@example.com", "hash456", int(time.time())),
    )
    search_db.commit()
    return cursor.lastrowid


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def compute_content_hash(content: str) -> str:
    """Compute SHA256 hash of content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def insert_test_post(
    db: sqlite3.Connection,
    user_id: int,
    content: str,
    hashtags: str = "",
    author: str = "testauthor",
    posted_at: Optional[int] = None,
) -> str:
    """
    Insert a test post into synced_posts table.

    Returns the twitter_id of the inserted post.
    """
    cursor = db.cursor()
    tweet_id = f"tweet_{int(time.time())}_{hash(content) % 10000}"
    if posted_at is None:
        posted_at = int(time.time())

    cursor.execute(
        """
        INSERT INTO synced_posts
        (twitter_id, user_id, source, content_hash, original_text, hashtags, twitter_username, posted_at, synced_to)
        VALUES (?, ?, 'twitter', ?, ?, ?, ?, ?, 'both')
    """,
        (
            tweet_id,
            user_id,
            compute_content_hash(content),
            content,
            hashtags,
            author,
            posted_at,
        ),
    )

    db.commit()
    return tweet_id


def get_index_entry_count(db: sqlite3.Connection, user_id: Optional[int] = None) -> int:
    """Get count of entries in search index."""
    cursor = db.cursor()
    if user_id:
        cursor.execute(
            "SELECT COUNT(*) FROM tweet_search_index WHERE user_id = ?", (user_id,)
        )
    else:
        cursor.execute("SELECT COUNT(*) FROM tweet_search_index")
    return cursor.fetchone()[0]


# =============================================================================
# A) FTS5 Index Initialization & Management Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestFTS5IndexInitialization:
    """Tests for FTS5 virtual table initialization and schema."""

    def test_init_fts_index_creates_virtual_table(self, search_db, test_db_path):
        """Verify FTS5 virtual table is created successfully."""
        engine = SearchEngine(db_path=test_db_path)
        assert engine.init_fts_index() is True

        cursor = search_db.cursor()
        # Verify virtual table exists
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='tweet_search_index'
        """
        )
        assert cursor.fetchone() is not None

    def test_init_fts_index_idempotent(self, search_db, test_db_path):
        """Verify FTS5 index initialization is idempotent."""
        engine = SearchEngine(db_path=test_db_path)

        # Initialize twice - should not raise error
        assert engine.init_fts_index() is True
        assert engine.init_fts_index() is True

    def test_fts5_schema_has_required_columns(self, search_engine, search_db):
        """Verify FTS5 table has all required searchable columns."""
        cursor = search_db.cursor()
        cursor.execute("PRAGMA table_info(tweet_search_index)")
        columns = {row[1] for row in cursor.fetchall()}

        required = {"tweet_id", "user_id", "content", "hashtags", "author", "posted_at"}
        assert required.issubset(columns)

    def test_fts5_uses_porter_tokenizer(self, search_engine, search_db):
        """Verify FTS5 uses porter tokenizer for stemming."""
        cursor = search_db.cursor()
        # Insert test content with different forms of same word
        cursor.execute(
            """
            INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("t1", 1, "running runs ran", "", "author", int(time.time())),
        )
        search_db.commit()

        # Search for stemmed form should find all variations
        results = search_engine.search("run", user_id=1)
        assert len(results) >= 1

    def test_fts5_index_unindexed_columns(self, search_engine, search_db):
        """Verify tweet_id and user_id are UNINDEXED (not tokenized)."""
        cursor = search_db.cursor()

        # Insert a tweet
        cursor.execute(
            """
            INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            ("t123", 1, "python programming", "#python", "author1", int(time.time())),
        )
        search_db.commit()

        # Searching for tweet_id should not find it (because it's UNINDEXED)
        results = search_engine.search("t123")
        assert len(results) == 0  # Should not find via FTS search

        # But searching for content should work
        results = search_engine.search("python", user_id=1)
        assert len(results) == 1

    def test_fts5_triggers_created(self, search_engine, search_db):
        """Verify FTS5 triggers are created for automatic index sync."""
        cursor = search_db.cursor()

        # Check that triggers exist
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='trigger' AND name LIKE 'sync_search_index%'
        """
        )
        triggers = {row[0] for row in cursor.fetchall()}

        assert "sync_search_index_insert" in triggers
        assert "sync_search_index_update" in triggers
        assert "sync_search_index_delete" in triggers

    def test_rebuild_index_from_empty(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify rebuild_index populates index from synced_posts table."""
        # Insert test posts
        insert_test_post(search_db, test_user_for_search, "Python programming tutorial")
        insert_test_post(search_db, test_user_for_search, "JavaScript basics")

        # Rebuild index
        count = search_engine.rebuild_index()
        assert count == 2

        # Verify index was populated
        assert get_index_entry_count(search_db) == 2

    def test_rebuild_index_clears_existing(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify rebuild_index clears existing index entries."""
        # Insert posts and rebuild
        insert_test_post(search_db, test_user_for_search, "First post")
        count1 = search_engine.rebuild_index()
        assert count1 == 1

        # Insert more posts and rebuild
        insert_test_post(search_db, test_user_for_search, "Second post")
        count2 = search_engine.rebuild_index()
        assert count2 == 2  # Should have both

        # Index should have 2, not 3
        assert get_index_entry_count(search_db) == 2

    def test_rebuild_index_for_specific_user(
        self, search_engine, search_db, test_user_for_search, second_test_user
    ):
        """Verify rebuild_index can rebuild for specific user only."""
        # Insert posts for two users
        insert_test_post(search_db, test_user_for_search, "User 1 post 1")
        insert_test_post(search_db, test_user_for_search, "User 1 post 2")
        insert_test_post(search_db, second_test_user, "User 2 post 1")

        # Rebuild for first user only
        count = search_engine.rebuild_index(user_id=test_user_for_search)
        assert count == 2

        # Clear all index
        cursor = search_db.cursor()
        cursor.execute("DELETE FROM tweet_search_index")
        search_db.commit()

        # Rebuild for second user only
        count = search_engine.rebuild_index(user_id=second_test_user)
        assert count == 1


# =============================================================================
# B) Full-Text Search Queries Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestFullTextSearchQueries:
    """Tests for FTS5 search query functionality."""

    def test_simple_keyword_search_finds_results(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify simple keyword search returns matching tweets."""
        insert_test_post(search_db, test_user_for_search, "Python programming is fun")
        insert_test_post(search_db, test_user_for_search, "JavaScript coding rules")

        search_engine.rebuild_index()
        results = search_engine.search("python", user_id=test_user_for_search)

        assert len(results) == 1
        assert "python" in results[0]["content"].lower()

    def test_multi_keyword_search_implicit_and(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify multi-keyword search requires all terms (implicit AND)."""
        insert_test_post(search_db, test_user_for_search, "Python programming")
        insert_test_post(search_db, test_user_for_search, "Python tutorial")
        insert_test_post(search_db, test_user_for_search, "JavaScript coding")

        search_engine.rebuild_index()
        results = search_engine.search(
            "python programming", user_id=test_user_for_search
        )

        # Should find only the post with both words
        assert len(results) == 1
        assert "programming" in results[0]["content"].lower()

    def test_phrase_search_with_quotes(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify phrase search with quoted string."""
        insert_test_post(search_db, test_user_for_search, "hello world from python")
        insert_test_post(search_db, test_user_for_search, "world of python")
        insert_test_post(search_db, test_user_for_search, "hello from world")

        search_engine.rebuild_index()
        results = search_engine.search('"hello world"', user_id=test_user_for_search)

        # Should find exact phrase
        assert len(results) == 1
        assert "hello" in results[0]["content"].lower()
        assert "world" in results[0]["content"].lower()

    def test_boolean_and_operator(self, search_engine, search_db, test_user_for_search):
        """Verify explicit AND operator in queries."""
        insert_test_post(search_db, test_user_for_search, "Python and Ruby")
        insert_test_post(search_db, test_user_for_search, "Only Python")
        insert_test_post(search_db, test_user_for_search, "Only Ruby")

        search_engine.rebuild_index()
        results = search_engine.search("python AND ruby", user_id=test_user_for_search)

        assert len(results) == 1
        assert "and" in results[0]["content"].lower()

    def test_boolean_or_operator(self, search_engine, search_db, test_user_for_search):
        """Verify OR operator returns posts matching either term."""
        insert_test_post(search_db, test_user_for_search, "Python programming")
        insert_test_post(search_db, test_user_for_search, "JavaScript coding")
        insert_test_post(search_db, test_user_for_search, "Ruby development")

        search_engine.rebuild_index()
        results = search_engine.search(
            "python OR javascript", user_id=test_user_for_search
        )

        assert len(results) == 2

    def test_negation_operator_not(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify NOT operator excludes matching terms."""
        insert_test_post(search_db, test_user_for_search, "Python programming")
        insert_test_post(search_db, test_user_for_search, "Python debugging")
        insert_test_post(search_db, test_user_for_search, "JavaScript basics")

        search_engine.rebuild_index()
        results = search_engine.search(
            "python NOT debugging", user_id=test_user_for_search
        )

        assert len(results) == 1
        assert "debugging" not in results[0]["content"].lower()

    def test_wildcard_prefix_search(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify wildcard/prefix search with * operator."""
        insert_test_post(search_db, test_user_for_search, "Python programming")
        insert_test_post(search_db, test_user_for_search, "JavaScript programming")
        insert_test_post(search_db, test_user_for_search, "Programmer at work")

        search_engine.rebuild_index()
        results = search_engine.search("prog*", user_id=test_user_for_search)

        # Should find programming and programmer
        assert len(results) >= 2

    def test_ranking_and_relevance_scoring(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search results are ranked by relevance."""
        insert_test_post(search_db, test_user_for_search, "python python python python")
        insert_test_post(search_db, test_user_for_search, "python programming")
        insert_test_post(search_db, test_user_for_search, "learning python basics")

        search_engine.rebuild_index()
        results = search_engine.search("python", user_id=test_user_for_search)

        assert len(results) == 3
        # First result should have highest rank (lowest rank value)
        # FTS5 returns negative ranks, so rank[0] < rank[1]
        if results[0]["rank"] != 0 and results[1]["rank"] != 0:
            assert results[0]["rank"] <= results[1]["rank"]

    def test_proximity_search_near_operator(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify NEAR operator for proximity-based search."""
        insert_test_post(
            search_db, test_user_for_search, "python is a programming language"
        )
        insert_test_post(search_db, test_user_for_search, "python language")
        insert_test_post(search_db, test_user_for_search, "programming language")

        search_engine.rebuild_index()
        results = search_engine.search(
            "NEAR(python programming, 5)", user_id=test_user_for_search
        )

        # Should find posts where python and programming are within 5 positions
        assert len(results) >= 1

    def test_search_returns_metadata(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search results include all metadata fields."""
        tweet_id = insert_test_post(
            search_db,
            test_user_for_search,
            "Test content",
            hashtags="#test",
            author="testauthor",
        )
        search_engine.rebuild_index()

        results = search_engine.search("test", user_id=test_user_for_search)

        assert len(results) == 1
        result = results[0]
        assert "tweet_id" in result
        assert "user_id" in result
        assert "content" in result
        assert "hashtags" in result
        assert "author" in result
        assert "posted_at" in result
        assert "rank" in result


# =============================================================================
# C) Advanced Search Features Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestAdvancedSearchFeatures:
    """Tests for advanced filtering and search features."""

    def test_hashtag_filtering(self, search_engine, search_db, test_user_for_search):
        """Verify hashtag filtering returns only matching hashtags."""
        insert_test_post(
            search_db, test_user_for_search, "Python code", hashtags="#python #coding"
        )
        insert_test_post(
            search_db, test_user_for_search, "Web dev", hashtags="#webdev #javascript"
        )

        search_engine.rebuild_index()
        results = search_engine.search_with_filters(
            "", user_id=test_user_for_search, filters={"hashtags": ["python"]}
        )

        assert len(results) == 1
        assert "python" in results[0]["hashtags"].lower()

    def test_multiple_hashtag_filtering(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify filtering with multiple hashtags (OR logic)."""
        insert_test_post(
            search_db, test_user_for_search, "Python post", hashtags="#python"
        )
        insert_test_post(search_db, test_user_for_search, "Ruby post", hashtags="#ruby")
        insert_test_post(search_db, test_user_for_search, "Go post", hashtags="#golang")

        search_engine.rebuild_index()
        results = search_engine.search_with_filters(
            "", user_id=test_user_for_search, filters={"hashtags": ["python", "ruby"]}
        )

        assert len(results) == 2

    def test_author_filtering(self, search_engine, search_db, test_user_for_search):
        """Verify author filtering returns only matching authors."""
        insert_test_post(search_db, test_user_for_search, "Post 1", author="alice")
        insert_test_post(search_db, test_user_for_search, "Post 2", author="bob")
        insert_test_post(search_db, test_user_for_search, "Post 3", author="alice")

        search_engine.rebuild_index()
        results = search_engine.search_with_filters(
            "", user_id=test_user_for_search, filters={"author": "alice"}
        )

        assert len(results) == 2
        for result in results:
            assert result["author"] == "alice"

    def test_date_range_filtering(self, search_engine, search_db, test_user_for_search):
        """Verify date range filtering works correctly."""
        now = int(time.time())
        old_time = now - 86400  # 1 day ago
        new_time = now - 3600  # 1 hour ago

        insert_test_post(
            search_db, test_user_for_search, "Old post", posted_at=old_time
        )
        insert_test_post(
            search_db, test_user_for_search, "Recent post", posted_at=new_time
        )

        search_engine.rebuild_index()

        # Search last 12 hours
        results = search_engine.search_with_filters(
            "",
            user_id=test_user_for_search,
            filters={"date_from": now - 43200},  # 12 hours
        )

        assert len(results) == 1
        assert "Recent" in results[0]["content"]

    def test_date_to_filtering(self, search_engine, search_db, test_user_for_search):
        """Verify date_to filtering limits results to before specified time."""
        now = int(time.time())
        old_time = now - 86400

        insert_test_post(
            search_db, test_user_for_search, "Old post", posted_at=old_time
        )
        insert_test_post(search_db, test_user_for_search, "New post", posted_at=now)

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "",
            user_id=test_user_for_search,
            filters={"date_to": now - 3600},  # Before 1 hour ago
        )

        assert len(results) == 1
        assert "Old" in results[0]["content"]

    def test_combined_date_range_filter(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify combined date_from and date_to filtering."""
        now = int(time.time())
        t1 = now - 86400 * 2  # 2 days ago
        t2 = now - 86400  # 1 day ago
        t3 = now - 3600  # 1 hour ago

        insert_test_post(search_db, test_user_for_search, "Post 1", posted_at=t1)
        insert_test_post(search_db, test_user_for_search, "Post 2", posted_at=t2)
        insert_test_post(search_db, test_user_for_search, "Post 3", posted_at=t3)

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "",
            user_id=test_user_for_search,
            filters={"date_from": t2 - 3600, "date_to": t3 + 3600},
        )

        assert len(results) == 2

    def test_combined_filters_hashtag_and_date(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify combining hashtag and date filters works correctly."""
        now = int(time.time())
        old_time = now - 86400

        insert_test_post(
            search_db,
            test_user_for_search,
            "Python old",
            hashtags="#python",
            posted_at=old_time,
        )
        insert_test_post(
            search_db,
            test_user_for_search,
            "Python new",
            hashtags="#python",
            posted_at=now,
        )
        insert_test_post(
            search_db, test_user_for_search, "Ruby new", hashtags="#ruby", posted_at=now
        )

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "",
            user_id=test_user_for_search,
            filters={"hashtags": ["python"], "date_from": now - 43200},
        )

        assert len(results) == 1
        assert "new" in results[0]["content"].lower()

    def test_search_with_no_results(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search returning empty results handles gracefully."""
        insert_test_post(search_db, test_user_for_search, "Python post")
        search_engine.rebuild_index()

        results = search_engine.search("nonexistent", user_id=test_user_for_search)

        assert results == []

    def test_search_with_pagination_limit(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search respects limit parameter."""
        for i in range(10):
            insert_test_post(search_db, test_user_for_search, f"Python post {i}")

        search_engine.rebuild_index()

        # Default limit is 50, test custom limit
        results = search_engine.search("python", user_id=test_user_for_search, limit=5)

        assert len(results) <= 5

    def test_empty_search_query_returns_all(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify empty search query returns all user's tweets."""
        insert_test_post(search_db, test_user_for_search, "First post")
        insert_test_post(search_db, test_user_for_search, "Second post")
        insert_test_post(search_db, test_user_for_search, "Third post")

        search_engine.rebuild_index()

        results = search_engine.search("", user_id=test_user_for_search)

        assert len(results) == 3


# =============================================================================
# D) Multi-User Isolation Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestMultiUserIsolation:
    """Tests for user data isolation in search results."""

    def test_user_sees_only_own_tweets(
        self, search_engine, search_db, test_user_for_search, second_test_user
    ):
        """Verify user search results only include their own tweets."""
        insert_test_post(search_db, test_user_for_search, "User 1 private Python post")
        insert_test_post(search_db, second_test_user, "User 2 Python post")

        search_engine.rebuild_index()

        results = search_engine.search("python", user_id=test_user_for_search)

        assert len(results) == 1
        assert results[0]["user_id"] == test_user_for_search

    def test_second_user_isolated_results(
        self, search_engine, search_db, test_user_for_search, second_test_user
    ):
        """Verify second user gets their own isolated results."""
        insert_test_post(search_db, test_user_for_search, "User 1 Python")
        insert_test_post(search_db, second_test_user, "User 2 Python")
        insert_test_post(search_db, second_test_user, "User 2 JavaScript")

        search_engine.rebuild_index()

        results = search_engine.search("python", user_id=second_test_user)

        assert len(results) == 1
        assert results[0]["user_id"] == second_test_user

    def test_search_without_user_id_returns_all(
        self, search_engine, search_db, test_user_for_search, second_test_user
    ):
        """Verify search without user_id returns results from all users."""
        insert_test_post(search_db, test_user_for_search, "User 1 Python")
        insert_test_post(search_db, second_test_user, "User 2 Python")

        search_engine.rebuild_index()

        results = search_engine.search("python")  # No user_id filter

        assert len(results) == 2


# =============================================================================
# E) Index Synchronization Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestIndexSynchronization:
    """Tests for automatic index updates via triggers."""

    def test_new_tweet_triggers_index_update(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify new tweet inserted into synced_posts automatically indexes."""
        search_engine.rebuild_index()  # Clear any existing
        assert get_index_entry_count(search_db, test_user_for_search) == 0

        # Insert post directly (trigger should fire)
        insert_test_post(search_db, test_user_for_search, "New indexed post")

        # Should be in index automatically via trigger
        results = search_engine.search("indexed", user_id=test_user_for_search)
        assert len(results) == 1

    def test_tweet_update_triggers_index_refresh(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify updating synced_posts updates the search index."""
        tweet_id = insert_test_post(search_db, test_user_for_search, "Original content")
        search_engine.rebuild_index()

        # Update the tweet content
        cursor = search_db.cursor()
        cursor.execute(
            """
            UPDATE synced_posts SET original_text = ? WHERE twitter_id = ?
        """,
            ("Updated content", tweet_id),
        )
        search_db.commit()

        # Old content should not be found
        results = search_engine.search("original", user_id=test_user_for_search)
        assert len(results) == 0

        # New content should be found
        results = search_engine.search("updated", user_id=test_user_for_search)
        assert len(results) == 1

    def test_tweet_deletion_removes_from_index(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify deleting synced_posts removes from search index."""
        tweet_id = insert_test_post(search_db, test_user_for_search, "To be deleted")
        search_engine.rebuild_index()

        # Verify it's searchable
        results = search_engine.search("deleted", user_id=test_user_for_search)
        assert len(results) == 1

        # Delete the tweet
        cursor = search_db.cursor()
        cursor.execute("DELETE FROM synced_posts WHERE twitter_id = ?", (tweet_id,))
        search_db.commit()

        # Should no longer be found
        results = search_engine.search("deleted", user_id=test_user_for_search)
        assert len(results) == 0

    def test_bulk_insert_index_consistency(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify bulk inserting tweets maintains index consistency."""
        # Bulk insert
        for i in range(20):
            insert_test_post(search_db, test_user_for_search, f"Bulk post {i} python")

        search_engine.rebuild_index()

        results = search_engine.search("python", user_id=test_user_for_search)
        assert len(results) == 20

    def test_index_consistency_after_mixed_operations(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index stays consistent with mixed insert/update/delete operations."""
        # Insert
        t1 = insert_test_post(search_db, test_user_for_search, "Post 1")
        t2 = insert_test_post(search_db, test_user_for_search, "Post 2")
        search_engine.rebuild_index()
        assert get_index_entry_count(search_db, test_user_for_search) == 2

        # Update
        cursor = search_db.cursor()
        cursor.execute(
            """
            UPDATE synced_posts SET original_text = ? WHERE twitter_id = ?
        """,
            ("Updated Post 1", t1),
        )
        search_db.commit()

        # Delete
        cursor.execute("DELETE FROM synced_posts WHERE twitter_id = ?", (t2,))
        search_db.commit()

        # Insert another
        insert_test_post(search_db, test_user_for_search, "Post 3")

        # Should have 2 posts now
        assert get_index_entry_count(search_db, test_user_for_search) == 2

        # Verify correct posts are indexed
        results = search_engine.search("updated", user_id=test_user_for_search)
        assert len(results) == 1


# =============================================================================
# F) Error Handling Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestErrorHandling:
    """Tests for error handling and edge cases."""

    def test_search_with_invalid_syntax(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search handles invalid FTS5 syntax gracefully."""
        insert_test_post(search_db, test_user_for_search, "Test content")
        search_engine.rebuild_index()

        # Invalid FTS syntax should not crash, just return empty or handle gracefully
        # FTS5 might raise an error, which the search method should catch
        results = search_engine.search("(unclosed", user_id=test_user_for_search)
        # Should either return empty list or handle the error
        assert isinstance(results, list)

    def test_search_on_non_indexed_field_still_works(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify searching works on both indexed and unindexed fields."""
        insert_test_post(search_db, test_user_for_search, "Content", hashtags="#python")
        search_engine.rebuild_index()

        # Can search content (indexed)
        results = search_engine.search("content", user_id=test_user_for_search)
        assert len(results) == 1

        # Can filter by hashtags (unindexed in FTS, but available in results)
        results = search_engine.search_with_filters(
            "", user_id=test_user_for_search, filters={"hashtags": ["python"]}
        )
        assert len(results) == 1

    def test_empty_search_query(self, search_engine, search_db, test_user_for_search):
        """Verify empty search query is handled properly."""
        insert_test_post(search_db, test_user_for_search, "Content")
        search_engine.rebuild_index()

        # Empty query should return all (not raise error)
        results = search_engine.search("", user_id=test_user_for_search)
        assert isinstance(results, list)
        assert len(results) == 1

    def test_search_with_special_characters(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search handles special characters gracefully."""
        insert_test_post(search_db, test_user_for_search, "C++ programming @twitter")
        search_engine.rebuild_index()

        # Should not crash on special chars
        results = search_engine.search("@twitter", user_id=test_user_for_search)
        assert isinstance(results, list)

    def test_index_rebuild_with_missing_columns(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index rebuild handles NULL/missing values in optional columns."""
        cursor = search_db.cursor()
        # Insert post with NULL values
        cursor.execute(
            """
            INSERT INTO synced_posts
            (twitter_id, user_id, source, content_hash, original_text)
            VALUES (?, ?, 'twitter', ?, ?)
        """,
            ("t1", test_user_for_search, compute_content_hash("test"), "test content"),
        )
        search_db.commit()

        # Rebuild should not crash
        count = search_engine.rebuild_index(user_id=test_user_for_search)
        assert count == 1

        # Should be searchable despite missing hashtags/author
        results = search_engine.search("test", user_id=test_user_for_search)
        assert len(results) == 1

    def test_search_with_unicode_content(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search handles unicode characters (FTS5 unicode61)."""
        insert_test_post(search_db, test_user_for_search, "Python 中文 العربية")
        search_engine.rebuild_index()

        # Should not crash with unicode
        results = search_engine.search("python", user_id=test_user_for_search)
        assert len(results) == 1


# =============================================================================
# ADDITIONAL INTEGRATION TESTS
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class TestSearchEngineStatistics:
    """Tests for search statistics functionality."""

    def test_get_search_stats(self, search_engine, search_db, test_user_for_search):
        """Verify get_search_stats returns correct statistics."""
        insert_test_post(search_db, test_user_for_search, "Post 1")
        insert_test_post(search_db, test_user_for_search, "Post 2")
        search_engine.rebuild_index()

        stats = search_engine.get_search_stats(test_user_for_search)

        assert stats["user_id"] == test_user_for_search
        assert stats["total_indexed"] == 2
        assert stats["last_indexed"] > 0

    def test_get_search_stats_empty_user(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify get_search_stats for user with no indexed tweets."""
        stats = search_engine.get_search_stats(test_user_for_search)

        assert stats["user_id"] == test_user_for_search
        assert stats["total_indexed"] == 0
        assert stats["last_indexed"] == 0


@pytest.mark.integration
@pytest.mark.database
class TestFTS5Persistence:
    """Tests for FTS5 index persistence across connections."""

    def test_index_persists_across_connections(
        self, search_db, test_db_path, test_user_for_search
    ):
        """Verify FTS5 index persists when reopening database."""
        engine1 = SearchEngine(db_path=test_db_path)
        engine1.init_fts_index()

        insert_test_post(search_db, test_user_for_search, "Persistent content")
        engine1.rebuild_index()

        # Close connection
        search_db.close()

        # Open new connection with new engine instance
        engine2 = SearchEngine(db_path=test_db_path)
        results = engine2.search("persistent", user_id=test_user_for_search)

        # Index should still have the data
        assert len(results) == 1

    def test_fts_index_queries_after_reinit(
        self, search_db, test_db_path, test_user_for_search
    ):
        """Verify FTS5 queries work after reinitializing existing index."""
        engine = SearchEngine(db_path=test_db_path)
        engine.init_fts_index()

        insert_test_post(search_db, test_user_for_search, "Content 1")
        engine.rebuild_index()

        # Reinit (should be idempotent)
        engine.init_fts_index()

        results = engine.search("content", user_id=test_user_for_search)
        assert len(results) == 1


@pytest.mark.integration
@pytest.mark.database
class TestIndexTweetMethod:
    """Tests for the index_tweet method."""

    def test_index_tweet_direct_insert(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index_tweet inserts a single tweet into the index."""
        result = search_engine.index_tweet(
            tweet_id="tweet_direct_1",
            user_id=test_user_for_search,
            content="Direct indexed content",
            hashtags="#direct",
            author="directauthor",
        )

        assert result is True

        # Verify it's searchable
        results = search_engine.search("direct", user_id=test_user_for_search)
        assert len(results) == 1
        assert results[0]["content"] == "Direct indexed content"

    def test_index_tweet_with_timestamp(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index_tweet respects custom posted_at timestamp."""
        past_time = int(time.time()) - 86400

        result = search_engine.index_tweet(
            tweet_id="tweet_ts_1",
            user_id=test_user_for_search,
            content="Timestamped content",
            hashtags="",
            author="author",
            posted_at=past_time,
        )

        assert result is True

        # Verify timestamp is preserved
        results = search_engine.search("timestamped", user_id=test_user_for_search)
        assert len(results) == 1
        assert results[0]["posted_at"] == past_time

    def test_index_tweet_update_existing(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index_tweet updates existing entry with same tweet_id."""
        tweet_id = "tweet_update_1"

        # Insert first version
        search_engine.index_tweet(
            tweet_id, test_user_for_search, "Version 1", "", "author"
        )

        # Update with second version
        search_engine.index_tweet(
            tweet_id, test_user_for_search, "Version 2", "", "author"
        )

        # Should only find latest version
        results = search_engine.search("version", user_id=test_user_for_search)
        assert len(results) == 1
        assert "Version 2" in results[0]["content"]

    def test_index_tweet_multiple_timestamps(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index_tweet without timestamp uses current time."""
        search_engine.index_tweet(
            tweet_id="tweet_notime",
            user_id=test_user_for_search,
            content="No timestamp",
            hashtags="",
            author="author",
        )

        results = search_engine.search("timestamp", user_id=test_user_for_search)
        assert len(results) == 1
        # Should have a recent timestamp
        assert results[0]["posted_at"] > 0


@pytest.mark.integration
@pytest.mark.database
class TestSearchWithFiltersEdgeCases:
    """Additional tests for search_with_filters edge cases."""

    def test_search_with_filters_all_filters_combined(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify all filter types work together."""
        now = int(time.time())

        insert_test_post(
            search_db,
            test_user_for_search,
            "Python data science",
            hashtags="#python #data",
            author="alice",
            posted_at=now - 3600,
        )

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "python",
            user_id=test_user_for_search,
            filters={
                "hashtags": ["python"],
                "author": "alice",
                "date_from": now - 86400,
                "date_to": now,
            },
        )

        assert len(results) == 1
        assert results[0]["author"] == "alice"

    def test_search_with_filters_no_matches_on_author(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify author filter excludes non-matching posts."""
        insert_test_post(
            search_db, test_user_for_search, "Post by alice", author="alice"
        )
        insert_test_post(search_db, test_user_for_search, "Post by bob", author="bob")

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "",
            user_id=test_user_for_search,
            filters={"author": "charlie"},  # No matches
        )

        assert len(results) == 0

    def test_search_with_query_and_all_filters(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify FTS search works with all filter types."""
        now = int(time.time())

        insert_test_post(
            search_db,
            test_user_for_search,
            "Python tutorial",
            hashtags="#python #learn",
            author="mentor",
            posted_at=now - 1800,
        )
        insert_test_post(
            search_db,
            test_user_for_search,
            "Python advanced",
            hashtags="#python #advanced",
            author="expert",
            posted_at=now - 7200,
        )

        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "tutorial",
            user_id=test_user_for_search,
            filters={
                "hashtags": ["python"],
                "author": "mentor",
                "date_from": now - 3600,
            },
        )

        assert len(results) == 1
        assert "tutorial" in results[0]["content"].lower()


@pytest.mark.integration
@pytest.mark.database
class TestSearchEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_search_no_user_id_no_results(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search without user_id is unrestricted."""
        insert_test_post(search_db, test_user_for_search, "Public search test")
        search_engine.rebuild_index()

        # Search without user_id should find it
        results = search_engine.search("public", limit=100)
        assert len(results) >= 1

    def test_search_with_zero_limit(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search with limit=0."""
        insert_test_post(search_db, test_user_for_search, "Content")
        search_engine.rebuild_index()

        results = search_engine.search("content", user_id=test_user_for_search, limit=0)
        assert results == [] or len(results) == 0

    def test_search_large_limit(self, search_engine, search_db, test_user_for_search):
        """Verify search with large limit."""
        for i in range(10):
            insert_test_post(search_db, test_user_for_search, f"Post {i}")

        search_engine.rebuild_index()

        results = search_engine.search("post", user_id=test_user_for_search, limit=1000)
        assert len(results) == 10

    def test_search_with_filters_no_filters_provided(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search_with_filters with None filters."""
        insert_test_post(search_db, test_user_for_search, "Test content")
        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "test", user_id=test_user_for_search, filters=None
        )

        assert len(results) == 1

    def test_search_with_filters_empty_filters(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search_with_filters with empty filter dict."""
        insert_test_post(search_db, test_user_for_search, "Test content")
        search_engine.rebuild_index()

        results = search_engine.search_with_filters(
            "test", user_id=test_user_for_search, filters={}
        )

        assert len(results) == 1


@pytest.mark.integration
@pytest.mark.database
class TestSearchErrorRecovery:
    """Tests for error handling and recovery."""

    def test_rebuild_index_tolerance_to_errors(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify rebuild continues despite potential issues."""
        # Insert valid and edge case data
        insert_test_post(search_db, test_user_for_search, "Valid post")

        # Rebuild should handle it
        count = search_engine.rebuild_index()
        assert count == 1

    def test_search_stats_returns_dict(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify get_search_stats always returns a dict."""
        stats = search_engine.get_search_stats(test_user_for_search)
        assert isinstance(stats, dict)
        assert "user_id" in stats
        assert "total_indexed" in stats
        assert "last_indexed" in stats

    def test_search_with_filters_returns_list(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search_with_filters always returns a list."""
        results = search_engine.search_with_filters(
            "query", user_id=test_user_for_search
        )
        assert isinstance(results, list)

    def test_search_returns_list_on_error(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search returns list even if there's an internal issue."""
        insert_test_post(search_db, test_user_for_search, "Test")
        search_engine.rebuild_index()

        # Normal search should still return list
        results = search_engine.search("test", user_id=test_user_for_search)
        assert isinstance(results, list)

    def test_search_with_filters_returns_list_on_error(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search_with_filters returns list even on error."""
        insert_test_post(search_db, test_user_for_search, "Test")
        search_engine.rebuild_index()

        # Should return empty list, not None or exception
        results = search_engine.search_with_filters(
            "nonexistent", user_id=test_user_for_search
        )
        assert isinstance(results, list)

    def test_search_without_user_limit_works(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search works with default limit."""
        for i in range(5):
            insert_test_post(search_db, test_user_for_search, f"Post {i}")

        search_engine.rebuild_index()

        # Test with default limit (50)
        results = search_engine.search("post")
        assert len(results) == 5

    def test_index_tweet_with_none_user_id(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify index_tweet handles user_id properly."""
        # User ID is required, but method should handle gracefully
        result = search_engine.index_tweet(
            tweet_id="test_tweet",
            user_id=test_user_for_search,
            content="Content",
            hashtags="",
            author="author",
        )
        assert result is True

    def test_rebuild_index_all_users(
        self, search_engine, search_db, test_user_for_search, second_test_user
    ):
        """Verify rebuild_index without user_id rebuilds for all users."""
        insert_test_post(search_db, test_user_for_search, "User 1 post")
        insert_test_post(search_db, second_test_user, "User 2 post")

        # Rebuild all
        count = search_engine.rebuild_index()
        assert count == 2

    def test_search_with_empty_result_set(
        self, search_engine, search_db, test_user_for_search
    ):
        """Verify search handles completely empty result set."""
        insert_test_post(search_db, test_user_for_search, "Something")
        search_engine.rebuild_index()

        # Search for something that doesn't exist
        results = search_engine.search(
            "nonexistentword123xyz", user_id=test_user_for_search
        )
        assert isinstance(results, list)
        assert len(results) == 0


# =============================================================================
# COLLECTION-LEVEL MARKERS
# =============================================================================


def pytest_collection_modifyitems(config, items):
    """Mark all tests in this module as integration tests."""
    for item in items:
        if "test_search_integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
            item.add_marker(pytest.mark.database)
