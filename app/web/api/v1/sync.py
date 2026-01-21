import sqlite3
import time
import uuid
from datetime import datetime

from flask import Blueprint, current_app, request, g

from app.auth.api_auth import require_auth
from app.web.api.v1.responses import api_response, api_error

sync_bp = Blueprint("sync", __name__, url_prefix="/sync")

_jobs = {}


def _get_connection():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _has_column(conn, table_name: str, column_name: str) -> bool:
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cursor.fetchall())


def _count_syncs_since(user_id: int, seconds: int) -> int:
    cutoff = int(time.time()) - seconds
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        if _has_column(conn, "sync_stats", "user_id"):
            cursor.execute(
                "SELECT COUNT(*) FROM sync_stats WHERE timestamp >= ? AND user_id = ?",
                (cutoff, user_id),
            )
        else:
            cursor.execute(
                "SELECT COUNT(*) FROM sync_stats WHERE timestamp >= ?",
                (cutoff,),
            )
        return int(cursor.fetchone()[0] or 0)
    except sqlite3.OperationalError:
        return 0
    finally:
        conn.close()


def _count_total_syncs(user_id: int) -> int:
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        if _has_column(conn, "sync_stats", "user_id"):
            cursor.execute(
                "SELECT COUNT(*) FROM sync_stats WHERE user_id = ?",
                (user_id,),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM sync_stats")
        return int(cursor.fetchone()[0] or 0)
    except sqlite3.OperationalError:
        return 0
    finally:
        conn.close()


def _last_sync_at(user_id: int):
    conn = _get_connection()
    try:
        cursor = conn.cursor()
        if _has_column(conn, "sync_stats", "user_id"):
            cursor.execute(
                "SELECT MAX(timestamp) FROM sync_stats WHERE user_id = ?",
                (user_id,),
            )
        else:
            cursor.execute("SELECT MAX(timestamp) FROM sync_stats")
        row = cursor.fetchone()
        if not row or not row[0]:
            return None
        return datetime.utcfromtimestamp(row[0]).isoformat()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()


@sync_bp.route("/stats", methods=["GET"])
@require_auth
def stats():
    user_id = g.user.id
    stats_data = {
        "today": _count_syncs_since(user_id, 24 * 3600),
        "week": _count_syncs_since(user_id, 7 * 24 * 3600),
        "total": _count_total_syncs(user_id),
        "last_sync": _last_sync_at(user_id),
    }
    return api_response(stats_data)


@sync_bp.route("/history", methods=["GET"])
@require_auth
def history():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    conn = _get_connection()
    try:
        cursor = conn.cursor()
        if _has_column(conn, "sync_stats", "user_id"):
            cursor.execute(
                "SELECT COUNT(*) FROM sync_stats WHERE user_id = ?",
                (g.user.id,),
            )
            total = int(cursor.fetchone()[0] or 0)
            cursor.execute(
                """
                SELECT id, timestamp, source, target, success, error_message
                FROM sync_stats
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """,
                (g.user.id, limit, offset),
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM sync_stats")
            total = int(cursor.fetchone()[0] or 0)
            cursor.execute(
                """
                SELECT id, timestamp, source, target, success, error_message
                FROM sync_stats
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """,
                (limit, offset),
            )
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rows = []
        total = 0
    finally:
        conn.close()

    items = []
    for row in rows:
        direction = f"{row['source']} → {row['target']}"
        status = "success" if row["success"] else "failed"
        items.append(
            {
                "id": row["id"],
                "direction": direction,
                "status": status,
                "posts_synced": 0,
                "created_at": datetime.utcfromtimestamp(row["timestamp"]).isoformat(),
                "error": row["error_message"],
            }
        )

    return api_response({"items": items, "total": total, "page": page})


@sync_bp.route("/start", methods=["POST"])
@require_auth
def start_sync():
    job_id = f"job-{uuid.uuid4()}"
    _jobs[job_id] = {"status": "queued", "created_at": time.time()}
    return api_response({"job_id": job_id}, status=202)


@sync_bp.route("/<job_id>/status", methods=["GET"])
@require_auth
def sync_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return api_error("NOT_FOUND", "Sync job not found", status=404)
    return api_response({"status": job["status"]})
