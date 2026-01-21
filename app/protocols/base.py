"""
Base classes for Platform Connectors.

Defines the abstract interface that all platform connectors must implement,
along with the canonical post format for cross-platform synchronization.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class SyncDirection(Enum):
    """Sync direction options."""

    BIDIRECTIONAL = "bidirectional"
    IMPORT_ONLY = "import_only"
    EXPORT_ONLY = "export_only"


class ConnectorStatus(Enum):
    """Connector connection status."""

    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"
    AUTHENTICATING = "authenticating"


@dataclass
class PlatformCapabilities:
    """
    Describes what a platform connector can do.

    Used for feature detection and UI adaptation.
    """

    # Content capabilities
    max_post_length: int = 280
    supports_threads: bool = False
    supports_media: bool = True
    supports_video: bool = False
    supports_polls: bool = False
    supports_scheduling: bool = False

    # Sync capabilities
    can_fetch_posts: bool = True
    can_create_posts: bool = True
    can_delete_posts: bool = False
    can_edit_posts: bool = False

    # Engagement capabilities
    can_fetch_likes: bool = False
    can_fetch_reposts: bool = False
    can_fetch_replies: bool = False
    can_fetch_metrics: bool = False

    # Rate limiting
    rate_limit_posts_per_hour: Optional[int] = None
    rate_limit_fetches_per_hour: Optional[int] = None

    # Additional features
    supports_hashtags: bool = True
    supports_mentions: bool = True
    supports_links: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert capabilities to dictionary."""
        return {
            "max_post_length": self.max_post_length,
            "supports_threads": self.supports_threads,
            "supports_media": self.supports_media,
            "supports_video": self.supports_video,
            "supports_polls": self.supports_polls,
            "supports_scheduling": self.supports_scheduling,
            "can_fetch_posts": self.can_fetch_posts,
            "can_create_posts": self.can_create_posts,
            "can_delete_posts": self.can_delete_posts,
            "can_edit_posts": self.can_edit_posts,
            "can_fetch_likes": self.can_fetch_likes,
            "can_fetch_reposts": self.can_fetch_reposts,
            "can_fetch_replies": self.can_fetch_replies,
            "can_fetch_metrics": self.can_fetch_metrics,
            "rate_limit_posts_per_hour": self.rate_limit_posts_per_hour,
            "rate_limit_fetches_per_hour": self.rate_limit_fetches_per_hour,
            "supports_hashtags": self.supports_hashtags,
            "supports_mentions": self.supports_mentions,
            "supports_links": self.supports_links,
        }


@dataclass
class CanonicalPost:
    """
    Platform-agnostic post representation.

    This is the common format used for cross-platform synchronization.
    All platform-specific posts are converted to/from this format.
    """

    # Identity
    id: str  # Unique ID within ChirpSyncer
    platform: str  # Source platform (twitter, bluesky, etc.)
    platform_id: str  # ID on the source platform

    # Content
    content: str
    created_at: datetime

    # Author
    author_id: str
    author_username: str
    author_display_name: Optional[str] = None

    # Media
    media_urls: List[str] = field(default_factory=list)
    media_types: List[str] = field(default_factory=list)  # image, video, gif

    # Engagement metrics
    likes_count: int = 0
    reposts_count: int = 0
    replies_count: int = 0
    views_count: int = 0

    # Thread/reply info
    is_thread: bool = False
    thread_id: Optional[str] = None
    reply_to_id: Optional[str] = None

    # Metadata
    hashtags: List[str] = field(default_factory=list)
    mentions: List[str] = field(default_factory=list)
    urls: List[str] = field(default_factory=list)
    language: Optional[str] = None

    # Sync metadata
    synced_at: Optional[datetime] = None
    synced_to: Dict[str, str] = field(default_factory=dict)  # platform -> platform_id
    last_modified: Optional[datetime] = None
    version: int = 1

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "platform": self.platform,
            "platform_id": self.platform_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "author_id": self.author_id,
            "author_username": self.author_username,
            "author_display_name": self.author_display_name,
            "media_urls": self.media_urls,
            "media_types": self.media_types,
            "likes_count": self.likes_count,
            "reposts_count": self.reposts_count,
            "replies_count": self.replies_count,
            "views_count": self.views_count,
            "is_thread": self.is_thread,
            "thread_id": self.thread_id,
            "reply_to_id": self.reply_to_id,
            "hashtags": self.hashtags,
            "mentions": self.mentions,
            "urls": self.urls,
            "language": self.language,
            "synced_at": self.synced_at.isoformat() if self.synced_at else None,
            "synced_to": self.synced_to,
            "last_modified": self.last_modified.isoformat()
            if self.last_modified
            else None,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CanonicalPost":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            platform=data["platform"],
            platform_id=data["platform_id"],
            content=data["content"],
            created_at=datetime.fromisoformat(data["created_at"])
            if data.get("created_at")
            else datetime.now(),
            author_id=data["author_id"],
            author_username=data["author_username"],
            author_display_name=data.get("author_display_name"),
            media_urls=data.get("media_urls", []),
            media_types=data.get("media_types", []),
            likes_count=data.get("likes_count", 0),
            reposts_count=data.get("reposts_count", 0),
            replies_count=data.get("replies_count", 0),
            views_count=data.get("views_count", 0),
            is_thread=data.get("is_thread", False),
            thread_id=data.get("thread_id"),
            reply_to_id=data.get("reply_to_id"),
            hashtags=data.get("hashtags", []),
            mentions=data.get("mentions", []),
            urls=data.get("urls", []),
            language=data.get("language"),
            synced_at=datetime.fromisoformat(data["synced_at"])
            if data.get("synced_at")
            else None,
            synced_to=data.get("synced_to", {}),
            last_modified=datetime.fromisoformat(data["last_modified"])
            if data.get("last_modified")
            else None,
            version=data.get("version", 1),
        )


class PlatformConnector(ABC):
    """
    Abstract base class for platform connectors.

    All platform integrations must implement this interface to ensure
    consistent behavior across different social media platforms.
    """

    @property
    @abstractmethod
    def platform_id(self) -> str:
        """Unique identifier for this platform (e.g., 'twitter', 'bluesky')."""
        pass

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Human-readable platform name (e.g., 'Twitter', 'Bluesky')."""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> PlatformCapabilities:
        """Return the capabilities of this connector."""
        pass

    @abstractmethod
    def get_status(self) -> ConnectorStatus:
        """Get current connection status."""
        pass

    @abstractmethod
    def connect(self, credentials: Dict[str, str]) -> bool:
        """
        Establish connection to the platform.

        Args:
            credentials: Platform-specific credentials

        Returns:
            True if connection successful, False otherwise
        """
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Disconnect from the platform."""
        pass

    @abstractmethod
    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        """
        Validate credentials without establishing a persistent connection.

        Args:
            credentials: Platform-specific credentials

        Returns:
            True if credentials are valid, False otherwise
        """
        pass

    @abstractmethod
    def fetch_posts(
        self,
        username: str,
        count: int = 10,
        since_id: Optional[str] = None,
    ) -> List[CanonicalPost]:
        """
        Fetch posts from the platform.

        Args:
            username: Username to fetch posts from
            count: Maximum number of posts to fetch
            since_id: Only fetch posts newer than this ID

        Returns:
            List of posts in canonical format
        """
        pass

    @abstractmethod
    def create_post(self, post: CanonicalPost) -> Optional[str]:
        """
        Create a new post on the platform.

        Args:
            post: Post in canonical format

        Returns:
            Platform-specific ID of created post, or None on failure
        """
        pass

    def delete_post(self, platform_id: str) -> bool:
        """
        Delete a post from the platform.

        Args:
            platform_id: Platform-specific post ID

        Returns:
            True if deletion successful, False otherwise

        Note:
            Default implementation returns False (not supported).
            Override in subclasses that support deletion.
        """
        return False

    def edit_post(self, platform_id: str, new_content: str) -> bool:
        """
        Edit an existing post on the platform.

        Args:
            platform_id: Platform-specific post ID
            new_content: New content for the post

        Returns:
            True if edit successful, False otherwise

        Note:
            Default implementation returns False (not supported).
            Override in subclasses that support editing.
        """
        return False

    def fetch_metrics(self, platform_id: str) -> Optional[Dict[str, int]]:
        """
        Fetch engagement metrics for a post.

        Args:
            platform_id: Platform-specific post ID

        Returns:
            Dictionary with metrics (likes, reposts, replies, views)
            or None if not supported/failed
        """
        return None

    def adapt_content(self, content: str) -> str:
        """
        Adapt content for this platform's requirements.

        Handles truncation, character limits, and platform-specific formatting.

        Args:
            content: Original content

        Returns:
            Adapted content suitable for this platform
        """
        max_length = self.capabilities.max_post_length
        if len(content) <= max_length:
            return content
        return content[: max_length - 3] + "..."

    def to_canonical(self, platform_post: Any) -> CanonicalPost:
        """
        Convert a platform-specific post to canonical format.

        Args:
            platform_post: Platform-specific post object

        Returns:
            Post in canonical format

        Note:
            Subclasses should override this for proper conversion.
        """
        raise NotImplementedError("Subclasses must implement to_canonical()")

    def from_canonical(self, canonical_post: CanonicalPost) -> Any:
        """
        Convert a canonical post to platform-specific format.

        Args:
            canonical_post: Post in canonical format

        Returns:
            Platform-specific post data

        Note:
            Subclasses should override this for proper conversion.
        """
        raise NotImplementedError("Subclasses must implement from_canonical()")
