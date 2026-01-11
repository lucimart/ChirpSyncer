"""
Tests for Saved Content & Collections (Sprint 7 - SAVED-001)

Comprehensive test suite for SavedContentManager with 15+ tests covering:
- Save/unsave tweets
- Collections CRUD operations
- Move tweets between collections
- Uncategorized tweets handling
- User isolation
- Duplicate prevention
- Edge cases and error handling
"""
import pytest
import os
import time
from app.saved_content import SavedContentManager


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
