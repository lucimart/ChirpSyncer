from app.bluesky_handler import post_to_bluesky
from unittest.mock import patch

@patch("app.bluesky_handler.bsky_client.login")
@patch("app.bluesky_handler.bsky_client.post")
def test_post_to_bluesky(mock_post, mock_login):
    # Mock the behavior of login
    mock_login.return_value = None

    # Mock the behavior of the post method
    mock_post.return_value = True

    # Call the function to test
    result = post_to_bluesky("Test Post")
    assert result is None
    mock_post.assert_called_once_with("Test Post")