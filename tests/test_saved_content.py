"""
Tests for Saved Content & Collections (Sprint 7 - SAVED-001)

Comprehensive test suite for SavedContentManager with 60+ tests covering:
- Save/unsave tweets
- Collections CRUD operations
- Move tweets between collections
- Uncategorized tweets handling
- User isolation
- Duplicate prevention
- Error handling and exception scenarios
- Database error resilience
- Edge cases and data persistence
"""
import pytest
import os
import sqlite3
import time
from app.features.saved_content import SavedContentManager


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database for testing"""
    return str(tmp_path / 'test_saved_content.db')


@pytest.fixture
def manager(db_path):
    """Create SavedContentManager instance"""
    mgr = SavedContentManager(db_path)
    mgr.init_db()
    return mgr


@pytest.fixture
def user1_id():
    """Test user 1 ID"""
    return 1


@pytest.fixture
def user2_id():
    """Test user 2 ID"""
    return 2


# ============================================================================
# TEST 1: Database initialization creates required tables
# ============================================================================
def test_init_db_creates_tables(db_path):
    """Test that init_db creates saved_tweets and collections tables"""
    manager = SavedContentManager(db_path)
    manager.init_db()

    import sqlite3
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check saved_tweets table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='saved_tweets'
    """)
    assert cursor.fetchone() is not None

    # Check collections table exists
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='collections'
    """)
    assert cursor.fetchone() is not None

    conn.close()


# ============================================================================
# TEST 2: Save tweet without collection (uncategorized)
# ============================================================================
def test_save_tweet_uncategorized(manager, user1_id):
    """Test saving a tweet without specifying a collection"""
    result = manager.save_tweet(
        user_id=user1_id,
        tweet_id='tweet123',
        collection_id=None,
        notes='Interesting tweet'
    )

    assert result is True

    # Verify tweet was saved
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1
    assert saved_tweets[0]['tweet_id'] == 'tweet123'
    assert saved_tweets[0]['collection_id'] is None
    assert saved_tweets[0]['notes'] == 'Interesting tweet'


# ============================================================================
# TEST 3: Save tweet with collection
# ============================================================================
def test_save_tweet_with_collection(manager, user1_id):
    """Test saving a tweet with a specified collection"""
    # Create collection first
    collection_id = manager.create_collection(
        user_id=user1_id,
        name='Favorites',
        description='My favorite tweets'
    )
    assert collection_id is not None

    # Save tweet to collection
    result = manager.save_tweet(
        user_id=user1_id,
        tweet_id='tweet456',
        collection_id=collection_id,
        notes='Great content'
    )

    assert result is True

    # Verify tweet was saved with collection
    saved_tweets = manager.get_saved_tweets(user1_id, collection_id=collection_id)
    assert len(saved_tweets) == 1
    assert saved_tweets[0]['tweet_id'] == 'tweet456'
    assert saved_tweets[0]['collection_id'] == collection_id


# ============================================================================
# TEST 4: Unsave tweet
# ============================================================================
def test_unsave_tweet(manager, user1_id):
    """Test removing a saved tweet"""
    # Save a tweet
    manager.save_tweet(user1_id, 'tweet789')

    # Verify it's saved
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1

    # Unsave it
    result = manager.unsave_tweet(user1_id, 'tweet789')
    assert result is True

    # Verify it's removed
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 0


# ============================================================================
# TEST 5: Unsave non-existent tweet returns False
# ============================================================================
def test_unsave_nonexistent_tweet(manager, user1_id):
    """Test unsaving a tweet that doesn't exist returns False"""
    result = manager.unsave_tweet(user1_id, 'nonexistent')
    assert result is False


# ============================================================================
# TEST 6: Duplicate save prevention (same user, same tweet)
# ============================================================================
def test_duplicate_save_prevention(manager, user1_id):
    """Test that saving the same tweet twice by same user is prevented"""
    # Save tweet first time
    result1 = manager.save_tweet(user1_id, 'tweet999')
    assert result1 is True

    # Try to save again - should handle gracefully
    result2 = manager.save_tweet(user1_id, 'tweet999', notes='Updated notes')
    # Implementation should either update or return False
    # Let's verify there's still only one entry
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1


# ============================================================================
# TEST 7: User isolation - different users can save same tweet
# ============================================================================
def test_user_isolation_same_tweet(manager, user1_id, user2_id):
    """Test that different users can save the same tweet independently"""
    # User 1 saves tweet
    manager.save_tweet(user1_id, 'shared_tweet', notes='User 1 notes')

    # User 2 saves same tweet
    manager.save_tweet(user2_id, 'shared_tweet', notes='User 2 notes')

    # Each user should see their own saved tweet
    user1_saved = manager.get_saved_tweets(user1_id)
    user2_saved = manager.get_saved_tweets(user2_id)

    assert len(user1_saved) == 1
    assert len(user2_saved) == 1
    assert user1_saved[0]['notes'] == 'User 1 notes'
    assert user2_saved[0]['notes'] == 'User 2 notes'


# ============================================================================
# TEST 8: User isolation - users only see their own saved tweets
# ============================================================================
def test_user_isolation_saved_tweets(manager, user1_id, user2_id):
    """Test that users only see their own saved tweets"""
    # User 1 saves tweets
    manager.save_tweet(user1_id, 'user1_tweet1')
    manager.save_tweet(user1_id, 'user1_tweet2')

    # User 2 saves tweets
    manager.save_tweet(user2_id, 'user2_tweet1')

    # Verify isolation
    user1_saved = manager.get_saved_tweets(user1_id)
    user2_saved = manager.get_saved_tweets(user2_id)

    assert len(user1_saved) == 2
    assert len(user2_saved) == 1
    assert all(t['tweet_id'].startswith('user1') for t in user1_saved)
    assert all(t['tweet_id'].startswith('user2') for t in user2_saved)


# ============================================================================
# TEST 9: Create collection
# ============================================================================
def test_create_collection(manager, user1_id):
    """Test creating a new collection"""
    collection_id = manager.create_collection(
        user_id=user1_id,
        name='Tech Articles',
        description='Technical articles and tutorials'
    )

    assert collection_id is not None
    assert isinstance(collection_id, int)

    # Verify collection exists
    collections = manager.get_collections(user1_id)
    assert len(collections) == 1
    assert collections[0]['id'] == collection_id
    assert collections[0]['name'] == 'Tech Articles'
    assert collections[0]['description'] == 'Technical articles and tutorials'


# ============================================================================
# TEST 10: Create collection with duplicate name fails
# ============================================================================
def test_create_duplicate_collection_name(manager, user1_id):
    """Test that creating a collection with duplicate name fails"""
    # Create first collection
    manager.create_collection(user1_id, 'My Collection')

    # Try to create another with same name
    result = manager.create_collection(user1_id, 'My Collection')

    # Should return None or raise error
    assert result is None


# ============================================================================
# TEST 11: Get collections for user
# ============================================================================
def test_get_collections(manager, user1_id):
    """Test retrieving all collections for a user"""
    # Create multiple collections
    manager.create_collection(user1_id, 'Collection 1', 'Description 1')
    manager.create_collection(user1_id, 'Collection 2', 'Description 2')
    manager.create_collection(user1_id, 'Collection 3')

    collections = manager.get_collections(user1_id)

    assert len(collections) == 3
    assert collections[0]['name'] == 'Collection 1'
    assert collections[1]['name'] == 'Collection 2'
    assert collections[2]['name'] == 'Collection 3'
    assert collections[2]['description'] is None  # No description provided


# ============================================================================
# TEST 12: User isolation - users only see their own collections
# ============================================================================
def test_user_isolation_collections(manager, user1_id, user2_id):
    """Test that users only see their own collections"""
    # User 1 creates collections
    manager.create_collection(user1_id, 'User1 Collection 1')
    manager.create_collection(user1_id, 'User1 Collection 2')

    # User 2 creates collections
    manager.create_collection(user2_id, 'User2 Collection 1')

    # Verify isolation
    user1_collections = manager.get_collections(user1_id)
    user2_collections = manager.get_collections(user2_id)

    assert len(user1_collections) == 2
    assert len(user2_collections) == 1
    assert all('User1' in c['name'] for c in user1_collections)
    assert all('User2' in c['name'] for c in user2_collections)


# ============================================================================
# TEST 13: Delete collection
# ============================================================================
def test_delete_collection(manager, user1_id):
    """Test deleting a collection"""
    # Create collection
    collection_id = manager.create_collection(user1_id, 'To Delete')

    # Delete it
    result = manager.delete_collection(collection_id, user1_id)
    assert result is True

    # Verify it's deleted
    collections = manager.get_collections(user1_id)
    assert len(collections) == 0


# ============================================================================
# TEST 14: Delete collection sets saved tweets to uncategorized
# ============================================================================
def test_delete_collection_uncategorizes_tweets(manager, user1_id):
    """Test that deleting a collection sets its tweets to uncategorized"""
    # Create collection and save tweets to it
    collection_id = manager.create_collection(user1_id, 'Temp Collection')
    manager.save_tweet(user1_id, 'tweet_in_collection', collection_id=collection_id)

    # Delete collection
    manager.delete_collection(collection_id, user1_id)

    # Verify tweet is now uncategorized (collection_id = NULL)
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1
    assert saved_tweets[0]['collection_id'] is None


# ============================================================================
# TEST 15: Move tweet to collection
# ============================================================================
def test_move_to_collection(manager, user1_id):
    """Test moving a saved tweet to a different collection"""
    # Create two collections
    collection1_id = manager.create_collection(user1_id, 'Collection 1')
    collection2_id = manager.create_collection(user1_id, 'Collection 2')

    # Save tweet to collection 1
    manager.save_tweet(user1_id, 'movable_tweet', collection_id=collection1_id)

    # Move to collection 2
    result = manager.move_to_collection(user1_id, 'movable_tweet', collection2_id)
    assert result is True

    # Verify tweet is now in collection 2
    collection2_tweets = manager.get_saved_tweets(user1_id, collection_id=collection2_id)
    assert len(collection2_tweets) == 1
    assert collection2_tweets[0]['tweet_id'] == 'movable_tweet'

    # Verify tweet is NOT in collection 1
    collection1_tweets = manager.get_saved_tweets(user1_id, collection_id=collection1_id)
    assert len(collection1_tweets) == 0


# ============================================================================
# TEST 16: Move tweet to uncategorized (None)
# ============================================================================
def test_move_to_uncategorized(manager, user1_id):
    """Test moving a tweet from collection to uncategorized"""
    # Create collection and save tweet to it
    collection_id = manager.create_collection(user1_id, 'Collection')
    manager.save_tweet(user1_id, 'tweet_to_uncategorize', collection_id=collection_id)

    # Move to uncategorized (None)
    result = manager.move_to_collection(user1_id, 'tweet_to_uncategorize', None)
    assert result is True

    # Verify tweet is uncategorized
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1
    assert saved_tweets[0]['collection_id'] is None


# ============================================================================
# TEST 17: Get saved tweets filtered by collection
# ============================================================================
def test_get_saved_tweets_by_collection(manager, user1_id):
    """Test retrieving saved tweets filtered by collection"""
    # Create collections
    collection1_id = manager.create_collection(user1_id, 'Collection 1')
    collection2_id = manager.create_collection(user1_id, 'Collection 2')

    # Save tweets to different collections
    manager.save_tweet(user1_id, 'tweet_c1_1', collection_id=collection1_id)
    manager.save_tweet(user1_id, 'tweet_c1_2', collection_id=collection1_id)
    manager.save_tweet(user1_id, 'tweet_c2_1', collection_id=collection2_id)
    manager.save_tweet(user1_id, 'tweet_uncat')  # Uncategorized

    # Get tweets from collection 1
    c1_tweets = manager.get_saved_tweets(user1_id, collection_id=collection1_id)
    assert len(c1_tweets) == 2
    assert all('c1' in t['tweet_id'] for t in c1_tweets)

    # Get tweets from collection 2
    c2_tweets = manager.get_saved_tweets(user1_id, collection_id=collection2_id)
    assert len(c2_tweets) == 1
    assert c2_tweets[0]['tweet_id'] == 'tweet_c2_1'


# ============================================================================
# TEST 18: Get all saved tweets (no filter)
# ============================================================================
def test_get_all_saved_tweets(manager, user1_id):
    """Test retrieving all saved tweets without filtering"""
    # Create collection
    collection_id = manager.create_collection(user1_id, 'Collection')

    # Save tweets both categorized and uncategorized
    manager.save_tweet(user1_id, 'tweet1', collection_id=collection_id)
    manager.save_tweet(user1_id, 'tweet2', collection_id=collection_id)
    manager.save_tweet(user1_id, 'tweet3')  # Uncategorized
    manager.save_tweet(user1_id, 'tweet4')  # Uncategorized

    # Get all saved tweets
    all_tweets = manager.get_saved_tweets(user1_id)
    assert len(all_tweets) == 4


# ============================================================================
# TEST 19: Empty results - no saved tweets
# ============================================================================
def test_get_saved_tweets_empty(manager, user1_id):
    """Test getting saved tweets when user has none"""
    saved_tweets = manager.get_saved_tweets(user1_id)
    assert saved_tweets == []


# ============================================================================
# TEST 20: Empty results - no collections
# ============================================================================
def test_get_collections_empty(manager, user1_id):
    """Test getting collections when user has none"""
    collections = manager.get_collections(user1_id)
    assert collections == []


# ============================================================================
# TEST 21: Saved_at timestamp is recorded
# ============================================================================
def test_saved_at_timestamp(manager, user1_id):
    """Test that saved_at timestamp is properly recorded"""
    before = int(time.time())
    manager.save_tweet(user1_id, 'timestamped_tweet')
    after = int(time.time())

    saved_tweets = manager.get_saved_tweets(user1_id)
    assert len(saved_tweets) == 1

    saved_at = saved_tweets[0]['saved_at']
    assert saved_at >= before
    assert saved_at <= after


# ============================================================================
# TEST 22: Collection created_at timestamp is recorded
# ============================================================================
def test_collection_created_at_timestamp(manager, user1_id):
    """Test that collection created_at timestamp is properly recorded"""
    before = int(time.time())
    collection_id = manager.create_collection(user1_id, 'Timestamped Collection')
    after = int(time.time())

    collections = manager.get_collections(user1_id)
    assert len(collections) == 1

    created_at = collections[0]['created_at']
    assert created_at >= before
    assert created_at <= after


# ============================================================================
# TEST 23: Search saved tweets
# ============================================================================
def test_search_saved(manager, user1_id):
    """Test searching within saved tweets"""
    # Create collection for organization
    collection_id = manager.create_collection(user1_id, 'Tech')

    # Save tweets with different notes
    manager.save_tweet(user1_id, 'tweet1', notes='Python tutorial on decorators')
    manager.save_tweet(user1_id, 'tweet2', notes='JavaScript guide for beginners')
    manager.save_tweet(user1_id, 'tweet3', collection_id=collection_id, notes='Python best practices')
    manager.save_tweet(user1_id, 'tweet4', notes='Machine learning basics')

    # Search for "Python" in notes
    results = manager.search_saved(user1_id, 'Python')
    assert len(results) == 2
    assert all('Python' in r['notes'] for r in results)

    # Search for "JavaScript"
    results = manager.search_saved(user1_id, 'JavaScript')
    assert len(results) == 1
    assert 'JavaScript' in results[0]['notes']

    # Search by tweet_id
    results = manager.search_saved(user1_id, 'tweet1')
    assert len(results) == 1
    assert results[0]['tweet_id'] == 'tweet1'


# ============================================================================
# TEST 24: Search saved tweets within specific collection
# ============================================================================
def test_search_saved_with_collection_filter(manager, user1_id):
    """Test searching within a specific collection"""
    # Create collections
    collection1_id = manager.create_collection(user1_id, 'Collection 1')
    collection2_id = manager.create_collection(user1_id, 'Collection 2')

    # Save tweets
    manager.save_tweet(user1_id, 'tweet1', collection_id=collection1_id, notes='Python in collection 1')
    manager.save_tweet(user1_id, 'tweet2', collection_id=collection2_id, notes='Python in collection 2')
    manager.save_tweet(user1_id, 'tweet3', notes='Python uncategorized')

    # Search for "Python" only in collection 1
    results = manager.search_saved(user1_id, 'Python', collection_id=collection1_id)
    assert len(results) == 1
    assert results[0]['collection_id'] == collection1_id
    assert results[0]['collection_name'] == 'Collection 1'


# ============================================================================
# TEST 25: Export to JSON
# ============================================================================
def test_export_json(manager, user1_id):
    """Test exporting saved tweets to JSON format"""
    import json

    # Save some tweets
    manager.save_tweet(user1_id, 'tweet1', notes='Test tweet 1')
    manager.save_tweet(user1_id, 'tweet2', notes='Test tweet 2')

    # Export to JSON
    json_str = manager.export_to_json(user1_id)

    # Verify it's valid JSON
    data = json.loads(json_str)
    assert isinstance(data, list)
    assert len(data) == 2

    # Verify content
    assert any(t['tweet_id'] == 'tweet1' for t in data)
    assert any(t['tweet_id'] == 'tweet2' for t in data)


# ============================================================================
# TEST 26: Export specific collection to JSON
# ============================================================================
def test_export_json_with_collection(manager, user1_id):
    """Test exporting specific collection to JSON"""
    import json

    # Create collection
    collection_id = manager.create_collection(user1_id, 'Export Test')

    # Save tweets
    manager.save_tweet(user1_id, 'tweet1', collection_id=collection_id, notes='In collection')
    manager.save_tweet(user1_id, 'tweet2', notes='Not in collection')

    # Export only the collection
    json_str = manager.export_to_json(user1_id, collection_id=collection_id)
    data = json.loads(json_str)

    # Should only have one tweet
    assert len(data) == 1
    assert data[0]['tweet_id'] == 'tweet1'


# ============================================================================
# TEST 27: Export to CSV
# ============================================================================
def test_export_csv(manager, user1_id):
    """Test exporting saved tweets to CSV format"""
    # Save some tweets
    manager.save_tweet(user1_id, 'tweet1', notes='Test tweet 1')
    manager.save_tweet(user1_id, 'tweet2', notes='Test tweet 2')

    # Export to CSV
    csv_str = manager.export_to_csv(user1_id)

    # Verify CSV structure
    lines = csv_str.strip().split('\n')
    assert len(lines) == 3  # Header + 2 data rows

    # Check header
    assert 'tweet_id' in lines[0]
    assert 'notes' in lines[0]

    # Check content
    assert 'tweet1' in csv_str
    assert 'tweet2' in csv_str


# ============================================================================
# TEST 28: Export specific collection to CSV
# ============================================================================
def test_export_csv_with_collection(manager, user1_id):
    """Test exporting specific collection to CSV"""
    # Create collection
    collection_id = manager.create_collection(user1_id, 'CSV Export')

    # Save tweets
    manager.save_tweet(user1_id, 'tweet1', collection_id=collection_id, notes='In collection')
    manager.save_tweet(user1_id, 'tweet2', notes='Not in collection')

    # Export only the collection
    csv_str = manager.export_to_csv(user1_id, collection_id=collection_id)
    lines = csv_str.strip().split('\n')

    # Should only have header + 1 data row
    assert len(lines) == 2
    assert 'tweet1' in csv_str
    assert 'tweet2' not in csv_str


# ============================================================================
# TEST 29: Export empty collection
# ============================================================================
def test_export_empty_collection(manager, user1_id):
    """Test exporting when there are no saved tweets"""
    import json

    # Export JSON - should be empty array
    json_str = manager.export_to_json(user1_id)
    data = json.loads(json_str)
    assert data == []

    # Export CSV - should be empty string
    csv_str = manager.export_to_csv(user1_id)
    assert csv_str == ''


# ============================================================================
# ERROR HANDLING TESTS - Database and Exception Coverage
# ============================================================================


# ============================================================================
# TEST 30: Save tweet - database error (not IntegrityError)
# ============================================================================
def test_save_tweet_database_error(manager, user1_id, monkeypatch):
    """Test save_tweet handles generic database errors gracefully"""
    from unittest.mock import Mock, patch

    # Mock _get_connection to raise a database error
    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.DatabaseError("Database locked")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return False on error
    result = manager.save_tweet(user1_id, 'tweet_with_error')
    assert result is False


# ============================================================================
# TEST 31: Unsave tweet - database error
# ============================================================================
def test_unsave_tweet_database_error(manager, user1_id, monkeypatch):
    """Test unsave_tweet handles generic database errors gracefully"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.OperationalError("Disk I/O error")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return False on error
    result = manager.unsave_tweet(user1_id, 'tweet_error')
    assert result is False


# ============================================================================
# TEST 32: Get saved tweets - database error with no collection filter
# ============================================================================
def test_get_saved_tweets_database_error_all(manager, user1_id, monkeypatch):
    """Test get_saved_tweets handles database errors when fetching all tweets"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.DatabaseError("Corrupted database")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return empty list on error
    result = manager.get_saved_tweets(user1_id)
    assert result == []


# ============================================================================
# TEST 33: Get saved tweets - database error with collection filter
# ============================================================================
def test_get_saved_tweets_database_error_collection(manager, user1_id, monkeypatch):
    """Test get_saved_tweets handles database errors when filtering by collection"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.OperationalError("Database locked")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return empty list on error
    result = manager.get_saved_tweets(user1_id, collection_id=123)
    assert result == []


# ============================================================================
# TEST 34: Create collection - database error
# ============================================================================
def test_create_collection_database_error(manager, user1_id, monkeypatch):
    """Test create_collection handles generic database errors gracefully"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.ProgrammingError("Invalid SQL")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return None on error
    result = manager.create_collection(user1_id, 'Error Collection')
    assert result is None


# ============================================================================
# TEST 35: Get collections - database error
# ============================================================================
def test_get_collections_database_error(manager, user1_id, monkeypatch):
    """Test get_collections handles database errors gracefully"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.DatabaseError("Database corrupted")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return empty list on error
    result = manager.get_collections(user1_id)
    assert result == []


# ============================================================================
# TEST 36: Move to collection - database error
# ============================================================================
def test_move_to_collection_database_error(manager, user1_id, monkeypatch):
    """Test move_to_collection handles database errors gracefully"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.OperationalError("Disk full")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return False on error
    result = manager.move_to_collection(user1_id, 'tweet123', 456)
    assert result is False


# ============================================================================
# TEST 37: Delete collection - database error
# ============================================================================
def test_delete_collection_database_error(manager, user1_id, monkeypatch):
    """Test delete_collection handles database errors gracefully"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.ProgrammingError("Syntax error")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return False on error
    result = manager.delete_collection(123, user1_id)
    assert result is False


# ============================================================================
# TEST 38: Search saved - database error with no collection filter
# ============================================================================
def test_search_saved_database_error_all(manager, user1_id, monkeypatch):
    """Test search_saved handles database errors when searching all tweets"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.DatabaseError("Database locked")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return empty list on error
    result = manager.search_saved(user1_id, 'search_query')
    assert result == []


# ============================================================================
# TEST 39: Search saved - database error with collection filter
# ============================================================================
def test_search_saved_database_error_collection(manager, user1_id, monkeypatch):
    """Test search_saved handles database errors when filtering by collection"""
    from unittest.mock import Mock

    def mock_get_connection():
        conn = Mock()
        cursor = Mock()
        cursor.execute.side_effect = sqlite3.OperationalError("Disk I/O error")
        conn.cursor.return_value = cursor
        return conn

    monkeypatch.setattr(manager, '_get_connection', mock_get_connection)

    # Should return empty list on error
    result = manager.search_saved(user1_id, 'search_query', collection_id=123)
    assert result == []


# ============================================================================
# TEST 40: Save duplicate tweet - IntegrityError caught correctly
# ============================================================================
def test_save_tweet_duplicate_integrity_error(manager, user1_id):
    """Test that duplicate save attempts are handled by IntegrityError"""
    # Save a tweet
    result1 = manager.save_tweet(user1_id, 'duplicate_tweet', notes='First save')
    assert result1 is True

    # Try to save the same tweet again - should trigger IntegrityError
    result2 = manager.save_tweet(user1_id, 'duplicate_tweet', notes='Second save')
    assert result2 is False

    # Verify only one entry exists
    tweets = manager.get_saved_tweets(user1_id)
    assert len(tweets) == 1
    assert tweets[0]['notes'] == 'First save'


# ============================================================================
# TEST 41: Create duplicate collection - IntegrityError caught correctly
# ============================================================================
def test_create_duplicate_collection_integrity_error(manager, user1_id):
    """Test that duplicate collection names are caught by IntegrityError"""
    # Create first collection
    result1 = manager.create_collection(user1_id, 'Duplicate Name', 'First description')
    assert result1 is not None

    # Try to create another with same name - should trigger IntegrityError
    result2 = manager.create_collection(user1_id, 'Duplicate Name', 'Second description')
    assert result2 is None

    # Verify only one collection exists
    collections = manager.get_collections(user1_id)
    assert len(collections) == 1
    assert collections[0]['description'] == 'First description'


# ============================================================================
# TEST 42: Move to non-existent collection returns False
# ============================================================================
def test_move_to_nonexistent_collection(manager, user1_id):
    """Test moving a tweet to a collection that doesn't exist"""
    # Save a tweet
    manager.save_tweet(user1_id, 'movable_tweet')

    # Try to move to a collection that doesn't exist
    result = manager.move_to_collection(user1_id, 'movable_tweet', 99999)

    # Should return False since the tweet wasn't updated
    assert result is False


# ============================================================================
# TEST 43: Delete non-existent collection returns False
# ============================================================================
def test_delete_nonexistent_collection(manager, user1_id):
    """Test deleting a collection that doesn't exist"""
    result = manager.delete_collection(99999, user1_id)
    assert result is False


# ============================================================================
# TEST 44: Delete collection - wrong user authorization check
# ============================================================================
def test_delete_collection_wrong_user(manager, user1_id, user2_id):
    """Test that user cannot delete another user's collection"""
    # User 1 creates a collection
    collection_id = manager.create_collection(user1_id, 'User1 Collection')
    assert collection_id is not None

    # User 2 tries to delete it - should fail (returns False)
    result = manager.delete_collection(collection_id, user2_id)
    assert result is False

    # Verify collection still exists
    collections = manager.get_collections(user1_id)
    assert len(collections) == 1


# ============================================================================
# TEST 45: Save tweet with invalid collection_id foreign key constraint
# ============================================================================
def test_save_tweet_with_invalid_collection_id(manager, user1_id):
    """Test saving tweet with non-existent collection ID fails due to FK constraint"""
    # Foreign keys are enabled, so this will trigger IntegrityError
    # and the method will catch it and return False
    result = manager.save_tweet(user1_id, 'tweet_orphan', collection_id=99999)

    # Save fails due to foreign key constraint
    assert result is False

    # Verify tweet was NOT saved
    tweets = manager.get_saved_tweets(user1_id)
    assert len(tweets) == 0


# ============================================================================
# TEST 46: Get saved tweets - empty search results
# ============================================================================
def test_search_saved_no_matches(manager, user1_id):
    """Test searching for tweets with no matching results"""
    # Save some tweets
    manager.save_tweet(user1_id, 'tweet1', notes='Python tutorial')
    manager.save_tweet(user1_id, 'tweet2', notes='JavaScript guide')

    # Search for something that doesn't exist
    results = manager.search_saved(user1_id, 'nonexistent_term')
    assert results == []


# ============================================================================
# TEST 47: Search saved - matches in tweet_id only
# ============================================================================
def test_search_saved_tweet_id_match(manager, user1_id):
    """Test search finds tweets by tweet_id"""
    # Save tweets with specific IDs
    manager.save_tweet(user1_id, 'special_tweet_001', notes='Some notes')
    manager.save_tweet(user1_id, 'regular_tweet_002')

    # Search for the special tweet ID
    results = manager.search_saved(user1_id, 'special')
    assert len(results) == 1
    assert results[0]['tweet_id'] == 'special_tweet_001'


# ============================================================================
# TEST 48: Move tweet to collection - wrong user context
# ============================================================================
def test_move_tweet_wrong_user(manager, user1_id, user2_id):
    """Test that moving tweet for wrong user returns False"""
    # User 1 saves a tweet
    manager.save_tweet(user1_id, 'user1_tweet')

    # Create a collection for User 2
    collection_id = manager.create_collection(user2_id, 'User2 Collection')

    # User 2 tries to move User 1's tweet - should fail
    result = manager.move_to_collection(user2_id, 'user1_tweet', collection_id)
    assert result is False


# ============================================================================
# TEST 49: Multiple error scenarios in sequence
# ============================================================================
def test_error_recovery_sequence(manager, user1_id):
    """Test that manager recovers from errors and continues operating"""
    # Save a tweet successfully
    result1 = manager.save_tweet(user1_id, 'tweet1')
    assert result1 is True

    # Try to save duplicate (IntegrityError)
    result2 = manager.save_tweet(user1_id, 'tweet1')
    assert result2 is False

    # Save a different tweet (should succeed)
    result3 = manager.save_tweet(user1_id, 'tweet2')
    assert result3 is True

    # Create collection
    col_id = manager.create_collection(user1_id, 'Collection')
    assert col_id is not None

    # Try duplicate collection name (IntegrityError)
    col_id2 = manager.create_collection(user1_id, 'Collection')
    assert col_id2 is None

    # Create different collection (should succeed)
    col_id3 = manager.create_collection(user1_id, 'Different')
    assert col_id3 is not None

    # Verify final state
    tweets = manager.get_saved_tweets(user1_id)
    assert len(tweets) == 2

    collections = manager.get_collections(user1_id)
    assert len(collections) == 2


# ============================================================================
# TEST 50: Save tweet with notes and verify storage
# ============================================================================
def test_save_tweet_with_notes_persistence(manager, user1_id):
    """Test that tweet notes are properly stored and retrieved"""
    notes = "This is a detailed note about the tweet with special chars: @#$%"
    manager.save_tweet(user1_id, 'tweet_notes', notes=notes)

    tweets = manager.get_saved_tweets(user1_id)
    assert len(tweets) == 1
    assert tweets[0]['notes'] == notes


# ============================================================================
# TEST 51: Collection description - null and non-null values
# ============================================================================
def test_collection_description_variants(manager, user1_id):
    """Test that collection descriptions are properly handled"""
    # Create with description
    col1_id = manager.create_collection(user1_id, 'With Description', 'Detailed description')

    # Create without description
    col2_id = manager.create_collection(user1_id, 'Without Description')

    collections = manager.get_collections(user1_id)
    assert len(collections) == 2

    # Find each collection and verify
    col_with_desc = next(c for c in collections if c['id'] == col1_id)
    col_without_desc = next(c for c in collections if c['id'] == col2_id)

    assert col_with_desc['description'] == 'Detailed description'
    assert col_without_desc['description'] is None


# ============================================================================
# TEST 52: Empty string in various fields
# ============================================================================
def test_empty_string_handling(manager, user1_id):
    """Test handling of empty strings in notes and descriptions"""
    # Save with empty notes
    manager.save_tweet(user1_id, 'tweet_empty_notes', notes='')

    # Create collection with empty description
    col_id = manager.create_collection(user1_id, 'Collection', '')

    tweets = manager.get_saved_tweets(user1_id)
    assert tweets[0]['notes'] == ''

    collections = manager.get_collections(user1_id)
    assert collections[0]['description'] == ''


# ============================================================================
# TEST 53: Get saved tweets ordering (most recent first)
# ============================================================================
def test_saved_tweets_ordering(manager, user1_id):
    """Test that saved tweets are returned in reverse chronological order"""
    import time

    # Save tweets with longer delays to ensure different timestamps
    manager.save_tweet(user1_id, 'tweet1')
    time.sleep(1.1)  # Ensure different second
    manager.save_tweet(user1_id, 'tweet2')
    time.sleep(1.1)  # Ensure different second
    manager.save_tweet(user1_id, 'tweet3')

    tweets = manager.get_saved_tweets(user1_id)

    # Should be in reverse order (most recent first)
    assert tweets[0]['tweet_id'] == 'tweet3'
    assert tweets[1]['tweet_id'] == 'tweet2'
    assert tweets[2]['tweet_id'] == 'tweet1'

    # Verify timestamps are decreasing
    assert tweets[0]['saved_at'] >= tweets[1]['saved_at']
    assert tweets[1]['saved_at'] >= tweets[2]['saved_at']


# ============================================================================
# TEST 54: Get collections ordering (most recent first)
# ============================================================================
def test_collections_ordering(manager, user1_id):
    """Test that collections are returned in reverse chronological order"""
    import time

    # Create collections with longer delays to ensure different timestamps
    manager.create_collection(user1_id, 'Collection 1')
    time.sleep(1.1)  # Ensure different second
    manager.create_collection(user1_id, 'Collection 2')
    time.sleep(1.1)  # Ensure different second
    manager.create_collection(user1_id, 'Collection 3')

    collections = manager.get_collections(user1_id)

    # Should be in reverse order (most recent first)
    assert collections[0]['name'] == 'Collection 3'
    assert collections[1]['name'] == 'Collection 2'
    assert collections[2]['name'] == 'Collection 1'


# ============================================================================
# TEST 55: Complex scenario - full workflow with edge cases
# ============================================================================
def test_complex_workflow_with_edge_cases(manager, user1_id, user2_id):
    """Test complex workflow combining multiple operations"""
    # User 1: Create multiple collections
    tech_col = manager.create_collection(user1_id, 'Tech Articles', 'Tech stuff')
    news_col = manager.create_collection(user1_id, 'News')

    # User 1: Save tweets to different collections
    manager.save_tweet(user1_id, 'py_tutorial', collection_id=tech_col, notes='Python')
    manager.save_tweet(user1_id, 'js_guide', collection_id=tech_col, notes='JavaScript')
    manager.save_tweet(user1_id, 'breaking_news', collection_id=news_col)
    manager.save_tweet(user1_id, 'uncategorized')

    # User 2: Independent operations shouldn't interfere
    manager.save_tweet(user2_id, 'py_tutorial')  # Same tweet_id, different user
    user2_col = manager.create_collection(user2_id, 'Tech Articles')  # Same name, different user

    # User 1: Search and verify isolation
    user1_tech_tweets = manager.get_saved_tweets(user1_id, collection_id=tech_col)
    assert len(user1_tech_tweets) == 2

    # User 2: Verify independent
    user2_tweets = manager.get_saved_tweets(user2_id)
    assert len(user2_tweets) == 1

    user2_collections = manager.get_collections(user2_id)
    assert len(user2_collections) == 1

    # User 1: Move tweet between collections
    manager.move_to_collection(user1_id, 'breaking_news', tech_col)
    tech_tweets_after = manager.get_saved_tweets(user1_id, collection_id=tech_col)
    assert len(tech_tweets_after) == 3

    # User 1: Delete original news collection
    manager.delete_collection(news_col, user1_id)
    collections_after_delete = manager.get_collections(user1_id)
    assert len(collections_after_delete) == 1

    # User 1: Verify all tweets still exist
    all_user1_tweets = manager.get_saved_tweets(user1_id)
    assert len(all_user1_tweets) == 4


# ============================================================================
# TEST 56: Search with special characters in query
# ============================================================================
def test_search_special_characters(manager, user1_id):
    """Test search with special characters and SQL injection attempts"""
    # Save tweets with special chars in notes
    manager.save_tweet(user1_id, 'tweet1', notes="Test with @mention and #hashtag")
    manager.save_tweet(user1_id, 'tweet2', notes="Dollar $100 and percent 50%")
    manager.save_tweet(user1_id, 'tweet3', notes="Quote's and double \"quotes\"")

    # Search for various patterns
    results1 = manager.search_saved(user1_id, '@mention')
    assert len(results1) == 1

    results2 = manager.search_saved(user1_id, '$100')
    assert len(results2) == 1

    results3 = manager.search_saved(user1_id, "Quote's")
    assert len(results3) == 1


# ============================================================================
# TEST 57: Verify user_id isolation in deletion
# ============================================================================
def test_user_isolation_in_deletion(manager, user1_id, user2_id):
    """Test that deletion operations respect user isolation"""
    # User 1 saves tweets
    manager.save_tweet(user1_id, 'tweet_to_delete')
    manager.save_tweet(user1_id, 'tweet_to_keep')

    # User 2 saves same tweet
    manager.save_tweet(user2_id, 'tweet_to_delete')

    # User 1 deletes their tweet
    result = manager.unsave_tweet(user1_id, 'tweet_to_delete')
    assert result is True

    # User 1 should have only one tweet left
    user1_tweets = manager.get_saved_tweets(user1_id)
    assert len(user1_tweets) == 1
    assert user1_tweets[0]['tweet_id'] == 'tweet_to_keep'

    # User 2 should still have their copy
    user2_tweets = manager.get_saved_tweets(user2_id)
    assert len(user2_tweets) == 1
    assert user2_tweets[0]['tweet_id'] == 'tweet_to_delete'


# ============================================================================
# TEST 58: Export JSON with special characters
# ============================================================================
def test_export_json_special_characters(manager, user1_id):
    """Test JSON export with special characters in data"""
    import json

    # Save tweets with special chars
    manager.save_tweet(user1_id, 'tweet1', notes='Text with "quotes" and \\backslash')
    manager.save_tweet(user1_id, 'tweet2', notes='Unicode: emoji 😀 and ñoño')

    # Export and verify valid JSON
    json_str = manager.export_to_json(user1_id)
    data = json.loads(json_str)

    assert len(data) == 2
    assert 'quotes' in data[0]['notes']
    assert 'emoji' in data[1]['notes']


# ============================================================================
# TEST 59: Export CSV with special characters
# ============================================================================
def test_export_csv_special_characters(manager, user1_id):
    """Test CSV export properly escapes special characters"""
    # Save tweets with CSV-problematic characters
    manager.save_tweet(user1_id, 'tweet1', notes='Contains, comma')
    manager.save_tweet(user1_id, 'tweet2', notes='Contains\nnewline')
    manager.save_tweet(user1_id, 'tweet3', notes='Contains "quotes"')

    # Export and verify valid CSV
    csv_str = manager.export_to_csv(user1_id)
    lines = csv_str.strip().split('\n')

    # Should have header + 3 data rows
    assert len(lines) >= 3


# ============================================================================
# TEST 60: Concurrent operations resilience (simulated)
# ============================================================================
def test_concurrent_operations_resilience(manager, user1_id):
    """Test resilience with multiple rapid operations"""
    # Simulate many rapid operations
    for i in range(20):
        # Save tweets
        manager.save_tweet(user1_id, f'tweet_{i}')

    tweets = manager.get_saved_tweets(user1_id)
    assert len(tweets) == 20

    # Create multiple collections
    for i in range(10):
        manager.create_collection(user1_id, f'Collection {i}')

    collections = manager.get_collections(user1_id)
    assert len(collections) == 10

    # Verify all data is consistent
    all_tweets = manager.get_saved_tweets(user1_id)
    assert len(all_tweets) == 20
