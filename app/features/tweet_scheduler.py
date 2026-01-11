"""
TweetScheduler - Database-backed Tweet Scheduling System (SCHEDULE-001)

Provides tweet scheduling with queue management for automated posting.
Integrates with APScheduler for cron-based queue processing.
"""
import json
import sqlite3
import time
import traceback
from datetime import datetime
from typing import List, Dict, Optional


class TweetScheduler:
    """
    Tweet scheduler with database-backed queue system.

    Manages scheduled tweets with support for:
    - Scheduling tweets for future posting
    - Queue processing with automatic posting
    - Status tracking (pending, posted, failed, cancelled)
    - User isolation
    - Media attachment support
    """

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize TweetScheduler.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        """Initialize database table for scheduled tweets"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create scheduled_tweets table (ADR-002 schema)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scheduled_tweets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                media_paths TEXT,
                scheduled_time INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                posted_at INTEGER,
                tweet_id TEXT,
                error TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create indexes for performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_scheduled_user
            ON scheduled_tweets(user_id)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_scheduled_status
            ON scheduled_tweets(status)
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_scheduled_time
            ON scheduled_tweets(scheduled_time)
        ''')

        conn.commit()
        conn.close()

    def schedule_tweet(self, user_id: int, content: str,
                      scheduled_time: datetime, media: List[str]) -> int:
        """
        Schedule a tweet for future posting.

        Args:
            user_id: User ID who owns this tweet
            content: Tweet text content
            scheduled_time: When to post the tweet
            media: List of media file paths

        Returns:
            ID of scheduled tweet

        Raises:
            ValueError: If content is empty or time is in the past
        """
        # Validate content
        if not content or not content.strip():
            raise ValueError("Content cannot be empty")

        # Validate scheduled time is in future
        if scheduled_time < datetime.now():
            raise ValueError("Scheduled time cannot be in the past")

        # Convert scheduled_time to Unix timestamp
        scheduled_timestamp = int(scheduled_time.timestamp())
        created_timestamp = int(time.time())

        # Convert media list to JSON
        media_json = json.dumps(media) if media else None

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO scheduled_tweets
                (user_id, content, media_paths, scheduled_time, status, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?)
            ''', (user_id, content, media_json, scheduled_timestamp, created_timestamp))

            tweet_id = cursor.lastrowid
            conn.commit()
            return tweet_id

        finally:
            conn.close()

    def cancel_scheduled_tweet(self, tweet_id: int, user_id: int) -> bool:
        """
        Cancel a scheduled tweet.

        Args:
            tweet_id: ID of scheduled tweet
            user_id: User ID (for authorization)

        Returns:
            True if cancelled, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Check tweet exists and belongs to user
            cursor.execute('''
                SELECT status FROM scheduled_tweets
                WHERE id = ? AND user_id = ?
            ''', (tweet_id, user_id))

            row = cursor.fetchone()
            if not row:
                return False

            status = row[0]

            # Cannot cancel already posted tweets
            if status == 'posted':
                return False

            # Update status to cancelled
            cursor.execute('''
                UPDATE scheduled_tweets
                SET status = 'cancelled'
                WHERE id = ? AND user_id = ?
            ''', (tweet_id, user_id))

            affected = cursor.rowcount
            conn.commit()
            return affected > 0

        finally:
            conn.close()

    def get_scheduled_tweets(self, user_id: int, status: str = None) -> List[dict]:
        """
        Get scheduled tweets for a user.

        Args:
            user_id: User ID
            status: Optional status filter ('pending', 'posted', 'failed', 'cancelled')

        Returns:
            List of scheduled tweet dictionaries
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            if status:
                cursor.execute('''
                    SELECT * FROM scheduled_tweets
                    WHERE user_id = ? AND status = ?
                    ORDER BY scheduled_time ASC
                ''', (user_id, status))
            else:
                cursor.execute('''
                    SELECT * FROM scheduled_tweets
                    WHERE user_id = ?
                    ORDER BY scheduled_time ASC
                ''', (user_id,))

            rows = cursor.fetchall()

            # Convert to list of dicts and parse JSON fields
            tweets = []
            for row in rows:
                tweet = dict(row)
                # Parse media_paths JSON
                if tweet['media_paths']:
                    tweet['media_paths'] = json.loads(tweet['media_paths'])
                else:
                    tweet['media_paths'] = []
                tweets.append(tweet)

            return tweets

        finally:
            conn.close()

    def process_queue(self) -> Dict:
        """
        Process the queue of scheduled tweets.

        Called by cron every minute to check for and post due tweets.

        Returns:
            Dictionary with processing statistics:
            {
                'processed': int,
                'successful': int,
                'failed': int
            }
        """
        stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0
        }

        # Get all pending tweets that are due
        current_time = int(time.time())

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT id FROM scheduled_tweets
                WHERE status = 'pending'
                AND scheduled_time <= ?
                ORDER BY scheduled_time ASC
            ''', (current_time,))

            due_tweets = cursor.fetchall()

        finally:
            conn.close()

        # Process each due tweet
        for row in due_tweets:
            tweet_id = row['id']
            stats['processed'] += 1

            # Attempt to post the tweet
            success = self.post_scheduled_tweet(tweet_id)

            if success:
                stats['successful'] += 1
            else:
                stats['failed'] += 1

        return stats

    def post_scheduled_tweet(self, scheduled_tweet_id: int) -> bool:
        """
        Post a scheduled tweet to Twitter.

        Args:
            scheduled_tweet_id: ID of scheduled tweet

        Returns:
            True if posted successfully, False otherwise
        """
        # Get tweet details
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT * FROM scheduled_tweets WHERE id = ?
            ''', (scheduled_tweet_id,))

            row = cursor.fetchone()
            if not row:
                return False

            tweet_data = dict(row)

        finally:
            conn.close()

        # Parse media paths
        media_paths = []
        if tweet_data['media_paths']:
            media_paths = json.loads(tweet_data['media_paths'])

        try:
            # Post the tweet using Twitter API
            # This will be implemented to use user-specific credentials
            tweet_id = self._post_to_twitter(
                tweet_data['user_id'],
                tweet_data['content'],
                media_paths
            )

            # Update status to posted
            self.update_status(scheduled_tweet_id, 'posted', tweet_id=tweet_id)
            return True

        except Exception as e:
            # Update status to failed with error
            error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            self.update_status(scheduled_tweet_id, 'failed', error=error_msg)
            return False

    def _post_to_twitter(self, user_id: int, content: str, media_paths: List[str]) -> str:
        """
        Post tweet to Twitter using user's credentials.

        Args:
            user_id: User ID
            content: Tweet content
            media_paths: List of media file paths

        Returns:
            Tweet ID from Twitter

        Raises:
            Exception: If posting fails
        """
        # TODO: Implement actual Twitter posting with user credentials
        # For now, this is a placeholder that will be implemented
        # when integrating with the actual Twitter API
        #
        # This would:
        # 1. Get user's Twitter credentials from credential_manager
        # 2. Initialize Twitter API client
        # 3. Upload media if present
        # 4. Post tweet
        # 5. Return tweet ID

        raise NotImplementedError("Twitter posting not yet implemented")

    def update_status(self, scheduled_tweet_id: int, status: str,
                     tweet_id: str = None, error: str = None) -> bool:
        """
        Update the status of a scheduled tweet.

        Args:
            scheduled_tweet_id: ID of scheduled tweet
            status: New status ('pending', 'posted', 'failed', 'cancelled')
            tweet_id: Optional Twitter tweet ID (for posted tweets)
            error: Optional error message (for failed tweets)

        Returns:
            True if updated successfully, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        try:
            # Build update query
            posted_at = int(time.time()) if status == 'posted' else None

            cursor.execute('''
                UPDATE scheduled_tweets
                SET status = ?, posted_at = ?, tweet_id = ?, error = ?
                WHERE id = ?
            ''', (status, posted_at, tweet_id, error, scheduled_tweet_id))

            affected = cursor.rowcount
            conn.commit()
            return affected > 0

        finally:
            conn.close()
