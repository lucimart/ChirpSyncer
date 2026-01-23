"""
Unit tests for notification Celery tasks.
"""

import os
import sqlite3
import tempfile
import time
from unittest.mock import patch, MagicMock
import pytest

from app.services.notification_preferences import NotificationPreferences


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    # Create required tables
    conn = sqlite3.connect(path)
    conn.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT,
            password_hash TEXT,
            is_admin INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE sync_jobs (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            direction TEXT,
            status TEXT,
            posts_synced INTEGER,
            error_message TEXT,
            created_at INTEGER,
            started_at INTEGER,
            completed_at INTEGER
        )
        """
    )
    # Insert test user
    conn.execute(
        """
        INSERT INTO users (id, username, email, password_hash, is_admin, is_active, created_at)
        VALUES (1, 'testuser', 'test@example.com', 'hash', 0, 1, ?)
        """,
        (int(time.time()),),
    )
    conn.commit()
    conn.close()

    yield path

    os.unlink(path)


@pytest.fixture
def prefs_manager(temp_db):
    """Create NotificationPreferences manager with temp db."""
    manager = NotificationPreferences(db_path=temp_db)
    manager.init_db()
    return manager


class TestSendSyncNotification:
    """Tests for send_sync_notification task."""

    @patch("app.tasks.notification_tasks.DB_PATH", "test.db")
    @patch("app.tasks.notification_tasks._get_notification_service")
    @patch("app.tasks.notification_tasks._get_preferences_manager")
    @patch("app.tasks.notification_tasks._get_user_manager")
    def test_skips_when_notifications_disabled(
        self, mock_user_manager, mock_prefs_manager, mock_notification_service
    ):
        """Test that notification is skipped when user has disabled it."""
        from app.tasks.notification_tasks import send_sync_notification

        # Setup mocks
        mock_prefs = MagicMock()
        mock_prefs.should_notify.return_value = False
        mock_prefs_manager.return_value = mock_prefs

        # Call task synchronously
        send_sync_notification(
            None,  # self
            user_id=1,
            job_id="job-123",
            status="completed",
            details={"posts_synced": 5},
        )

        # Verify notification service was not called
        mock_notification_service.return_value.notify_task_completion.assert_not_called()

    @patch("app.tasks.notification_tasks.DB_PATH", "test.db")
    @patch("app.tasks.notification_tasks._get_notification_service")
    @patch("app.tasks.notification_tasks._get_preferences_manager")
    @patch("app.tasks.notification_tasks._get_user_manager")
    def test_sends_completion_notification(
        self, mock_user_manager, mock_prefs_manager, mock_notification_service
    ):
        """Test that completion notification is sent when enabled."""
        from app.tasks.notification_tasks import send_sync_notification

        # Setup mocks
        mock_prefs = MagicMock()
        mock_prefs.should_notify.return_value = True
        mock_prefs_manager.return_value = mock_prefs

        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user_manager.return_value.get_user_by_id.return_value = mock_user

        mock_service = MagicMock()
        mock_notification_service.return_value = mock_service

        # Call task
        send_sync_notification(
            None,
            user_id=1,
            job_id="job-123",
            status="completed",
            details={"posts_synced": 5},
        )

        # Verify notification was sent
        mock_service.notify_task_completion.assert_called_once()
        call_args = mock_service.notify_task_completion.call_args
        assert "job-123" in call_args[1]["task_name"]
        assert call_args[1]["recipients"] == ["test@example.com"]

    @patch("app.tasks.notification_tasks.DB_PATH", "test.db")
    @patch("app.tasks.notification_tasks._get_notification_service")
    @patch("app.tasks.notification_tasks._get_preferences_manager")
    @patch("app.tasks.notification_tasks._get_user_manager")
    def test_sends_failure_notification(
        self, mock_user_manager, mock_prefs_manager, mock_notification_service
    ):
        """Test that failure notification is sent when enabled."""
        from app.tasks.notification_tasks import send_sync_notification

        # Setup mocks
        mock_prefs = MagicMock()
        mock_prefs.should_notify.return_value = True
        mock_prefs_manager.return_value = mock_prefs

        mock_user = MagicMock()
        mock_user.email = "test@example.com"
        mock_user_manager.return_value.get_user_by_id.return_value = mock_user

        mock_service = MagicMock()
        mock_notification_service.return_value = mock_service

        # Call task
        send_sync_notification(
            None,
            user_id=1,
            job_id="job-123",
            status="failed",
            details={"error": "API rate limit exceeded"},
        )

        # Verify failure notification was sent
        mock_service.notify_task_failure.assert_called_once()
        call_args = mock_service.notify_task_failure.call_args
        assert "API rate limit exceeded" in call_args[1]["error"]


class TestSendPasswordResetEmail:
    """Tests for send_password_reset_email task."""

    @patch("app.tasks.notification_tasks._get_notification_service")
    def test_sends_password_reset_email(self, mock_notification_service):
        """Test that password reset email is sent."""
        from app.tasks.notification_tasks import send_password_reset_email

        mock_service = MagicMock()
        mock_service.send_email.return_value = True
        mock_notification_service.return_value = mock_service

        # Call task
        send_password_reset_email(
            None,
            user_id=1,
            token="reset-token-123",
            email="test@example.com",
        )

        # Verify email was sent
        mock_service.send_email.assert_called_once()
        call_args = mock_service.send_email.call_args
        assert call_args[1]["to"] == "test@example.com"
        assert "Reset" in call_args[1]["subject"]
        assert "reset-token-123" in call_args[1]["body"]


class TestSendWeeklyReports:
    """Tests for send_weekly_reports task."""

    @patch("app.tasks.notification_tasks.DB_PATH", "test.db")
    @patch("app.tasks.notification_tasks._get_notification_service")
    @patch("app.tasks.notification_tasks._get_preferences_manager")
    @patch("app.tasks.notification_tasks._get_user_manager")
    @patch("app.tasks.notification_tasks.ReportAggregator")
    def test_sends_reports_to_opted_in_users(
        self,
        mock_aggregator_class,
        mock_user_manager,
        mock_prefs_manager,
        mock_notification_service,
    ):
        """Test that weekly reports are sent to opted-in users."""
        from app.tasks.notification_tasks import send_weekly_reports

        # Setup mocks
        mock_prefs = MagicMock()
        mock_prefs.get_users_with_preference.return_value = [1, 2]
        mock_prefs.should_notify.return_value = True
        mock_prefs.get_preferences.return_value = {"email_enabled": True}
        mock_prefs.generate_unsubscribe_token.return_value = "unsub-token"
        mock_prefs_manager.return_value = mock_prefs

        mock_user1 = MagicMock()
        mock_user1.email = "user1@example.com"
        mock_user2 = MagicMock()
        mock_user2.email = "user2@example.com"
        mock_user_manager.return_value.get_user_by_id.side_effect = [
            mock_user1,
            mock_user2,
        ]

        mock_aggregator = MagicMock()
        mock_aggregator.get_weekly_summary.return_value = {
            "total_executions": 10,
            "successful": 8,
            "failed": 2,
            "success_rate": 80.0,
            "posts_synced": 50,
            "top_errors": [],
        }
        mock_aggregator_class.return_value = mock_aggregator

        mock_service = MagicMock()
        mock_service.send_email.return_value = True
        mock_notification_service.return_value = mock_service

        # Call task
        result = send_weekly_reports(None)

        # Verify reports were sent
        assert result["sent"] == 2
        assert result["failed"] == 0
        assert mock_service.send_email.call_count == 2

    @patch("app.tasks.notification_tasks.DB_PATH", "test.db")
    @patch("app.tasks.notification_tasks._get_notification_service")
    @patch("app.tasks.notification_tasks._get_preferences_manager")
    @patch("app.tasks.notification_tasks._get_user_manager")
    @patch("app.tasks.notification_tasks.ReportAggregator")
    def test_skips_users_with_no_activity(
        self,
        mock_aggregator_class,
        mock_user_manager,
        mock_prefs_manager,
        mock_notification_service,
    ):
        """Test that users with no activity are skipped."""
        from app.tasks.notification_tasks import send_weekly_reports

        # Setup mocks
        mock_prefs = MagicMock()
        mock_prefs.get_users_with_preference.return_value = [1]
        mock_prefs.should_notify.return_value = True
        mock_prefs_manager.return_value = mock_prefs

        mock_user = MagicMock()
        mock_user.email = "user@example.com"
        mock_user_manager.return_value.get_user_by_id.return_value = mock_user

        mock_aggregator = MagicMock()
        mock_aggregator.get_weekly_summary.return_value = {
            "total_executions": 0,  # No activity
            "successful": 0,
            "failed": 0,
            "success_rate": 0.0,
            "posts_synced": 0,
            "top_errors": [],
        }
        mock_aggregator_class.return_value = mock_aggregator

        mock_service = MagicMock()
        mock_notification_service.return_value = mock_service

        # Call task
        result = send_weekly_reports(None)

        # Verify no reports were sent
        assert result["sent"] == 0
        mock_service.send_email.assert_not_called()


class TestTemplateRendering:
    """Tests for email template rendering functions."""

    def test_password_reset_template_contains_url(self):
        """Test that password reset template contains the reset URL."""
        from app.tasks.notification_tasks import _render_password_reset_template

        html = _render_password_reset_template("https://example.com/reset?token=abc123")

        assert "https://example.com/reset?token=abc123" in html
        assert "Reset Password" in html
        assert "expires" in html.lower()

    def test_weekly_report_template_contains_stats(self):
        """Test that weekly report template contains statistics."""
        from app.tasks.notification_tasks import _render_weekly_report_template

        summary = {
            "total_executions": 100,
            "successful": 95,
            "failed": 5,
            "success_rate": 95.0,
            "posts_synced": 500,
            "top_errors": [{"error": "Rate limit", "count": 3}],
        }

        html = _render_weekly_report_template(summary, "https://example.com/unsub")

        assert "100" in html
        assert "95" in html
        assert "500" in html
        assert "Rate limit" in html
        assert "https://example.com/unsub" in html
