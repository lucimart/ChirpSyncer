import pytest
from unittest.mock import patch
from app.validation import validate_credentials


def test_validate_credentials_all_present():
    """Test that validation passes when all credentials are present."""
    with patch('app.validation.TWITTER_API_KEY', 'test_key'), \
         patch('app.validation.TWITTER_API_SECRET', 'test_secret'), \
         patch('app.validation.TWITTER_ACCESS_TOKEN', 'test_token'), \
         patch('app.validation.TWITTER_ACCESS_SECRET', 'test_access_secret'), \
         patch('app.validation.BSKY_USERNAME', 'test_user'), \
         patch('app.validation.BSKY_PASSWORD', 'test_pass'):
        # Should not raise any exception
        validate_credentials()


def test_validate_credentials_missing():
    """Test that validation raises ValueError when some credentials are None."""
    with patch('app.validation.TWITTER_API_KEY', None), \
         patch('app.validation.TWITTER_API_SECRET', 'test_secret'), \
         patch('app.validation.TWITTER_ACCESS_TOKEN', 'test_token'), \
         patch('app.validation.TWITTER_ACCESS_SECRET', 'test_access_secret'), \
         patch('app.validation.BSKY_USERNAME', None), \
         patch('app.validation.BSKY_PASSWORD', 'test_pass'):
        with pytest.raises(ValueError) as exc_info:
            validate_credentials()
        assert "Missing required environment variables" in str(exc_info.value)
        assert "TWITTER_API_KEY" in str(exc_info.value)
        assert "BSKY_USERNAME" in str(exc_info.value)


def test_validate_credentials_empty():
    """Test that validation raises ValueError when credentials are empty strings."""
    with patch('app.validation.TWITTER_API_KEY', ''), \
         patch('app.validation.TWITTER_API_SECRET', 'test_secret'), \
         patch('app.validation.TWITTER_ACCESS_TOKEN', 'test_token'), \
         patch('app.validation.TWITTER_ACCESS_SECRET', 'test_access_secret'), \
         patch('app.validation.BSKY_USERNAME', '   '), \
         patch('app.validation.BSKY_PASSWORD', 'test_pass'):
        with pytest.raises(ValueError) as exc_info:
            validate_credentials()
        assert "Missing required environment variables" in str(exc_info.value)
        assert "TWITTER_API_KEY" in str(exc_info.value)
        assert "BSKY_USERNAME" in str(exc_info.value)
