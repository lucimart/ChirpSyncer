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
- Author filtering
- Boolean operators
- Proximity search (NEAR operator)
- Index rebuild
"""
import sqlite3
import os
import tempfile
import time
import pytest
from app.features.search_engine import SearchEngine


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


def test_search_with_author_filter(search_engine):
    """Test: Searching with author filter returns only tweets from that author"""
    # Index tweets from different authors
    search_engine.index_tweet("1", 1, "Python tutorial by Alice", "", "alice")
    search_engine.index_tweet("2", 1, "Python guide by Bob", "", "bob")
    search_engine.index_tweet("3", 1, "Python basics by Alice", "", "alice")
    search_engine.index_tweet("4", 1, "JavaScript by Alice", "", "alice")

    # Search with author filter
    filters = {'author': 'alice'}
    results = search_engine.search_with_filters(
        query="Python",
        user_id=1,
        filters=filters
    )

    assert len(results) == 2, "Should find only Python tweets by alice"
    assert all(r['author'] == 'alice' for r in results), "All results should be from alice"
    assert all('python' in r['content'].lower() for r in results), "All results should contain Python"


def test_search_near_operator(search_engine):
    """Test: Proximity search with NEAR operator finds words within specified distance"""
    # Index tweets with words at different proximities
    search_engine.index_tweet("1", 1, "database and SQL are important", "", "testuser")
    search_engine.index_tweet("2", 1, "database SQL", "", "testuser")  # Close proximity
    search_engine.index_tweet("3", 1, "database things SQL", "", "testuser")  # Within 5 words
    search_engine.index_tweet("4", 1, "database one two three four five six SQL", "", "testuser")  # Beyond 5 words

    # FTS5 NEAR syntax: NEAR(term1 term2, N) where N is max intervening terms
    # NEAR(database SQL, 5) means within 5 words of each other
    results = search_engine.search(query="NEAR(database SQL, 5)", user_id=1)

    # Should find tweets 1, 2, and 3 (within 5 words), but not 4
    assert len(results) >= 2, "Should find at least 2 tweets with words close together"

    # Verify that tweets with closer proximity are found
    tweet_ids_found = [r['tweet_id'] for r in results]
    assert "2" in tweet_ids_found, "Should find tweet with immediate proximity"
    assert "3" in tweet_ids_found, "Should find tweet within 5 words"


def test_search_without_user_id(search_engine):
    """Test: Search without user_id filter returns tweets from all users"""
    # Index tweets for different users
    search_engine.index_tweet("1", 1, "Python programming", "", "testuser")
    search_engine.index_tweet("2", 2, "Python tutorial", "", "otheruser")
    search_engine.index_tweet("3", 1, "JavaScript code", "", "testuser")

    # Search without user_id (covers line 211)
    results = search_engine.search(query="Python", user_id=None)

    assert len(results) == 2, "Should find tweets from all users"
    assert any(r['user_id'] == 1 for r in results), "Should include user 1 tweets"
    assert any(r['user_id'] == 2 for r in results), "Should include user 2 tweets"


def test_search_empty_query_without_user_id(search_engine):
    """Test: Empty query without user_id returns all tweets from all users"""
    # Index tweets for different users
    search_engine.index_tweet("1", 1, "First tweet", "", "testuser")
    search_engine.index_tweet("2", 2, "Second tweet", "", "otheruser")
    search_engine.index_tweet("3", 1, "Third tweet", "", "testuser")

    # Empty query without user_id (covers line 228)
    results = search_engine.search(query="", user_id=None, limit=50)

    assert len(results) == 3, "Should return all tweets from all users"


def test_search_exception_handling(temp_db):
    """Test: Search handles database errors gracefully and returns empty list"""
    engine = SearchEngine(temp_db)
    # Don't initialize FTS index to force an error

    # Attempt to search on non-existent FTS table (covers lines 250-252)
    results = engine.search(query="test", user_id=1)

    assert results == [], "Should return empty list on database error"
    assert isinstance(results, list), "Should return list type even on error"


def test_search_with_invalid_fts_syntax(search_engine):
    """Test: Invalid FTS syntax returns empty list"""
    # Index some tweets first
    search_engine.index_tweet("1", 1, "Python programming", "", "testuser")

    # Use invalid FTS syntax that might cause error
    results = search_engine.search(query="INVALID_SYNTAX(*&^%)", user_id=1)

    # Should return empty list or handle gracefully
    assert isinstance(results, list), "Should return list even with invalid syntax"


def test_search_with_filters_exception_handling(temp_db):
    """Test: search_with_filters handles database errors gracefully"""
    engine = SearchEngine(temp_db)
    # Don't initialize FTS index to force an error

    # Attempt to search with filters on non-existent FTS table (covers lines 352-354)
    results = engine.search_with_filters(
        query="test",
        user_id=1,
        filters={'date_from': 100, 'date_to': 200}
    )

    assert results == [], "Should return empty list on database error"
    assert isinstance(results, list), "Should return list type even on error"


def test_search_with_filters_none_filters(search_engine):
    """Test: search_with_filters with None filters initializes as empty dict"""
    # Index a tweet
    search_engine.index_tweet("1", 1, "Test tweet", "#test", "testuser")

    # Call with None filters (covers line 275)
    results = search_engine.search_with_filters(
        query="Test",
        user_id=1,
        filters=None
    )

    assert len(results) == 1, "Should find tweet with None filters"


def test_rebuild_index_with_user_id(search_engine, temp_db):
    """Test: rebuild_index with specific user_id only reindexes that user's tweets"""
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

    now = int(time.time())
    # Insert tweets for different users
    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("111", "twitter", "hash1", "User 1 tweet", 1, "user1", "#test", now))

    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("222", "twitter", "hash2", "User 2 tweet", 2, "user2", "#test", now))

    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("333", "twitter", "hash3", "User 1 another tweet", 1, "user1", "#test", now))

    conn.commit()
    conn.close()

    # Clear the index first
    search_engine.rebuild_index()

    # Rebuild for user 1 only (covers line 372)
    count = search_engine.rebuild_index(user_id=1)

    assert count == 2, "Should index only user 1's 2 tweets"

    # Verify user 1 tweets are searchable
    results = search_engine.search(query="tweet", user_id=1)
    assert len(results) == 2, "Should find user 1's indexed tweets"


def test_rebuild_index_without_user_id(search_engine, temp_db):
    """Test: rebuild_index without user_id reindexes all tweets"""
    # Create synced_posts table
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

    now = int(time.time())
    # Insert tweets for multiple users
    for i in range(3):
        cursor.execute("""
        INSERT INTO synced_posts
        (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (str(100 + i), "twitter", f"hash{i}", f"Tweet {i}", i + 1, f"user{i+1}", "#test", now))

    conn.commit()
    conn.close()

    # Rebuild all (covers line 378)
    count = search_engine.rebuild_index()

    assert count == 3, "Should index all 3 tweets"


def test_rebuild_index_exception_handling(temp_db):
    """Test: rebuild_index handles database errors gracefully"""
    engine = SearchEngine(temp_db)
    # Don't initialize FTS index to force an error

    # Attempt to rebuild on non-existent FTS table (covers lines 418-420)
    count = engine.rebuild_index()

    assert count == 0, "Should return 0 on database error"
    assert isinstance(count, int), "Should return int type even on error"


def test_rebuild_index_with_null_user_ids(search_engine, temp_db):
    """Test: rebuild_index skips tweets with NULL user_id"""
    # Create synced_posts table
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

    now = int(time.time())
    # Insert tweet with user_id
    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("111", "twitter", "hash1", "Valid tweet", 1, "user1", "#test", now))

    # Insert tweet without user_id (should be skipped)
    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("222", "twitter", "hash2", "Invalid tweet", None, "user2", "#test", now))

    conn.commit()
    conn.close()

    # Rebuild index
    count = search_engine.rebuild_index()

    assert count == 1, "Should index only tweet with non-null user_id"


def test_get_search_stats_exception_handling(temp_db):
    """Test: get_search_stats handles database errors gracefully"""
    engine = SearchEngine(temp_db)
    # Don't initialize FTS index to force an error

    # Attempt to get stats on non-existent FTS table (covers lines 454-456)
    stats = engine.get_search_stats(user_id=1)

    assert stats['user_id'] == 1, "Should return user_id"
    assert stats['total_indexed'] == 0, "Should return 0 indexed on error"
    assert stats['last_indexed'] == 0, "Should return 0 for last_indexed on error"
    assert isinstance(stats, dict), "Should return dict type even on error"


def test_get_search_stats_empty_user(search_engine):
    """Test: get_search_stats returns zeros for user with no indexed tweets"""
    # Get stats for user with no indexed tweets
    stats = search_engine.get_search_stats(user_id=999)

    assert stats['user_id'] == 999, "Should return requested user_id"
    assert stats['total_indexed'] == 0, "Should return 0 for user with no tweets"
    assert stats['last_indexed'] == 0, "Should return 0 for last_indexed"


def test_index_tweet_exception_handling(temp_db):
    """Test: index_tweet handles database errors gracefully"""
    engine = SearchEngine(temp_db)
    # Don't initialize FTS index to force an error

    # Attempt to index tweet on non-existent FTS table (covers lines 175-177)
    result = engine.index_tweet(
        tweet_id="123",
        user_id=1,
        content="Test tweet",
        hashtags="#test",
        author="testuser"
    )

    assert result is False, "Should return False on database error"
    assert isinstance(result, bool), "Should return bool type even on error"


def test_index_tweet_with_none_posted_at(search_engine):
    """Test: index_tweet uses current time when posted_at is None"""
    before = int(time.time())

    result = search_engine.index_tweet(
        tweet_id="123",
        user_id=1,
        content="Test tweet",
        hashtags="#test",
        author="testuser",
        posted_at=None  # Should use current time
    )

    after = int(time.time())
    assert result is True, "Should succeed"

    # Verify tweet was indexed with current timestamp
    stats = search_engine.get_search_stats(user_id=1)
    assert stats['total_indexed'] == 1, "Should have indexed the tweet"
    assert before <= stats['last_indexed'] <= after + 1, "Timestamp should be current time"


def test_search_with_filters_complex_hashtags(search_engine):
    """Test: search_with_filters handles multiple hashtag filters correctly"""
    now = int(time.time())

    # Index tweets with various hashtags
    search_engine.index_tweet("1", 1, "Python and Java", "#python #java #coding", "testuser", posted_at=now)
    search_engine.index_tweet("2", 1, "Just Python", "#python #tutorial", "testuser", posted_at=now)
    search_engine.index_tweet("3", 1, "Just Ruby", "#ruby #programming", "testuser", posted_at=now)

    # Filter by multiple hashtags (should match any)
    filters = {'hashtags': ['python', 'ruby']}
    results = search_engine.search_with_filters(
        query="",
        user_id=1,
        filters=filters
    )

    assert len(results) == 3, "Should find all tweets with python or ruby hashtags"


def test_search_with_filters_date_boundaries(search_engine):
    """Test: search_with_filters correctly handles date boundary conditions"""
    now = int(time.time())
    exact_time = now - 3600  # Exact boundary

    # Index tweets at exact boundary and outside
    search_engine.index_tweet("1", 1, "At boundary", "#test", "testuser", posted_at=exact_time)
    search_engine.index_tweet("2", 1, "Before boundary", "#test", "testuser", posted_at=exact_time - 1)
    search_engine.index_tweet("3", 1, "After boundary", "#test", "testuser", posted_at=exact_time + 1)

    # Search with exact boundaries
    filters = {
        'date_from': exact_time,
        'date_to': exact_time
    }
    results = search_engine.search_with_filters(
        query="",
        user_id=1,
        filters=filters
    )

    assert len(results) == 1, "Should find only tweet at exact boundary"
    assert results[0]['tweet_id'] == "1", "Should find the boundary tweet"


def test_init_fts_index_idempotent(temp_db):
    """Test: init_fts_index is idempotent and can be called multiple times"""
    engine = SearchEngine(temp_db)

    # Create synced_posts table first (required for triggers)
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
    conn.commit()
    conn.close()

    # Initialize multiple times
    result1 = engine.init_fts_index()
    result2 = engine.init_fts_index()
    result3 = engine.init_fts_index()

    assert result1 is True, "First initialization should succeed"
    assert result2 is True, "Second initialization should succeed"
    assert result3 is True, "Third initialization should succeed"

    # Verify table exists
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tweet_search_index'")
    assert cursor.fetchone() is not None, "Table should exist"
    conn.close()


def test_search_with_filters_author_exact_match(search_engine):
    """Test: search_with_filters author filter requires exact match"""
    # Index tweets from similar authors
    search_engine.index_tweet("1", 1, "Tweet", "#test", "alice", posted_at=int(time.time()))
    search_engine.index_tweet("2", 1, "Tweet", "#test", "alice_extended", posted_at=int(time.time()))
    search_engine.index_tweet("3", 1, "Tweet", "#test", "bob", posted_at=int(time.time()))

    # Filter by exact author name
    filters = {'author': 'alice'}
    results = search_engine.search_with_filters(
        query="",
        user_id=1,
        filters=filters
    )

    assert len(results) == 1, "Should find only exact author match"
    assert results[0]['author'] == 'alice', "Should be exact alice"


def test_search_with_filters_combined_query_and_hashtag(search_engine):
    """Test: search_with_filters works with both FTS query and hashtag filter"""
    now = int(time.time())

    # Index tweets with different content and hashtags
    search_engine.index_tweet("1", 1, "Python programming", "#python #coding", "testuser", posted_at=now)
    search_engine.index_tweet("2", 1, "Java programming", "#java #coding", "testuser", posted_at=now)
    search_engine.index_tweet("3", 1, "Python tutorial", "#tutorial #other", "testuser", posted_at=now)

    # Search for Python with python hashtag
    filters = {'hashtags': ['python']}
    results = search_engine.search_with_filters(
        query="programming",
        user_id=1,
        filters=filters
    )

    assert len(results) == 1, "Should find only Python programming tweet"
    assert 'programming' in results[0]['content'].lower(), "Should contain query term"
    assert '#python' in results[0]['hashtags'].lower(), "Should have Python hashtag"


def test_search_edge_case_very_long_content(search_engine):
    """Test: search handles very long content correctly"""
    # Create very long content
    long_content = "Python " * 1000 + "is great"

    result = search_engine.index_tweet(
        tweet_id="long1",
        user_id=1,
        content=long_content,
        hashtags="#python #longtext",
        author="testuser"
    )

    assert result is True, "Should index long content"

    # Search for word in long content
    results = search_engine.search(query="Python", user_id=1)
    assert len(results) == 1, "Should find tweet with long content"


def test_search_special_characters_in_content(search_engine):
    """Test: search handles special characters in content"""
    # Index tweets with special characters
    search_engine.index_tweet("1", 1, "Test (Python) programming @user #hashtag", "#test", "testuser")
    search_engine.index_tweet("2", 1, "Quote: 'programming is fun'", "#test", "testuser")
    search_engine.index_tweet("3", 1, "Path: /home/user/project/file.py", "#test", "testuser")

    # Search with special characters
    results = search_engine.search(query="Python", user_id=1)
    assert len(results) >= 1, "Should find tweet with special characters"


def test_rebuild_index_with_bluesky_uri(search_engine, temp_db):
    """Test: rebuild_index handles tweets with bluesky_uri instead of twitter_id"""
    # Create synced_posts table
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

    now = int(time.time())
    # Insert bluesky post without twitter_id
    cursor.execute("""
    INSERT INTO synced_posts
    (twitter_id, bluesky_uri, source, content_hash, original_text, user_id, twitter_username, hashtags, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (None, "at://bsky.social/post123", "bluesky", "hash_bsky", "Bluesky post about Python", 1, "user1", "#python", now))

    conn.commit()
    conn.close()

    # Rebuild index
    count = search_engine.rebuild_index()

    assert count == 1, "Should index bluesky post"

    # Verify searchable
    results = search_engine.search(query="Python", user_id=1)
    assert len(results) == 1, "Should find bluesky indexed post"
    assert results[0]['tweet_id'] == "at://bsky.social/post123", "Should use bluesky_uri as tweet_id"
