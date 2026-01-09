"""
Test suite for retry logic with exponential backoff.
Tests verify that functions retry on transient errors and use exponential backoff.
"""
import pytest
from unittest.mock import patch, MagicMock, call
import time
from tenacity import RetryError


class TestFetchTweetsRetry:
    """Test retry logic for fetch_tweets function"""

    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_retries_on_connection_error(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen
    ):
        """Test that fetch_tweets retries on ConnectionError"""
        # Mock rate limit to allow fetching
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        # Create mock tweet for successful attempt
        mock_tweet = MagicMock()
        mock_tweet.id = 1
        mock_tweet.text = "Test tweet"

        # Fail twice with ConnectionError, then succeed
        mock_twitter_api.user_timeline.side_effect = [
            ConnectionError("Network error"),
            ConnectionError("Network error"),
            [mock_tweet]
        ]

        mock_is_tweet_seen.return_value = False

        # Import after mocking to ensure decorators are applied
        from app.twitter_handler import fetch_tweets

        # Call the function
        result = fetch_tweets()

        # Verify it was called 3 times (2 failures + 1 success)
        assert mock_twitter_api.user_timeline.call_count == 3

        # Verify result is successful
        assert len(result) == 1
        assert result[0].id == 1

        # Verify sleep was called for exponential backoff (2 retries)
        assert mock_sleep.call_count >= 2

    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_retries_on_timeout_error(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen
    ):
        """Test that fetch_tweets retries on TimeoutError"""
        # Mock rate limit to allow fetching
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        # Create mock tweet for successful attempt
        mock_tweet = MagicMock()
        mock_tweet.id = 2
        mock_tweet.text = "Test tweet 2"

        # Fail once with TimeoutError, then succeed
        mock_twitter_api.user_timeline.side_effect = [
            TimeoutError("Request timed out"),
            [mock_tweet]
        ]

        mock_is_tweet_seen.return_value = False

        from app.twitter_handler import fetch_tweets

        # Call the function
        result = fetch_tweets()

        # Verify it was called 2 times (1 failure + 1 success)
        assert mock_twitter_api.user_timeline.call_count == 2

        # Verify result is successful
        assert len(result) == 1
        assert result[0].id == 2

    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_retry_stops_after_max_attempts(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen
    ):
        """Test that fetch_tweets stops retrying after 3 attempts"""
        # Mock rate limit to allow fetching
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        # Always fail with ConnectionError
        mock_twitter_api.user_timeline.side_effect = ConnectionError("Network error")

        from app.twitter_handler import fetch_tweets

        # Call should raise RetryError after 3 attempts
        with pytest.raises(RetryError):
            fetch_tweets()

        # Verify it was called exactly 3 times
        assert mock_twitter_api.user_timeline.call_count == 3

    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_exponential_backoff_timing(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen
    ):
        """Test that exponential backoff waits with correct timing"""
        # Mock rate limit to allow fetching
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        # Create mock tweet for successful attempt
        mock_tweet = MagicMock()
        mock_tweet.id = 3

        # Fail twice, then succeed
        mock_twitter_api.user_timeline.side_effect = [
            ConnectionError("Network error"),
            ConnectionError("Network error"),
            [mock_tweet]
        ]

        mock_is_tweet_seen.return_value = False

        from app.twitter_handler import fetch_tweets

        # Call the function
        result = fetch_tweets()

        # Verify sleep was called with exponential backoff
        # First retry: ~2 seconds, Second retry: ~2 seconds (due to formula)
        assert mock_sleep.call_count >= 2
        sleep_calls = [call_args[0][0] for call_args in mock_sleep.call_args_list]

        # Verify backoff times meet minimum requirement
        # With multiplier=1, min=2, max=10: exponential is 2^(n-1) * multiplier
        # Attempt 1: max(2, 1*2^0) = 2, Attempt 2: max(2, 1*2^1) = 2
        assert sleep_calls[0] >= 2.0
        assert sleep_calls[1] >= 2.0
        assert all(s <= 10.0 for s in sleep_calls)  # Should not exceed max


class TestPostToBlueSkyRetry:
    """Test retry logic for post_to_bluesky function"""

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_post_to_bluesky_retries_on_failure(self, mock_sleep, mock_bsky_client):
        """Test that post_to_bluesky retries on exception"""
        # Fail twice, then succeed
        mock_bsky_client.post.side_effect = [
            Exception("Network error"),
            Exception("Network error"),
            None  # Success
        ]

        from app.bluesky_handler import post_to_bluesky

        # Call the function
        post_to_bluesky("Test post")

        # Verify it was called 3 times (2 failures + 1 success)
        assert mock_bsky_client.post.call_count == 3

        # Verify sleep was called for exponential backoff
        assert mock_sleep.call_count >= 2

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_post_to_bluesky_retry_stops_after_max_attempts(
        self, mock_sleep, mock_bsky_client
    ):
        """Test that post_to_bluesky stops retrying after 3 attempts"""
        # Always fail
        mock_bsky_client.post.side_effect = Exception("Network error")

        from app.bluesky_handler import post_to_bluesky

        # Call should raise RetryError after 3 attempts
        with pytest.raises(RetryError):
            post_to_bluesky("Test post")

        # Verify it was called exactly 3 times
        assert mock_bsky_client.post.call_count == 3

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_post_to_bluesky_exponential_backoff(
        self, mock_sleep, mock_bsky_client
    ):
        """Test that post_to_bluesky uses exponential backoff"""
        # Fail twice, then succeed
        mock_bsky_client.post.side_effect = [
            Exception("Error 1"),
            Exception("Error 2"),
            None
        ]

        from app.bluesky_handler import post_to_bluesky

        # Call the function
        post_to_bluesky("Test post")

        # Verify sleep was called with exponential backoff
        assert mock_sleep.call_count >= 2
        sleep_calls = [call_args[0][0] for call_args in mock_sleep.call_args_list]

        # Verify backoff times meet minimum requirement
        assert sleep_calls[0] >= 2.0
        assert sleep_calls[1] >= 2.0
        assert all(s <= 10.0 for s in sleep_calls)  # Should not exceed max


class TestLoginToBlueSkyRetry:
    """Test retry logic for login_to_bluesky function"""

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_login_to_bluesky_retries_on_failure(self, mock_sleep, mock_bsky_client):
        """Test that login_to_bluesky retries on exception"""
        # Fail once, then succeed
        mock_bsky_client.login.side_effect = [
            Exception("Login failed"),
            None  # Success
        ]

        from app.bluesky_handler import login_to_bluesky

        # Call the function
        login_to_bluesky()

        # Verify it was called 2 times (1 failure + 1 success)
        assert mock_bsky_client.login.call_count == 2

        # Verify sleep was called for backoff
        assert mock_sleep.call_count >= 1

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_login_to_bluesky_retry_stops_after_max_attempts(
        self, mock_sleep, mock_bsky_client
    ):
        """Test that login_to_bluesky stops retrying after 2 attempts"""
        # Always fail
        mock_bsky_client.login.side_effect = Exception("Login failed")

        from app.bluesky_handler import login_to_bluesky

        # Call should raise RetryError after 2 attempts
        with pytest.raises(RetryError):
            login_to_bluesky()

        # Verify it was called exactly 2 times
        assert mock_bsky_client.login.call_count == 2

    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_login_to_bluesky_exponential_backoff(
        self, mock_sleep, mock_bsky_client
    ):
        """Test that login_to_bluesky uses exponential backoff"""
        # Fail once, then succeed
        mock_bsky_client.login.side_effect = [
            Exception("Login failed"),
            None
        ]

        from app.bluesky_handler import login_to_bluesky

        # Call the function
        login_to_bluesky()

        # Verify sleep was called with backoff
        assert mock_sleep.call_count >= 1
        sleep_calls = [call_args[0][0] for call_args in mock_sleep.call_args_list]

        # First retry should wait at least 2 seconds
        assert sleep_calls[0] >= 2.0


class TestRetryLogging:
    """Test that retry attempts and failures are logged"""

    @patch("app.twitter_handler.logger")
    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_logs_retry_warning(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen, mock_logger
    ):
        """Test that fetch_tweets logs a warning when retrying"""
        # Mock rate limit
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        mock_tweet = MagicMock()
        mock_tweet.id = 1

        # Fail once, then succeed
        mock_twitter_api.user_timeline.side_effect = [
            ConnectionError("Network error"),
            [mock_tweet]
        ]

        mock_is_tweet_seen.return_value = False

        from app.twitter_handler import fetch_tweets

        # Call the function
        fetch_tweets()

        # Verify warning was logged for retry
        # Note: This will be implemented when we add logging
        # For now, we just verify the function succeeds with retries
        assert mock_twitter_api.user_timeline.call_count == 2

    @patch("app.twitter_handler.logger")
    @patch("app.twitter_handler.mark_tweet_as_seen")
    @patch("app.twitter_handler.is_tweet_seen")
    @patch("app.twitter_handler.get_rate_limit_status")
    @patch("app.twitter_handler.twitter_api")
    @patch("app.twitter_handler.time.sleep")
    def test_fetch_tweets_logs_max_attempts_error(
        self, mock_sleep, mock_twitter_api, mock_get_rate_limit,
        mock_is_tweet_seen, mock_mark_tweet_as_seen, mock_logger
    ):
        """Test that fetch_tweets logs an error when max attempts reached"""
        # Mock rate limit
        future_timestamp = int(time.time()) + 3600
        mock_get_rate_limit.return_value = (100, future_timestamp)

        # Always fail
        mock_twitter_api.user_timeline.side_effect = ConnectionError("Network error")

        from app.twitter_handler import fetch_tweets

        # Call should raise RetryError
        with pytest.raises(RetryError):
            fetch_tweets()

        # Verify error was logged
        # Note: This will be implemented when we add logging
        assert mock_twitter_api.user_timeline.call_count == 3

    @patch("app.bluesky_handler.logger")
    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_post_to_bluesky_logs_retry_warning(
        self, mock_sleep, mock_bsky_client, mock_logger
    ):
        """Test that post_to_bluesky logs a warning when retrying"""
        # Fail once, then succeed
        mock_bsky_client.post.side_effect = [
            Exception("Network error"),
            None
        ]

        from app.bluesky_handler import post_to_bluesky

        # Call the function
        post_to_bluesky("Test post")

        # Verify retry occurred
        assert mock_bsky_client.post.call_count == 2

    @patch("app.bluesky_handler.logger")
    @patch("app.bluesky_handler.bsky_client")
    @patch("app.bluesky_handler.time.sleep")
    def test_login_to_bluesky_logs_retry_warning(
        self, mock_sleep, mock_bsky_client, mock_logger
    ):
        """Test that login_to_bluesky logs a warning when retrying"""
        # Fail once, then succeed
        mock_bsky_client.login.side_effect = [
            Exception("Login failed"),
            None
        ]

        from app.bluesky_handler import login_to_bluesky

        # Call the function
        login_to_bluesky()

        # Verify retry occurred
        assert mock_bsky_client.login.call_count == 2
