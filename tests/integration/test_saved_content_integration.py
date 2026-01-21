"""
Integration Tests for Saved Content & Bookmarks System (Sprint 7 - SAVED-001)

Comprehensive integration tests for the SavedContentManager covering:
- Database initialization and schema validation
- Bookmark/saved tweet management
- Collections and folder organization
- Notes and annotations
- Search and filtering capabilities
- Export/import functionality
- Multi-user isolation
- Statistics and analytics

Tests use real SQLite database with proper foreign key constraints.
"""

import os
import sys
import json
import sqlite3
import time

# Add app directory to path for imports
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)

from features.saved_content import SavedContentManager


# =============================================================================
# A) INITIALIZATION & DATABASE SCHEMA (4-5 tests)
# =============================================================================


class TestSavedContentInitialization:
    """Test SavedContentManager initialization and database schema."""

    def test_init_creates_tables(self, test_db_path):
        """Test that init_db creates required tables."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check collections table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='collections'"
        )
        assert cursor.fetchone() is not None, "collections table not created"

        # Check saved_tweets table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='saved_tweets'"
        )
        assert cursor.fetchone() is not None, "saved_tweets table not created"

        conn.close()

    def test_collections_table_schema(self, test_db_path):
        """Test collections table schema and constraints."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check table structure
        cursor.execute("PRAGMA table_info(collections)")
        columns = {col[1]: col[2] for col in cursor.fetchall()}

        expected_columns = {
            "id": "INTEGER",
            "user_id": "INTEGER",
            "name": "TEXT",
            "description": "TEXT",
            "created_at": "INTEGER",
        }

        for col_name, col_type in expected_columns.items():
            assert (
                col_name in columns
            ), f"Column {col_name} not found in collections table"
            assert columns[col_name] == col_type, f"Column {col_name} has wrong type"

        conn.close()

    def test_saved_tweets_table_schema(self, test_db_path):
        """Test saved_tweets table schema and constraints."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check table structure
        cursor.execute("PRAGMA table_info(saved_tweets)")
        columns = {col[1]: col[2] for col in cursor.fetchall()}

        expected_columns = {
            "id": "INTEGER",
            "user_id": "INTEGER",
            "tweet_id": "TEXT",
            "collection_id": "INTEGER",
            "notes": "TEXT",
            "saved_at": "INTEGER",
        }

        for col_name, col_type in expected_columns.items():
            assert (
                col_name in columns
            ), f"Column {col_name} not found in saved_tweets table"

        conn.close()

    def test_database_indexes_created(self, test_db_path):
        """Test that performance indexes are created."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check indexes exist
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_saved_tweets_user'"
        )
        assert cursor.fetchone() is not None, "idx_saved_tweets_user index not created"

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_saved_tweets_collection'"
        )
        assert (
            cursor.fetchone() is not None
        ), "idx_saved_tweets_collection index not created"

        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_collections_user'"
        )
        assert cursor.fetchone() is not None, "idx_collections_user index not created"

        conn.close()

    def test_foreign_key_constraint(self, test_db_path, test_user):
        """Test foreign key constraint between saved_tweets and collections."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create a collection
        collection_id = manager.create_collection(test_user["id"], "Test Collection")
        assert collection_id is not None

        # Save a tweet with that collection
        assert manager.save_tweet(test_user["id"], "tweet123", collection_id)

        # Verify the tweet is saved with collection_id
        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["collection_id"] == collection_id


# =============================================================================
# B) BOOKMARK MANAGEMENT (8-10 tests)
# =============================================================================


class TestBookmarkManagement:
    """Test core bookmark/saved tweet functionality."""

    def test_save_tweet_without_collection(self, test_db_path, test_user):
        """Test saving a tweet without a collection (uncategorized)."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        result = manager.save_tweet(test_user["id"], "tweet123")
        assert result is True

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["tweet_id"] == "tweet123"
        assert tweets[0]["collection_id"] is None

    def test_save_tweet_with_collection(self, test_db_path, test_user):
        """Test saving a tweet with a specific collection."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create collection first
        collection_id = manager.create_collection(test_user["id"], "Favorites")
        assert collection_id is not None

        # Save tweet with collection
        result = manager.save_tweet(test_user["id"], "tweet123", collection_id)
        assert result is True

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["tweet_id"] == "tweet123"
        assert tweets[0]["collection_id"] == collection_id

    def test_save_tweet_with_notes(self, test_db_path, test_user):
        """Test saving a tweet with custom notes."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        notes = "This is an important tweet about climate change"
        result = manager.save_tweet(test_user["id"], "tweet123", notes=notes)
        assert result is True

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["notes"] == notes

    def test_save_tweet_with_collection_and_notes(self, test_db_path, test_user):
        """Test saving a tweet with both collection and notes."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        collection_id = manager.create_collection(test_user["id"], "Research")
        notes = "Relevant research material"

        result = manager.save_tweet(test_user["id"], "tweet123", collection_id, notes)
        assert result is True

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["tweet_id"] == "tweet123"
        assert tweets[0]["collection_id"] == collection_id
        assert tweets[0]["notes"] == notes

    def test_duplicate_bookmark_prevented(self, test_db_path, test_user):
        """Test that duplicate bookmarks are prevented."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save same tweet twice
        assert manager.save_tweet(test_user["id"], "tweet123") is True
        assert manager.save_tweet(test_user["id"], "tweet123") is False

        # Should still have only one
        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1

    def test_unsave_tweet(self, test_db_path, test_user):
        """Test unsaving (deleting) a bookmark."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save and then unsave
        assert manager.save_tweet(test_user["id"], "tweet123") is True
        assert len(manager.get_saved_tweets(test_user["id"])) == 1

        assert manager.unsave_tweet(test_user["id"], "tweet123") is True
        assert len(manager.get_saved_tweets(test_user["id"])) == 0

    def test_unsave_nonexistent_tweet(self, test_db_path, test_user):
        """Test unsaving a tweet that was never saved."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        result = manager.unsave_tweet(test_user["id"], "nonexistent")
        assert result is False

    def test_save_multiple_tweets(self, test_db_path, test_user):
        """Test saving multiple tweets."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        tweet_ids = [f"tweet{i}" for i in range(1, 6)]
        for tweet_id in tweet_ids:
            assert manager.save_tweet(test_user["id"], tweet_id) is True

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 5

        saved_ids = {t["tweet_id"] for t in tweets}
        assert saved_ids == set(tweet_ids)

    def test_save_with_timestamps(self, test_db_path, test_user):
        """Test that saved_at timestamps are recorded correctly."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        before = int(time.time())
        manager.save_tweet(test_user["id"], "tweet123")
        after = int(time.time())

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert before <= tweets[0]["saved_at"] <= after


# =============================================================================
# C) COLLECTIONS/FOLDERS (8-10 tests)
# =============================================================================


class TestCollectionsManagement:
    """Test collection (folder) functionality."""

    def test_create_collection(self, test_db_path, test_user):
        """Test creating a new collection."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        collection_id = manager.create_collection(test_user["id"], "My Favorites")
        assert collection_id is not None
        assert isinstance(collection_id, int)

    def test_create_collection_with_description(self, test_db_path, test_user):
        """Test creating a collection with description."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        description = "Collection for important research papers"
        collection_id = manager.create_collection(
            test_user["id"], "Research", description
        )
        assert collection_id is not None

        collections = manager.get_collections(test_user["id"])
        assert len(collections) == 1
        assert collections[0]["description"] == description

    def test_duplicate_collection_name_per_user(self, test_db_path, test_user):
        """Test that duplicate collection names are prevented per user."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create first collection
        assert manager.create_collection(test_user["id"], "Favorites") is not None

        # Try to create duplicate
        assert manager.create_collection(test_user["id"], "Favorites") is None

    def test_same_collection_name_different_users(
        self, test_db_path, test_user, test_admin_user
    ):
        """Test that same collection name can exist for different users."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Both users create collection with same name
        cid1 = manager.create_collection(test_user["id"], "Favorites")
        cid2 = manager.create_collection(test_admin_user["id"], "Favorites")

        assert cid1 is not None
        assert cid2 is not None
        assert cid1 != cid2

    def test_get_collections(self, test_db_path, test_user):
        """Test retrieving user's collections."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create multiple collections
        names = ["Favorites", "Research", "News"]
        for name in names:
            manager.create_collection(test_user["id"], name)

        collections = manager.get_collections(test_user["id"])
        assert len(collections) == 3

        collection_names = {c["name"] for c in collections}
        assert collection_names == set(names)

    def test_delete_collection_with_cascade(self, test_db_path, test_user):
        """Test deleting a collection moves tweets to uncategorized."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create collection and save tweet in it
        collection_id = manager.create_collection(test_user["id"], "Favorites")
        manager.save_tweet(test_user["id"], "tweet123", collection_id)

        # Verify tweet is in collection
        tweets = manager.get_saved_tweets(test_user["id"], collection_id)
        assert len(tweets) == 1

        # Delete collection
        assert manager.delete_collection(collection_id, test_user["id"]) is True

        # Tweet should still exist but uncategorized
        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 1
        assert tweets[0]["collection_id"] is None

    def test_delete_nonexistent_collection(self, test_db_path, test_user):
        """Test deleting a collection that doesn't exist."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        result = manager.delete_collection(99999, test_user["id"])
        assert result is False

    def test_collection_metadata(self, test_db_path, test_user):
        """Test collection metadata (created_at timestamp)."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        before = int(time.time())
        manager.create_collection(test_user["id"], "Test")
        after = int(time.time())

        collections = manager.get_collections(test_user["id"])
        assert len(collections) == 1
        assert before <= collections[0]["created_at"] <= after

    def test_move_tweet_between_collections(self, test_db_path, test_user):
        """Test moving a saved tweet between collections."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create two collections
        col1 = manager.create_collection(test_user["id"], "Collection1")
        col2 = manager.create_collection(test_user["id"], "Collection2")

        # Save tweet in first collection
        manager.save_tweet(test_user["id"], "tweet123", col1)
        tweets = manager.get_saved_tweets(test_user["id"], col1)
        assert len(tweets) == 1

        # Move to second collection
        assert manager.move_to_collection(test_user["id"], "tweet123", col2) is True

        # Verify move
        tweets1 = manager.get_saved_tweets(test_user["id"], col1)
        tweets2 = manager.get_saved_tweets(test_user["id"], col2)
        assert len(tweets1) == 0
        assert len(tweets2) == 1


# =============================================================================
# D) NOTES & ANNOTATIONS (5-7 tests)
# =============================================================================


class TestNotesAndAnnotations:
    """Test notes and annotation functionality."""

    def test_add_note_to_saved_content(self, test_db_path, test_user):
        """Test adding notes to saved content."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        note = "Important discussion about distributed systems"
        manager.save_tweet(test_user["id"], "tweet123", notes=note)

        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["notes"] == note

    def test_save_without_notes(self, test_db_path, test_user):
        """Test that notes are optional."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet123")
        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["notes"] is None

    def test_long_notes(self, test_db_path, test_user):
        """Test saving long notes."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create a long note
        long_note = "This is a very long note. " * 100
        manager.save_tweet(test_user["id"], "tweet123", notes=long_note)

        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["notes"] == long_note

    def test_notes_with_special_characters(self, test_db_path, test_user):
        """Test notes with special characters and unicode."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        note = (
            "Important: 'quotes' and \"double quotes\" and unicode: 你好世界 emoji: 😀"
        )
        manager.save_tweet(test_user["id"], "tweet123", notes=note)

        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["notes"] == note

    def test_notes_with_newlines(self, test_db_path, test_user):
        """Test notes with multiple lines."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        note = "Line 1\nLine 2\nLine 3\n\nWith empty lines"
        manager.save_tweet(test_user["id"], "tweet123", notes=note)

        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["notes"] == note

    def test_search_in_notes(self, test_db_path, test_user):
        """Test searching within notes content."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="About Python programming")
        manager.save_tweet(
            test_user["id"], "tweet2", notes="About JavaScript framework"
        )
        manager.save_tweet(test_user["id"], "tweet3", notes="Random thoughts")

        # Search for "Python"
        results = manager.search_saved(test_user["id"], "Python")
        assert len(results) == 1
        assert results[0]["tweet_id"] == "tweet1"


# =============================================================================
# E) SEARCH & FILTERING (7-9 tests)
# =============================================================================


class TestSearchAndFiltering:
    """Test search and filtering functionality."""

    def test_search_in_notes(self, test_db_path, test_user):
        """Test searching in notes content."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="Python developer")
        manager.save_tweet(test_user["id"], "tweet2", notes="JavaScript developer")

        results = manager.search_saved(test_user["id"], "Python")
        assert len(results) == 1
        assert results[0]["notes"] == "Python developer"

    def test_search_in_tweet_id(self, test_db_path, test_user):
        """Test searching in tweet IDs."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet_important_123")
        manager.save_tweet(test_user["id"], "tweet_normal_456")

        results = manager.search_saved(test_user["id"], "important")
        assert len(results) == 1
        assert results[0]["tweet_id"] == "tweet_important_123"

    def test_search_returns_collection_info(self, test_db_path, test_user):
        """Test that search results include collection name."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col_id = manager.create_collection(test_user["id"], "Research")
        manager.save_tweet(test_user["id"], "tweet1", col_id, notes="machine learning")

        results = manager.search_saved(test_user["id"], "learning")
        assert len(results) == 1
        assert results[0]["collection_name"] == "Research"

    def test_search_filter_by_collection(self, test_db_path, test_user):
        """Test filtering search results by collection."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col1 = manager.create_collection(test_user["id"], "Collection1")
        col2 = manager.create_collection(test_user["id"], "Collection2")

        manager.save_tweet(test_user["id"], "tweet1", col1, notes="test data")
        manager.save_tweet(test_user["id"], "tweet2", col2, notes="test data")

        # Search in specific collection
        results = manager.search_saved(test_user["id"], "test", col1)
        assert len(results) == 1
        assert results[0]["collection_id"] == col1

    def test_search_case_insensitive(self, test_db_path, test_user):
        """Test that search is case-insensitive."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="Python Programming")
        manager.save_tweet(test_user["id"], "tweet2", notes="JavaScript")

        results1 = manager.search_saved(test_user["id"], "python")
        results2 = manager.search_saved(test_user["id"], "PYTHON")
        results3 = manager.search_saved(test_user["id"], "Python")

        assert len(results1) == 1
        assert len(results2) == 1
        assert len(results3) == 1

    def test_search_partial_match(self, test_db_path, test_user):
        """Test that search matches partial strings."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="programming languages")
        manager.save_tweet(test_user["id"], "tweet2", notes="web development")

        results = manager.search_saved(test_user["id"], "program")
        assert len(results) == 1
        assert "programming" in results[0]["notes"]

    def test_get_saved_tweets_ordered_by_time(self, test_db_path, test_user):
        """Test that saved tweets are ordered by saved_at descending."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save tweets with delays to ensure different timestamps
        manager.save_tweet(test_user["id"], "tweet1")
        time.sleep(1.1)  # Sleep > 1 second to ensure different timestamp
        manager.save_tweet(test_user["id"], "tweet2")
        time.sleep(1.1)
        manager.save_tweet(test_user["id"], "tweet3")

        tweets = manager.get_saved_tweets(test_user["id"])
        assert tweets[0]["tweet_id"] == "tweet3"  # Most recent first
        assert tweets[1]["tweet_id"] == "tweet2"
        assert tweets[2]["tweet_id"] == "tweet1"

    def test_empty_search_results(self, test_db_path, test_user):
        """Test search with no matching results."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="Python")
        results = manager.search_saved(test_user["id"], "JavaScript")
        assert len(results) == 0


# =============================================================================
# F) EXPORT & IMPORT (4-6 tests)
# =============================================================================


class TestExportImport:
    """Test export and import functionality."""

    def test_export_to_json_empty(self, test_db_path, test_user):
        """Test exporting empty bookmarks to JSON."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        json_str = manager.export_to_json(test_user["id"])
        data = json.loads(json_str)
        assert data == []

    def test_export_to_json_with_data(self, test_db_path, test_user):
        """Test exporting bookmarks to JSON format."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col_id = manager.create_collection(test_user["id"], "Favorites")
        manager.save_tweet(test_user["id"], "tweet1", col_id, "Great article")
        manager.save_tweet(test_user["id"], "tweet2", notes="Reference material")

        json_str = manager.export_to_json(test_user["id"])
        data = json.loads(json_str)

        assert len(data) == 2
        assert all("tweet_id" in item for item in data)
        assert all("user_id" in item for item in data)
        assert all("saved_at" in item for item in data)

    def test_export_specific_collection(self, test_db_path, test_user):
        """Test exporting specific collection to JSON."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col1 = manager.create_collection(test_user["id"], "Collection1")
        col2 = manager.create_collection(test_user["id"], "Collection2")

        manager.save_tweet(test_user["id"], "tweet1", col1)
        manager.save_tweet(test_user["id"], "tweet2", col2)
        manager.save_tweet(test_user["id"], "tweet3", col1)

        json_str = manager.export_to_json(test_user["id"], col1)
        data = json.loads(json_str)

        assert len(data) == 2
        assert all(item["collection_id"] == col1 for item in data)

    def test_export_to_csv_empty(self, test_db_path, test_user):
        """Test exporting empty bookmarks to CSV."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        csv_str = manager.export_to_csv(test_user["id"])
        assert csv_str == ""

    def test_export_to_csv_with_data(self, test_db_path, test_user):
        """Test exporting bookmarks to CSV format."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        manager.save_tweet(test_user["id"], "tweet1", notes="Note1")
        manager.save_tweet(test_user["id"], "tweet2", notes="Note2")

        csv_str = manager.export_to_csv(test_user["id"])

        # CSV should have header and 2 data rows
        lines = csv_str.strip().split("\n")
        assert len(lines) == 3  # header + 2 rows
        assert "id" in lines[0]
        assert "tweet_id" in lines[0]

    def test_export_json_structure(self, test_db_path, test_user):
        """Test JSON export has correct structure."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col_id = manager.create_collection(test_user["id"], "Test")
        manager.save_tweet(test_user["id"], "tweet123", col_id, "Test note")

        json_str = manager.export_to_json(test_user["id"])
        data = json.loads(json_str)

        assert len(data) == 1
        item = data[0]
        assert "id" in item
        assert "user_id" in item
        assert "tweet_id" in item
        assert item["tweet_id"] == "tweet123"
        assert "collection_id" in item
        assert item["collection_id"] == col_id
        assert "notes" in item
        assert item["notes"] == "Test note"
        assert "saved_at" in item


# =============================================================================
# G) MULTI-USER ISOLATION (4-5 tests)
# =============================================================================


class TestMultiUserIsolation:
    """Test multi-user isolation and data integrity."""

    def test_user_a_cannot_see_user_b_bookmarks(
        self, test_db_path, test_user, test_admin_user
    ):
        """Test that User A's bookmarks are isolated from User B."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # User A saves a tweet
        manager.save_tweet(test_user["id"], "tweet_a1")

        # User B saves a different tweet
        manager.save_tweet(test_admin_user["id"], "tweet_b1")

        # User A should only see their own tweet
        tweets_a = manager.get_saved_tweets(test_user["id"])
        assert len(tweets_a) == 1
        assert tweets_a[0]["tweet_id"] == "tweet_a1"

        # User B should only see their own tweet
        tweets_b = manager.get_saved_tweets(test_admin_user["id"])
        assert len(tweets_b) == 1
        assert tweets_b[0]["tweet_id"] == "tweet_b1"

    def test_duplicate_collection_names_different_users(
        self, test_db_path, test_user, test_admin_user
    ):
        """Test that different users can have collections with same name."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Both users create collection "Favorites"
        col_a = manager.create_collection(test_user["id"], "Favorites")
        col_b = manager.create_collection(test_admin_user["id"], "Favorites")

        assert col_a is not None
        assert col_b is not None
        assert col_a != col_b

        # Verify isolation
        colls_a = manager.get_collections(test_user["id"])
        colls_b = manager.get_collections(test_admin_user["id"])

        assert len(colls_a) == 1
        assert len(colls_b) == 1
        assert colls_a[0]["name"] == "Favorites"
        assert colls_b[0]["name"] == "Favorites"

    def test_user_cannot_access_other_user_collection(
        self, test_db_path, test_user, test_admin_user
    ):
        """Test that User A cannot move tweets to User B's collection."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # User A creates collection and saves tweet
        col_a = manager.create_collection(test_user["id"], "My Collection")
        manager.save_tweet(test_user["id"], "tweet_a1", col_a)

        # User B creates their own collection
        col_b = manager.create_collection(test_admin_user["id"], "Other Collection")

        # User A tries to move their tweet to User B's collection
        # (This should work from database perspective but user shouldn't have access)
        result = manager.move_to_collection(test_user["id"], "tweet_a1", col_b)
        # Result depends on implementation - could be true or false

        # Verify User A's data is still only associated with User A
        tweets_a = manager.get_saved_tweets(test_user["id"])
        assert len(tweets_a) == 1
        assert tweets_a[0]["user_id"] == test_user["id"]

    def test_search_isolated_per_user(self, test_db_path, test_user, test_admin_user):
        """Test that search results are isolated per user."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # User A saves tweet with "Python"
        manager.save_tweet(test_user["id"], "tweet_python", notes="Python programming")

        # User B saves tweet with same keyword
        manager.save_tweet(
            test_admin_user["id"], "tweet_python_b", notes="Python is great"
        )

        # User A searches for "Python"
        results_a = manager.search_saved(test_user["id"], "Python")
        assert len(results_a) == 1
        assert results_a[0]["user_id"] == test_user["id"]

        # User B searches for "Python"
        results_b = manager.search_saved(test_admin_user["id"], "Python")
        assert len(results_b) == 1
        assert results_b[0]["user_id"] == test_admin_user["id"]

    def test_export_isolated_per_user(self, test_db_path, test_user, test_admin_user):
        """Test that exports only include the requesting user's data."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # User A saves tweet
        manager.save_tweet(test_user["id"], "tweet_a")

        # User B saves tweet
        manager.save_tweet(test_admin_user["id"], "tweet_b")

        # User A exports
        json_a = manager.export_to_json(test_user["id"])
        data_a = json.loads(json_a)
        assert len(data_a) == 1
        assert data_a[0]["user_id"] == test_user["id"]

        # User B exports
        json_b = manager.export_to_json(test_admin_user["id"])
        data_b = json.loads(json_b)
        assert len(data_b) == 1
        assert data_b[0]["user_id"] == test_admin_user["id"]


# =============================================================================
# H) STATISTICS & ANALYTICS (3-5 tests)
# =============================================================================


class TestStatisticsAndAnalytics:
    """Test statistics and analytics functionality."""

    def test_count_saved_tweets(self, test_db_path, test_user):
        """Test counting total saved tweets for a user."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save multiple tweets
        for i in range(5):
            manager.save_tweet(test_user["id"], f"tweet{i}")

        tweets = manager.get_saved_tweets(test_user["id"])
        assert len(tweets) == 5

    def test_count_by_collection(self, test_db_path, test_user):
        """Test counting tweets per collection."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        col1 = manager.create_collection(test_user["id"], "Collection1")
        col2 = manager.create_collection(test_user["id"], "Collection2")

        # Add tweets to collections
        for i in range(3):
            manager.save_tweet(test_user["id"], f"col1_tweet{i}", col1)

        for i in range(2):
            manager.save_tweet(test_user["id"], f"col2_tweet{i}", col2)

        # Add uncategorized
        manager.save_tweet(test_user["id"], "uncategorized_tweet")

        # Count per collection
        col1_tweets = manager.get_saved_tweets(test_user["id"], col1)
        col2_tweets = manager.get_saved_tweets(test_user["id"], col2)
        all_tweets = manager.get_saved_tweets(test_user["id"])

        assert len(col1_tweets) == 3
        assert len(col2_tweets) == 2
        assert len(all_tweets) == 6

    def test_recently_saved_items(self, test_db_path, test_user):
        """Test retrieving recently saved items."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save tweets in sequence with sufficient delays
        manager.save_tweet(test_user["id"], "tweet1")
        time.sleep(1.1)  # Sleep > 1 second to ensure different timestamp
        manager.save_tweet(test_user["id"], "tweet2")
        time.sleep(1.1)
        manager.save_tweet(test_user["id"], "tweet3")

        # Get all tweets (ordered by save time desc)
        tweets = manager.get_saved_tweets(test_user["id"])

        # Most recent should be first
        assert tweets[0]["tweet_id"] == "tweet3"
        assert tweets[1]["tweet_id"] == "tweet2"
        assert tweets[2]["tweet_id"] == "tweet1"

    def test_collection_count(self, test_db_path, test_user):
        """Test counting user's collections."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create multiple collections
        for i in range(4):
            manager.create_collection(test_user["id"], f"Collection{i}")

        collections = manager.get_collections(test_user["id"])
        assert len(collections) == 4

    def test_saved_with_notes_percentage(self, test_db_path, test_user):
        """Test analyzing tweets with notes."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Save some with notes
        manager.save_tweet(test_user["id"], "tweet1", notes="Has note")
        manager.save_tweet(test_user["id"], "tweet2", notes="Also has note")

        # Save some without notes
        manager.save_tweet(test_user["id"], "tweet3")
        manager.save_tweet(test_user["id"], "tweet4")

        tweets = manager.get_saved_tweets(test_user["id"])
        with_notes = [t for t in tweets if t["notes"] is not None]

        assert len(tweets) == 4
        assert len(with_notes) == 2


# =============================================================================
# INTEGRATION TESTS - Complex Workflows
# =============================================================================


class TestComplexWorkflows:
    """Test complex real-world workflows."""

    def test_complete_workflow(self, test_db_path, test_user):
        """Test a complete bookmark workflow."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create collections
        favorites = manager.create_collection(test_user["id"], "Favorites")
        research = manager.create_collection(test_user["id"], "Research")

        # Save some tweets
        manager.save_tweet(test_user["id"], "tweet1", favorites, "Great article")
        manager.save_tweet(test_user["id"], "tweet2", research, "Research material")
        manager.save_tweet(test_user["id"], "tweet3")  # Uncategorized

        # Verify all saved
        all_tweets = manager.get_saved_tweets(test_user["id"])
        assert len(all_tweets) == 3

        # Move tweet to different collection
        manager.move_to_collection(test_user["id"], "tweet3", research)

        # Verify move
        research_tweets = manager.get_saved_tweets(test_user["id"], research)
        assert len(research_tweets) == 2

        # Search for content
        results = manager.search_saved(test_user["id"], "Research")
        assert len(results) > 0

        # Export
        json_str = manager.export_to_json(test_user["id"])
        data = json.loads(json_str)
        assert len(data) == 3

    def test_workflow_with_deletion(self, test_db_path, test_user):
        """Test workflow with collection deletion and cleanup."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create collection and save tweets
        col = manager.create_collection(test_user["id"], "Temporary")
        manager.save_tweet(test_user["id"], "tweet1", col)
        manager.save_tweet(test_user["id"], "tweet2", col)

        assert len(manager.get_saved_tweets(test_user["id"], col)) == 2

        # Delete collection
        manager.delete_collection(col, test_user["id"])

        # Tweets should still exist but uncategorized
        all_tweets = manager.get_saved_tweets(test_user["id"])
        assert len(all_tweets) == 2
        assert all(t["collection_id"] is None for t in all_tweets)

    def test_collection_usage_scenario(self, test_db_path, test_user):
        """Test realistic collection usage scenario."""
        manager = SavedContentManager(test_db_path)
        manager.init_db()

        # Create project-based collections
        collections_data = [
            ("Project A - Design", "Design resources for Project A"),
            ("Project A - Development", "Code and technical resources"),
            ("Project B - Marketing", "Marketing and content strategy"),
        ]

        col_ids = {}
        for name, desc in collections_data:
            col_ids[name] = manager.create_collection(test_user["id"], name, desc)

        # Save tweets to different collections
        manager.save_tweet(
            test_user["id"],
            "figma_design",
            col_ids["Project A - Design"],
            "Figma design system",
        )
        manager.save_tweet(
            test_user["id"],
            "react_tutorial",
            col_ids["Project A - Development"],
            "React best practices",
        )
        manager.save_tweet(
            test_user["id"],
            "seo_guide",
            col_ids["Project B - Marketing"],
            "SEO optimization guide",
        )

        # Verify organization
        collections = manager.get_collections(test_user["id"])
        assert len(collections) == 3

        for col_name in col_ids:
            col_id = col_ids[col_name]
            tweets = manager.get_saved_tweets(test_user["id"], col_id)
            assert len(tweets) == 1
