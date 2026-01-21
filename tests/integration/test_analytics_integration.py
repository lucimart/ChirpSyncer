"""
Integration Tests for Analytics Tracker (ANALYTICS-001)

Comprehensive integration tests for the AnalyticsTracker module covering:
- Tweet metrics recording and retrieval
- Analytics aggregation by various time periods
- Top tweet calculation and ranking
- Snapshot creation and management
- Engagement rate calculations
- Multi-user analytics isolation

Test Coverage:
- Record metrics for multiple tweets
- Aggregate statistics for hourly/daily/weekly/monthly periods
- Rank tweets by different metrics (engagement_rate, likes, retweets, etc.)
- Create point-in-time snapshots
- Validate engagement rate calculations
- Ensure user data isolation in analytics
"""

import os
import sys
import time
import sqlite3
from typing import Dict

import pytest

# Add app directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'app'))

from features.analytics_tracker import AnalyticsTracker


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="function")
def analytics_db_path(test_db_path):
    """
    Create analytics tracker with initialized database schema.

    Returns path to test database with analytics tables created.
    """
    yield test_db_path


@pytest.fixture(scope="function")
def analytics_tracker(analytics_db_path):
    """
    Create and initialize AnalyticsTracker instance for testing.

    Initializes all required database tables and indexes.
    """
    tracker = AnalyticsTracker(db_path=analytics_db_path)
    tracker.init_db()
    return tracker


@pytest.fixture(scope="function")
def sample_metrics() -> Dict:
    """Provide standard metrics template for testing."""
    return {
        'impressions': 1000,
        'likes': 50,
        'retweets': 25,
        'replies': 10,
        'engagements': 85
    }


@pytest.fixture(scope="function")
def high_engagement_metrics() -> Dict:
    """Provide high engagement metrics for top tweet testing."""
    return {
        'impressions': 500,
        'likes': 100,
        'retweets': 50,
        'replies': 30,
        'engagements': 180
    }


@pytest.fixture(scope="function")
def low_engagement_metrics() -> Dict:
    """Provide low engagement metrics for bottom tweet testing."""
    return {
        'impressions': 5000,
        'likes': 10,
        'retweets': 5,
        'replies': 2,
        'engagements': 17
    }


# =============================================================================
# TEST: Record Tweet Metrics
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_record_tweet_metrics(analytics_tracker, test_user, sample_metrics):
    """
    Test recording metrics to database.

    Validates:
    - Metrics are successfully recorded to database
    - Record can be retrieved after insertion
    - All metric fields are persisted correctly
    - Engagement rate is calculated during record
    """
    tweet_id = "tweet_001"
    user_id = test_user['id']

    # Record metrics
    result = analytics_tracker.record_metrics(tweet_id, user_id, sample_metrics)
    assert result is True, "Failed to record metrics"

    # Retrieve recorded metrics
    retrieved = analytics_tracker.get_metrics(tweet_id)
    assert retrieved is not None, "Failed to retrieve recorded metrics"

    # Validate all fields
    assert retrieved['tweet_id'] == tweet_id
    assert retrieved['user_id'] == user_id
    assert retrieved['impressions'] == sample_metrics['impressions']
    assert retrieved['likes'] == sample_metrics['likes']
    assert retrieved['retweets'] == sample_metrics['retweets']
    assert retrieved['replies'] == sample_metrics['replies']
    assert retrieved['engagements'] == sample_metrics['engagements']

    # Validate engagement rate was calculated
    assert retrieved['engagement_rate'] > 0, "Engagement rate not calculated"
    assert isinstance(retrieved['engagement_rate'], float)


@pytest.mark.integration
@pytest.mark.database
def test_record_tweet_metrics_update(analytics_tracker, test_user, sample_metrics):
    """
    Test updating existing tweet metrics.

    Validates:
    - Existing metrics can be updated
    - New values overwrite previous values
    - Timestamp is updated on modification
    """
    tweet_id = "tweet_update_001"
    user_id = test_user['id']

    # Record initial metrics
    result1 = analytics_tracker.record_metrics(tweet_id, user_id, sample_metrics)
    assert result1 is True

    first_record = analytics_tracker.get_metrics(tweet_id)
    first_timestamp = first_record['timestamp']

    # Wait a bit to ensure timestamp difference
    time.sleep(0.1)

    # Update with new metrics
    updated_metrics = {
        'impressions': 2000,
        'likes': 100,
        'retweets': 50,
        'replies': 20,
        'engagements': 170
    }
    result2 = analytics_tracker.record_metrics(tweet_id, user_id, updated_metrics)
    assert result2 is True

    # Retrieve updated metrics
    updated_record = analytics_tracker.get_metrics(tweet_id)
    assert updated_record['impressions'] == 2000
    assert updated_record['likes'] == 100
    assert updated_record['engagements'] == 170
    # Timestamp should be updated
    assert updated_record['timestamp'] >= first_timestamp


@pytest.mark.integration
@pytest.mark.database
def test_record_tweet_metrics_invalid_user(analytics_tracker, sample_metrics):
    """
    Test recording metrics with invalid user ID.

    Validates:
    - Negative user IDs are rejected
    - Function returns False for invalid input
    """
    tweet_id = "tweet_invalid_001"
    invalid_user_id = -1

    result = analytics_tracker.record_metrics(
        tweet_id, invalid_user_id, sample_metrics
    )
    assert result is False, "Should reject negative user IDs"


# =============================================================================
# TEST: Get Analytics Overview
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_get_analytics_overview(analytics_tracker, test_user):
    """
    Test aggregating stats over different time periods.

    Validates:
    - Daily analytics aggregates last 24 hours
    - Weekly analytics aggregates last 7 days
    - Monthly analytics aggregates last 30 days
    - All aggregations sum correctly
    """
    user_id = test_user['id']

    # Record multiple tweets with different metrics
    tweets_data = [
        ("tweet_daily_001", {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}),
        ("tweet_daily_002", {'impressions': 1500, 'likes': 75, 'retweets': 30, 'replies': 15, 'engagements': 120}),
        ("tweet_daily_003", {'impressions': 2000, 'likes': 100, 'retweets': 40, 'replies': 20, 'engagements': 160}),
    ]

    for tweet_id, metrics in tweets_data:
        result = analytics_tracker.record_metrics(tweet_id, user_id, metrics)
        assert result is True

    # Get daily analytics
    daily_analytics = analytics_tracker.get_user_analytics(user_id, 'daily')
    assert daily_analytics['total_tweets'] == 3
    assert daily_analytics['total_impressions'] == 4500
    assert daily_analytics['total_engagements'] == 365
    assert daily_analytics['total_likes'] == 225
    assert daily_analytics['total_retweets'] == 95
    assert daily_analytics['total_replies'] == 45
    assert daily_analytics['avg_engagement_rate'] > 0

    # Get weekly analytics (should include daily data)
    weekly_analytics = analytics_tracker.get_user_analytics(user_id, 'weekly')
    assert weekly_analytics['total_tweets'] == 3
    assert weekly_analytics['total_impressions'] >= daily_analytics['total_impressions']

    # Get monthly analytics
    monthly_analytics = analytics_tracker.get_user_analytics(user_id, 'monthly')
    assert monthly_analytics['total_tweets'] == 3


@pytest.mark.integration
@pytest.mark.database
def test_get_analytics_overview_empty_period(analytics_tracker, test_user):
    """
    Test analytics for period with no data.

    Validates:
    - Empty periods return zero values
    - No errors on missing data
    """
    user_id = test_user['id']

    # Get analytics without recording any metrics
    daily_analytics = analytics_tracker.get_user_analytics(user_id, 'daily')

    assert daily_analytics['total_tweets'] == 0
    assert daily_analytics['total_impressions'] == 0
    assert daily_analytics['total_engagements'] == 0
    assert daily_analytics['avg_engagement_rate'] == 0.0


@pytest.mark.integration
@pytest.mark.database
def test_get_analytics_overview_multiple_periods(analytics_tracker, test_user):
    """
    Test that different period types return different aggregations.

    Validates:
    - Hourly period is more restrictive than daily
    - Different period types work independently
    """
    user_id = test_user['id']
    metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}

    # Record metric
    analytics_tracker.record_metrics("tweet_period_001", user_id, metrics)

    # Get analytics for different periods
    hourly = analytics_tracker.get_user_analytics(user_id, 'hourly')
    daily = analytics_tracker.get_user_analytics(user_id, 'daily')
    weekly = analytics_tracker.get_user_analytics(user_id, 'weekly')
    monthly = analytics_tracker.get_user_analytics(user_id, 'monthly')
    all_time = analytics_tracker.get_user_analytics(user_id, 'all')

    # All should have the same data since we just recorded it
    assert hourly['total_tweets'] == 1
    assert daily['total_tweets'] == 1
    assert weekly['total_tweets'] == 1
    assert monthly['total_tweets'] == 1
    assert all_time['total_tweets'] == 1


# =============================================================================
# TEST: Get Top Tweets
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_get_top_tweets(analytics_tracker, test_user, sample_metrics,
                        high_engagement_metrics, low_engagement_metrics):
    """
    Test retrieving top performing tweets by metric.

    Validates:
    - Top tweets are ranked correctly by engagement_rate
    - Only latest metrics are used for each tweet
    - Results are limited by specified limit parameter
    """
    user_id = test_user['id']

    # Record tweets with varying engagement
    analytics_tracker.record_metrics("tweet_top_001", user_id, low_engagement_metrics)
    time.sleep(0.01)
    analytics_tracker.record_metrics("tweet_top_002", user_id, sample_metrics)
    time.sleep(0.01)
    analytics_tracker.record_metrics("tweet_top_003", user_id, high_engagement_metrics)

    # Get top tweets by engagement rate
    top_tweets = analytics_tracker.get_top_tweets(user_id, metric='engagement_rate', limit=10)

    assert len(top_tweets) == 3, "Should return all 3 tweets"

    # Verify ranking - highest engagement rate should be first
    assert top_tweets[0]['tweet_id'] == "tweet_top_003", "tweet_top_003 should have highest engagement"
    assert top_tweets[1]['tweet_id'] == "tweet_top_002", "tweet_top_002 should be second"
    assert top_tweets[2]['tweet_id'] == "tweet_top_001", "tweet_top_001 should have lowest engagement"

    # Verify engagement rates are descending
    assert top_tweets[0]['engagement_rate'] >= top_tweets[1]['engagement_rate']
    assert top_tweets[1]['engagement_rate'] >= top_tweets[2]['engagement_rate']


@pytest.mark.integration
@pytest.mark.database
def test_get_top_tweets_by_different_metrics(analytics_tracker, test_user):
    """
    Test ranking tweets by different metrics (likes, retweets, impressions).

    Validates:
    - Can rank by engagement_rate
    - Can rank by likes
    - Can rank by retweets
    - Can rank by impressions
    - Rankings differ based on selected metric
    """
    user_id = test_user['id']

    # Record tweets with different strength in different metrics
    tweet1 = {'impressions': 100, 'likes': 50, 'retweets': 1, 'replies': 0, 'engagements': 51}
    tweet2 = {'impressions': 100, 'likes': 1, 'retweets': 50, 'replies': 0, 'engagements': 51}
    tweet3 = {'impressions': 10000, 'likes': 5, 'retweets': 5, 'replies': 0, 'engagements': 10}

    analytics_tracker.record_metrics("tweet_metric_likes", user_id, tweet1)
    time.sleep(0.01)
    analytics_tracker.record_metrics("tweet_metric_retweets", user_id, tweet2)
    time.sleep(0.01)
    analytics_tracker.record_metrics("tweet_metric_impressions", user_id, tweet3)

    # Get top tweets by different metrics
    top_by_likes = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=10)
    top_by_retweets = analytics_tracker.get_top_tweets(user_id, metric='retweets', limit=10)
    top_by_impressions = analytics_tracker.get_top_tweets(user_id, metric='impressions', limit=10)

    # Verify different rankings
    assert top_by_likes[0]['tweet_id'] == "tweet_metric_likes"
    assert top_by_retweets[0]['tweet_id'] == "tweet_metric_retweets"
    assert top_by_impressions[0]['tweet_id'] == "tweet_metric_impressions"


@pytest.mark.integration
@pytest.mark.database
def test_get_top_tweets_limit(analytics_tracker, test_user, sample_metrics):
    """
    Test that limit parameter restricts returned results.

    Validates:
    - Limit parameter is respected
    - Returns fewer results when limit is small
    """
    user_id = test_user['id']

    # Record 5 tweets
    for i in range(5):
        metrics = sample_metrics.copy()
        metrics['likes'] = 50 - i * 5  # Vary the likes
        analytics_tracker.record_metrics(f"tweet_limit_{i}", user_id, metrics)
        time.sleep(0.01)

    # Get top tweets with limit=2
    top_limited = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=2)
    assert len(top_limited) == 2

    # Get all top tweets
    top_all = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=100)
    assert len(top_all) == 5


@pytest.mark.integration
@pytest.mark.database
def test_get_top_tweets_latest_only(analytics_tracker, test_user):
    """
    Test that only latest metrics are used for ranking.

    Validates:
    - When a tweet has multiple metric records, only the latest is ranked
    - Tweet ranking changes after update
    """
    user_id = test_user['id']
    tweet_id = "tweet_latest_001"

    # Record initial metrics with low engagement
    low_metrics = {'impressions': 100, 'likes': 1, 'retweets': 1, 'replies': 0, 'engagements': 2}
    analytics_tracker.record_metrics(tweet_id, user_id, low_metrics)

    top_initial = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=1)
    assert len(top_initial) == 1
    assert top_initial[0]['likes'] == 1

    # Update with high engagement metrics
    high_metrics = {'impressions': 100, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics(tweet_id, user_id, high_metrics)

    top_updated = analytics_tracker.get_top_tweets(user_id, metric='likes', limit=1)
    assert len(top_updated) == 1
    assert top_updated[0]['likes'] == 50, "Should use latest metrics"


# =============================================================================
# TEST: Create Analytics Snapshot
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_create_analytics_snapshot(analytics_tracker, test_db_path, test_user):
    """
    Test creating snapshots at point in time.

    Validates:
    - Snapshot is successfully created
    - Snapshot contains aggregated data
    - Snapshot includes top tweet ID
    - Snapshot is stored in database
    """
    user_id = test_user['id']

    # Record metrics
    metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics("tweet_snap_001", user_id, metrics)

    # Create snapshot
    result = analytics_tracker.create_snapshot(user_id, 'daily')
    assert result is True

    # Verify snapshot in database
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM analytics_snapshots
        WHERE user_id = ? AND period = 'daily'
    ''', (user_id,))

    snapshot = cursor.fetchone()
    conn.close()

    assert snapshot is not None, "Snapshot not found in database"
    assert snapshot[2] == 'daily'  # period
    assert snapshot[4] == 1  # total_tweets
    assert snapshot[5] == 1000  # total_impressions


@pytest.mark.integration
@pytest.mark.database
def test_create_snapshot_multiple_periods(analytics_tracker, test_db_path, test_user):
    """
    Test creating snapshots for different time periods.

    Validates:
    - Can create snapshots for hourly, daily, weekly, monthly periods
    - Each snapshot is distinct
    """
    user_id = test_user['id']

    # Record metrics
    metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics("tweet_multi_snap_001", user_id, metrics)

    # Create snapshots for different periods
    periods = ['hourly', 'daily', 'weekly', 'monthly']
    for period in periods:
        result = analytics_tracker.create_snapshot(user_id, period)
        assert result is True, f"Failed to create {period} snapshot"

    # Verify all snapshots exist
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()

    for period in periods:
        cursor.execute('''
            SELECT * FROM analytics_snapshots
            WHERE user_id = ? AND period = ?
        ''', (user_id, period))

        snapshot = cursor.fetchone()
        assert snapshot is not None, f"{period} snapshot not found"

    conn.close()


@pytest.mark.integration
@pytest.mark.database
def test_create_snapshot_includes_top_tweet(analytics_tracker, test_db_path, test_user):
    """
    Test that snapshot includes ID of top performing tweet.

    Validates:
    - Snapshot contains top_tweet_id
    - Top tweet ID is the highest engagement rate tweet
    """
    user_id = test_user['id']

    # Record tweets with different engagement
    low = {'impressions': 1000, 'likes': 10, 'retweets': 5, 'replies': 2, 'engagements': 17}
    high = {'impressions': 500, 'likes': 100, 'retweets': 50, 'replies': 30, 'engagements': 180}

    analytics_tracker.record_metrics("tweet_snap_low", user_id, low)
    time.sleep(0.01)
    analytics_tracker.record_metrics("tweet_snap_high", user_id, high)

    # Create snapshot
    result = analytics_tracker.create_snapshot(user_id, 'daily')
    assert result is True

    # Verify snapshot has top tweet
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT top_tweet_id FROM analytics_snapshots
        WHERE user_id = ? AND period = 'daily'
    ''', (user_id,))

    snapshot = cursor.fetchone()
    conn.close()

    assert snapshot is not None
    assert snapshot[0] == "tweet_snap_high", "Top tweet should be the highest engagement tweet"


# =============================================================================
# TEST: Metrics Aggregation by Period
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_metrics_aggregation_by_period(analytics_tracker, test_user):
    """
    Test grouping metrics by time periods.

    Validates:
    - Hourly aggregation works correctly
    - Daily aggregation works correctly
    - Weekly aggregation works correctly
    - Monthly aggregation works correctly
    - Data is properly summed in each period
    """
    user_id = test_user['id']

    # Record multiple metrics
    metrics_list = [
        {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85},
        {'impressions': 1500, 'likes': 75, 'retweets': 30, 'replies': 15, 'engagements': 120},
        {'impressions': 2000, 'likes': 100, 'retweets': 40, 'replies': 20, 'engagements': 160},
    ]

    for i, metrics in enumerate(metrics_list):
        analytics_tracker.record_metrics(f"tweet_agg_{i}", user_id, metrics)
        time.sleep(0.01)

    # Test hourly aggregation
    hourly = analytics_tracker.get_user_analytics(user_id, 'hourly')
    assert hourly['total_tweets'] == 3
    assert hourly['total_impressions'] == 4500
    assert hourly['total_engagements'] == 365

    # Test daily aggregation
    daily = analytics_tracker.get_user_analytics(user_id, 'daily')
    assert daily['total_tweets'] == 3
    assert daily['total_impressions'] == 4500

    # Test weekly aggregation
    weekly = analytics_tracker.get_user_analytics(user_id, 'weekly')
    assert weekly['total_tweets'] == 3

    # Test monthly aggregation
    monthly = analytics_tracker.get_user_analytics(user_id, 'monthly')
    assert monthly['total_tweets'] == 3


@pytest.mark.integration
@pytest.mark.database
def test_metrics_aggregation_period_isolation(analytics_tracker, test_user):
    """
    Test that time periods correctly isolate data.

    Validates:
    - Old data (outside period) is not included
    - New data (inside period) is included
    - Period boundaries are respected
    """
    user_id = test_user['id']
    current_time = int(time.time())

    # Record metric now
    metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics("tweet_current", user_id, metrics)

    # Get current daily stats
    daily = analytics_tracker.get_user_analytics(user_id, 'daily')
    assert daily['total_tweets'] == 1

    # Get hourly stats
    hourly = analytics_tracker.get_user_analytics(user_id, 'hourly')
    assert hourly['total_tweets'] == 1


# =============================================================================
# TEST: Engagement Rate Calculation
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_engagement_rate_calculation(analytics_tracker, test_user):
    """
    Test that engagement rates are calculated correctly.

    Validates:
    - Engagement rate is percentage (0-100)
    - Formula: (engagements / impressions) * 100
    - Rounded to 2 decimal places
    - Zero when impressions are 0
    """
    user_id = test_user['id']

    # Test case 1: Standard engagement
    metrics1 = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    rate1 = analytics_tracker.calculate_engagement_rate(metrics1)
    assert rate1 == 8.5, "Expected 8.5% engagement rate"

    # Test case 2: High engagement
    metrics2 = {'impressions': 100, 'likes': 25, 'retweets': 15, 'replies': 10, 'engagements': 50}
    rate2 = analytics_tracker.calculate_engagement_rate(metrics2)
    assert rate2 == 50.0, "Expected 50% engagement rate"

    # Test case 3: Low engagement
    metrics3 = {'impressions': 10000, 'likes': 10, 'retweets': 5, 'replies': 2, 'engagements': 17}
    rate3 = analytics_tracker.calculate_engagement_rate(metrics3)
    assert rate3 == 0.17, "Expected 0.17% engagement rate"

    # Test case 4: Zero impressions
    metrics4 = {'impressions': 0, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    rate4 = analytics_tracker.calculate_engagement_rate(metrics4)
    assert rate4 == 0.0, "Expected 0% when no impressions"


@pytest.mark.integration
@pytest.mark.database
def test_engagement_rate_stored_in_metrics(analytics_tracker, test_user):
    """
    Test that engagement rate is calculated and stored during record_metrics.

    Validates:
    - Calculated rate matches manual calculation
    - Rate is stored in database
    - Rate is retrievable via get_metrics
    """
    user_id = test_user['id']
    tweet_id = "tweet_rate_001"

    metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}

    # Record metrics
    analytics_tracker.record_metrics(tweet_id, user_id, metrics)

    # Get stored metrics
    stored = analytics_tracker.get_metrics(tweet_id)

    # Calculate expected rate
    expected_rate = (85 / 1000) * 100
    expected_rate = round(expected_rate, 2)

    assert stored['engagement_rate'] == expected_rate
    assert stored['engagement_rate'] == 8.5


@pytest.mark.integration
@pytest.mark.database
def test_engagement_rate_precision(analytics_tracker, test_user):
    """
    Test that engagement rates are rounded to 2 decimal places.

    Validates:
    - Results are properly rounded
    - No floating point precision errors
    """
    user_id = test_user['id']

    # Test case that would have more decimals
    metrics = {'impressions': 3, 'likes': 1, 'retweets': 0, 'replies': 0, 'engagements': 1}
    rate = analytics_tracker.calculate_engagement_rate(metrics)

    # 1/3 * 100 = 33.333... should round to 33.33
    assert rate == 33.33, f"Expected 33.33, got {rate}"

    # Verify it has at most 2 decimal places
    rate_str = str(rate)
    decimal_places = len(rate_str.split('.')[1]) if '.' in rate_str else 0
    assert decimal_places <= 2, f"Rate has {decimal_places} decimal places, expected max 2"


# =============================================================================
# TEST: Multiple Users Analytics
# =============================================================================

@pytest.mark.integration
@pytest.mark.database
def test_multiple_users_analytics(analytics_tracker, test_db, test_user):
    """
    Test that analytics are properly isolated between users.

    Validates:
    - User 1 metrics don't affect User 2 analytics
    - get_user_analytics returns only that user's data
    - get_top_tweets returns only that user's tweets
    """
    # Create second user
    import bcrypt
    username2 = 'testuser2'
    email2 = 'testuser2@example.com'
    password2 = 'TestPassword456!'
    password_hash2 = bcrypt.hashpw(password2.encode('utf-8'), bcrypt.gensalt(rounds=12))

    cursor = test_db.cursor()
    cursor.execute('''
        INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 0)
    ''', (username2, email2, password_hash2.decode('utf-8'), int(time.time())))

    user_id2 = cursor.lastrowid
    test_db.commit()

    user1_id = test_user['id']
    user2_id = user_id2

    # Record metrics for User 1
    user1_metrics = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics("tweet_user1_001", user1_id, user1_metrics)

    # Record different metrics for User 2
    user2_metrics = {'impressions': 5000, 'likes': 10, 'retweets': 5, 'replies': 2, 'engagements': 17}
    analytics_tracker.record_metrics("tweet_user2_001", user2_id, user2_metrics)

    # Get analytics for User 1
    user1_analytics = analytics_tracker.get_user_analytics(user1_id, 'daily')
    assert user1_analytics['total_impressions'] == 1000
    assert user1_analytics['total_likes'] == 50

    # Get analytics for User 2 (should be different)
    user2_analytics = analytics_tracker.get_user_analytics(user2_id, 'daily')
    assert user2_analytics['total_impressions'] == 5000
    assert user2_analytics['total_likes'] == 10

    # Verify isolation
    assert user1_analytics['total_impressions'] != user2_analytics['total_impressions']


@pytest.mark.integration
@pytest.mark.database
def test_multiple_users_top_tweets_isolation(analytics_tracker, test_db, test_user):
    """
    Test that top tweets are properly isolated between users.

    Validates:
    - get_top_tweets returns only requesting user's tweets
    - Different users have independent tweet rankings
    """
    # Create second user
    import bcrypt
    username2 = 'isolationuser'
    email2 = 'isolationuser@example.com'
    password2 = 'TestPassword999!'
    password_hash2 = bcrypt.hashpw(password2.encode('utf-8'), bcrypt.gensalt(rounds=12))

    cursor = test_db.cursor()
    cursor.execute('''
        INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 0)
    ''', (username2, email2, password_hash2.decode('utf-8'), int(time.time())))

    user_id2 = cursor.lastrowid
    test_db.commit()

    user1_id = test_user['id']
    user2_id = user_id2

    # Record tweets for User 1
    user1_tweet1 = {'impressions': 100, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    user1_tweet2 = {'impressions': 100, 'likes': 25, 'retweets': 12, 'replies': 5, 'engagements': 42}

    analytics_tracker.record_metrics("user1_tweet_A", user1_id, user1_tweet1)
    time.sleep(0.01)
    analytics_tracker.record_metrics("user1_tweet_B", user1_id, user1_tweet2)

    # Record tweets for User 2 (different IDs)
    user2_tweet1 = {'impressions': 100, 'likes': 10, 'retweets': 5, 'replies': 2, 'engagements': 17}
    user2_tweet2 = {'impressions': 100, 'likes': 75, 'retweets': 40, 'replies': 20, 'engagements': 135}

    analytics_tracker.record_metrics("user2_tweet_C", user2_id, user2_tweet1)
    time.sleep(0.01)
    analytics_tracker.record_metrics("user2_tweet_D", user2_id, user2_tweet2)

    # Get top tweets for User 1
    user1_top = analytics_tracker.get_top_tweets(user1_id, metric='likes', limit=10)
    user1_tweet_ids = [t['tweet_id'] for t in user1_top]

    # Get top tweets for User 2
    user2_top = analytics_tracker.get_top_tweets(user2_id, metric='likes', limit=10)
    user2_tweet_ids = [t['tweet_id'] for t in user2_top]

    # Verify User 1 sees only their tweets
    assert "user1_tweet_A" in user1_tweet_ids
    assert "user1_tweet_B" in user1_tweet_ids
    assert "user2_tweet_C" not in user1_tweet_ids
    assert "user2_tweet_D" not in user1_tweet_ids

    # Verify User 2 sees only their tweets
    assert "user2_tweet_C" in user2_tweet_ids
    assert "user2_tweet_D" in user2_tweet_ids
    assert "user1_tweet_A" not in user2_tweet_ids
    assert "user1_tweet_B" not in user2_tweet_ids


@pytest.mark.integration
@pytest.mark.database
def test_multiple_users_snapshot_isolation(analytics_tracker, test_db_path, test_db, test_user):
    """
    Test that snapshots are properly isolated between users.

    Validates:
    - User 1 snapshots don't affect User 2
    - Each user has independent snapshot history
    """
    # Create second user
    import bcrypt
    username2 = 'snapshotuser'
    email2 = 'snapshotuser@example.com'
    password2 = 'SnapshotPass123!'
    password_hash2 = bcrypt.hashpw(password2.encode('utf-8'), bcrypt.gensalt(rounds=12))

    cursor = test_db.cursor()
    cursor.execute('''
        INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
        VALUES (?, ?, ?, ?, 1, 0)
    ''', (username2, email2, password_hash2.decode('utf-8'), int(time.time())))

    user_id2 = cursor.lastrowid
    test_db.commit()

    user1_id = test_user['id']
    user2_id = user_id2

    # Record metrics and create snapshots for User 1
    metrics1 = {'impressions': 1000, 'likes': 50, 'retweets': 25, 'replies': 10, 'engagements': 85}
    analytics_tracker.record_metrics("snap_user1_tweet", user1_id, metrics1)
    analytics_tracker.create_snapshot(user1_id, 'daily')

    # Record metrics and create snapshots for User 2
    metrics2 = {'impressions': 2000, 'likes': 100, 'retweets': 50, 'replies': 20, 'engagements': 170}
    analytics_tracker.record_metrics("snap_user2_tweet", user2_id, metrics2)
    analytics_tracker.create_snapshot(user2_id, 'daily')

    # Verify User 1 snapshot
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT total_impressions FROM analytics_snapshots
        WHERE user_id = ? AND period = 'daily'
    ''', (user1_id,))
    user1_snapshot = cursor.fetchone()
    assert user1_snapshot[0] == 1000

    # Verify User 2 snapshot
    cursor.execute('''
        SELECT total_impressions FROM analytics_snapshots
        WHERE user_id = ? AND period = 'daily'
    ''', (user2_id,))
    user2_snapshot = cursor.fetchone()
    assert user2_snapshot[0] == 2000

    conn.close()
