from app.twitter_handler import fetch_tweets, get_rate_limit_status
import pytest
from unittest.mock import patch, MagicMock
import time


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
