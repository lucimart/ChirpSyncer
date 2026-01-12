"""
Twitter API Handler - Official Twitter API v2 for posting tweets

This module provides functions to post tweets using the official Twitter API v2.
Used for bidirectional sync (Bluesky → Twitter) and scheduled tweet posting.

Requirements:
- Twitter API credentials (API key, API secret, Access token, Access secret)
- tweepy library
"""

import tweepy
from typing import List, Optional, Dict
from app.core.logger import setup_logger

logger = setup_logger(__name__)


class TwitterAPIHandler:
    """
    Twitter API v2 handler for posting tweets.

    Uses OAuth 1.0a User Context authentication to post tweets
    on behalf of a user account.
    """

    def __init__(self, api_key: str, api_secret: str, access_token: str, access_secret: str):
        """
        Initialize Twitter API handler with credentials.

        Args:
            api_key: Twitter API key (Consumer Key)
            api_secret: Twitter API secret (Consumer Secret)
            access_token: Access token for the user account
            access_secret: Access token secret for the user account

        Raises:
            ValueError: If any credential is missing
            tweepy.TweepyException: If authentication fails
        """
        if not all([api_key, api_secret, access_token, access_secret]):
            raise ValueError("All Twitter API credentials are required")

        try:
            # Initialize OAuth 1.0a User Context
            self.client = tweepy.Client(
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_secret
            )

            # Verify credentials work
            self.client.get_me()
            logger.info("Twitter API authentication successful")

        except Exception as e:
            logger.error(f"Twitter API authentication failed: {e}")
            raise

    def post_tweet(self, content: str, media_ids: Optional[List[str]] = None) -> str:
        """
        Post a tweet to Twitter.

        Args:
            content: Tweet text content (max 280 characters)
            media_ids: Optional list of media IDs to attach

        Returns:
            Tweet ID of the posted tweet

        Raises:
            ValueError: If content exceeds 280 characters
            tweepy.TweepyException: If posting fails
        """
        if len(content) > 280:
            raise ValueError(f"Tweet content exceeds 280 characters: {len(content)}")

        try:
            # Post tweet
            response = self.client.create_tweet(
                text=content,
                media_ids=media_ids
            )

            tweet_id = str(response.data['id'])
            logger.info(f"Tweet posted successfully: {tweet_id}")
            return tweet_id

        except Exception as e:
            logger.error(f"Failed to post tweet: {e}")
            raise

    def upload_media(self, media_path: str, api_v1: tweepy.API) -> str:
        """
        Upload media file to Twitter (requires API v1.1).

        Note: Media upload requires API v1.1, not v2.
        You need to pass an initialized API v1 instance.

        Args:
            media_path: Path to media file
            api_v1: Initialized tweepy.API instance (v1.1)

        Returns:
            Media ID string

        Raises:
            tweepy.TweepyException: If upload fails
        """
        try:
            media = api_v1.media_upload(media_path)
            logger.info(f"Media uploaded successfully: {media.media_id_string}")
            return media.media_id_string

        except Exception as e:
            logger.error(f"Failed to upload media: {e}")
            raise

    @classmethod
    def from_credentials_dict(cls, credentials: Dict[str, str]) -> 'TwitterAPIHandler':
        """
        Create TwitterAPIHandler from credentials dictionary.

        Args:
            credentials: Dictionary with keys: api_key, api_secret, access_token, access_secret

        Returns:
            Initialized TwitterAPIHandler

        Raises:
            ValueError: If required keys are missing
        """
        required_keys = ['api_key', 'api_secret', 'access_token', 'access_secret']
        missing = [k for k in required_keys if k not in credentials]

        if missing:
            raise ValueError(f"Missing required credential keys: {', '.join(missing)}")

        return cls(
            api_key=credentials['api_key'],
            api_secret=credentials['api_secret'],
            access_token=credentials['access_token'],
            access_secret=credentials['access_secret']
        )


def post_tweet_with_credentials(credentials: Dict[str, str], content: str,
                                 media_paths: Optional[List[str]] = None) -> str:
    """
    Helper function to post a tweet using credentials dictionary.

    Args:
        credentials: Dictionary with Twitter API credentials
        content: Tweet text content
        media_paths: Optional list of media file paths

        Returns:
        Tweet ID

    Raises:
        ValueError: If credentials are invalid or content too long
        tweepy.TweepyException: If posting fails
    """
    handler = TwitterAPIHandler.from_credentials_dict(credentials)

    # Upload media if provided
    media_ids = None
    if media_paths:
        # Initialize API v1.1 for media upload
        auth = tweepy.OAuth1UserHandler(
            credentials['api_key'],
            credentials['api_secret'],
            credentials['access_token'],
            credentials['access_secret']
        )
        api_v1 = tweepy.API(auth)

        media_ids = []
        for media_path in media_paths:
            media_id = handler.upload_media(media_path, api_v1)
            media_ids.append(media_id)

    # Post tweet
    return handler.post_tweet(content, media_ids)
