"""
Unified Inbox API Endpoints

Provides REST API for the unified inbox feature.
"""

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.inbox.service import InboxService
from app.web.api.v1.responses import api_response, api_error

inbox_bp = Blueprint("inbox", __name__, url_prefix="/inbox")


def _get_inbox_service() -> InboxService:
    """Get InboxService instance with configured database path."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    service = InboxService(db_path)
    service.init_db()
    return service


@inbox_bp.route("", methods=["GET"])
@require_auth
def get_messages():
    """
    Get messages from the unified inbox.

    Query parameters:
        - platform: Filter by platform (twitter, bluesky, etc.)
        - unread: Filter by unread status (true/false)
        - starred: Filter by starred status (true/false)
        - archived: Show archived messages (true/false, default false)
        - message_type: Filter by message type (mention, reply, dm, quote)
        - page: Page number (default 1)
        - limit: Messages per page (default 50, max 100)

    Returns:
        List of messages with pagination info
    """
    service = _get_inbox_service()

    # Parse filters from query params
    filters = {}

    platform = request.args.get("platform")
    if platform:
        filters["platform"] = platform

    unread = request.args.get("unread")
    if unread and unread.lower() == "true":
        filters["unread"] = True

    starred = request.args.get("starred")
    if starred and starred.lower() == "true":
        filters["starred"] = True

    archived = request.args.get("archived")
    if archived and archived.lower() == "true":
        filters["archived"] = True

    message_type = request.args.get("message_type")
    if message_type:
        filters["message_type"] = message_type

    # Parse pagination
    try:
        page = int(request.args.get("page", 1))
        if page < 1:
            page = 1
    except ValueError:
        page = 1

    try:
        limit = min(int(request.args.get("limit", 50)), 100)
        if limit < 1:
            limit = 50
    except ValueError:
        limit = 50

    messages, total = service.get_messages(
        user_id=g.user.id,
        filters=filters,
        page=page,
        limit=limit,
    )

    return api_response({
        "messages": messages,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total,
    })


@inbox_bp.route("/<message_id>/read", methods=["POST"])
@require_auth
def mark_as_read(message_id: str):
    """
    Mark a message as read.

    Args:
        message_id: The message ID

    Returns:
        Success status
    """
    service = _get_inbox_service()

    success = service.mark_as_read(user_id=g.user.id, message_id=message_id)
    if not success:
        return api_error("NOT_FOUND", "Message not found", status=404)

    return api_response({"message_id": message_id, "is_read": True})


@inbox_bp.route("/<message_id>/star", methods=["POST"])
@require_auth
def toggle_star(message_id: str):
    """
    Toggle the starred status of a message.

    Args:
        message_id: The message ID

    Returns:
        New starred status
    """
    service = _get_inbox_service()

    is_starred = service.toggle_star(user_id=g.user.id, message_id=message_id)
    if is_starred is None:
        return api_error("NOT_FOUND", "Message not found", status=404)

    return api_response({"message_id": message_id, "is_starred": is_starred})


@inbox_bp.route("/<message_id>/archive", methods=["POST"])
@require_auth
def archive_message(message_id: str):
    """
    Archive a message.

    Args:
        message_id: The message ID

    Returns:
        Success status
    """
    service = _get_inbox_service()

    success = service.archive(user_id=g.user.id, message_id=message_id)
    if not success:
        return api_error("NOT_FOUND", "Message not found", status=404)

    return api_response({"message_id": message_id, "is_archived": True})


@inbox_bp.route("/stats", methods=["GET"])
@require_auth
def get_stats():
    """
    Get inbox statistics (unread counts per platform).

    Returns:
        Total unread count and counts by platform
    """
    service = _get_inbox_service()

    stats = service.get_stats(user_id=g.user.id)

    return api_response(stats)
