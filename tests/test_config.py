import unittest
from app.config import POLL_INTERVAL


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


if __name__ == '__main__':
    unittest.main()
