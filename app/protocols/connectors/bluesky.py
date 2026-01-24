"""
Bluesky Platform Connector

Implements PlatformConnector interface for Bluesky using atproto.
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


class BlueskyConnector(PlatformConnector):
    """
    Bluesky connector using the AT Protocol (atproto).

    Supports full read/write operations via the official API.
    """

    def __init__(self):
        self._status = ConnectorStatus.DISCONNECTED
        self._username: Optional[str] = None
        self._credentials: Optional[Dict[str, str]] = None
        self._client = None

    @property
    def platform_id(self) -> str:
        return "bluesky"

    @property
    def platform_name(self) -> str:
        return "Bluesky"

    @property
    def capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            max_post_length=300,
            supports_threads=True,
            supports_media=True,
            supports_video=False,  # Limited video support
            supports_polls=False,
            supports_scheduling=False,
            can_fetch_posts=True,
            can_create_posts=True,
            can_delete_posts=True,
            can_edit_posts=False,  # Bluesky doesn't support editing
            can_fetch_likes=True,
            can_fetch_reposts=True,
            can_fetch_replies=True,
            can_fetch_metrics=True,
            rate_limit_posts_per_hour=100,
            rate_limit_fetches_per_hour=1000,
            supports_hashtags=True,
            supports_mentions=True,
            supports_links=True,
        )

    def get_status(self) -> ConnectorStatus:
        return self._status

    def connect(self, credentials: Dict[str, str]) -> bool:
        """
        Connect to Bluesky.

        Args:
            credentials: Dict with 'username' and 'password' (app password)
        """
        try:
            from atproto import Client

            username = credentials.get("username")
            password = credentials.get("password")

            if not username or not password:
                logger.error("Missing Bluesky credentials")
                return False

            self._client = Client()
            self._client.login(username, password)

            self._credentials = credentials
            self._username = username
            self._status = ConnectorStatus.CONNECTED

            logger.info(f"Bluesky connector connected for user: {username}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect Bluesky: {e}")
            self._status = ConnectorStatus.ERROR
            return False

    def disconnect(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED
        self._client = None
        self._credentials = None
        logger.info("Bluesky connector disconnected")

    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """Validate Bluesky credentials."""
        required = ["username", "password"]
        if not all(credentials.get(key) for key in required):
            return False

        # Try to connect to validate
        try:
            from atproto import Client

            client = Client()
            client.login(credentials["username"], credentials["password"])
            return True
        except Exception:
            return False

    def fetch_posts(
        self,
        username: str,
        count: int = 10,
        since_id: Optional[str] = None,
    ) -> List[CanonicalPost]:
        """Fetch posts from Bluesky."""
        if self._status != ConnectorStatus.CONNECTED or not self._client:
            logger.warning("Bluesky connector not connected")
            return []

        try:
            response = self._client.app.bsky.feed.get_author_feed(
                params={"actor": username, "limit": count}
            )

            if not hasattr(response, "feed") or not response.feed:
                return []

            posts = []
            for item in response.feed:
                # Skip reposts
                if getattr(item, "reason", None) is not None:
                    continue

                post_data = getattr(item, "post", None)
                if not post_data:
                    continue

                post = self._convert_feed_item(post_data)
                if post:
                    posts.append(post)

                if len(posts) >= count:
                    break

            return posts

        except Exception as e:
            logger.error(f"Error fetching Bluesky posts: {e}")
            return []

    def create_post(self, post: CanonicalPost) -> Optional[str]:
        """Create a post on Bluesky."""
        if self._status != ConnectorStatus.CONNECTED or not self._client:
            logger.warning("Bluesky connector not connected")
            return None

        try:
            content = self.adapt_content(post.content)
            response = self._client.send_post(text=content)

            uri = getattr(response, "uri", None)
            if uri:
                logger.info(f"Posted to Bluesky: {content[:50]}...")
                return uri
            return None

        except Exception as e:
            logger.error(f"Error posting to Bluesky: {e}")
            return None

    def delete_post(self, platform_id: str) -> bool:
        """Delete a post from Bluesky."""
        if self._status != ConnectorStatus.CONNECTED or not self._client:
            return False

        try:
            # platform_id should be the AT URI
            self._client.delete_post(platform_id)
            logger.info(f"Deleted Bluesky post: {platform_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting Bluesky post: {e}")
            return False

    def _convert_feed_item(self, post_data: Any) -> Optional[CanonicalPost]:
        """Convert a Bluesky feed item to CanonicalPost."""
        try:
            record = getattr(post_data, "record", None)
            uri = getattr(post_data, "uri", "")
            author = getattr(post_data, "author", None)

            text = getattr(record, "text", "") if record else ""
            created_at_str = getattr(record, "createdAt", None) if record else None

            # Parse created_at
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(
                        created_at_str.replace("Z", "+00:00")
                    )
                except ValueError:
                    created_at = datetime.now()
            else:
                created_at = datetime.now()

            # Extract author info
            author_handle = getattr(author, "handle", "") if author else ""
            author_did = getattr(author, "did", "") if author else ""
            author_display = getattr(author, "displayName", None) if author else None

            # Extract hashtags, mentions, URLs
            hashtags = re.findall(r"#(\w+)", text)
            mentions = re.findall(r"@(\w+)", text)
            urls = re.findall(r"https?://\S+", text)

            # Get engagement metrics
            like_count = getattr(post_data, "likeCount", 0) or 0
            repost_count = getattr(post_data, "repostCount", 0) or 0
            reply_count = getattr(post_data, "replyCount", 0) or 0

            return CanonicalPost(
                id=f"bluesky_{uri.split('/')[-1] if uri else ''}",
                platform="bluesky",
                platform_id=uri,
                content=text,
                created_at=created_at,
                author_id=author_did,
                author_username=author_handle,
                author_display_name=author_display,
                likes_count=like_count,
                reposts_count=repost_count,
                replies_count=reply_count,
                hashtags=hashtags,
                mentions=mentions,
                urls=urls,
            )

        except Exception as e:
            logger.error(f"Error converting Bluesky post: {e}")
            return None

    def to_canonical(self, bsky_post: Any) -> CanonicalPost:
        """Convert a Bluesky post to CanonicalPost."""
        result = self._convert_feed_item(bsky_post)
        if result:
            return result

        # Fallback for simple post objects
        text = getattr(bsky_post, "text", str(bsky_post))
        uri = getattr(bsky_post, "uri", "")

        return CanonicalPost(
            id=f"bluesky_{uri.split('/')[-1] if uri else 'unknown'}",
            platform="bluesky",
            platform_id=uri,
            content=text,
            created_at=datetime.now(),
            author_id=self._username or "",
            author_username=self._username or "",
        )

    def from_canonical(self, post: CanonicalPost) -> Dict[str, Any]:
        """Convert CanonicalPost to Bluesky format."""
        return {
            "text": self.adapt_content(post.content),
        }
