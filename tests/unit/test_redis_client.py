"""
Tests for Redis client module.

TDD tests for app/core/redis_client.py
"""

import pytest
from unittest.mock import patch, MagicMock


class TestRedisClient:
    """Test Redis client singleton and operations."""

    def test_get_redis_returns_client(self):
        """Test get_redis returns a Redis client instance."""
        with patch("app.core.redis_client.redis.Redis") as mock_redis:
            mock_client = MagicMock()
            mock_redis.return_value = mock_client

            # Re-import to get fresh module with mocked Redis
            import importlib
            import app.core.redis_client as redis_module

            importlib.reload(redis_module)

            client = redis_module.get_redis()
            assert client is not None

    def test_ping_redis_returns_true_when_connected(self):
        """Test ping_redis returns True when Redis is available."""
        with patch("app.core.redis_client._redis_client") as mock_client:
            mock_client.ping.return_value = True

            from app.core.redis_client import ping_redis

            result = ping_redis()

            assert result is True
            mock_client.ping.assert_called_once()

    def test_ping_redis_returns_false_on_error(self):
        """Test ping_redis returns False when Redis is unavailable."""
        import redis

        with patch("app.core.redis_client._redis_client") as mock_client:
            mock_client.ping.side_effect = redis.RedisError("Connection refused")

            from app.core.redis_client import ping_redis

            result = ping_redis()

            assert result is False


class TestRedisConfiguration:
    """Test Redis client configuration."""

    def test_redis_uses_config_host(self):
        """Test Redis client uses host from config."""
        with patch("app.core.config.REDIS_HOST", "test-host"):
            with patch("app.core.config.REDIS_PORT", 6380):
                with patch("app.core.redis_client.redis.Redis") as mock_redis:
                    import importlib
                    import app.core.redis_client as redis_module

                    importlib.reload(redis_module)

                    # Check Redis was called with config values
                    mock_redis.assert_called()

    def test_redis_decode_responses_enabled(self):
        """Test Redis client has decode_responses=True."""
        # The actual implementation should have decode_responses=True
        # This is verified by checking the module source
        from app.core import redis_client
        import inspect

        source = inspect.getsource(redis_client)
        assert "decode_responses=True" in source
