"""
Twitter Platform Connector

Implements PlatformConnector interface for Twitter using twscrape.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.protocols.base import (
    PlatformConnector,
    CanonicalPost,
    PlatformCapabilities,
    ConnectorStatus,
)
from app.core.logger import setup_logger

logger = setup_logger(__name__)


class TwitterConnector(PlatformConnector):
    """
    Twitter connector using twscrape for scraping.

    Note: This connector uses scraping rather than the official API,
    so some features may be limited or unavailable.
    """

    def __init__(self):
        self._status = ConnectorStatus.DISCONNECTED
        self._username: Optional[str] = None
        self._credentials: Optional[Dict[str, str]] = None
        self._api = None

    @property
    def platform_id(self) -> str:
        return "twitter"

    @property
    def platform_name(self) -> str:
        return "Twitter"

    @property
    def capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            max_post_length=280,
            supports_threads=True,
            supports_media=True,
            supports_video=True,
            supports_polls=False,  # Not supported via scraping
            supports_scheduling=False,
            can_fetch_posts=True,
            can_create_posts=False,  # Scraping doesn't support posting
            can_delete_posts=False,
            can_edit_posts=False,
            can_fetch_likes=True,
            can_fetch_reposts=True,
            can_fetch_replies=True,
            can_fetch_metrics=True,
            rate_limit_posts_per_hour=None,
            rate_limit_fetches_per_hour=100,  # Approximate
            supports_hashtags=True,
            supports_mentions=True,
            supports_links=True,
        )

    def get_status(self) -> ConnectorStatus:
        return self._status

    def connect(self, credentials: Dict[str, str]) -> bool:
        """
        Connect to Twitter using twscrape.

        Args:
            credentials: Dict with 'username', 'password', 'email', 'email_password'
        """
        try:
            from twscrape import API

            self._credentials = credentials
            self._username = credentials.get("username")
            self._api = API()

            # twscrape requires account pool setup
            # For now, we assume it's already configured
            self._status = ConnectorStatus.CONNECTED
            logger.info(f"Twitter connector connected for user: {self._username}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect Twitter: {e}")
            self._status = ConnectorStatus.ERROR
            return False

    def disconnect(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED
        self._api = None
        self._credentials = None
        logger.info("Twitter connector disconnected")

    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """Validate Twitter credentials."""
        required = ["username"]
        return all(credentials.get(key) for key in required)

    def fetch_posts(
        self,
        username: str,
        count: int = 10,
        since_id: Optional[str] = None,
    ) -> List[CanonicalPost]:
        """Fetch posts from Twitter using twscrape."""
        if self._status != ConnectorStatus.CONNECTED:
            logger.warning("Twitter connector not connected")
            return []

        try:
            from app.integrations.twitter_scraper import fetch_tweets

            tweets = fetch_tweets(count=count, username=username)

            posts = []
            for tweet in tweets:
                post = self.to_canonical(tweet)
                posts.append(post)

            return posts

        except Exception as e:
            logger.error(f"Error fetching Twitter posts: {e}")
            return []

    def create_post(self, post: CanonicalPost) -> Optional[str]:
        """
        Create a post on Twitter.

        Note: Not supported via scraping. Returns None.
        """
        logger.warning("Twitter posting not supported via scraping")
        return None

    def to_canonical(self, tweet: Any) -> CanonicalPost:
        """Convert a TweetAdapter to CanonicalPost."""
        # Extract hashtags from content
        hashtags = re.findall(r"#(\w+)", tweet.text)

        # Extract mentions
        mentions = re.findall(r"@(\w+)", tweet.text)

        # Extract URLs
        urls = re.findall(r"https?://\S+", tweet.text)

        return CanonicalPost(
            id=f"twitter_{tweet.id}",
            platform="twitter",
            platform_id=str(tweet.id),
            content=tweet.text,
            created_at=datetime.now(),  # twscrape doesn't provide timestamp easily
            author_id=self._username or "",
            author_username=self._username or "",
            hashtags=hashtags,
            mentions=mentions,
            urls=urls,
        )

    def from_canonical(self, post: CanonicalPost) -> Dict[str, Any]:
        """Convert CanonicalPost to Twitter format."""
        return {
            "text": self.adapt_content(post.content),
            "media_ids": [],  # Would need to upload media first
        }
