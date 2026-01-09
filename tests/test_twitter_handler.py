from app.twitter_handler import fetch_tweets, get_rate_limit_status
import pytest
from unittest.mock import patch, MagicMock
import time
import tweepy
from tweepy import TooManyRequests, Unauthorized


@patch("app.twitter_handler.mark_tweet_as_seen")
@patch("app.twitter_handler.is_tweet_seen")
@patch("app.twitter_handler.get_rate_limit_status")
@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_fetch_tweets(mock_auth, mock_twitter_api, mock_get_rate_limit,
                     mock_is_tweet_seen, mock_mark_tweet_as_seen):
    """Test fetching tweets with proper mocking of all dependencies"""
    # Setup mocks
    mock_auth.return_value = MagicMock()

    # Mock rate limit status to allow fetching (100 remaining, reset in future)
    future_timestamp = int(time.time()) + 3600
    mock_get_rate_limit.return_value = (100, future_timestamp)

    # Create mock tweet objects with id attribute
    mock_tweet1 = MagicMock()
    mock_tweet1.id = 1
    mock_tweet1.text = "Hello, world!"

    mock_tweet2 = MagicMock()
    mock_tweet2.id = 2
    mock_tweet2.text = "Second tweet"

    mock_tweet3 = MagicMock()
    mock_tweet3.id = 3
    mock_tweet3.text = "Third tweet"

    # Mock API to return 3 tweets
    mock_twitter_api.user_timeline.return_value = [mock_tweet1, mock_tweet2, mock_tweet3]

    # Mock is_tweet_seen: tweet 2 is already seen, others are new
    mock_is_tweet_seen.side_effect = lambda tweet_id: tweet_id == 2

    # Call the function
    result = fetch_tweets()

    # Assertions
    # 1. Rate limit should be checked
    mock_get_rate_limit.assert_called_once()

    # 2. API should be called with correct parameters
    mock_twitter_api.user_timeline.assert_called_once_with(
        count=5, exclude_replies=True, include_rts=False
    )

    # 3. is_tweet_seen should be called for each tweet
    assert mock_is_tweet_seen.call_count == 3
    mock_is_tweet_seen.assert_any_call(1)
    mock_is_tweet_seen.assert_any_call(2)
    mock_is_tweet_seen.assert_any_call(3)

    # 4. mark_tweet_as_seen should only be called for unseen tweets (1 and 3, not 2)
    assert mock_mark_tweet_as_seen.call_count == 2
    mock_mark_tweet_as_seen.assert_any_call(1)
    mock_mark_tweet_as_seen.assert_any_call(3)

    # 5. Result should contain only unseen tweets (tweets 1 and 3)
    assert len(result) == 2
    assert result[0].id == 1
    assert result[0].text == "Hello, world!"
    assert result[1].id == 3
    assert result[1].text == "Third tweet"


@patch("app.twitter_handler.time.sleep")
@patch("app.twitter_handler.time.time")
@patch("app.twitter_handler.mark_tweet_as_seen")
@patch("app.twitter_handler.is_tweet_seen")
@patch("app.twitter_handler.get_rate_limit_status")
@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_fetch_tweets_with_rate_limit(mock_auth, mock_twitter_api,
                                      mock_get_rate_limit, mock_is_tweet_seen,
                                      mock_mark_tweet_as_seen, mock_time, mock_sleep):
    """Test that fetch_tweets returns empty list when rate limit is reached"""
    # Setup mocks
    mock_auth.return_value = MagicMock()
    mock_time.return_value = 1000  # Current time

    # Mock rate limit status: 0 remaining requests
    reset_timestamp = 1900  # Reset in 900 seconds (1900 - 1000)
    mock_get_rate_limit.return_value = (0, reset_timestamp)

    # Call the function
    result = fetch_tweets()

    # Assertions
    # 1. Rate limit should be checked
    mock_get_rate_limit.assert_called_once()

    # 2. Should sleep until reset time
    mock_sleep.assert_called_once_with(900)

    # 3. API should NOT be called when rate limit is reached
    mock_twitter_api.user_timeline.assert_not_called()

    # 4. Database functions should NOT be called
    mock_is_tweet_seen.assert_not_called()
    mock_mark_tweet_as_seen.assert_not_called()

    # 5. Result should be empty list
    assert result == []
    assert len(result) == 0


@patch("app.twitter_handler.store_api_rate_limit")
@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_get_rate_limit_status(mock_auth, mock_twitter_api, mock_store_rate_limit):
    """Test that get_rate_limit_status correctly extracts and stores rate limit info"""
    # Setup mocks
    mock_auth.return_value = MagicMock()

    # Mock the rate_limit_status response structure
    mock_rate_limit_response = {
        'resources': {
            'statuses': {
                '/statuses/user_timeline': {
                    'remaining': 75,
                    'reset': 1704729600
                }
            }
        }
    }
    mock_twitter_api.rate_limit_status.return_value = mock_rate_limit_response

    # Call the function
    remaining, reset = get_rate_limit_status()

    # Assertions
    # 1. API should be called to get rate limit status
    mock_twitter_api.rate_limit_status.assert_called_once()

    # 2. store_api_rate_limit should be called with correct values
    mock_store_rate_limit.assert_called_once_with(75, 1704729600)

    # 3. Function should return correct values
    assert remaining == 75
    assert reset == 1704729600


@patch("app.twitter_handler.mark_tweet_as_seen")
@patch("app.twitter_handler.is_tweet_seen")
@patch("app.twitter_handler.get_rate_limit_status")
@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_fetch_tweets_all_seen(mock_auth, mock_twitter_api,
                               mock_get_rate_limit, mock_is_tweet_seen,
                               mock_mark_tweet_as_seen):
    """Test fetch_tweets when all tweets have already been seen"""
    # Setup mocks
    mock_auth.return_value = MagicMock()

    # Mock rate limit status to allow fetching
    future_timestamp = int(time.time()) + 3600
    mock_get_rate_limit.return_value = (100, future_timestamp)

    # Create mock tweet objects
    mock_tweet1 = MagicMock()
    mock_tweet1.id = 100
    mock_tweet1.text = "Old tweet 1"

    mock_tweet2 = MagicMock()
    mock_tweet2.id = 101
    mock_tweet2.text = "Old tweet 2"

    mock_twitter_api.user_timeline.return_value = [mock_tweet1, mock_tweet2]

    # Mock: all tweets are already seen
    mock_is_tweet_seen.return_value = True

    # Call the function
    result = fetch_tweets()

    # Assertions
    # 1. API should be called
    mock_twitter_api.user_timeline.assert_called_once()

    # 2. is_tweet_seen should be called for each tweet
    assert mock_is_tweet_seen.call_count == 2

    # 3. mark_tweet_as_seen should NOT be called (all tweets already seen)
    mock_mark_tweet_as_seen.assert_not_called()

    # 4. Result should be empty list
    assert len(result) == 0
    assert result == []


@patch("app.twitter_handler.mark_tweet_as_seen")
@patch("app.twitter_handler.is_tweet_seen")
@patch("app.twitter_handler.get_rate_limit_status")
@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_fetch_tweets_no_tweets_returned(mock_auth, mock_twitter_api,
                                         mock_get_rate_limit, mock_is_tweet_seen,
                                         mock_mark_tweet_as_seen):
    """Test fetch_tweets when API returns no tweets"""
    # Setup mocks
    mock_auth.return_value = MagicMock()

    # Mock rate limit status to allow fetching
    future_timestamp = int(time.time()) + 3600
    mock_get_rate_limit.return_value = (100, future_timestamp)

    # Mock API to return empty list
    mock_twitter_api.user_timeline.return_value = []

    # Call the function
    result = fetch_tweets()

    # Assertions
    # 1. Rate limit should be checked
    mock_get_rate_limit.assert_called_once()

    # 2. API should be called
    mock_twitter_api.user_timeline.assert_called_once()

    # 3. Database functions should NOT be called (no tweets to check)
    mock_is_tweet_seen.assert_not_called()
    mock_mark_tweet_as_seen.assert_not_called()

    # 4. Result should be empty list
    assert len(result) == 0
    assert result == []


# ===== BIDIR-002: Twitter Writer Tests =====

@patch("tweepy.Client")
def test_post_to_twitter_success(mock_client_class):
    """Test successful post to Twitter returns tweet_id"""
    # Import the function (will be implemented next)
    from app.twitter_handler import post_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creation
    mock_response = MagicMock()
    mock_response.data = {'id': 1234567890123456789}
    mock_client.create_tweet.return_value = mock_response

    # Call function
    tweet_id = post_to_twitter("Hello Twitter!")

    # Assertions
    # 1. Client should be initialized with correct credentials
    mock_client_class.assert_called_once()

    # 2. create_tweet should be called with correct text
    mock_client.create_tweet.assert_called_once_with(text="Hello Twitter!")

    # 3. Should return tweet_id as string
    assert tweet_id == "1234567890123456789"
    assert isinstance(tweet_id, str)


@patch("tweepy.Client")
def test_post_to_twitter_truncates_long_text(mock_client_class):
    """Test that text longer than 280 chars is truncated to 277 + '...'"""
    from app.twitter_handler import post_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.data = {'id': 9876543210987654321}
    mock_client.create_tweet.return_value = mock_response

    # Create a text longer than 280 characters
    long_text = "A" * 300  # 300 characters

    # Call function
    tweet_id = post_to_twitter(long_text)

    # Assertions
    # 1. create_tweet should be called with truncated text (277 chars + "...")
    expected_text = "A" * 277 + "..."
    mock_client.create_tweet.assert_called_once_with(text=expected_text)

    # 2. Truncated text should be exactly 280 characters
    call_args = mock_client.create_tweet.call_args[1]
    assert len(call_args['text']) == 280

    # 3. Should still return tweet_id
    assert tweet_id == "9876543210987654321"


@patch("tweepy.Client")
def test_post_to_twitter_retry_on_network_error(mock_client_class):
    """Test retry logic on transient network errors"""
    from app.twitter_handler import post_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock: fail twice with network errors, then succeed on third attempt
    mock_response = MagicMock()
    mock_response.data = {'id': 1111111111111111111}

    mock_client.create_tweet.side_effect = [
        ConnectionError("Network error"),
        ConnectionError("Network error again"),
        mock_response  # Success on third attempt
    ]

    # Call function (should retry and eventually succeed)
    tweet_id = post_to_twitter("Retry test")

    # Assertions
    # 1. create_tweet should be called 3 times (2 failures + 1 success)
    assert mock_client.create_tweet.call_count == 3

    # 2. Should return tweet_id after successful retry
    assert tweet_id == "1111111111111111111"


def test_post_to_twitter_rate_limit_handling():
    """Test graceful handling of rate limit errors - exceptions are propagated"""
    from app.twitter_handler import post_to_twitter

    with patch("tweepy.Client") as mock_client_class:
        # Setup mock
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock rate limit error - use a generic runtime error to simulate rate limiting
        mock_client.create_tweet.side_effect = RuntimeError("429: Rate limit exceeded")

        # Call function and expect exception to be raised (not caught by post_to_twitter)
        with pytest.raises(RuntimeError) as exc_info:
            post_to_twitter("Rate limit test")

        # Assertions
        # 1. create_tweet should be called (and fail)
        mock_client.create_tweet.assert_called_once()

        # 2. The exception should contain rate limit message
        assert "Rate limit exceeded" in str(exc_info.value)


def test_post_to_twitter_auth_error():
    """Test handling of authentication errors - exceptions are propagated"""
    from app.twitter_handler import post_to_twitter

    with patch("tweepy.Client") as mock_client_class:
        # Setup mock
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock authentication error - use a generic permission error
        mock_client.create_tweet.side_effect = PermissionError("401: Unauthorized")

        # Call function and expect exception to be raised (not caught by post_to_twitter)
        with pytest.raises(PermissionError) as exc_info:
            post_to_twitter("Auth test")

        # Assertions
        # 1. create_tweet should be called (and fail)
        mock_client.create_tweet.assert_called_once()

        # 2. The exception should contain auth error message
        assert "Unauthorized" in str(exc_info.value)


@patch("tweepy.Client")
def test_post_to_twitter_returns_valid_id(mock_client_class):
    """Test that function returns numeric tweet ID as string"""
    from app.twitter_handler import post_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock response with numeric ID
    mock_response = MagicMock()
    mock_response.data = {'id': 1234567890123456789}
    mock_client.create_tweet.return_value = mock_response

    # Call function
    tweet_id = post_to_twitter("Valid ID test")

    # Assertions
    # 1. Should return a string
    assert isinstance(tweet_id, str)

    # 2. String should be numeric
    assert tweet_id.isdigit()

    # 3. Should be a valid Twitter ID (19 digits for modern tweets)
    assert len(tweet_id) >= 15  # Twitter IDs are at least 15 digits
    assert tweet_id == "1234567890123456789"
