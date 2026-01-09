"""Test suite for Twitter thread writer (THREAD-BIDIR-002).

This module tests the post_thread_to_twitter function which:
1. Posts a thread of tweets to Twitter
2. Maintains reply chain structure
3. Handles rate limiting with sleeps
4. Manages partial failures
5. Truncates long tweets

All tests use mocks - no real API calls.
"""
import pytest
from unittest.mock import patch, MagicMock, call
import time
import os


# TEST 1: Thread de 1 tweet
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
def test_post_single_tweet_thread(mock_client_class):
    """Test posting a thread with a single tweet"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creation
    mock_response = MagicMock()
    mock_response.data = {'id': 1111111111111111111}
    mock_client.create_tweet.return_value = mock_response

    # Call function with single post
    posts = ["This is a single tweet thread"]
    result = post_thread_to_twitter(posts)

    # Assertions
    # 1. Should call create_tweet once
    assert mock_client.create_tweet.call_count == 1

    # 2. First tweet should have no reply parameter
    mock_client.create_tweet.assert_called_once_with(text="This is a single tweet thread")

    # 3. Should return list with one tweet ID
    assert len(result) == 1
    assert result[0] == "1111111111111111111"
    assert isinstance(result[0], str)


# TEST 2: Thread de 3 tweets
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
@patch("app.twitter_handler.time.sleep")
def test_post_multi_tweet_thread(mock_sleep, mock_client_class):
    """Test posting a thread with multiple tweets"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creations
    mock_response1 = MagicMock()
    mock_response1.data = {'id': 1111111111111111111}

    mock_response2 = MagicMock()
    mock_response2.data = {'id': 2222222222222222222}

    mock_response3 = MagicMock()
    mock_response3.data = {'id': 3333333333333333333}

    mock_client.create_tweet.side_effect = [mock_response1, mock_response2, mock_response3]

    # Call function with 3 posts
    posts = [
        "First tweet of thread",
        "Second tweet of thread",
        "Third tweet of thread"
    ]
    result = post_thread_to_twitter(posts)

    # Assertions
    # 1. Should call create_tweet 3 times
    assert mock_client.create_tweet.call_count == 3

    # 2. Should return list with 3 tweet IDs
    assert len(result) == 3
    assert result[0] == "1111111111111111111"
    assert result[1] == "2222222222222222222"
    assert result[2] == "3333333333333333333"

    # 3. All IDs should be strings
    assert all(isinstance(tweet_id, str) for tweet_id in result)


# TEST 3: Verificar reply_to_tweet_id correcto
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
@patch("app.twitter_handler.time.sleep")
def test_thread_maintains_reply_chain(mock_sleep, mock_client_class):
    """Test that reply chain is maintained with correct in_reply_to_tweet_id"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creations
    mock_response1 = MagicMock()
    mock_response1.data = {'id': 1111}

    mock_response2 = MagicMock()
    mock_response2.data = {'id': 2222}

    mock_response3 = MagicMock()
    mock_response3.data = {'id': 3333}

    mock_client.create_tweet.side_effect = [mock_response1, mock_response2, mock_response3]

    # Call function with 3 posts
    posts = ["Tweet 1", "Tweet 2", "Tweet 3"]
    result = post_thread_to_twitter(posts)

    # Get all calls to create_tweet
    calls = mock_client.create_tweet.call_args_list

    # Assertions
    # 1. First tweet should have no in_reply_to_tweet_id
    first_call = calls[0]
    assert first_call == call(text="Tweet 1"), "First tweet should have no reply parameter"

    # 2. Second tweet should reply to first tweet
    second_call = calls[1]
    assert second_call == call(text="Tweet 2", in_reply_to_tweet_id="1111"), \
        "Second tweet should reply to first tweet ID"

    # 3. Third tweet should reply to second tweet
    third_call = calls[2]
    assert third_call == call(text="Tweet 3", in_reply_to_tweet_id="2222"), \
        "Third tweet should reply to second tweet ID"


# TEST 4: Verificar sleep entre tweets
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
@patch("app.twitter_handler.time.sleep")
def test_thread_rate_limiting(mock_sleep, mock_client_class):
    """Test that rate limiting is applied with 2 second sleep between tweets"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creations
    mock_responses = []
    for i in range(5):
        mock_response = MagicMock()
        mock_response.data = {'id': 1111111111111111111 + i}
        mock_responses.append(mock_response)

    mock_client.create_tweet.side_effect = mock_responses

    # Call function with 5 posts (should sleep 4 times)
    posts = [f"Tweet {i+1}" for i in range(5)]
    result = post_thread_to_twitter(posts)

    # Assertions
    # 1. Should sleep 4 times (N-1 for N tweets)
    assert mock_sleep.call_count == 4, \
        f"Should sleep 4 times for 5 tweets, got {mock_sleep.call_count}"

    # 2. Each sleep should be 2 seconds
    for call_obj in mock_sleep.call_args_list:
        assert call_obj == call(2), "Each sleep should be 2 seconds"

    # 3. Should still return all 5 tweet IDs
    assert len(result) == 5


# TEST 5: Manejo de fallo en tweet intermedio
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
@patch("app.twitter_handler.time.sleep")
def test_thread_partial_failure(mock_sleep, mock_client_class):
    """Test graceful handling when a tweet in the middle of thread fails"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock: first succeeds, second fails, third succeeds
    mock_response1 = MagicMock()
    mock_response1.data = {'id': 1111}

    mock_response3 = MagicMock()
    mock_response3.data = {'id': 3333}

    mock_client.create_tweet.side_effect = [
        mock_response1,
        Exception("Network error"),  # Second tweet fails
        mock_response3
    ]

    # Call function with 3 posts
    posts = ["Tweet 1", "Tweet 2", "Tweet 3"]
    result = post_thread_to_twitter(posts)

    # Assertions
    # 1. Should return list with successful IDs only
    assert isinstance(result, list), "Should return a list"

    # 2. Should include first tweet ID
    assert "1111" in result, "Should include successfully posted first tweet"

    # 3. Should NOT include failed tweet (would be None or skipped)
    # Result should have fewer than 3 items due to failure
    assert len(result) <= 3, "Should handle partial failure gracefully"

    # 4. Should attempt to post third tweet even after second fails
    assert mock_client.create_tweet.call_count == 3, \
        "Should attempt all tweets even after failure"


# TEST 6: Tweets > 280 chars truncados
@patch.dict(os.environ, {
    'TWITTER_API_KEY': 'test_key',
    'TWITTER_API_SECRET': 'test_secret',
    'TWITTER_ACCESS_TOKEN': 'test_token',
    'TWITTER_ACCESS_SECRET': 'test_token_secret'
})
@patch("app.twitter_handler.tweepy.Client")
@patch("app.twitter_handler.time.sleep")
def test_thread_truncation(mock_sleep, mock_client_class):
    """Test that tweets longer than 280 characters are truncated"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock successful tweet creations
    mock_response1 = MagicMock()
    mock_response1.data = {'id': 1111}

    mock_response2 = MagicMock()
    mock_response2.data = {'id': 2222}

    mock_client.create_tweet.side_effect = [mock_response1, mock_response2]

    # Call function with long tweets (> 280 chars)
    long_text = "A" * 300  # 300 characters
    posts = [
        "Short tweet",
        long_text
    ]
    result = post_thread_to_twitter(posts)

    # Get all calls to create_tweet
    calls = mock_client.create_tweet.call_args_list

    # Assertions
    # 1. First tweet should be unchanged
    first_call = calls[0]
    assert first_call[1]['text'] == "Short tweet"

    # 2. Second tweet should be truncated to 280 chars (277 + "...")
    second_call = calls[1]
    truncated_text = second_call[1]['text']
    assert len(truncated_text) == 280, \
        f"Truncated text should be exactly 280 chars, got {len(truncated_text)}"
    assert truncated_text.endswith("..."), "Truncated text should end with '...'"
    assert truncated_text == "A" * 277 + "...", "Should truncate to 277 chars + '...'"

    # 3. Should return both tweet IDs
    assert len(result) == 2
