import sys
import time
from unittest.mock import patch, MagicMock

# Create mock modules with necessary attributes
twitter_scraper_mock = MagicMock()
twitter_handler_mock = MagicMock()
bluesky_handler_mock = MagicMock()
config_mock = MagicMock()
config_mock.POLL_INTERVAL = 3600
config_mock.TWITTER_USERNAME = "testuser"
config_mock.BSKY_USERNAME = "test.bsky.social"
config_mock.TWITTER_API_KEY = "test_key"
db_handler_mock = MagicMock()
validation_mock = MagicMock()

# Mock modules before importing main
sys.modules['twitter_scraper'] = twitter_scraper_mock
sys.modules['twitter_handler'] = twitter_handler_mock
sys.modules['bluesky_handler'] = bluesky_handler_mock
sys.modules['config'] = config_mock
sys.modules['db_handler'] = db_handler_mock
sys.modules['validation'] = validation_mock

from app.main import main, sync_twitter_to_bluesky, sync_bluesky_to_twitter


# ===== Original Tests =====

def test_login_to_bluesky_called_on_startup():
    """Test that login_to_bluesky is called during initialization"""
    # Reset mocks
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Mock the functions
    twitter_scraper_mock.fetch_tweets.return_value = []
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = []

    # Use patch to mock time.sleep and make it raise exception after first call
    with patch("app.main.time.sleep") as mock_sleep:
        mock_sleep.side_effect = KeyboardInterrupt()

        # Act: Run main() and expect it to be interrupted
        try:
            main()
        except KeyboardInterrupt:
            pass

    # Assert: Verify login_to_bluesky was called
    bluesky_handler_mock.login_to_bluesky.assert_called_once()
    # Also verify migrate_database was called
    db_handler_mock.migrate_database.assert_called_once()


def test_main_validates_credentials_before_db_init():
    """
    Integration test verifying that validate_credentials() is called
    before migrate_database() in main().
    """
    # Reset mocks
    validation_mock.reset_mock()
    db_handler_mock.reset_mock()
    twitter_scraper_mock.reset_mock()

    # Setup: Mock the functions
    twitter_scraper_mock.fetch_tweets.return_value = []
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = []

    # Use patch to mock time.sleep and make it raise exception after first call
    with patch("app.main.time.sleep") as mock_sleep:
        mock_sleep.side_effect = KeyboardInterrupt()

        # Act: Run main() and expect it to be interrupted
        try:
            main()
        except KeyboardInterrupt:
            pass

    # Assert: Verify validate_credentials was called
    validation_mock.validate_credentials.assert_called_once()

    # Verify migrate_database was called
    db_handler_mock.migrate_database.assert_called_once()


def test_main_fails_fast_on_invalid_credentials():
    """
    Test that main() fails immediately if credentials are invalid,
    before attempting to migrate the database.
    """
    # Reset mocks
    validation_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Make validate_credentials raise ValueError
    validation_mock.validate_credentials.side_effect = ValueError(
        "Missing required environment variables: TWITTER_API_KEY"
    )

    # Act & Assert: Verify that calling main raises ValueError
    try:
        main()
        assert False, "Expected ValueError to be raised"
    except ValueError as e:
        assert "Missing required environment variables" in str(e)

    # Verify validate_credentials was called
    validation_mock.validate_credentials.assert_called_once()

    # Verify migrate_database was NOT called (because validation failed)
    db_handler_mock.migrate_database.assert_not_called()

    # Clean up: Reset the side_effect for other tests
    validation_mock.validate_credentials.side_effect = None


# ===== BIDIR-004: New Tests for Bidirectional Sync =====

def test_sync_twitter_to_bluesky_with_new_db():
    """
    Test sync_twitter_to_bluesky uses new DB schema (synced_posts).
    Verifies that should_sync_post and save_synced_post are called correctly.
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Create mock tweets
    mock_tweet1 = MagicMock()
    mock_tweet1.id = "123456"
    mock_tweet1.text = "Hello from Twitter"
    mock_tweet1._tweet = MagicMock()  # For is_thread check

    mock_tweet2 = MagicMock()
    mock_tweet2.id = "789012"
    mock_tweet2.text = "Another tweet"
    mock_tweet2._tweet = MagicMock()

    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet1, mock_tweet2]
    twitter_scraper_mock.is_thread.return_value = False  # Not threads

    # Mock DB functions
    db_handler_mock.should_sync_post.side_effect = [True, False]  # First yes, second no

    # Mock Bluesky post
    bluesky_handler_mock.post_to_bluesky.return_value = "at://did:plc:test/app.bsky.feed.post/abc123"

    # Mock asyncio.run for is_thread
    with patch("app.main.asyncio.run") as mock_asyncio:
        mock_asyncio.return_value = False

        # Act: Run sync
        sync_twitter_to_bluesky()

    # Assert: Verify should_sync_post was called for both tweets
    assert db_handler_mock.should_sync_post.call_count == 2
    db_handler_mock.should_sync_post.assert_any_call("Hello from Twitter", 'twitter', "123456")
    db_handler_mock.should_sync_post.assert_any_call("Another tweet", 'twitter', "789012")

    # Assert: Verify post_to_bluesky was only called for first tweet
    bluesky_handler_mock.post_to_bluesky.assert_called_once_with("Hello from Twitter")

    # Assert: Verify save_synced_post was only called for first tweet
    db_handler_mock.save_synced_post.assert_called_once_with(
        twitter_id="123456",
        bluesky_uri="at://did:plc:test/app.bsky.feed.post/abc123",
        source='twitter',
        synced_to='bluesky',
        content="Hello from Twitter"
    )


def test_sync_bluesky_to_twitter_success():
    """
    Test NEW sync_bluesky_to_twitter function.
    Verifies posts are read from Bluesky and synced to Twitter.
    """
    # Reset mocks
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Create mock Bluesky posts
    mock_post1 = MagicMock()
    mock_post1.uri = "at://did:plc:test/app.bsky.feed.post/xyz123"
    mock_post1.text = "Hello from Bluesky"

    mock_post2 = MagicMock()
    mock_post2.uri = "at://did:plc:test/app.bsky.feed.post/xyz456"
    mock_post2.text = "Another post from Bluesky"

    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post1, mock_post2]

    # Mock DB functions
    db_handler_mock.should_sync_post.side_effect = [True, False]  # First yes, second no

    # Mock Twitter post
    twitter_handler_mock.post_to_twitter.return_value = "987654321"

    # Mock config to have Twitter API credentials
    with patch("app.main.TWITTER_API_KEY", "test_key"):
        with patch("app.main.BSKY_USERNAME", "test.bsky.social"):
            # Act: Run sync
            sync_bluesky_to_twitter()

    # Assert: Verify fetch_posts_from_bluesky was called
    bluesky_handler_mock.fetch_posts_from_bluesky.assert_called_once_with("test.bsky.social", count=10)

    # Assert: Verify should_sync_post was called for both posts
    assert db_handler_mock.should_sync_post.call_count == 2
    db_handler_mock.should_sync_post.assert_any_call("Hello from Bluesky", 'bluesky', "at://did:plc:test/app.bsky.feed.post/xyz123")

    # Assert: Verify post_to_twitter was only called for first post
    twitter_handler_mock.post_to_twitter.assert_called_once_with("Hello from Bluesky")

    # Assert: Verify save_synced_post was only called for first post
    db_handler_mock.save_synced_post.assert_called_once_with(
        twitter_id="987654321",
        bluesky_uri="at://did:plc:test/app.bsky.feed.post/xyz123",
        source='bluesky',
        synced_to='twitter',
        content="Hello from Bluesky"
    )


def test_bidirectional_sync_no_loop():
    """
    Critical test: Verify same content doesn't create infinite loop.

    Scenario:
    1. Post "Test" from Twitter → Bluesky
    2. System detects same post in Bluesky
    3. should_sync_post returns False (hash already exists)
    4. No sync back to Twitter → No loop!
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Same content on both platforms
    mock_tweet = MagicMock()
    mock_tweet.id = "111111"
    mock_tweet.text = "Test content"
    mock_tweet._tweet = MagicMock()

    mock_post = MagicMock()
    mock_post.uri = "at://did:plc:test/app.bsky.feed.post/aaa111"
    mock_post.text = "Test content"  # Same content!

    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post]

    # Mock DB: First sync (Twitter→Bluesky) succeeds
    # Second check (Bluesky→Twitter) fails because hash exists
    db_handler_mock.should_sync_post.side_effect = [
        True,   # Twitter→Bluesky: sync
        False   # Bluesky→Twitter: SKIP (hash exists)
    ]

    bluesky_handler_mock.post_to_bluesky.return_value = "at://did:plc:test/app.bsky.feed.post/bbb222"

    with patch("app.main.asyncio.run", return_value=False):
        with patch("app.main.TWITTER_API_KEY", "test_key"):
            with patch("app.main.BSKY_USERNAME", "test.bsky.social"):
                # Act: Run both sync directions
                sync_twitter_to_bluesky()
                sync_bluesky_to_twitter()

    # Assert: Twitter→Bluesky happened
    bluesky_handler_mock.post_to_bluesky.assert_called_once()

    # Assert: Bluesky→Twitter did NOT happen (no loop!)
    twitter_handler_mock.post_to_twitter.assert_not_called()

    # Assert: should_sync_post was called twice (once per direction)
    assert db_handler_mock.should_sync_post.call_count == 2

    # Clean up: Reset side_effect for next tests
    db_handler_mock.should_sync_post.side_effect = None


def test_sync_same_content_different_platforms():
    """
    Test that hash deduplication prevents syncing same content.
    Even if posted manually on both platforms, hash collision is detected.
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Both posts have same content
    same_content = "Duplicate content"

    # Mock: should_sync_post returns False for duplicate hash
    db_handler_mock.should_sync_post.return_value = False

    # Create mock tweet and post with same content
    mock_tweet = MagicMock()
    mock_tweet.id = "222222"
    mock_tweet.text = same_content
    mock_tweet._tweet = MagicMock()

    mock_post = MagicMock()
    mock_post.uri = "at://did:plc:test/app.bsky.feed.post/ccc333"
    mock_post.text = same_content

    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    twitter_scraper_mock.fetch_tweets.side_effect = None  # Clear any previous side_effect
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post]

    with patch("app.main.asyncio.run", return_value=False):
        with patch("app.main.TWITTER_API_KEY", "test_key"):
            with patch("app.main.BSKY_USERNAME", "test.bsky.social"):
                # Act: Try to sync in both directions
                sync_twitter_to_bluesky()
                sync_bluesky_to_twitter()

    # Assert: No posts were made (both were skipped due to duplicate hash)
    bluesky_handler_mock.post_to_bluesky.assert_not_called()
    twitter_handler_mock.post_to_twitter.assert_not_called()

    # Assert: should_sync_post was called for both
    assert db_handler_mock.should_sync_post.call_count == 2


def test_main_loop_handles_missing_twitter_api_creds():
    """
    Test graceful degradation to unidirectional sync when Twitter API credentials are missing.

    When TWITTER_API_KEY is None/empty:
    - sync_twitter_to_bluesky() should run (uses scraping, not API)
    - sync_bluesky_to_twitter() should skip gracefully (needs API for writes)
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Setup: Mock posts
    mock_tweet = MagicMock()
    mock_tweet.id = "333333"
    mock_tweet.text = "Tweet without API"
    mock_tweet._tweet = MagicMock()

    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    twitter_scraper_mock.fetch_tweets.side_effect = None  # Clear any previous side_effect
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = []
    db_handler_mock.should_sync_post.return_value = True
    db_handler_mock.should_sync_post.side_effect = None  # Clear any previous side_effect
    bluesky_handler_mock.post_to_bluesky.return_value = "at://test/uri"

    # Mock config WITHOUT Twitter API credentials
    with patch("app.main.asyncio.run", return_value=False):
        with patch("app.main.TWITTER_API_KEY", None):  # No API key!
            with patch("app.main.BSKY_USERNAME", "test.bsky.social"):
                # Act: Run both sync functions
                sync_twitter_to_bluesky()
                sync_bluesky_to_twitter()

    # Assert: Twitter→Bluesky happened (uses scraping)
    bluesky_handler_mock.post_to_bluesky.assert_called_once()

    # Assert: Bluesky→Twitter did NOT happen (no API credentials)
    twitter_handler_mock.post_to_twitter.assert_not_called()
    bluesky_handler_mock.fetch_posts_from_bluesky.assert_not_called()


def test_sync_continues_on_partial_failure():
    """
    Test that if one sync direction fails, the other continues.

    Scenario:
    - sync_twitter_to_bluesky() raises exception
    - sync_bluesky_to_twitter() should still run
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()
    validation_mock.reset_mock()

    # Clear any previous side_effects
    db_handler_mock.should_sync_post.side_effect = None
    twitter_scraper_mock.fetch_tweets.side_effect = None

    # Setup: Mock successful Bluesky post
    mock_post = MagicMock()
    mock_post.uri = "at://did:plc:test/app.bsky.feed.post/success"
    mock_post.text = "This should work"

    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post]
    db_handler_mock.should_sync_post.return_value = True
    twitter_handler_mock.post_to_twitter.return_value = "999999"

    # Mock: Twitter scraper fails ONLY for this test
    twitter_scraper_mock.fetch_tweets.side_effect = Exception("Twitter API error")

    with patch("app.main.TWITTER_API_KEY", "test_key"):
        with patch("app.main.BSKY_USERNAME", "test.bsky.social"):
            # Act: Try both syncs, expecting Twitter→Bluesky to fail
            try:
                sync_twitter_to_bluesky()
            except Exception:
                pass  # Expected

            # Reset side_effect before running Bluesky→Twitter
            twitter_scraper_mock.fetch_tweets.side_effect = None

            # Bluesky→Twitter should still work
            sync_bluesky_to_twitter()

    # Assert: Twitter→Bluesky failed (fetch_tweets raised exception)
    bluesky_handler_mock.post_to_bluesky.assert_not_called()

    # Assert: Bluesky→Twitter succeeded despite the other direction failing
    twitter_handler_mock.post_to_twitter.assert_called_once_with("This should work")
    db_handler_mock.save_synced_post.assert_called_once()


def test_sync_twitter_to_bluesky_handles_threads():
    """
    Test that threads are properly handled in sync_twitter_to_bluesky.
    Verifies thread detection and posting maintains backward compatibility.
    """
    # Reset mocks
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()

    # Clear any previous side_effects
    twitter_scraper_mock.fetch_tweets.side_effect = None
    db_handler_mock.should_sync_post.side_effect = None

    # Setup: Mock thread tweet
    mock_thread_tweet = MagicMock()
    mock_thread_tweet.id = "555555"
    mock_thread_tweet.text = "Thread tweet 1/2"
    mock_thread_tweet._tweet = MagicMock()

    # Mock thread components
    mock_tweet1 = MagicMock()
    mock_tweet1.id = "555555"
    mock_tweet1.text = "Thread tweet 1/2"

    mock_tweet2 = MagicMock()
    mock_tweet2.id = "555556"
    mock_tweet2.text = "Thread tweet 2/2"

    twitter_scraper_mock.fetch_tweets.return_value = [mock_thread_tweet]
    twitter_scraper_mock.TweetAdapter = MagicMock(side_effect=lambda x: x)  # Pass-through

    # Mock DB
    db_handler_mock.should_sync_post.return_value = True

    # Mock thread posting
    bluesky_handler_mock.post_thread_to_bluesky.return_value = [
        "at://test/uri1",
        "at://test/uri2"
    ]

    with patch("app.main.asyncio.run") as mock_asyncio:
        # First call: is_thread returns True
        # Second call: fetch_thread returns thread
        mock_asyncio.side_effect = [
            True,  # is_thread
            [mock_tweet1, mock_tweet2]  # fetch_thread
        ]

        with patch("app.main.TWITTER_USERNAME", "testuser"):
            # Act: Run sync
            sync_twitter_to_bluesky()

    # Assert: Thread was posted
    bluesky_handler_mock.post_thread_to_bluesky.assert_called_once()

    # Assert: save_synced_post was called for each tweet in thread
    assert db_handler_mock.save_synced_post.call_count == 2
