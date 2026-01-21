import sqlite3
import time
from typing import Optional

from app.core.celery_app import celery_app
from app.services.sync_jobs import update_sync_job
from app.services.sync_runner import sync_twitter_to_bluesky, sync_bluesky_to_twitter


def _record_sync_stats(
    db_path: str,
    source: str,
    target: str,
    success: int,
    user_id: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sync_stats (timestamp, source, target, success, error_message, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (int(time.time()), source, target, success, error_message, user_id),
        )
        conn.commit()
    finally:
        conn.close()


@celery_app.task(bind=True)
def run_sync_job(self, job_id: str, user_id: int, direction: str, db_path: str) -> None:
    started_at = int(time.time())
    update_sync_job(
        db_path,
        job_id,
        user_id,
        status="running",
        started_at=started_at,
        task_id=self.request.id,
    )

    try:
        posts_synced = 0
        if direction in {"both", "twitter_to_bluesky"}:
            posts_synced += sync_twitter_to_bluesky(user_id, db_path)
            _record_sync_stats(
                db_path,
                source="twitter",
                target="bluesky",
                success=1,
                user_id=user_id,
            )
        if direction in {"both", "bluesky_to_twitter"}:
            posts_synced += sync_bluesky_to_twitter(user_id, db_path)
            _record_sync_stats(
                db_path,
                source="bluesky",
                target="twitter",
                success=1,
                user_id=user_id,
            )

        update_sync_job(
            db_path,
            job_id,
            user_id,
            status="completed",
            completed_at=int(time.time()),
            posts_synced=posts_synced,
            error_message=None,
        )
    except Exception as exc:
        if direction in {"both", "twitter_to_bluesky"}:
            _record_sync_stats(
                db_path,
                source="twitter",
                target="bluesky",
                success=0,
                user_id=user_id,
                error_message=str(exc),
            )
        if direction in {"both", "bluesky_to_twitter"}:
            _record_sync_stats(
                db_path,
                source="bluesky",
                target="twitter",
                success=0,
                user_id=user_id,
                error_message=str(exc),
            )
        update_sync_job(
            db_path,
            job_id,
            user_id,
            status="failed",
            completed_at=int(time.time()),
            error_message=str(exc),
        )
        raise
