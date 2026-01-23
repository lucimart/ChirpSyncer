"""Matrix Protocol API endpoints.

Provides REST API endpoints for Matrix federated messaging protocol.
Matrix is an open standard for decentralized communication.

Key concepts:
- Homeserver: Server that hosts user accounts and rooms
- Rooms: Persistent, decentralized chat rooms
- Events: Messages and state changes in rooms
- Bridges: Connect Matrix to other platforms (IRC, Slack, Discord, etc.)

Use cases in ChirpSyncer:
- Cross-post announcements to Matrix rooms
- Receive notifications via Matrix
- Bridge social media activity to Matrix
"""

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

logger = get_logger(__name__)

matrix_bp = Blueprint("matrix", __name__, url_prefix="/matrix")


def _get_matrix_credentials(user_id: int) -> dict:
    """Get Matrix credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "matrix", "api")

    if not creds:
        raise ApiError("MATRIX_NOT_CONFIGURED", "Matrix credentials not found", 404)

    required = ["homeserver", "access_token"]
    for field in required:
        if not creds.get(field):
            raise ApiError("MATRIX_INVALID_CONFIG", f"Matrix {field} not configured", 400)

    return creds


def _matrix_request(
    homeserver: str,
    access_token: str,
    method: str,
    endpoint: str,
    data: dict | None = None,
    params: dict | None = None,
) -> dict:
    """Make a request to the Matrix Client-Server API.

    Args:
        homeserver: Matrix homeserver URL (e.g., https://matrix.org)
        access_token: User's access token
        method: HTTP method
        endpoint: API endpoint (e.g., /_matrix/client/v3/sync)
        data: Request body
        params: Query parameters

    Returns:
        API response data
    """
    import requests

    url = f"{homeserver.rstrip('/')}{endpoint}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            params=params,
            timeout=30,
        )

        if response.status_code == 401:
            raise ApiError("MATRIX_AUTH_EXPIRED", "Matrix access token expired", 401)

        if response.status_code == 403:
            raise ApiError("MATRIX_FORBIDDEN", "Matrix action not allowed", 403)

        if response.status_code == 429:
            raise ApiError("MATRIX_RATE_LIMIT", "Matrix rate limit exceeded", 429)

        if not response.ok:
            error_msg = "Matrix API error"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_msg = error_data["error"]
            except Exception:
                pass
            raise ApiError("MATRIX_API_ERROR", error_msg, response.status_code)

        if response.status_code == 204 or not response.content:
            return {}

        return response.json()

    except requests.RequestException as e:
        logger.error(f"Matrix API request failed: {e}")
        raise ApiError("MATRIX_REQUEST_FAILED", "Failed to connect to Matrix homeserver", 503)


# =============================================================================
# User/Account Endpoints
# =============================================================================


@matrix_bp.route("/whoami", methods=["GET"])
@require_auth
def get_whoami(user_id: int):
    """Get the authenticated Matrix user's info.

    Returns:
        User ID and device ID
    """
    creds = _get_matrix_credentials(user_id)

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        "/_matrix/client/v3/account/whoami",
    )

    return api_response({
        "user_id": result.get("user_id"),
        "device_id": result.get("device_id"),
        "homeserver": creds["homeserver"],
    })


@matrix_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile(user_id: int):
    """Get the user's Matrix profile.

    Returns:
        Display name and avatar URL
    """
    creds = _get_matrix_credentials(user_id)

    # First get the user ID
    whoami = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        "/_matrix/client/v3/account/whoami",
    )
    matrix_user_id = whoami.get("user_id")

    # Then get the profile
    profile = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        f"/_matrix/client/v3/profile/{matrix_user_id}",
    )

    return api_response({
        "user_id": matrix_user_id,
        "displayname": profile.get("displayname"),
        "avatar_url": profile.get("avatar_url"),
    })


@matrix_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile(user_id: int):
    """Update the user's Matrix profile.

    Request body:
        displayname: New display name (optional)
        avatar_url: New avatar MXC URL (optional)

    Returns:
        Success confirmation
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    whoami = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        "/_matrix/client/v3/account/whoami",
    )
    matrix_user_id = whoami.get("user_id")

    if data.get("displayname"):
        _matrix_request(
            creds["homeserver"],
            creds["access_token"],
            "PUT",
            f"/_matrix/client/v3/profile/{matrix_user_id}/displayname",
            {"displayname": data["displayname"]},
        )

    if data.get("avatar_url"):
        _matrix_request(
            creds["homeserver"],
            creds["access_token"],
            "PUT",
            f"/_matrix/client/v3/profile/{matrix_user_id}/avatar_url",
            {"avatar_url": data["avatar_url"]},
        )

    return api_response({"updated": True})


# =============================================================================
# Rooms Endpoints
# =============================================================================


@matrix_bp.route("/rooms", methods=["GET"])
@require_auth
def get_rooms(user_id: int):
    """Get rooms the user has joined.

    Returns:
        List of joined rooms
    """
    creds = _get_matrix_credentials(user_id)

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        "/_matrix/client/v3/joined_rooms",
    )

    rooms = []
    for room_id in result.get("joined_rooms", []):
        # Get room name/state
        try:
            state = _matrix_request(
                creds["homeserver"],
                creds["access_token"],
                "GET",
                f"/_matrix/client/v3/rooms/{room_id}/state/m.room.name",
            )
            room_name = state.get("name", room_id)
        except Exception:
            room_name = room_id

        rooms.append({
            "room_id": room_id,
            "name": room_name,
        })

    return api_response({"rooms": rooms, "count": len(rooms)})


@matrix_bp.route("/room/<room_id>", methods=["GET"])
@require_auth
def get_room(user_id: int, room_id: str):
    """Get details about a specific room.

    Args:
        room_id: The Matrix room ID

    Returns:
        Room details including name, topic, members count
    """
    creds = _get_matrix_credentials(user_id)

    room_info = {"room_id": room_id}

    # Get room name
    try:
        name_state = _matrix_request(
            creds["homeserver"],
            creds["access_token"],
            "GET",
            f"/_matrix/client/v3/rooms/{room_id}/state/m.room.name",
        )
        room_info["name"] = name_state.get("name")
    except Exception:
        pass

    # Get room topic
    try:
        topic_state = _matrix_request(
            creds["homeserver"],
            creds["access_token"],
            "GET",
            f"/_matrix/client/v3/rooms/{room_id}/state/m.room.topic",
        )
        room_info["topic"] = topic_state.get("topic")
    except Exception:
        pass

    # Get member count
    try:
        members = _matrix_request(
            creds["homeserver"],
            creds["access_token"],
            "GET",
            f"/_matrix/client/v3/rooms/{room_id}/joined_members",
        )
        room_info["member_count"] = len(members.get("joined", {}))
    except Exception:
        pass

    return api_response(room_info)


@matrix_bp.route("/room", methods=["POST"])
@require_auth
def create_room(user_id: int):
    """Create a new Matrix room.

    Request body:
        name: Room name
        topic: Room topic (optional)
        is_public: Whether room is public (default false)
        invite: List of user IDs to invite (optional)

    Returns:
        Created room ID
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    room_data = {
        "name": data.get("name", "ChirpSyncer Room"),
        "preset": "public_chat" if data.get("is_public") else "private_chat",
    }

    if data.get("topic"):
        room_data["topic"] = data["topic"]

    if data.get("invite"):
        room_data["invite"] = data["invite"]

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "POST",
        "/_matrix/client/v3/createRoom",
        room_data,
    )

    return api_response({
        "room_id": result.get("room_id"),
    }, status=201)


@matrix_bp.route("/room/<room_id>/join", methods=["POST"])
@require_auth
def join_room(user_id: int, room_id: str):
    """Join a Matrix room.

    Args:
        room_id: The Matrix room ID or alias

    Returns:
        Joined room ID
    """
    creds = _get_matrix_credentials(user_id)

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "POST",
        f"/_matrix/client/v3/join/{room_id}",
    )

    return api_response({"room_id": result.get("room_id")})


@matrix_bp.route("/room/<room_id>/leave", methods=["POST"])
@require_auth
def leave_room(user_id: int, room_id: str):
    """Leave a Matrix room.

    Args:
        room_id: The Matrix room ID

    Returns:
        Success confirmation
    """
    creds = _get_matrix_credentials(user_id)

    _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "POST",
        f"/_matrix/client/v3/rooms/{room_id}/leave",
    )

    return api_response({"left": True, "room_id": room_id})


# =============================================================================
# Messages Endpoints
# =============================================================================


@matrix_bp.route("/room/<room_id>/messages", methods=["GET"])
@require_auth
def get_messages(user_id: int, room_id: str):
    """Get messages from a room.

    Args:
        room_id: The Matrix room ID

    Query params:
        limit: Number of messages (default 50)
        from: Pagination token (for older messages)
        dir: Direction 'b' for backwards, 'f' for forwards (default 'b')

    Returns:
        List of messages
    """
    creds = _get_matrix_credentials(user_id)
    limit = min(int(request.args.get("limit", 50)), 100)
    from_token = request.args.get("from")
    direction = request.args.get("dir", "b")

    params = {
        "limit": limit,
        "dir": direction,
        "filter": '{"types":["m.room.message"]}',
    }
    if from_token:
        params["from"] = from_token

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        f"/_matrix/client/v3/rooms/{room_id}/messages",
        params=params,
    )

    messages = []
    for event in result.get("chunk", []):
        if event.get("type") == "m.room.message":
            content = event.get("content", {})
            messages.append({
                "event_id": event.get("event_id"),
                "sender": event.get("sender"),
                "timestamp": event.get("origin_server_ts"),
                "msgtype": content.get("msgtype"),
                "body": content.get("body"),
                "formatted_body": content.get("formatted_body"),
            })

    return api_response({
        "messages": messages,
        "start": result.get("start"),
        "end": result.get("end"),
    })


@matrix_bp.route("/room/<room_id>/send", methods=["POST"])
@require_auth
def send_message(user_id: int, room_id: str):
    """Send a message to a room.

    Args:
        room_id: The Matrix room ID

    Request body:
        body: Message text
        msgtype: Message type (default m.text)
        formatted_body: HTML formatted message (optional)

    Returns:
        Sent event ID
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    body = data.get("body", "").strip()
    if not body:
        raise ApiError("VALIDATION_ERROR", "Message body is required", 400)

    message_data = {
        "msgtype": data.get("msgtype", "m.text"),
        "body": body,
    }

    if data.get("formatted_body"):
        message_data["format"] = "org.matrix.custom.html"
        message_data["formatted_body"] = data["formatted_body"]

    # Generate transaction ID
    import time
    txn_id = f"chirpsyncer_{int(time.time() * 1000)}"

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "PUT",
        f"/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}",
        message_data,
    )

    return api_response({
        "event_id": result.get("event_id"),
    }, status=201)


@matrix_bp.route("/room/<room_id>/send/notice", methods=["POST"])
@require_auth
def send_notice(user_id: int, room_id: str):
    """Send a notice (bot message) to a room.

    Notices are displayed differently and don't trigger notifications.
    Useful for automated cross-posting.

    Args:
        room_id: The Matrix room ID

    Request body:
        body: Notice text
        formatted_body: HTML formatted notice (optional)

    Returns:
        Sent event ID
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    body = data.get("body", "").strip()
    if not body:
        raise ApiError("VALIDATION_ERROR", "Notice body is required", 400)

    message_data = {
        "msgtype": "m.notice",
        "body": body,
    }

    if data.get("formatted_body"):
        message_data["format"] = "org.matrix.custom.html"
        message_data["formatted_body"] = data["formatted_body"]

    import time
    txn_id = f"chirpsyncer_notice_{int(time.time() * 1000)}"

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "PUT",
        f"/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}",
        message_data,
    )

    return api_response({
        "event_id": result.get("event_id"),
    }, status=201)


# =============================================================================
# Reactions Endpoints
# =============================================================================


@matrix_bp.route("/room/<room_id>/react", methods=["POST"])
@require_auth
def send_reaction(user_id: int, room_id: str):
    """Send a reaction to a message.

    Args:
        room_id: The Matrix room ID

    Request body:
        event_id: Event ID to react to
        key: Reaction key (emoji)

    Returns:
        Reaction event ID
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    event_id = data.get("event_id")
    key = data.get("key")

    if not event_id or not key:
        raise ApiError("VALIDATION_ERROR", "event_id and key are required", 400)

    reaction_data = {
        "m.relates_to": {
            "rel_type": "m.annotation",
            "event_id": event_id,
            "key": key,
        }
    }

    import time
    txn_id = f"chirpsyncer_reaction_{int(time.time() * 1000)}"

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "PUT",
        f"/_matrix/client/v3/rooms/{room_id}/send/m.reaction/{txn_id}",
        reaction_data,
    )

    return api_response({
        "event_id": result.get("event_id"),
    }, status=201)


# =============================================================================
# Sync/Notifications Endpoints
# =============================================================================


@matrix_bp.route("/sync", methods=["GET"])
@require_auth
def sync(user_id: int):
    """Sync with the Matrix homeserver.

    This is a simplified sync for getting recent activity.
    Full sync should use long-polling or the sliding sync API.

    Query params:
        since: Pagination token from previous sync
        timeout: Long-poll timeout in ms (default 0)

    Returns:
        Sync response with new events
    """
    creds = _get_matrix_credentials(user_id)
    since = request.args.get("since")
    timeout = request.args.get("timeout", "0")

    params = {"timeout": timeout}
    if since:
        params["since"] = since

    result = _matrix_request(
        creds["homeserver"],
        creds["access_token"],
        "GET",
        "/_matrix/client/v3/sync",
        params=params,
    )

    # Simplify response
    return api_response({
        "next_batch": result.get("next_batch"),
        "rooms": {
            "join": list(result.get("rooms", {}).get("join", {}).keys()),
            "invite": list(result.get("rooms", {}).get("invite", {}).keys()),
            "leave": list(result.get("rooms", {}).get("leave", {}).keys()),
        },
    })


# =============================================================================
# ChirpSyncer Integration Endpoints
# =============================================================================


@matrix_bp.route("/broadcast", methods=["POST"])
@require_auth
def broadcast_to_rooms(user_id: int):
    """Broadcast a message to multiple rooms.

    Useful for cross-posting social media content to Matrix.

    Request body:
        room_ids: List of room IDs to send to
        body: Message text
        formatted_body: HTML formatted message (optional)
        as_notice: Send as notice instead of message (default true)

    Returns:
        Results per room
    """
    creds = _get_matrix_credentials(user_id)
    data = request.get_json() or {}

    room_ids = data.get("room_ids", [])
    if not room_ids:
        raise ApiError("VALIDATION_ERROR", "room_ids list is required", 400)

    body = data.get("body", "").strip()
    if not body:
        raise ApiError("VALIDATION_ERROR", "Message body is required", 400)

    as_notice = data.get("as_notice", True)

    message_data = {
        "msgtype": "m.notice" if as_notice else "m.text",
        "body": body,
    }

    if data.get("formatted_body"):
        message_data["format"] = "org.matrix.custom.html"
        message_data["formatted_body"] = data["formatted_body"]

    results = {}
    import time

    for room_id in room_ids:
        try:
            txn_id = f"chirpsyncer_broadcast_{int(time.time() * 1000)}_{room_id[-8:]}"

            result = _matrix_request(
                creds["homeserver"],
                creds["access_token"],
                "PUT",
                f"/_matrix/client/v3/rooms/{room_id}/send/m.room.message/{txn_id}",
                message_data,
            )

            results[room_id] = {
                "status": "sent",
                "event_id": result.get("event_id"),
            }
        except ApiError as e:
            results[room_id] = {
                "status": "failed",
                "error": e.message,
            }

    return api_response({
        "results": results,
        "sent": sum(1 for r in results.values() if r["status"] == "sent"),
        "failed": sum(1 for r in results.values() if r["status"] == "failed"),
    })
