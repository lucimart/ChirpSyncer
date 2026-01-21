"""
Platform Protocols Framework

Provides a unified interface for connecting to different social media platforms.
Supports capability-based feature detection and conflict resolution.
"""

from app.protocols.base import (
    PlatformConnector,
    CanonicalPost,
    PlatformCapabilities,
    ConnectorStatus,
    SyncDirection,
)
from app.protocols.registry import ConnectorRegistry, get_registry
from app.protocols.conflict import ConflictResolver, ConflictStrategy, Conflict

__all__ = [
    # Base classes
    "PlatformConnector",
    "CanonicalPost",
    "PlatformCapabilities",
    "ConnectorStatus",
    "SyncDirection",
    # Registry
    "ConnectorRegistry",
    "get_registry",
    # Conflict resolution
    "ConflictResolver",
    "ConflictStrategy",
    "Conflict",
]
