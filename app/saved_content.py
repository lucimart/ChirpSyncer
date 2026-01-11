"""
Saved Content & Collections Manager (Sprint 7 - SAVED-001)

Manages saved tweets and collections for organizing bookmarked content.
Based on ADR-005 architecture for bookmarks system.

Features:
- Save/unsave tweets with optional notes
- Organize saved tweets into collections
- Support for uncategorized saved tweets
- User isolation (each user has their own saved content)
- Duplicate prevention (UNIQUE constraint on user_id, tweet_id)
"""
import sqlite3
import time
from typing import List, Optional, Dict, Any


class SavedContentManager:
    """
    Manager for saved tweets and collections.

    Provides methods for:
    - Saving and unsaving tweets
    - Creating and managing collections
    - Moving tweets between collections
    - Retrieving saved content with filtering
    """

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize SavedContentManager.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """
        Get database connection with foreign keys enabled.

        Returns:
            SQLite connection with foreign keys enabled
        """
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self) -> None:
        """
        Initialize database tables for saved content.

        Creates:
        - collections table: User's collections for organizing saved content
        - saved_tweets table: Saved tweets with optional collection assignment
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON")

        # Create collections table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, name)
            )
        """)

        # Create saved_tweets table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_tweets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tweet_id TEXT NOT NULL,
                collection_id INTEGER,
                notes TEXT,
                saved_at INTEGER NOT NULL,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
                UNIQUE(user_id, tweet_id)
            )
        """)

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_saved_tweets_user
            ON saved_tweets(user_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_saved_tweets_collection
            ON saved_tweets(collection_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_collections_user
            ON collections(user_id)
        """)

        conn.commit()
        conn.close()

    def save_tweet(
        self,
        user_id: int,
        tweet_id: str,
        collection_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Save a tweet for the user.

        Args:
            user_id: User ID
            tweet_id: Tweet ID to save
            collection_id: Optional collection ID (None = uncategorized)
            notes: Optional notes about the tweet

        Returns:
            True if saved successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            saved_at = int(time.time())

            cursor.execute("""
                INSERT INTO saved_tweets (user_id, tweet_id, collection_id, notes, saved_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, tweet_id, collection_id, notes, saved_at))

            conn.commit()
            return True

        except sqlite3.IntegrityError:
            # Duplicate entry (user already saved this tweet)
            # We could update instead, but for now we'll just return False
            return False

        except Exception as e:
            print(f"Error saving tweet: {e}")
            return False

        finally:
            conn.close()

    def unsave_tweet(self, user_id: int, tweet_id: str) -> bool:
        """
        Remove a saved tweet.

        Args:
            user_id: User ID
            tweet_id: Tweet ID to unsave

        Returns:
            True if unsaved successfully, False if tweet wasn't saved
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                DELETE FROM saved_tweets
                WHERE user_id = ? AND tweet_id = ?
            """, (user_id, tweet_id))

            conn.commit()
            rows_deleted = cursor.rowcount
            return rows_deleted > 0

        except Exception as e:
            print(f"Error unsaving tweet: {e}")
            return False

        finally:
            conn.close()

    def get_saved_tweets(
        self,
        user_id: int,
        collection_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get saved tweets for a user, optionally filtered by collection.

        Args:
            user_id: User ID
            collection_id: Optional collection ID to filter by
                         If None, returns all saved tweets

        Returns:
            List of saved tweet dictionaries with keys:
            - id, user_id, tweet_id, collection_id, notes, saved_at
        """
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            if collection_id is None:
                # Get all saved tweets for user
                cursor.execute("""
                    SELECT id, user_id, tweet_id, collection_id, notes, saved_at
                    FROM saved_tweets
                    WHERE user_id = ?
                    ORDER BY saved_at DESC
                """, (user_id,))
            else:
                # Get saved tweets for specific collection
                cursor.execute("""
                    SELECT id, user_id, tweet_id, collection_id, notes, saved_at
                    FROM saved_tweets
                    WHERE user_id = ? AND collection_id = ?
                    ORDER BY saved_at DESC
                """, (user_id, collection_id))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]

        except Exception as e:
            print(f"Error getting saved tweets: {e}")
            return []

        finally:
            conn.close()

    def create_collection(
        self,
        user_id: int,
        name: str,
        description: Optional[str] = None
    ) -> Optional[int]:
        """
        Create a new collection for organizing saved tweets.

        Args:
            user_id: User ID
            name: Collection name (must be unique per user)
            description: Optional collection description

        Returns:
            Collection ID if created successfully, None if failed
            (e.g., duplicate name)
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            created_at = int(time.time())

            cursor.execute("""
                INSERT INTO collections (user_id, name, description, created_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, name, description, created_at))

            conn.commit()
            return cursor.lastrowid

        except sqlite3.IntegrityError:
            # Duplicate name for this user
            return None

        except Exception as e:
            print(f"Error creating collection: {e}")
            return None

        finally:
            conn.close()

    def get_collections(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get all collections for a user.

        Args:
            user_id: User ID

        Returns:
            List of collection dictionaries with keys:
            - id, user_id, name, description, created_at
        """
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT id, user_id, name, description, created_at
                FROM collections
                WHERE user_id = ?
                ORDER BY created_at DESC
            """, (user_id,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]

        except Exception as e:
            print(f"Error getting collections: {e}")
            return []

        finally:
            conn.close()

    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        """
        Delete a collection.

        Due to ON DELETE SET NULL foreign key constraint, tweets in this
        collection will be moved to uncategorized (collection_id = NULL).

        Args:
            collection_id: Collection ID to delete
            user_id: User ID (for authorization check)

        Returns:
            True if deleted successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                DELETE FROM collections
                WHERE id = ? AND user_id = ?
            """, (collection_id, user_id))

            conn.commit()
            rows_deleted = cursor.rowcount
            return rows_deleted > 0

        except Exception as e:
            print(f"Error deleting collection: {e}")
            return False

        finally:
            conn.close()

    def move_to_collection(
        self,
        user_id: int,
        tweet_id: str,
        collection_id: Optional[int]
    ) -> bool:
        """
        Move a saved tweet to a different collection.

        Args:
            user_id: User ID
            tweet_id: Tweet ID to move
            collection_id: Target collection ID (None = uncategorized)

        Returns:
            True if moved successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                UPDATE saved_tweets
                SET collection_id = ?
                WHERE user_id = ? AND tweet_id = ?
            """, (collection_id, user_id, tweet_id))

            conn.commit()
            rows_updated = cursor.rowcount
            return rows_updated > 0

        except Exception as e:
            print(f"Error moving tweet to collection: {e}")
            return False

        finally:
            conn.close()

    def search_saved(
        self,
        user_id: int,
        query: str,
        collection_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Search within user's saved tweets.

        Args:
            user_id: User ID
            query: Search query string (searches in notes and tweet_id)
            collection_id: Optional collection ID to search within

        Returns:
            List of matching saved tweets with metadata
        """
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            sql = '''
                SELECT st.id, st.user_id, st.tweet_id, st.collection_id,
                       st.notes, st.saved_at, c.name as collection_name
                FROM saved_tweets st
                LEFT JOIN collections c ON st.collection_id = c.id
                WHERE st.user_id = ?
                AND (st.notes LIKE ? OR st.tweet_id LIKE ?)
            '''
            params = [user_id, f'%{query}%', f'%{query}%']

            if collection_id is not None:
                sql += ' AND st.collection_id = ?'
                params.append(collection_id)

            sql += ' ORDER BY st.saved_at DESC'

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

        except Exception as e:
            print(f"Error searching saved tweets: {e}")
            return []

        finally:
            conn.close()

    def export_to_json(
        self,
        user_id: int,
        collection_id: Optional[int] = None
    ) -> str:
        """
        Export saved tweets to JSON format.

        Args:
            user_id: User ID
            collection_id: Optional collection ID to export

        Returns:
            JSON string of saved tweets
        """
        import json
        tweets = self.get_saved_tweets(user_id, collection_id)
        return json.dumps(tweets, indent=2)

    def export_to_csv(
        self,
        user_id: int,
        collection_id: Optional[int] = None
    ) -> str:
        """
        Export saved tweets to CSV format.

        Args:
            user_id: User ID
            collection_id: Optional collection ID to export

        Returns:
            CSV string of saved tweets
        """
        import csv
        import io
        tweets = self.get_saved_tweets(user_id, collection_id)

        output = io.StringIO()
        if tweets:
            writer = csv.DictWriter(output, fieldnames=tweets[0].keys())
            writer.writeheader()
            writer.writerows(tweets)

        return output.getvalue()
