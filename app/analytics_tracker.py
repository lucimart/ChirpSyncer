"""
Analytics Tracker (ANALYTICS-001)

Tracks and analyzes Twitter/Bluesky engagement metrics with time-series storage.
Provides comprehensive analytics including top tweets, engagement rates, and period-based snapshots.
"""
import sqlite3
import time
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json


class AnalyticsTracker:
    """
    Analytics tracking and reporting system for tweet metrics.

    Stores time-series engagement data and provides aggregation,
    top tweet analysis, and period-based snapshots.
    """

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize AnalyticsTracker.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def init_db(self):
        """Initialize database tables and indexes"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create tweet_metrics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tweet_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tweet_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                impressions INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                retweets INTEGER DEFAULT 0,
                replies INTEGER DEFAULT 0,
                engagements INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0.0,
                UNIQUE(tweet_id, timestamp)
            )
        ''')

        # Create analytics_snapshots table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                period TEXT NOT NULL,
                period_start INTEGER NOT NULL,
                total_tweets INTEGER DEFAULT 0,
                total_impressions INTEGER DEFAULT 0,
                total_engagements INTEGER DEFAULT 0,
                avg_engagement_rate REAL DEFAULT 0.0,
                top_tweet_id TEXT,
                UNIQUE(user_id, period, period_start)
            )
        ''')

        # Create indexes for performance
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tweet_metrics_user
            ON tweet_metrics(user_id)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tweet_metrics_tweet
            ON tweet_metrics(tweet_id)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tweet_metrics_timestamp
            ON tweet_metrics(timestamp DESC)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_tweet_metrics_engagement
            ON tweet_metrics(engagement_rate DESC)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_snapshots_user
            ON analytics_snapshots(user_id)
        ''')

        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_snapshots_period
            ON analytics_snapshots(period, period_start)
        ''')

        conn.commit()
        conn.close()

    def record_metrics(self, tweet_id: str, user_id: int, metrics: dict) -> bool:
        """
        Record or update metrics for a tweet.

        Args:
            tweet_id: Twitter/Bluesky tweet ID
            user_id: User ID who owns the tweet
            metrics: Dictionary with keys: impressions, likes, retweets, replies, engagements

        Returns:
            True if successful, False otherwise
        """
        try:
            # Handle invalid user IDs
            if user_id < 0:
                return False

            # Extract metrics with defaults
            impressions = metrics.get('impressions', 0)
            likes = metrics.get('likes', 0)
            retweets = metrics.get('retweets', 0)
            replies = metrics.get('replies', 0)
            engagements = metrics.get('engagements', 0)

            # Calculate engagement rate
            engagement_rate = self.calculate_engagement_rate(metrics)

            timestamp = int(time.time())

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Check if tweet already has metrics
            cursor.execute(
                'SELECT id FROM tweet_metrics WHERE tweet_id = ? ORDER BY timestamp DESC LIMIT 1',
                (tweet_id,)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute('''
                    UPDATE tweet_metrics
                    SET user_id = ?, timestamp = ?, impressions = ?, likes = ?,
                        retweets = ?, replies = ?, engagements = ?, engagement_rate = ?
                    WHERE id = ?
                ''', (user_id, timestamp, impressions, likes, retweets, replies,
                      engagements, engagement_rate, existing[0]))
            else:
                # Insert new record
                cursor.execute('''
                    INSERT INTO tweet_metrics
                    (tweet_id, user_id, timestamp, impressions, likes, retweets,
                     replies, engagements, engagement_rate)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (tweet_id, user_id, timestamp, impressions, likes, retweets,
                      replies, engagements, engagement_rate))

            conn.commit()
            conn.close()

            return True

        except Exception as e:
            print(f"Error recording metrics: {e}")
            return False

    def get_metrics(self, tweet_id: str) -> Optional[dict]:
        """
        Get latest metrics for a tweet.

        Args:
            tweet_id: Tweet ID to retrieve metrics for

        Returns:
            Dictionary with metrics or None if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute('''
                SELECT tweet_id, user_id, timestamp, impressions, likes, retweets,
                       replies, engagements, engagement_rate
                FROM tweet_metrics
                WHERE tweet_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (tweet_id,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return {
                    'tweet_id': row[0],
                    'user_id': row[1],
                    'timestamp': row[2],
                    'impressions': row[3],
                    'likes': row[4],
                    'retweets': row[5],
                    'replies': row[6],
                    'engagements': row[7],
                    'engagement_rate': row[8]
                }

            return None

        except Exception as e:
            print(f"Error getting metrics: {e}")
            return None

    def get_user_analytics(self, user_id: int, period: str) -> dict:
        """
        Get aggregated analytics for a user for a specific period.

        Args:
            user_id: User ID
            period: Period type ('hourly', 'daily', 'weekly', 'monthly')

        Returns:
            Dictionary with aggregated analytics
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Calculate time range based on period
            now = int(time.time())
            if period == 'hourly':
                start_time = now - 3600  # 1 hour
            elif period == 'daily':
                start_time = now - 86400  # 24 hours
            elif period == 'weekly':
                start_time = now - 604800  # 7 days
            elif period == 'monthly':
                start_time = now - 2592000  # 30 days
            else:
                start_time = 0  # All time

            # Get aggregated metrics
            cursor.execute('''
                SELECT COUNT(DISTINCT tweet_id) as total_tweets,
                       SUM(impressions) as total_impressions,
                       SUM(engagements) as total_engagements,
                       AVG(engagement_rate) as avg_engagement_rate,
                       SUM(likes) as total_likes,
                       SUM(retweets) as total_retweets,
                       SUM(replies) as total_replies
                FROM tweet_metrics
                WHERE user_id = ? AND timestamp >= ?
            ''', (user_id, start_time))

            row = cursor.fetchone()
            conn.close()

            return {
                'user_id': user_id,
                'period': period,
                'total_tweets': row[0] or 0,
                'total_impressions': row[1] or 0,
                'total_engagements': row[2] or 0,
                'avg_engagement_rate': row[3] or 0.0,
                'total_likes': row[4] or 0,
                'total_retweets': row[5] or 0,
                'total_replies': row[6] or 0
            }

        except Exception as e:
            print(f"Error getting user analytics: {e}")
            return {
                'user_id': user_id,
                'period': period,
                'total_tweets': 0,
                'total_impressions': 0,
                'total_engagements': 0,
                'avg_engagement_rate': 0.0
            }

    def calculate_engagement_rate(self, metrics: dict) -> float:
        """
        Calculate engagement rate as percentage.

        Args:
            metrics: Dictionary with 'impressions' and 'engagements' keys

        Returns:
            Engagement rate as percentage (0.0 - 100.0)
        """
        impressions = metrics.get('impressions', 0)
        engagements = metrics.get('engagements', 0)

        if impressions <= 0:
            return 0.0

        rate = (engagements / impressions) * 100.0
        return round(rate, 2)

    def create_snapshot(self, user_id: int, period: str) -> bool:
        """
        Create analytics snapshot for a period.

        Args:
            user_id: User ID
            period: Period type ('hourly', 'daily', 'weekly', 'monthly')

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current period start timestamp
            now = int(time.time())

            if period == 'hourly':
                # Round to start of hour
                period_start = (now // 3600) * 3600
            elif period == 'daily':
                # Round to start of day
                period_start = (now // 86400) * 86400
            elif period == 'weekly':
                # Round to start of week
                period_start = (now // 604800) * 604800
            elif period == 'monthly':
                # Round to start of month (approximate)
                dt = datetime.fromtimestamp(now)
                period_start = int(datetime(dt.year, dt.month, 1).timestamp())
            else:
                period_start = now

            # Get analytics for this period
            analytics = self.get_user_analytics(user_id, period)

            # Get top tweet for this period
            top_tweets = self.get_top_tweets(user_id, metric='engagement_rate', limit=1)
            top_tweet_id = top_tweets[0]['tweet_id'] if top_tweets else None

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Insert or update snapshot
            cursor.execute('''
                INSERT OR REPLACE INTO analytics_snapshots
                (user_id, period, period_start, total_tweets, total_impressions,
                 total_engagements, avg_engagement_rate, top_tweet_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, period, period_start, analytics['total_tweets'],
                  analytics['total_impressions'], analytics['total_engagements'],
                  analytics['avg_engagement_rate'], top_tweet_id))

            conn.commit()
            conn.close()

            return True

        except Exception as e:
            print(f"Error creating snapshot: {e}")
            return False

    def get_top_tweets(self, user_id: int, metric: str = 'engagement_rate', limit: int = 10) -> List[dict]:
        """
        Get top performing tweets for a user.

        Args:
            user_id: User ID
            metric: Metric to sort by ('engagement_rate', 'likes', 'retweets', 'impressions')
            limit: Maximum number of tweets to return

        Returns:
            List of tweet dictionaries sorted by metric
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Validate metric
            valid_metrics = ['engagement_rate', 'likes', 'retweets', 'impressions', 'engagements', 'replies']
            if metric not in valid_metrics:
                metric = 'engagement_rate'

            # Get top tweets by metric
            # Use subquery to get latest metrics for each tweet
            query = f'''
                SELECT tweet_id, user_id, timestamp, impressions, likes, retweets,
                       replies, engagements, engagement_rate
                FROM (
                    SELECT tweet_id, user_id, timestamp, impressions, likes, retweets,
                           replies, engagements, engagement_rate,
                           ROW_NUMBER() OVER (PARTITION BY tweet_id ORDER BY timestamp DESC) as rn
                    FROM tweet_metrics
                    WHERE user_id = ?
                )
                WHERE rn = 1
                ORDER BY {metric} DESC
                LIMIT ?
            '''

            cursor.execute(query, (user_id, limit))

            rows = cursor.fetchall()
            conn.close()

            results = []
            for row in rows:
                results.append({
                    'tweet_id': row[0],
                    'user_id': row[1],
                    'timestamp': row[2],
                    'impressions': row[3],
                    'likes': row[4],
                    'retweets': row[5],
                    'replies': row[6],
                    'engagements': row[7],
                    'engagement_rate': row[8]
                })

            return results

        except Exception as e:
            print(f"Error getting top tweets: {e}")
            return []
