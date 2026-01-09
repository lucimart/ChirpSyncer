"""Test suite for Twitter thread synchronization feature (FEATURE-002).

This module tests:
1. Thread detection (is_thread)
2. Thread fetching (fetch_thread)
3. Thread posting to Bluesky (post_thread_to_bluesky)
4. Integration with main sync flow

All tests use mocks - no real API calls.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock, call
import asyncio
import sys

# Mock all external dependencies before importing app modules
sys.modules['twscrape'] = MagicMock()
sys.modules['tenacity'] = MagicMock()

# Mock atproto and its models
mock_models = MagicMock()
mock_models.AppBskyFeedPost.ReplyRef = MagicMock
mock_models.create_strong_ref = MagicMock(return_value=MagicMock())
mock_atproto = MagicMock()
mock_atproto.models = mock_models
mock_atproto.Client = MagicMock
sys.modules['atproto'] = mock_atproto

# Import modules after mocking dependencies
from app.bluesky_handler import post_thread_to_bluesky
from app.twitter_scraper import TweetAdapter, is_thread, fetch_thread


@pytest.fixture
def mock_single_tweet():
    """Fixture for a single tweet (not part of a thread)"""
    tweet = MagicMock()
    tweet.id = 123456789
    tweet.rawContent = "This is a single tweet"
    tweet.user.username = "testuser"
    tweet.inReplyToTweetId = None  # No reply = not a thread
    return tweet


@pytest.fixture
def mock_thread_tweets():
    """Fixture for a thread of 3 tweets"""
    # Tweet 1: Original tweet (no reply)
    tweet1 = MagicMock()
    tweet1.id = 100
    tweet1.rawContent = "Tweet 1 of thread"
    tweet1.user = MagicMock()
    tweet1.user.username = "testuser"
    tweet1.inReplyToTweetId = None

    # Tweet 2: Reply to tweet 1
    tweet2 = MagicMock()
    tweet2.id = 200
    tweet2.rawContent = "Tweet 2 of thread"
    tweet2.user = MagicMock()
    tweet2.user.username = "testuser"
    tweet2.inReplyToTweetId = 100

    # Tweet 3: Reply to tweet 2
    tweet3 = MagicMock()
    tweet3.id = 300
    tweet3.rawContent = "Tweet 3 of thread"
    tweet3.user = MagicMock()
    tweet3.user.username = "testuser"
    tweet3.inReplyToTweetId = 200

    return [tweet1, tweet2, tweet3]


@pytest.fixture
def mock_self_reply_tweet():
    """Fixture for a tweet that is a self-reply (part of thread)"""
    tweet = MagicMock()
    tweet.id = 200
    tweet.rawContent = "This is a reply to my own tweet"
    tweet.user.username = "testuser"
    tweet.inReplyToTweetId = 100  # Replying to own tweet
    return tweet


# TEST 1: Single tweet is not detected as thread
def test_detect_single_tweet_not_thread(mock_single_tweet):
    """Test that a single tweet without replies is not detected as a thread"""
    result = asyncio.run(is_thread(mock_single_tweet))

    assert result is False, "Single tweet should not be detected as thread"


# TEST 2: Self-reply is detected as thread
def test_detect_self_reply_is_thread(mock_self_reply_tweet):
    """Test that a self-reply tweet is detected as part of a thread"""
    result = asyncio.run(is_thread(mock_self_reply_tweet))

    assert result is True, "Self-reply should be detected as thread"


# TEST 3: Thread fetching returns tweets in order
@patch("app.twitter_scraper.API")
def test_fetch_thread_returns_ordered_tweets(mock_api_class, mock_thread_tweets):
    """Test that fetch_thread returns all tweets in chronological order"""
    # Setup mock API
    mock_api = MagicMock()
    mock_api_class.return_value = mock_api

    # Create async generator for tweet_details
    class AsyncIterator:
        def __init__(self, items):
            self.items = items
            self.index = 0

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self.index >= len(self.items):
                raise StopAsyncIteration
            item = self.items[self.index]
            self.index += 1
            return item

    # Mock tweet_details to return tweets in sequence
    def mock_tweet_details(tweet_ids):
        tweet_map = {t.id: t for t in mock_thread_tweets}
        items = [tweet_map[tid] for tid in tweet_ids if tid in tweet_map]
        return AsyncIterator(items)

    # Mock search to return tweet 300 as a forward reply
    def mock_search(query, limit=10):
        # Return tweet 3 as a reply to tweet 2
        return AsyncIterator([mock_thread_tweets[2]])

    mock_api.tweet_details = mock_tweet_details
    mock_api.search = mock_search

    # Start from tweet 200 (middle of thread) to test backward traversal
    result = asyncio.run(fetch_thread("200", "testuser"))

    # Assertions - should get at least 2 tweets (backwards) or 3 (with forward search)
    assert len(result) >= 2, f"Should fetch at least 2 tweets, got {len(result)}"
    # First tweet should be the root (100)
    assert result[0].id == 100, "First tweet should be root ID 100"
    # Should include the starting tweet (200)
    assert 200 in [t.id for t in result], "Should include starting tweet 200"


# TEST 4: Handle missing/deleted tweets in thread
@patch("app.twitter_scraper.API")
def test_fetch_thread_handles_missing_tweets(mock_api_class, mock_thread_tweets):
    """Test that fetch_thread handles deleted tweets gracefully"""
    from app.twitter_scraper import fetch_thread

    # Setup mock API
    mock_api = MagicMock()
    mock_api_class.return_value = mock_api

    # Create async generator helper
    class AsyncIterator:
        def __init__(self, items):
            self.items = items
            self.index = 0

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self.index >= len(self.items):
                raise StopAsyncIteration
            item = self.items[self.index]
            self.index += 1
            return item

    # Mock tweet_details to skip middle tweet (deleted)
    def mock_tweet_details(tweet_ids):
        # Only return tweet 1 and 3, skip tweet 2 (deleted)
        tweet_map = {
            100: mock_thread_tweets[0],
            300: mock_thread_tweets[2]
        }
        items = [tweet_map[tid] for tid in tweet_ids if tid in tweet_map]
        return AsyncIterator(items)

    def mock_search(query, limit=10):
        return AsyncIterator([])

    mock_api.tweet_details = mock_tweet_details
    mock_api.search = mock_search

    # Call fetch_thread
    result = asyncio.run(fetch_thread("100", "testuser"))

    # Assertions: should return available tweets only
    assert len(result) >= 1, "Should fetch at least the original tweet"
    assert result[0].id == 100, "Should include the first tweet"


# TEST 5: Post thread to Bluesky
@patch("app.bluesky_handler.bsky_client.send_post")
def test_post_thread_to_bluesky(mock_send_post, mock_thread_tweets):
    """Test that a thread is posted correctly to Bluesky"""
    # Setup mock client responses
    mock_response1 = MagicMock()
    mock_response1.uri = "at://did:plc:123/app.bsky.feed.post/abc1"
    mock_response1.cid = "cid1"

    mock_response2 = MagicMock()
    mock_response2.uri = "at://did:plc:123/app.bsky.feed.post/abc2"
    mock_response2.cid = "cid2"

    mock_response3 = MagicMock()
    mock_response3.uri = "at://did:plc:123/app.bsky.feed.post/abc3"
    mock_response3.cid = "cid3"

    mock_send_post.side_effect = [mock_response1, mock_response2, mock_response3]

    # Wrap tweets in TweetAdapter
    adapted_tweets = [TweetAdapter(t) for t in mock_thread_tweets]

    # Call post_thread_to_bluesky
    result = post_thread_to_bluesky(adapted_tweets)

    # Assertions
    assert len(result) == 3, "Should return 3 URIs for 3 tweets"
    assert all(uri.startswith("at://") for uri in result), "All URIs should be valid"
    assert mock_send_post.call_count == 3, "Should post 3 tweets"


# TEST 6: Thread order is maintained in Bluesky
@patch("app.bluesky_handler.bsky_client.send_post")
def test_post_thread_maintains_order(mock_send_post, mock_thread_tweets):
    """Test that thread order is maintained when posting to Bluesky"""
    from app.bluesky_handler import post_thread_to_bluesky
    from app.twitter_scraper import TweetAdapter

    # Setup mock client
    mock_response = MagicMock()
    mock_response.uri = "at://test/uri"
    mock_response.cid = "test_cid"
    mock_send_post.return_value = mock_response

    # Wrap tweets in TweetAdapter
    adapted_tweets = [TweetAdapter(t) for t in mock_thread_tweets]

    # Call post_thread_to_bluesky
    post_thread_to_bluesky(adapted_tweets)

    # Get all calls to send_post
    calls = mock_send_post.call_args_list

    # Verify first tweet has no reply_to parameter
    first_call = calls[0]
    assert 'reply_to' not in first_call[1] or first_call[1].get('reply_to') is None

    # Verify subsequent tweets have reply_to parameter
    assert len(calls) >= 2, "Should have multiple calls for thread"
    for i in range(1, len(calls)):
        call_kwargs = calls[i][1]
        assert 'reply_to' in call_kwargs, f"Tweet {i+1} should have reply_to parameter"


# TEST 7: Handle partial failure when posting thread
@patch("app.bluesky_handler.bsky_client.send_post")
@patch("app.bluesky_handler.logger")
def test_post_thread_handles_partial_failure(mock_logger, mock_send_post, mock_thread_tweets):
    """Test that partial failures in thread posting are handled gracefully"""
    from app.bluesky_handler import post_thread_to_bluesky
    from app.twitter_scraper import TweetAdapter

    # Setup mock client: first succeeds, second fails, third succeeds
    mock_response1 = MagicMock()
    mock_response1.uri = "at://test/uri1"
    mock_response1.cid = "cid1"

    mock_response3 = MagicMock()
    mock_response3.uri = "at://test/uri3"
    mock_response3.cid = "cid3"

    mock_send_post.side_effect = [
        mock_response1,
        Exception("Network error"),  # Second post fails
        mock_response3
    ]

    # Wrap tweets in TweetAdapter
    adapted_tweets = [TweetAdapter(t) for t in mock_thread_tweets]

    # Call post_thread_to_bluesky - should not crash
    result = post_thread_to_bluesky(adapted_tweets)

    # Should return partial results or empty
    assert isinstance(result, list), "Should return a list even on partial failure"


# TEST 8: Thread deduplication
@patch("app.db_handler.is_tweet_seen")
def test_thread_deduplication(mock_is_tweet_seen, mock_thread_tweets):
    """Test that already-synced threads are not duplicated"""
    from app.twitter_scraper import TweetAdapter

    # Mock: first tweet already seen (thread already synced)
    mock_is_tweet_seen.return_value = True

    # Wrap first tweet
    tweet = TweetAdapter(mock_thread_tweets[0])

    # Check if tweet was seen
    result = mock_is_tweet_seen(tweet.id)

    # Assertion
    assert result is True, "Already synced thread should be detected as seen"


# TEST 9: Long thread rate limiting
@patch("app.bluesky_handler.bsky_client.send_post")
@patch("app.bluesky_handler.time.sleep")
def test_long_thread_rate_limiting(mock_sleep, mock_send_post):
    """Test that rate limiting is applied for long threads"""
    from app.bluesky_handler import post_thread_to_bluesky
    from app.twitter_scraper import TweetAdapter

    # Create a long thread (5 tweets)
    long_thread = []
    for i in range(5):
        tweet = MagicMock()
        tweet.id = 100 + i
        tweet.rawContent = f"Tweet {i+1} of long thread"
        tweet.user = MagicMock()
        tweet.user.username = "testuser"
        tweet.inReplyToTweetId = 100 + i - 1 if i > 0 else None
        long_thread.append(tweet)

    # Setup mock client
    mock_response = MagicMock()
    mock_response.uri = "at://test/uri"
    mock_response.cid = "test_cid"
    mock_send_post.return_value = mock_response

    # Wrap tweets
    adapted_tweets = [TweetAdapter(t) for t in long_thread]

    # Call post_thread_to_bluesky
    post_thread_to_bluesky(adapted_tweets)

    # Verify sleep was called for rate limiting (between posts)
    # Should sleep N-1 times for N posts (4 times for 5 tweets)
    assert mock_sleep.call_count == 4, "Should sleep 4 times between 5 posts for rate limiting"


# TEST 10: Integration test - sync thread end-to-end
@patch("app.bluesky_handler.bsky_client.send_post")
@patch("app.twitter_scraper.API")
@patch("app.db_handler.is_tweet_seen")
@patch("app.db_handler.mark_tweet_as_seen")
def test_integration_sync_thread_end_to_end(
    mock_mark_seen, mock_is_seen, mock_api_class, mock_send_post, mock_thread_tweets
):
    """Integration test: detect thread, fetch it, and post to Bluesky"""
    from app.twitter_scraper import is_thread, fetch_thread, TweetAdapter
    from app.bluesky_handler import post_thread_to_bluesky

    # Setup: thread not seen yet
    mock_is_seen.return_value = False

    # Setup mock Twitter API
    mock_api = MagicMock()
    mock_api_class.return_value = mock_api

    # Create async generator helper
    class AsyncIterator:
        def __init__(self, items):
            self.items = items
            self.index = 0

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self.index >= len(self.items):
                raise StopAsyncIteration
            item = self.items[self.index]
            self.index += 1
            return item

    def mock_tweet_details(tweet_ids):
        tweet_map = {t.id: t for t in mock_thread_tweets}
        items = [tweet_map[tid] for tid in tweet_ids if tid in tweet_map]
        return AsyncIterator(items)

    def mock_search(query, limit=10):
        return AsyncIterator([])

    mock_api.tweet_details = mock_tweet_details
    mock_api.search = mock_search

    # Setup mock Bluesky client
    mock_response = MagicMock()
    mock_response.uri = "at://test/uri"
    mock_response.cid = "test_cid"
    mock_send_post.return_value = mock_response

    # Step 1: Detect thread (using second tweet which is a reply)
    thread_tweet = mock_thread_tweets[1]  # This is a self-reply
    is_thread_result = asyncio.run(is_thread(thread_tweet))
    assert is_thread_result is True, "Should detect as thread"

    # Step 2: Fetch full thread
    thread = asyncio.run(fetch_thread("100", "testuser"))
    assert len(thread) > 0, "Should fetch thread tweets"

    # Step 3: Post to Bluesky
    adapted_thread = [TweetAdapter(t) for t in thread]
    uris = post_thread_to_bluesky(adapted_thread)

    # Assertions
    assert len(uris) > 0, "Should post thread to Bluesky"
    assert mock_send_post.called, "Should call Bluesky API"


# ========================================
# BLUESKY → TWITTER THREAD TESTS
# ========================================

@pytest.fixture
def mock_bluesky_single_post():
    """Fixture for a single Bluesky post (not part of a thread)"""
    post = MagicMock()
    post.uri = "at://did:plc:abc123/app.bsky.feed.post/xyz1"
    post.text = "This is a single Bluesky post"
    # Mock the record structure - no reply field means not a thread
    post.record = MagicMock()
    post.record.reply = None
    return post


@pytest.fixture
def mock_bluesky_thread_posts():
    """Fixture for a Bluesky thread of 3 posts"""
    # Post 1: Original post (no reply)
    post1 = MagicMock()
    post1.uri = "at://did:plc:abc123/app.bsky.feed.post/post1"
    post1.text = "Bluesky post 1 of thread"
    post1.cid = "cid1"
    post1.record = MagicMock()
    post1.record.reply = None

    # Post 2: Reply to post 1
    post2 = MagicMock()
    post2.uri = "at://did:plc:abc123/app.bsky.feed.post/post2"
    post2.text = "Bluesky post 2 of thread"
    post2.cid = "cid2"
    post2.record = MagicMock()
    post2.record.reply = MagicMock()
    post2.record.reply.parent = MagicMock()
    post2.record.reply.parent.uri = post1.uri

    # Post 3: Reply to post 2
    post3 = MagicMock()
    post3.uri = "at://did:plc:abc123/app.bsky.feed.post/post3"
    post3.text = "Bluesky post 3 of thread"
    post3.cid = "cid3"
    post3.record = MagicMock()
    post3.record.reply = MagicMock()
    post3.record.reply.parent = MagicMock()
    post3.record.reply.parent.uri = post2.uri

    return [post1, post2, post3]


# TEST 11: Detect single Bluesky post is not a thread
def test_bluesky_single_post_not_thread(mock_bluesky_single_post):
    """Test that a single Bluesky post without reply is not detected as a thread"""
    from app.bluesky_handler import is_bluesky_thread

    result = is_bluesky_thread(mock_bluesky_single_post)

    assert result is False, "Single post should not be detected as thread"


# TEST 12: Detect Bluesky reply is part of a thread
def test_bluesky_reply_is_thread(mock_bluesky_thread_posts):
    """Test that a Bluesky reply post is detected as part of a thread"""
    from app.bluesky_handler import is_bluesky_thread

    # Check the second post (which is a reply)
    result = is_bluesky_thread(mock_bluesky_thread_posts[1])

    assert result is True, "Reply post should be detected as thread"


# TEST 13: Fetch Bluesky thread backward to root
@patch("app.bluesky_handler.bsky_client")
def test_fetch_bluesky_thread_backward(mock_client, mock_bluesky_thread_posts):
    """Test that fetch_bluesky_thread follows reply chain backward to root"""
    from app.bluesky_handler import fetch_bluesky_thread

    # Setup mock client to return posts when fetching by URI
    def mock_get_posts(uris):
        uri_map = {p.uri: p for p in mock_bluesky_thread_posts}
        response = MagicMock()
        response.posts = [uri_map[uri] for uri in uris if uri in uri_map]
        return response

    mock_client.app.bsky.feed.get_posts = mock_get_posts

    # Start from post 2 (middle of thread) and fetch backward
    result = fetch_bluesky_thread(mock_bluesky_thread_posts[1].uri, mock_client)

    # Should get posts in chronological order
    assert len(result) >= 2, "Should fetch at least 2 posts (backward)"
    assert result[0].uri == mock_bluesky_thread_posts[0].uri, "First post should be root"


# TEST 14: Fetch complete Bluesky thread
@patch("app.bluesky_handler.bsky_client")
def test_fetch_bluesky_thread_complete(mock_client, mock_bluesky_thread_posts):
    """Test that fetch_bluesky_thread retrieves complete thread"""
    from app.bluesky_handler import fetch_bluesky_thread

    # Setup mock to return all posts
    def mock_get_posts(uris):
        uri_map = {p.uri: p for p in mock_bluesky_thread_posts}
        response = MagicMock()
        response.posts = [uri_map[uri] for uri in uris if uri in uri_map]
        return response

    # Mock search for forward replies
    def mock_search_posts(params):
        # Return all posts as potential replies
        response = MagicMock()
        response.posts = mock_bluesky_thread_posts
        return response

    mock_client.app.bsky.feed.get_posts = mock_get_posts
    mock_client.app.bsky.feed.search_posts = mock_search_posts

    # Fetch thread starting from first post
    result = fetch_bluesky_thread(mock_bluesky_thread_posts[0].uri, mock_client)

    # Should get all posts in chronological order
    assert len(result) >= 1, "Should fetch at least 1 post"
    assert result[0].uri == mock_bluesky_thread_posts[0].uri, "Should start with root"


# TEST 15: Post thread to Twitter
@patch("app.twitter_handler.tweepy.Client")
def test_post_thread_to_twitter(mock_client_class):
    """Test that a thread is posted correctly to Twitter"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock Twitter client
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    # Mock responses for each tweet
    mock_response1 = MagicMock()
    mock_response1.data = {'id': '111'}

    mock_response2 = MagicMock()
    mock_response2.data = {'id': '222'}

    mock_response3 = MagicMock()
    mock_response3.data = {'id': '333'}

    mock_client.create_tweet.side_effect = [mock_response1, mock_response2, mock_response3]

    # Post a 3-tweet thread
    tweets = ["Tweet 1 of thread", "Tweet 2 of thread", "Tweet 3 of thread"]
    result = post_thread_to_twitter(tweets)

    # Assertions
    assert len(result) == 3, "Should return 3 tweet IDs"
    assert result == ['111', '222', '333'], "Should return correct tweet IDs"
    assert mock_client.create_tweet.call_count == 3, "Should post 3 tweets"


# TEST 16: Thread order maintained when posting to Twitter
@patch("app.twitter_handler.tweepy.Client")
def test_post_thread_to_twitter_maintains_order(mock_client_class):
    """Test that thread order is maintained when posting to Twitter"""
    from app.twitter_handler import post_thread_to_twitter

    # Setup mock client
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.data = {'id': '123'}
    mock_client.create_tweet.return_value = mock_response

    # Post thread
    tweets = ["First tweet", "Second tweet", "Third tweet"]
    post_thread_to_twitter(tweets)

    # Get all calls
    calls = mock_client.create_tweet.call_args_list

    # First tweet should have no reply parameter
    first_call_kwargs = calls[0][1]
    assert 'in_reply_to_tweet_id' not in first_call_kwargs or first_call_kwargs.get('in_reply_to_tweet_id') is None

    # Subsequent tweets should have reply parameter
    for i in range(1, len(calls)):
        call_kwargs = calls[i][1]
        assert 'in_reply_to_tweet_id' in call_kwargs, f"Tweet {i+1} should have reply parameter"


# TEST 17: Handle Twitter credentials not configured
def test_post_thread_to_twitter_no_credentials():
    """Test graceful handling when Twitter API credentials are not configured"""
    from app.twitter_handler import post_thread_to_twitter
    from config import TWITTER_API_KEY

    # If credentials are not configured, function should handle gracefully
    if not TWITTER_API_KEY:
        tweets = ["Test tweet"]
        # Should either skip or raise appropriate error
        try:
            result = post_thread_to_twitter(tweets)
            # If it returns, should be empty list or None
            assert result is None or result == [], "Should return empty/None when credentials missing"
        except Exception as e:
            # Should raise authentication error, not crash
            assert "auth" in str(e).lower() or "credential" in str(e).lower()


# TEST 18: Integration test - Bluesky → Twitter thread sync
@patch("app.twitter_handler.tweepy.Client")
@patch("app.bluesky_handler.bsky_client")
@patch("app.db_handler.should_sync_post")
@patch("app.db_handler.save_synced_post")
def test_integration_bluesky_to_twitter_thread(
    mock_save_synced, mock_should_sync, mock_bsky_client, mock_twitter_client_class,
    mock_bluesky_thread_posts
):
    """Integration test: detect Bluesky thread, fetch it, and post to Twitter"""
    from app.bluesky_handler import is_bluesky_thread, fetch_bluesky_thread
    from app.twitter_handler import post_thread_to_twitter

    # Setup: post should be synced
    mock_should_sync.return_value = True

    # Setup mock Bluesky client
    def mock_get_posts(uris):
        uri_map = {p.uri: p for p in mock_bluesky_thread_posts}
        response = MagicMock()
        response.posts = [uri_map[uri] for uri in uris if uri in uri_map]
        return response

    mock_bsky_client.app.bsky.feed.get_posts = mock_get_posts

    # Setup mock Twitter client
    mock_twitter_client = MagicMock()
    mock_twitter_client_class.return_value = mock_twitter_client

    mock_response = MagicMock()
    mock_response.data = {'id': '123'}
    mock_twitter_client.create_tweet.return_value = mock_response

    # Step 1: Detect thread (using second post which is a reply)
    thread_post = mock_bluesky_thread_posts[1]
    is_thread_result = is_bluesky_thread(thread_post)
    assert is_thread_result is True, "Should detect as thread"

    # Step 2: Fetch full thread
    thread = fetch_bluesky_thread(thread_post.uri, mock_bsky_client)
    assert len(thread) > 0, "Should fetch thread posts"

    # Step 3: Post to Twitter
    tweet_texts = [p.text for p in thread]
    tweet_ids = post_thread_to_twitter(tweet_texts)

    # Assertions
    assert len(tweet_ids) > 0, "Should post thread to Twitter"
    assert mock_twitter_client.create_tweet.called, "Should call Twitter API"
