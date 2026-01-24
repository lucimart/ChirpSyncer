"""
Notifications API endpoints.

Provides both legacy notification endpoints and new Notifications Hub endpoints.
"""

import os
import sqlite3
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.models.notification import init_notifications_db
from app.web.api.v1.responses import api_error, api_response
from app.features.notifications import (
    Notification,
    NotificationCategory,
    NotificationPriority,
    NotificationDispatcher,
    init_notifications_hub_db,
)
from app.core.logger import setup_logger

logger = setup_logger(__name__)

notifications_bp = Blueprint("notifications", __name__, url_prefix="/notifications")

VALID_TYPES = {
    "sync_complete",
    "sync_failed",
    "rate_limit",
    "credential_expired",
    "scheduled_post",
    "engagement_alert",
}

VALID_SEVERITIES = {"info", "warning", "error", "success"}

VALID_CATEGORIES = {c.value for c in NotificationCategory}


def _get_conn():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_tables():
    init_notifications_db(current_app.config["DB_PATH"])


def _format_timestamp(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).isoformat()
        except ValueError:
            return value
    return value


def _normalize_notification(row):
    return {
        "id": str(row["id"]),
        "type": row["type"],
        "severity": row["severity"],
        "title": row["title"],
        "message": row["message"],
        "timestamp": _format_timestamp(row["created_at"]),
        "read": bool(row["read"]),
        "actionUrl": row["action_url"],
        "actionLabel": row["action_label"],
    }


@notifications_bp.route("", methods=["GET"])
@require_auth
def list_notifications():
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
            (g.user.id,),
        )
        return api_response([_normalize_notification(row) for row in cursor.fetchall()])
    finally:
        conn.close()


@notifications_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@require_auth
def mark_read(notification_id: int):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
            (notification_id, g.user.id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return api_error("NOT_FOUND", "Notification not found", status=404)
        cursor.execute(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, g.user.id),
        )
        row = cursor.fetchone()
        return api_response(_normalize_notification(row))
    finally:
        conn.close()


@notifications_bp.route("/read-all", methods=["PATCH"])
@require_auth
def mark_all_read():
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE notifications SET read = 1 WHERE user_id = ?",
            (g.user.id,),
        )
        conn.commit()
        return api_response({"success": True})
    finally:
        conn.close()


@notifications_bp.route("/<int:notification_id>", methods=["DELETE"])
@require_auth
def delete_notification(notification_id: int):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM notifications WHERE id = ? AND user_id = ?",
            (notification_id, g.user.id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return api_error("NOT_FOUND", "Notification not found", status=404)
        return api_response({"deleted": True})
    finally:
        conn.close()


# =============================================================================
# Notifications Hub Endpoints (v2)
# =============================================================================


def _get_dispatcher() -> NotificationDispatcher:
    """Get NotificationDispatcher instance."""
    db_path = current_app.config.get("DB_PATH", os.getenv("DB_PATH", "chirpsyncer.db"))
    return NotificationDispatcher(db_path=db_path)


@notifications_bp.route("/hub", methods=["GET"])
@require_auth
def list_hub_notifications():
    """
    List notifications from the Notifications Hub.

    Query params:
        unread_only: bool (default false)
        category: str (sync, alert, system, engagement, security)
        limit: int (default 50, max 100)
        offset: int (default 0)
    """
    db_path = current_app.config.get("DB_PATH", os.getenv("DB_PATH", "chirpsyncer.db"))
    init_notifications_hub_db(db_path)

    unread_only = request.args.get("unread_only", "false").lower() == "true"
    category_str = request.args.get("category")
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))

    category = None
    if category_str and category_str in VALID_CATEGORIES:
        category = NotificationCategory(category_str)

    notifications = Notification.get_for_user(
        db_path=db_path,
        user_id=g.user.id,
        unread_only=unread_only,
        category=category,
        limit=limit,
        offset=offset,
    )

    return api_response({
        "notifications": [n.to_dict() for n in notifications],
        "count": len(notifications),
    })


@notifications_bp.route("/hub/<int:notification_id>/read", methods=["POST"])
@require_auth
def mark_hub_notification_read(notification_id: int):
    """Mark a hub notification as read."""
    db_path = current_app.config.get("DB_PATH", os.getenv("DB_PATH", "chirpsyncer.db"))

    notification = Notification.get_by_id(db_path, notification_id)
    if not notification:
        return api_error("NOT_FOUND", "Notification not found", status=404)

    if notification.user_id != g.user.id:
        return api_error("FORBIDDEN", "Not authorized", status=403)

    notification.mark_as_read(db_path)
    return api_response(notification.to_dict())


@notifications_bp.route("/preferences", methods=["GET"])
@require_auth
def get_channel_preferences():
    """Get current user's channel preferences."""
    dispatcher = _get_dispatcher()
    prefs = dispatcher.get_user_channel_preferences(g.user.id)
    return api_response({"preferences": prefs})


@notifications_bp.route("/preferences", methods=["PUT"])
@require_auth
def update_channel_preferences():
    """
    Update current user's channel preferences.

    Request body (all fields optional):
    {
        "in_app_enabled": bool,
        "telegram_enabled": bool,
        "telegram_chat_id": str,
        "discord_enabled": bool,
        "discord_webhook_url": str,
        "email_digest_enabled": bool,
        "email_digest_frequency": "immediate" | "daily" | "weekly",
        "quiet_hours_start": int (0-23) | null,
        "quiet_hours_end": int (0-23) | null
    }
    """
    data = request.get_json(silent=True) or {}

    # Validate quiet hours
    for field in ["quiet_hours_start", "quiet_hours_end"]:
        if field in data:
            val = data[field]
            if val is not None and (not isinstance(val, int) or val < 0 or val > 23):
                return api_error(
                    "INVALID_REQUEST",
                    f"{field} must be an integer 0-23 or null",
                    status=400,
                )

    # Validate digest frequency
    valid_frequencies = ["immediate", "daily", "weekly"]
    if "email_digest_frequency" in data:
        if data["email_digest_frequency"] not in valid_frequencies:
            return api_error(
                "INVALID_REQUEST",
                f"email_digest_frequency must be one of: {', '.join(valid_frequencies)}",
                status=400,
            )

    dispatcher = _get_dispatcher()
    success = dispatcher.update_user_channel_preferences(g.user.id, **data)

    if not success:
        return api_error("UPDATE_FAILED", "Failed to update preferences", status=500)

    prefs = dispatcher.get_user_channel_preferences(g.user.id)
    return api_response({"preferences": prefs})


@notifications_bp.route("/test/<channel>", methods=["POST"])
@require_auth
def test_channel(channel: str):
    """
    Send a test notification to a specific channel.

    Path params:
        channel: telegram | discord

    Request body (optional):
        telegram_chat_id: str (for Telegram)
        discord_webhook_url: str (for Discord)
    """
    if channel not in ["telegram", "discord"]:
        return api_error("INVALID_CHANNEL", f"Unknown channel: {channel}", status=400)

    data = request.get_json(silent=True) or {}
    dispatcher = _get_dispatcher()

    if channel == "telegram":
        chat_id = data.get("telegram_chat_id")
        if not chat_id:
            prefs = dispatcher.get_user_channel_preferences(g.user.id)
            chat_id = prefs.get("telegram_chat_id")

        if not chat_id:
            return api_error(
                "MISSING_CONFIG",
                "telegram_chat_id is required",
                status=400,
            )

        result = dispatcher.telegram_channel.send(
            chat_id=chat_id,
            title="ChirpSyncer Test",
            body="This is a test notification from ChirpSyncer. If you see this, Telegram notifications are working!",
        )

    elif channel == "discord":
        webhook_url = data.get("discord_webhook_url")
        if not webhook_url:
            prefs = dispatcher.get_user_channel_preferences(g.user.id)
            webhook_url = prefs.get("discord_webhook_url")

        if not webhook_url:
            return api_error(
                "MISSING_CONFIG",
                "discord_webhook_url is required",
                status=400,
            )

        result = dispatcher.discord_channel.send(
            webhook_url=webhook_url,
            title="ChirpSyncer Test",
            body="This is a test notification from ChirpSyncer. If you see this, Discord notifications are working!",
            category=NotificationCategory.SYSTEM,
            priority=NotificationPriority.NORMAL,
        )

    else:
        return api_error("INVALID_CHANNEL", f"Unknown channel: {channel}", status=400)

    if result.get("success"):
        return api_response({"success": True, "channel": channel})
    else:
        return api_error(
            "TEST_FAILED",
            result.get("error", "Test failed"),
            status=502,
        )
