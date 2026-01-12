"""
CleanupEngine - Automated Tweet Cleanup System (Sprint 7 - CLEANUP-001)

Implements rule-based tweet cleanup with age, engagement, and pattern rules.
Provides preview mode, dry-run execution, and detailed history tracking.
Follows ADR-004 specification for cleanup system architecture.

Sprint 8 Updates:
- Real tweet fetching via twscrape
- Real tweet deletion via Twitter API v2
- Rate limiting with exponential backoff
- Correlation ID tracking for audit
"""
import sqlite3
import json
import time
import re
import asyncio
import uuid
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from collections import defaultdict

from app.core.logger import setup_logger

logger = setup_logger(__name__)


class RateLimiter:
    """
    Sliding window rate limiter for Twitter API compliance.

    Twitter API v2 limits:
    - Read: 900 requests / 15 min
    - Delete: 50 requests / 15 min
    """

    def __init__(self, max_requests: int, window_seconds: int = 900):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: List[float] = []

    def can_proceed(self) -> bool:
        """Check if we can make another request."""
        self._cleanup_old_requests()
        return len(self.requests) < self.max_requests

    def record_request(self):
        """Record a request timestamp."""
        self.requests.append(time.time())

    def wait_time(self) -> float:
        """Get seconds to wait before next request is allowed."""
        self._cleanup_old_requests()
        if len(self.requests) < self.max_requests:
            return 0
        oldest = min(self.requests)
        return max(0, (oldest + self.window_seconds) - time.time())

    def _cleanup_old_requests(self):
        """Remove requests outside the current window."""
        cutoff = time.time() - self.window_seconds
        self.requests = [t for t in self.requests if t > cutoff]


@dataclass
class CleanupRule:
    """Cleanup rule data class"""
    id: int
    user_id: int
    name: str
    enabled: int
    rule_type: str
    rule_config: str
    last_run: Optional[int]
    deleted_count: int
    created_at: int


class CleanupEngine:
    """
    Automated Tweet Cleanup Engine with rule-based deletion.

    Supports three types of cleanup rules:
    - Age: Delete tweets older than X days
    - Engagement: Delete tweets below engagement threshold
    - Pattern: Delete tweets matching regex pattern

    All operations support preview mode and dry-run execution.
    """

    def __init__(self, db_path: str = 'chirpsyncer.db', credential_manager=None):
        """
        Initialize CleanupEngine.

        Args:
            db_path: Path to SQLite database
            credential_manager: Optional CredentialManager for API access
        """
        self.db_path = db_path
        self.credential_manager = credential_manager
        self._read_limiter = RateLimiter(max_requests=900, window_seconds=900)
        self._delete_limiter = RateLimiter(max_requests=50, window_seconds=900)

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database tables for cleanup system"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create cleanup_rules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cleanup_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                rule_type TEXT NOT NULL,
                rule_config TEXT NOT NULL,
                last_run INTEGER,
                deleted_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create cleanup_history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cleanup_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                tweets_deleted INTEGER DEFAULT 0,
                executed_at INTEGER NOT NULL,
                dry_run INTEGER DEFAULT 1,
                FOREIGN KEY (rule_id) REFERENCES cleanup_rules(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cleanup_rules_user ON cleanup_rules(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cleanup_history_user ON cleanup_history(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_cleanup_history_rule ON cleanup_history(rule_id)')

        conn.commit()
        conn.close()

    def create_rule(self, user_id: int, name: str, rule_type: str, config: dict) -> int:
        """
        Create a new cleanup rule.

        Args:
            user_id: User ID who owns this rule
            name: Human-readable name for the rule
            rule_type: Type of rule ('age', 'engagement', 'pattern')
            config: Rule configuration as dictionary

        Returns:
            Rule ID

        Raises:
            ValueError: If config is not a dictionary
        """
        if not isinstance(config, dict):
            raise ValueError('config must be a dictionary')

        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO cleanup_rules
            (user_id, name, enabled, rule_type, rule_config, created_at, deleted_count)
            VALUES (?, ?, 1, ?, ?, ?, 0)
        ''', (user_id, name, rule_type, json.dumps(config), int(time.time())))

        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return rule_id

    def get_user_rules(self, user_id: int, enabled_only: bool = False) -> List[dict]:
        """
        Get all cleanup rules for a user.

        Args:
            user_id: User ID
            enabled_only: If True, only return enabled rules

        Returns:
            List of rule dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        if enabled_only:
            cursor.execute('''
                SELECT * FROM cleanup_rules
                WHERE user_id = ? AND enabled = 1
                ORDER BY created_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT * FROM cleanup_rules
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def evaluate_rule(self, rule: dict, tweets: List[dict]) -> List[dict]:
        """
        Evaluate a rule against a list of tweets.

        Args:
            rule: Rule dictionary with 'rule_type' and 'rule_config'
            tweets: List of tweet dictionaries

        Returns:
            List of tweets that match the rule (should be deleted)
        """
        rule_type = rule['rule_type']
        config = json.loads(rule['rule_config'])

        if rule_type == 'age':
            return self._evaluate_age_rule(config, tweets)
        elif rule_type == 'engagement':
            return self._evaluate_engagement_rule(config, tweets)
        elif rule_type == 'pattern':
            return self._evaluate_pattern_rule(config, tweets)
        else:
            return []

    def _evaluate_age_rule(self, config: dict, tweets: List[dict]) -> List[dict]:
        """Evaluate age-based rule"""
        max_age_days = config.get('max_age_days', 30)
        exclude_with_replies = config.get('exclude_with_replies', False)

        current_time = int(time.time())
        max_age_seconds = max_age_days * 24 * 3600

        matching = []
        for tweet in tweets:
            tweet_age = current_time - tweet['created_at']

            if tweet_age > max_age_seconds:
                # Check if we should exclude tweets with replies
                if exclude_with_replies and tweet.get('replies', 0) > 0:
                    continue
                matching.append(tweet)

        return matching

    def _evaluate_engagement_rule(self, config: dict, tweets: List[dict]) -> List[dict]:
        """Evaluate engagement-based rule"""
        min_likes = config.get('min_likes', 10)
        delete_if_below = config.get('delete_if_below', True)

        matching = []
        for tweet in tweets:
            likes = tweet.get('likes', 0)

            if delete_if_below and likes < min_likes:
                matching.append(tweet)
            elif not delete_if_below and likes >= min_likes:
                matching.append(tweet)

        return matching

    def _evaluate_pattern_rule(self, config: dict, tweets: List[dict]) -> List[dict]:
        """Evaluate pattern-based rule"""
        regex_pattern = config.get('regex', '')

        try:
            pattern = re.compile(regex_pattern)
        except re.error:
            return []

        matching = []
        for tweet in tweets:
            text = tweet.get('text', '')
            if pattern.search(text):
                matching.append(tweet)

        return matching

    def preview_cleanup(self, user_id: int, rule_id: int) -> Dict[str, Any]:
        """
        Preview what would be deleted by a rule without actually deleting.

        Args:
            user_id: User ID
            rule_id: Rule ID to preview

        Returns:
            Dictionary with 'count' and 'tweet_ids' keys
        """
        # Get the rule
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM cleanup_rules
            WHERE id = ? AND user_id = ?
        ''', (rule_id, user_id))
        rule_row = cursor.fetchone()
        conn.close()

        if not rule_row:
            return {'count': 0, 'tweet_ids': []}

        rule = dict(rule_row)

        # Fetch user's tweets
        tweets = self._fetch_user_tweets(user_id)

        # Evaluate rule
        matching_tweets = self.evaluate_rule(rule, tweets)

        return {
            'count': len(matching_tweets),
            'tweet_ids': [t['id'] for t in matching_tweets],
            'tweets': matching_tweets
        }

    def execute_cleanup(self, user_id: int, rule_id: int, dry_run: bool = True) -> Dict[str, Any]:
        """
        Execute a cleanup rule.

        Args:
            user_id: User ID
            rule_id: Rule ID to execute
            dry_run: If True, don't actually delete (default: True)

        Returns:
            Dictionary with execution results
        """
        # Get the rule
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM cleanup_rules
            WHERE id = ? AND user_id = ?
        ''', (rule_id, user_id))
        rule_row = cursor.fetchone()
        conn.close()

        if not rule_row:
            return {
                'success': False,
                'error': 'Rule not found',
                'dry_run': dry_run,
                'tweets_deleted': 0
            }

        rule = dict(rule_row)

        # Fetch user's tweets
        tweets = self._fetch_user_tweets(user_id)

        # Evaluate rule
        matching_tweets = self.evaluate_rule(rule, tweets)

        deleted_count = 0
        errors = []

        if not dry_run:
            # Actually delete tweets
            for tweet in matching_tweets:
                try:
                    if self._delete_tweet(user_id, tweet['id']):
                        deleted_count += 1
                except Exception as e:
                    errors.append({'tweet_id': tweet['id'], 'error': str(e)})

            # Update rule statistics
            self._update_rule_stats(rule_id, deleted_count)

        # Record in history
        self._record_cleanup_history(
            rule_id=rule_id,
            user_id=user_id,
            tweets_deleted=deleted_count,
            dry_run=dry_run
        )

        result = {
            'success': True,
            'dry_run': dry_run,
            'tweets_deleted': deleted_count,
            'rule_id': rule_id,
            'rule_name': rule['name']
        }

        if dry_run:
            result['would_delete'] = len(matching_tweets)

        if errors:
            result['errors'] = errors

        return result

    def delete_rule(self, rule_id: int, user_id: int) -> bool:
        """
        Delete a cleanup rule.

        Args:
            rule_id: Rule ID to delete
            user_id: User ID (for authorization)

        Returns:
            True if deleted, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Verify ownership
        cursor.execute('''
            SELECT id FROM cleanup_rules
            WHERE id = ? AND user_id = ?
        ''', (rule_id, user_id))

        if not cursor.fetchone():
            conn.close()
            return False

        # Delete rule
        cursor.execute('DELETE FROM cleanup_rules WHERE id = ?', (rule_id,))
        conn.commit()
        conn.close()

        return True

    def disable_rule(self, rule_id: int, user_id: int) -> bool:
        """
        Disable a cleanup rule.

        Args:
            rule_id: Rule ID to disable
            user_id: User ID (for authorization)

        Returns:
            True if disabled, False otherwise
        """
        return self._set_rule_enabled(rule_id, user_id, enabled=False)

    def enable_rule(self, rule_id: int, user_id: int) -> bool:
        """
        Enable a cleanup rule.

        Args:
            rule_id: Rule ID to enable
            user_id: User ID (for authorization)

        Returns:
            True if enabled, False otherwise
        """
        return self._set_rule_enabled(rule_id, user_id, enabled=True)

    def _set_rule_enabled(self, rule_id: int, user_id: int, enabled: bool) -> bool:
        """Set rule enabled status"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE cleanup_rules
            SET enabled = ?
            WHERE id = ? AND user_id = ?
        ''', (1 if enabled else 0, rule_id, user_id))

        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()

        return rows_affected > 0

    def _update_rule_stats(self, rule_id: int, deleted_count: int):
        """Update rule statistics after execution"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE cleanup_rules
            SET last_run = ?,
                deleted_count = deleted_count + ?
            WHERE id = ?
        ''', (int(time.time()), deleted_count, rule_id))

        conn.commit()
        conn.close()

    def _record_cleanup_history(self, rule_id: int, user_id: int, tweets_deleted: int, dry_run: bool):
        """Record cleanup execution in history"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO cleanup_history
            (rule_id, user_id, tweets_deleted, executed_at, dry_run)
            VALUES (?, ?, ?, ?, ?)
        ''', (rule_id, user_id, tweets_deleted, int(time.time()), 1 if dry_run else 0))

        conn.commit()
        conn.close()

    def get_cleanup_history(self, user_id: int, limit: int = 50) -> List[dict]:
        """
        Get cleanup execution history for a user.

        Args:
            user_id: User ID
            limit: Maximum number of history entries to return

        Returns:
            List of history entries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT h.*, r.name as rule_name
            FROM cleanup_history h
            LEFT JOIN cleanup_rules r ON h.rule_id = r.id
            WHERE h.user_id = ?
            ORDER BY h.executed_at DESC
            LIMIT ?
        ''', (user_id, limit))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def _fetch_user_tweets(self, user_id: int) -> List[dict]:
        """
        Fetch tweets for a user via twscrape.

        Args:
            user_id: User ID

        Returns:
            List of tweet dictionaries with id, text, created_at, likes, replies
        """
        correlation_id = str(uuid.uuid4())
        logger.info(f"[{correlation_id}] Fetching tweets for user_id={user_id}")

        if not self.credential_manager:
            logger.warning(f"[{correlation_id}] No credential_manager, returning empty")
            return []

        # Get scraping credentials
        creds = self.credential_manager.get_credentials(
            user_id=user_id,
            platform='twitter',
            credential_type='scraping'
        )

        if not creds:
            logger.warning(f"[{correlation_id}] No scraping credentials for user")
            return []

        # Rate limit check
        if not self._read_limiter.can_proceed():
            wait = self._read_limiter.wait_time()
            logger.info(f"[{correlation_id}] Rate limited, waiting {wait:.1f}s")
            time.sleep(wait)

        try:
            # Use sync wrapper for async twscrape
            tweets = self._fetch_tweets_sync(creds, correlation_id)
            self._read_limiter.record_request()
            logger.info(f"[{correlation_id}] Fetched {len(tweets)} tweets")
            return tweets
        except Exception as e:
            logger.error(f"[{correlation_id}] Failed to fetch tweets: {e}")
            return []

    def _fetch_tweets_sync(self, creds: dict, correlation_id: str) -> List[dict]:
        """Sync wrapper for async tweet fetching."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self._fetch_tweets_async(creds, correlation_id))

    async def _fetch_tweets_async(self, creds: dict, correlation_id: str) -> List[dict]:
        """Fetch tweets using twscrape."""
        try:
            import twscrape

            api = twscrape.API()

            # Add account from credentials
            username = creds.get('username', '')
            password = creds.get('password', '')
            email = creds.get('email', '')
            email_password = creds.get('email_password', '')

            if username and password:
                await api.pool.add_account(
                    username, password, email, email_password
                )
                await api.pool.login_all()

            # Get user's twitter handle from credentials
            twitter_handle = creds.get('twitter_handle', username)

            tweets = []
            async for tweet in api.user_tweets(twitter_handle, limit=200):
                tweets.append({
                    'id': str(tweet.id),
                    'text': tweet.rawContent,
                    'created_at': int(tweet.date.timestamp()),
                    'likes': tweet.likeCount or 0,
                    'retweets': tweet.retweetCount or 0,
                    'replies': tweet.replyCount or 0,
                })

            return tweets

        except ImportError:
            logger.error(f"[{correlation_id}] twscrape not installed")
            return []
        except Exception as e:
            logger.error(f"[{correlation_id}] twscrape error: {e}")
            raise

    def _delete_tweet(self, user_id: int, tweet_id: str) -> bool:
        """
        Delete a tweet via Twitter API v2.

        Args:
            user_id: User ID
            tweet_id: Tweet ID to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        correlation_id = str(uuid.uuid4())
        logger.info(f"[{correlation_id}] Deleting tweet_id={tweet_id} for user_id={user_id}")

        if not self.credential_manager:
            logger.warning(f"[{correlation_id}] No credential_manager")
            return False

        # Get API credentials (OAuth for delete operations)
        creds = self.credential_manager.get_credentials(
            user_id=user_id,
            platform='twitter',
            credential_type='api'
        )

        if not creds:
            logger.warning(f"[{correlation_id}] No API credentials for user")
            return False

        # Rate limit check with exponential backoff
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries):
            if not self._delete_limiter.can_proceed():
                wait = self._delete_limiter.wait_time()
                logger.info(f"[{correlation_id}] Rate limited, waiting {wait:.1f}s")
                time.sleep(wait)

            try:
                success = self._delete_tweet_api(creds, tweet_id, correlation_id)
                if success:
                    self._delete_limiter.record_request()
                    logger.info(f"[{correlation_id}] Successfully deleted tweet")
                    return True
            except Exception as e:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    f"[{correlation_id}] Delete attempt {attempt + 1} failed: {e}, "
                    f"retrying in {delay}s"
                )
                if attempt < max_retries - 1:
                    time.sleep(delay)

        logger.error(f"[{correlation_id}] Failed to delete tweet after {max_retries} attempts")
        return False

    def _delete_tweet_api(self, creds: dict, tweet_id: str, correlation_id: str) -> bool:
        """Execute tweet deletion via tweepy."""
        try:
            import tweepy

            client = tweepy.Client(
                consumer_key=creds.get('api_key'),
                consumer_secret=creds.get('api_secret'),
                access_token=creds.get('access_token'),
                access_token_secret=creds.get('access_token_secret'),
            )

            response = client.delete_tweet(tweet_id)

            if response and response.data and response.data.get('deleted'):
                return True

            logger.warning(f"[{correlation_id}] Delete response: {response}")
            return False

        except ImportError:
            logger.error(f"[{correlation_id}] tweepy not installed")
            return False
        except tweepy.TweepyException as e:
            logger.error(f"[{correlation_id}] Tweepy error: {e}")
            raise
