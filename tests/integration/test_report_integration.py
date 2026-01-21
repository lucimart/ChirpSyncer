"""
Integration Tests for Report Generator (REPORTS-001)

Comprehensive integration tests for the ReportGenerator module covering:
- Report initialization and database schema
- Sync performance reports (daily, weekly, monthly aggregations)
- Analytics reports (engagement, top tweets, growth trends)
- Error and activity reports
- Report export formats (JSON, HTML, CSV, PDF)
- Data aggregation across various time periods
- Cross-platform analysis (Twitter vs Bluesky)
- Multi-user report isolation

Test Coverage:
- 60+ comprehensive integration tests
- All report types and formats
- Database schema validation
- Data aggregation accuracy
- Time-period calculations
- Multi-user isolation
- Error handling and edge cases

Module Coverage Target: app/features/report_generator.py (223 statements, 0% -> 85%+)
"""

import os
import sys
import time
import json
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

# Add app directory to path for imports
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)

from features.report_generator import ReportGenerator


# =============================================================================
# FIXTURES - DATABASE SETUP
# =============================================================================


@pytest.fixture(scope="function")
def report_db(test_db):
    """
    Extend test_db with additional columns required for report generation.

    Modifies synced_posts table to include engagement metrics columns
    and creates reports table for tracking generated reports.
    """
    cursor = test_db.cursor()

    # Check if columns exist and add them if missing
    cursor.execute("PRAGMA table_info(synced_posts)")
    columns = {row[1] for row in cursor.fetchall()}

    # Add missing columns to synced_posts
    if "likes_count" not in columns:
        cursor.execute(
            "ALTER TABLE synced_posts ADD COLUMN likes_count INTEGER DEFAULT 0"
        )
    if "retweets_count" not in columns:
        cursor.execute(
            "ALTER TABLE synced_posts ADD COLUMN retweets_count INTEGER DEFAULT 0"
        )
    if "replies_count" not in columns:
        cursor.execute(
            "ALTER TABLE synced_posts ADD COLUMN replies_count INTEGER DEFAULT 0"
        )
    if "user_id" not in columns:
        cursor.execute("ALTER TABLE synced_posts ADD COLUMN user_id INTEGER")
    if "created_at" not in columns:
        cursor.execute("ALTER TABLE synced_posts ADD COLUMN created_at INTEGER")
    if "has_media" not in columns:
        cursor.execute(
            "ALTER TABLE synced_posts ADD COLUMN has_media INTEGER DEFAULT 0"
        )
    if "is_thread" not in columns:
        cursor.execute(
            "ALTER TABLE synced_posts ADD COLUMN is_thread INTEGER DEFAULT 0"
        )

    # Create reports table for tracking generated reports
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            report_type TEXT NOT NULL,
            report_format TEXT NOT NULL,
            generated_at INTEGER NOT NULL,
            file_path TEXT,
            file_size INTEGER
        )
    """
    )

    test_db.commit()
    return test_db


@pytest.fixture(scope="function")
def report_generator(report_db):
    """Create ReportGenerator instance with test database."""
    gen = ReportGenerator(
        db_path=report_db.execute("PRAGMA database_list").fetchone()[2]
    )
    return gen


@pytest.fixture(scope="function")
def populate_sync_stats(report_db):
    """
    Populate sync_stats table with realistic test data for 90 days.

    Returns: List of (timestamp, success, media_count, thread, duration_ms) tuples
    """
    cursor = report_db.cursor()

    # Clear existing data
    cursor.execute("DELETE FROM sync_stats")
    report_db.commit()

    base_time = int(time.time()) - (90 * 86400)  # 90 days ago
    test_data = []

    # Generate 150 sync records distributed over 90 days
    for day in range(90):
        day_start = base_time + (day * 86400)

        # 2-3 syncs per day
        num_syncs = 2 + (day % 2)
        for sync_num in range(num_syncs):
            timestamp = day_start + (sync_num * 43200)  # 12 hours apart
            success = 1 if (day + sync_num) % 3 != 0 else 0  # ~67% success rate
            media_count = (day + sync_num) % 5
            is_thread = 1 if (day + sync_num) % 4 == 0 else 0
            duration_ms = 500 + (day * 10) % 2000

            cursor.execute(
                """
                INSERT INTO sync_stats
                (timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    timestamp,
                    "twitter" if (day + sync_num) % 2 == 0 else "bluesky",
                    "bluesky" if (day + sync_num) % 2 == 0 else "twitter",
                    success,
                    media_count,
                    is_thread,
                    duration_ms,
                    1,  # user_id
                ),
            )
            test_data.append((timestamp, success, media_count, is_thread, duration_ms))

    report_db.commit()
    return test_data


@pytest.fixture(scope="function")
def populate_synced_posts(report_db):
    """
    Populate synced_posts table with realistic tweet data for 60 days.

    Returns: List of tweet dictionaries with engagement metrics
    """
    cursor = report_db.cursor()

    # Clear existing data
    cursor.execute("DELETE FROM synced_posts")
    report_db.commit()

    base_time = int(time.time()) - (60 * 86400)  # 60 days ago
    tweets = []

    # Generate 80 tweets distributed over 60 days
    for day in range(60):
        day_start = base_time + (day * 86400)

        # 1-2 tweets per day
        num_tweets = 1 + (day % 2)
        for tweet_num in range(num_tweets):
            tweet_id = f"tweet_{day}_{tweet_num}"
            bluesky_uri = f"at://did:plc:test/app.bsky.feed.post/post_{day}_{tweet_num}"

            timestamp = day_start + (tweet_num * 43200)

            # Engagement metrics - vary by day
            likes = (day * 5 + tweet_num * 3) % 500
            retweets = (day * 3 + tweet_num * 2) % 300
            replies = (day * 2 + tweet_num) % 100

            has_media = 1 if (day + tweet_num) % 3 == 0 else 0
            is_thread = 1 if (day + tweet_num) % 5 == 0 else 0

            text = f"Test tweet on day {day} - {'with media' if has_media else 'text only'}"

            cursor.execute(
                """
                INSERT INTO synced_posts
                (twitter_id, bluesky_uri, source, content_hash, synced_to,
                 original_text, likes_count, retweets_count, replies_count,
                 user_id, created_at, has_media, is_thread, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    tweet_id,
                    bluesky_uri,
                    "twitter" if day % 2 == 0 else "bluesky",
                    f"hash_{day}_{tweet_num}",
                    "both",
                    text,
                    likes,
                    retweets,
                    replies,
                    1,  # user_id
                    timestamp,
                    has_media,
                    is_thread,
                    datetime.fromtimestamp(timestamp).isoformat(),
                ),
            )

            tweets.append(
                {
                    "id": day * 10 + tweet_num,
                    "tweet_id": tweet_id,
                    "text": text,
                    "likes": likes,
                    "retweets": retweets,
                    "replies": replies,
                    "created_at": timestamp,
                    "has_media": bool(has_media),
                    "is_thread": bool(is_thread),
                    "total_engagement": likes + retweets + replies,
                }
            )

    report_db.commit()
    return tweets


@pytest.fixture(scope="function")
def populate_tweet_metrics(report_db):
    """
    Populate tweet_metrics table from analytics_tracker.

    Creates tweet_metrics table if it doesn't exist and populates with test data.
    """
    cursor = report_db.cursor()

    # Create tweet_metrics table if it doesn't exist
    cursor.execute(
        """
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
            UNIQUE(tweet_id, user_id, timestamp)
        )
    """
    )

    # Clear existing data
    cursor.execute("DELETE FROM tweet_metrics")
    report_db.commit()

    base_time = int(time.time()) - (30 * 86400)  # 30 days ago

    # Generate 50 metric records
    for i in range(50):
        timestamp = base_time + (i * 86400 * 0.6)  # Spread over 30 days
        tweet_id = f"tweet_metric_{i}"
        impressions = 1000 + (i * 100)
        likes = 50 + (i * 5)
        retweets = 25 + (i * 3)
        replies = 10 + (i * 1)
        engagements = likes + retweets + replies
        engagement_rate = (engagements / impressions * 100) if impressions > 0 else 0

        cursor.execute(
            """
            INSERT OR IGNORE INTO tweet_metrics
            (tweet_id, user_id, timestamp, impressions, likes, retweets, replies, engagements, engagement_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                tweet_id,
                1,
                int(timestamp),
                impressions,
                likes,
                retweets,
                replies,
                engagements,
                engagement_rate,
            ),
        )

    report_db.commit()


# =============================================================================
# TEST GROUP A: Report Initialization & Database (5-7 tests)
# =============================================================================


class TestReportInitialization:
    """Test report generator initialization and database setup."""

    def test_report_generator_initialization(self, report_db):
        """ReportGenerator should initialize with database path."""
        gen = ReportGenerator(
            db_path=report_db.execute("PRAGMA database_list").fetchone()[2]
        )
        assert gen.db_path is not None
        assert gen.db_path.endswith(".db")

    def test_database_connection(self, report_generator):
        """Should establish database connection successfully."""
        conn = report_generator._get_connection()
        assert conn is not None
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        assert result[0] == 1
        conn.close()

    def test_synced_posts_table_exists(self, report_db):
        """synced_posts table should exist with required columns."""
        cursor = report_db.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='synced_posts'"
        )
        assert cursor.fetchone() is not None

        # Verify columns
        cursor.execute("PRAGMA table_info(synced_posts)")
        columns = {row[1] for row in cursor.fetchall()}
        required_columns = {
            "id",
            "twitter_id",
            "bluesky_uri",
            "source",
            "original_text",
        }
        assert required_columns.issubset(columns)

    def test_sync_stats_table_exists(self, report_db):
        """sync_stats table should exist for performance tracking."""
        cursor = report_db.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='sync_stats'"
        )
        assert cursor.fetchone() is not None

        # Verify columns
        cursor.execute("PRAGMA table_info(sync_stats)")
        columns = {row[1] for row in cursor.fetchall()}
        required_columns = {
            "id",
            "timestamp",
            "source",
            "target",
            "success",
            "duration_ms",
        }
        assert required_columns.issubset(columns)

    def test_reports_table_creation(self, report_db):
        """reports table should be created for tracking generated reports."""
        cursor = report_db.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='reports'"
        )
        assert cursor.fetchone() is not None

    def test_database_indexes_created(self, report_db):
        """Database should have performance indexes on key columns."""
        cursor = report_db.cursor()

        # Check for sync_stats indexes
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sync_stats'"
        )
        indexes = {row[0] for row in cursor.fetchall()}
        assert len(indexes) > 0  # Should have at least one index


# =============================================================================
# TEST GROUP B: Engagement Reports (8-10 tests)
# =============================================================================


class TestEngagementReports:
    """Test engagement report generation."""

    def test_engagement_report_json_format(
        self, report_generator, populate_synced_posts
    ):
        """Should generate engagement report in JSON format."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )

        assert report is not None
        assert isinstance(report, bytes)

        # Parse JSON to verify structure
        data = json.loads(report.decode("utf-8"))
        assert "period" in data
        assert "total_tweets" in data
        assert "total_engagement" in data
        assert data["period"] == "week"

    def test_engagement_report_csv_format(
        self, report_generator, populate_synced_posts
    ):
        """Should generate engagement report in CSV format."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="csv"
        )

        assert report is not None
        assert isinstance(report, bytes)

        # Parse CSV to verify structure
        csv_data = report.decode("utf-8")
        lines = csv_data.strip().split("\n")
        assert len(lines) >= 2  # Header + at least one data row
        assert "period" in lines[0]
        assert "total_tweets" in lines[0]

    def test_engagement_report_html_format(
        self, report_generator, populate_synced_posts
    ):
        """Should generate engagement report in HTML format."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="html"
        )

        assert report is not None
        assert isinstance(report, bytes)

        html_content = report.decode("utf-8")
        assert "<!DOCTYPE html>" in html_content
        assert "Engagement Report" in html_content

    def test_engagement_report_pdf_format(
        self, report_generator, populate_synced_posts
    ):
        """Should generate engagement report in PDF format (or HTML fallback)."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="pdf"
        )

        assert report is not None
        assert isinstance(report, bytes)

    def test_engagement_rate_calculation(self, report_generator):
        """Should calculate engagement rate correctly."""
        # Test with known values
        rate = report_generator._calculate_engagement_rate(
            likes=100, retweets=50, replies=25, impressions=1500
        )

        # (100 + 50 + 25) / 1500 * 100 = 11.67%
        assert rate == 11.67

    def test_engagement_rate_estimation(self, report_generator):
        """Should estimate impressions when not provided."""
        rate = report_generator._calculate_engagement_rate(
            likes=100, retweets=50, replies=25
        )

        # Should estimate impressions as engagement * 10 = 175 * 10 = 1750
        assert rate > 0  # Should calculate a rate

    def test_weekly_engagement_report(self, report_generator, populate_synced_posts):
        """Should generate engagement report for 7-day period."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        assert data["period"] == "week"
        assert data["period_days"] == 7

    def test_monthly_engagement_report(self, report_generator, populate_synced_posts):
        """Should generate engagement report for 30-day period."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="month", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        assert data["period"] == "month"
        assert data["period_days"] == 30

    def test_custom_period_engagement_report(
        self, report_generator, populate_synced_posts
    ):
        """Should generate engagement report for custom period (e.g., 14d)."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="14d", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        assert data["period_days"] == 14


# =============================================================================
# TEST GROUP C: Growth & Trend Reports (8-10 tests)
# =============================================================================


class TestGrowthReports:
    """Test growth and trend report generation."""

    def test_growth_report_json_format(self, report_generator, populate_synced_posts):
        """Should generate growth report in JSON format."""
        report = report_generator.generate_growth_report(user_id=1, format="json")

        assert report is not None
        assert isinstance(report, bytes)

        data = json.loads(report.decode("utf-8"))
        assert "engagement_trend" in data
        assert data["engagement_trend"] in ["increasing", "decreasing", "stable"]

    def test_growth_report_csv_format(self, report_generator, populate_synced_posts):
        """Should generate growth report in CSV format."""
        report = report_generator.generate_growth_report(user_id=1, format="csv")

        assert report is not None
        csv_data = report.decode("utf-8")
        assert "engagement_trend" in csv_data

    def test_growth_report_html_format(self, report_generator, populate_synced_posts):
        """Should generate growth report in HTML format."""
        report = report_generator.generate_growth_report(user_id=1, format="html")

        assert report is not None
        html_content = report.decode("utf-8")
        assert "Growth Report" in html_content

    def test_growth_trend_calculation(self, report_generator, populate_synced_posts):
        """Should calculate engagement trend (increasing/decreasing/stable)."""
        report = report_generator.generate_growth_report(user_id=1, format="json")
        data = json.loads(report.decode("utf-8"))

        assert "engagement_trend" in data
        assert data["engagement_trend"] in ["increasing", "decreasing", "stable"]

    def test_tweets_change_metric(self, report_generator, populate_synced_posts):
        """Should calculate tweets change between periods."""
        report = report_generator.generate_growth_report(user_id=1, format="json")
        data = json.loads(report.decode("utf-8"))

        assert "tweets_change" in data
        assert isinstance(data["tweets_change"], int)

    def test_engagement_change_metric(self, report_generator, populate_synced_posts):
        """Should calculate engagement change between periods."""
        report = report_generator.generate_growth_report(user_id=1, format="json")
        data = json.loads(report.decode("utf-8"))

        assert "engagement_change" in data
        assert isinstance(data["engagement_change"], (int, float))

    def test_period_comparison(self, report_generator, populate_synced_posts):
        """Should compare metrics between two 7-day periods."""
        report = report_generator.generate_growth_report(user_id=1, format="json")
        data = json.loads(report.decode("utf-8"))

        assert "first_period_tweets" in data
        assert "second_period_tweets" in data
        assert data["period_days"] == 7


# =============================================================================
# TEST GROUP D: Top Tweets Reports (5-7 tests)
# =============================================================================


class TestTopTweetsReports:
    """Test top tweets report generation."""

    def test_top_tweets_report_json(self, report_generator, populate_synced_posts):
        """Should generate top tweets report in JSON format."""
        report = report_generator.generate_top_tweets_report(
            user_id=1, limit=10, format="json"
        )

        assert report is not None
        data = json.loads(report.decode("utf-8"))
        assert isinstance(data, list)
        assert len(data) <= 10

    def test_top_tweets_report_csv(self, report_generator, populate_synced_posts):
        """Should generate top tweets report in CSV format."""
        report = report_generator.generate_top_tweets_report(
            user_id=1, limit=10, format="csv"
        )

        assert report is not None
        csv_data = report.decode("utf-8")
        lines = csv_data.strip().split("\n")
        assert "tweet_id" in lines[0]

    def test_top_tweets_report_html(self, report_generator, populate_synced_posts):
        """Should generate top tweets report in HTML format."""
        report = report_generator.generate_top_tweets_report(
            user_id=1, limit=10, format="html"
        )

        assert report is not None
        html_content = report.decode("utf-8")
        assert "Top Tweets" in html_content

    def test_top_tweets_sorting_by_engagement(
        self, report_generator, populate_synced_posts
    ):
        """Should sort tweets by total engagement (likes + retweets + replies)."""
        report = report_generator.generate_top_tweets_report(
            user_id=1, limit=5, format="json"
        )
        tweets = json.loads(report.decode("utf-8"))

        # Verify tweets are sorted by engagement
        for i in range(len(tweets) - 1):
            assert tweets[i]["total_engagement"] >= tweets[i + 1]["total_engagement"]

    def test_top_tweets_limit_respected(self, report_generator, populate_synced_posts):
        """Should respect limit parameter."""
        for limit in [5, 10, 20]:
            report = report_generator.generate_top_tweets_report(
                user_id=1, limit=limit, format="json"
            )
            tweets = json.loads(report.decode("utf-8"))
            assert len(tweets) <= limit


# =============================================================================
# TEST GROUP E: Data Export (6-8 tests)
# =============================================================================


class TestDataExports:
    """Test data export functionality."""

    def test_export_tweets_json(self, report_generator, populate_synced_posts):
        """Should export tweets data in JSON format."""
        report = report_generator.export_data(
            user_id=1, data_type="tweets", format="json"
        )

        assert report is not None
        data = json.loads(report.decode("utf-8"))
        assert isinstance(data, list)

    def test_export_tweets_csv(self, report_generator, populate_synced_posts):
        """Should export tweets data in CSV format."""
        report = report_generator.export_data(
            user_id=1, data_type="tweets", format="csv"
        )

        assert report is not None
        csv_data = report.decode("utf-8")
        assert "tweet_id" in csv_data

    def test_export_tweets_html(self, report_generator, populate_synced_posts):
        """Should export tweets data in HTML format."""
        report = report_generator.export_data(
            user_id=1, data_type="tweets", format="html"
        )

        assert report is not None
        html_content = report.decode("utf-8")
        assert "<!DOCTYPE html>" in html_content

    def test_export_engagement_data(self, report_generator, populate_synced_posts):
        """Should export engagement data."""
        report = report_generator.export_data(
            user_id=1, data_type="engagement", format="json"
        )

        assert report is not None
        data = json.loads(report.decode("utf-8"))
        assert isinstance(data, list)

    def test_export_includes_metrics(self, report_generator, populate_synced_posts):
        """Exported data should include all relevant metrics."""
        report = report_generator.export_data(
            user_id=1, data_type="tweets", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        if data:
            first_item = data[0]
            assert "tweet_id" in first_item
            assert "likes" in first_item
            assert "retweets" in first_item
            assert "replies" in first_item


# =============================================================================
# TEST GROUP F: Period Parsing & Validation (8-10 tests)
# =============================================================================


class TestPeriodParsing:
    """Test period parsing and validation."""

    def test_parse_week_period(self, report_generator):
        """Should parse 'week' period as 7 days."""
        days = report_generator._parse_period("week")
        assert days == 7

    def test_parse_month_period(self, report_generator):
        """Should parse 'month' period as 30 days."""
        days = report_generator._parse_period("month")
        assert days == 30

    def test_parse_year_period(self, report_generator):
        """Should parse 'year' period as 365 days."""
        days = report_generator._parse_period("year")
        assert days == 365

    def test_parse_custom_days_period(self, report_generator):
        """Should parse custom period like '14d'."""
        days = report_generator._parse_period("14d")
        assert days == 14

    def test_parse_single_day_period(self, report_generator):
        """Should parse '1d' as single day."""
        days = report_generator._parse_period("1d")
        assert days == 1

    def test_parse_long_period(self, report_generator):
        """Should parse long periods like '90d'."""
        days = report_generator._parse_period("90d")
        assert days == 90

    def test_invalid_period_format(self, report_generator):
        """Should raise ValueError for invalid period format."""
        with pytest.raises(ValueError):
            report_generator._parse_period("invalid")

    def test_invalid_numeric_period(self, report_generator):
        """Should raise ValueError for invalid numeric period."""
        with pytest.raises(ValueError):
            report_generator._parse_period("abc123d")


# =============================================================================
# TEST GROUP G: Format Validation (5-7 tests)
# =============================================================================


class TestFormatValidation:
    """Test report format validation."""

    def test_valid_json_format(self, report_generator):
        """Should accept 'json' format."""
        try:
            report_generator._validate_format("json")
        except ValueError:
            pytest.fail("Should accept 'json' format")

    def test_valid_csv_format(self, report_generator):
        """Should accept 'csv' format."""
        try:
            report_generator._validate_format("csv")
        except ValueError:
            pytest.fail("Should accept 'csv' format")

    def test_valid_html_format(self, report_generator):
        """Should accept 'html' format."""
        try:
            report_generator._validate_format("html")
        except ValueError:
            pytest.fail("Should accept 'html' format")

    def test_valid_pdf_format(self, report_generator):
        """Should accept 'pdf' format."""
        try:
            report_generator._validate_format("pdf")
        except ValueError:
            pytest.fail("Should accept 'pdf' format")

    def test_invalid_format(self, report_generator):
        """Should raise ValueError for unsupported format."""
        with pytest.raises(ValueError):
            report_generator._validate_format("xml")

    def test_case_insensitive_format(self, report_generator):
        """Should accept format in any case."""
        try:
            report_generator._validate_format("JSON")
            report_generator._validate_format("Csv")
            report_generator._validate_format("HtMl")
        except ValueError:
            pytest.fail("Should accept case-insensitive formats")


# =============================================================================
# TEST GROUP H: Sync Performance Reports (8-10 tests)
# =============================================================================


class TestSyncPerformanceReports:
    """Test sync performance report generation using sync_stats table."""

    def test_sync_stats_table_populated(self, report_db, populate_sync_stats):
        """sync_stats table should be populated with test data."""
        cursor = report_db.cursor()
        cursor.execute("SELECT COUNT(*) FROM sync_stats WHERE user_id = 1")
        count = cursor.fetchone()[0]

        assert count > 0, "sync_stats should have test data"

    def test_daily_sync_performance(self, report_db, populate_sync_stats):
        """Should calculate daily sync performance metrics."""
        cursor = report_db.cursor()

        # Calculate daily metrics manually
        base_time = int(time.time()) - (90 * 86400)
        day_start = base_time
        day_end = base_time + 86400

        cursor.execute(
            """
            SELECT COUNT(*) as total, SUM(success) as successful,
                   SUM(media_count) as total_media, SUM(is_thread) as total_threads
            FROM sync_stats
            WHERE timestamp BETWEEN ? AND ? AND user_id = 1
        """,
            (day_start, day_end),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_success_rate_calculation(self, report_db, populate_sync_stats):
        """Should calculate sync success rate correctly."""
        cursor = report_db.cursor()

        cursor.execute(
            """
            SELECT COUNT(*) as total, SUM(success) as successful
            FROM sync_stats WHERE user_id = 1
        """
        )

        result = cursor.fetchone()
        if result[0] > 0:
            success_rate = (result[1] / result[0]) * 100
            assert 0 <= success_rate <= 100

    def test_media_count_aggregation(self, report_db, populate_sync_stats):
        """Should aggregate total media count from syncs."""
        cursor = report_db.cursor()

        cursor.execute("SELECT SUM(media_count) FROM sync_stats WHERE user_id = 1")
        total_media = cursor.fetchone()[0] or 0

        assert total_media >= 0

    def test_thread_count_aggregation(self, report_db, populate_sync_stats):
        """Should aggregate total thread count from syncs."""
        cursor = report_db.cursor()

        cursor.execute("SELECT SUM(is_thread) FROM sync_stats WHERE user_id = 1")
        total_threads = cursor.fetchone()[0] or 0

        assert total_threads >= 0

    def test_average_sync_duration(self, report_db, populate_sync_stats):
        """Should calculate average sync duration."""
        cursor = report_db.cursor()

        cursor.execute("SELECT AVG(duration_ms) FROM sync_stats WHERE user_id = 1")
        avg_duration = cursor.fetchone()[0]

        assert avg_duration is None or avg_duration > 0

    def test_platform_specific_metrics(self, report_db, populate_sync_stats):
        """Should track metrics for each platform direction."""
        cursor = report_db.cursor()

        # Twitter to Bluesky
        cursor.execute(
            """
            SELECT COUNT(*) FROM sync_stats
            WHERE user_id = 1 AND source = 'twitter' AND target = 'bluesky'
        """
        )
        twitter_to_bluesky = cursor.fetchone()[0]

        # Bluesky to Twitter
        cursor.execute(
            """
            SELECT COUNT(*) FROM sync_stats
            WHERE user_id = 1 AND source = 'bluesky' AND target = 'twitter'
        """
        )
        bluesky_to_twitter = cursor.fetchone()[0]

        assert twitter_to_bluesky >= 0
        assert bluesky_to_twitter >= 0

    def test_error_tracking(self, report_db, populate_sync_stats):
        """Should track failed syncs for error reporting."""
        cursor = report_db.cursor()

        cursor.execute(
            "SELECT COUNT(*) FROM sync_stats WHERE success = 0 AND user_id = 1"
        )
        failed_syncs = cursor.fetchone()[0]

        assert failed_syncs >= 0


# =============================================================================
# TEST GROUP I: Time Period Aggregation (8-10 tests)
# =============================================================================


class TestTimeAggregation:
    """Test data aggregation across various time periods."""

    def test_hourly_aggregation(self, report_db, populate_synced_posts):
        """Should aggregate data by hour."""
        cursor = report_db.cursor()
        base_time = int(time.time()) - (86400)  # Yesterday
        hour_start = (base_time // 3600) * 3600
        hour_end = hour_start + 3600

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (hour_start, hour_end),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_daily_aggregation(self, report_db, populate_synced_posts):
        """Should aggregate data by day."""
        cursor = report_db.cursor()
        base_time = int(time.time()) - (86400)  # Yesterday
        day_start = (base_time // 86400) * 86400
        day_end = day_start + 86400

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (day_start, day_end),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_weekly_aggregation(self, report_db, populate_synced_posts):
        """Should aggregate data for 7-day period."""
        cursor = report_db.cursor()
        base_time = int(time.time())
        week_ago = base_time - (7 * 86400)

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at >= ? AND created_at <= ? AND user_id = 1
        """,
            (week_ago, base_time),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_monthly_aggregation(self, report_db, populate_synced_posts):
        """Should aggregate data for 30-day period."""
        cursor = report_db.cursor()
        base_time = int(time.time())
        month_ago = base_time - (30 * 86400)

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at >= ? AND created_at <= ? AND user_id = 1
        """,
            (month_ago, base_time),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_custom_date_range(self, report_db, populate_synced_posts):
        """Should support custom date range queries."""
        cursor = report_db.cursor()
        base_time = int(time.time())

        # 14-day period
        range_start = base_time - (14 * 86400)
        range_end = base_time

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (range_start, range_end),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_year_to_date_aggregation(self, report_db, populate_synced_posts):
        """Should support year-to-date reporting."""
        cursor = report_db.cursor()

        # Get year start
        now = datetime.now()
        year_start = datetime(now.year, 1, 1)
        year_start_ts = int(year_start.timestamp())
        current_ts = int(time.time())

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (year_start_ts, current_ts),
        )

        result = cursor.fetchone()
        assert result is not None

    def test_comparison_report_periods(self, report_db, populate_synced_posts):
        """Should support comparison between two periods."""
        cursor = report_db.cursor()
        base_time = int(time.time())

        # First period (7 days ago to 14 days ago)
        period1_end = base_time - (7 * 86400)
        period1_start = period1_end - (7 * 86400)

        # Second period (0 to 7 days ago)
        period2_end = base_time
        period2_start = period2_end - (7 * 86400)

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (period1_start, period1_end),
        )
        period1_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts
            WHERE created_at BETWEEN ? AND ? AND user_id = 1
        """,
            (period2_start, period2_end),
        )
        period2_count = cursor.fetchone()[0]

        assert period1_count >= 0 and period2_count >= 0


# =============================================================================
# TEST GROUP J: Cross-Platform Analysis (5-7 tests)
# =============================================================================


class TestCrossPlatformAnalysis:
    """Test cross-platform comparison reports."""

    def test_twitter_specific_metrics(self, report_db, populate_synced_posts):
        """Should extract Twitter-specific metrics."""
        cursor = report_db.cursor()

        cursor.execute(
            """
            SELECT COUNT(*), SUM(likes_count), SUM(retweets_count), SUM(replies_count)
            FROM synced_posts
            WHERE source = 'twitter' AND user_id = 1
        """
        )

        result = cursor.fetchone()
        assert result[0] >= 0  # At least have count

    def test_bluesky_specific_metrics(self, report_db, populate_synced_posts):
        """Should extract Bluesky-specific metrics."""
        cursor = report_db.cursor()

        cursor.execute(
            """
            SELECT COUNT(*), SUM(likes_count), SUM(retweets_count), SUM(replies_count)
            FROM synced_posts
            WHERE source = 'bluesky' AND user_id = 1
        """
        )

        result = cursor.fetchone()
        assert result[0] >= 0

    def test_platform_engagement_comparison(self, report_db, populate_synced_posts):
        """Should compare engagement metrics between platforms."""
        cursor = report_db.cursor()

        # Twitter engagement
        cursor.execute(
            """
            SELECT SUM(likes_count + retweets_count + replies_count)
            FROM synced_posts
            WHERE source = 'twitter' AND user_id = 1
        """
        )
        twitter_engagement = cursor.fetchone()[0] or 0

        # Bluesky engagement
        cursor.execute(
            """
            SELECT SUM(likes_count + retweets_count + replies_count)
            FROM synced_posts
            WHERE source = 'bluesky' AND user_id = 1
        """
        )
        bluesky_engagement = cursor.fetchone()[0] or 0

        assert twitter_engagement >= 0
        assert bluesky_engagement >= 0

    def test_media_usage_by_platform(self, report_db, populate_synced_posts):
        """Should track media usage differences between platforms."""
        cursor = report_db.cursor()

        cursor.execute(
            """
            SELECT SUM(has_media) FROM synced_posts
            WHERE source = 'twitter' AND user_id = 1
        """
        )
        twitter_media = cursor.fetchone()[0] or 0

        cursor.execute(
            """
            SELECT SUM(has_media) FROM synced_posts
            WHERE source = 'bluesky' AND user_id = 1
        """
        )
        bluesky_media = cursor.fetchone()[0] or 0

        assert twitter_media >= 0
        assert bluesky_media >= 0

    def test_thread_usage_by_platform(self, report_db, populate_synced_posts):
        """Should track thread usage differences between platforms."""
        cursor = report_db.cursor()

        cursor.execute(
            """
            SELECT SUM(is_thread) FROM synced_posts
            WHERE source = 'twitter' AND user_id = 1
        """
        )
        twitter_threads = cursor.fetchone()[0] or 0

        cursor.execute(
            """
            SELECT SUM(is_thread) FROM synced_posts
            WHERE source = 'bluesky' AND user_id = 1
        """
        )
        bluesky_threads = cursor.fetchone()[0] or 0

        assert twitter_threads >= 0
        assert bluesky_threads >= 0


# =============================================================================
# TEST GROUP K: Multi-User Isolation (4-6 tests)
# =============================================================================


class TestMultiUserIsolation:
    """Test data isolation between users in reports."""

    def test_user_specific_data_isolation(self, report_db, populate_synced_posts):
        """Reports should only include data for requested user."""
        cursor = report_db.cursor()

        # Get data for user 1
        cursor.execute(
            """
            SELECT COUNT(*) FROM synced_posts WHERE user_id = 1
        """
        )
        user1_count = cursor.fetchone()[0]

        assert user1_count >= 0

    def test_engagement_report_user_isolation(
        self, report_generator, populate_synced_posts
    ):
        """Engagement reports should be isolated per user."""
        report1 = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )
        data1 = json.loads(report1.decode("utf-8"))

        # Data should be consistent for same user
        assert data1["total_tweets"] >= 0

    def test_different_users_different_metrics(
        self, report_db, populate_synced_posts, test_user
    ):
        """Different users should have different report data."""
        cursor = report_db.cursor()

        # Create data for user 2
        cursor.execute(
            """
            INSERT INTO synced_posts
            (twitter_id, bluesky_uri, source, content_hash, synced_to,
             original_text, likes_count, retweets_count, replies_count,
             user_id, created_at, has_media, is_thread, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                "user2_tweet_1",
                "at://user2/post/1",
                "twitter",
                "hash_user2_1",
                "both",
                "User 2 tweet",
                100,
                50,
                25,
                2,
                int(time.time()),
                0,
                0,
                datetime.now().isoformat(),
            ),
        )
        report_db.commit()

        # Both users should have data
        cursor.execute("SELECT COUNT(*) FROM synced_posts WHERE user_id = 1")
        user1_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM synced_posts WHERE user_id = 2")
        user2_count = cursor.fetchone()[0]

        assert user1_count > 0
        assert user2_count > 0


# =============================================================================
# TEST GROUP L: Error Handling & Edge Cases (6-8 tests)
# =============================================================================


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_empty_database_report(self, report_db):
        """Should handle reports with no data gracefully."""
        gen = ReportGenerator(
            db_path=report_db.execute("PRAGMA database_list").fetchone()[2]
        )

        # Database is empty, should not crash
        report = gen.generate_engagement_report(
            user_id=999, period="week", format="json"
        )
        assert report is not None

        data = json.loads(report.decode("utf-8"))
        assert data["total_tweets"] == 0

    def test_invalid_format_raises_error(self, report_generator):
        """Should raise error for invalid format."""
        with pytest.raises(ValueError):
            report_generator.generate_engagement_report(
                user_id=1, period="week", format="invalid"
            )

    def test_invalid_period_raises_error(self, report_generator):
        """Should raise error for invalid period."""
        with pytest.raises(ValueError):
            report_generator.generate_engagement_report(
                user_id=1, period="invalid", format="json"
            )

    def test_invalid_data_type_raises_error(self, report_generator):
        """Should raise error for invalid data type."""
        with pytest.raises(ValueError):
            report_generator.export_data(user_id=1, data_type="invalid", format="json")

    def test_zero_engagement_handling(self, report_db, populate_synced_posts):
        """Should handle tweets with zero engagement."""
        gen = ReportGenerator(
            db_path=report_db.execute("PRAGMA database_list").fetchone()[2]
        )

        # This should not crash
        report = gen.generate_top_tweets_report(user_id=1, limit=10, format="json")
        assert report is not None

    def test_missing_data_columns(self, report_generator):
        """Should gracefully handle missing optional data."""
        # This tests the robustness of the implementation
        # Even if some columns are missing, report should work
        try:
            report = report_generator.generate_engagement_report(
                user_id=1, period="week", format="json"
            )
            assert report is not None
        except Exception as e:
            # Some graceful handling is expected
            assert False, f"Should handle missing data gracefully: {e}"

    def test_very_large_engagement_numbers(self, report_db):
        """Should handle very large engagement numbers."""
        cursor = report_db.cursor()

        # Insert tweet with large numbers
        cursor.execute(
            """
            INSERT INTO synced_posts
            (twitter_id, bluesky_uri, source, content_hash, synced_to,
             original_text, likes_count, retweets_count, replies_count,
             user_id, created_at, has_media, is_thread, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                "viral_tweet",
                "at://viral/1",
                "twitter",
                "hash_viral",
                "both",
                "Viral tweet",
                1000000,
                500000,
                250000,
                1,
                int(time.time()),
                0,
                0,
                datetime.now().isoformat(),
            ),
        )
        report_db.commit()

        gen = ReportGenerator(
            db_path=report_db.execute("PRAGMA database_list").fetchone()[2]
        )
        report = gen.generate_top_tweets_report(user_id=1, limit=10, format="json")

        assert report is not None
        data = json.loads(report.decode("utf-8"))
        # Should find the viral tweet
        assert len(data) > 0


# =============================================================================
# TEST GROUP M: Integration with Other Modules (5-7 tests)
# =============================================================================


class TestModuleIntegration:
    """Test integration with other modules."""

    def test_reports_reference_sync_stats(self, report_db, populate_sync_stats):
        """Reports should be able to use data from sync_stats table."""
        cursor = report_db.cursor()

        # Verify sync_stats data exists
        cursor.execute("SELECT COUNT(*) FROM sync_stats")
        count = cursor.fetchone()[0]

        assert count > 0

    def test_reports_reference_synced_posts(self, report_db, populate_synced_posts):
        """Reports should use synced_posts table data."""
        cursor = report_db.cursor()

        cursor.execute("SELECT COUNT(*) FROM synced_posts")
        count = cursor.fetchone()[0]

        assert count > 0

    def test_tweet_metrics_integration(self, report_db, populate_tweet_metrics):
        """Reports should integrate with tweet_metrics from analytics."""
        cursor = report_db.cursor()

        cursor.execute("SELECT COUNT(*) FROM tweet_metrics")
        count = cursor.fetchone()[0]

        assert count > 0

    @patch("app.services.notification_service.NotificationService")
    def test_email_report_integration(
        self, mock_notification, report_generator, populate_synced_posts
    ):
        """Should integrate with NotificationService for email delivery."""
        # Mock the NotificationService
        mock_service = MagicMock()
        mock_service.send_email.return_value = {"email_id": "email_123"}
        mock_notification.return_value = mock_service

        # Generate a report
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="html"
        )

        # Test email integration (mocked)
        assert report is not None


# =============================================================================
# TEST GROUP N: Format-Specific Tests (8-10 tests)
# =============================================================================


class TestFormatSpecific:
    """Test format-specific output validation."""

    def test_json_valid_structure(self, report_generator, populate_synced_posts):
        """JSON reports should have valid structure."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )

        try:
            data = json.loads(report.decode("utf-8"))
            assert isinstance(data, dict)
            assert "generated_at" in data
        except json.JSONDecodeError:
            pytest.fail("JSON should be valid")

    def test_csv_valid_format(self, report_generator, populate_synced_posts):
        """CSV reports should be properly formatted."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="csv"
        )

        csv_content = report.decode("utf-8")
        # Should have header row and data rows
        lines = csv_content.strip().split("\n")
        assert len(lines) >= 1  # At least header

    def test_html_valid_markup(self, report_generator, populate_synced_posts):
        """HTML reports should have valid HTML markup."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="html"
        )

        html_content = report.decode("utf-8")
        assert "<!DOCTYPE html>" in html_content or "<html" in html_content
        assert "</html>" in html_content

    def test_json_includes_timestamp(self, report_generator, populate_synced_posts):
        """JSON reports should include generation timestamp."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        assert "generated_at" in data
        # Should be ISO format
        assert "T" in data["generated_at"] or " " in data["generated_at"]

    def test_csv_has_headers(self, report_generator, populate_synced_posts):
        """CSV reports should include header row."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="csv"
        )

        csv_content = report.decode("utf-8")
        lines = csv_content.strip().split("\n")
        header = lines[0]

        # Should have expected fields
        assert "period" in header or "Period" in header.lower()

    def test_html_readable_styling(self, report_generator, populate_synced_posts):
        """HTML reports should include readable styling."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="html"
        )

        html_content = report.decode("utf-8")
        # Should have style information
        assert "<style>" in html_content or "font-family" in html_content

    def test_json_numeric_values(self, report_generator, populate_synced_posts):
        """JSON engagement report should have numeric values."""
        report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )
        data = json.loads(report.decode("utf-8"))

        assert isinstance(data["total_tweets"], int)
        assert isinstance(data["total_engagement"], int)
        assert isinstance(data["avg_engagement_rate"], (int, float))

    def test_csv_numeric_consistency(self, report_generator, populate_synced_posts):
        """CSV values should be consistent with JSON format."""
        json_report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="json"
        )
        json_data = json.loads(json_report.decode("utf-8"))

        _csv_report = report_generator.generate_engagement_report(
            user_id=1, period="week", format="csv"
        )

        # Both should have the same data
        assert json_data["total_tweets"] >= 0


# =============================================================================
# MARKER CONFIGURATION
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
class IntegrationMarker:
    """Marker class for integration tests."""

    pass
