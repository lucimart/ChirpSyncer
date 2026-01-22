"""
Tests for twitter_api_handler module

Tests the Twitter API v2 posting functionality.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import tweepy
from app.integrations.twitter_api_handler import (
    TwitterAPIHandler,
    post_tweet_with_credentials,
)


class TestTwitterAPIHandler:
    """Tests for TwitterAPIHandler class"""

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_init_valid_credentials(self, mock_client_class):
        """Test initialization with valid credentials"""
        # Mock successful authentication
        mock_client = MagicMock()
        mock_client.get_me.return_value = {
            "data": {"id": "123", "username": "testuser"}
        }
        mock_client_class.return_value = mock_client

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        assert handler.client is not None
        mock_client.get_me.assert_called_once()

    def test_init_missing_credentials(self):
        """Test initialization with missing credentials"""
        with pytest.raises(
            ValueError, match="All Twitter API credentials are required"
        ):
            TwitterAPIHandler(
                api_key="",
                api_secret="test_secret",
                access_token="test_token",
                access_secret="test_token_secret",
            )

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_init_authentication_failure(self, mock_client_class):
        """Test initialization with invalid credentials"""
        # Mock authentication failure
        mock_client = MagicMock()
        mock_client.get_me.side_effect = Exception("Unauthorized")
        mock_client_class.return_value = mock_client

        with pytest.raises(Exception, match="Unauthorized"):
            TwitterAPIHandler(
                api_key="invalid_key",
                api_secret="invalid_secret",
                access_token="invalid_token",
                access_secret="invalid_token_secret",
            )

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_post_tweet_success(self, mock_client_class):
        """Test posting a tweet successfully"""
        # Mock successful authentication and posting
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client.create_tweet.return_value = Mock(data={"id": "987654321"})
        mock_client_class.return_value = mock_client

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        tweet_id = handler.post_tweet("Test tweet content")

        assert tweet_id == "987654321"
        mock_client.create_tweet.assert_called_once_with(
            text="Test tweet content", media_ids=None
        )

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_post_tweet_with_media(self, mock_client_class):
        """Test posting a tweet with media"""
        # Mock successful posting with media
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client.create_tweet.return_value = Mock(data={"id": "987654321"})
        mock_client_class.return_value = mock_client

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        tweet_id = handler.post_tweet(
            "Test tweet with media", media_ids=["media123", "media456"]
        )

        assert tweet_id == "987654321"
        mock_client.create_tweet.assert_called_once_with(
            text="Test tweet with media", media_ids=["media123", "media456"]
        )

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_post_tweet_content_too_long(self, mock_client_class):
        """Test posting with content exceeding 280 characters"""
        # Mock successful authentication
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client_class.return_value = mock_client

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        long_content = "x" * 281
        with pytest.raises(ValueError, match="exceeds 280 characters"):
            handler.post_tweet(long_content)

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_post_tweet_api_error(self, mock_client_class):
        """Test posting tweet with API error"""
        # Mock API error
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client.create_tweet.side_effect = Exception("Rate limit exceeded")
        mock_client_class.return_value = mock_client

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        with pytest.raises(Exception, match="Rate limit exceeded"):
            handler.post_tweet("Test tweet")

    @patch("app.integrations.twitter_api_handler.tweepy.API")
    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_upload_media_success(self, mock_client_class, mock_api_class):
        """Test media upload success"""
        # Mock successful authentication
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client_class.return_value = mock_client

        # Mock media upload
        mock_api_v1 = MagicMock()
        mock_media = Mock(media_id_string="media123456")
        mock_api_v1.media_upload.return_value = mock_media

        handler = TwitterAPIHandler(
            api_key="test_key",
            api_secret="test_secret",
            access_token="test_token",
            access_secret="test_token_secret",
        )

        media_id = handler.upload_media("/path/to/image.jpg", mock_api_v1)

        assert media_id == "media123456"
        mock_api_v1.media_upload.assert_called_once_with("/path/to/image.jpg")

    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    def test_from_credentials_dict_success(self, mock_client_class):
        """Test creating handler from credentials dictionary"""
        # Mock successful authentication
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client_class.return_value = mock_client

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_token_secret",
        }

        handler = TwitterAPIHandler.from_credentials_dict(credentials)
        assert handler.client is not None

    def test_from_credentials_dict_missing_keys(self):
        """Test creating handler with missing credential keys"""
        from app.integrations.twitter_api_handler import TwitterAPINotConfiguredError

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            # Missing access_token and access_secret
        }

        with pytest.raises(
            TwitterAPINotConfiguredError, match="Missing Twitter API credentials"
        ):
            TwitterAPIHandler.from_credentials_dict(credentials)


class TestHelperFunctions:
    """Tests for helper functions"""

    @patch("app.integrations.twitter_api_handler.tweepy.API")
    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    @patch("app.integrations.twitter_api_handler.tweepy.OAuth1UserHandler")
    def test_post_tweet_with_credentials_success(
        self, mock_oauth, mock_client_class, mock_api_class
    ):
        """Test posting tweet with credentials helper function"""
        # Mock successful authentication and posting
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client.create_tweet.return_value = Mock(data={"id": "987654321"})
        mock_client_class.return_value = mock_client

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_token_secret",
        }

        tweet_id = post_tweet_with_credentials(credentials, "Test tweet")

        assert tweet_id == "987654321"

    @patch("app.integrations.twitter_api_handler.tweepy.API")
    @patch("app.integrations.twitter_api_handler.tweepy.Client")
    @patch("app.integrations.twitter_api_handler.tweepy.OAuth1UserHandler")
    def test_post_tweet_with_credentials_and_media(
        self, mock_oauth, mock_client_class, mock_api_class
    ):
        """Test posting tweet with media using credentials"""
        # Mock successful authentication and posting
        mock_client = MagicMock()
        mock_client.get_me.return_value = {"data": {"id": "123"}}
        mock_client.create_tweet.return_value = Mock(data={"id": "987654321"})
        mock_client_class.return_value = mock_client

        # Mock media upload
        mock_api_v1 = MagicMock()
        mock_media = Mock(media_id_string="media123")
        mock_api_v1.media_upload.return_value = mock_media
        mock_api_class.return_value = mock_api_v1

        credentials = {
            "api_key": "test_key",
            "api_secret": "test_secret",
            "access_token": "test_token",
            "access_secret": "test_token_secret",
        }

        tweet_id = post_tweet_with_credentials(
            credentials, "Test tweet with media", media_paths=["/path/to/image.jpg"]
        )

        assert tweet_id == "987654321"
        mock_api_v1.media_upload.assert_called_once()
