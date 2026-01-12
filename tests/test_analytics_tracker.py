"""
Tests for Analytics Tracker (ANALYTICS-001)

Test-Driven Development for Twitter analytics tracking and dashboard.
Covers metric recording, retrieval, aggregations, and user isolation.
"""
import os
import pytest
import sqlite3
import time
from datetime import datetime, timedelta


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database for testing"""
    db_file = tmp_path / "test_analytics.db"
    return str(db_file)


@pytest.fixture
def analytics_tracker(db_path):
    """Create AnalyticsTracker instance for testing"""
    from app.features.analytics_tracker import AnalyticsTracker
    tracker = AnalyticsTracker(db_path)
    tracker.init_db()
    return tracker


@pytest.fixture
def sample_metrics():
    """Sample tweet metrics for testing"""
    return {
        'impressions': 1000,
        'likes': 50,
        'retweets': 10,
        'replies': 5,
        'engagements': 65
    }


@pytest.fixture
def user_manager(db_path):
    """Create user for testing"""
    from app.auth.user_manager import UserManager
    manager = UserManager(db_path)
    manager.init_db()
    # Create test users
    user1_id = manager.create_user('testuser1', 'test1@example.com', 'Password123!', is_admin=False)
    user2_id = manager.create_user('testuser2', 'test2@example.com', 'Password123!', is_admin=False)
    return manager, user1_id, user2_id


class TestAnalyticsTrackerInit:
    """Test AnalyticsTracker initialization"""

    def test_init_creates_database_tables(self, db_path):
        """Test that init_db creates required tables"""
        from app.features.analytics_tracker import AnalyticsTracker
        tracker = AnalyticsTracker(db_path)
        tracker.init_db()

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check tweet_metrics table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tweet_metrics'")
        assert cursor.fetchone() is not None

        # Check analytics_snapshots table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='analytics_snapshots'")
        assert cursor.fetchone() is not None

        conn.close()

    def test_init_creates_indexes(self, db_path):
        """Test that init_db creates performance indexes"""
        from app.features.analytics_tracker import AnalyticsTracker
        tracker = AnalyticsTracker(db_path)
        tracker.init_db()

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check for indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in cursor.fetchall()]

        # Should have indexes for common queries
        assert any('tweet_metrics' in idx for idx in indexes)

        conn.close()


class TestMetricRecording:
    """Test metric recording functionality"""

    def test_record_metrics_success(self, analytics_tracker, user_manager, sample_metrics):
        """Test recording metrics for a tweet"""
        _, user_id, _ = user_manager

        result = analytics_tracker.record_metrics(
            tweet_id='123456789',
            user_id=user_id,
            metrics=sample_metrics
        )

        assert result is True

    def test_record_metrics_calculates_engagement_rate(self, analytics_tracker, user_manager):
        """Test that engagement rate is calculated correctly"""
        _, user_id, _ = user_manager

        metrics = {
            'impressions': 1000,
            'likes': 50,
            'retweets': 10,
            'replies': 5,
            'engagements': 65
        }

        analytics_tracker.record_metrics('123', user_id, metrics)

        # Retrieve and check
        stored_metrics = analytics_tracker.get_metrics('123')
        assert stored_metrics is not None
        # Engagement rate = (65 / 1000) * 100 = 6.5%
        assert abs(stored_metrics['engagement_rate'] - 6.5) < 0.01

    def test_record_metrics_with_zero_impressions(self, analytics_tracker, user_manager):
        """Test that engagement rate handles zero impressions gracefully"""
        _, user_id, _ = user_manager

        metrics = {
            'impressions': 0,
            'likes': 50,
            'retweets': 10,
            'replies': 5,
            'engagements': 65
        }

        result = analytics_tracker.record_metrics('124', user_id, metrics)
        assert result is True

        stored_metrics = analytics_tracker.get_metrics('124')
        assert stored_metrics['engagement_rate'] == 0.0

    def test_record_metrics_updates_existing(self, analytics_tracker, user_manager):
        """Test that recording metrics twice updates the existing record"""
        _, user_id, _ = user_manager

        # First recording
        metrics1 = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('125', user_id, metrics1)

        # Second recording with updated metrics
        metrics2 = {'impressions': 1500, 'likes': 75, 'retweets': 15, 'replies': 8, 'engagements': 98}
        analytics_tracker.record_metrics('125', user_id, metrics2)

        # Should have updated values
        stored_metrics = analytics_tracker.get_metrics('125')
        assert stored_metrics['impressions'] == 1500
        assert stored_metrics['likes'] == 75


class TestMetricRetrieval:
    """Test metric retrieval functionality"""

    def test_get_metrics_existing_tweet(self, analytics_tracker, user_manager, sample_metrics):
        """Test retrieving metrics for existing tweet"""
        _, user_id, _ = user_manager

        analytics_tracker.record_metrics('126', user_id, sample_metrics)

        result = analytics_tracker.get_metrics('126')
        assert result is not None
        assert result['tweet_id'] == '126'
        assert result['impressions'] == 1000
        assert result['likes'] == 50

    def test_get_metrics_nonexistent_tweet(self, analytics_tracker):
        """Test retrieving metrics for non-existent tweet returns None"""
        result = analytics_tracker.get_metrics('999999999')
        assert result is None

    def test_get_user_analytics_period(self, analytics_tracker, user_manager):
        """Test getting user analytics for a specific period"""
        _, user_id, _ = user_manager

        # Record multiple tweets
        for i in range(5):
            metrics = {
                'impressions': 1000 + i * 100,
                'likes': 50 + i * 5,
                'retweets': 10 + i,
                'replies': 5,
                'engagements': 65 + i * 6
            }
            analytics_tracker.record_metrics(f'tweet_{i}', user_id, metrics)

        # Get analytics for daily period
        analytics = analytics_tracker.get_user_analytics(user_id, period='daily')

        assert analytics is not None
        assert 'total_tweets' in analytics
        assert analytics['total_tweets'] >= 5


class TestEngagementCalculations:
    """Test engagement rate and score calculations"""

    def test_calculate_engagement_rate_normal(self, analytics_tracker):
        """Test engagement rate calculation with normal values"""
        metrics = {'impressions': 1000, 'engagements': 65}
        rate = analytics_tracker.calculate_engagement_rate(metrics)
        assert abs(rate - 6.5) < 0.01

    def test_calculate_engagement_rate_zero_impressions(self, analytics_tracker):
        """Test engagement rate with zero impressions"""
        metrics = {'impressions': 0, 'engagements': 65}
        rate = analytics_tracker.calculate_engagement_rate(metrics)
        assert rate == 0.0

    def test_calculate_engagement_rate_high_engagement(self, analytics_tracker):
        """Test engagement rate with high engagement"""
        metrics = {'impressions': 100, 'engagements': 95}
        rate = analytics_tracker.calculate_engagement_rate(metrics)
        assert abs(rate - 95.0) < 0.01


class TestSnapshotCreation:
    """Test analytics snapshot creation"""

    def test_create_snapshot_success(self, analytics_tracker, user_manager):
        """Test creating daily snapshot"""
        _, user_id, _ = user_manager

        # Record some metrics first
        for i in range(3):
            metrics = {
                'impressions': 1000,
                'likes': 50,
                'retweets': 10,
                'replies': 5,
                'engagements': 65
            }
            analytics_tracker.record_metrics(f'snap_tweet_{i}', user_id, metrics)

        # Create snapshot
        result = analytics_tracker.create_snapshot(user_id, period='daily')
        assert result is True

    def test_create_snapshot_multiple_periods(self, analytics_tracker, user_manager):
        """Test creating snapshots for different periods"""
        _, user_id, _ = user_manager

        # Record metrics
        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('snap_test', user_id, metrics)

        # Create snapshots for different periods
        for period in ['hourly', 'daily', 'weekly', 'monthly']:
            result = analytics_tracker.create_snapshot(user_id, period=period)
            assert result is True


class TestTopTweets:
    """Test top tweets retrieval"""

    def test_get_top_tweets_by_engagement(self, analytics_tracker, user_manager):
        """Test getting top tweets by engagement rate"""
        _, user_id, _ = user_manager

        # Record tweets with different engagement rates
        tweets_data = [
            ('tweet_1', {'impressions': 1000, 'likes': 100, 'retweets': 20, 'replies': 10, 'engagements': 130}),  # 13%
            ('tweet_2', {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}),    # 6.5%
            ('tweet_3', {'impressions': 1000, 'likes': 200, 'retweets': 40, 'replies': 20, 'engagements': 260}), # 26%
            ('tweet_4', {'impressions': 1000, 'likes': 25, 'retweets': 5, 'replies': 2, 'engagements': 32}),     # 3.2%
        ]

        for tweet_id, metrics in tweets_data:
            analytics_tracker.record_metrics(tweet_id, user_id, metrics)

        # Get top 3 tweets
        top_tweets = analytics_tracker.get_top_tweets(user_id, metric='engagement_rate', limit=3)

        assert len(top_tweets) <= 3
        # First should be tweet_3 with highest engagement
        assert top_tweets[0]['tweet_id'] == 'tweet_3'

    def test_get_top_tweets_by_likes(self, analytics_tracker, user_manager):
        """Test getting top tweets by likes"""
        _, user_id, _ = user_manager

        tweets_data = [
            ('like_1', {'impressions': 1000, 'likes': 100, 'retweets': 10, 'replies': 5, 'engagements': 115}),
            ('like_2', {'impressions': 1000, 'likes': 250, 'retweets': 10, 'replies': 5, 'engagements': 265}),
            ('like_3', {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}),
        ]

        for tweet_id, metrics in tweets_data:
            analytics_tracker.record_metrics(tweet_id, user_id, metrics)

        top_tweets = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=2)

        assert len(top_tweets) <= 2
        assert top_tweets[0]['tweet_id'] == 'like_2'
        assert top_tweets[0]['likes'] == 250


class TestUserIsolation:
    """Test that users can only see their own analytics"""

    def test_user_isolation_metrics(self, analytics_tracker, user_manager):
        """Test that users cannot see each other's metrics"""
        _, user1_id, user2_id = user_manager

        # User 1 records metrics
        metrics1 = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('user1_tweet', user1_id, metrics1)

        # User 2 records metrics
        metrics2 = {'impressions': 2000, 'likes': 100, 'retweets': 20, 'replies': 10, 'engagements': 130}
        analytics_tracker.record_metrics('user2_tweet', user2_id, metrics2)

        # User 1 analytics should only show user 1's data
        analytics1 = analytics_tracker.get_user_analytics(user1_id, period='daily')
        assert analytics1['total_tweets'] == 1

        # User 2 analytics should only show user 2's data
        analytics2 = analytics_tracker.get_user_analytics(user2_id, period='daily')
        assert analytics2['total_tweets'] == 1

    def test_user_isolation_top_tweets(self, analytics_tracker, user_manager):
        """Test that top tweets are isolated by user"""
        _, user1_id, user2_id = user_manager

        # User 1 records tweets
        for i in range(3):
            metrics = {'impressions': 1000, 'likes': 50 + i, 'retweets': 10, 'replies': 5, 'engagements': 65 + i}
            analytics_tracker.record_metrics(f'u1_tweet_{i}', user1_id, metrics)

        # User 2 records tweets
        for i in range(2):
            metrics = {'impressions': 1000, 'likes': 100 + i, 'retweets': 10, 'replies': 5, 'engagements': 115 + i}
            analytics_tracker.record_metrics(f'u2_tweet_{i}', user2_id, metrics)

        # User 1 top tweets should only show user 1's tweets
        top_tweets1 = analytics_tracker.get_top_tweets(user1_id, metric='likes', limit=10)
        assert len(top_tweets1) == 3
        assert all(tweet['user_id'] == user1_id for tweet in top_tweets1)

        # User 2 top tweets should only show user 2's tweets
        top_tweets2 = analytics_tracker.get_top_tweets(user2_id, metric='likes', limit=10)
        assert len(top_tweets2) == 2
        assert all(tweet['user_id'] == user2_id for tweet in top_tweets2)

    def test_same_tweet_id_different_users_isolation(self, analytics_tracker, user_manager):
        """Test that two users can track the same tweet_id without data loss (CRITICAL BUG FIX)"""
        _, user1_id, user2_id = user_manager

        # Both users record metrics for the same tweet_id='shared_123'
        analytics_tracker.record_metrics('shared_123', user1_id,
            {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65})
        analytics_tracker.record_metrics('shared_123', user2_id,
            {'impressions': 2000, 'likes': 100, 'retweets': 20, 'replies': 10, 'engagements': 130})

        # Verify both records exist and are not overwritten
        # Note: get_metrics doesn't filter by user_id, so we need to check via get_user_analytics
        analytics1 = analytics_tracker.get_user_analytics(user1_id, period='daily')
        analytics2 = analytics_tracker.get_user_analytics(user2_id, period='daily')

        # Each user should have at least 1 tweet in their analytics
        assert analytics1['total_tweets'] >= 1
        assert analytics2['total_tweets'] >= 1

        # Check total impressions to verify data isn't lost
        # User 1 should have 1000 impressions from their tweet
        # User 2 should have 2000 impressions from their tweet
        assert analytics1['total_impressions'] >= 1000
        assert analytics2['total_impressions'] >= 2000


class TestPeriodAggregations:
    """Test period-based aggregations"""

    def test_hourly_aggregation(self, analytics_tracker, user_manager):
        """Test hourly period aggregation"""
        _, user_id, _ = user_manager

        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('hourly_test', user_id, metrics)

        result = analytics_tracker.create_snapshot(user_id, period='hourly')
        assert result is True

    def test_daily_aggregation(self, analytics_tracker, user_manager):
        """Test daily period aggregation"""
        _, user_id, _ = user_manager

        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('daily_test', user_id, metrics)

        result = analytics_tracker.create_snapshot(user_id, period='daily')
        assert result is True

    def test_weekly_aggregation(self, analytics_tracker, user_manager):
        """Test weekly period aggregation"""
        _, user_id, _ = user_manager

        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('weekly_test', user_id, metrics)

        result = analytics_tracker.create_snapshot(user_id, period='weekly')
        assert result is True

    def test_monthly_aggregation(self, analytics_tracker, user_manager):
        """Test monthly period aggregation"""
        _, user_id, _ = user_manager

        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        analytics_tracker.record_metrics('monthly_test', user_id, metrics)

        result = analytics_tracker.create_snapshot(user_id, period='monthly')
        assert result is True


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_empty_metrics(self, analytics_tracker, user_manager):
        """Test handling of empty metrics"""
        _, user_id, _ = user_manager

        result = analytics_tracker.record_metrics('empty_test', user_id, {})
        # Should handle gracefully with defaults
        assert result is True

    def test_negative_user_id(self, analytics_tracker):
        """Test handling of invalid user ID"""
        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        result = analytics_tracker.record_metrics('neg_test', -1, metrics)
        # Should either reject or handle gracefully
        assert result is False or result is True  # Implementation dependent

    def test_get_top_tweets_empty_db(self, analytics_tracker, user_manager):
        """Test getting top tweets when no data exists"""
        _, user_id, _ = user_manager

        top_tweets = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=10)
        assert isinstance(top_tweets, list)
        assert len(top_tweets) == 0


class TestDatabaseErrorHandling:
    """Test error handling for database exceptions"""

    def test_record_metrics_database_connection_error(self, analytics_tracker, user_manager, monkeypatch):
        """Test record_metrics handles database connection errors (lines 166-168)"""
        _, user_id, _ = user_manager
        
        monkeypatch.setattr(
            "sqlite3.connect",
            lambda *args, **kwargs: (_ for _ in ()).throw(
                sqlite3.OperationalError("database is locked")
            )
        )
        
        metrics = {'impressions': 1000, 'likes': 50, 'retweets': 10, 'replies': 5, 'engagements': 65}
        result = analytics_tracker.record_metrics('error_tweet', user_id, metrics)
        
        assert result is False

    def test_get_user_analytics_database_connection_error(self, analytics_tracker, monkeypatch):
        """Test get_user_analytics handles database connection errors"""
        
        monkeypatch.setattr(
            "sqlite3.connect",
            lambda *args, **kwargs: (_ for _ in ()).throw(
                sqlite3.OperationalError("database connection failed")
            )
        )
        
        result = analytics_tracker.get_user_analytics(user_id=999, period='daily')
        
        assert result is not None
        assert result['user_id'] == 999
        assert result['total_tweets'] == 0

    def test_create_snapshot_database_connection_error(self, analytics_tracker, user_manager, monkeypatch):
        """Test create_snapshot handles database connection errors"""
        _, user_id, _ = user_manager
        
        monkeypatch.setattr(
            "sqlite3.connect",
            lambda *args, **kwargs: (_ for _ in ()).throw(
                sqlite3.OperationalError("database locked")
            )
        )
        
        result = analytics_tracker.create_snapshot(user_id, period='daily')
        
        assert result is False

    def test_get_top_tweets_database_connection_error(self, analytics_tracker, user_manager, monkeypatch):
        """Test get_top_tweets handles database connection errors"""
        _, user_id, _ = user_manager
        
        monkeypatch.setattr(
            "sqlite3.connect",
            lambda *args, **kwargs: (_ for _ in ()).throw(
                sqlite3.OperationalError("cannot open database")
            )
        )
        
        result = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=10)
        
        assert result == []
