"""
Tests for Full-Text Search Engine (SEARCH-001)

Tests cover:
- FTS5 index initialization
- Tweet indexing
- Basic search
- Phrase search
- Search ranking
- User filtering
- Date range filtering
- Hashtag search
- Boolean operators
- Index rebuild
"""
import sqlite3
import os
import tempfile
import time
import pytest
from app.search_engine import SearchEngine


@pytest.fixture
def temp_db():
    """Create temporary database for testing"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    yield db_path

    # Cleanup
    if os.path.exists(db_path):
        os.unlink(db_path)


@pytest.fixture
def search_engine(temp_db):
    """Create SearchEngine instance with initialized database"""
    engine = SearchEngine(temp_db)

    # Initialize users table (required for foreign key)
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0
    )
    """)
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                   ("testuser", "hash123"))
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                   ("otheruser", "hash456"))
    conn.commit()
    conn.close()

    # Initialize FTS index
    engine.init_fts_index()

    return engine


def test_init_fts_index(search_engine, temp_db):
    """Test: FTS5 index initialization creates required tables and triggers"""
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    # Check that tweet_search_index virtual table exists
    cursor.execute("""
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='tweet_search_index'
    """)
    assert cursor.fetchone() is not None, "tweet_search_index should exist"

    # Check that it's an FTS5 table
    cursor.execute("SELECT sql FROM sqlite_master WHERE name='tweet_search_index'")
    sql = cursor.fetchone()[0]
    assert 'fts5' in sql.lower(), "Should be FTS5 virtual table"
    assert 'porter' in sql.lower(), "Should use porter tokenizer"

    conn.close()


def test_index_tweet_basic(search_engine):
    """Test: Index a single tweet successfully"""
    result = search_engine.index_tweet(
        tweet_id="123456",
        user_id=1,
        content="Testing full-text search with Python",
        hashtags="#python #testing",
        author="testuser"
    )

    assert result is True, "Should return True on successful index"

    # Verify tweet was indexed
    stats = search_engine.get_search_stats(user_id=1)
    assert stats['total_indexed'] == 1, "Should have 1 indexed tweet"


def test_search_basic(search_engine):
    """Test: Basic text search returns matching tweets"""
    # Index some tweets
    search_engine.index_tweet("1", 1, "Python programming is awesome", "", "testuser")
    search_engine.index_tweet("2", 1, "JavaScript tutorial for beginners", "", "testuser")
    search_engine.index_tweet("3", 1, "Learning Python for data science", "", "testuser")

    # Search for "python"
    results = search_engine.search(query="python", user_id=1)

    assert len(results) == 2, "Should find 2 tweets containing 'python'"
    assert all('python' in r['content'].lower() for r in results), "All results should contain 'python'"


def test_search_phrase_query(search_engine):
    """Test: Phrase search with quotes finds exact phrases"""
    # Index tweets
    search_engine.index_tweet("1", 1, "machine learning is amazing", "", "testuser")
    search_engine.index_tweet("2", 1, "learning machine code basics", "", "testuser")
    search_engine.index_tweet("3", 1, "machine learning algorithms", "", "testuser")

    # Phrase search should find exact phrase
    results = search_engine.search(query='"machine learning"', user_id=1)

    assert len(results) == 2, "Should find 2 tweets with exact phrase 'machine learning'"
    for result in results:
        content_lower = result['content'].lower()
        assert 'machine learning' in content_lower, "Should contain exact phrase"


def test_search_ranking(search_engine):
    """Test: Search results are ranked by relevance"""
    # Index tweets with different relevance
    search_engine.index_tweet("1", 1, "Python", "", "testuser")
    search_engine.index_tweet("2", 1, "Python Python Python programming", "", "testuser")
    search_engine.index_tweet("3", 1, "Learn Python basics", "", "testuser")

    # Search and check ranking
    results = search_engine.search(query="Python", user_id=1)

    assert len(results) == 3, "Should find 3 results"
    # Result with most occurrences should rank higher
    assert 'Python Python Python' in results[0]['content'], "Tweet with most matches should rank first"


def test_search_user_filtering(search_engine):
    """Test: User filtering returns only user's tweets"""
    # Index tweets for different users
    search_engine.index_tweet("1", 1, "Python programming", "", "testuser")
    search_engine.index_tweet("2", 2, "Python tutorial", "", "otheruser")
    search_engine.index_tweet("3", 1, "Python data science", "", "testuser")

    # Search for user 1 only
    results = search_engine.search(query="Python", user_id=1)

    assert len(results) == 2, "Should find only user 1's tweets"
    assert all(r['user_id'] == 1 for r in results), "All results should belong to user 1"


def test_search_with_date_range_filter(search_engine):
    """Test: Date range filtering returns tweets within range"""
    now = int(time.time())
    day_ago = now - 86400
    week_ago = now - 604800

    # Index tweets with different timestamps
    search_engine.index_tweet("1", 1, "Recent Python post", "", "testuser", posted_at=now)
    search_engine.index_tweet("2", 1, "Python post from yesterday", "", "testuser", posted_at=day_ago)
    search_engine.index_tweet("3", 1, "Old Python post", "", "testuser", posted_at=week_ago)

    # Search with date filter (last 2 days)
    filters = {
        'date_from': day_ago - 3600,  # Little before day_ago
        'date_to': now + 3600  # Little after now
    }
    results = search_engine.search_with_filters(
        query="Python",
        user_id=1,
        filters=filters
    )

    assert len(results) == 2, "Should find only tweets within date range"


def test_search_hashtag(search_engine):
    """Test: Hashtag search finds tweets with specific hashtag"""
    # Index tweets with hashtags
    search_engine.index_tweet("1", 1, "Learning Python", "#python #coding", "testuser")
    search_engine.index_tweet("2", 1, "JavaScript tips", "#javascript #webdev", "testuser")
    search_engine.index_tweet("3", 1, "Python tutorial", "#python #tutorial", "testuser")

    # Search by hashtag
    filters = {'hashtags': ['python']}
    results = search_engine.search_with_filters(
        query="",  # Empty query to test hashtag filter alone
        user_id=1,
        filters=filters
    )

    assert len(results) == 2, "Should find 2 tweets with #python"
    assert all('#python' in r['hashtags'].lower() for r in results), "All should have #python hashtag"


def test_search_boolean_operators(search_engine):
    """Test: Boolean operators (OR, AND) work correctly"""
    # Index tweets
    search_engine.index_tweet("1", 1, "Python programming language", "", "testuser")
    search_engine.index_tweet("2", 1, "JavaScript programming guide", "", "testuser")
    search_engine.index_tweet("3", 1, "Ruby tutorial", "", "testuser")

    # Test OR operator
    results_or = search_engine.search(query="Python OR JavaScript", user_id=1)
    assert len(results_or) == 2, "OR should find tweets with either term"

    # Test AND operator (implicit)
    results_and = search_engine.search(query="Python programming", user_id=1)
    assert len(results_and) >= 1, "Should find tweets with both terms"


def test_rebuild_index(search_engine, temp_db):
    """Test: Index rebuild reindexes all tweets from synced_posts"""
    # Create synced_posts table with sample data
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS synced_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twitter_id TEXT,
        bluesky_uri TEXT,
        source TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        synced_to TEXT,
        synced_at INTEGER,
        original_text TEXT NOT NULL,
        user_id INTEGER,
        twitter_username TEXT,
        hashtags TEXT,
        posted_at INTEGER
    )
    """)

    # Insert test data
    now = int(time.time())
    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("111", "twitter", "hash1", "First tweet about Python", 1, "testuser", "#python", now))

    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("222", "twitter", "hash2", "Second tweet about coding", 1, "testuser", "#coding", now))

    conn.commit()
    conn.close()

    # Rebuild index
    count = search_engine.rebuild_index()

    assert count == 2, "Should have indexed 2 tweets"

    # Verify tweets are searchable
    results = search_engine.search(query="Python", user_id=1)
    assert len(results) == 1, "Should find the indexed tweet"


def test_get_search_stats(search_engine):
    """Test: Search stats return correct counts"""
    # Index multiple tweets
    search_engine.index_tweet("1", 1, "Python programming", "#python", "testuser")
    search_engine.index_tweet("2", 1, "JavaScript coding", "#js", "testuser")
    search_engine.index_tweet("3", 1, "Ruby tutorial", "#ruby", "testuser")

    # Get stats
    stats = search_engine.get_search_stats(user_id=1)

    assert stats['total_indexed'] == 3, "Should have 3 indexed tweets"
    assert stats['user_id'] == 1, "Should match requested user_id"


def test_search_limit(search_engine):
    """Test: Search limit parameter restricts results"""
    # Index many tweets
    for i in range(20):
        search_engine.index_tweet(
            tweet_id=str(i),
            user_id=1,
            content=f"Python tweet number {i}",
            hashtags="",
            author="testuser"
        )

    # Search with limit
    results = search_engine.search(query="Python", user_id=1, limit=5)

    assert len(results) == 5, "Should return only 5 results as per limit"


def test_search_with_multiple_filters(search_engine):
    """Test: Multiple filters work together correctly"""
    now = int(time.time())
    yesterday = now - 86400

    # Index various tweets
    search_engine.index_tweet("1", 1, "Python web development", "#python #webdev", "testuser", posted_at=now)
    search_engine.index_tweet("2", 1, "Python data science", "#python #data", "testuser", posted_at=yesterday)
    search_engine.index_tweet("3", 1, "JavaScript frontend", "#javascript", "testuser", posted_at=now)

    # Apply multiple filters
    filters = {
        'hashtags': ['python'],
        'date_from': now - 3600,  # Last hour
        'date_to': now + 3600
    }

    results = search_engine.search_with_filters(
        query="",
        user_id=1,
        filters=filters
    )

    assert len(results) == 1, "Should find only tweets matching all filters"
    assert '#python' in results[0]['hashtags'].lower()


def test_search_empty_query(search_engine):
    """Test: Empty query with filters returns all matching tweets"""
    # Index tweets
    search_engine.index_tweet("1", 1, "First tweet", "", "testuser")
    search_engine.index_tweet("2", 1, "Second tweet", "", "testuser")

    # Search with empty query (should return all user's tweets)
    results = search_engine.search(query="", user_id=1, limit=50)

    assert len(results) == 2, "Empty query should return all user's tweets"


def test_duplicate_indexing(search_engine):
    """Test: Indexing same tweet twice doesn't create duplicates"""
    # Index same tweet twice
    search_engine.index_tweet("123", 1, "Duplicate tweet", "", "testuser")
    search_engine.index_tweet("123", 1, "Duplicate tweet", "", "testuser")

    # Should have only 1 result
    results = search_engine.search(query="Duplicate", user_id=1)
    assert len(results) == 1, "Should not create duplicate entries"
