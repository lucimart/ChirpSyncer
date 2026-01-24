"""
Connector Registry

Manages registration and retrieval of platform connectors.
Provides a central point for discovering available platforms and their capabilities.
"""

import logging
from typing import Dict, List, Optional, Type

from app.protocols.base import PlatformConnector, PlatformCapabilities, ConnectorStatus

logger = logging.getLogger(__name__)


class ConnectorRegistry:
    """
    Registry for platform connectors.

    Manages connector instances and provides discovery functionality.
    Implements singleton pattern for global access.
    """

    _instance: Optional["ConnectorRegistry"] = None

    def __new__(cls) -> "ConnectorRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connectors: Dict[str, PlatformConnector] = {}
            cls._instance._connector_classes: Dict[str, Type[PlatformConnector]] = {}
        return cls._instance

    def register_class(
        self,
        platform_id: str,
        connector_class: Type[PlatformConnector],
    ) -> None:
        """
        Register a connector class for a platform.

        Args:
            platform_id: Unique platform identifier
            connector_class: Connector class (not instance)
        """
        self._connector_classes[platform_id] = connector_class

    def register(self, connector: PlatformConnector) -> None:
        """
        Register a connector instance.

        Args:
            connector: Connector instance to register
        """
        self._connectors[connector.platform_id] = connector

    def unregister(self, platform_id: str) -> None:
        """
        Unregister a connector.

        Args:
            platform_id: Platform identifier to unregister
        """
        if platform_id in self._connectors:
            connector = self._connectors[platform_id]
            connector.disconnect()
            del self._connectors[platform_id]

    def get(self, platform_id: str) -> Optional[PlatformConnector]:
        """
        Get a registered connector by platform ID.

        Args:
            platform_id: Platform identifier

        Returns:
            Connector instance or None if not registered
        """
        return self._connectors.get(platform_id)

    def get_or_create(
        self,
        platform_id: str,
        **kwargs,
    ) -> Optional[PlatformConnector]:
        """
        Get existing connector or create new one from registered class.

        Args:
            platform_id: Platform identifier
            **kwargs: Arguments to pass to connector constructor

        Returns:
            Connector instance or None if class not registered
        """
        if platform_id in self._connectors:
            return self._connectors[platform_id]

        if platform_id in self._connector_classes:
            connector = self._connector_classes[platform_id](**kwargs)
            self._connectors[platform_id] = connector
            return connector

        return None

    def list_platforms(self) -> List[str]:
        """
        List all registered platform IDs.

        Returns:
            List of platform identifiers
        """
        # Combine registered instances and classes
        all_platforms = set(self._connectors.keys()) | set(
            self._connector_classes.keys()
        )
        return sorted(all_platforms)

    def list_connected(self) -> List[str]:
        """
        List platforms with active connections.

        Returns:
            List of connected platform identifiers
        """
        connected = []
        for platform_id, connector in self._connectors.items():
            if connector.get_status() == ConnectorStatus.CONNECTED:
                connected.append(platform_id)
        return connected

    def get_capabilities(self, platform_id: str) -> Optional[PlatformCapabilities]:
        """
        Get capabilities for a platform.

        Args:
            platform_id: Platform identifier

        Returns:
            Platform capabilities or None if not registered
        """
        connector = self.get(platform_id)
        if connector:
            return connector.capabilities

        # Try to get from class
        if platform_id in self._connector_classes:
            # Create temporary instance to get capabilities
            temp = self._connector_classes[platform_id]()
            return temp.capabilities

        return None

    def get_all_capabilities(self) -> Dict[str, PlatformCapabilities]:
        """
        Get capabilities for all registered platforms.

        Returns:
            Dictionary mapping platform IDs to their capabilities
        """
        capabilities = {}
        for platform_id in self.list_platforms():
            caps = self.get_capabilities(platform_id)
            if caps:
                capabilities[platform_id] = caps
        return capabilities

    def get_status_all(self) -> Dict[str, ConnectorStatus]:
        """
        Get connection status for all registered connectors.

        Returns:
            Dictionary mapping platform IDs to their status
        """
        status = {}
        for platform_id, connector in self._connectors.items():
            status[platform_id] = connector.get_status()
        return status

    def clear(self) -> None:
        """
        Clear all registered connectors.

        Disconnects all connectors before clearing.
        """
        for connector in self._connectors.values():
            try:
                connector.disconnect()
            except Exception as exc:
                logger.warning("Failed to disconnect connector: %s", exc)
        self._connectors.clear()

    def to_dict(self) -> Dict[str, dict]:
        """
        Export registry state as dictionary.

        Returns:
            Dictionary with platform info including status and capabilities
        """
        result = {}
        for platform_id in self.list_platforms():
            connector = self.get(platform_id)
            caps = self.get_capabilities(platform_id)

            result[platform_id] = {
                "platform_id": platform_id,
                "platform_name": connector.platform_name
                if connector
                else platform_id.title(),
                "status": connector.get_status().value
                if connector
                else "not_initialized",
                "capabilities": caps.to_dict() if caps else None,
                "is_connected": connector.get_status() == ConnectorStatus.CONNECTED
                if connector
                else False,
            }

        return result


# Global registry instance
_registry: Optional[ConnectorRegistry] = None


def get_registry() -> ConnectorRegistry:
    """
    Get the global connector registry.

    Returns:
        Global ConnectorRegistry instance
    """
    global _registry
    if _registry is None:
        _registry = ConnectorRegistry()
    return _registry
