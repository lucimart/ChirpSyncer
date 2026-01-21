from unittest.mock import patch

import redis

from app.core.redis_client import get_redis


class TestInfraRedis:
    def test_redis_client_instance(self):
        client = get_redis()
        assert isinstance(client, redis.Redis)

    def test_health_redis_ok(self, test_client):
        with patch("app.web.api.v1.health.ping_redis", return_value=True):
            response = test_client.get("/api/v1/health/redis")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"
        assert data["service"] == "redis"

    def test_health_redis_unavailable(self, test_client):
        with patch("app.web.api.v1.health.ping_redis", return_value=False):
            response = test_client.get("/api/v1/health/redis")
        assert response.status_code == 503
        data = response.get_json()
        assert data["status"] == "unavailable"
        assert data["service"] == "redis"
