from app.twitter_handler import fetch_tweets
import pytest
from unittest.mock import patch, MagicMock

@patch("app.twitter_handler.twitter_api")
@patch("app.twitter_handler.auth")
def test_fetch_tweets(mock_auth, mock_twitter_api):
    # Mock the behavior of authentication and API
    mock_auth.return_value = MagicMock()
    mock_twitter_api.user_timeline.return_value = [{"id": 1, "text": "Hello, world!"}]

