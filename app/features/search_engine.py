"""
Full-Text Search Engine with SQLite FTS5 (SEARCH-001)

Provides full-text search capabilities for synced tweets using SQLite FTS5.
Features:
- Full-text search with ranking
- Phrase queries with quotes
- Boolean operators (AND, OR)
- Proximity search with NEAR operator
- User filtering
- Date range filtering
- Hashtag search
- Author filtering
- Index rebuild functionality
"""

import sqlite3
import time
from typing import List, Dict, Optional, Any
from app.core.logger import setup_logger

logger = setup_logger(__name__)


class SearchEngine:
    """
    Full-text search engine using SQLite FTS5.

    Provides fast, ranked search across synced tweets with support for:
    - Full-text queries with relevance ranking
    - Phrase searches (use quotes: "exact phrase")
    - Boolean operators (AND, OR)
    - Proximity search (NEAR operator: NEAR(term1 term2, N))
    - Multiple filter criteria (date, hashtag, author)
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize SearchEngine.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def init_fts_index(self) -> bool:
        """
        Initialize FTS5 virtual table and triggers.

        Creates:
        - tweet_search_index: FTS5 virtual table for full-text search
        - Triggers to keep index in sync with synced_posts

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Create FTS5 virtual table with porter tokenizer
            cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS tweet_search_index USING fts5(
                tweet_id UNINDEXED,
                user_id UNINDEXED,
                content,
                hashtags,
                author,
                posted_at UNINDEXED,
                tokenize='porter unicode61'
            )
            """)

            # Create trigger to sync on INSERT
            cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS sync_search_index_insert
            AFTER INSERT ON synced_posts
            WHEN NEW.user_id IS NOT NULL
            BEGIN
                INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
                VALUES (
                    COALESCE(NEW.twitter_id, NEW.bluesky_uri),
                    NEW.user_id,
                    NEW.original_text,
                    COALESCE(NEW.hashtags, ''),
                    COALESCE(NEW.twitter_username, ''),
                    COALESCE(NEW.posted_at, strftime('%s', 'now'))
                );
            END
            """)

            # Create trigger to sync on UPDATE
            cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS sync_search_index_update
            AFTER UPDATE ON synced_posts
            WHEN NEW.user_id IS NOT NULL
            BEGIN
                DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
                INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
                VALUES (
                    COALESCE(NEW.twitter_id, NEW.bluesky_uri),
                    NEW.user_id,
                    NEW.original_text,
                    COALESCE(NEW.hashtags, ''),
                    COALESCE(NEW.twitter_username, ''),
                    COALESCE(NEW.posted_at, strftime('%s', 'now'))
                );
            END
            """)

            # Create trigger to sync on DELETE
            cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS sync_search_index_delete
            AFTER DELETE ON synced_posts
            BEGIN
                DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
            END
            """)

            conn.commit()
            conn.close()

            logger.info("FTS5 search index initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize FTS index: {e}")
            return False

    def index_tweet(
        self,
        tweet_id: str,
        user_id: int,
        content: str,
        hashtags: str,
        author: str,
        posted_at: Optional[int] = None,
    ) -> bool:
        """
        Index a single tweet for search.

        Args:
            tweet_id: Unique tweet ID
            user_id: User ID who owns the tweet
            content: Tweet text content
            hashtags: Space/comma separated hashtags
            author: Tweet author username
            posted_at: Unix timestamp of tweet creation (defaults to now)

        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if posted_at is None:
                posted_at = int(time.time())

            # Check if tweet already indexed
            cursor.execute(
                """
            SELECT rowid FROM tweet_search_index WHERE tweet_id = ? AND user_id = ?
            """,
                (tweet_id, user_id),
            )

            if cursor.fetchone():
                # Update existing entry
                cursor.execute(
                    """
                DELETE FROM tweet_search_index WHERE tweet_id = ? AND user_id = ?
                """,
                    (tweet_id, user_id),
                )

            # Insert into FTS index
            cursor.execute(
                """
            INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
                (tweet_id, user_id, content, hashtags, author, posted_at),
            )

            conn.commit()
            conn.close()

            logger.debug(f"Indexed tweet {tweet_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to index tweet {tweet_id}: {e}")
            return False

    def search(
        self, query: str, user_id: Optional[int] = None, limit: int = 50
    ) -> List[Dict]:
        """
        Search tweets with full-text query.

        Args:
            query: Search query (supports FTS5 syntax including:
                   - Phrase search: "exact phrase"
                   - Boolean: term1 AND term2, term1 OR term2
                   - Proximity: NEAR(term1 term2, N) for words within N positions)
            user_id: Filter by user ID (optional)
            limit: Maximum number of results (default: 50)

        Returns:
            List of matching tweets with metadata
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            results = []

            if query.strip():
                # Full-text search with ranking
                if user_id:
                    cursor.execute(
                        """
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, rank
                    FROM tweet_search_index
                    WHERE tweet_search_index MATCH ? AND user_id = ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                        (query, user_id, limit),
                    )
                else:
                    cursor.execute(
                        """
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, rank
                    FROM tweet_search_index
                    WHERE tweet_search_index MATCH ?
                    ORDER BY rank
                    LIMIT ?
                    """,
                        (query, limit),
                    )
            else:
                # Empty query - return all tweets for user
                if user_id:
                    cursor.execute(
                        """
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, 0 as rank
                    FROM tweet_search_index
                    WHERE user_id = ?
                    LIMIT ?
                    """,
                        (user_id, limit),
                    )
                else:
                    cursor.execute(
                        """
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, 0 as rank
                    FROM tweet_search_index
                    LIMIT ?
                    """,
                        (limit,),
                    )

            for row in cursor.fetchall():
                results.append(
                    {
                        "tweet_id": row[0],
                        "user_id": row[1],
                        "content": row[2],
                        "hashtags": row[3],
                        "author": row[4],
                        "posted_at": row[5],
                        "rank": row[6],
                    }
                )

            conn.close()

            logger.debug("Search query returned %d results", len(results))
            return results

        except Exception as e:
            logger.error("Search failed: %s", str(e))
            return []

    def search_with_filters(
        self, query: str, user_id: int, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict]:
        """
        Search with additional filters.

        Args:
            query: Search query (supports FTS5 syntax including NEAR operator)
            user_id: User ID to filter by
            filters: Dictionary of filters:
                - date_from: Unix timestamp (minimum date)
                - date_to: Unix timestamp (maximum date)
                - hashtags: List of hashtags to filter by
                - author: Filter by tweet author username
                - has_media: Boolean - filter by media presence
                - min_likes: Minimum likes count
                - min_retweets: Minimum retweets count

        Returns:
            List of matching tweets with engagement data
        """
        try:
            if filters is None:
                filters = {}

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("PRAGMA table_info(synced_posts)")
            has_archived = any(row[1] == "archived" for row in cursor.fetchall())
            archived_select = (
                "COALESCE(sp.archived, 0) as archived"
                if has_archived
                else "0 as archived"
            )

            # Check if we need to join with synced_posts for engagement/media filters
            needs_join = any(
                key in filters for key in ["has_media", "min_likes", "min_retweets"]
            )

            # Build query with filters
            where_clauses = []
            params = []

            # User filter
            where_clauses.append("tsi.user_id = ?")
            params.append(user_id)

            # Date range filter
            if "date_from" in filters:
                where_clauses.append("tsi.posted_at >= ?")
                params.append(filters["date_from"])

            if "date_to" in filters:
                where_clauses.append("tsi.posted_at <= ?")
                params.append(filters["date_to"])

            # Hashtag filter
            if "hashtags" in filters and filters["hashtags"]:
                hashtag_conditions = []
                for tag in filters["hashtags"]:
                    hashtag_conditions.append("tsi.hashtags LIKE ?")
                    params.append(f"%{tag}%")
                where_clauses.append(f"({' OR '.join(hashtag_conditions)})")

            # Author filter
            if "author" in filters and filters["author"]:
                where_clauses.append("tsi.author = ?")
                params.append(filters["author"])

            # Media filter (requires join)
            if "has_media" in filters and filters["has_media"] is not None:
                where_clauses.append("sp.has_media = ?")
                params.append(1 if filters["has_media"] else 0)

            # Engagement filters (requires join)
            if "min_likes" in filters and filters["min_likes"] is not None:
                where_clauses.append("COALESCE(sp.likes_count, 0) >= ?")
                params.append(filters["min_likes"])

            if "min_retweets" in filters and filters["min_retweets"] is not None:
                where_clauses.append("COALESCE(sp.retweets_count, 0) >= ?")
                params.append(filters["min_retweets"])

            where_sql = " AND ".join(where_clauses)

            # Execute search
            results = []

            if needs_join:
                # Join with synced_posts for has_media and engagement filters
                if query.strip():
                    sql = f"""
                    SELECT tsi.tweet_id, tsi.user_id, tsi.content, tsi.hashtags,
                           tsi.author, tsi.posted_at, rank,
                           COALESCE(sp.has_media, 0) as has_media,
                           COALESCE(sp.likes_count, 0) as likes,
                           COALESCE(sp.retweets_count, 0) as retweets,
                           {archived_select}
                    FROM tweet_search_index tsi
                    JOIN synced_posts sp ON (
                        tsi.tweet_id = sp.twitter_id OR tsi.tweet_id = sp.bluesky_uri
                    )
                    WHERE tweet_search_index MATCH ? AND {where_sql}
                    ORDER BY rank
                    LIMIT 50
                    """  # nosec B608 - where_sql built from validated filters
                    cursor.execute(sql, [query] + params)
                else:
                    sql = f"""
                    SELECT tsi.tweet_id, tsi.user_id, tsi.content, tsi.hashtags,
                           tsi.author, tsi.posted_at, 0 as rank,
                           COALESCE(sp.has_media, 0) as has_media,
                           COALESCE(sp.likes_count, 0) as likes,
                           COALESCE(sp.retweets_count, 0) as retweets,
                           {archived_select}
                    FROM tweet_search_index tsi
                    JOIN synced_posts sp ON (
                        tsi.tweet_id = sp.twitter_id OR tsi.tweet_id = sp.bluesky_uri
                    )
                    WHERE {where_sql}
                    ORDER BY tsi.posted_at DESC
                    LIMIT 50
                    """  # nosec B608 - where_sql built from validated filters
                    cursor.execute(sql, params)

                for row in cursor.fetchall():
                    results.append(
                        {
                            "tweet_id": row[0],
                            "user_id": row[1],
                            "content": row[2],
                            "hashtags": row[3],
                            "author": row[4],
                            "posted_at": row[5],
                            "rank": row[6],
                            "has_media": bool(row[7]),
                            "likes": row[8],
                            "retweets": row[9],
                            "archived": bool(row[10]),
                        }
                    )
            else:
                # Simple FTS query without join
                # Replace tsi. prefix since we're not joining
                simple_where = where_sql.replace("tsi.", "")

                if query.strip():
                    sql = f"""
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, rank
                    FROM tweet_search_index
                    WHERE tweet_search_index MATCH ? AND {simple_where}
                    ORDER BY rank
                    LIMIT 50
                    """  # nosec B608 - where_sql built from validated filters
                    cursor.execute(sql, [query] + params)
                else:
                    sql = f"""
                    SELECT tweet_id, user_id, content, hashtags, author, posted_at, 0 as rank
                    FROM tweet_search_index
                    WHERE {simple_where}
                    ORDER BY posted_at DESC
                    LIMIT 50
                    """  # nosec B608 - where_sql built from validated filters
                    cursor.execute(sql, params)

                for row in cursor.fetchall():
                    results.append(
                        {
                            "tweet_id": row[0],
                            "user_id": row[1],
                            "content": row[2],
                            "hashtags": row[3],
                            "author": row[4],
                            "posted_at": row[5],
                            "rank": row[6],
                        }
                    )

            conn.close()

            logger.debug(f"Filtered search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Filtered search failed: {e}")
            return []

    def rebuild_index(self, user_id: Optional[int] = None) -> int:
        """
        Rebuild search index from synced_posts table.

        Args:
            user_id: Rebuild for specific user only (optional)

        Returns:
            Number of tweets indexed
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Clear existing index for user (or all)
            if user_id:
                cursor.execute(
                    "DELETE FROM tweet_search_index WHERE user_id = ?", (user_id,)
                )
            else:
                cursor.execute("DELETE FROM tweet_search_index")

            # Reindex from synced_posts
            if user_id:
                cursor.execute(
                    """
                SELECT
                    COALESCE(twitter_id, bluesky_uri) as tweet_id,
                    user_id,
                    original_text,
                    COALESCE(hashtags, '') as hashtags,
                    COALESCE(twitter_username, '') as author,
                    COALESCE(posted_at, strftime('%s', 'now')) as posted_at
                FROM synced_posts
                WHERE user_id = ? AND user_id IS NOT NULL
                """,
                    (user_id,),
                )
            else:
                cursor.execute("""
                SELECT
                    COALESCE(twitter_id, bluesky_uri) as tweet_id,
                    user_id,
                    original_text,
                    COALESCE(hashtags, '') as hashtags,
                    COALESCE(twitter_username, '') as author,
                    COALESCE(posted_at, strftime('%s', 'now')) as posted_at
                FROM synced_posts
                WHERE user_id IS NOT NULL
                """)

            tweets = cursor.fetchall()
            count = 0

            for tweet in tweets:
                cursor.execute(
                    """
                INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                    tweet,
                )
                count += 1

            conn.commit()
            conn.close()

            logger.info(f"Rebuilt search index: {count} tweets indexed")
            return count

        except Exception as e:
            logger.error(f"Failed to rebuild index: {e}")
            return 0

    def get_search_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get search statistics for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary with stats:
                - user_id: User ID
                - total_indexed: Total tweets indexed
                - last_indexed: Timestamp of most recent tweet
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
            SELECT COUNT(*), MAX(posted_at)
            FROM tweet_search_index
            WHERE user_id = ?
            """,
                (user_id,),
            )

            row = cursor.fetchone()
            conn.close()

            return {
                "user_id": user_id,
                "total_indexed": row[0] or 0,
                "last_indexed": row[1] or 0,
            }

        except Exception as e:
            logger.error(f"Failed to get search stats: {e}")
            return {"user_id": user_id, "total_indexed": 0, "last_indexed": 0}

    def remove_from_index(self, tweet_id: str) -> bool:
        """
        Remove a tweet from the search index.

        Args:
            tweet_id: Tweet ID to remove

        Returns:
            True if removed, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "DELETE FROM tweet_search_index WHERE tweet_id = ?", (tweet_id,)
            )
            deleted = cursor.rowcount > 0

            conn.commit()
            conn.close()

            logger.debug(f"Removed tweet {tweet_id} from index: {deleted}")
            return deleted

        except Exception as e:
            logger.error(f"Failed to remove tweet {tweet_id} from index: {e}")
            return False

    def reindex_all(self) -> int:
        """
        Reindex all tweets from synced_posts.

        Returns:
            Number of tweets indexed
        """
        return self.rebuild_index()

    def get_suggestions(self, user_id: int, prefix: str, limit: int = 10) -> List[str]:
        """
        Get search suggestions based on prefix.

        Args:
            user_id: User ID
            prefix: Search prefix
            limit: Maximum suggestions to return

        Returns:
            List of suggested search terms
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
            SELECT DISTINCT content
            FROM tweet_search_index
            WHERE user_id = ? AND content LIKE ?
            LIMIT ?
            """,
                (user_id, f"%{prefix}%", limit * 5),
            )

            suggestions = set()
            for row in cursor.fetchall():
                words = row[0].lower().split()
                for word in words:
                    if word.startswith(prefix.lower()) and len(word) > len(prefix):
                        suggestions.add(word)
                        if len(suggestions) >= limit:
                            break
                if len(suggestions) >= limit:
                    break

            conn.close()
            return list(suggestions)[:limit]

        except Exception as e:
            logger.error(f"Failed to get suggestions: {e}")
            return []

    def search_by_hashtag(
        self, user_id: int, hashtag: str, limit: int = 50
    ) -> List[Dict]:
        """
        Search tweets by hashtag.

        Args:
            user_id: User ID
            hashtag: Hashtag to search (with or without #)
            limit: Maximum results

        Returns:
            List of matching tweets
        """
        if not hashtag.startswith("#"):
            hashtag = f"#{hashtag}"

        return self.search_with_filters(
            query="", user_id=user_id, filters={"hashtags": [hashtag.lstrip("#")]}
        )

    def search_by_author(
        self, user_id: int, author: str, limit: int = 50
    ) -> List[Dict]:
        """
        Search tweets by author.

        Args:
            user_id: User ID
            author: Author username
            limit: Maximum results

        Returns:
            List of matching tweets
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
            SELECT tweet_id, user_id, content, hashtags, author, posted_at, 0 as rank
            FROM tweet_search_index
            WHERE user_id = ? AND author LIKE ?
            ORDER BY posted_at DESC
            LIMIT ?
            """,
                (user_id, f"%{author}%", limit),
            )

            results = []
            for row in cursor.fetchall():
                results.append(
                    {
                        "tweet_id": row[0],
                        "user_id": row[1],
                        "content": row[2],
                        "hashtags": row[3],
                        "author": row[4],
                        "posted_at": row[5],
                        "rank": row[6],
                    }
                )

            conn.close()
            return results

        except Exception as e:
            logger.error(f"Failed to search by author: {e}")
            return []

    def get_trending_hashtags(self, user_id: int, limit: int = 10) -> List[Dict]:
        """
        Get trending hashtags for a user.

        Args:
            user_id: User ID
            limit: Maximum hashtags to return

        Returns:
            List of dicts with hashtag and count
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
            SELECT hashtags FROM tweet_search_index
            WHERE user_id = ? AND hashtags != ''
            """,
                (user_id,),
            )

            hashtag_counts = {}
            for row in cursor.fetchall():
                tags = row[0].replace(",", " ").split()
                for tag in tags:
                    tag = tag.strip().lower()
                    if tag.startswith("#"):
                        tag = tag[1:]
                    if tag:
                        hashtag_counts[tag] = hashtag_counts.get(tag, 0) + 1

            conn.close()

            sorted_tags = sorted(
                hashtag_counts.items(), key=lambda x: x[1], reverse=True
            )
            return [
                {"hashtag": tag, "count": count} for tag, count in sorted_tags[:limit]
            ]

        except Exception as e:
            logger.error(f"Failed to get trending hashtags: {e}")
            return []
