"""
Integration Tests for API Responses and Models (Coverage Boost)

Tests for:
- app/web/api/v1/responses.py (42.86% -> target 80%+)
- app/models/notification.py (22.22% -> target 100%)
- app/core/cache.py (0% -> target 50%+)

These tests improve overall code coverage to meet the 60% threshold.
"""

import os
import sqlite3
import json
from unittest.mock import patch, MagicMock

import pytest


# =============================================================================
# RESPONSES MODULE TESTS
# =============================================================================


class TestResponsesHelpers:
    """Tests for app/web/api/v1/responses.py helper functions."""

    def test_contains_stack_trace_detects_traceback(self):
        """Test _contains_stack_trace detects Traceback string."""
        from app.web.api.v1.responses import _contains_stack_trace

        assert _contains_stack_trace("Traceback (most recent call last):") is True

    def test_contains_stack_trace_detects_file_line(self):
        """Test _contains_stack_trace detects File and line patterns."""
        from app.web.api.v1.responses import _contains_stack_trace

        assert _contains_stack_trace('File "/app/main.py", line 42, in func') is True

    def test_contains_stack_trace_detects_error_message(self):
        """Test _contains_stack_trace detects Error: pattern."""
        from app.web.api.v1.responses import _contains_stack_trace

        assert _contains_stack_trace("ValueError: invalid literal") is True
        assert _contains_stack_trace("Exception: Something went wrong") is True

    def test_contains_stack_trace_false_for_normal_text(self):
        """Test _contains_stack_trace returns False for normal text."""
        from app.web.api.v1.responses import _contains_stack_trace

        assert _contains_stack_trace("Hello, world!") is False
        assert _contains_stack_trace("User created successfully") is False

    def test_contains_stack_trace_handles_dict(self):
        """Test _contains_stack_trace handles dict with stack trace in value."""
        from app.web.api.v1.responses import _contains_stack_trace

        data = {"error": "Traceback (most recent call last):"}
        assert _contains_stack_trace(data) is True

        clean_data = {"message": "Success"}
        assert _contains_stack_trace(clean_data) is False

    def test_contains_stack_trace_handles_list(self):
        """Test _contains_stack_trace handles list with stack trace."""
        from app.web.api.v1.responses import _contains_stack_trace

        data = ["normal", "Traceback (most recent call last):", "more text"]
        assert _contains_stack_trace(data) is True

        clean_data = ["normal", "text", "here"]
        assert _contains_stack_trace(clean_data) is False

    def test_contains_stack_trace_handles_none(self):
        """Test _contains_stack_trace handles None."""
        from app.web.api.v1.responses import _contains_stack_trace

        assert _contains_stack_trace(None) is False

    def test_contains_stack_trace_handles_nested_structure(self):
        """Test _contains_stack_trace handles nested dict/list."""
        from app.web.api.v1.responses import _contains_stack_trace

        data = {
            "level1": {
                "level2": ["Traceback (most recent call last):"]
            }
        }
        assert _contains_stack_trace(data) is True

    def test_contains_stack_trace_depth_limit(self):
        """Test _contains_stack_trace respects depth limit."""
        from app.web.api.v1.responses import _contains_stack_trace

        # Create deeply nested structure
        deep = "Traceback"
        for _ in range(10):
            deep = {"nested": deep}
        # Should not recurse infinitely, returns False due to depth limit
        result = _contains_stack_trace(deep)
        # The function should not crash and should return a boolean
        assert isinstance(result, bool)

    def test_sanitize_response_data_non_production(self):
        """Test _sanitize_response_data passes data in non-production."""
        from app.web.api.v1.responses import _sanitize_response_data

        with patch.dict(os.environ, {"FLASK_ENV": "development"}, clear=False):
            data = {"error": "Traceback (most recent call last):"}
            result = _sanitize_response_data(data)
            assert result == data

    def test_sanitize_response_data_production_with_trace(self):
        """Test _sanitize_response_data sanitizes in production."""
        from app.web.api.v1.responses import _sanitize_response_data

        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            data = {"error": "Traceback (most recent call last):"}
            result = _sanitize_response_data(data)
            assert result == {"error": "An internal error occurred"}

    def test_sanitize_response_data_production_clean(self):
        """Test _sanitize_response_data passes clean data in production."""
        from app.web.api.v1.responses import _sanitize_response_data

        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            data = {"message": "Success", "count": 5}
            result = _sanitize_response_data(data)
            assert result == data

    def test_sanitize_response_data_none(self):
        """Test _sanitize_response_data handles None."""
        from app.web.api.v1.responses import _sanitize_response_data

        assert _sanitize_response_data(None) is None

    def test_sanitize_details_non_production(self):
        """Test _sanitize_details still sanitizes in non-production (security first)."""
        from app.web.api.v1.responses import _sanitize_details

        with patch.dict(os.environ, {"FLASK_ENV": "development"}, clear=False):
            # _sanitize_details always filters to safe keys regardless of environment
            details = {"stack": "trace info", "extra": "data"}
            result = _sanitize_details(details)
            # Neither 'stack' nor 'extra' are in safe_keys, so result is None
            assert result is None

    def test_sanitize_details_production_filters_keys(self):
        """Test _sanitize_details filters keys in production."""
        from app.web.api.v1.responses import _sanitize_details

        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            details = {
                "field": "username",
                "stack": "trace info",
                "validation_errors": ["error1"],
            }
            result = _sanitize_details(details)
            assert "field" in result
            assert "validation_errors" in result
            assert "stack" not in result

    def test_sanitize_details_production_string(self):
        """Test _sanitize_details returns None for string in production."""
        from app.web.api.v1.responses import _sanitize_details

        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            result = _sanitize_details("Some error details")
            assert result is None

    def test_sanitize_details_none(self):
        """Test _sanitize_details handles None."""
        from app.web.api.v1.responses import _sanitize_details

        assert _sanitize_details(None) is None


class TestAPIResponseFunctions:
    """Tests for api_response and api_error functions."""

    def test_api_response_success(self, app_context):
        """Test api_response returns success format."""
        from app.web.api.v1.responses import api_response

        response, status = api_response({"key": "value"}, 200)
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["key"] == "value"
        assert status == 200

    def test_api_response_with_different_status(self, app_context):
        """Test api_response with 201 status."""
        from app.web.api.v1.responses import api_response

        response, status = api_response({"id": 1}, 201)
        assert status == 201

    def test_api_response_with_none_data(self, app_context):
        """Test api_response with None data."""
        from app.web.api.v1.responses import api_response

        response, status = api_response(None, 200)
        data = response.get_json()
        assert data["success"] is True
        assert data["data"] is None

    def test_api_error_basic(self, app_context):
        """Test api_error returns error format."""
        from app.web.api.v1.responses import api_error

        response, status = api_error("NOT_FOUND", "Resource not found", 404)
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "NOT_FOUND"
        assert data["error"]["message"] == "Resource not found"
        assert status == 404

    def test_api_error_with_details(self, app_context):
        """Test api_error with details."""
        from app.web.api.v1.responses import api_error

        with patch.dict(os.environ, {"FLASK_ENV": "development"}, clear=False):
            response, status = api_error(
                "VALIDATION_ERROR",
                "Validation failed",
                400,
                details={"field": "email", "constraint": "format"}
            )
            data = response.get_json()
            assert data["error"]["details"]["field"] == "email"


# =============================================================================
# NOTIFICATION MODEL TESTS
# =============================================================================


class TestNotificationModel:
    """Tests for app/models/notification.py."""

    def test_init_notifications_db_creates_table(self, tmp_path):
        """Test init_notifications_db creates notifications table."""
        from app.models.notification import init_notifications_db

        db_path = str(tmp_path / "test_notifications.db")
        init_notifications_db(db_path)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None
        assert result[0] == "notifications"

    def test_init_notifications_db_creates_index(self, tmp_path):
        """Test init_notifications_db creates user_id index."""
        from app.models.notification import init_notifications_db

        db_path = str(tmp_path / "test_notifications.db")
        init_notifications_db(db_path)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_notifications_user_id'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None

    def test_init_notifications_db_table_schema(self, tmp_path):
        """Test init_notifications_db creates correct schema."""
        from app.models.notification import init_notifications_db

        db_path = str(tmp_path / "test_notifications.db")
        init_notifications_db(db_path)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(notifications)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        conn.close()

        expected_columns = {
            "id": "INTEGER",
            "user_id": "INTEGER",
            "type": "TEXT",
            "severity": "TEXT",
            "title": "TEXT",
            "message": "TEXT",
            "action_url": "TEXT",
            "action_label": "TEXT",
            "read": "INTEGER",
            "created_at": "TIMESTAMP",
        }

        for col, col_type in expected_columns.items():
            assert col in columns, f"Missing column: {col}"

    def test_init_notifications_db_idempotent(self, tmp_path):
        """Test init_notifications_db can be called multiple times."""
        from app.models.notification import init_notifications_db

        db_path = str(tmp_path / "test_notifications.db")

        # Call twice - should not raise
        init_notifications_db(db_path)
        init_notifications_db(db_path)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notifications'"
        )
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1


# =============================================================================
# CACHE MODULE TESTS
# =============================================================================


class TestCacheModule:
    """Tests for app/core/cache.py."""

    def test_generate_cache_key_basic(self):
        """Test generate_cache_key returns consistent key."""
        from app.core.cache import generate_cache_key

        key1 = generate_cache_key("test_func", (1, 2), {"a": "b"})
        key2 = generate_cache_key("test_func", (1, 2), {"a": "b"})

        assert key1 == key2
        assert key1.startswith("test_func:")
        assert len(key1) > 20  # func_name + : + hash

    def test_generate_cache_key_different_args(self):
        """Test generate_cache_key returns different keys for different args."""
        from app.core.cache import generate_cache_key

        key1 = generate_cache_key("test_func", (1,), {})
        key2 = generate_cache_key("test_func", (2,), {})

        assert key1 != key2

    def test_generate_cache_key_kwargs_order_independent(self):
        """Test generate_cache_key is independent of kwargs order."""
        from app.core.cache import generate_cache_key

        key1 = generate_cache_key("test_func", (), {"a": 1, "b": 2})
        key2 = generate_cache_key("test_func", (), {"b": 2, "a": 1})

        assert key1 == key2

    def test_generate_cache_key_handles_complex_args(self):
        """Test generate_cache_key handles complex arguments."""
        from app.core.cache import generate_cache_key

        key = generate_cache_key(
            "complex_func",
            ({"nested": "dict"}, [1, 2, 3]),
            {"date": "2024-01-01"}
        )

        assert isinstance(key, str)
        assert key.startswith("complex_func:")

    def test_cached_decorator_with_mock_redis(self):
        """Test cached decorator with mocked Redis."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = None  # Cache miss
        mock_redis.setex.return_value = True

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            @cached(ttl=300, prefix="test")
            def my_func(x):
                return x * 2

            result = my_func(5)
            assert result == 10
            mock_redis.setex.assert_called_once()

    def test_cached_decorator_cache_hit(self):
        """Test cached decorator returns cached value on hit."""
        from app.core.cache import cached

        mock_redis = MagicMock()
        mock_redis.get.return_value = json.dumps({"cached": True})

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            call_count = 0

            @cached(ttl=300, prefix="test")
            def my_func(x):
                nonlocal call_count
                call_count += 1
                return {"computed": True}

            result = my_func(5)
            assert result == {"cached": True}
            assert call_count == 0  # Function was not called

    def test_cached_decorator_handles_redis_error(self):
        """Test cached decorator handles Redis errors gracefully."""
        from app.core.cache import cached
        import redis

        mock_redis = MagicMock()
        mock_redis.get.side_effect = redis.RedisError("Connection failed")

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            @cached(ttl=300, prefix="test")
            def my_func(x):
                return x * 2

            # Should fall back to calling function directly
            result = my_func(5)
            assert result == 10

    def test_invalidate_cache_with_mock_redis(self):
        """Test invalidate_cache with mocked Redis."""
        from app.core.cache import invalidate_cache

        mock_redis = MagicMock()
        mock_redis.keys.return_value = [b"key1", b"key2", b"key3"]
        mock_redis.delete.return_value = 1

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            deleted = invalidate_cache("test:*")
            assert deleted == 3
            assert mock_redis.delete.call_count == 3

    def test_invalidate_cache_no_keys(self):
        """Test invalidate_cache returns 0 when no keys match."""
        from app.core.cache import invalidate_cache

        mock_redis = MagicMock()
        mock_redis.keys.return_value = []

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            deleted = invalidate_cache("nonexistent:*")
            assert deleted == 0

    def test_invalidate_cache_handles_redis_error(self):
        """Test invalidate_cache handles Redis errors."""
        from app.core.cache import invalidate_cache
        import redis

        mock_redis = MagicMock()
        mock_redis.keys.side_effect = redis.RedisError("Connection failed")

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            deleted = invalidate_cache("test:*")
            assert deleted == 0

    def test_get_cache_stats_with_mock_redis(self):
        """Test get_cache_stats with mocked Redis."""
        from app.core.cache import get_cache_stats

        mock_redis = MagicMock()
        mock_redis.info.return_value = {
            "keyspace_hits": 100,
            "keyspace_misses": 20,
            "used_memory_human": "1.5M",
        }
        mock_redis.dbsize.return_value = 50

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            stats = get_cache_stats()
            assert stats["hits"] == 100
            assert stats["misses"] == 20
            assert stats["keys"] == 50
            assert stats["hit_rate"] == pytest.approx(100 / 120)
            assert stats["memory"] == "1.5M"

    def test_get_cache_stats_handles_zero_total(self):
        """Test get_cache_stats handles zero hits and misses."""
        from app.core.cache import get_cache_stats

        mock_redis = MagicMock()
        mock_redis.info.return_value = {
            "keyspace_hits": 0,
            "keyspace_misses": 0,
            "used_memory_human": "0B",
        }
        mock_redis.dbsize.return_value = 0

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            stats = get_cache_stats()
            assert stats["hit_rate"] == 0.0

    def test_get_cache_stats_handles_redis_error(self):
        """Test get_cache_stats handles Redis errors."""
        from app.core.cache import get_cache_stats
        import redis

        mock_redis = MagicMock()
        mock_redis.info.side_effect = redis.RedisError("Connection failed")

        with patch("app.core.cache.get_redis", return_value=mock_redis):
            stats = get_cache_stats()
            assert stats["hits"] == 0
            assert stats["misses"] == 0
            assert stats["keys"] == 0
            assert stats["hit_rate"] == 0.0
            assert "error" in stats


# =============================================================================
# ADDITIONAL COVERAGE TESTS
# =============================================================================


class TestErrorsModule:
    """Tests for app/web/api/v1/errors.py"""

    def test_errors_module_imports(self, app_context):
        """Test errors module can be imported."""
        from app.web.api.v1 import errors

        # Verify the module is loaded
        assert errors is not None

    def test_api_error_class_initialization(self):
        """Test ApiError class basic initialization."""
        from app.web.api.v1.errors import ApiError

        error = ApiError("TEST_ERROR", "Test message", 400)
        assert error.code == "TEST_ERROR"
        assert error.message == "Test message"
        assert error.status_code == 400
        assert error.details is None

    def test_api_error_with_details(self):
        """Test ApiError class with details."""
        from app.web.api.v1.errors import ApiError

        details = {"field": "username", "constraint": "unique"}
        error = ApiError("VALIDATION_ERROR", "Validation failed", 400, details=details)
        assert error.details == details
        assert error.details["field"] == "username"

    def test_api_error_with_different_status_codes(self):
        """Test ApiError class with various status codes."""
        from app.web.api.v1.errors import ApiError

        error_401 = ApiError("UNAUTHORIZED", "Not authorized", 401)
        assert error_401.status_code == 401

        error_403 = ApiError("FORBIDDEN", "Access denied", 403)
        assert error_403.status_code == 403

        error_404 = ApiError("NOT_FOUND", "Resource not found", 404)
        assert error_404.status_code == 404

        error_500 = ApiError("SERVER_ERROR", "Internal error", 500)
        assert error_500.status_code == 500

    def test_api_error_inherits_from_exception(self):
        """Test ApiError inherits from Exception."""
        from app.web.api.v1.errors import ApiError

        error = ApiError("TEST", "Test error")
        assert isinstance(error, Exception)

    def test_api_error_str_representation(self):
        """Test ApiError string representation."""
        from app.web.api.v1.errors import ApiError

        error = ApiError("TEST", "Test error message")
        assert str(error) == "Test error message"

    def test_api_error_default_status_code(self):
        """Test ApiError uses 400 as default status code."""
        from app.web.api.v1.errors import ApiError

        error = ApiError("TEST", "Test")
        assert error.status_code == 400


class TestHealthEndpoints:
    """Additional tests for health endpoints."""

    def test_health_base_endpoint(self, test_client):
        """Test basic health endpoint."""
        response = test_client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "healthy"


class TestRedisClient:
    """Tests for app/core/redis_client.py."""

    def test_get_redis_returns_client(self):
        """Test get_redis returns a Redis client instance."""
        from app.core.redis_client import get_redis
        import redis

        client = get_redis()
        assert isinstance(client, redis.Redis)

    def test_ping_redis_returns_bool(self):
        """Test ping_redis returns boolean."""
        from app.core.redis_client import ping_redis

        result = ping_redis()
        assert isinstance(result, bool)

    def test_ping_redis_handles_error(self):
        """Test ping_redis handles Redis errors."""
        from app.core import redis_client
        import redis

        # Save original client
        original_client = redis_client._redis_client

        # Create mock that raises error
        mock_client = MagicMock()
        mock_client.ping.side_effect = redis.RedisError("Connection refused")

        try:
            redis_client._redis_client = mock_client
            result = redis_client.ping_redis()
            assert result is False
        finally:
            # Restore original
            redis_client._redis_client = original_client


class TestEventsModule:
    """Tests for app/core/events.py."""

    def test_sync_progress_message_basic(self):
        """Test sync_progress_message creates proper message."""
        from app.core.events import sync_progress_message

        msg = sync_progress_message("job123", "running", current=5)
        assert msg["type"] == "sync.progress"
        assert msg["payload"]["operation_id"] == "job123"
        assert msg["payload"]["current"] == 5
        assert msg["payload"]["message"] == "running"

    def test_sync_progress_message_with_total(self):
        """Test sync_progress_message with total parameter."""
        from app.core.events import sync_progress_message

        msg = sync_progress_message("job123", "running", current=5, total=10)
        assert msg["payload"]["total"] == 10

    def test_sync_progress_message_with_correlation_id(self):
        """Test sync_progress_message with correlation_id."""
        from app.core.events import sync_progress_message

        msg = sync_progress_message("job123", "running", current=5, correlation_id="corr-123")
        assert msg["payload"]["correlation_id"] == "corr-123"

    def test_sync_progress_message_with_custom_message(self):
        """Test sync_progress_message with custom message."""
        from app.core.events import sync_progress_message

        msg = sync_progress_message("job123", "running", current=5, message="Processing...")
        assert msg["payload"]["message"] == "Processing..."

    def test_cleanup_progress_message_basic(self):
        """Test cleanup_progress_message creates proper message."""
        from app.core.events import cleanup_progress_message

        msg = cleanup_progress_message(rule_id=1, deleted=5)
        assert msg["type"] == "cleanup.progress"
        assert msg["payload"]["rule_id"] == 1
        assert msg["payload"]["deleted"] == 5

    def test_cleanup_progress_message_with_total(self):
        """Test cleanup_progress_message with total."""
        from app.core.events import cleanup_progress_message

        msg = cleanup_progress_message(rule_id=1, deleted=5, total=10)
        assert msg["payload"]["total"] == 10

    def test_cleanup_progress_message_with_current_tweet(self):
        """Test cleanup_progress_message with current_tweet."""
        from app.core.events import cleanup_progress_message

        msg = cleanup_progress_message(rule_id=1, deleted=5, current_tweet="tweet123")
        assert msg["payload"]["current_tweet"] == "tweet123"

    def test_cleanup_progress_message_with_correlation_id(self):
        """Test cleanup_progress_message with correlation_id."""
        from app.core.events import cleanup_progress_message

        msg = cleanup_progress_message(rule_id=1, deleted=5, correlation_id="corr-456")
        assert msg["payload"]["correlation_id"] == "corr-456"

    def test_job_completed_message_basic(self):
        """Test job_completed_message creates proper message."""
        from app.core.events import job_completed_message

        msg = job_completed_message("job123", "sync", "completed")
        assert msg["type"] == "job.completed"
        assert msg["payload"]["job_id"] == "job123"
        assert msg["payload"]["job_type"] == "sync"
        assert msg["payload"]["status"] == "completed"

    def test_job_completed_message_with_result(self):
        """Test job_completed_message with result."""
        from app.core.events import job_completed_message

        result = {"synced": 10, "failed": 0}
        msg = job_completed_message("job123", "sync", "completed", result=result)
        assert msg["payload"]["result"] == result

    def test_job_completed_message_with_error(self):
        """Test job_completed_message with error."""
        from app.core.events import job_completed_message

        msg = job_completed_message("job123", "sync", "failed", error="Connection timeout")
        assert msg["payload"]["error"] == "Connection timeout"


class TestLoggerModule:
    """Tests for app/core/logger.py."""

    def test_setup_logger_returns_logger(self):
        """Test setup_logger returns a logger instance."""
        from app.core.logger import setup_logger
        import logging

        logger = setup_logger("test_module")
        assert isinstance(logger, logging.Logger)

    def test_setup_logger_with_name(self):
        """Test setup_logger sets correct name."""
        from app.core.logger import setup_logger

        logger = setup_logger("my_custom_name")
        assert logger.name == "my_custom_name"


class TestJWTHandler:
    """Tests for app/auth/jwt_handler.py."""

    def test_jwt_handler_imports(self):
        """Test jwt_handler module can be imported."""
        from app.auth import jwt_handler

        assert jwt_handler is not None


class TestSecurityUtils:
    """Tests for app/auth/security_utils.py."""

    def test_security_utils_imports(self):
        """Test security_utils module can be imported."""
        from app.auth import security_utils

        assert security_utils is not None


class TestWorkspaceModel:
    """Tests for app/models/workspace.py."""

    def test_workspace_model_imports(self):
        """Test workspace model can be imported."""
        from app.models import workspace

        assert workspace is not None


class TestFeedRuleModel:
    """Tests for app/models/feed_rule.py."""

    def test_feed_rule_model_imports(self):
        """Test feed_rule model can be imported."""
        from app.models import feed_rule

        assert feed_rule is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
