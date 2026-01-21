"""
Tests for Platform Protocols Framework (Sprint G).

Tests the connector interface, registry, and conflict resolution.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import pytest

from app.protocols.base import (
    PlatformConnector,
    CanonicalPost,
    PlatformCapabilities,
    ConnectorStatus,
    SyncDirection,
)
from app.protocols.registry import ConnectorRegistry, get_registry
from app.protocols.conflict import (
    ConflictResolver,
    ConflictStrategy,
    Conflict,
)


class MockConnector(PlatformConnector):
    """Mock connector for testing."""

    def __init__(self, platform_id: str = "mock"):
        self._platform_id = platform_id
        self._status = ConnectorStatus.DISCONNECTED
        self._posts: List[CanonicalPost] = []

    @property
    def platform_id(self) -> str:
        return self._platform_id

    @property
    def platform_name(self) -> str:
        return f"Mock {self._platform_id.title()}"

    @property
    def capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            max_post_length=280,
            supports_threads=True,
            can_fetch_posts=True,
            can_create_posts=True,
        )

    def get_status(self) -> ConnectorStatus:
        return self._status

    def connect(self, credentials: Dict[str, str]) -> bool:
        self._status = ConnectorStatus.CONNECTED
        return True

    def disconnect(self) -> None:
        self._status = ConnectorStatus.DISCONNECTED

    def validate_credentials(self, credentials: Dict[str, str]) -> bool:
        return bool(credentials.get("username"))

    def fetch_posts(
        self,
        username: str,
        count: int = 10,
        since_id: Optional[str] = None,
    ) -> List[CanonicalPost]:
        return self._posts[:count]

    def create_post(self, post: CanonicalPost) -> Optional[str]:
        post_id = f"{self._platform_id}_{len(self._posts)}"
        self._posts.append(post)
        return post_id


class TestCanonicalPost:
    """Tests for CanonicalPost dataclass."""

    def test_create_minimal_post(self):
        """Test creating a post with minimal required fields."""
        post = CanonicalPost(
            id="test_1",
            platform="twitter",
            platform_id="123456",
            content="Hello world!",
            created_at=datetime.now(),
            author_id="user_1",
            author_username="testuser",
        )

        assert post.id == "test_1"
        assert post.platform == "twitter"
        assert post.content == "Hello world!"
        assert post.likes_count == 0
        assert post.hashtags == []

    def test_post_to_dict(self):
        """Test converting post to dictionary."""
        now = datetime.now()
        post = CanonicalPost(
            id="test_1",
            platform="bluesky",
            platform_id="at://...",
            content="Test post #hashtag",
            created_at=now,
            author_id="did:plc:...",
            author_username="user.bsky.social",
            hashtags=["hashtag"],
            likes_count=10,
        )

        data = post.to_dict()

        assert data["id"] == "test_1"
        assert data["platform"] == "bluesky"
        assert data["content"] == "Test post #hashtag"
        assert data["hashtags"] == ["hashtag"]
        assert data["likes_count"] == 10

    def test_post_from_dict(self):
        """Test creating post from dictionary."""
        data = {
            "id": "test_2",
            "platform": "twitter",
            "platform_id": "789",
            "content": "From dict",
            "created_at": "2024-01-01T12:00:00",
            "author_id": "user_2",
            "author_username": "fromdict",
            "likes_count": 5,
        }

        post = CanonicalPost.from_dict(data)

        assert post.id == "test_2"
        assert post.content == "From dict"
        assert post.likes_count == 5


class TestPlatformCapabilities:
    """Tests for PlatformCapabilities."""

    def test_default_capabilities(self):
        """Test default capability values."""
        caps = PlatformCapabilities()

        assert caps.max_post_length == 280
        assert caps.supports_threads is False
        assert caps.supports_media is True
        assert caps.can_fetch_posts is True

    def test_custom_capabilities(self):
        """Test custom capability values."""
        caps = PlatformCapabilities(
            max_post_length=500,
            supports_threads=True,
            supports_video=True,
            can_edit_posts=True,
        )

        assert caps.max_post_length == 500
        assert caps.supports_threads is True
        assert caps.supports_video is True
        assert caps.can_edit_posts is True

    def test_capabilities_to_dict(self):
        """Test converting capabilities to dictionary."""
        caps = PlatformCapabilities(max_post_length=300)
        data = caps.to_dict()

        assert data["max_post_length"] == 300
        assert "supports_threads" in data
        assert "can_fetch_posts" in data


class TestConnectorRegistry:
    """Tests for ConnectorRegistry."""

    def setup_method(self):
        """Reset registry before each test."""
        # Create a fresh registry for testing
        self.registry = ConnectorRegistry()
        self.registry._connectors.clear()
        self.registry._connector_classes.clear()

    def test_register_connector(self):
        """Test registering a connector instance."""
        connector = MockConnector("test")
        self.registry.register(connector)

        assert "test" in self.registry.list_platforms()
        assert self.registry.get("test") is connector

    def test_register_class(self):
        """Test registering a connector class."""
        self.registry.register_class("mock", MockConnector)

        assert "mock" in self.registry.list_platforms()

    def test_get_or_create(self):
        """Test getting or creating a connector."""
        self.registry.register_class("mock", MockConnector)

        connector = self.registry.get_or_create("mock")

        assert connector is not None
        assert connector.platform_id == "mock"

        # Second call should return same instance
        connector2 = self.registry.get_or_create("mock")
        assert connector2 is connector

    def test_unregister(self):
        """Test unregistering a connector."""
        connector = MockConnector("test")
        connector.connect({})
        self.registry.register(connector)

        self.registry.unregister("test")

        assert self.registry.get("test") is None
        assert connector.get_status() == ConnectorStatus.DISCONNECTED

    def test_list_connected(self):
        """Test listing connected platforms."""
        conn1 = MockConnector("platform1")
        conn2 = MockConnector("platform2")

        conn1.connect({})
        # conn2 stays disconnected

        self.registry.register(conn1)
        self.registry.register(conn2)

        connected = self.registry.list_connected()

        assert "platform1" in connected
        assert "platform2" not in connected

    def test_get_capabilities(self):
        """Test getting platform capabilities."""
        connector = MockConnector("test")
        self.registry.register(connector)

        caps = self.registry.get_capabilities("test")

        assert caps is not None
        assert caps.max_post_length == 280

    def test_to_dict(self):
        """Test exporting registry state."""
        connector = MockConnector("test")
        connector.connect({})
        self.registry.register(connector)

        data = self.registry.to_dict()

        assert "test" in data
        assert data["test"]["status"] == "connected"
        assert data["test"]["is_connected"] is True


class TestConflictResolver:
    """Tests for ConflictResolver."""

    def _create_post(
        self,
        id: str,
        platform: str,
        content: str,
        modified: Optional[datetime] = None,
    ) -> CanonicalPost:
        """Helper to create test posts."""
        return CanonicalPost(
            id=id,
            platform=platform,
            platform_id=f"{platform}_{id}",
            content=content,
            created_at=datetime.now() - timedelta(hours=1),
            author_id="user_1",
            author_username="testuser",
            last_modified=modified or datetime.now(),
        )

    def test_detect_no_conflict(self):
        """Test that identical posts don't create conflict."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Same content")
        post2 = self._create_post("1", "bluesky", "Same content")

        conflict = resolver.detect_conflict(post1, post2)

        assert conflict is None

    def test_detect_content_conflict(self):
        """Test detecting content differences."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Original content")
        post2 = self._create_post("1", "bluesky", "Modified content")

        conflict = resolver.detect_conflict(post1, post2)

        assert conflict is not None
        assert conflict.content_differs is True
        assert conflict.resolved is False

    def test_resolve_last_write_wins(self):
        """Test last-write-wins resolution."""
        resolver = ConflictResolver(default_strategy=ConflictStrategy.LAST_WRITE_WINS)

        older = datetime.now() - timedelta(hours=1)
        newer = datetime.now()

        post1 = self._create_post("1", "twitter", "Older", modified=older)
        post2 = self._create_post("1", "bluesky", "Newer", modified=newer)

        conflict = resolver.detect_conflict(post1, post2)
        resolved = resolver.resolve(conflict)

        assert resolved.content == "Newer"
        assert conflict.resolved is True
        assert conflict.resolution_strategy == ConflictStrategy.LAST_WRITE_WINS

    def test_resolve_source_wins(self):
        """Test source-wins resolution."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Source content")
        post2 = self._create_post("1", "bluesky", "Target content")

        conflict = resolver.detect_conflict(post1, post2)
        resolved = resolver.resolve(conflict, strategy=ConflictStrategy.SOURCE_WINS)

        assert resolved.content == "Source content"

    def test_resolve_target_wins(self):
        """Test target-wins resolution."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Source content")
        post2 = self._create_post("1", "bluesky", "Target content")

        conflict = resolver.detect_conflict(post1, post2)
        resolved = resolver.resolve(conflict, strategy=ConflictStrategy.TARGET_WINS)

        assert resolved.content == "Target content"

    def test_resolve_merge(self):
        """Test merge resolution."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Short")
        post1.hashtags = ["tag1"]
        post1.likes_count = 10

        post2 = self._create_post("1", "bluesky", "Longer content here")
        post2.hashtags = ["tag2"]
        post2.likes_count = 5

        conflict = resolver.detect_conflict(post1, post2)
        resolved = resolver.resolve(conflict, strategy=ConflictStrategy.MERGE)

        # Should use longer content
        assert resolved.content == "Longer content here"
        # Should merge hashtags
        assert "tag1" in resolved.hashtags
        assert "tag2" in resolved.hashtags
        # Should use higher engagement
        assert resolved.likes_count == 10

    def test_resolve_manual(self):
        """Test manual resolution."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "Source")
        post2 = self._create_post("1", "bluesky", "Target")

        conflict = resolver.detect_conflict(post1, post2)
        resolved = resolver.resolve_manual(
            conflict.id,
            chosen_version="target",
            user_id="user_123",
        )

        assert resolved.content == "Target"
        assert conflict.resolved_by == "user_123"

    def test_pending_conflicts(self):
        """Test getting pending conflicts."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "A")
        post2 = self._create_post("1", "bluesky", "B")

        conflict = resolver.detect_conflict(post1, post2)

        pending = resolver.get_pending_conflicts()
        assert len(pending) == 1
        assert pending[0].id == conflict.id

        # After resolution, should be empty
        resolver.resolve(conflict)
        assert len(resolver.get_pending_conflicts()) == 0

    def test_resolved_conflicts_history(self):
        """Test resolved conflicts history."""
        resolver = ConflictResolver()

        post1 = self._create_post("1", "twitter", "A")
        post2 = self._create_post("1", "bluesky", "B")

        conflict = resolver.detect_conflict(post1, post2)
        resolver.resolve(conflict)

        resolved = resolver.get_resolved_conflicts()
        assert len(resolved) == 1
        assert resolved[0].resolved is True


class TestMockConnector:
    """Tests for the mock connector implementation."""

    def test_connect_disconnect(self):
        """Test connection lifecycle."""
        connector = MockConnector()

        assert connector.get_status() == ConnectorStatus.DISCONNECTED

        connector.connect({"username": "test"})
        assert connector.get_status() == ConnectorStatus.CONNECTED

        connector.disconnect()
        assert connector.get_status() == ConnectorStatus.DISCONNECTED

    def test_validate_credentials(self):
        """Test credential validation."""
        connector = MockConnector()

        assert connector.validate_credentials({"username": "test"}) is True
        assert connector.validate_credentials({}) is False

    def test_create_and_fetch_posts(self):
        """Test creating and fetching posts."""
        connector = MockConnector()
        connector.connect({})

        post = CanonicalPost(
            id="test_1",
            platform="mock",
            platform_id="",
            content="Test post",
            created_at=datetime.now(),
            author_id="user_1",
            author_username="testuser",
        )

        post_id = connector.create_post(post)
        assert post_id is not None

        posts = connector.fetch_posts("testuser", count=10)
        assert len(posts) == 1

    def test_adapt_content(self):
        """Test content adaptation for character limits."""
        connector = MockConnector()

        short = "Short content"
        assert connector.adapt_content(short) == short

        long = "x" * 300
        adapted = connector.adapt_content(long)
        assert len(adapted) == 280
        assert adapted.endswith("...")


class TestSyncDirection:
    """Tests for SyncDirection enum."""

    def test_sync_directions(self):
        """Test sync direction values."""
        assert SyncDirection.BIDIRECTIONAL.value == "bidirectional"
        assert SyncDirection.IMPORT_ONLY.value == "import_only"
        assert SyncDirection.EXPORT_ONLY.value == "export_only"


class TestConnectorStatus:
    """Tests for ConnectorStatus enum."""

    def test_connector_statuses(self):
        """Test connector status values."""
        assert ConnectorStatus.CONNECTED.value == "connected"
        assert ConnectorStatus.DISCONNECTED.value == "disconnected"
        assert ConnectorStatus.ERROR.value == "error"
        assert ConnectorStatus.RATE_LIMITED.value == "rate_limited"
