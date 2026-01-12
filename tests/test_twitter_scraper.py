"""Test suite for twitter_scraper module using twscrape"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio
from app.integrations.twitter_scraper import fetch_tweets

@pytest.fixture
def mock_tweet_data():
    """Fixture providing mock tweet data from twscrape"""
    mock_tweet1 = MagicMock()
    mock_tweet1.id = 123456789
    mock_tweet1.rawContent = "First tweet from twscrape"
    mock_tweet1.user.username = "testuser"

    mock_tweet2 = MagicMock()
    mock_tweet2.id = 987654321
    mock_tweet2.rawContent = "Second tweet from twscrape"
    mock_tweet2.user.username = "testuser"

    mock_tweet3 = MagicMock()
    mock_tweet3.id = 111222333
    mock_tweet3.rawContent = "Third tweet from twscrape"
    mock_tweet3.user.username = "testuser"

    return [mock_tweet1, mock_tweet2, mock_tweet3]

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_returns_list(mock_api_class, mock_is_tweet_seen,
                                   mock_mark_tweet_as_seen, mock_tweet_data):
    """Test that fetch_tweets returns a list of tweet objects"""
    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    # Mock the search method to return our mock tweets
    async def mock_search(*args, **kwargs):
        for tweet in mock_tweet_data:
            yield tweet

    mock_api.search = mock_search

    # Mock is_tweet_seen: all tweets are new
    mock_is_tweet_seen.return_value = False

    # Call the function
    result = fetch_tweets()

    # Assertions
    assert isinstance(result, list), "fetch_tweets should return a list"
    assert len(result) == 3, "Should return 3 tweets"

    # Verify each tweet has required attributes
    for tweet in result:
        assert hasattr(tweet, 'id'), "Tweet should have id attribute"
        assert hasattr(tweet, 'text'), "Tweet should have text attribute"

    # Verify mark_tweet_as_seen was called for each tweet
    assert mock_mark_tweet_as_seen.call_count == 3

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_with_count(mock_api_class, mock_is_tweet_seen,
                                 mock_mark_tweet_as_seen, mock_tweet_data):
    """Test that fetch_tweets respects the count parameter"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    async def mock_search(*args, **kwargs):
        for tweet in mock_tweet_data[:2]:  # Only return 2 tweets
            yield tweet

    mock_api.search = mock_search
    mock_is_tweet_seen.return_value = False

    # Call with count=2
    result = fetch_tweets(count=2)

    # Assertions
    assert len(result) == 2, "Should return 2 tweets when count=2"

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_async_wrapper_works(mock_api_class, mock_is_tweet_seen,
                             mock_mark_tweet_as_seen, mock_tweet_data):
    """Test that the sync wrapper properly calls the async function"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    # Track if async function was called
    async_called = []

    async def mock_search(*args, **kwargs):
        async_called.append(True)
        for tweet in mock_tweet_data[:1]:
            yield tweet

    mock_api.search = mock_search
    mock_is_tweet_seen.return_value = False

    # Call the sync function
    result = fetch_tweets(count=1)

    # Verify async function was called
    assert len(async_called) > 0, "Async function should have been called"
    assert isinstance(result, list), "Should return a list"

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_tweet_format_matches_expected(mock_api_class, mock_is_tweet_seen,
                                       mock_mark_tweet_as_seen, mock_tweet_data):
    """Test that tweet objects have the expected format (id and text attributes)"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    async def mock_search(*args, **kwargs):
        for tweet in mock_tweet_data[:1]:
            yield tweet

    mock_api.search = mock_search
    mock_is_tweet_seen.return_value = False

    # Call the function
    result = fetch_tweets(count=1)

    # Assertions - verify format matches what main.py expects
    assert len(result) == 1
    tweet = result[0]

    # Must have id attribute (integer)
    assert hasattr(tweet, 'id')
    assert isinstance(tweet.id, int)
    assert tweet.id == 123456789

    # Must have text attribute (string)
    assert hasattr(tweet, 'text')
    assert isinstance(tweet.text, str)
    assert tweet.text == "First tweet from twscrape"

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_filters_seen_tweets(mock_api_class, mock_is_tweet_seen,
                                          mock_mark_tweet_as_seen, mock_tweet_data):
    """Test that fetch_tweets filters out already seen tweets"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    async def mock_search(*args, **kwargs):
        for tweet in mock_tweet_data:
            yield tweet

    mock_api.search = mock_search

    # Mock is_tweet_seen: tweet 2 (index 1) is already seen
    mock_is_tweet_seen.side_effect = lambda tweet_id: tweet_id == 987654321

    # Call the function
    result = fetch_tweets()

    # Assertions
    assert len(result) == 2, "Should return only unseen tweets"

    # Verify is_tweet_seen was called for all tweets
    assert mock_is_tweet_seen.call_count == 3

    # Verify mark_tweet_as_seen was only called for unseen tweets
    assert mock_mark_tweet_as_seen.call_count == 2
    mock_mark_tweet_as_seen.assert_any_call(123456789)
    mock_mark_tweet_as_seen.assert_any_call(111222333)

    # Verify the seen tweet (987654321) is not in results
    result_ids = [tweet.id for tweet in result]
    assert 987654321 not in result_ids

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_all_seen(mock_api_class, mock_is_tweet_seen,
                               mock_mark_tweet_as_seen, mock_tweet_data):
    """Test fetch_tweets when all tweets have already been seen"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    async def mock_search(*args, **kwargs):
        for tweet in mock_tweet_data:
            yield tweet

    mock_api.search = mock_search

    # Mock: all tweets are already seen
    mock_is_tweet_seen.return_value = True

    # Call the function
    result = fetch_tweets()

    # Assertions
    assert len(result) == 0, "Should return empty list when all tweets are seen"
    assert result == []

    # Verify is_tweet_seen was called for each tweet
    assert mock_is_tweet_seen.call_count == 3

    # Verify mark_tweet_as_seen was NOT called
    mock_mark_tweet_as_seen.assert_not_called()

@patch("app.integrations.twitter_scraper.mark_tweet_as_seen")
@patch("app.integrations.twitter_scraper.is_tweet_seen")
@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_no_tweets_returned(mock_api_class, mock_is_tweet_seen,
                                         mock_mark_tweet_as_seen):
    """Test fetch_tweets when API returns no tweets"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    async def mock_search(*args, **kwargs):
        # Return empty generator
        return
        yield  # Make it a generator but don't yield anything

    mock_api.search = mock_search

    # Call the function
    result = fetch_tweets()

    # Assertions
    assert len(result) == 0
    assert result == []

    # Database functions should NOT be called
    mock_is_tweet_seen.assert_not_called()
    mock_mark_tweet_as_seen.assert_not_called()

@patch("app.integrations.twitter_scraper.API")
def test_fetch_tweets_uses_correct_username(mock_api_class, mock_tweet_data):
    """Test that fetch_tweets uses the correct Twitter username from config"""

    # Setup mock API instance
    mock_api = AsyncMock()
    mock_api_class.return_value = mock_api

    # Track the search query
    search_queries = []

    async def mock_search(query, *args, **kwargs):
        search_queries.append(query)
        for tweet in mock_tweet_data[:1]:
            yield tweet

    mock_api.search = mock_search

    # Call the function
    with patch("app.integrations.twitter_scraper.is_tweet_seen", return_value=False):
        with patch("app.integrations.twitter_scraper.mark_tweet_as_seen"):
            fetch_tweets(count=1)

    # Verify search was called with a query containing username
    assert len(search_queries) > 0, "Search should have been called"
    # The query should include "from:" to specify the user
    assert "from:" in search_queries[0], "Query should include 'from:' to specify user"
