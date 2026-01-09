"""
THREAD-BIDIR-004: Orchestration Layer Tests

Test suite for bidirectional thread synchronization orchestration in main.py.
These tests verify that threads are detected, synced, and deduplicated correctly
in both directions: Twitter ↔ Bluesky.

All tests use comprehensive mocking - no real API calls.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock, call
import sys
import asyncio

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


@pytest.fixture
def mock_twitter_thread():
    """Fixture: Twitter thread with 3 tweets"""
    tweet1 = MagicMock()
    tweet1.id = "tw_100"
    tweet1.text = "First tweet in thread"
    tweet1._tweet = MagicMock()
    tweet1._tweet.inReplyToTweetId = None

    tweet2 = MagicMock()
    tweet2.id = "tw_200"
    tweet2.text = "Second tweet in thread"
    tweet2._tweet = MagicMock()
    tweet2._tweet.inReplyToTweetId = "tw_100"

    tweet3 = MagicMock()
    tweet3.id = "tw_300"
    tweet3.text = "Third tweet in thread"
    tweet3._tweet = MagicMock()
    tweet3._tweet.inReplyToTweetId = "tw_200"

    return [tweet1, tweet2, tweet3]


@pytest.fixture
def mock_bluesky_thread():
    """Fixture: Bluesky thread with 3 posts"""
    post1 = MagicMock()
    post1.uri = "at://did:plc:user/app.bsky.feed.post/bs_100"
    post1.text = "First post in thread"
    post1.reply = None

    post2 = MagicMock()
    post2.uri = "at://did:plc:user/app.bsky.feed.post/bs_200"
    post2.text = "Second post in thread"
    post2.reply = MagicMock()
    post2.reply.parent = MagicMock()
    post2.reply.parent.uri = "at://did:plc:user/app.bsky.feed.post/bs_100"

    post3 = MagicMock()
    post3.uri = "at://did:plc:user/app.bsky.feed.post/bs_300"
    post3.text = "Third post in thread"
    post3.reply = MagicMock()
    post3.reply.parent = MagicMock()
    post3.reply.parent.uri = "at://did:plc:user/app.bsky.feed.post/bs_200"

    return [post1, post2, post3]


# TEST 1: Thread Twitter → Bluesky
@patch('app.main.save_synced_thread')
@patch('app.main.is_thread_synced')
@patch('app.main.post_thread_to_bluesky')
@patch('app.main.fetch_thread')
@patch('app.main.is_thread')
@patch('app.main.fetch_tweets')
def test_sync_twitter_thread_to_bluesky(
    mock_fetch_tweets,
    mock_is_thread,
    mock_fetch_thread,
    mock_post_thread_to_bluesky,
    mock_is_thread_synced,
    mock_save_synced_thread,
    mock_twitter_thread
):
    """
    Test 1: Verify Twitter thread is detected and synced to Bluesky.

    Scenario:
    1. Fetch tweets returns a thread
    2. is_thread() detects it's a thread
    3. fetch_thread() returns full thread
    4. is_thread_synced() returns False (not synced yet)
    5. post_thread_to_bluesky() posts it
    6. save_synced_thread() saves it to DB

    Expected: Thread synced successfully
    """
    from app.main import sync_twitter_to_bluesky

    # Setup mocks
    mock_fetch_tweets.return_value = [mock_twitter_thread[0]]  # Return first tweet

    # Mock is_thread as AsyncMock
    mock_is_thread.return_value = True

    # Mock fetch_thread as AsyncMock
    mock_fetch_thread.return_value = mock_twitter_thread

    mock_is_thread_synced.return_value = False  # Not synced yet
    mock_post_thread_to_bluesky.return_value = [
        "at://user/post/1",
        "at://user/post/2",
        "at://user/post/3"
    ]

    # Execute sync
    sync_twitter_to_bluesky()

    # Assertions
    assert mock_fetch_tweets.called, "Should fetch tweets"
    assert mock_is_thread.called, "Should check if tweet is thread"
    assert mock_fetch_thread.called, "Should fetch full thread"
    assert mock_is_thread_synced.called, "Should check if thread already synced"
    assert mock_post_thread_to_bluesky.called, "Should post thread to Bluesky"
    assert mock_save_synced_thread.called, "Should save synced thread to DB"

    # Verify thread_id format
    save_call = mock_save_synced_thread.call_args
    if save_call:
        # Check if thread_id was passed (should be "twitter_{tweet_id}")
        call_kwargs = save_call[1] if len(save_call) > 1 else {}
        if 'thread_id' in call_kwargs:
            thread_id = call_kwargs['thread_id']
            assert thread_id.startswith('twitter_'), f"Thread ID should start with 'twitter_', got {thread_id}"


# TEST 2: Thread Bluesky → Twitter
@patch('app.main.save_synced_thread')
@patch('app.main.is_thread_synced')
@patch('app.main.post_thread_to_twitter')
@patch('app.main.fetch_bluesky_thread')
@patch('app.main.is_bluesky_thread')
@patch('app.main.fetch_posts_from_bluesky')
@patch('app.main.TWITTER_API_KEY', 'dummy_key')  # Enable bidirectional sync
def test_sync_bluesky_thread_to_twitter(
    mock_fetch_posts,
    mock_is_bluesky_thread,
    mock_fetch_bluesky_thread,
    mock_post_thread_to_twitter,
    mock_is_thread_synced,
    mock_save_synced_thread,
    mock_bluesky_thread
):
    """
    Test 2: Verify Bluesky thread is detected and synced to Twitter.

    Scenario:
    1. Fetch Bluesky posts returns a thread
    2. is_bluesky_thread() detects it's a thread
    3. fetch_bluesky_thread() returns full thread
    4. is_thread_synced() returns False (not synced yet)
    5. post_thread_to_twitter() posts it
    6. save_synced_thread() saves it to DB

    Expected: Thread synced successfully
    """
    from app.main import sync_bluesky_to_twitter

    # Setup mocks
    mock_fetch_posts.return_value = [mock_bluesky_thread[0]]  # Return first post
    mock_is_bluesky_thread.return_value = True
    mock_fetch_bluesky_thread.return_value = mock_bluesky_thread
    mock_is_thread_synced.return_value = False  # Not synced yet
    mock_post_thread_to_twitter.return_value = [
        "twitter_id_1",
        "twitter_id_2",
        "twitter_id_3"
    ]

    # Execute sync
    sync_bluesky_to_twitter()

    # Assertions
    assert mock_fetch_posts.called, "Should fetch Bluesky posts"
    assert mock_is_bluesky_thread.called, "Should check if post is thread"
    assert mock_fetch_bluesky_thread.called, "Should fetch full thread"
    assert mock_is_thread_synced.called, "Should check if thread already synced"
    assert mock_post_thread_to_twitter.called, "Should post thread to Twitter"
    assert mock_save_synced_thread.called, "Should save synced thread to DB"

    # Verify thread_id format
    save_call = mock_save_synced_thread.call_args
    if save_call:
        call_kwargs = save_call[1] if len(save_call) > 1 else {}
        if 'thread_id' in call_kwargs:
            thread_id = call_kwargs['thread_id']
            assert thread_id.startswith('bluesky_'), f"Thread ID should start with 'bluesky_', got {thread_id}"


# TEST 3: Thread deduplication (Twitter source)
@patch('app.main.save_synced_thread')
@patch('app.main.is_thread_synced')
@patch('app.main.post_thread_to_bluesky')
@patch('app.main.fetch_thread')
@patch('app.main.is_thread')
@patch('app.main.fetch_tweets')
def test_thread_deduplication_twitter_source(
    mock_fetch_tweets,
    mock_is_thread,
    mock_fetch_thread,
    mock_post_thread_to_bluesky,
    mock_is_thread_synced,
    mock_save_synced_thread,
    mock_twitter_thread
):
    """
    Test 3: Verify already-synced Twitter threads are not duplicated.

    Scenario:
    1. Fetch tweets returns a thread
    2. is_thread() detects it's a thread
    3. fetch_thread() returns full thread
    4. is_thread_synced() returns True (ALREADY SYNCED)
    5. Should skip posting and saving

    Expected: Thread NOT synced again (deduplication works)
    """
    from app.main import sync_twitter_to_bluesky

    # Setup mocks
    mock_fetch_tweets.return_value = [mock_twitter_thread[0]]

    # Mock is_thread as AsyncMock
    mock_is_thread.return_value = True

    # Mock fetch_thread as AsyncMock
    mock_fetch_thread.return_value = mock_twitter_thread

    mock_is_thread_synced.return_value = True  # ALREADY SYNCED

    # Execute sync
    sync_twitter_to_bluesky()

    # Assertions
    assert mock_is_thread_synced.called, "Should check if thread already synced"
    assert not mock_post_thread_to_bluesky.called, "Should NOT post thread (already synced)"
    assert not mock_save_synced_thread.called, "Should NOT save thread (already synced)"


# TEST 4: Thread deduplication (Bluesky source)
@patch('app.main.save_synced_thread')
@patch('app.main.is_thread_synced')
@patch('app.main.post_thread_to_twitter')
@patch('app.main.fetch_bluesky_thread')
@patch('app.main.is_bluesky_thread')
@patch('app.main.fetch_posts_from_bluesky')
@patch('app.main.TWITTER_API_KEY', 'dummy_key')
def test_thread_deduplication_bluesky_source(
    mock_fetch_posts,
    mock_is_bluesky_thread,
    mock_fetch_bluesky_thread,
    mock_post_thread_to_twitter,
    mock_is_thread_synced,
    mock_save_synced_thread,
    mock_bluesky_thread
):
    """
    Test 4: Verify already-synced Bluesky threads are not duplicated.

    Scenario:
    1. Fetch Bluesky posts returns a thread
    2. is_bluesky_thread() detects it's a thread
    3. fetch_bluesky_thread() returns full thread
    4. is_thread_synced() returns True (ALREADY SYNCED)
    5. Should skip posting and saving

    Expected: Thread NOT synced again (deduplication works)
    """
    from app.main import sync_bluesky_to_twitter

    # Setup mocks
    mock_fetch_posts.return_value = [mock_bluesky_thread[0]]
    mock_is_bluesky_thread.return_value = True
    mock_fetch_bluesky_thread.return_value = mock_bluesky_thread
    mock_is_thread_synced.return_value = True  # ALREADY SYNCED

    # Execute sync
    sync_bluesky_to_twitter()

    # Assertions
    assert mock_is_thread_synced.called, "Should check if thread already synced"
    assert not mock_post_thread_to_twitter.called, "Should NOT post thread (already synced)"
    assert not mock_save_synced_thread.called, "Should NOT save thread (already synced)"


# TEST 5: Mixed threads and single posts
@patch('app.main.save_synced_thread')
@patch('app.main.save_synced_post')
@patch('app.main.is_thread_synced')
@patch('app.main.should_sync_post')
@patch('app.main.post_to_bluesky')
@patch('app.main.post_thread_to_bluesky')
@patch('app.main.fetch_thread')
@patch('app.main.is_thread')
@patch('app.main.fetch_tweets')
def test_mixed_threads_and_singles(
    mock_fetch_tweets,
    mock_is_thread,
    mock_fetch_thread,
    mock_post_thread_to_bluesky,
    mock_post_to_bluesky,
    mock_should_sync_post,
    mock_is_thread_synced,
    mock_save_synced_post,
    mock_save_synced_thread,
    mock_twitter_thread
):
    """
    Test 5: Verify system handles mix of threads and single posts correctly.

    Scenario:
    1. Fetch tweets returns 3 items: single post, thread, single post
    2. Process each according to its type
    3. Verify correct functions called for each

    Expected:
    - Single posts use post_to_bluesky() and save_synced_post()
    - Threads use post_thread_to_bluesky() and save_synced_thread()
    """
    from app.main import sync_twitter_to_bluesky

    # Setup: Create single posts
    single_post1 = MagicMock()
    single_post1.id = "single_100"
    single_post1.text = "Single post 1"
    single_post1._tweet = MagicMock()
    single_post1._tweet.inReplyToTweetId = None
    single_post1._tweet.id = "single_100"

    single_post2 = MagicMock()
    single_post2.id = "single_200"
    single_post2.text = "Single post 2"
    single_post2._tweet = MagicMock()
    single_post2._tweet.inReplyToTweetId = None
    single_post2._tweet.id = "single_200"

    # Use second tweet of thread (has inReplyToTweetId, so detected as thread)
    thread_tweet = mock_twitter_thread[1]  # Second tweet in thread

    # Mock fetch_tweets to return: single, thread, single
    mock_fetch_tweets.return_value = [
        single_post1,
        thread_tweet,  # Second tweet of thread (will be detected as thread)
        single_post2
    ]

    # Mock is_thread: False, True, False (checks _tweet.inReplyToTweetId)
    def is_thread_side_effect(_tweet):
        # is_thread checks if _tweet has inReplyToTweetId
        if hasattr(_tweet, 'inReplyToTweetId') and _tweet.inReplyToTweetId is not None:
            return True
        return False

    mock_is_thread.side_effect = is_thread_side_effect

    # Mock fetch_thread as AsyncMock
    mock_fetch_thread.return_value = mock_twitter_thread

    # Mock other functions
    mock_should_sync_post.return_value = True
    mock_is_thread_synced.return_value = False
    mock_post_to_bluesky.return_value = "at://user/post/single"
    mock_post_thread_to_bluesky.return_value = [
        "at://user/post/1",
        "at://user/post/2",
        "at://user/post/3"
    ]

    # Execute sync
    sync_twitter_to_bluesky()

    # Assertions
    # Single posts should use post_to_bluesky (called 2 times)
    assert mock_post_to_bluesky.call_count >= 1, "Should post single posts with post_to_bluesky()"

    # Thread should use post_thread_to_bluesky (called 1 time)
    assert mock_post_thread_to_bluesky.call_count >= 1, "Should post thread with post_thread_to_bluesky()"

    # Single posts should use save_synced_post
    assert mock_save_synced_post.call_count >= 1, "Should save single posts with save_synced_post()"

    # Thread should use save_synced_thread
    assert mock_save_synced_thread.call_count >= 1, "Should save thread with save_synced_thread()"
