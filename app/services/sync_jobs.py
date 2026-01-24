import sqlite3
import time
from typing import Any, Dict, Optional


def _get_connection(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _has_column(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cursor.fetchall())


def ensure_sync_jobs_table(conn: sqlite3.Connection) -> None:
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


def create_sync_job(
    db_path: str,
    job_id: str,
    user_id: int,
    direction: str,
    status: str = "queued",
    task_id: Optional[str] = None,
) -> None:
    conn = _get_connection(db_path)
    try:
        ensure_sync_jobs_table(conn)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sync_jobs (job_id, user_id, status, direction, created_at, task_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (job_id, user_id, status, direction, int(time.time()), task_id),
        )
        conn.commit()
    finally:
        conn.close()


def update_sync_job(
    db_path: str,
    job_id: str,
    user_id: int,
    **updates: Any,
) -> None:
    if not updates:
        return

    conn = _get_connection(db_path)
    try:
        ensure_sync_jobs_table(conn)
        cursor = conn.cursor()
        allowed_fields = {
            "status",
            "started_at",
            "completed_at",
            "error_message",
            "posts_synced",
            "task_id",
            "direction",
        }
        set_clauses = []
        values = []
        for key, value in updates.items():
            if key not in allowed_fields:
                continue
            set_clauses.append(f"{key} = ?")
            values.append(value)
        if not set_clauses:
            return
        values.extend([job_id, user_id])
        query = f"UPDATE sync_jobs SET {', '.join(set_clauses)} WHERE job_id = ? AND user_id = ?"  # nosec B608 - set_clauses built from allowed fields
        cursor.execute(query, values)
        conn.commit()
    finally:
        conn.close()


def get_sync_job(db_path: str, job_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_connection(db_path)
    try:
        ensure_sync_jobs_table(conn)
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT status, direction, created_at, started_at, completed_at,
                   posts_synced, error_message, task_id
            FROM sync_jobs
            WHERE job_id = ? AND user_id = ?
            """,
            (job_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def count_pending_jobs(db_path: str, user_id: int) -> int:
    conn = _get_connection(db_path)
    try:
        ensure_sync_jobs_table(conn)
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
