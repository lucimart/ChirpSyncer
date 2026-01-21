"""
Conflict Resolution

Handles conflicts that arise during bidirectional synchronization
when the same post has been modified on multiple platforms.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from app.protocols.base import CanonicalPost


class ConflictStrategy(Enum):
    """Strategies for resolving sync conflicts."""

    LAST_WRITE_WINS = "last_write_wins"  # Most recent modification wins
    SOURCE_WINS = "source_wins"  # Original source platform wins
    TARGET_WINS = "target_wins"  # Target platform wins
    MANUAL = "manual"  # Require user intervention
    MERGE = "merge"  # Attempt to merge changes (if possible)


@dataclass
class Conflict:
    """
    Represents a sync conflict between two versions of a post.
    """

    id: str  # Unique conflict ID
    post_id: str  # ChirpSyncer post ID

    # Conflicting versions
    source_post: CanonicalPost
    target_post: CanonicalPost

    # Conflict details
    source_platform: str
    target_platform: str
    detected_at: datetime = field(default_factory=datetime.now)

    # Resolution
    resolved: bool = False
    resolution_strategy: Optional[ConflictStrategy] = None
    resolved_at: Optional[datetime] = None
    resolved_post: Optional[CanonicalPost] = None
    resolved_by: Optional[str] = None  # "system" or user_id

    # Diff information
    content_differs: bool = False
    media_differs: bool = False
    metadata_differs: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "post_id": self.post_id,
            "source_post": self.source_post.to_dict(),
            "target_post": self.target_post.to_dict(),
            "source_platform": self.source_platform,
            "target_platform": self.target_platform,
            "detected_at": self.detected_at.isoformat(),
            "resolved": self.resolved,
            "resolution_strategy": self.resolution_strategy.value
            if self.resolution_strategy
            else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_post": self.resolved_post.to_dict()
            if self.resolved_post
            else None,
            "resolved_by": self.resolved_by,
            "content_differs": self.content_differs,
            "media_differs": self.media_differs,
            "metadata_differs": self.metadata_differs,
        }


class ConflictResolver:
    """
    Handles detection and resolution of sync conflicts.
    """

    def __init__(
        self, default_strategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS
    ):
        """
        Initialize conflict resolver.

        Args:
            default_strategy: Default strategy for automatic resolution
        """
        self.default_strategy = default_strategy
        self._pending_conflicts: Dict[str, Conflict] = {}
        self._resolved_conflicts: List[Conflict] = []
        self._custom_resolvers: Dict[str, Callable[[Conflict], CanonicalPost]] = {}

    def detect_conflict(
        self,
        source_post: CanonicalPost,
        target_post: CanonicalPost,
    ) -> Optional[Conflict]:
        """
        Detect if there's a conflict between two versions of a post.

        Args:
            source_post: Post from source platform
            target_post: Post from target platform

        Returns:
            Conflict object if conflict detected, None otherwise
        """
        # Check for differences
        content_differs = source_post.content != target_post.content
        media_differs = source_post.media_urls != target_post.media_urls

        # Check metadata differences (excluding sync metadata)
        metadata_differs = (
            source_post.hashtags != target_post.hashtags
            or source_post.mentions != target_post.mentions
        )

        # No conflict if nothing differs
        if not (content_differs or media_differs or metadata_differs):
            return None

        # Check if this is a real conflict (both modified after last sync)
        # If one is clearly newer and the other hasn't changed, it's not a conflict
        source_modified = source_post.last_modified or source_post.created_at
        target_modified = target_post.last_modified or target_post.created_at

        # Create conflict
        conflict_id = f"conflict_{source_post.id}_{int(datetime.now().timestamp())}"

        conflict = Conflict(
            id=conflict_id,
            post_id=source_post.id,
            source_post=source_post,
            target_post=target_post,
            source_platform=source_post.platform,
            target_platform=target_post.platform,
            content_differs=content_differs,
            media_differs=media_differs,
            metadata_differs=metadata_differs,
        )

        self._pending_conflicts[conflict_id] = conflict
        return conflict

    def resolve(
        self,
        conflict: Conflict,
        strategy: Optional[ConflictStrategy] = None,
    ) -> CanonicalPost:
        """
        Resolve a conflict using the specified strategy.

        Args:
            conflict: Conflict to resolve
            strategy: Resolution strategy (uses default if not specified)

        Returns:
            Resolved post in canonical format
        """
        strategy = strategy or self.default_strategy

        if strategy == ConflictStrategy.LAST_WRITE_WINS:
            resolved = self._resolve_last_write_wins(conflict)
        elif strategy == ConflictStrategy.SOURCE_WINS:
            resolved = conflict.source_post
        elif strategy == ConflictStrategy.TARGET_WINS:
            resolved = conflict.target_post
        elif strategy == ConflictStrategy.MERGE:
            resolved = self._resolve_merge(conflict)
        elif strategy == ConflictStrategy.MANUAL:
            # For manual, we don't auto-resolve
            raise ValueError("Manual conflicts must be resolved via resolve_manual()")
        else:
            resolved = self._resolve_last_write_wins(conflict)

        # Update conflict state
        conflict.resolved = True
        conflict.resolution_strategy = strategy
        conflict.resolved_at = datetime.now()
        conflict.resolved_post = resolved
        conflict.resolved_by = "system"

        # Move to resolved list
        if conflict.id in self._pending_conflicts:
            del self._pending_conflicts[conflict.id]
        self._resolved_conflicts.append(conflict)

        return resolved

    def resolve_manual(
        self,
        conflict_id: str,
        chosen_version: str,  # "source" or "target"
        user_id: str,
    ) -> CanonicalPost:
        """
        Manually resolve a conflict.

        Args:
            conflict_id: ID of conflict to resolve
            chosen_version: Which version to keep ("source" or "target")
            user_id: ID of user making the decision

        Returns:
            Resolved post
        """
        if conflict_id not in self._pending_conflicts:
            raise ValueError(f"Conflict {conflict_id} not found or already resolved")

        conflict = self._pending_conflicts[conflict_id]

        if chosen_version == "source":
            resolved = conflict.source_post
        elif chosen_version == "target":
            resolved = conflict.target_post
        else:
            raise ValueError(f"Invalid chosen_version: {chosen_version}")

        # Update conflict state
        conflict.resolved = True
        conflict.resolution_strategy = ConflictStrategy.MANUAL
        conflict.resolved_at = datetime.now()
        conflict.resolved_post = resolved
        conflict.resolved_by = user_id

        # Move to resolved list
        del self._pending_conflicts[conflict_id]
        self._resolved_conflicts.append(conflict)

        return resolved

    def _resolve_last_write_wins(self, conflict: Conflict) -> CanonicalPost:
        """Resolve by choosing the most recently modified version."""
        source_time = (
            conflict.source_post.last_modified or conflict.source_post.created_at
        )
        target_time = (
            conflict.target_post.last_modified or conflict.target_post.created_at
        )

        if source_time >= target_time:
            return conflict.source_post
        return conflict.target_post

    def _resolve_merge(self, conflict: Conflict) -> CanonicalPost:
        """
        Attempt to merge changes from both versions.

        This is a simple merge that:
        - Uses the longer content (assuming it has more info)
        - Combines media from both
        - Combines hashtags and mentions
        """
        source = conflict.source_post
        target = conflict.target_post

        # Choose content (prefer longer, or most recent if same length)
        if len(source.content) > len(target.content):
            content = source.content
        elif len(target.content) > len(source.content):
            content = target.content
        else:
            # Same length, use most recent
            source_time = source.last_modified or source.created_at
            target_time = target.last_modified or target.created_at
            content = source.content if source_time >= target_time else target.content

        # Merge media (union of both)
        media_urls = list(set(source.media_urls + target.media_urls))
        media_types = list(set(source.media_types + target.media_types))

        # Merge hashtags and mentions
        hashtags = list(set(source.hashtags + target.hashtags))
        mentions = list(set(source.mentions + target.mentions))

        # Use higher engagement counts
        likes = max(source.likes_count, target.likes_count)
        reposts = max(source.reposts_count, target.reposts_count)
        replies = max(source.replies_count, target.replies_count)
        views = max(source.views_count, target.views_count)

        # Create merged post
        merged = CanonicalPost(
            id=source.id,
            platform=source.platform,  # Keep original source
            platform_id=source.platform_id,
            content=content,
            created_at=source.created_at,
            author_id=source.author_id,
            author_username=source.author_username,
            author_display_name=source.author_display_name,
            media_urls=media_urls,
            media_types=media_types,
            likes_count=likes,
            reposts_count=reposts,
            replies_count=replies,
            views_count=views,
            is_thread=source.is_thread,
            thread_id=source.thread_id,
            reply_to_id=source.reply_to_id,
            hashtags=hashtags,
            mentions=mentions,
            urls=list(set(source.urls + target.urls)),
            language=source.language,
            synced_to={**source.synced_to, **target.synced_to},
            last_modified=datetime.now(),
            version=max(source.version, target.version) + 1,
        )

        return merged

    def get_pending_conflicts(self) -> List[Conflict]:
        """Get all pending (unresolved) conflicts."""
        return list(self._pending_conflicts.values())

    def get_conflict(self, conflict_id: str) -> Optional[Conflict]:
        """Get a specific conflict by ID."""
        return self._pending_conflicts.get(conflict_id)

    def get_resolved_conflicts(self, limit: int = 100) -> List[Conflict]:
        """Get recently resolved conflicts."""
        return self._resolved_conflicts[-limit:]

    def clear_resolved(self) -> None:
        """Clear resolved conflicts history."""
        self._resolved_conflicts.clear()

    def register_custom_resolver(
        self,
        name: str,
        resolver: Callable[[Conflict], CanonicalPost],
    ) -> None:
        """
        Register a custom conflict resolver.

        Args:
            name: Unique name for the resolver
            resolver: Function that takes a Conflict and returns resolved CanonicalPost
        """
        self._custom_resolvers[name] = resolver

    def resolve_custom(self, conflict: Conflict, resolver_name: str) -> CanonicalPost:
        """
        Resolve using a custom resolver.

        Args:
            conflict: Conflict to resolve
            resolver_name: Name of registered custom resolver

        Returns:
            Resolved post
        """
        if resolver_name not in self._custom_resolvers:
            raise ValueError(f"Custom resolver '{resolver_name}' not found")

        resolver = self._custom_resolvers[resolver_name]
        resolved = resolver(conflict)

        # Update conflict state
        conflict.resolved = True
        conflict.resolution_strategy = (
            ConflictStrategy.MANUAL
        )  # Custom counts as manual
        conflict.resolved_at = datetime.now()
        conflict.resolved_post = resolved
        conflict.resolved_by = f"custom:{resolver_name}"

        # Move to resolved list
        if conflict.id in self._pending_conflicts:
            del self._pending_conflicts[conflict.id]
        self._resolved_conflicts.append(conflict)

        return resolved
