"""
Twitter API Handler - Official Twitter API v2 for posting tweets (OPTIONAL - PAID)

⚠️  IMPORTANT: This module requires a PAID Twitter API subscription.
    - Twitter API Basic tier: $100/month
    - Required for: Bluesky → Twitter sync (writing tweets)
    - NOT required for: Twitter → Bluesky sync (reading uses free twscrape)

This module provides functions to post tweets using the official Twitter API v2.
Used for bidirectional sync (Bluesky → Twitter) and scheduled tweet posting.

Setup Instructions:
1. Go to https://developer.twitter.com/
2. Subscribe to Basic tier ($100/month) or higher
3. Create a Project and App
4. Generate API keys and Access tokens
5. Store credentials in ChirpSyncer:
   - Platform: twitter
   - Credential type: api
   - Required fields: api_key, api_secret, access_token, access_secret

Requirements:
- Twitter API credentials (API key, API secret, Access token, Access secret)
- tweepy library (pip install tweepy)
- Active Twitter API subscription (Basic tier minimum)
"""

from typing import List, Optional, Dict

from app.core.logger import setup_logger

logger = setup_logger(__name__)

# Lazy import tweepy to make it optional
_tweepy = None

# Try to import tweepy at module level for test patching compatibility
try:
    import tweepy
except ImportError:
    tweepy = None  # type: ignore


def _get_tweepy():
    """Lazy load tweepy to make it optional."""
    global _tweepy
    if _tweepy is None:
        if tweepy is None:
            raise ImportError(
                "tweepy is not installed. Install it with: pip install tweepy\n"
                "Note: Twitter API requires a paid subscription ($100/month Basic tier).\n"
                "This is only needed for Bluesky → Twitter sync.\n"
                "Twitter → Bluesky sync uses free twscrape and doesn't require tweepy."
            )
        _tweepy = tweepy
    return _tweepy


class TwitterAPINotConfiguredError(Exception):
    """Raised when Twitter API credentials are not configured."""

    def __init__(self, message: Optional[str] = None):
        default_message = (
            "Twitter API credentials not configured.\n\n"
            "To enable Bluesky → Twitter sync:\n"
            "1. Subscribe to Twitter API Basic tier ($100/month) at https://developer.twitter.com/\n"
            "2. Create a Project and App\n"
            "3. Generate API keys and Access tokens\n"
            "4. Add credentials in ChirpSyncer Dashboard → Credentials → Twitter API\n\n"
            "Note: Twitter → Bluesky sync works without this (uses free twscrape)."
        )
        super().__init__(message or default_message)


class TwitterAPIHandler:
    """
    Twitter API v2 handler for posting tweets.

    ⚠️  REQUIRES PAID TWITTER API SUBSCRIPTION ($100/month Basic tier)

    Uses OAuth 1.0a User Context authentication to post tweets
    on behalf of a user account.

    This is only needed for:
    - Bluesky → Twitter sync
    - Scheduled tweet posting to Twitter

    NOT needed for:
    - Twitter → Bluesky sync (uses free twscrape)
    - Reading tweets (uses free twscrape)
    """

    def __init__(
        self, api_key: str, api_secret: str, access_token: str, access_secret: str
    ):
        """
        Initialize Twitter API handler with credentials.

        Args:
            api_key: Twitter API key (Consumer Key)
            api_secret: Twitter API secret (Consumer Secret)
            access_token: Access token for the user account
            access_secret: Access token secret for the user account

        Raises:
            ValueError: If any credential is missing
            TwitterAPINotConfiguredError: If credentials are empty
            tweepy.TweepyException: If authentication fails
        """
        if not all([api_key, api_secret, access_token, access_secret]):
            raise TwitterAPINotConfiguredError()

        tweepy = _get_tweepy()

        try:
            # Initialize OAuth 1.0a User Context
            self.client = tweepy.Client(
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_secret,
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
            response = self.client.create_tweet(text=content, media_ids=media_ids)

            response_data = getattr(response, "data", None) or {}
            tweet_id = str(response_data.get("id"))
            logger.info(f"Tweet posted successfully: {tweet_id}")
            return tweet_id

        except Exception as e:
            logger.error(f"Failed to post tweet: {e}")
            raise

    def upload_media(self, media_path: str, api_v1) -> str:
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
    def from_credentials_dict(cls, credentials: Dict[str, str]) -> "TwitterAPIHandler":
        """
        Create TwitterAPIHandler from credentials dictionary.

        Args:
            credentials: Dictionary with keys: api_key, api_secret, access_token, access_secret

        Returns:
            Initialized TwitterAPIHandler

        Raises:
            TwitterAPINotConfiguredError: If required keys are missing
        """
        required_keys = ["api_key", "api_secret", "access_token", "access_secret"]
        missing = [
            k for k in required_keys if k not in credentials or not credentials[k]
        ]

        if missing:
            raise TwitterAPINotConfiguredError(
                f"Missing Twitter API credentials: {', '.join(missing)}\n\n"
                "To enable Bluesky → Twitter sync:\n"
                "1. Subscribe to Twitter API Basic tier ($100/month)\n"
                "2. Add credentials in Dashboard → Credentials → Twitter API"
            )

        return cls(
            api_key=credentials["api_key"],
            api_secret=credentials["api_secret"],
            access_token=credentials["access_token"],
            access_secret=credentials["access_secret"],
        )


def is_twitter_api_available() -> bool:
    """
    Check if Twitter API (tweepy) is available.

    Returns:
        True if tweepy is installed, False otherwise
    """
    try:
        _get_tweepy()
        return True
    except ImportError:
        return False


def post_tweet_with_credentials(
    credentials: Dict[str, str], content: str, media_paths: Optional[List[str]] = None
) -> str:
    """
    Helper function to post a tweet using credentials dictionary.

    ⚠️  REQUIRES PAID TWITTER API SUBSCRIPTION ($100/month Basic tier)

    Args:
        credentials: Dictionary with Twitter API credentials
        content: Tweet text content
        media_paths: Optional list of media file paths

    Returns:
        Tweet ID

    Raises:
        TwitterAPINotConfiguredError: If credentials are not configured
        ValueError: If content too long
        tweepy.TweepyException: If posting fails
    """
    tweepy = _get_tweepy()
    handler = TwitterAPIHandler.from_credentials_dict(credentials)

    # Upload media if provided
    media_ids = None
    if media_paths:
        # Initialize API v1.1 for media upload
        auth = tweepy.OAuth1UserHandler(
            credentials["api_key"],
            credentials["api_secret"],
            credentials["access_token"],
            credentials["access_secret"],
        )
        api_v1 = tweepy.API(auth)

        media_ids = []
        for media_path in media_paths:
            media_id = handler.upload_media(media_path, api_v1)
            media_ids.append(media_id)

    # Post tweet
    return handler.post_tweet(content, media_ids)
