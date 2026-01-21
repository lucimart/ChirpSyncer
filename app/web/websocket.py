from typing import Any, Dict, Union

from flask_socketio import SocketIO, emit, join_room

from app.core.events import (
    SyncProgressMessage,
    CleanupProgressMessage,
    JobCompletedMessage,
)

socketio: Any = SocketIO(cors_allowed_origins="*")

# Type alias for all message types
RealtimeMessage = Union[
    SyncProgressMessage, CleanupProgressMessage, JobCompletedMessage, Dict[str, Any]
]


@socketio.on("connect")
def handle_connect():
    emit("connected", {"status": "ok"})


@socketio.on("join")
def handle_join(data):
    user_id = data.get("user_id") if isinstance(data, dict) else None
    if user_id:
        join_room(f"user_{user_id}")
        emit("joined", {"room": f"user_{user_id}"})


def emit_sync_progress(user_id: int, message: RealtimeMessage) -> None:
    """Emit sync progress event to user's room."""
    socketio.emit("message", message, to=f"user_{user_id}")


def emit_cleanup_progress(user_id: int, message: RealtimeMessage) -> None:
    """Emit cleanup progress event to user's room."""
    socketio.emit("message", message, to=f"user_{user_id}")


def emit_job_completed(user_id: int, message: RealtimeMessage) -> None:
    """Emit job completed event to user's room."""
    socketio.emit("message", message, to=f"user_{user_id}")
