import sqlite3
import sqlite3
import time
import uuid
from datetime import datetime

from flask import Blueprint, current_app, request, g

from app.auth.api_auth import require_auth
from app.web.api.v1.responses import api_response, api_error
from app.services.sync_jobs import (
    create_sync_job,
    get_sync_job,
    update_sync_job,
)
from app.core.celery_app import celery_app

sync_bp = Blueprint("sync", __name__, url_prefix="/sync")

_DEFAULT_DIRECTION = "both"
_SYNC_TASK_NAME = "app.tasks.sync_tasks.run_sync_job"


def _get_connection():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_sync_jobs_table(conn):
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            direction TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            error_message TEXT,
            posts_synced INTEGER DEFAULT 0,
            task_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )
    if not _has_column(conn, "sync_jobs", "task_id"):
        cursor.execute("ALTER TABLE sync_jobs ADD COLUMN task_id TEXT")
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON sync_jobs(user_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status)"
    )
    conn.commit()


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


def _count_pending_jobs(user_id: int) -> int:
    conn = _get_connection()
    try:
        _ensure_sync_jobs_table(conn)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM sync_jobs WHERE user_id = ? AND status IN ('queued', 'running')",
            (user_id,),
        )
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
        "pending": _count_pending_jobs(user_id),
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
    data = request.get_json(silent=True) or {}
    direction = data.get("direction", _DEFAULT_DIRECTION)
    job_id = f"job-{uuid.uuid4()}"

    db_path = current_app.config["DB_PATH"]
    create_sync_job(db_path, job_id, g.user.id, direction)
    async_result = celery_app.send_task(
        _SYNC_TASK_NAME,
        args=[job_id, g.user.id, direction, db_path],
    )
    if async_result and async_result.id:
        update_sync_job(db_path, job_id, g.user.id, task_id=async_result.id)

    return api_response({"job_id": job_id}, status=202)


@sync_bp.route("/<job_id>/status", methods=["GET"])
@require_auth
def sync_status(job_id: str):
    job = get_sync_job(current_app.config["DB_PATH"], job_id, g.user.id)
    if not job:
        return api_error("NOT_FOUND", "Sync job not found", status=404)
    return api_response(
        {
            "status": job["status"],
            "direction": job["direction"],
            "created_at": job["created_at"],
            "started_at": job["started_at"],
            "completed_at": job["completed_at"],
            "posts_synced": job["posts_synced"],
            "error": job["error_message"],
            "task_id": job.get("task_id"),
        }
    )


def _ensure_sync_config_table(conn):
    """Create sync_config table if it doesn't exist."""
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            direction TEXT DEFAULT 'bidirectional',
            sync_replies INTEGER DEFAULT 1,
            sync_reposts INTEGER DEFAULT 0,
            truncation_strategy TEXT DEFAULT 'smart',
            auto_hashtag INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, platform)
        )
    """)
    conn.commit()


@sync_bp.route("/config", methods=["GET"])
@require_auth
def get_sync_config():
    """Get sync configuration for current user."""
    conn = _get_connection()
    try:
        _ensure_sync_config_table(conn)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM sync_config WHERE user_id = ?",
            (g.user.id,),
        )
        rows = cursor.fetchall()
        configs = [dict(row) for row in rows]
        return api_response({"configs": configs})
    finally:
        conn.close()


@sync_bp.route("/config", methods=["POST"])
@require_auth
def save_sync_config():
    """Save sync configuration for a platform."""
    data = request.get_json(silent=True) or {}

    platform = data.get("platform")
    if not platform:
        return api_error("MISSING_PLATFORM", "Platform is required", status=400)

    conn = _get_connection()
    try:
        _ensure_sync_config_table(conn)
        cursor = conn.cursor()

        # Upsert config
        cursor.execute(
            """
            INSERT INTO sync_config (user_id, platform, enabled, direction, sync_replies,
                                     sync_reposts, truncation_strategy, auto_hashtag, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, platform) DO UPDATE SET
                enabled = excluded.enabled,
                direction = excluded.direction,
                sync_replies = excluded.sync_replies,
                sync_reposts = excluded.sync_reposts,
                truncation_strategy = excluded.truncation_strategy,
                auto_hashtag = excluded.auto_hashtag,
                updated_at = datetime('now')
        """,
            (
                g.user.id,
                platform,
                1 if data.get("enabled", True) else 0,
                data.get("direction", "bidirectional"),
                1 if data.get("sync_replies", True) else 0,
                1 if data.get("sync_reposts", False) else 0,
                data.get("truncation_strategy", "smart"),
                1 if data.get("auto_hashtag", False) else 0,
            ),
        )
        conn.commit()

        # Fetch updated config
        cursor.execute(
            "SELECT * FROM sync_config WHERE user_id = ? AND platform = ?",
            (g.user.id, platform),
        )
        row = cursor.fetchone()
        return api_response(dict(row) if row else {})
    finally:
        conn.close()
