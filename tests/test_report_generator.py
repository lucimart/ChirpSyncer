"""
Tests for Report Generator (Sprint 7 - REPORTS-001)

Tests report generation with multiple formats (CSV, JSON, HTML, PDF).
Covers engagement reports, growth reports, top tweets reports, and data exports.
"""
import pytest
import json
import csv
import io
import tempfile
import sqlite3
import time
from datetime import datetime, timedelta
from app.features.report_generator import ReportGenerator


@pytest.fixture
def test_db():
    """Create temporary test database with sample data"""
    db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
    db_path = db.name
    db.close()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL
        )
    ''')

    # Create synced_posts table (from existing schema)
    cursor.execute('''
        CREATE TABLE synced_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            twitter_id TEXT,
            bluesky_uri TEXT,
            source TEXT NOT NULL,
            content_hash TEXT NOT NULL UNIQUE,
            synced_to TEXT,
            synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            original_text TEXT NOT NULL,
            user_id INTEGER,
            likes_count INTEGER DEFAULT 0,
            retweets_count INTEGER DEFAULT 0,
            replies_count INTEGER DEFAULT 0,
            created_at INTEGER,
            has_media INTEGER DEFAULT 0,
            is_thread INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Insert test user
    now = int(time.time())
    cursor.execute('INSERT INTO users (id, username, email, created_at) VALUES (?, ?, ?, ?)',
                   (1, 'testuser', 'test@example.com', now - 86400 * 30))

    # Insert sample tweet data for analytics
    base_time = now - 86400 * 30  # 30 days ago

    # Week 1: 10 tweets, good engagement
    for i in range(10):
        tweet_time = base_time + i * 3600
        cursor.execute('''
            INSERT INTO synced_posts
            (twitter_id, source, content_hash, synced_to, original_text, user_id,
             likes_count, retweets_count, replies_count, created_at, has_media, is_thread)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'tweet_w1_{i}',
            'twitter',
            f'hash_w1_{i}',
            'bluesky',
            f'Week 1 tweet #{i}',
            1,
            50 + i * 10,  # likes: 50-140
            10 + i * 2,   # retweets: 10-28
            5 + i,        # replies: 5-14
            tweet_time,
            1 if i % 2 == 0 else 0,  # alternating media
            1 if i == 9 else 0       # last one is a thread
        ))

    # Week 2: 8 tweets, moderate engagement
    for i in range(8):
        tweet_time = base_time + 86400 * 7 + i * 3600
        cursor.execute('''
            INSERT INTO synced_posts
            (twitter_id, source, content_hash, synced_to, original_text, user_id,
             likes_count, retweets_count, replies_count, created_at, has_media)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'tweet_w2_{i}',
            'twitter',
            f'hash_w2_{i}',
            'bluesky',
            f'Week 2 tweet #{i}',
            1,
            30 + i * 5,   # likes: 30-65
            5 + i,        # retweets: 5-12
            2 + i,        # replies: 2-9
            tweet_time,
            0
        ))

    # Week 3: 12 tweets, high engagement (viral week!)
    for i in range(12):
        tweet_time = base_time + 86400 * 14 + i * 3600
        cursor.execute('''
            INSERT INTO synced_posts
            (twitter_id, source, content_hash, synced_to, original_text, user_id,
             likes_count, retweets_count, replies_count, created_at, has_media)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'tweet_w3_{i}',
            'twitter',
            f'hash_w3_{i}',
            'bluesky',
            f'Week 3 viral tweet #{i}',
            1,
            100 + i * 50,  # likes: 100-650 (one viral!)
            20 + i * 10,   # retweets: 20-130
            10 + i * 5,    # replies: 10-65
            tweet_time,
            1 if i > 5 else 0
        ))

    # Week 4: 5 tweets, low engagement
    for i in range(5):
        tweet_time = base_time + 86400 * 21 + i * 3600
        cursor.execute('''
            INSERT INTO synced_posts
            (twitter_id, source, content_hash, synced_to, original_text, user_id,
             likes_count, retweets_count, replies_count, created_at, has_media)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f'tweet_w4_{i}',
            'twitter',
            f'hash_w4_{i}',
            'bluesky',
            f'Week 4 tweet #{i}',
            1,
            10 + i * 2,   # likes: 10-18
            2 + i,        # retweets: 2-6
            1 + i,        # replies: 1-5
            tweet_time,
            0
        ))

    conn.commit()
    conn.close()

    yield db_path

    # Cleanup
    import os
    os.unlink(db_path)


@pytest.fixture
def report_gen(test_db):
    """Create ReportGenerator instance with test database"""
    return ReportGenerator(db_path=test_db)


class TestReportGeneratorInit:
    """Test ReportGenerator initialization"""

    def test_init_with_default_db(self):
        """Test initialization with default database path"""
        gen = ReportGenerator()
        assert gen.db_path == 'chirpsyncer.db'

    def test_init_with_custom_db(self, test_db):
        """Test initialization with custom database path"""
        gen = ReportGenerator(db_path=test_db)
        assert gen.db_path == test_db


class TestCSVReports:
    """Test CSV format report generation"""

    def test_generate_engagement_report_csv(self, report_gen):
        """Test engagement report in CSV format"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='30d',
            format='csv'
        )

        # Should return bytes
        assert isinstance(result, bytes)

        # Parse CSV
        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        # Should have data
        assert len(rows) > 0

        # Check CSV headers
        assert 'period' in rows[0]
        assert 'total_tweets' in rows[0]
        assert 'total_likes' in rows[0]
        assert 'total_retweets' in rows[0]
        assert 'avg_engagement_rate' in rows[0]

    def test_generate_top_tweets_csv(self, report_gen):
        """Test top tweets report in CSV format"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=10,
            format='csv'
        )

        assert isinstance(result, bytes)

        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        # Should have up to 10 rows
        assert 0 < len(rows) <= 10

        # Check headers
        assert 'tweet_id' in rows[0]
        assert 'text' in rows[0]
        assert 'likes' in rows[0]
        assert 'retweets' in rows[0]
        assert 'total_engagement' in rows[0]

        # Should be sorted by engagement (descending)
        engagements = [int(row['total_engagement']) for row in rows]
        assert engagements == sorted(engagements, reverse=True)


class TestJSONReports:
    """Test JSON format report generation"""

    def test_generate_engagement_report_json(self, report_gen):
        """Test engagement report in JSON format"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='week',
            format='json'
        )

        # Should return bytes
        assert isinstance(result, bytes)

        # Parse JSON
        data = json.loads(result.decode('utf-8'))

        # Check structure
        assert 'period' in data
        assert 'total_tweets' in data
        assert 'total_likes' in data
        assert 'total_retweets' in data
        assert 'total_replies' in data
        assert 'avg_engagement_rate' in data

        # Check data types
        assert isinstance(data['total_tweets'], int)
        assert isinstance(data['total_likes'], int)
        assert isinstance(data['avg_engagement_rate'], (int, float))

    def test_generate_growth_report_json(self, report_gen):
        """Test growth report in JSON format"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='json'
        )

        assert isinstance(result, bytes)
        data = json.loads(result.decode('utf-8'))

        # Check structure
        assert 'tweets_change' in data
        assert 'engagement_trend' in data
        assert 'period_days' in data

        # Engagement trend should be a valid value
        assert data['engagement_trend'] in ['increasing', 'decreasing', 'stable']

    def test_export_data_json(self, report_gen):
        """Test data export in JSON format"""
        result = report_gen.export_data(
            user_id=1,
            data_type='tweets',
            format='json'
        )

        assert isinstance(result, bytes)
        data = json.loads(result.decode('utf-8'))

        # Should be a list of tweets
        assert isinstance(data, list)
        assert len(data) > 0

        # Check first tweet structure
        tweet = data[0]
        assert 'tweet_id' in tweet
        assert 'text' in tweet
        assert 'created_at' in tweet


class TestHTMLReports:
    """Test HTML format report generation"""

    def test_generate_engagement_report_html(self, report_gen):
        """Test engagement report in HTML format"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='30d',
            format='html'
        )

        # Should return bytes
        assert isinstance(result, bytes)

        html_content = result.decode('utf-8')

        # Basic HTML checks
        assert '<html' in html_content.lower()
        assert '</html>' in html_content.lower()
        assert 'Engagement Report' in html_content

        # Should contain metrics
        assert 'Total Tweets' in html_content
        assert 'Total Likes' in html_content

    def test_generate_top_tweets_html(self, report_gen):
        """Test top tweets report in HTML format"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=5,
            format='html'
        )

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')

        assert '<html' in html_content.lower()
        assert 'Top Tweets' in html_content


class TestReportPeriods:
    """Test different time periods for reports"""

    def test_engagement_report_week_period(self, report_gen):
        """Test engagement report for 1 week period"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='week',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert data['period'] == 'week'
        assert data['period_days'] == 7

    def test_engagement_report_30d_period(self, report_gen):
        """Test engagement report for 30 days period"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='30d',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert data['period'] == '30d'
        assert data['period_days'] == 30

    def test_engagement_report_custom_period(self, report_gen):
        """Test engagement report with custom period"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='14d',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert data['period_days'] == 14


class TestEmptyDataHandling:
    """Test reports with no data"""

    def test_engagement_report_no_tweets(self, test_db):
        """Test engagement report for user with no tweets"""
        # Create generator
        gen = ReportGenerator(db_path=test_db)

        # User ID 999 doesn't exist
        result = gen.generate_engagement_report(
            user_id=999,
            period='30d',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))

        # Should return zero values
        assert data['total_tweets'] == 0
        assert data['total_likes'] == 0
        assert data['avg_engagement_rate'] == 0.0

    def test_top_tweets_no_data(self, test_db):
        """Test top tweets report with no data"""
        gen = ReportGenerator(db_path=test_db)

        result = gen.generate_top_tweets_report(
            user_id=999,
            limit=10,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert isinstance(data, list)
        assert len(data) == 0


class TestDataExport:
    """Test data export functionality"""

    def test_export_tweets_csv(self, report_gen):
        """Test exporting tweets to CSV"""
        result = report_gen.export_data(
            user_id=1,
            data_type='tweets',
            format='csv'
        )

        assert isinstance(result, bytes)
        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        assert len(rows) > 0
        assert 'tweet_id' in rows[0]
        assert 'text' in rows[0]

    def test_export_engagement_csv(self, report_gen):
        """Test exporting engagement metrics to CSV"""
        result = report_gen.export_data(
            user_id=1,
            data_type='engagement',
            format='csv'
        )

        assert isinstance(result, bytes)
        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        assert len(rows) > 0
        assert 'likes' in rows[0] or 'likes_count' in rows[0]


class TestInvalidInputs:
    """Test error handling for invalid inputs"""

    def test_invalid_format(self, report_gen):
        """Test with unsupported format"""
        with pytest.raises(ValueError, match='Unsupported format'):
            report_gen.generate_engagement_report(
                user_id=1,
                period='30d',
                format='xml'
            )

    def test_invalid_period(self, report_gen):
        """Test with invalid period format"""
        with pytest.raises(ValueError, match='Invalid period'):
            report_gen.generate_engagement_report(
                user_id=1,
                period='invalid',
                format='json'
            )

    def test_invalid_data_type(self, report_gen):
        """Test export with invalid data type"""
        with pytest.raises(ValueError, match='Unsupported data type'):
            report_gen.export_data(
                user_id=1,
                data_type='invalid',
                format='json'
            )


class TestTopTweetsReport:
    """Test top tweets report functionality"""

    def test_top_tweets_default_limit(self, report_gen):
        """Test top tweets with default limit"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=10,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert len(data) <= 10

    def test_top_tweets_custom_limit(self, report_gen):
        """Test top tweets with custom limit"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=5,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert len(data) <= 5

    def test_top_tweets_engagement_calculation(self, report_gen):
        """Test that engagement is calculated correctly"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=10,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))

        # Check first tweet
        if len(data) > 0:
            tweet = data[0]
            assert 'total_engagement' in tweet

            # Engagement should be likes + retweets + replies
            expected = tweet['likes'] + tweet['retweets'] + tweet['replies']
            assert tweet['total_engagement'] == expected


class TestGrowthReport:
    """Test growth report functionality"""

    def test_growth_report_structure(self, report_gen):
        """Test growth report has correct structure"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))

        assert 'tweets_change' in data
        assert 'engagement_trend' in data
        assert 'period_days' in data
        assert 'first_period_tweets' in data
        assert 'second_period_tweets' in data

    def test_growth_report_trend_calculation(self, report_gen):
        """Test that trend is calculated correctly"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))

        # Trend should be one of the valid values
        assert data['engagement_trend'] in ['increasing', 'decreasing', 'stable']

        # If we have data, tweets_change should make sense
        if data['first_period_tweets'] > 0 and data['second_period_tweets'] > 0:
            expected_change = data['second_period_tweets'] - data['first_period_tweets']
            assert data['tweets_change'] == expected_change


class TestEmailDelivery:
    """Test email delivery integration"""

    def test_email_report_integration(self, report_gen):
        """Test email delivery integration"""
        from unittest.mock import patch, MagicMock

        # Mock NotificationService at the source module
        with patch('app.services.notification_service.NotificationService') as mock_ns:
            mock_instance = MagicMock()
            mock_instance.send_email.return_value = {'email_id': '12345'}
            mock_ns.return_value = mock_instance

            # Generate and email report
            result = report_gen.generate_and_email_engagement_report(
                user_id=1,
                period='week',
                format='html',
                recipient_email='test@example.com'
            )

            assert result['success'] is True
            assert 'test@example.com' in result['message']
            assert result['email_id'] == '12345'
            mock_instance.send_email.assert_called_once()

    def test_email_growth_report(self, report_gen):
        """Test emailing growth report"""
        from unittest.mock import patch, MagicMock

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            mock_instance = MagicMock()
            mock_instance.send_email.return_value = {'email_id': '67890'}
            mock_ns.return_value = mock_instance

            result = report_gen.generate_and_email_growth_report(
                user_id=1,
                format='json',
                recipient_email='growth@example.com'
            )

            assert result['success'] is True
            assert 'growth@example.com' in result['message']

    def test_email_top_tweets_report(self, report_gen):
        """Test emailing top tweets report"""
        from unittest.mock import patch, MagicMock

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            mock_instance = MagicMock()
            mock_instance.send_email.return_value = {'email_id': 'abc123'}
            mock_ns.return_value = mock_instance

            result = report_gen.generate_and_email_top_tweets_report(
                user_id=1,
                limit=10,
                format='csv',
                recipient_email='tweets@example.com'
            )

            assert result['success'] is True
            assert 'tweets@example.com' in result['message']

    def test_email_report_error_handling(self, report_gen):
        """Test error handling in email delivery"""
        from unittest.mock import patch, MagicMock

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            # Make send_email raise an exception
            mock_instance = MagicMock()
            mock_instance.send_email.side_effect = Exception('SMTP connection failed')
            mock_ns.return_value = mock_instance

            result = report_gen.generate_and_email_engagement_report(
                user_id=1,
                period='week',
                format='html',
                recipient_email='test@example.com'
            )

            assert result['success'] is False
            assert 'error' in result
            assert 'SMTP connection failed' in result['error']
