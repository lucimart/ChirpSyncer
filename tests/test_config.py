import unittest
from unittest.mock import patch
import os
from app.core.config import POLL_INTERVAL


class TestConfig(unittest.TestCase):
    """Tests for configuration values"""

    def test_poll_interval_respects_twitter_rate_limit(self):
        """
        Test that POLL_INTERVAL is set to respect Twitter API rate limit of 100 requests/month.

        Calculation:
        - 30 days/month * 24 hours/day = 720 hours/month
        - 720 hours / POLL_INTERVAL (in hours) = requests/month
        - requests/month must be <= 100
        """
        # Convert POLL_INTERVAL from seconds to hours
        poll_interval_hours = POLL_INTERVAL / 3600

        # Calculate requests per month (30 days)
        hours_per_month = 30 * 24  # 720 hours
        requests_per_month = hours_per_month / poll_interval_hours

        # Twitter API limit is 100 requests per month
        TWITTER_RATE_LIMIT = 100

        self.assertLessEqual(
            requests_per_month,
            TWITTER_RATE_LIMIT,
            f"POLL_INTERVAL of {poll_interval_hours} hours results in {requests_per_month:.2f} "
            f"requests/month, which exceeds Twitter's {TWITTER_RATE_LIMIT} requests/month limit. "
            f"Minimum interval should be {hours_per_month / TWITTER_RATE_LIMIT} hours."
        )

    def test_poll_interval_is_positive(self):
        """Test that POLL_INTERVAL is a positive value"""
        self.assertGreater(POLL_INTERVAL, 0, "POLL_INTERVAL must be positive")


class TestTwitterScrapingCredentials(unittest.TestCase):
    """Tests for Twitter scraping credentials (twscrape)"""

    def test_twitter_username_loaded(self):
        """Test that TWITTER_USERNAME is loaded from environment variable"""
        with patch.dict(os.environ, {'TWITTER_USERNAME': 'test_twitter_user'}):
            # Reimport config to pick up the environment variable
            import importlib
            from app.core import config
            importlib.reload(config)
            self.assertEqual(config.TWITTER_USERNAME, 'test_twitter_user')

    def test_twitter_password_loaded(self):
        """Test that TWITTER_PASSWORD is loaded from environment variable"""
        with patch.dict(os.environ, {'TWITTER_PASSWORD': 'test_twitter_pass'}):
            import importlib
            from app.core import config
            importlib.reload(config)
            self.assertEqual(config.TWITTER_PASSWORD, 'test_twitter_pass')

    def test_twitter_email_loaded(self):
        """Test that TWITTER_EMAIL is loaded from environment variable"""
        with patch.dict(os.environ, {'TWITTER_EMAIL': 'test@example.com'}):
            import importlib
            from app.core import config
            importlib.reload(config)
            self.assertEqual(config.TWITTER_EMAIL, 'test@example.com')

    def test_twitter_email_password_loaded(self):
        """Test that TWITTER_EMAIL_PASSWORD is loaded from environment variable"""
        with patch.dict(os.environ, {'TWITTER_EMAIL_PASSWORD': 'test_email_pass'}):
            import importlib
            from app.core import config
            importlib.reload(config)
            self.assertEqual(config.TWITTER_EMAIL_PASSWORD, 'test_email_pass')


if __name__ == '__main__':
    unittest.main()
