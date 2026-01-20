"""
Tests for Maintenance Tasks (Sprint 6 - TASK-002)

Comprehensive tests for scheduled maintenance task functions.
Tests cleanup, archiving, backups, and aggregation tasks.
"""

import pytest
import time
import os
import tempfile
import sqlite3
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.features.maintenance_tasks import (
    cleanup_expired_sessions,
    archive_audit_logs,
    backup_database,
    cleanup_inactive_credentials,
    aggregate_daily_stats,
    cleanup_error_logs,
)
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.auth.security_utils import log_audit


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def setup_db(temp_db):
    """Initialize database with required tables"""
    # Initialize UserManager and CredentialManager to create tables
    user_manager = UserManager(db_path=temp_db)
    user_manager.init_db()

    # Create master key for CredentialManager
    master_key = b"0" * 32  # 32 bytes for AES-256
    cred_manager = CredentialManager(master_key=master_key, db_path=temp_db)
    cred_manager.init_db()

    # Create sync_stats table for aggregation
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            sync_type TEXT NOT NULL,
            success INTEGER NOT NULL,
            posts_synced INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            user_id INTEGER,
            total_syncs INTEGER DEFAULT 0,
            successful_syncs INTEGER DEFAULT 0,
            failed_syncs INTEGER DEFAULT 0,
            total_duration_ms INTEGER DEFAULT 0,
            UNIQUE(date, user_id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS archived_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            success INTEGER,
            details TEXT,
            created_at INTEGER NOT NULL,
            archived_at INTEGER NOT NULL
        )
    """
    )

    conn.commit()
    conn.close()

    return temp_db


class TestCleanupExpiredSessions:
    """Tests for cleanup_expired_sessions function"""

    def test_cleanup_expired_sessions_deletes_expired(self, setup_db):
        """Test that expired sessions are deleted"""
        user_manager = UserManager(db_path=setup_db)

        # Create test user
        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )

        # Create expired session (expires 1 hour ago)
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        expired_time = int(time.time()) - 3600
        cursor.execute(
            """
            INSERT INTO user_sessions (user_id, session_token, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        """,
            (user_id, "expired_token", expired_time - 7200, expired_time),
        )
        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_expired_sessions(db_path=setup_db)

        # Verify result
        assert result["deleted"] == 1
        assert "duration_ms" in result
        assert result["duration_ms"] >= 0

        # Verify session was deleted
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM user_sessions WHERE session_token = ?",
            ("expired_token",),
        )
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 0

    def test_cleanup_expired_sessions_keeps_valid(self, setup_db):
        """Test that valid sessions are not deleted"""
        user_manager = UserManager(db_path=setup_db)

        # Create test user
        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )

        # Create valid session (expires in 1 hour)
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        valid_time = int(time.time()) + 3600
        cursor.execute(
            """
            INSERT INTO user_sessions (user_id, session_token, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        """,
            (user_id, "valid_token", int(time.time()), valid_time),
        )
        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_expired_sessions(db_path=setup_db)

        # Verify no sessions deleted
        assert result["deleted"] == 0

        # Verify session still exists
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM user_sessions WHERE session_token = ?",
            ("valid_token",),
        )
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1

    def test_cleanup_expired_sessions_multiple(self, setup_db):
        """Test cleanup with multiple expired and valid sessions"""
        user_manager = UserManager(db_path=setup_db)
        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )

        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        now = int(time.time())

        # Create 3 expired sessions
        for i in range(3):
            cursor.execute(
                """
                INSERT INTO user_sessions (user_id, session_token, created_at, expires_at)
                VALUES (?, ?, ?, ?)
            """,
                (user_id, f"expired_{i}", now - 7200, now - 3600),
            )

        # Create 2 valid sessions
        for i in range(2):
            cursor.execute(
                """
                INSERT INTO user_sessions (user_id, session_token, created_at, expires_at)
                VALUES (?, ?, ?, ?)
            """,
                (user_id, f"valid_{i}", now, now + 3600),
            )

        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_expired_sessions(db_path=setup_db)

        # Verify 3 expired sessions deleted
        assert result["deleted"] == 3

        # Verify only 2 sessions remain
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM user_sessions")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 2


class TestArchiveAuditLogs:
    """Tests for archive_audit_logs function"""

    def test_archive_audit_logs_archives_old(self, setup_db):
        """Test that old audit logs are archived"""
        # Create old audit log (100 days ago)
        old_time = int(time.time()) - (100 * 24 * 3600)
        log_audit(1, "test_action", True, details={"test": "data"}, db_path=setup_db)

        # Update created_at to be old
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("UPDATE audit_log SET created_at = ?", (old_time,))
        conn.commit()
        conn.close()

        # Run archive
        result = archive_audit_logs(days_old=90, db_path=setup_db)

        # Verify result
        assert result["archived"] == 1
        assert "duration_ms" in result

        # Verify log was moved to archive
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM archived_audit_logs")
        archived_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM audit_log")
        active_count = cursor.fetchone()[0]
        conn.close()

        assert archived_count == 1
        assert active_count == 0

    def test_archive_audit_logs_keeps_recent(self, setup_db):
        """Test that recent audit logs are not archived"""
        # Create recent audit log (10 days ago)
        recent_time = int(time.time()) - (10 * 24 * 3600)
        log_audit(1, "test_action", True, details={"test": "data"}, db_path=setup_db)

        # Update created_at to be recent
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("UPDATE audit_log SET created_at = ?", (recent_time,))
        conn.commit()
        conn.close()

        # Run archive (default 90 days)
        result = archive_audit_logs(db_path=setup_db)

        # Verify no logs archived
        assert result["archived"] == 0

        # Verify log still in audit_log
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1

    def test_archive_audit_logs_custom_days(self, setup_db):
        """Test archive with custom days parameter"""
        # Create audit log 40 days ago
        old_time = int(time.time()) - (40 * 24 * 3600)
        log_audit(1, "test_action", True, db_path=setup_db)

        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("UPDATE audit_log SET created_at = ?", (old_time,))
        conn.commit()
        conn.close()

        # Archive logs older than 30 days
        result = archive_audit_logs(days_old=30, db_path=setup_db)

        # Verify log was archived
        assert result["archived"] == 1


class TestBackupDatabase:
    """Tests for backup_database function"""

    def test_backup_database_creates_file(self, setup_db):
        """Test that backup creates a file"""
        # Create temporary backup directory
        backup_dir = tempfile.mkdtemp()

        try:
            # Run backup
            result = backup_database(db_path=setup_db, backup_dir=backup_dir)

            # Verify result
            assert "backup_path" in result
            assert "size_bytes" in result
            assert "duration_ms" in result
            assert result["size_bytes"] > 0

            # Verify file exists
            assert os.path.exists(result["backup_path"])
            assert os.path.isfile(result["backup_path"])

            # Verify file is in backup_dir
            assert result["backup_path"].startswith(backup_dir)

            # Verify filename format (chirpsyncer_YYYYMMDD_HHMMSS.db)
            filename = os.path.basename(result["backup_path"])
            assert filename.startswith("chirpsyncer_")
            assert filename.endswith(".db")

        finally:
            # Cleanup backup directory
            shutil.rmtree(backup_dir, ignore_errors=True)

    def test_backup_database_creates_directory(self, setup_db):
        """Test that backup creates directory if it doesn't exist"""
        backup_dir = os.path.join(
            tempfile.gettempdir(), "test_backups_" + str(int(time.time()))
        )

        try:
            # Ensure directory doesn't exist
            assert not os.path.exists(backup_dir)

            # Run backup
            result = backup_database(db_path=setup_db, backup_dir=backup_dir)

            # Verify directory was created
            assert os.path.exists(backup_dir)
            assert os.path.isdir(backup_dir)

            # Verify backup file exists
            assert os.path.exists(result["backup_path"])

        finally:
            # Cleanup
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir, ignore_errors=True)

    def test_backup_database_valid_copy(self, setup_db):
        """Test that backup is a valid SQLite database"""
        backup_dir = tempfile.mkdtemp()

        try:
            # Add some data to source database
            user_manager = UserManager(db_path=setup_db)
            user_id = user_manager.create_user(
                "testuser", "test@example.com", "SecurePass123!"
            )

            # Create backup
            result = backup_database(db_path=setup_db, backup_dir=backup_dir)

            # Verify backup is a valid database
            backup_conn = sqlite3.connect(result["backup_path"])
            cursor = backup_conn.cursor()

            # Verify we can query the backup
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()

            assert row is not None
            assert row[0] == "testuser"

            backup_conn.close()

        finally:
            shutil.rmtree(backup_dir, ignore_errors=True)


class TestCleanupInactiveCredentials:
    """Tests for cleanup_inactive_credentials function"""

    def test_cleanup_inactive_credentials_marks_old(self, setup_db):
        """Test that old credentials are marked inactive"""
        # Create credential manager
        master_key = b"0" * 32
        cred_manager = CredentialManager(master_key=master_key, db_path=setup_db)

        # Create test user
        user_manager = UserManager(db_path=setup_db)
        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )

        # Create credential with old last_used
        cred_manager.save_credentials(
            user_id, "twitter", "scraping", {"username": "test"}
        )

        # Set last_used to 7 months ago
        old_time = int(time.time()) - (7 * 30 * 24 * 3600)
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_credentials SET last_used = ? WHERE user_id = ?",
            (old_time, user_id),
        )
        conn.commit()
        conn.close()

        # Run cleanup (default 6 months)
        result = cleanup_inactive_credentials(db_path=setup_db)

        # Verify result
        assert result["marked_inactive"] == 1
        assert "duration_ms" in result

        # Verify credential marked inactive
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT is_active FROM user_credentials WHERE user_id = ?", (user_id,)
        )
        is_active = cursor.fetchone()[0]
        conn.close()

        assert is_active == 0

    def test_cleanup_inactive_credentials_keeps_recent(self, setup_db):
        """Test that recently used credentials are not marked inactive"""
        master_key = b"0" * 32
        cred_manager = CredentialManager(master_key=master_key, db_path=setup_db)
        user_manager = UserManager(db_path=setup_db)

        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )
        cred_manager.save_credentials(
            user_id, "twitter", "scraping", {"username": "test"}
        )

        # Set last_used to 3 months ago (within 6 month threshold)
        recent_time = int(time.time()) - (3 * 30 * 24 * 3600)
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_credentials SET last_used = ? WHERE user_id = ?",
            (recent_time, user_id),
        )
        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_inactive_credentials(db_path=setup_db)

        # Verify no credentials marked inactive
        assert result["marked_inactive"] == 0

        # Verify credential still active
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT is_active FROM user_credentials WHERE user_id = ?", (user_id,)
        )
        is_active = cursor.fetchone()[0]
        conn.close()

        assert is_active == 1

    def test_cleanup_inactive_credentials_custom_months(self, setup_db):
        """Test cleanup with custom months parameter"""
        master_key = b"0" * 32
        cred_manager = CredentialManager(master_key=master_key, db_path=setup_db)
        user_manager = UserManager(db_path=setup_db)

        user_id = user_manager.create_user(
            "testuser", "test@example.com", "SecurePass123!"
        )
        cred_manager.save_credentials(
            user_id, "twitter", "scraping", {"username": "test"}
        )

        # Set last_used to 4 months ago
        old_time = int(time.time()) - (4 * 30 * 24 * 3600)
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE user_credentials SET last_used = ? WHERE user_id = ?",
            (old_time, user_id),
        )
        conn.commit()
        conn.close()

        # Cleanup with 3 month threshold
        result = cleanup_inactive_credentials(months=3, db_path=setup_db)

        # Verify credential marked inactive
        assert result["marked_inactive"] == 1


class TestAggregateDailyStats:
    """Tests for aggregate_daily_stats function"""

    def test_aggregate_daily_stats_creates_summary(self, setup_db):
        """Test that daily stats are aggregated"""
        # Create sync stats for yesterday
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()

        yesterday = int(time.time()) - 86400  # Yesterday's timestamp

        # Insert some sync stats
        for i in range(5):
            cursor.execute(
                """
                INSERT INTO sync_stats (user_id, source, target, success, media_count, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (1, "twitter", "bluesky", 1, 10, yesterday + i * 100),
            )

        # Insert failed sync
        cursor.execute(
            """
            INSERT INTO sync_stats (user_id, source, target, success, media_count, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (1, "twitter", "bluesky", 0, 0, yesterday + 500),
        )

        conn.commit()
        conn.close()

        # Run aggregation
        result = aggregate_daily_stats(db_path=setup_db)

        # Verify result
        assert result["aggregated"] > 0
        assert "duration_ms" in result

        # Verify daily stats created
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_stats WHERE user_id = 1")
        row = cursor.fetchone()
        conn.close()

        assert row is not None

    def test_aggregate_daily_stats_correct_counts(self, setup_db):
        """Test that aggregation calculates correct counts"""
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()

        yesterday = int(time.time()) - 86400

        # 3 successful syncs, 2 failed, 30 total posts
        for i in range(3):
            cursor.execute(
                """
                INSERT INTO sync_stats (user_id, source, target, success, media_count, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (1, "twitter", "bluesky", 1, 10, yesterday + i),
            )

        for i in range(2):
            cursor.execute(
                """
                INSERT INTO sync_stats (user_id, source, target, success, media_count, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """,
                (1, "twitter", "bluesky", 0, 0, yesterday + 100 + i),
            )

        conn.commit()
        conn.close()

        # Run aggregation
        result = aggregate_daily_stats(db_path=setup_db)

        # Verify aggregated data
        conn = sqlite3.connect(setup_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM daily_stats WHERE user_id = 1")
        row = cursor.fetchone()
        conn.close()

        assert row["total_syncs"] == 5
        assert row["successful_syncs"] == 3
        assert row["failed_syncs"] == 2


class TestCleanupErrorLogs:
    """Tests for cleanup_error_logs function"""

    def test_cleanup_error_logs_deletes_old_errors(self, setup_db):
        """Test that old error logs are deleted"""
        # Create old error log (40 days ago)
        old_time = int(time.time()) - (40 * 24 * 3600)
        log_audit(
            1, "test_error", success=False, details={"error": "test"}, db_path=setup_db
        )

        # Update created_at to be old
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE audit_log SET created_at = ? WHERE success = 0", (old_time,)
        )
        conn.commit()
        conn.close()

        # Run cleanup (default 30 days)
        result = cleanup_error_logs(db_path=setup_db)

        # Verify result
        assert result["deleted"] == 1
        assert "duration_ms" in result

        # Verify error log deleted
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log WHERE success = 0")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 0

    def test_cleanup_error_logs_keeps_recent_errors(self, setup_db):
        """Test that recent error logs are kept"""
        # Create recent error log (10 days ago)
        recent_time = int(time.time()) - (10 * 24 * 3600)
        log_audit(
            1, "test_error", success=False, details={"error": "test"}, db_path=setup_db
        )

        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE audit_log SET created_at = ? WHERE success = 0", (recent_time,)
        )
        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_error_logs(db_path=setup_db)

        # Verify no logs deleted
        assert result["deleted"] == 0

        # Verify log still exists
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log WHERE success = 0")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1

    def test_cleanup_error_logs_keeps_success_logs(self, setup_db):
        """Test that successful logs are not deleted"""
        # Create old successful log
        old_time = int(time.time()) - (40 * 24 * 3600)
        log_audit(
            1, "test_success", success=True, details={"data": "test"}, db_path=setup_db
        )

        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE audit_log SET created_at = ? WHERE success = 1", (old_time,)
        )
        conn.commit()
        conn.close()

        # Run cleanup
        result = cleanup_error_logs(days_old=30, db_path=setup_db)

        # Verify no logs deleted (only errors are deleted)
        assert result["deleted"] == 0

        # Verify success log still exists
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log WHERE success = 1")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1


class TestAggregateDailyStatsEdgeCases:
    """Tests for edge cases in aggregate_daily_stats"""

    def test_aggregate_daily_stats_no_sync_stats_table(self, setup_db):
        """Test aggregate_daily_stats when sync_stats table doesn't exist"""
        # Create a fresh database without sync_stats table
        conn = sqlite3.connect(setup_db)
        cursor = conn.cursor()

        # Drop sync_stats table if it exists
        cursor.execute("DROP TABLE IF EXISTS sync_stats")
        conn.commit()
        conn.close()

        # Run aggregation - should handle gracefully
        result = aggregate_daily_stats(db_path=setup_db)

        # Should return early with aggregated = 0
        assert result["aggregated"] == 0
        assert "duration_ms" in result
        assert result["duration_ms"] >= 0


class TestSetupDefaultTasks:
    """Tests for setup_default_tasks function"""

    def test_setup_default_tasks_registers_all_tasks(self):
        """Test that setup_default_tasks registers all maintenance tasks"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        # Create a mock scheduler
        mock_scheduler = MagicMock()
        mock_scheduler.add_cron_task = MagicMock()

        # Call setup_default_tasks
        setup_default_tasks(mock_scheduler)

        # Verify all tasks were registered
        assert mock_scheduler.add_cron_task.call_count == 6

        # Get all the calls
        calls = mock_scheduler.add_cron_task.call_args_list

        # Extract task names from calls
        task_names = [call[1]["name"] for call in calls]

        # Verify all expected tasks are present
        expected_tasks = [
            "cleanup_sessions",
            "backup_database",
            "archive_audit_logs",
            "aggregate_daily_stats",
            "cleanup_error_logs",
            "cleanup_inactive_credentials",
        ]

        for task_name in expected_tasks:
            assert task_name in task_names, f"Task {task_name} not registered"

    def test_setup_default_tasks_task_names(self):
        """Test that all tasks have correct names"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        for call in calls:
            # Verify 'name' parameter exists
            assert "name" in call[1]
            # Verify 'func' parameter exists
            assert "func" in call[1]
            # Verify 'cron_expr' parameter exists
            assert "cron_expr" in call[1]

    def test_setup_default_tasks_cron_expressions(self):
        """Test that tasks have valid cron expressions"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Expected cron expressions for each task
        expected_crons = {
            "cleanup_sessions": "0 * * * *",  # Every hour
            "backup_database": "0 3 * * *",  # Daily at 3 AM
            "archive_audit_logs": "0 2 * * *",  # Daily at 2 AM
            "aggregate_daily_stats": "0 1 * * *",  # Daily at 1 AM
            "cleanup_error_logs": "0 4 * * 0",  # Weekly Sunday 4 AM
            "cleanup_inactive_credentials": "0 5 1 * *",  # Monthly 1st at 5 AM
        }

        for call in calls:
            task_name = call[1]["name"]
            cron_expr = call[1]["cron_expr"]

            if task_name in expected_crons:
                assert (
                    cron_expr == expected_crons[task_name]
                ), f"Task {task_name} has wrong cron: {cron_expr} vs {expected_crons[task_name]}"

    def test_setup_default_tasks_cleanup_sessions_function(self):
        """Test that cleanup_sessions function is properly registered"""
        from app.features.maintenance_tasks import (
            setup_default_tasks,
            cleanup_expired_sessions,
        )
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Find the cleanup_sessions call
        for call in calls:
            if call[1]["name"] == "cleanup_sessions":
                # Verify the function is cleanup_expired_sessions
                assert call[1]["func"] == cleanup_expired_sessions
                break
        else:
            assert False, "cleanup_sessions task not found"

    def test_setup_default_tasks_backup_database_function(self):
        """Test that backup_database function is properly registered"""
        from app.features.maintenance_tasks import setup_default_tasks, backup_database
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Find the backup_database call
        for call in calls:
            if call[1]["name"] == "backup_database":
                # Verify the function is backup_database
                assert call[1]["func"] == backup_database
                break
        else:
            assert False, "backup_database task not found"

    def test_setup_default_tasks_archive_audit_logs_function(self):
        """Test that archive_audit_logs function is properly registered"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Find the archive_audit_logs call
        for call in calls:
            if call[1]["name"] == "archive_audit_logs":
                # Function is a lambda, just verify it's callable
                assert callable(call[1]["func"])
                break
        else:
            assert False, "archive_audit_logs task not found"

    def test_setup_default_tasks_cleanup_error_logs_function(self):
        """Test that cleanup_error_logs is registered with lambda"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Find the cleanup_error_logs call
        for call in calls:
            if call[1]["name"] == "cleanup_error_logs":
                # Function is a lambda, just verify it's callable
                assert callable(call[1]["func"])
                break
        else:
            assert False, "cleanup_error_logs task not found"

    def test_setup_default_tasks_cleanup_inactive_credentials_function(self):
        """Test that cleanup_inactive_credentials is registered with lambda"""
        from app.features.maintenance_tasks import setup_default_tasks
        from unittest.mock import MagicMock

        mock_scheduler = MagicMock()
        setup_default_tasks(mock_scheduler)

        calls = mock_scheduler.add_cron_task.call_args_list

        # Find the cleanup_inactive_credentials call
        for call in calls:
            if call[1]["name"] == "cleanup_inactive_credentials":
                # Function is a lambda, just verify it's callable
                assert callable(call[1]["func"])
                break
        else:
            assert False, "cleanup_inactive_credentials task not found"


class TestErrorHandling:
    """Tests for error handling in maintenance tasks"""

    def test_cleanup_sessions_invalid_db(self):
        """Test cleanup_expired_sessions handles invalid database"""
        result = cleanup_expired_sessions(db_path="/nonexistent/database.db")

        # Should return error info
        assert "error" in result
        assert result["deleted"] == 0

    def test_backup_database_invalid_source(self):
        """Test backup_database handles invalid source database"""
        backup_dir = tempfile.mkdtemp()

        try:
            result = backup_database(
                db_path="/nonexistent/database.db", backup_dir=backup_dir
            )

            # Should return error info
            assert "error" in result

        finally:
            shutil.rmtree(backup_dir, ignore_errors=True)
