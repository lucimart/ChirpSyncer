from app.bluesky_handler import post_to_bluesky, validate_and_truncate_text
from unittest.mock import patch
import pytest


# Tests for validate_and_truncate_text function
def test_validate_text_under_limit_unchanged():
    """Test that text under the limit is returned unchanged."""
    text = "This is a short tweet."
    result = validate_and_truncate_text(text)
    assert result == text
    assert len(result) <= 300


def test_validate_text_at_limit_unchanged():
    """Test that text exactly at 300 characters is returned unchanged."""
    text = "a" * 300
    result = validate_and_truncate_text(text)
    assert result == text
    assert len(result) == 300


def test_validate_text_over_limit_truncated():
    """Test that text over 300 chars is truncated to 297 + '...'."""
    text = "a" * 301
    result = validate_and_truncate_text(text)
    assert len(result) == 300
    assert result.endswith("...")
    assert result == ("a" * 297) + "..."


def test_validate_text_way_over_limit_truncated():
    """Test that very long text (1000 chars) is truncated properly."""
    text = "b" * 1000
    result = validate_and_truncate_text(text)
    assert len(result) == 300
    assert result.endswith("...")
    assert result == ("b" * 297) + "..."


def test_truncation_adds_ellipsis():
    """Test that truncated text always ends with ellipsis."""
    text = "x" * 500
    result = validate_and_truncate_text(text)
    assert result.endswith("...")
    assert len(result) == 300


def test_validate_empty_string():
    """Test that empty string is returned unchanged."""
    text = ""
    result = validate_and_truncate_text(text)
    assert result == ""


def test_validate_unicode_characters():
    """Test that Unicode characters are counted correctly."""
    # Unicode string with emojis and special characters
    text = "Hello 👋 World 🌍! " * 20  # This should exceed 300 chars
    result = validate_and_truncate_text(text)
    assert len(result) <= 300
    if len(text) > 300:
        assert result.endswith("...")


def test_custom_max_length():
    """Test that custom max_length parameter works."""
    text = "a" * 100
    result = validate_and_truncate_text(text, max_length=50)
    assert len(result) == 50
    assert result.endswith("...")
    assert result == ("a" * 47) + "..."


@patch("app.bluesky_handler.logger")
def test_warning_logged_when_truncating(mock_logger):
    """Test that warning is logged when text is truncated."""
    text = "a" * 400
    result = validate_and_truncate_text(text)
    mock_logger.warning.assert_called_once()
    # Check that the warning message contains the original and truncated lengths
    call_args = mock_logger.warning.call_args[0][0]
    assert "400" in call_args
    assert "300" in call_args
    assert "truncated" in call_args.lower()


@patch("app.bluesky_handler.logger")
def test_no_warning_when_not_truncating(mock_logger):
    """Test that no warning is logged when text is not truncated."""
    text = "Short text"
    result = validate_and_truncate_text(text)
    mock_logger.warning.assert_not_called()


# Tests for post_to_bluesky with validation
@patch("app.bluesky_handler.bsky_client.login")
@patch("app.bluesky_handler.bsky_client.post")
def test_post_to_bluesky(mock_post, mock_login):
    """Test basic posting functionality."""
    # Mock the behavior of login
    mock_login.return_value = None

    # Mock the behavior of the post method
    mock_post.return_value = True

    # Call the function to test
    result = post_to_bluesky("Test Post")
    assert result is None
    mock_post.assert_called_once_with("Test Post")


@patch("app.bluesky_handler.bsky_client.post")
@patch("app.bluesky_handler.logger")
def test_post_to_bluesky_validates_length(mock_logger, mock_post):
    """Test that post_to_bluesky validates and truncates long text."""
    long_text = "a" * 400
    expected_text = ("a" * 297) + "..."

    mock_post.return_value = True

    post_to_bluesky(long_text)

    # Verify that the truncated text was posted, not the original
    mock_post.assert_called_once_with(expected_text)

    # Verify warning was logged
    mock_logger.warning.assert_called_once()


@patch("app.bluesky_handler.bsky_client.post")
@patch("app.bluesky_handler.logger")
def test_post_to_bluesky_short_text_unchanged(mock_logger, mock_post):
    """Test that short text is posted unchanged."""
    short_text = "Short tweet"

    mock_post.return_value = True

    post_to_bluesky(short_text)

    # Verify that the original text was posted
    mock_post.assert_called_once_with(short_text)

    # Verify no warning was logged (text wasn't truncated)
    mock_logger.warning.assert_not_called()