"""
Redis cache decorator and utilities.

Provides a @cached decorator for caching function results in Redis,
along with cache invalidation and statistics functions.
"""

import functools
import hashlib
import json
import logging
from typing import Any, Callable, Dict, Optional, TypeVar

import redis

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def generate_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """
    Generate a unique cache key for a function call.

    Args:
        func_name: Name of the function.
        args: Positional arguments.
        kwargs: Keyword arguments.

    Returns:
        A unique cache key string.
    """
    # Sort kwargs to ensure consistent key generation
    sorted_kwargs = sorted(kwargs.items())

    # Create a hashable representation
    key_data = json.dumps(
        {"func": func_name, "args": args, "kwargs": sorted_kwargs},
        sort_keys=True,
        default=str,
    )

    # Hash for shorter keys
    key_hash = hashlib.sha256(key_data.encode()).hexdigest()
    return f"{func_name}:{key_hash}"


def cached(ttl: int, prefix: str = "cache") -> Callable[[F], F]:
    """
    Decorator to cache function results in Redis.

    Args:
        ttl: Time-to-live in seconds.
        prefix: Cache key prefix.

    Returns:
        Decorated function.

    Example:
        @cached(ttl=300, prefix="analytics")
        def get_user_stats(user_id: int) -> dict:
            # expensive computation
            return {"stats": "data"}
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                redis_client = get_redis()

                # Generate cache key
                base_key = generate_cache_key(func.__name__, args, kwargs)
                cache_key = f"{prefix}:{base_key}"

                # Try to get from cache
                cached_value = redis_client.get(cache_key)
                if cached_value is not None:
                    return json.loads(cached_value)

                # Cache miss - call function
                result = func(*args, **kwargs)

                # Store in cache
                redis_client.setex(cache_key, ttl, json.dumps(result))

                return result

            except redis.RedisError as e:
                # Redis error - fall back to calling function directly
                logger.warning(f"Redis cache error: {e}. Calling function directly.")
                return func(*args, **kwargs)

        return wrapper  # type: ignore

    return decorator


def invalidate_cache(pattern: str) -> int:
    """
    Invalidate cache keys matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "prefix:*").

    Returns:
        Number of keys deleted.
    """
    try:
        redis_client = get_redis()
        keys = redis_client.keys(pattern)

        if not keys:
            return 0

        deleted = 0
        for key in keys:
            redis_client.delete(key)
            deleted += 1

        return deleted

    except redis.RedisError as e:
        logger.warning(f"Redis invalidation error: {e}")
        return 0


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics from Redis.

    Returns:
        Dictionary with hits, misses, keys, hit_rate, and memory usage.
    """
    try:
        redis_client = get_redis()
        info = redis_client.info()
        db_size = redis_client.dbsize()

        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses

        return {
            "hits": hits,
            "misses": misses,
            "keys": db_size,
            "hit_rate": hits / total if total > 0 else 0.0,
            "memory": info.get("used_memory_human", "0B"),
        }

    except redis.RedisError as e:
        logger.warning(f"Redis stats error: {e}")
        return {
            "hits": 0,
            "misses": 0,
            "keys": 0,
            "hit_rate": 0.0,
            "memory": "0B",
            "error": str(e),
        }
