import sys
from unittest.mock import patch, MagicMock

# Create mock modules with necessary attributes
twitter_handler_mock = MagicMock()
bluesky_handler_mock = MagicMock()
config_mock = MagicMock()
config_mock.POLL_INTERVAL = 3600
db_handler_mock = MagicMock()
validation_mock = MagicMock()

# Mock modules before importing main
sys.modules['twitter_handler'] = twitter_handler_mock
sys.modules['bluesky_handler'] = bluesky_handler_mock
sys.modules['config'] = config_mock
sys.modules['db_handler'] = db_handler_mock
sys.modules['validation'] = validation_mock

from app.main import main

def test_login_to_bluesky_called_on_startup():
    """Test that login_to_bluesky is called during initialization"""
    # Setup: Mock the functions
    twitter_handler_mock.fetch_tweets.return_value = []

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
    # Also verify initialize_db was called
    db_handler_mock.initialize_db.assert_called_once()


def test_main_validates_credentials_before_db_init():
    """
    Integration test verifying that validate_credentials() is called
    before initialize_db() in main().
    """
    # Reset mocks
    validation_mock.reset_mock()
    db_handler_mock.reset_mock()
    twitter_handler_mock.reset_mock()

    # Setup: Mock the functions
    twitter_handler_mock.fetch_tweets.return_value = []

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

    # Verify initialize_db was called
    db_handler_mock.initialize_db.assert_called_once()


def test_main_fails_fast_on_invalid_credentials():
    """
    Test that main() fails immediately if credentials are invalid,
    before attempting to initialize the database.
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

    # Verify initialize_db was NOT called (because validation failed)
    db_handler_mock.initialize_db.assert_not_called()

    # Clean up: Reset the side_effect for other tests
    validation_mock.validate_credentials.side_effect = None
