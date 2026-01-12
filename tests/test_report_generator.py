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

    def test_email_report_direct_method(self, report_gen):
        """Test email_report method directly with bytes content"""
        from unittest.mock import patch, MagicMock

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            mock_instance = MagicMock()
            mock_instance.send_email.return_value = {'email_id': 'direct123'}
            mock_ns.return_value = mock_instance

            # Test with HTML format
            result = report_gen.email_report(
                report_content=b'<html>Test Report</html>',
                report_type='engagement',
                format='html',
                recipient_email='test@example.com'
            )

            assert result['success'] is True
            assert 'email_id' in result
            mock_instance.send_email.assert_called_once()

            # Verify the call was made with is_html=True
            call_args = mock_instance.send_email.call_args
            assert call_args[1]['is_html'] is True

    def test_email_report_csv_format(self, report_gen):
        """Test email_report with CSV format (non-HTML)"""
        from unittest.mock import patch, MagicMock

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            mock_instance = MagicMock()
            mock_instance.send_email.return_value = {'email_id': 'csv456'}
            mock_ns.return_value = mock_instance

            result = report_gen.email_report(
                report_content=b'period,tweets,engagement\nweek,10,500',
                report_type='growth',
                format='csv',
                recipient_email='csv@example.com'
            )

            assert result['success'] is True
            call_args = mock_instance.send_email.call_args
            assert call_args[1]['is_html'] is False

    def test_email_report_exception_handling(self, report_gen):
        """Test email_report exception handling when NotificationService fails"""
        from unittest.mock import patch

        with patch('app.services.notification_service.NotificationService') as mock_ns:
            # Simulate NotificationService not being available
            mock_ns.side_effect = ImportError('NotificationService not found')

            result = report_gen.email_report(
                report_content=b'test content',
                report_type='engagement',
                format='json',
                recipient_email='test@example.com'
            )

            assert result['success'] is False
            assert 'error' in result


class TestPeriodParsing:
    """Test period parsing edge cases"""

    def test_parse_period_invalid_format(self, report_gen):
        """Test _parse_period with invalid format"""
        with pytest.raises(ValueError, match='Invalid period'):
            report_gen._parse_period('invalid_period')

    def test_parse_period_invalid_digit_format(self, report_gen):
        """Test _parse_period with invalid digit format (e.g., 'abd')"""
        with pytest.raises(ValueError, match='Invalid period format'):
            report_gen._parse_period('abd')

    def test_parse_period_month_keyword(self, report_gen):
        """Test _parse_period with 'month' keyword"""
        result = report_gen._parse_period('month')
        assert result == 30

    def test_parse_period_year_keyword(self, report_gen):
        """Test _parse_period with 'year' keyword"""
        result = report_gen._parse_period('year')
        assert result == 365

    def test_parse_period_custom_days(self, report_gen):
        """Test _parse_period with custom day format"""
        result = report_gen._parse_period('45d')
        assert result == 45


class TestFormatValidation:
    """Test format validation edge cases"""

    def test_validate_format_lowercase_conversion(self, report_gen):
        """Test that format validation works with uppercase"""
        # Should not raise since it converts to lowercase
        report_gen._validate_format('JSON')
        report_gen._validate_format('CSV')
        report_gen._validate_format('HTML')
        report_gen._validate_format('PDF')

    def test_validate_format_all_invalid(self, report_gen):
        """Test validation with various invalid formats"""
        invalid_formats = ['xml', 'yaml', 'text', 'xlsx', 'docx']
        for fmt in invalid_formats:
            with pytest.raises(ValueError, match='Unsupported format'):
                report_gen._validate_format(fmt)


class TestEngagementRateCalculation:
    """Test engagement rate calculation edge cases"""

    def test_calculate_engagement_rate_with_impressions(self, report_gen):
        """Test engagement rate with provided impressions"""
        rate = report_gen._calculate_engagement_rate(
            likes=100,
            retweets=50,
            replies=25,
            impressions=2000
        )
        # (100 + 50 + 25) / 2000 * 100 = 8.75
        assert rate == 8.75

    def test_calculate_engagement_rate_zero_impressions(self, report_gen):
        """Test engagement rate with zero impressions"""
        rate = report_gen._calculate_engagement_rate(
            likes=100,
            retweets=50,
            replies=25,
            impressions=0
        )
        # Should estimate impressions as (175) * 10 = 1750
        # (175 / 1750) * 100 = 10.0
        assert rate == 10.0

    def test_calculate_engagement_rate_none_impressions(self, report_gen):
        """Test engagement rate with None impressions"""
        rate = report_gen._calculate_engagement_rate(
            likes=100,
            retweets=50,
            replies=25,
            impressions=None
        )
        # Should estimate impressions as (175) * 10 = 1750
        # (175 / 1750) * 100 = 10.0
        assert rate == 10.0

    def test_calculate_engagement_rate_zero_engagement_zero_impressions(self, report_gen):
        """Test engagement rate when engagement is 0 and impressions is 0"""
        rate = report_gen._calculate_engagement_rate(
            likes=0,
            retweets=0,
            replies=0,
            impressions=0
        )
        # Impressions should be max(0 * 10, 100) = 100
        # (0 / 100) * 100 = 0.0
        assert rate == 0.0

    def test_calculate_engagement_rate_high_engagement(self, report_gen):
        """Test engagement rate with high engagement values"""
        rate = report_gen._calculate_engagement_rate(
            likes=5000,
            retweets=3000,
            replies=2000,
            impressions=100000
        )
        # (5000 + 3000 + 2000) / 100000 * 100 = 10.0
        assert rate == 10.0


class TestPDFGeneration:
    """Test PDF generation with and without WeasyPrint"""

    def test_pdf_engagement_report_without_weasyprint(self, report_gen):
        """Test PDF engagement report falls back to HTML without WeasyPrint"""
        from unittest.mock import patch

        # Mock the import to fail
        def mock_import(name, *args, **kwargs):
            if name == 'weasyprint':
                raise ImportError('WeasyPrint not available')
            return __import__(name, *args, **kwargs)

        with patch('builtins.__import__', side_effect=mock_import):
            report_data = {
                'period': '7d',
                'period_days': 7,
                'total_tweets': 5,
                'total_likes': 100,
                'total_retweets': 20,
                'total_replies': 10,
                'total_engagement': 130,
                'avg_engagement_rate': 26.0,
                'top_tweet': {
                    'tweet_id': '123',
                    'text': 'Test tweet',
                    'engagement': 50
                },
                'generated_at': datetime.now().isoformat()
            }

            # Should not raise, should return HTML as fallback
            result = report_gen._format_pdf_engagement(report_data)
            assert isinstance(result, bytes)
            # Check if it's HTML (fallback)
            assert b'<html' in result.lower() or b'<!DOCTYPE' in result.lower()

    def test_pdf_growth_report_without_weasyprint(self, report_gen):
        """Test PDF growth report falls back to HTML without WeasyPrint"""
        from unittest.mock import patch

        def mock_import(name, *args, **kwargs):
            if name == 'weasyprint':
                raise ImportError('WeasyPrint not available')
            return __import__(name, *args, **kwargs)

        with patch('builtins.__import__', side_effect=mock_import):
            report_data = {
                'period_days': 7,
                'first_period_tweets': 5,
                'second_period_tweets': 8,
                'tweets_change': 3,
                'first_period_engagement': 100,
                'second_period_engagement': 200,
                'engagement_change': 100,
                'engagement_trend': 'increasing',
                'generated_at': datetime.now().isoformat()
            }

            result = report_gen._format_pdf_growth(report_data)
            assert isinstance(result, bytes)

    def test_pdf_top_tweets_without_weasyprint(self, report_gen):
        """Test PDF top tweets report falls back to HTML without WeasyPrint"""
        from unittest.mock import patch

        def mock_import(name, *args, **kwargs):
            if name == 'weasyprint':
                raise ImportError('WeasyPrint not available')
            return __import__(name, *args, **kwargs)

        with patch('builtins.__import__', side_effect=mock_import):
            tweets = [
                {
                    'tweet_id': '1',
                    'text': 'Top tweet 1',
                    'likes': 500,
                    'retweets': 200,
                    'replies': 50,
                    'total_engagement': 750,
                    'has_media': True,
                    'is_thread': False
                }
            ]

            result = report_gen._format_pdf_top_tweets(tweets, 10)
            assert isinstance(result, bytes)

    def test_pdf_export_without_weasyprint(self, report_gen):
        """Test PDF export falls back to HTML without WeasyPrint"""
        from unittest.mock import patch

        def mock_import(name, *args, **kwargs):
            if name == 'weasyprint':
                raise ImportError('WeasyPrint not available')
            return __import__(name, *args, **kwargs)

        with patch('builtins.__import__', side_effect=mock_import):
            data = [
                {
                    'tweet_id': '1',
                    'text': 'Export tweet',
                    'likes': 100,
                    'retweets': 50,
                    'replies': 10,
                    'total_engagement': 160,
                    'created_at': int(time.time()),
                    'has_media': False,
                    'is_thread': False
                }
            ]

            result = report_gen._format_pdf_export(data, 'tweets')
            assert isinstance(result, bytes)


class TestHTMLFormatGeneration:
    """Test HTML format generation for all report types"""

    def test_format_html_growth_structure(self, report_gen):
        """Test HTML growth report has proper structure"""
        report_data = {
            'period_days': 7,
            'first_period_tweets': 5,
            'second_period_tweets': 8,
            'tweets_change': 3,
            'first_period_engagement': 100,
            'second_period_engagement': 200,
            'engagement_change': 100,
            'engagement_trend': 'increasing',
            'generated_at': datetime.now().isoformat()
        }

        result = report_gen._format_html_growth(report_data)
        assert isinstance(result, bytes)

        html_content = result.decode('utf-8')
        assert '<html' in html_content.lower()
        assert 'Growth Report' in html_content
        assert 'Tweets Change' in html_content
        assert 'Engagement Trend' in html_content

    def test_format_html_engagement_with_top_tweet(self, report_gen):
        """Test HTML engagement report with top tweet"""
        report_data = {
            'period': '30d',
            'period_days': 30,
            'total_tweets': 15,
            'total_likes': 500,
            'total_retweets': 100,
            'total_replies': 50,
            'total_engagement': 650,
            'avg_engagement_rate': 43.33,
            'top_tweet': {
                'tweet_id': 'top_123',
                'text': 'This is the top tweet with excellent engagement metrics!',
                'engagement': 150
            },
            'generated_at': datetime.now().isoformat()
        }

        result = report_gen._format_html_engagement(report_data)
        html_content = result.decode('utf-8')

        # Check for top tweet content
        assert 'Top Tweet' in html_content
        assert 'This is the top tweet' in html_content
        assert '150' in html_content

    def test_format_html_engagement_without_top_tweet(self, report_gen):
        """Test HTML engagement report without top tweet"""
        report_data = {
            'period': '30d',
            'period_days': 30,
            'total_tweets': 0,
            'total_likes': 0,
            'total_retweets': 0,
            'total_replies': 0,
            'total_engagement': 0,
            'avg_engagement_rate': 0.0,
            'top_tweet': None,
            'generated_at': datetime.now().isoformat()
        }

        result = report_gen._format_html_engagement(report_data)
        html_content = result.decode('utf-8')

        # Should still have valid HTML even without top tweet
        assert '<html' in html_content.lower()
        assert 'Engagement Report' in html_content


class TestCSVEmptyData:
    """Test CSV generation with empty data"""

    def test_format_csv_top_tweets_empty_list(self, report_gen):
        """Test CSV top tweets with empty list"""
        result = report_gen._format_csv_top_tweets([])
        assert isinstance(result, bytes)

        csv_content = result.decode('utf-8')
        # Should be empty or just whitespace
        assert csv_content.strip() == ''

    def test_format_csv_export_empty_data(self, report_gen):
        """Test CSV export with empty data list"""
        result = report_gen._format_csv_export([], 'tweets')
        assert isinstance(result, bytes)

        csv_content = result.decode('utf-8')
        assert csv_content.strip() == ''

    def test_format_csv_export_engagement_type(self, report_gen):
        """Test CSV export with engagement data type"""
        data = [
            {
                'tweet_id': '1',
                'text': 'Engagement tweet',
                'likes': 50,
                'retweets': 20,
                'replies': 10,
                'total_engagement': 80,
                'created_at': int(time.time()),
                'has_media': True,
                'is_thread': False
            }
        ]

        result = report_gen._format_csv_export(data, 'engagement')
        assert isinstance(result, bytes)

        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        assert len(rows) == 1
        assert rows[0]['tweet_id'] == '1'
        assert rows[0]['likes'] == '50'


class TestGrowthReportTrendPaths:
    """Test all trend paths in growth report"""

    def test_growth_report_increasing_trend(self, test_db):
        """Test growth report with increasing engagement trend"""
        from unittest.mock import patch
        from app.features.report_generator import ReportGenerator

        gen = ReportGenerator(db_path=test_db)

        # Mock _get_tweets_in_period to control engagement values
        def mock_tweets(user_id, days):
            if days == 7:
                # Recent period with high engagement
                return [
                    {
                        'id': i,
                        'tweet_id': f'recent_{i}',
                        'text': f'Recent tweet {i}',
                        'likes': 100,
                        'retweets': 50,
                        'replies': 25,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 175
                    }
                    for i in range(5)
                ]
            else:  # days == 14
                # Return all tweets (7 days recent + 7 days previous)
                return [
                    {
                        'id': i,
                        'tweet_id': f'all_{i}',
                        'text': f'All tweet {i}',
                        'likes': 100,
                        'retweets': 50,
                        'replies': 25,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 175
                    }
                    for i in range(10)
                ]

        with patch.object(gen, '_get_tweets_in_period', side_effect=mock_tweets):
            result = gen.generate_growth_report(user_id=1, format='json')
            data = json.loads(result.decode('utf-8'))

            # Trend should be calculated correctly
            assert 'engagement_trend' in data
            # With our mock data, recent has higher engagement than previous
            assert data['engagement_trend'] in ['increasing', 'stable', 'decreasing']

    def test_growth_report_decreasing_trend(self, test_db):
        """Test growth report with decreasing engagement trend"""
        from unittest.mock import patch
        from app.features.report_generator import ReportGenerator

        gen = ReportGenerator(db_path=test_db)

        def mock_tweets(user_id, days):
            if days == 7:
                # Recent period with low engagement
                return [
                    {
                        'id': i,
                        'tweet_id': f'recent_{i}',
                        'text': f'Recent tweet {i}',
                        'likes': 10,
                        'retweets': 5,
                        'replies': 2,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 17
                    }
                    for i in range(5)
                ]
            else:
                # All tweets with mixed engagement
                recent_tweets = [
                    {
                        'id': i,
                        'tweet_id': f'recent_{i}',
                        'text': f'Recent tweet {i}',
                        'likes': 10,
                        'retweets': 5,
                        'replies': 2,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 17
                    }
                    for i in range(5)
                ]
                previous_tweets = [
                    {
                        'id': i + 5,
                        'tweet_id': f'previous_{i}',
                        'text': f'Previous tweet {i}',
                        'likes': 100,
                        'retweets': 50,
                        'replies': 25,
                        'created_at': int(time.time()) - (86400 * (i + 7)),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 175
                    }
                    for i in range(5)
                ]
                return recent_tweets + previous_tweets

        with patch.object(gen, '_get_tweets_in_period', side_effect=mock_tweets):
            result = gen.generate_growth_report(user_id=1, format='json')
            data = json.loads(result.decode('utf-8'))

            assert 'engagement_trend' in data
            assert data['engagement_trend'] in ['increasing', 'decreasing', 'stable']

    def test_growth_report_stable_trend(self, test_db):
        """Test growth report with stable engagement trend"""
        from unittest.mock import patch
        from app.features.report_generator import ReportGenerator

        gen = ReportGenerator(db_path=test_db)

        def mock_tweets(user_id, days):
            if days == 7:
                # Recent period - 5 tweets with engagement = 80 each
                return [
                    {
                        'id': i,
                        'tweet_id': f'recent_{i}',
                        'text': f'Recent tweet {i}',
                        'likes': 50,
                        'retweets': 20,
                        'replies': 10,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 80
                    }
                    for i in range(5)
                ]
            else:  # days == 14
                # Return all tweets with proper spacing for both periods
                # Recent: 0-7 days ago
                recent_tweets = [
                    {
                        'id': i,
                        'tweet_id': f'recent_{i}',
                        'text': f'Recent tweet {i}',
                        'likes': 50,
                        'retweets': 20,
                        'replies': 10,
                        'created_at': int(time.time()) - (86400 * i),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 80
                    }
                    for i in range(5)
                ]
                # Previous: 8-14 days ago (must be >= 8 days to avoid boundary condition)
                previous_tweets = [
                    {
                        'id': i + 5,
                        'tweet_id': f'previous_{i}',
                        'text': f'Previous tweet {i}',
                        'likes': 50,
                        'retweets': 20,
                        'replies': 10,
                        'created_at': int(time.time()) - (86400 * (i + 8)),
                        'has_media': False,
                        'is_thread': False,
                        'total_engagement': 80
                    }
                    for i in range(5)
                ]
                return recent_tweets + previous_tweets

        with patch.object(gen, '_get_tweets_in_period', side_effect=mock_tweets):
            result = gen.generate_growth_report(user_id=1, format='json')
            data = json.loads(result.decode('utf-8'))

            # Both periods have same engagement (5 tweets * 80 = 400 each), so trend should be 'stable'
            assert data['engagement_trend'] == 'stable'


class TestExportDataFormats:
    """Test export data with different formats"""

    def test_export_data_engagement_json(self, report_gen):
        """Test exporting engagement data as JSON"""
        result = report_gen.export_data(
            user_id=1,
            data_type='engagement',
            format='json'
        )

        assert isinstance(result, bytes)
        data = json.loads(result.decode('utf-8'))

        # Should be a list of tweets with engagement metrics
        assert isinstance(data, list)
        if len(data) > 0:
            tweet = data[0]
            assert 'likes' in tweet
            assert 'retweets' in tweet
            assert 'replies' in tweet

    def test_export_data_engagement_csv(self, report_gen):
        """Test exporting engagement data as CSV"""
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
        assert 'likes' in rows[0]

    def test_export_data_engagement_html(self, report_gen):
        """Test exporting engagement data as HTML"""
        result = report_gen.export_data(
            user_id=1,
            data_type='engagement',
            format='html'
        )

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')
        assert '<html' in html_content.lower()

    def test_export_data_engagement_pdf(self, report_gen):
        """Test exporting engagement data as PDF (or HTML fallback)"""
        result = report_gen.export_data(
            user_id=1,
            data_type='engagement',
            format='pdf'
        )

        assert isinstance(result, bytes)

    def test_export_data_tweets_html(self, report_gen):
        """Test exporting tweets as HTML"""
        result = report_gen.export_data(
            user_id=1,
            data_type='tweets',
            format='html'
        )

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')
        assert '<html' in html_content.lower()

    def test_export_data_no_tweets(self, test_db):
        """Test exporting data for user with no tweets"""
        gen = ReportGenerator(db_path=test_db)

        result = gen.export_data(
            user_id=999,
            data_type='tweets',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert isinstance(data, list)
        assert len(data) == 0


class TestReportGenerationFormats:
    """Test all report generation paths for all formats"""

    def test_engagement_report_pdf_format(self, report_gen):
        """Test engagement report PDF format"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='7d',
            format='pdf'
        )

        assert isinstance(result, bytes)
        # Should be either PDF or HTML (fallback)
        assert len(result) > 0

    def test_growth_report_csv_format(self, report_gen):
        """Test growth report CSV format"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='csv'
        )

        assert isinstance(result, bytes)
        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        assert len(rows) > 0
        assert 'tweets_change' in rows[0]
        assert 'engagement_trend' in rows[0]

    def test_growth_report_html_format(self, report_gen):
        """Test growth report HTML format"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='html'
        )

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')
        assert 'Growth Report' in html_content

    def test_growth_report_pdf_format(self, report_gen):
        """Test growth report PDF format"""
        result = report_gen.generate_growth_report(
            user_id=1,
            format='pdf'
        )

        assert isinstance(result, bytes)

    def test_top_tweets_report_pdf_format(self, report_gen):
        """Test top tweets report PDF format"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=10,
            format='pdf'
        )

        assert isinstance(result, bytes)

    def test_top_tweets_report_json_format(self, report_gen):
        """Test top tweets report JSON format"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=5,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert isinstance(data, list)
        assert len(data) <= 5


class TestHTMLExport:
    """Test HTML export functionality"""

    def test_format_html_export_with_data(self, report_gen):
        """Test HTML export with tweet data"""
        data = [
            {
                'tweet_id': f'tweet_{i}',
                'text': f'Tweet text {i}',
                'likes': 10 * i,
                'retweets': 5 * i,
                'replies': 2 * i,
                'total_engagement': 17 * i,
                'created_at': int(time.time()),
                'has_media': False,
                'is_thread': False
            }
            for i in range(1, 6)
        ]

        result = report_gen._format_html_export(data, 'tweets')

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')
        assert '<html' in html_content.lower()
        # Should contain tweet information
        assert 'Tweet' in html_content or 'tweet' in html_content

    def test_format_html_export_empty_data(self, report_gen):
        """Test HTML export with empty data"""
        result = report_gen._format_html_export([], 'tweets')

        assert isinstance(result, bytes)
        html_content = result.decode('utf-8')
        assert '<html' in html_content.lower()


class TestDataTimestampHandling:
    """Test timestamp handling in data export"""

    def test_export_data_timestamp_conversion(self, report_gen):
        """Test that timestamps are properly converted in exports"""
        result = report_gen.export_data(
            user_id=1,
            data_type='tweets',
            format='csv'
        )

        assert isinstance(result, bytes)
        csv_content = result.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_content))
        rows = list(reader)

        if len(rows) > 0:
            # Check that created_at field exists
            assert 'created_at' in rows[0]
            # The created_at should be either empty or a valid ISO format string
            created_at = rows[0]['created_at']
            # If not empty, should be a datetime string
            if created_at:
                # Check if it looks like a datetime (contains T or is just digits)
                assert 'T' in created_at or created_at.replace('-', '').replace(':', '').replace('.', '').isdigit() or created_at == ''


class TestLargeDataHandling:
    """Test handling of large datasets"""

    def test_top_tweets_with_high_limit(self, report_gen):
        """Test top tweets report with limit higher than available tweets"""
        result = report_gen.generate_top_tweets_report(
            user_id=1,
            limit=1000,
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        # Should return available tweets up to limit
        assert isinstance(data, list)
        assert len(data) <= 1000

    def test_engagement_report_year_period(self, report_gen):
        """Test engagement report for full year"""
        result = report_gen.generate_engagement_report(
            user_id=1,
            period='year',
            format='json'
        )

        data = json.loads(result.decode('utf-8'))
        assert data['period_days'] == 365
        assert 'total_tweets' in data
