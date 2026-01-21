"""
Mastodon connector implementing PlatformConnector interface.

Supports ActivityPub-based Mastodon instances with full CRUD operations.
"""

import logging
import re
import uuid
from datetime import datetime
from html import unescape
from typing import Any, Dict, List, Optional

try:
    from mastodon import Mastodon
except ImportError:
    Mastodon = None  # type: ignore

from app.protocols.base import (
    CanonicalPost,
    ConnectorStatus,
    PlatformCapabilities,
    PlatformConnector,
)

logger = logging.getLogger(__name__)


class MastodonConnector(PlatformConnector):
    """
    Mastodon platform connector.

    Supports any Mastodon-compatible instance (Mastodon, Pleroma, Akkoma, etc.)
    via the Mastodon.py library.
    """

    def __init__(self) -> None:
        """Initialize the Mastodon connector."""
        self._client: Optional[Any] = None
        self._status: ConnectorStatus = ConnectorStatus.DISCONNECTED
        self._instance_url: Optional[str] = None
        self._account_info: Optional[Dict[str, Any]] = None
        self._capabilities = PlatformCapabilities(
            max_post_length=500,  # Default, updated per-instance
            supports_threads=True,
            supports_media=True,
            supports_video=True,
            supports_polls=True,
            supports_scheduling=True,
            can_fetch_posts=True,
            can_create_posts=True,
            can_delete_posts=True,
            can_edit_posts=True,  # Mastodon supports editing since v3.5
            can_fetch_likes=True,
            can_fetch_reposts=True,
            can_fetch_replies=True,
            can_fetch_metrics=True,
            rate_limit_posts_per_hour=300,
            rate_limit_fetches_per_hour=300,
            supports_hashtags=True,
            supports_mentions=True,
            supports_links=True,
        )

    @property
    def platform_id(self) -> str:
        """Return platform identifier."""
        return "mastodon"

    @property
    def platform_name(self) -> str:
        """Return human-readable platform name."""
        return "Mastodon"

    @property
    def capabilities(self) -> PlatformCapabilities:
        """Return platform capabilities."""
        return self._capabilities

    def get_status(self) -> ConnectorStatus:
        """Get current connection status."""
        return self._status

    def connect(self, credentials: Dict[str, str]) -> bool:
        """
        Connect to a Mastodon instance.

        Args:
            credentials: Must contain 'instance_url' and 'access_token'

        Returns:
            True if connection successful
        """
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        if not instance_url or not access_token:
            logger.error("Missing required credentials: instance_url and access_token")
            return False

        if Mastodon is None:
            logger.error("Mastodon.py library not installed")
            self._status = ConnectorStatus.ERROR
            return False

        try:
            self._status = ConnectorStatus.AUTHENTICATING
            self._instance_url = instance_url

            self._client = Mastodon(
                access_token=access_token,
                api_base_url=instance_url,
            )

            # Verify credentials
            self._account_info = self._client.account_verify_credentials()
            self._status = ConnectorStatus.CONNECTED

            logger.info(
                f"Connected to Mastodon instance {instance_url} "
                f"as @{self._account_info.get('username')}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to connect to Mastodon: {e}")
            self._status = ConnectorStatus.ERROR
            self._client = None
            return False

    def disconnect(self) -> None:
        """Disconnect from the Mastodon instance."""
        self._client = None
        self._account_info = None
        self._status = ConnectorStatus.DISCONNECTED
        logger.info("Disconnected from Mastodon")

    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """
        Validate credentials without persistent connection.

        Args:
            credentials: Must contain 'instance_url' and 'access_token'

        Returns:
            True if credentials are valid
        """
        if Mastodon is None:
            return False

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        if not instance_url or not access_token:
            return False

        try:
            client = Mastodon(
                access_token=access_token,
                api_base_url=instance_url,
            )
            client.account_verify_credentials()
            return True
        except Exception as e:
            logger.debug(f"Credential validation failed: {e}")
            return False

    def fetch_posts(
        self,
        username: str,
        count: int = 10,
        since_id: Optional[str] = None,
    ) -> List[CanonicalPost]:
        """
        Fetch posts from a Mastodon user.

        Args:
            username: Username to fetch posts from (without @)
            count: Maximum number of posts to fetch
            since_id: Only fetch posts newer than this ID

        Returns:
            List of posts in canonical format
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            logger.warning("Cannot fetch posts: not connected")
            return []

        try:
            # Look up account by username
            account = self._client.account_lookup(username)
            account_id = account["id"]

            # Fetch statuses
            kwargs: Dict[str, Any] = {"limit": count}
            if since_id:
                kwargs["since_id"] = since_id

            statuses = self._client.account_statuses(account_id, **kwargs)

            posts = []
            for status in statuses:
                try:
                    post = self.to_canonical(status)
                    posts.append(post)
                except Exception as e:
                    logger.warning(f"Failed to convert status {status.get('id')}: {e}")

            return posts

        except Exception as e:
            logger.error(f"Failed to fetch posts for {username}: {e}")
            return []

    def create_post(self, post: CanonicalPost) -> Optional[str]:
        """
        Create a new post on Mastodon.

        Args:
            post: Post in canonical format

        Returns:
            Platform-specific ID of created post, or None on failure
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            logger.warning("Cannot create post: not connected")
            return None

        try:
            kwargs: Dict[str, Any] = {
                "status": post.content,
            }

            # Handle reply
            if post.reply_to_id:
                kwargs["in_reply_to_id"] = post.reply_to_id

            # Handle media (if URLs are local files or already uploaded)
            # Note: For remote URLs, media would need to be downloaded first
            media_ids = []
            if post.media_urls:
                for url in post.media_urls:
                    try:
                        # If it's a local file path, upload it
                        if not url.startswith("http"):
                            media = self._client.media_post(url)
                            media_ids.append(media["id"])
                    except Exception as e:
                        logger.warning(f"Failed to upload media {url}: {e}")

            if media_ids:
                kwargs["media_ids"] = media_ids

            # Post the status
            result = self._client.status_post(**kwargs)
            return str(result["id"])

        except Exception as e:
            logger.error(f"Failed to create post: {e}")
            return None

    def delete_post(self, platform_id: str) -> bool:
        """
        Delete a post from Mastodon.

        Args:
            platform_id: Mastodon status ID

        Returns:
            True if deletion successful
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            return False

        try:
            self._client.status_delete(platform_id)
            return True
        except Exception as e:
            logger.error(f"Failed to delete post {platform_id}: {e}")
            return False

    def edit_post(self, platform_id: str, new_content: str) -> bool:
        """
        Edit an existing post on Mastodon.

        Args:
            platform_id: Mastodon status ID
            new_content: New content for the post

        Returns:
            True if edit successful
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            return False

        try:
            self._client.status_update(platform_id, status=new_content)
            return True
        except Exception as e:
            logger.error(f"Failed to edit post {platform_id}: {e}")
            return False

    def fetch_metrics(self, platform_id: str) -> Optional[Dict[str, int]]:
        """
        Fetch engagement metrics for a post.

        Args:
            platform_id: Mastodon status ID

        Returns:
            Dictionary with likes, reposts, replies, views
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            return None

        try:
            status = self._client.status(platform_id)
            return {
                "likes": status.get("favourites_count", 0),
                "reposts": status.get("reblogs_count", 0),
                "replies": status.get("replies_count", 0),
                "views": 0,  # Mastodon doesn't expose view counts
            }
        except Exception as e:
            logger.error(f"Failed to fetch metrics for {platform_id}: {e}")
            return None

    def to_canonical(self, platform_post: Any) -> CanonicalPost:
        """
        Convert a Mastodon status to canonical format.

        Args:
            platform_post: Mastodon status dict

        Returns:
            Post in canonical format
        """
        status = platform_post
        account = status.get("account", {})

        # Extract media
        media_urls = []
        media_types = []
        for attachment in status.get("media_attachments", []):
            media_urls.append(attachment.get("url", ""))
            media_types.append(attachment.get("type", "unknown"))

        # Extract hashtags
        hashtags = [tag.get("name", "") for tag in status.get("tags", [])]

        # Extract mentions
        mentions = [mention.get("acct", "") for mention in status.get("mentions", [])]

        # Parse created_at
        created_at = status.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        elif not isinstance(created_at, datetime):
            created_at = datetime.now()

        # Strip HTML from content
        content = self._strip_html(status.get("content", ""))

        return CanonicalPost(
            id=str(uuid.uuid4()),
            platform="mastodon",
            platform_id=str(status.get("id", "")),
            content=content,
            created_at=created_at,
            author_id=str(account.get("id", "")),
            author_username=account.get("username", ""),
            author_display_name=account.get("display_name"),
            media_urls=media_urls,
            media_types=media_types,
            likes_count=status.get("favourites_count", 0),
            reposts_count=status.get("reblogs_count", 0),
            replies_count=status.get("replies_count", 0),
            views_count=0,  # Mastodon doesn't expose views
            is_thread=False,  # Would need additional logic to detect
            thread_id=None,
            reply_to_id=status.get("in_reply_to_id"),
            hashtags=hashtags,
            mentions=mentions,
            urls=[],  # Could extract from content
            language=status.get("language"),
        )

    def from_canonical(self, canonical_post: CanonicalPost) -> Dict[str, Any]:
        """
        Convert a canonical post to Mastodon status format.

        Args:
            canonical_post: Post in canonical format

        Returns:
            Mastodon-compatible status dict
        """
        return {
            "status": canonical_post.content,
            "in_reply_to_id": canonical_post.reply_to_id,
            "language": canonical_post.language,
        }

    def get_instance_info(self) -> Optional[Dict[str, Any]]:
        """
        Get information about the connected Mastodon instance.

        Returns:
            Instance information dict or None
        """
        if not self._client or self._status != ConnectorStatus.CONNECTED:
            return None

        try:
            return self._client.instance()
        except Exception as e:
            logger.error(f"Failed to get instance info: {e}")
            return None

    def _update_capabilities_from_instance(self) -> None:
        """Update capabilities based on instance configuration."""
        info = self.get_instance_info()
        if not info:
            return

        try:
            config = info.get("configuration", {})
            statuses_config = config.get("statuses", {})
            max_chars = statuses_config.get("max_characters", 500)

            self._capabilities = PlatformCapabilities(
                max_post_length=max_chars,
                supports_threads=True,
                supports_media=True,
                supports_video=True,
                supports_polls=True,
                supports_scheduling=True,
                can_fetch_posts=True,
                can_create_posts=True,
                can_delete_posts=True,
                can_edit_posts=True,
                can_fetch_likes=True,
                can_fetch_reposts=True,
                can_fetch_replies=True,
                can_fetch_metrics=True,
                rate_limit_posts_per_hour=300,
                rate_limit_fetches_per_hour=300,
                supports_hashtags=True,
                supports_mentions=True,
                supports_links=True,
            )
        except Exception as e:
            logger.warning(f"Failed to update capabilities from instance: {e}")

    def _strip_html(self, html_content: str) -> str:
        """
        Strip HTML tags from content.

        Args:
            html_content: HTML string

        Returns:
            Plain text content
        """
        # Remove HTML tags
        text = re.sub(r"<[^>]+>", "", html_content)
        # Unescape HTML entities
        text = unescape(text)
        return text.strip()
