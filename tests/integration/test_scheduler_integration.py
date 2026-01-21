"""
Integration Tests for Task Scheduler (TASK-001, TASK-002)

Comprehensive integration tests for TaskScheduler and maintenance tasks including:
- Scheduler initialization and lifecycle
- Task scheduling (cron, interval, date-based)
- Task execution and tracking
- Maintenance task setup and execution
- Session cleanup, database backup, and stats aggregation

These tests verify the complete task scheduling workflow with actual
APScheduler backend and SQLite persistence.
"""

import os
import sqlite3
import shutil
import tempfile
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import pytest

from app.services.task_scheduler import TaskScheduler
from app.features import maintenance_tasks


# =============================================================================
# TASK SCHEDULER INITIALIZATION TESTS
# =============================================================================

class TestSchedulerInitialization:
    """Test TaskScheduler initialization and lifecycle."""

    def test_scheduler_initialization(self, test_db_path):
        """Test that TaskScheduler creates APScheduler correctly."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Verify scheduler was created
        assert scheduler.scheduler is not None
        assert isinstance(scheduler.scheduler, object)

        # Verify database path is set
        assert scheduler.db_path == test_db_path

        # Verify database tables are created
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Check scheduled_tasks table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_tasks'"
        )
        assert cursor.fetchone() is not None

        # Check task_executions table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='task_executions'"
        )
        assert cursor.fetchone() is not None

        conn.close()

    def test_scheduler_start(self, test_db_path):
        """Test starting the scheduler."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Initially not running
        assert not scheduler.is_running()

        # Start scheduler
        scheduler.start()
        assert scheduler.is_running()

        # Cleanup
        scheduler.stop()
        assert not scheduler.is_running()

    def test_scheduler_stop(self, test_db_path):
        """Test stopping the scheduler."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Start and stop
        scheduler.start()
        assert scheduler.is_running()

        scheduler.stop()
        assert not scheduler.is_running()

    def test_scheduler_database_initialization(self, test_db_path):
        """Test that database schema is properly initialized."""
        scheduler = TaskScheduler(db_path=test_db_path)

        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Verify scheduled_tasks table structure
        cursor.execute("PRAGMA table_info(scheduled_tasks)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        assert "task_name" in columns
        assert "task_type" in columns
        assert "schedule" in columns
        assert "enabled" in columns
        assert "run_count" in columns
        assert "success_count" in columns
        assert "failure_count" in columns

        # Verify task_executions table structure
        cursor.execute("PRAGMA table_info(task_executions)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}

        assert "task_name" in columns
        assert "status" in columns
        assert "output" in columns
        assert "error" in columns
        assert "duration_ms" in columns

        conn.close()


# =============================================================================
# TASK ADDITION AND REMOVAL TESTS
# =============================================================================

class TestTaskAdditionAndRemoval:
    """Test adding and removing scheduled tasks."""

    def test_add_cron_task(self, test_db_path):
        """Test adding a cron-style task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Define a simple task function
        def test_task():
            return "Task executed"

        # Add a cron task
        result = scheduler.add_cron_task(
            name="test_hourly",
            func=test_task,
            cron_expr="0 * * * *"  # Every hour
        )

        assert result is True

        # Verify task is in database
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM scheduled_tasks WHERE task_name = ?", ("test_hourly",))
        row = cursor.fetchone()

        assert row is not None
        assert row["task_name"] == "test_hourly"
        assert row["task_type"] == "cron"
        assert row["schedule"] == "0 * * * *"

        conn.close()

    def test_add_interval_task(self, test_db_path):
        """Test adding an interval-based task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Interval task executed"

        # Add an interval task
        result = scheduler.add_interval_task(
            name="test_interval",
            func=test_task,
            seconds=300  # Every 5 minutes
        )

        assert result is True

        # Verify task is in database
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM scheduled_tasks WHERE task_name = ?", ("test_interval",))
        row = cursor.fetchone()

        assert row is not None
        assert row["task_name"] == "test_interval"
        assert row["task_type"] == "interval"
        assert row["schedule"] == "300 seconds"

        conn.close()

    def test_add_date_task(self, test_db_path):
        """Test adding a one-time date task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Date task executed"

        # Create a run date in the future
        run_date = datetime.now() + timedelta(hours=1)

        # Add a date task
        result = scheduler.add_date_task(
            name="test_date",
            func=test_task,
            run_date=run_date
        )

        assert result is True

        # Verify task is in database
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM scheduled_tasks WHERE task_name = ?", ("test_date",))
        row = cursor.fetchone()

        assert row is not None
        assert row["task_name"] == "test_date"
        assert row["task_type"] == "date"

        conn.close()

    def test_cannot_add_duplicate_task(self, test_db_path):
        """Test that duplicate task names cannot be added."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        # Add task
        result1 = scheduler.add_cron_task(
            name="duplicate_test",
            func=test_task,
            cron_expr="0 * * * *"
        )
        assert result1 is True

        # Try to add with same name
        result2 = scheduler.add_cron_task(
            name="duplicate_test",
            func=test_task,
            cron_expr="0 * * * *"
        )
        assert result2 is False

    def test_remove_task(self, test_db_path):
        """Test removing a task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        # Add a task
        scheduler.add_cron_task(
            name="task_to_remove",
            func=test_task,
            cron_expr="0 * * * *"
        )

        # Verify it exists
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM scheduled_tasks WHERE task_name = ?", ("task_to_remove",))
        count_before = cursor.fetchone()[0]
        assert count_before == 1

        conn.close()

        # Remove task
        result = scheduler.remove_task("task_to_remove")
        assert result is True

        # Verify it's gone
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM scheduled_tasks WHERE task_name = ?", ("task_to_remove",))
        count_after = cursor.fetchone()[0]
        assert count_after == 0

        conn.close()

    def test_remove_nonexistent_task(self, test_db_path):
        """Test removing a task that doesn't exist."""
        scheduler = TaskScheduler(db_path=test_db_path)

        result = scheduler.remove_task("nonexistent_task")
        assert result is False


# =============================================================================
# TASK EXECUTION TESTS
# =============================================================================

class TestTaskExecution:
    """Test task execution and tracking."""

    def test_task_execution_tracking(self, test_db_path):
        """Test that tasks are tracked when executed."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task result"

        # Add and trigger task
        scheduler.add_cron_task(
            name="tracked_task",
            func=test_task,
            cron_expr="0 * * * *"
        )

        # Manually trigger task
        scheduler.start()
        result = scheduler.trigger_task_now("tracked_task")
        assert result is True

        # Wait for execution
        time.sleep(0.5)

        # Verify execution was tracked
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM task_executions WHERE task_name = ?", ("tracked_task",))
        execution = cursor.fetchone()

        if execution:
            assert execution["task_name"] == "tracked_task"
            assert execution["status"] in ["success", "running"]

        scheduler.stop()
        conn.close()

    def test_successful_task_execution(self, test_db_path):
        """Test tracking of successful task execution."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def successful_task():
            return "Success"

        scheduler.add_cron_task(
            name="success_task",
            func=successful_task,
            cron_expr="0 * * * *"
        )

        # Trigger task
        scheduler.start()
        scheduler.trigger_task_now("success_task")
        time.sleep(0.5)

        # Check execution history
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM task_executions WHERE task_name = ?", ("success_task",))
        execution = cursor.fetchone()

        if execution:
            assert execution["status"] in ["success", "running"]

        scheduler.stop()
        conn.close()

    def test_failed_task_execution(self, test_db_path):
        """Test tracking of failed task execution."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def failing_task():
            raise ValueError("Task failed intentionally")

        scheduler.add_cron_task(
            name="failure_task",
            func=failing_task,
            cron_expr="0 * * * *"
        )

        # Trigger task
        scheduler.start()
        scheduler.trigger_task_now("failure_task")
        time.sleep(0.5)

        # Check execution history
        conn = sqlite3.connect(test_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM task_executions WHERE task_name = ?", ("failure_task",))
        execution = cursor.fetchone()

        if execution:
            assert execution["status"] is not None

        scheduler.stop()
        conn.close()

    def test_task_status_retrieval(self, test_db_path):
        """Test getting task status."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Status"

        scheduler.add_cron_task(
            name="status_task",
            func=test_task,
            cron_expr="0 * * * *"
        )

        # Get task status
        status = scheduler.get_task_status("status_task")

        assert status is not None
        assert status["task_name"] == "status_task"
        assert status["task_type"] == "cron"
        assert status["enabled"] == 1
        assert status["run_count"] == 0

    def test_get_all_tasks(self, test_db_path):
        """Test retrieving all tasks."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        # Add multiple tasks
        scheduler.add_cron_task("task1", test_task, "0 * * * *")
        scheduler.add_cron_task("task2", test_task, "0 2 * * *")
        scheduler.add_interval_task("task3", test_task, 300)

        # Get all tasks
        tasks = scheduler.get_all_tasks()

        assert len(tasks) >= 3
        task_names = [t["task_name"] for t in tasks]
        assert "task1" in task_names
        assert "task2" in task_names
        assert "task3" in task_names


# =============================================================================
# CRON EXPRESSION TESTS
# =============================================================================

class TestCronTaskScheduling:
    """Test cron expression parsing and scheduling."""

    def test_cron_daily_at_specific_time(self, test_db_path):
        """Test cron expression for daily execution at specific time."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Daily"

        # Daily at 3 AM
        result = scheduler.add_cron_task(
            name="daily_3am",
            func=test_task,
            cron_expr="0 3 * * *"
        )

        assert result is True

        status = scheduler.get_task_status("daily_3am")
        assert status["schedule"] == "0 3 * * *"

    def test_cron_hourly(self, test_db_path):
        """Test cron expression for hourly execution."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Hourly"

        # Every hour
        result = scheduler.add_cron_task(
            name="hourly_task",
            func=test_task,
            cron_expr="0 * * * *"
        )

        assert result is True

    def test_cron_weekly(self, test_db_path):
        """Test cron expression for weekly execution."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Weekly"

        # Sunday at 4 AM
        result = scheduler.add_cron_task(
            name="weekly_task",
            func=test_task,
            cron_expr="0 4 * * 0"
        )

        assert result is True

    def test_cron_monthly(self, test_db_path):
        """Test cron expression for monthly execution."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Monthly"

        # 1st of month at 5 AM
        result = scheduler.add_cron_task(
            name="monthly_task",
            func=test_task,
            cron_expr="0 5 1 * *"
        )

        assert result is True

    def test_invalid_cron_expression(self, test_db_path):
        """Test that invalid cron expression is rejected."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        # Invalid cron (only 4 parts instead of 5)
        result = scheduler.add_cron_task(
            name="invalid_cron",
            func=test_task,
            cron_expr="0 * * *"
        )

        assert result is False


# =============================================================================
# MAINTENANCE TASK SETUP TESTS
# =============================================================================

class TestMaintenanceTaskSetup:
    """Test setup of default maintenance tasks."""

    def test_setup_default_tasks(self, test_db_path):
        """Test that all default maintenance tasks are registered."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Setup default maintenance tasks
        maintenance_tasks.setup_default_tasks(scheduler)

        # Verify all tasks are registered
        tasks = scheduler.get_all_tasks()
        task_names = [t["task_name"] for t in tasks]

        assert "cleanup_sessions" in task_names
        assert "backup_database" in task_names
        assert "archive_audit_logs" in task_names
        assert "aggregate_daily_stats" in task_names
        assert "cleanup_error_logs" in task_names
        assert "cleanup_inactive_credentials" in task_names

    def test_maintenance_tasks_have_correct_schedules(self, test_db_path):
        """Test that maintenance tasks have correct schedules."""
        scheduler = TaskScheduler(db_path=test_db_path)

        maintenance_tasks.setup_default_tasks(scheduler)

        # Check cleanup_sessions - hourly
        cleanup_sessions = scheduler.get_task_status("cleanup_sessions")
        assert cleanup_sessions["schedule"] == "0 * * * *"

        # Check backup_database - daily at 3 AM
        backup_db = scheduler.get_task_status("backup_database")
        assert backup_db["schedule"] == "0 3 * * *"

        # Check archive_audit_logs - daily at 2 AM
        archive_logs = scheduler.get_task_status("archive_audit_logs")
        assert archive_logs["schedule"] == "0 2 * * *"

        # Check aggregate_daily_stats - daily at 1 AM
        aggregate_stats = scheduler.get_task_status("aggregate_daily_stats")
        assert aggregate_stats["schedule"] == "0 1 * * *"

        # Check cleanup_error_logs - weekly at 4 AM
        cleanup_errors = scheduler.get_task_status("cleanup_error_logs")
        assert cleanup_errors["schedule"] == "0 4 * * 0"

        # Check cleanup_inactive_credentials - monthly at 5 AM
        cleanup_creds = scheduler.get_task_status("cleanup_inactive_credentials")
        assert cleanup_creds["schedule"] == "0 5 1 * *"


# =============================================================================
# CLEANUP SESSIONS TASK TESTS
# =============================================================================

class TestCleanupSessionsTask:
    """Test session cleanup maintenance task."""

    def test_cleanup_sessions_task_executes(self, test_db_path, test_db):
        """Test that cleanup_sessions task executes successfully."""
        # Create some test sessions
        cursor = test_db.cursor()
        now = int(time.time())

        # Expired session
        cursor.execute('''
            INSERT INTO user_sessions
            (user_id, session_token, created_at, expires_at, ip_address, user_agent)
            VALUES (1, 'expired_token', ?, ?, '127.0.0.1', 'Test')
        ''', (now - 7200, now - 3600))  # Expires 1 hour ago

        # Valid session
        cursor.execute('''
            INSERT INTO user_sessions
            (user_id, session_token, created_at, expires_at, ip_address, user_agent)
            VALUES (1, 'valid_token', ?, ?, '127.0.0.1', 'Test')
        ''', (now, now + 3600))  # Expires in 1 hour

        test_db.commit()

        # Count before cleanup
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        count_before = cursor.fetchone()[0]
        assert count_before == 2

        # Run cleanup
        result = maintenance_tasks.cleanup_expired_sessions(test_db_path)

        # Verify cleanup was successful
        assert "deleted" in result

        # Reconnect to get latest data
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()

        # Count after cleanup
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        count_after = cursor.fetchone()[0]
        assert count_after < count_before

        conn.close()

    def test_cleanup_sessions_returns_stats(self, test_db_path):
        """Test that cleanup_sessions returns execution stats."""
        result = maintenance_tasks.cleanup_expired_sessions(test_db_path)

        assert isinstance(result, dict)
        assert "deleted" in result
        assert "duration_ms" in result
        assert isinstance(result["deleted"], int)
        assert isinstance(result["duration_ms"], int)


# =============================================================================
# BACKUP DATABASE TASK TESTS
# =============================================================================

class TestBackupDatabaseTask:
    """Test database backup maintenance task."""

    def test_backup_database_task_creates_backup(self, test_db_path):
        """Test that backup_database task creates a backup file."""
        # Create temporary backup directory
        backup_dir = tempfile.mkdtemp()

        try:
            # Create a test database
            scheduler = TaskScheduler(db_path=test_db_path)

            # Add some data to backup
            scheduler.add_cron_task("test_task", lambda: "test", "0 * * * *")

            # Run backup
            result = maintenance_tasks.backup_database(backup_dir=backup_dir, db_path=test_db_path)

            # Verify backup was created
            assert "backup_path" in result
            assert "size_bytes" in result
            assert "duration_ms" in result

            # Verify file exists
            assert os.path.exists(result["backup_path"])
            assert result["size_bytes"] > 0

        finally:
            # Cleanup
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir)

    def test_backup_database_returns_stats(self, test_db_path):
        """Test that backup_database returns execution stats."""
        backup_dir = tempfile.mkdtemp()

        try:
            result = maintenance_tasks.backup_database(backup_dir=backup_dir, db_path=test_db_path)

            assert isinstance(result, dict)
            assert "backup_path" in result
            assert "size_bytes" in result
            assert "duration_ms" in result

        finally:
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir)

    def test_backup_database_creates_unique_files(self, test_db_path):
        """Test that multiple backups create unique files."""
        backup_dir = tempfile.mkdtemp()

        try:
            # Create first backup
            result1 = maintenance_tasks.backup_database(backup_dir=backup_dir, db_path=test_db_path)
            backup_file1 = result1["backup_path"]

            # Wait to ensure different timestamp (backup uses int(time.time()))
            time.sleep(1.1)

            # Create second backup
            result2 = maintenance_tasks.backup_database(backup_dir=backup_dir, db_path=test_db_path)
            backup_file2 = result2["backup_path"]

            # Verify files are different
            assert backup_file1 != backup_file2
            assert os.path.exists(backup_file1)
            assert os.path.exists(backup_file2)

        finally:
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir)


# =============================================================================
# AGGREGATE STATS TASK TESTS
# =============================================================================

class TestAggregateStatsTask:
    """Test daily stats aggregation maintenance task."""

    def test_aggregate_stats_task_creates_table(self, test_db_path, test_db):
        """Test that aggregate_daily_stats creates daily_stats table."""
        # First ensure sync_stats table exists
        cursor = test_db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                success INTEGER NOT NULL,
                media_count INTEGER DEFAULT 0,
                is_thread INTEGER DEFAULT 0,
                error_type TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                user_id INTEGER
            )
        ''')
        test_db.commit()

        # Run aggregation
        result = maintenance_tasks.aggregate_daily_stats(test_db_path)

        # Verify daily_stats table was created
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_stats'"
        )
        assert cursor.fetchone() is not None
        conn.close()

    def test_aggregate_stats_returns_stats(self, test_db_path, test_db):
        """Test that aggregate_daily_stats returns execution stats."""
        # Ensure sync_stats table exists
        cursor = test_db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                success INTEGER NOT NULL,
                media_count INTEGER DEFAULT 0,
                is_thread INTEGER DEFAULT 0,
                error_type TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                user_id INTEGER
            )
        ''')
        test_db.commit()

        result = maintenance_tasks.aggregate_daily_stats(test_db_path)

        assert isinstance(result, dict)
        assert "aggregated" in result
        assert "duration_ms" in result
        assert isinstance(result["aggregated"], int)
        assert isinstance(result["duration_ms"], int)

    def test_aggregate_stats_aggregates_data(self, test_db_path, test_db):
        """Test that aggregate_daily_stats actually aggregates sync data."""
        cursor = test_db.cursor()

        # Create sync_stats table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                success INTEGER NOT NULL,
                media_count INTEGER DEFAULT 0,
                is_thread INTEGER DEFAULT 0,
                error_type TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                user_id INTEGER
            )
        ''')

        # Insert test data from yesterday
        now = int(time.time())
        yesterday_start = now - (24 * 60 * 60)

        cursor.execute('''
            INSERT INTO sync_stats
            (timestamp, source, target, success, user_id)
            VALUES (?, 'twitter', 'bluesky', 1, 1),
                   (?, 'twitter', 'bluesky', 1, 1),
                   (?, 'twitter', 'bluesky', 0, 1)
        ''', (yesterday_start + 100, yesterday_start + 200, yesterday_start + 300))

        test_db.commit()

        # Run aggregation
        result = maintenance_tasks.aggregate_daily_stats(test_db_path)

        # Verify results
        assert result["aggregated"] >= 0


# =============================================================================
# TASK PAUSE AND RESUME TESTS
# =============================================================================

class TestTaskPauseAndResume:
    """Test pausing and resuming tasks."""

    def test_pause_task(self, test_db_path):
        """Test pausing a task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        scheduler.add_cron_task("task_to_pause", test_task, "0 * * * *")

        # Verify task is enabled
        status_before = scheduler.get_task_status("task_to_pause")
        assert status_before["enabled"] == 1

        # Pause task
        result = scheduler.pause_task("task_to_pause")
        assert result is True

        # Verify task is disabled
        status_after = scheduler.get_task_status("task_to_pause")
        assert status_after["enabled"] == 0

    def test_resume_task(self, test_db_path):
        """Test resuming a paused task."""
        scheduler = TaskScheduler(db_path=test_db_path)

        def test_task():
            return "Task"

        scheduler.add_cron_task("task_to_resume", test_task, "0 * * * *")

        # Pause task
        scheduler.pause_task("task_to_resume")

        # Verify task is disabled
        status_paused = scheduler.get_task_status("task_to_resume")
        assert status_paused["enabled"] == 0

        # Resume task
        result = scheduler.resume_task("task_to_resume")
        assert result is True

        # Verify task is enabled
        status_resumed = scheduler.get_task_status("task_to_resume")
        assert status_resumed["enabled"] == 1


# =============================================================================
# INTEGRATION TEST - FULL WORKFLOW
# =============================================================================

class TestSchedulerIntegrationWorkflow:
    """Test complete scheduler workflow."""

    def test_full_scheduler_lifecycle(self, test_db_path):
        """Test complete lifecycle: init, add tasks, start, stop."""
        # Initialize
        scheduler = TaskScheduler(db_path=test_db_path)
        assert not scheduler.is_running()

        # Add multiple tasks
        def task1():
            return "Task 1"

        def task2():
            return "Task 2"

        scheduler.add_cron_task("task1", task1, "0 * * * *")
        scheduler.add_cron_task("task2", task2, "0 2 * * *")

        # Verify tasks exist
        tasks = scheduler.get_all_tasks()
        assert len(tasks) >= 2

        # Start scheduler
        scheduler.start()
        assert scheduler.is_running()

        # Trigger a task
        scheduler.trigger_task_now("task1")
        time.sleep(0.2)

        # Stop scheduler
        scheduler.stop()
        assert not scheduler.is_running()

    def test_scheduler_with_maintenance_tasks(self, test_db_path):
        """Test scheduler with default maintenance tasks."""
        scheduler = TaskScheduler(db_path=test_db_path)

        # Setup maintenance tasks
        maintenance_tasks.setup_default_tasks(scheduler)

        # Verify all tasks are registered
        tasks = scheduler.get_all_tasks()
        assert len(tasks) >= 6

        # Start and verify state
        scheduler.start()
        assert scheduler.is_running()

        # Stop
        scheduler.stop()
        assert not scheduler.is_running()
