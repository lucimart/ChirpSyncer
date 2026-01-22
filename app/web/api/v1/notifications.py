import sqlite3
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.models.notification import init_notifications_db
from app.web.api.v1.responses import api_error, api_response

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
