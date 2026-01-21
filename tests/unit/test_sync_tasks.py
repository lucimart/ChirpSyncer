"""
Tests for Celery sync tasks.

TDD tests for app/tasks/sync_tasks.py
"""

import sys
import pytest
import tempfile
import sqlite3
from unittest.mock import patch, MagicMock

# Mock external dependencies before importing sync_tasks
sys.modules["twscrape"] = MagicMock()
sys.modules["atproto"] = MagicMock()
sys.modules["atproto.models"] = MagicMock()
sys.modules["tenacity"] = MagicMock()
sys.modules["PIL"] = MagicMock()
sys.modules["PIL.Image"] = MagicMock()


import os
import gc


def create_test_db():
    """Create a temporary test database with required tables."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)  # Close the file descriptor
    conn = sqlite3.connect(path)
    cursor = conn.cursor()

    # Create sync_stats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            success INTEGER NOT NULL,
            error_message TEXT,
            user_id INTEGER
        )
    """)

    # Create sync_jobs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_jobs (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            direction TEXT NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            posts_synced INTEGER DEFAULT 0,
            error_message TEXT,
            task_id TEXT,
            created_at INTEGER NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    return path


def cleanup_db(path):
    """Clean up test database file."""
    gc.collect()  # Force garbage collection to release file handles
    try:
        os.unlink(path)
    except (PermissionError, OSError):
        pass  # Ignore cleanup errors on Windows


class TestSyncTasksModule:
    """Test sync tasks module structure."""

    def test_run_sync_job_is_celery_task(self):
        """Test run_sync_job is registered as a Celery task."""
        from app.tasks.sync_tasks import run_sync_job

        assert hasattr(run_sync_job, "delay")
        assert hasattr(run_sync_job, "apply_async")

    def test_run_sync_job_is_bound_task(self):
        """Test run_sync_job is a bound task (has access to self)."""
        from app.tasks.sync_tasks import run_sync_job

        # Bound tasks have bind=True in decorator
        import inspect
        from app.tasks import sync_tasks

        source = inspect.getsource(sync_tasks)
        assert "@celery_app.task(bind=True)" in source


class TestRecordSyncStats:
    """Test _record_sync_stats helper function."""

    def test_record_sync_stats_inserts_row(self):
        """Test _record_sync_stats inserts a row into sync_stats."""
        from app.tasks.sync_tasks import _record_sync_stats

        db_path = create_test_db()
        try:
            _record_sync_stats(
                db_path=db_path,
                source="twitter",
                target="bluesky",
                success=1,
                user_id=42,
                error_message=None,
            )

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sync_stats")
            rows = cursor.fetchall()
            conn.close()

            assert len(rows) == 1
            assert rows[0][2] == "twitter"  # source
            assert rows[0][3] == "bluesky"  # target
            assert rows[0][4] == 1  # success
            assert rows[0][6] == 42  # user_id
        finally:
            cleanup_db(db_path)

    def test_record_sync_stats_with_error(self):
        """Test _record_sync_stats records error message."""
        from app.tasks.sync_tasks import _record_sync_stats

        db_path = create_test_db()
        try:
            _record_sync_stats(
                db_path=db_path,
                source="bluesky",
                target="twitter",
                success=0,
                user_id=1,
                error_message="API rate limit exceeded",
            )

            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT error_message FROM sync_stats")
            row = cursor.fetchone()
            conn.close()

            assert row[0] == "API rate limit exceeded"
        finally:
            cleanup_db(db_path)


class TestRunSyncJob:
    """Test run_sync_job Celery task."""

    @patch("app.tasks.sync_tasks.emit_sync_progress")
    @patch("app.tasks.sync_tasks.update_sync_job")
    @patch("app.tasks.sync_tasks.sync_twitter_to_bluesky")
    @patch("app.tasks.sync_tasks.sync_bluesky_to_twitter")
    def test_run_sync_job_both_directions(
        self,
        mock_bsky_to_twitter,
        mock_twitter_to_bsky,
        mock_update_job,
        mock_emit_progress,
    ):
        """Test run_sync_job syncs both directions when direction='both'."""
        from app.tasks.sync_tasks import run_sync_job

        mock_twitter_to_bsky.return_value = 5
        mock_bsky_to_twitter.return_value = 3

        db_path = create_test_db()
        try:
            # Create a mock self for bound task
            mock_self = MagicMock()
            mock_self.request.id = "celery-task-123"

            # Call the task function directly (not via Celery)
            # For bound tasks, self is passed automatically, so we use run()
            run_sync_job.run(
                job_id="job-1",
                user_id=1,
                direction="both",
                db_path=db_path,
            )

            mock_twitter_to_bsky.assert_called_once_with(1, db_path)
            mock_bsky_to_twitter.assert_called_once_with(1, db_path)
        finally:
            cleanup_db(db_path)

    @patch("app.tasks.sync_tasks.emit_sync_progress")
    @patch("app.tasks.sync_tasks.update_sync_job")
    @patch("app.tasks.sync_tasks.sync_twitter_to_bluesky")
    @patch("app.tasks.sync_tasks.sync_bluesky_to_twitter")
    def test_run_sync_job_twitter_to_bluesky_only(
        self,
        mock_bsky_to_twitter,
        mock_twitter_to_bsky,
        mock_update_job,
        mock_emit_progress,
    ):
        """Test run_sync_job only syncs Twitter to Bluesky when specified."""
        from app.tasks.sync_tasks import run_sync_job

        mock_twitter_to_bsky.return_value = 10

        db_path = create_test_db()
        try:
            run_sync_job.run(
                job_id="job-2",
                user_id=2,
                direction="twitter_to_bluesky",
                db_path=db_path,
            )

            mock_twitter_to_bsky.assert_called_once()
            mock_bsky_to_twitter.assert_not_called()
        finally:
            cleanup_db(db_path)

    @patch("app.tasks.sync_tasks.emit_sync_progress")
    @patch("app.tasks.sync_tasks.update_sync_job")
    @patch("app.tasks.sync_tasks.sync_twitter_to_bluesky")
    def test_run_sync_job_emits_progress(
        self,
        mock_twitter_to_bsky,
        mock_update_job,
        mock_emit_progress,
    ):
        """Test run_sync_job emits progress events."""
        from app.tasks.sync_tasks import run_sync_job

        mock_twitter_to_bsky.return_value = 5

        db_path = create_test_db()
        try:
            run_sync_job.run(
                job_id="job-3",
                user_id=3,
                direction="twitter_to_bluesky",
                db_path=db_path,
            )

            # Should emit at least 2 progress events (start and complete)
            assert mock_emit_progress.call_count >= 2
        finally:
            cleanup_db(db_path)

    @patch("app.tasks.sync_tasks.emit_sync_progress")
    @patch("app.tasks.sync_tasks.update_sync_job")
    @patch("app.tasks.sync_tasks.sync_twitter_to_bluesky")
    def test_run_sync_job_handles_failure(
        self,
        mock_twitter_to_bsky,
        mock_update_job,
        mock_emit_progress,
    ):
        """Test run_sync_job handles sync failure correctly."""
        from app.tasks.sync_tasks import run_sync_job

        mock_twitter_to_bsky.side_effect = Exception("API error")

        db_path = create_test_db()
        try:
            with pytest.raises(Exception, match="API error"):
                run_sync_job.run(
                    job_id="job-fail",
                    user_id=4,
                    direction="twitter_to_bluesky",
                    db_path=db_path,
                )

            # Should have updated job status to failed
            update_calls = mock_update_job.call_args_list
            last_call = update_calls[-1]
            assert last_call[1].get("status") == "failed" or "failed" in str(last_call)
        finally:
            cleanup_db(db_path)


class TestHealthEndpoint:
    """Test Redis health check endpoint."""

    def test_health_redis_endpoint_exists(self):
        """Test /health/redis endpoint is registered."""
        # Check blueprint has the route by inspecting source
        import inspect
        from app.web.api.v1 import health

        source = inspect.getsource(health)
        assert '@health_bp.get("/redis")' in source

    @patch("app.web.api.v1.health.ping_redis")
    def test_health_redis_returns_ok_when_healthy(self, mock_ping):
        """Test /health/redis returns ok when Redis is available."""
        mock_ping.return_value = True

        from flask import Flask
        from app.web.api.v1.health import health_bp

        app = Flask(__name__)
        app.register_blueprint(health_bp, url_prefix="/api/v1/health")

        with app.test_client() as client:
            response = client.get("/api/v1/health/redis")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "ok"
            assert data["service"] == "redis"

    @patch("app.web.api.v1.health.ping_redis")
    def test_health_redis_returns_503_when_unhealthy(self, mock_ping):
        """Test /health/redis returns 503 when Redis is unavailable."""
        mock_ping.return_value = False

        from flask import Flask
        from app.web.api.v1.health import health_bp

        app = Flask(__name__)
        app.register_blueprint(health_bp, url_prefix="/api/v1/health")

        with app.test_client() as client:
            response = client.get("/api/v1/health/redis")
            assert response.status_code == 503
            data = response.get_json()
            assert data["status"] == "unavailable"
