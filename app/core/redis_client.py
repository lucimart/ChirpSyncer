import redis

from app.core import config

_redis_client = redis.Redis(
    host=config.REDIS_HOST,
    port=config.REDIS_PORT,
    db=0,
    decode_responses=True,
)


def get_redis() -> redis.Redis:
    return _redis_client


def ping_redis() -> bool:
    try:
        return bool(_redis_client.ping())
    except redis.RedisError:
        return False
