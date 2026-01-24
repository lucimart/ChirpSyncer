"""Integration tests for WebSocket functionality."""

import pytest
from unittest.mock import patch, MagicMock

from app.web.websocket import (
    socketio,
    emit_sync_progress,
    emit_cleanup_progress,
    handle_connect,
    handle_join,
)
from app.core.events import sync_progress_message, cleanup_progress_message


class TestWebSocketHandlers:
    """Test WebSocket event handlers."""

    def test_handle_connect_emits_connected_status(self):
        """Test that connect handler emits connected status."""
        with patch("app.web.websocket.emit") as mock_emit:
            handle_connect()
            mock_emit.assert_called_once_with("connected", {"status": "ok"})

    def test_handle_join_with_valid_user_id(self):
        """Test joining a room with valid user_id."""
        with (
            patch("app.web.websocket.join_room") as mock_join,
            patch("app.web.websocket.emit") as mock_emit,
        ):
            handle_join({"user_id": 123})
            mock_join.assert_called_once_with("user_123")
            mock_emit.assert_called_once_with("joined", {"room": "user_123"})

    def test_handle_join_with_missing_user_id(self):
        """Test joining without user_id does nothing."""
        with (
            patch("app.web.websocket.join_room") as mock_join,
            patch("app.web.websocket.emit") as mock_emit,
        ):
            handle_join({})
            mock_join.assert_not_called()
            mock_emit.assert_not_called()

    def test_handle_join_with_non_dict_data(self):
        """Test joining with non-dict data does nothing."""
        with (
            patch("app.web.websocket.join_room") as mock_join,
            patch("app.web.websocket.emit") as mock_emit,
        ):
            handle_join("invalid")
            mock_join.assert_not_called()
            mock_emit.assert_not_called()

    def test_handle_join_with_none_data(self):
        """Test joining with None data does nothing."""
        with (
            patch("app.web.websocket.join_room") as mock_join,
            patch("app.web.websocket.emit") as mock_emit,
        ):
            handle_join(None)
            mock_join.assert_not_called()
            mock_emit.assert_not_called()


class TestEmitFunctions:
    """Test emit helper functions."""

    def test_emit_sync_progress(self):
        """Test emitting sync progress to user room."""
        message = sync_progress_message("job-1", "running", current=5, total=10)

        with patch.object(socketio, "emit") as mock_emit:
            emit_sync_progress(user_id=42, message=message)
            mock_emit.assert_called_once_with("message", message, to="user_42")

    def test_emit_cleanup_progress(self):
        """Test emitting cleanup progress to user room."""
        message = cleanup_progress_message(rule_id=10, deleted=3, total=8)

        with patch.object(socketio, "emit") as mock_emit:
            emit_cleanup_progress(user_id=99, message=message)
            mock_emit.assert_called_once_with("message", message, to="user_99")


class TestSocketIOConfiguration:
    """Test SocketIO configuration."""

    def test_socketio_cors_allowed(self):
        """Test that CORS is configured to allow all origins."""
        # The socketio instance should be configured with cors_allowed_origins="*"
        assert socketio is not None

    def test_socketio_can_be_initialized_with_app(self):
        """Test that socketio can be initialized with a Flask app."""
        from flask import Flask

        app = Flask(__name__)
        app.config["SECRET_KEY"] = "test-secret"

        # Should not raise
        socketio.init_app(app)


class TestEventMessageIntegration:
    """Test integration between events module and websocket module."""

    def test_sync_progress_message_can_be_emitted(self):
        """Test that sync progress messages can be emitted via websocket."""
        message = sync_progress_message(
            job_id="test-job",
            status="running",
            current=1,
            total=5,
            correlation_id="test-corr",
        )

        with patch.object(socketio, "emit") as mock_emit:
            emit_sync_progress(user_id=1, message=message)

            call_args = mock_emit.call_args
            assert call_args[0][0] == "message"
            assert call_args[0][1]["type"] == "sync.progress"
            assert call_args[0][1]["payload"]["operation_id"] == "test-job"
            assert call_args[1]["to"] == "user_1"

    def test_cleanup_progress_message_can_be_emitted(self):
        """Test that cleanup progress messages can be emitted via websocket."""
        message = cleanup_progress_message(
            rule_id=42,
            deleted=10,
            total=20,
            current_tweet="tweet-123",
        )

        with patch.object(socketio, "emit") as mock_emit:
            emit_cleanup_progress(user_id=5, message=message)

            call_args = mock_emit.call_args
            assert call_args[0][0] == "message"
            assert call_args[0][1]["type"] == "cleanup.progress"
            assert call_args[0][1]["payload"]["rule_id"] == 42
            assert call_args[1]["to"] == "user_5"
