import pytest
from unittest.mock import patch
from app.validation import validate_credentials


def test_validate_credentials_all_present():
    """Test that validation passes when all credentials are present."""
    with patch('app.core.config.TWITTER_USERNAME', 'test_twitter_user'), \
         patch('app.core.config.TWITTER_PASSWORD', 'test_twitter_pass'), \
         patch('app.core.config.TWITTER_EMAIL', 'test@example.com'), \
         patch('app.core.config.TWITTER_EMAIL_PASSWORD', 'test_email_pass'), \
         patch('app.core.config.BSKY_USERNAME', 'test_user'), \
         patch('app.core.config.BSKY_PASSWORD', 'test_pass'):
        # Should not raise any exception
        validate_credentials()


def test_validate_credentials_missing():
    """Test that validation raises ValueError when some credentials are None."""
    with patch('app.core.config.TWITTER_USERNAME', None), \
         patch('app.core.config.TWITTER_PASSWORD', 'test_twitter_pass'), \
         patch('app.core.config.TWITTER_EMAIL', 'test@example.com'), \
         patch('app.core.config.TWITTER_EMAIL_PASSWORD', 'test_email_pass'), \
         patch('app.core.config.BSKY_USERNAME', None), \
         patch('app.core.config.BSKY_PASSWORD', 'test_pass'):
        with pytest.raises(ValueError) as exc_info:
            validate_credentials()
        assert "Missing required environment variables" in str(exc_info.value)
        assert "TWITTER_USERNAME" in str(exc_info.value)
        assert "BSKY_USERNAME" in str(exc_info.value)


def test_validate_credentials_empty():
    """Test that validation raises ValueError when credentials are empty strings."""
    with patch('app.core.config.TWITTER_USERNAME', ''), \
         patch('app.core.config.TWITTER_PASSWORD', 'test_twitter_pass'), \
         patch('app.core.config.TWITTER_EMAIL', 'test@example.com'), \
         patch('app.core.config.TWITTER_EMAIL_PASSWORD', '   '), \
         patch('app.core.config.BSKY_USERNAME', '   '), \
         patch('app.core.config.BSKY_PASSWORD', 'test_pass'):
        with pytest.raises(ValueError) as exc_info:
            validate_credentials()
        assert "Missing required environment variables" in str(exc_info.value)
        assert "TWITTER_USERNAME" in str(exc_info.value)
        assert "TWITTER_EMAIL_PASSWORD" in str(exc_info.value)
        assert "BSKY_USERNAME" in str(exc_info.value)
