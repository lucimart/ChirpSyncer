import pytest
import sys
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


# ===== SPRINT 6: Multi-User Support Tests =====

class TestGetMasterKey:
    """Tests for get_master_key function"""

    def test_get_master_key_success(self):
        """Test that get_master_key returns 32-byte key when SECRET_KEY is set"""
        from app.main import get_master_key
        with patch.dict('os.environ', {'SECRET_KEY': 'test-secret-key'}):
            key = get_master_key()
            assert len(key) == 32
            assert isinstance(key, bytes)

    def test_get_master_key_raises_on_missing_secret(self):
        """Test that get_master_key raises ValueError when SECRET_KEY is missing"""
        from app.main import get_master_key
        with patch.dict('os.environ', {}, clear=True):
            # Remove SECRET_KEY if it exists
            import os
            if 'SECRET_KEY' in os.environ:
                del os.environ['SECRET_KEY']
            try:
                get_master_key()
                assert False, "Expected ValueError"
            except ValueError as e:
                assert "SECRET_KEY" in str(e)


class TestInitMultiUserSystem:
    """Tests for init_multi_user_system function"""

    def test_init_multi_user_system_creates_tables(self):
        """Test that init_multi_user_system initializes all required tables"""
        from app.main import init_multi_user_system
        with patch('app.main.UserManager') as mock_um:
            with patch('app.main.CredentialManager') as mock_cm:
                with patch('app.main.UserSettings') as mock_us:
                    with patch('app.main.get_master_key', return_value=b'x' * 32):
                        init_multi_user_system()
                        mock_um.return_value.init_db.assert_called_once()
                        mock_cm.return_value.init_db.assert_called_once()
                        mock_us.return_value.init_db.assert_called_once()


class TestSyncBlueskyToTwitterNoCredentials:
    """Test sync_bluesky_to_twitter without credentials"""

    def test_sync_bluesky_to_twitter_skips_without_api_key(self):
        """Test that sync skips gracefully when Twitter API key is missing"""
        bluesky_handler_mock.reset_mock()
        twitter_handler_mock.reset_mock()

        with patch('app.main.TWITTER_API_KEY', None):
            sync_bluesky_to_twitter()

        # Should not fetch any posts or attempt to sync
        bluesky_handler_mock.fetch_posts_from_bluesky.assert_not_called()
        twitter_handler_mock.post_to_twitter.assert_not_called()



class TestEnsureAdminUser:
    """Tests for ensure_admin_user function"""

    def test_ensure_admin_user_skips_if_users_exist(self):
        """Test that ensure_admin_user skips creation if users already exist"""
        from app.main import ensure_admin_user

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = "existing_user"

        with patch("app.main.UserManager") as mock_um:
            mock_um.return_value.list_users.return_value = [mock_user]
            ensure_admin_user()
            mock_um.return_value.create_user.assert_not_called()


class TestSyncUserTwitterToBluesky:
    """Tests for sync_user_twitter_to_bluesky function"""

    def test_sync_user_twitter_to_bluesky_syncs_tweets(self):
        """Test that sync_user_twitter_to_bluesky syncs tweets for a user"""
        from app.main import sync_user_twitter_to_bluesky

        twitter_scraper_mock.reset_mock()
        bluesky_handler_mock.reset_mock()
        db_handler_mock.reset_mock()
        db_handler_mock.should_sync_post.side_effect = None
        twitter_scraper_mock.fetch_tweets.side_effect = None

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = "testuser"

        mock_tweet = MagicMock()
        mock_tweet.id = "123456"
        mock_tweet.text = "Test tweet"
        mock_tweet._tweet = MagicMock()

        twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
        db_handler_mock.should_sync_post.return_value = True
        bluesky_handler_mock.post_to_bluesky.return_value = "at://test/uri"

        twitter_creds = {"username": "twitter_user", "password": "twitter_pass"}
        bluesky_creds = {"username": "bsky_user", "password": "bsky_pass"}

        with patch("app.main.asyncio.run", return_value=False):
            sync_user_twitter_to_bluesky(mock_user, twitter_creds, bluesky_creds)

        bluesky_handler_mock.login_to_bluesky.assert_called_once()
        bluesky_handler_mock.post_to_bluesky.assert_called_once_with("Test tweet")


class TestSyncUserBlueskyToTwitter:
    """Tests for sync_user_bluesky_to_twitter function"""

    def test_sync_user_bluesky_to_twitter_skips_without_api_key(self):
        """Test that sync skips when user has no Twitter API credentials"""
        from app.main import sync_user_bluesky_to_twitter

        bluesky_handler_mock.reset_mock()
        twitter_handler_mock.reset_mock()

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = "testuser"

        twitter_api_creds = {}
        bluesky_creds = {"username": "bsky_user", "password": "bsky_pass"}

        sync_user_bluesky_to_twitter(mock_user, twitter_api_creds, bluesky_creds)

        bluesky_handler_mock.fetch_posts_from_bluesky.assert_not_called()

    def test_sync_user_bluesky_to_twitter_syncs_posts(self):
        """Test that sync_user_bluesky_to_twitter syncs posts for a user"""
        from app.main import sync_user_bluesky_to_twitter

        bluesky_handler_mock.reset_mock()
        twitter_handler_mock.reset_mock()
        db_handler_mock.reset_mock()
        db_handler_mock.should_sync_post.side_effect = None

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = "testuser"

        mock_post = MagicMock()
        mock_post.uri = "at://test/post/123"
        mock_post.text = "Test bluesky post"

        bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post]
        db_handler_mock.should_sync_post.return_value = True
        twitter_handler_mock.post_to_twitter.return_value = "987654"

        twitter_api_creds = {"api_key": "key", "api_secret": "secret"}
        bluesky_creds = {"username": "bsky_user", "password": "bsky_pass"}

        sync_user_bluesky_to_twitter(mock_user, twitter_api_creds, bluesky_creds)

        twitter_handler_mock.post_to_twitter.assert_called_once_with("Test bluesky post")


class TestSyncAllUsers:
    """Tests for sync_all_users function"""

    def test_sync_all_users_skips_when_no_users(self):
        """Test that sync_all_users handles empty user list"""
        from app.main import sync_all_users

        with patch("app.main.UserManager") as mock_um:
            with patch("app.main.CredentialManager") as mock_cm:
                with patch("app.main.UserSettings") as mock_us:
                    with patch("app.main.get_master_key", return_value=b"x" * 32):
                        mock_um.return_value.list_users.return_value = []

                        sync_all_users()

                        mock_um.return_value.list_users.assert_called_once_with(active_only=True)

    def test_sync_all_users_skips_user_without_bluesky_creds(self):
        """Test that sync_all_users skips users without Bluesky credentials"""
        from app.main import sync_all_users

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = "testuser"

        with patch("app.main.UserManager") as mock_um:
            with patch("app.main.CredentialManager") as mock_cm:
                with patch("app.main.UserSettings") as mock_us:
                    with patch("app.main.get_master_key", return_value=b"x" * 32):
                        mock_um.return_value.list_users.return_value = [mock_user]
                        mock_us.return_value.get_all.return_value = {}
                        mock_cm.return_value.get_credentials.return_value = None

                        sync_all_users()

                        mock_cm.return_value.get_credentials.assert_any_call(1, "bluesky", "api")


class TestMainMultiUserMode:
    """Tests for main() in multi-user mode"""

    def test_main_multi_user_mode_initializes_system(self):
        """Test that main() in multi-user mode initializes multi-user system"""
        validation_mock.reset_mock()
        db_handler_mock.reset_mock()

        with patch("app.main.MULTI_USER_ENABLED", True):
            with patch("app.main.init_multi_user_system") as mock_init:
                with patch("app.main.ensure_admin_user") as mock_admin:
                    with patch("app.main.sync_all_users") as mock_sync:
                        with patch("app.main.time.sleep") as mock_sleep:
                            mock_sleep.side_effect = KeyboardInterrupt()

                            try:
                                main()
                            except KeyboardInterrupt:
                                pass

                            mock_init.assert_called_once()
                            mock_admin.assert_called_once()

    def test_main_multi_user_mode_handles_init_error(self):
        """Test that main() handles multi-user system init errors"""
        validation_mock.reset_mock()

        with patch("app.main.MULTI_USER_ENABLED", True):
            with patch("app.main.init_multi_user_system") as mock_init:
                mock_init.side_effect = Exception("Init failed")

                try:
                    main()
                    assert False, "Expected exception"
                except Exception as e:
                    assert "Init failed" in str(e)


class TestEnsureAdminUserCreation:
    """Tests for ensure_admin_user when no users exist"""

    def test_ensure_admin_user_creates_admin_when_no_users(self):
        """Test admin user creation when no users exist"""
        from app.main import ensure_admin_user

        with patch('app.main.UserManager') as mock_um,              patch('app.main.get_master_key', return_value=b'test_key'),              patch('app.main.CredentialManager') as mock_cm,              patch('app.main.os.getenv') as mock_getenv,              patch('app.main.TWITTER_USERNAME', 'twitter_user'),              patch('app.main.TWITTER_PASSWORD', 'twitter_pass'),              patch('app.main.TWITTER_EMAIL', 'twitter@email.com'),              patch('app.main.TWITTER_EMAIL_PASSWORD', 'email_pass'),              patch('app.main.TWITTER_API_KEY', 'api_key'),              patch('app.main.BSKY_USERNAME', 'bsky_user'),              patch('app.main.BSKY_PASSWORD', 'bsky_pass'):
            
            mock_um.return_value.list_users.return_value = []
            mock_um.return_value.create_user.return_value = 1
            mock_getenv.side_effect = lambda k, default=None: {
                'ADMIN_PASSWORD': 'TestP@ss123',
                'ADMIN_EMAIL': 'admin@test.com'
            }.get(k, default)
            
            ensure_admin_user()
            
            mock_um.return_value.create_user.assert_called_once()
            assert mock_cm.return_value.save_credentials.call_count >= 1


    def test_ensure_admin_user_generates_password_if_not_set(self):
        """Test password generation when ADMIN_PASSWORD not set"""
        from app.main import ensure_admin_user

        with patch('app.main.UserManager') as mock_um, \
             patch('app.main.get_master_key', return_value=b'test_key'), \
             patch('app.main.CredentialManager') as mock_cm, \
             patch('app.main.os.getenv', return_value=None), \
             patch('app.main.TWITTER_USERNAME', None), \
             patch('app.main.TWITTER_PASSWORD', None), \
             patch('app.main.TWITTER_API_KEY', None), \
             patch('app.main.BSKY_USERNAME', None), \
             patch('app.main.BSKY_PASSWORD', None), \
             patch('getpass.getpass', return_value='GeneratedPass123!'):

            mock_um.return_value.list_users.return_value = []
            mock_um.return_value.create_user.return_value = 1

            ensure_admin_user()

            mock_um.return_value.create_user.assert_called_once()


class TestSyncAllUsersPaths:
    """Additional tests for sync_all_users edge cases"""

    def test_sync_all_users_with_twitter_disabled(self):
        """Test sync when Twitter to Bluesky is disabled"""
        from app.main import sync_all_users

        mock_user = MagicMock()
        mock_user.id = 1
        mock_user.username = 'testuser'

        mock_settings = {
            'twitter_to_bluesky_enabled': False,
            'bluesky_to_twitter_enabled': True
        }

        with patch('app.main.UserManager') as mock_um,              patch('app.main.get_master_key', return_value=b'test_key'),              patch('app.main.CredentialManager') as mock_cm,              patch('app.main.UserSettings') as mock_us,              patch('app.main.sync_user_twitter_to_bluesky') as mock_tw_to_bsky,              patch('app.main.sync_user_bluesky_to_twitter') as mock_bsky_to_tw,              patch('app.main.log_audit'):
            
            mock_um.return_value.list_users.return_value = [mock_user]
            mock_us.return_value.get_all.return_value = mock_settings
            mock_cm.return_value.get_credentials.side_effect = [
                {'username': 'bsky_user', 'password': 'bsky_pass'},
                None,
                {'api_key': 'key', 'api_secret': 'secret'}
            ]
            
            sync_all_users()
            
            mock_tw_to_bsky.assert_not_called()


    def test_sync_all_users_with_sync_error(self):
        """Test sync continues after user error"""
        from app.main import sync_all_users

        mock_user1 = MagicMock()
        mock_user1.id = 1
        mock_user1.username = 'user1'

        mock_user2 = MagicMock()
        mock_user2.id = 2
        mock_user2.username = 'user2'

        with patch('app.main.UserManager') as mock_um,              patch('app.main.get_master_key', return_value=b'test_key'),              patch('app.main.CredentialManager') as mock_cm,              patch('app.main.UserSettings') as mock_us,              patch('app.main.sync_user_twitter_to_bluesky', side_effect=Exception('Sync failed')),              patch('app.main.log_audit'):
            
            mock_um.return_value.list_users.return_value = [mock_user1, mock_user2]
            mock_us.return_value.get_all.return_value = {
                'twitter_to_bluesky_enabled': True,
                'bluesky_to_twitter_enabled': False
            }
            mock_cm.return_value.get_credentials.side_effect = [
                {'username': 'bsky_user', 'password': 'bsky_pass'},
                {'username': 'tw_user', 'password': 'tw_pass'},
                None,
                {'username': 'bsky_user', 'password': 'bsky_pass'},
                {'username': 'tw_user', 'password': 'tw_pass'},
                None
            ]
            
            sync_all_users()


class TestMainSingleUserMode:
    """Tests for main() in single-user mode"""

    def test_main_single_user_mode_with_api_key(self):
        """Test single-user mode with Twitter API key"""
        from app.main import main

        with patch('app.main.MULTI_USER_ENABLED', False),              patch('app.main.TWITTER_API_KEY', 'api_key'),              patch('app.main.validate_credentials'),              patch('app.main.migrate_database'),              patch('app.main.login_to_bluesky'),              patch('app.main.sync_twitter_to_bluesky'),              patch('app.main.sync_bluesky_to_twitter'),              patch('app.main.time.sleep', side_effect=KeyboardInterrupt):
            
            main()


    def test_main_single_user_mode_without_api_key(self):
        """Test single-user mode without Twitter API key"""
        from app.main import main

        with patch('app.main.MULTI_USER_ENABLED', False),              patch('app.main.TWITTER_API_KEY', None),              patch('app.main.validate_credentials'),              patch('app.main.migrate_database'),              patch('app.main.login_to_bluesky'),              patch('app.main.sync_twitter_to_bluesky'),              patch('app.main.sync_bluesky_to_twitter'),              patch('app.main.time.sleep', side_effect=KeyboardInterrupt):
            
            main()


    def test_main_single_user_mode_sync_error_recovery(self):
        """Test single-user mode handles sync error and recovers"""
        from app.main import main

        call_count = [0]
        def mock_sleep(seconds):
            call_count[0] += 1
            if call_count[0] > 1:
                raise KeyboardInterrupt
            return None

        with patch('app.main.MULTI_USER_ENABLED', False),              patch('app.main.TWITTER_API_KEY', None),              patch('app.main.validate_credentials'),              patch('app.main.migrate_database'),              patch('app.main.login_to_bluesky'),              patch('app.main.sync_twitter_to_bluesky', side_effect=Exception('Sync error')),              patch('app.main.sync_bluesky_to_twitter'),              patch('app.main.time.sleep', side_effect=mock_sleep):
            
            main()


# ===== Additional Coverage Tests =====

def test_sync_twitter_to_bluesky_thread_fallback():
    """Test fallback when thread cannot be fetched"""
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()
    
    # Create mock tweet
    mock_tweet = MagicMock()
    mock_tweet.id = "12345"
    mock_tweet.text = "Test tweet"
    mock_tweet._tweet = MagicMock()
    
    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    db_handler_mock.should_sync_post.return_value = True
    twitter_scraper_mock.is_thread.return_value = True
    twitter_scraper_mock.fetch_thread.return_value = []  # Empty thread = fallback
    bluesky_handler_mock.post_to_bluesky.return_value = "bsky://uri"
    
    with patch("app.main.asyncio.run") as mock_run:
        mock_run.side_effect = [True, []]  # is_thread=True, fetch_thread=[]
        
        sync_twitter_to_bluesky()
    
    bluesky_handler_mock.post_to_bluesky.assert_called_once()


def test_sync_twitter_to_bluesky_exception_fallback():
    """Test exception handling with fallback to single tweet"""
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()
    
    mock_tweet = MagicMock()
    mock_tweet.id = "12345"
    mock_tweet.text = "Test tweet"
    mock_tweet._tweet = MagicMock()
    
    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    db_handler_mock.should_sync_post.return_value = True
    bluesky_handler_mock.post_to_bluesky.return_value = "bsky://uri"
    
    with patch("app.main.asyncio.run") as mock_run:
        mock_run.side_effect = Exception("Thread check failed")
        
        sync_twitter_to_bluesky()
    
    # Fallback should post as single tweet
    bluesky_handler_mock.post_to_bluesky.assert_called()


def test_sync_twitter_to_bluesky_complete_failure():
    """Test complete failure when even fallback fails"""
    twitter_scraper_mock.reset_mock()
    bluesky_handler_mock.reset_mock()
    db_handler_mock.reset_mock()
    
    mock_tweet = MagicMock()
    mock_tweet.id = "12345"
    mock_tweet.text = "Test tweet"
    mock_tweet._tweet = MagicMock()
    
    twitter_scraper_mock.fetch_tweets.return_value = [mock_tweet]
    db_handler_mock.should_sync_post.return_value = True
    bluesky_handler_mock.post_to_bluesky.side_effect = Exception("Post failed")
    
    with patch("app.main.asyncio.run") as mock_run:
        mock_run.side_effect = Exception("Thread check failed")
        
        # Should not raise, just log error
        sync_twitter_to_bluesky()


def test_sync_bluesky_to_twitter_exception():
    """Test exception handling in bluesky to twitter sync"""
    bluesky_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()
    db_handler_mock.reset_mock()
    
    mock_post = MagicMock()
    mock_post.uri = "at://did/post/123"
    mock_post.text = "Test post"
    
    bluesky_handler_mock.fetch_posts_from_bluesky.return_value = [mock_post]
    db_handler_mock.should_sync_post.return_value = True
    twitter_handler_mock.post_to_twitter.side_effect = Exception("Twitter API error")
    
    # Should not raise
    sync_bluesky_to_twitter()


def test_get_master_key():
    """Test get_master_key returns correct key"""
    from app.main import get_master_key
    
    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key'}):
        key = get_master_key()
        assert len(key) == 32  # SHA-256 = 32 bytes
        assert isinstance(key, bytes)


def test_get_master_key_missing():
    """Test get_master_key raises when SECRET_KEY missing"""
    from app.main import get_master_key
    
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(ValueError) as exc_info:
            get_master_key()
        assert 'SECRET_KEY' in str(exc_info.value)


def test_init_multi_user_system():
    """Test init_multi_user_system initializes all components"""
    from app.main import init_multi_user_system
    
    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key'}):
        with patch('app.main.UserManager') as mock_um:
            with patch('app.main.CredentialManager') as mock_cm:
                with patch('app.main.UserSettings') as mock_us:
                    init_multi_user_system()
                    
                    mock_um.return_value.init_db.assert_called_once()
                    mock_cm.return_value.init_db.assert_called_once()
                    mock_us.return_value.init_db.assert_called_once()


def test_init_multi_user_system_exception():
    """Test init_multi_user_system handles exceptions"""
    from app.main import init_multi_user_system
    
    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key'}):
        with patch('app.main.UserManager') as mock_um:
            mock_um.return_value.init_db.side_effect = Exception("DB error")
            
            with pytest.raises(Exception):
                init_multi_user_system()


def test_ensure_admin_user_existing_users():
    """Test ensure_admin_user skips when users exist"""
    from app.main import ensure_admin_user
    
    with patch('app.main.UserManager') as mock_um:
        mock_um.return_value.list_users.return_value = [{'id': 1, 'username': 'admin'}]
        
        ensure_admin_user()
        
        mock_um.return_value.create_user.assert_not_called()


def test_ensure_admin_user_creates_admin():
    """Test ensure_admin_user creates admin when no users"""
    from app.main import ensure_admin_user
    
    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key', 'ADMIN_PASSWORD': 'testpass'}):
        with patch('app.main.UserManager') as mock_um:
            with patch('app.main.CredentialManager'):
                mock_um.return_value.list_users.return_value = []
                mock_um.return_value.create_user.return_value = 1
                
                ensure_admin_user()
                
                mock_um.return_value.create_user.assert_called_once()


def test_ensure_admin_user_generates_password():
    """Test ensure_admin_user generates password when not in env"""
    from app.main import ensure_admin_user

    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key'}, clear=True):
        with patch('app.main.UserManager') as mock_um:
            with patch('app.main.CredentialManager'):
                with patch('getpass.getpass', return_value='GeneratedPass123!'):
                    mock_um.return_value.list_users.return_value = []
                    mock_um.return_value.create_user.return_value = 1

                    ensure_admin_user()

                    # Should have created user with generated password
                    mock_um.return_value.create_user.assert_called_once()


def test_ensure_admin_user_exception():
    """Test ensure_admin_user handles exceptions"""
    from app.main import ensure_admin_user
    
    with patch.dict('os.environ', {'SECRET_KEY': 'test_secret_key', 'ADMIN_PASSWORD': 'testpass'}):
        with patch('app.main.UserManager') as mock_um:
            mock_um.return_value.list_users.return_value = []
            mock_um.return_value.create_user.side_effect = Exception("User creation failed")
            
            with pytest.raises(Exception):
                ensure_admin_user()
