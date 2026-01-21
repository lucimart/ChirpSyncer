"""
Tests for Redis cache decorator.

TDD tests for app/core/cache.py
"""

import time
from unittest.mock import patch, MagicMock

import pytest


class TestCacheDecorator:
    """Test @cached decorator."""

    @patch("app.core.cache.get_redis")
    def test_cached_returns_cached_value(self, mock_get_redis):
        """Test cached decorator returns cached value on hit."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = '{"result": 42}'
        mock_get_redis.return_value = mock_redis

        call_count = 0

        @cached(ttl=60)
        def expensive_function(x):
            nonlocal call_count
            call_count += 1
            return {"result": x * 2}

        # First call - should check cache
        result = expensive_function(21)

        assert result == {"result": 42}
        mock_redis.get.assert_called_once()

    @patch("app.core.cache.get_redis")
    def test_cached_calls_function_on_miss(self, mock_get_redis):
        """Test cached decorator calls function on cache miss."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # Cache miss
        mock_get_redis.return_value = mock_redis

        call_count = 0

        @cached(ttl=60)
        def expensive_function(x):
            nonlocal call_count
            call_count += 1
            return {"result": x * 2}

        result = expensive_function(21)

        assert result == {"result": 42}
        assert call_count == 1
        mock_redis.setex.assert_called_once()

    @patch("app.core.cache.get_redis")
    def test_cached_stores_result_with_ttl(self, mock_get_redis):
        """Test cached decorator stores result with correct TTL."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_get_redis.return_value = mock_redis

        @cached(ttl=300)
        def my_function():
            return {"data": "value"}

        my_function()

        # Check setex was called with correct TTL
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 300  # TTL

    @patch("app.core.cache.get_redis")
    def test_cached_generates_unique_keys(self, mock_get_redis):
        """Test cached decorator generates unique cache keys per arguments."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_get_redis.return_value = mock_redis

        @cached(ttl=60)
        def my_function(a, b):
            return a + b

        my_function(1, 2)
        my_function(3, 4)

        # Should have different cache keys
        calls = mock_redis.get.call_args_list
        key1 = calls[0][0][0]
        key2 = calls[1][0][0]
        assert key1 != key2

    @patch("app.core.cache.get_redis")
    def test_cached_with_prefix(self, mock_get_redis):
        """Test cached decorator uses custom prefix."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_get_redis.return_value = mock_redis

        @cached(ttl=60, prefix="myprefix")
        def my_function():
            return "result"

        my_function()

        call_args = mock_redis.get.call_args
        cache_key = call_args[0][0]
        assert cache_key.startswith("myprefix:")

    @patch("app.core.cache.get_redis")
    def test_cached_handles_redis_error_gracefully(self, mock_get_redis):
        """Test cached decorator handles Redis errors gracefully."""
        from app.core.cache import cached
        import redis

        mock_redis = MagicMock()
        mock_redis.get.side_effect = redis.RedisError("Connection failed")
        mock_get_redis.return_value = mock_redis

        @cached(ttl=60)
        def my_function():
            return "fallback_result"

        # Should not raise, should call function directly
        result = my_function()
        assert result == "fallback_result"


class TestCacheInvalidation:
    """Test cache invalidation."""

    @patch("app.core.cache.get_redis")
    def test_invalidate_cache(self, mock_get_redis):
        """Test invalidating cache for a key pattern."""
        from app.core.cache import invalidate_cache

        mock_redis = MagicMock()
        mock_redis.keys.return_value = ["prefix:key1", "prefix:key2"]
        mock_get_redis.return_value = mock_redis

        invalidate_cache("prefix:*")

        mock_redis.keys.assert_called_once_with("prefix:*")
        assert mock_redis.delete.call_count == 2

    @patch("app.core.cache.get_redis")
    def test_invalidate_cache_no_matches(self, mock_get_redis):
        """Test invalidating cache when no keys match."""
        from app.core.cache import invalidate_cache

        mock_redis = MagicMock()
        mock_redis.keys.return_value = []
        mock_get_redis.return_value = mock_redis

        result = invalidate_cache("nonexistent:*")

        assert result == 0


class TestCacheKeyGeneration:
    """Test cache key generation."""

    def test_generate_cache_key_with_args(self):
        """Test cache key generation with positional args."""
        from app.core.cache import generate_cache_key

        key = generate_cache_key("myfunction", (1, 2, 3), {})
        assert "myfunction" in key
        assert key is not None

    def test_generate_cache_key_with_kwargs(self):
        """Test cache key generation with keyword args."""
        from app.core.cache import generate_cache_key

        key1 = generate_cache_key("func", (), {"a": 1, "b": 2})
        key2 = generate_cache_key("func", (), {"b": 2, "a": 1})

        # Same kwargs in different order should produce same key
        assert key1 == key2

    def test_generate_cache_key_different_for_different_args(self):
        """Test cache keys are different for different arguments."""
        from app.core.cache import generate_cache_key

        key1 = generate_cache_key("func", (1,), {})
        key2 = generate_cache_key("func", (2,), {})

        assert key1 != key2


class TestCacheStats:
    """Test cache statistics."""

    @patch("app.core.cache.get_redis")
    def test_get_cache_stats(self, mock_get_redis):
        """Test getting cache statistics."""
        from app.core.cache import get_cache_stats

        mock_redis = MagicMock()
        mock_redis.info.return_value = {
            "keyspace_hits": 100,
            "keyspace_misses": 20,
            "used_memory_human": "1.5M",
        }
        mock_redis.dbsize.return_value = 50
        mock_get_redis.return_value = mock_redis

        stats = get_cache_stats()

        assert stats["hits"] == 100
        assert stats["misses"] == 20
        assert stats["keys"] == 50
        assert stats["hit_rate"] == pytest.approx(100 / 120, rel=0.01)
