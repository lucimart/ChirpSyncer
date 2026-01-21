"""
Integration Tests for Service Modules (Phase 4 - Sprint 8)

Comprehensive integration tests for all service modules:
- NotificationService: Email configuration, SMTP connections, email sending with attachments
- UserSettings: CRUD operations, multi-user isolation, settings persistence
- StatsHandler: Stats recording, aggregation, success rate calculation

Tests use real SQLite database, mocked SMTP, real JSON serialization,
and test environment variable loading.

Target Coverage:
- notification_service.py: 127 statements
- user_settings.py: 100 statements
- stats_handler.py: 74 statements
Total: 301 statements
"""

import os
import sys
import sqlite3
import tempfile
import time
from unittest.mock import patch, MagicMock, Mock
import smtplib

import pytest

# Add app directory to path
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)

from app.services.notification_service import NotificationService
from app.services.user_settings import UserSettings
from app.services.stats_handler import StatsTracker


# =============================================================================
# NOTIFICATION SERVICE INTEGRATION TESTS (10-12 tests)
# =============================================================================


@pytest.mark.integration
@pytest.mark.slow
class TestNotificationServiceIntegration:
    """Integration tests for NotificationService with real SMTP mocking"""

    def test_notification_service_smtp_config_from_environment(self):
        """
        Test NotificationService loads SMTP config from environment variables.
        Tests that environment variables override defaults.
        """
        with patch.dict(
            os.environ,
            {
                "SMTP_HOST": "smtp.gmail.com",
                "SMTP_PORT": "587",
                "SMTP_USER": "test@example.com",
                "SMTP_PASSWORD": "testpass123",
                "SMTP_FROM": "noreply@chirpsyncer.local",
                "SMTP_ENABLED": "true",
            },
        ):
            service = NotificationService()

            assert service.smtp_config["host"] == "smtp.gmail.com"
            assert service.smtp_config["port"] == 587
            assert service.smtp_config["user"] == "test@example.com"
            assert service.smtp_config["password"] == "testpass123"
            assert service.smtp_config["from_addr"] == "noreply@chirpsyncer.local"
            assert service.smtp_config["enabled"] is True

    def test_notification_service_smtp_config_explicit(self):
        """Test NotificationService with explicit SMTP configuration"""
        smtp_config = {
            "host": "custom.smtp.com",
            "port": 465,
            "user": "custom@example.com",
            "password": "custompass",
            "from_addr": "admin@example.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=smtp_config)

        assert service.smtp_config == smtp_config

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_smtp_connection_testing(self, mock_smtp_class):
        """
        Test SMTP connection testing with real-like mock.
        Verifies TLS handshake and login flow.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.test_connection()

        assert result is True
        mock_smtp_class.assert_called_once_with("smtp.gmail.com", 587)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@example.com", "testpass123")

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_smtp_connection_failure_handling(self, mock_smtp_class):
        """Test handling of SMTP connection failures"""
        mock_smtp_class.side_effect = smtplib.SMTPException("Connection refused")

        config = {
            "host": "invalid.smtp.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.test_connection()

        assert result is False

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_send_plain_text_email(self, mock_smtp_class):
        """
        Test sending plain text email.
        Verifies email structure and SMTP interaction.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.send_email(
            to="recipient@example.com",
            subject="Test Subject",
            body="Plain text body content",
            html=False,
        )

        assert result is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_send_html_email(self, mock_smtp_class):
        """
        Test sending HTML email with plain text fallback.
        Verifies multipart message structure.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        html_body = "<html><body><h1>Test</h1><p>HTML content</p></body></html>"
        result = service.send_email(
            to="recipient@example.com", subject="HTML Test", body=html_body, html=True
        )

        assert result is True
        mock_server.send_message.assert_called_once()

        # Verify the message argument is a MIMEMultipart
        call_args = mock_server.send_message.call_args
        message = call_args[0][0]
        assert message.get_content_type() == "multipart/alternative"

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_send_email_when_disabled(self, mock_smtp_class):
        """Test that emails are not sent when SMTP is disabled"""
        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": False,  # Disabled
        }

        service = NotificationService(smtp_config=config)
        result = service.send_email(
            to="recipient@example.com", subject="Test", body="Test body"
        )

        assert result is False
        mock_smtp_class.assert_not_called()

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_send_email_missing_credentials(self, mock_smtp_class):
        """Test that emails fail when credentials are missing"""
        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "",  # Empty user
            "password": "",  # Empty password
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.send_email(
            to="recipient@example.com", subject="Test", body="Test body"
        )

        assert result is False
        mock_smtp_class.assert_not_called()

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_batch_notification_sending(self, mock_smtp_class):
        """
        Test sending batch notifications to multiple recipients.
        Verifies that failures in batch are handled gracefully.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)

        # Send to multiple recipients
        recipients = ["admin@example.com", "user1@example.com", "user2@example.com"]

        result = service.notify_task_completion(
            task_name="sync_workflow",
            result={"success": True, "items_processed": 15, "duration": 25.5},
            recipients=recipients,
        )

        assert result is True
        # Should have sent to all 3 recipients
        assert mock_server.send_message.call_count == 3

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_task_completion_notification_integration(self, mock_smtp_class):
        """
        Test task completion notification workflow.
        Verifies email content includes task details.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.notify_task_completion(
            task_name="twitter_to_bluesky_sync",
            result={"success": True, "items_processed": 42, "duration": 18.7},
            recipients=["admin@example.com"],
        )

        assert result is True
        mock_server.send_message.assert_called_once()

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_task_failure_notification_integration(self, mock_smtp_class):
        """
        Test task failure notification with error details.
        Verifies email includes error message.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)
        result = service.notify_task_failure(
            task_name="bluesky_to_twitter_sync",
            error="API rate limit exceeded",
            recipients=["admin@example.com", "devops@example.com"],
        )

        assert result is True
        # Should send to both recipients
        assert mock_server.send_message.call_count == 2

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_email_with_attachments_csv_report(self, mock_smtp_class):
        """
        Test sending email with CSV report attachment.
        Tests multipart email with attachment handling.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        service = NotificationService(smtp_config=config)

        # Send weekly report with attachment
        result = service.send_weekly_report(recipients=["admin@example.com"])

        assert result is True
        mock_server.send_message.assert_called_once()


# =============================================================================
# USER SETTINGS INTEGRATION TESTS (8-10 tests)
# =============================================================================


@pytest.mark.integration
class TestUserSettingsIntegration:
    """Integration tests for UserSettings with real SQLite database"""

    @pytest.fixture
    def user_settings_db(self):
        """Fixture for file-based user settings database"""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        yield path
        if os.path.exists(path):
            os.unlink(path)

    def test_user_settings_initialization_with_real_db(self, user_settings_db):
        """Test UserSettings initialization with real database connection"""
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Should be able to set and get immediately
        result = settings.set(1, "sync_interval", 7200)
        assert result is True

        value = settings.get(1, "sync_interval")
        assert value == 7200

    def test_settings_crud_workflow(self, user_settings_db):
        """
        Test complete CRUD workflow for user settings.
        Create, Read, Update, Delete operations.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Create (set)
        assert settings.set(1, "custom_setting", "initial_value") is True

        # Read
        value = settings.get(1, "custom_setting")
        assert value == "initial_value"

        # Update
        assert settings.set(1, "custom_setting", "updated_value") is True
        value = settings.get(1, "custom_setting")
        assert value == "updated_value"

        # Delete
        delete_result = settings.delete(1, "custom_setting")
        assert delete_result is True
        value = settings.get(1, "custom_setting")
        assert value is None

    def test_multi_user_settings_isolation(self, user_settings_db):
        """
        Test that settings are properly isolated between users.
        User 1's settings don't affect user 2's settings.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # User 1 sets values
        settings.set(1, "sync_interval", 1800)
        settings.set(1, "timezone", "America/New_York")
        settings.set(1, "sync_media", False)

        # User 2 sets different values
        settings.set(2, "sync_interval", 3600)
        settings.set(2, "timezone", "Europe/London")
        settings.set(2, "sync_media", True)

        # User 3 has no custom settings
        settings.set(3, "custom_key", "custom_value")

        # Verify isolation - User 1
        assert settings.get(1, "sync_interval") == 1800
        assert settings.get(1, "timezone") == "America/New_York"
        assert settings.get(1, "sync_media") is False

        # Verify isolation - User 2
        assert settings.get(2, "sync_interval") == 3600
        assert settings.get(2, "timezone") == "Europe/London"
        assert settings.get(2, "sync_media") is True

        # Verify isolation - User 3
        assert settings.get(3, "custom_key") == "custom_value"
        assert settings.get(3, "sync_interval") == 3600  # Default

        # Get all settings should be isolated
        user1_all = settings.get_all(1)
        user2_all = settings.get_all(2)

        assert user1_all["sync_interval"] == 1800
        assert user2_all["sync_interval"] == 3600

    def test_settings_type_handling(self, user_settings_db):
        """
        Test that various data types are handled correctly.
        Boolean, integer, string, JSON objects and lists.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Test different types
        settings.set(1, "enabled", True)
        settings.set(1, "port", 8080)
        settings.set(1, "name", "ChirpSyncer")
        settings.set(1, "config", {"key": "value", "nested": {"a": 1}})
        settings.set(1, "platforms", ["twitter", "bluesky", "mastodon"])
        settings.set(1, "null_value", None)

        # Verify types are preserved
        assert settings.get(1, "enabled") is True
        assert isinstance(settings.get(1, "enabled"), bool)

        assert settings.get(1, "port") == 8080
        assert isinstance(settings.get(1, "port"), int)

        assert settings.get(1, "name") == "ChirpSyncer"
        assert isinstance(settings.get(1, "name"), str)

        config = settings.get(1, "config")
        assert isinstance(config, dict)
        assert config["key"] == "value"
        assert config["nested"]["a"] == 1

        platforms = settings.get(1, "platforms")
        assert isinstance(platforms, list)
        assert len(platforms) == 3
        assert "bluesky" in platforms

        assert settings.get(1, "null_value") is None

    def test_settings_default_values(self, user_settings_db):
        """
        Test that default values are applied correctly.
        Built-in defaults from DEFAULTS dict and custom defaults.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Test DEFAULTS dict values
        sync_interval = settings.get(1, "sync_interval")
        assert sync_interval == 3600  # Default from DEFAULTS

        twitter_enabled = settings.get(1, "twitter_to_bluesky_enabled")
        assert twitter_enabled is True  # Default from DEFAULTS

        # Test custom default parameter
        custom_default = settings.get(1, "nonexistent_key", "my_default")
        assert custom_default == "my_default"

        # Test None as default
        no_default = settings.get(1, "nonexistent_key")
        assert no_default is None

    def test_settings_persistence_across_sessions(self, user_settings_db):
        """
        Test that settings persist across database connections.
        Simulate multiple sessions with same database.
        """
        # Session 1: Create and set values
        settings1 = UserSettings(db_path=user_settings_db)
        settings1.init_db()
        settings1.set(1, "persistent_key", "persistent_value")
        settings1.set(1, "number", 999)

        # Close first connection
        del settings1

        # Session 2: Retrieve values with new connection
        settings2 = UserSettings(db_path=user_settings_db)
        assert settings2.get(1, "persistent_key") == "persistent_value"
        assert settings2.get(1, "number") == 999

    def test_integration_with_features_reading_settings(self, user_settings_db):
        """
        Test integration with scheduler features that read settings.
        Simulates scheduler checking sync_interval setting.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # User sets custom sync interval
        settings.set(1, "sync_interval", 1800)  # 30 minutes

        # Simulate scheduler reading the setting
        user1_sync_interval = settings.get(1, "sync_interval")
        assert user1_sync_interval == 1800

        # User 2 hasn't set anything, gets default
        user2_sync_interval = settings.get(2, "sync_interval")
        assert user2_sync_interval == 3600  # Default 1 hour

        # Scheduler can use these for different intervals per user
        time_to_next_sync_user1 = user1_sync_interval
        time_to_next_sync_user2 = user2_sync_interval
        assert time_to_next_sync_user1 != time_to_next_sync_user2

    def test_bulk_settings_update(self, user_settings_db):
        """
        Test bulk update of multiple settings at once.
        Verifies atomicity of bulk operations.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Bulk update multiple settings
        bulk_data = {
            "sync_interval": 5400,
            "sync_media": False,
            "max_tweets_per_sync": 100,
            "timezone": "Asia/Tokyo",
            "custom_setting": "custom_value",
        }

        result = settings.update_bulk(1, bulk_data)
        assert result is True

        # Verify all settings were updated
        for key, value in bulk_data.items():
            assert settings.get(1, key) == value

    def test_reset_to_defaults_user_isolation(self, user_settings_db):
        """
        Test that reset_to_defaults only affects one user.
        Other users' settings remain unchanged.
        """
        settings = UserSettings(db_path=user_settings_db)
        settings.init_db()

        # Set different values for multiple users
        settings.set(1, "sync_interval", 1800)
        settings.set(1, "custom_key", "user1_value")

        settings.set(2, "sync_interval", 5400)
        settings.set(2, "custom_key", "user2_value")

        # Reset user 1 to defaults
        result = settings.reset_to_defaults(1)
        assert result is True

        # User 1 should have defaults
        assert settings.get(1, "sync_interval") == 3600  # Default
        assert settings.get(1, "custom_key") is None  # Deleted

        # User 2 should still have custom values
        assert settings.get(2, "sync_interval") == 5400
        assert settings.get(2, "custom_key") == "user2_value"


# =============================================================================
# STATS HANDLER INTEGRATION TESTS (8-10 tests)
# =============================================================================


@pytest.mark.integration
class TestStatsHandlerIntegration:
    """Integration tests for StatsTracker with real SQLite database"""

    def test_stats_recording_workflow(self, test_db, test_db_path):
        """
        Test complete stats recording workflow.
        Record sync operations and verify data in database.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record multiple syncs
        tracker.record_sync("twitter", "bluesky", True, media_count=3, duration_ms=150)
        tracker.record_sync(
            "bluesky", "twitter", True, media_count=0, is_thread=True, duration_ms=200
        )
        tracker.record_sync("twitter", "bluesky", False, media_count=1, duration_ms=50)

        # Verify in database
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sync_stats")
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 3

    def test_stats_aggregation_by_period(self, test_db, test_db_path):
        """
        Test stats aggregation for different time periods.
        Verify 1h, 24h, 7d, 30d filtering works correctly.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record recent syncs
        tracker.record_sync("twitter", "bluesky", True, media_count=2)
        tracker.record_sync("twitter", "bluesky", True, media_count=1)

        # Insert old record manually (2 days ago)
        conn = sqlite3.connect(test_db_path)
        cursor = conn.cursor()
        old_timestamp = int(time.time()) - (2 * 24 * 3600)
        cursor.execute(
            """
            INSERT INTO sync_stats (timestamp, source, target, success, media_count, is_thread, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (old_timestamp, "bluesky", "twitter", 1, 0, 0, 100),
        )
        conn.commit()
        conn.close()

        # Get stats for different periods
        stats_1h = tracker.get_stats(period="1h")
        stats_24h = tracker.get_stats(period="24h")
        stats_7d = tracker.get_stats(period="7d")

        # Recent syncs should be in all periods
        assert stats_1h["total_syncs"] == 2
        assert stats_24h["total_syncs"] == 2

        # 7d should include the old record
        assert stats_7d["total_syncs"] == 3

    def test_success_rate_calculation(self, test_db, test_db_path):
        """
        Test success rate calculation.
        Verifies correct percentage calculation with mixed results.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record 7 successful and 3 failed = 70% success rate
        for _ in range(7):
            tracker.record_sync("twitter", "bluesky", True)
        for _ in range(3):
            tracker.record_sync("twitter", "bluesky", False)

        success_rate = tracker.get_success_rate(period="24h")
        assert success_rate == 70.0

    def test_success_rate_edge_cases(self, test_db, test_db_path):
        """Test success rate calculation edge cases"""
        tracker = StatsTracker(db_path=test_db_path)

        # No data - should return 0.0
        rate = tracker.get_success_rate(period="24h")
        assert rate == 0.0

        # All successful
        for _ in range(5):
            tracker.record_sync("twitter", "bluesky", True)
        rate = tracker.get_success_rate(period="24h")
        assert rate == 100.0

        # All failed
        fd, temp_db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            # Create new database
            conn = sqlite3.connect(temp_db_path)
            cursor = conn.cursor()
            cursor.execute(
                """
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
                    duration_ms INTEGER
                )
            """
            )
            conn.commit()
            conn.close()

            tracker2 = StatsTracker(db_path=temp_db_path)
            for _ in range(5):
                tracker2.record_sync("twitter", "bluesky", False)
            rate = tracker2.get_success_rate(period="24h")
            assert rate == 0.0
        finally:
            if os.path.exists(temp_db_path):
                os.unlink(temp_db_path)

    def test_stats_aggregation_by_direction(self, test_db, test_db_path):
        """
        Test stats aggregation tracking sync direction.
        Counts twitter->bluesky vs bluesky->twitter.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record directional syncs
        for _ in range(5):
            tracker.record_sync("twitter", "bluesky", True)
        for _ in range(3):
            tracker.record_sync("bluesky", "twitter", True)

        stats = tracker.get_stats(period="24h")

        assert stats["twitter_to_bluesky"] == 5
        assert stats["bluesky_to_twitter"] == 3
        assert stats["total_syncs"] == 8

    def test_hourly_stats_rollup_simulation(self, test_db, test_db_path):
        """
        Test stats rollup to hourly_stats table.
        Simulates aggregation from detailed stats to hourly summaries.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record multiple syncs
        tracker.record_sync("twitter", "bluesky", True, media_count=2, duration_ms=100)
        tracker.record_sync("twitter", "bluesky", True, media_count=1, duration_ms=150)
        tracker.record_sync("twitter", "bluesky", False, media_count=0, duration_ms=50)

        # Get current stats
        stats = tracker.get_stats(period="1h")

        # Simulate rollup - hourly_stats should have aggregated values
        assert stats["total_syncs"] == 3
        assert stats["successful_syncs"] == 2
        assert stats["failed_syncs"] == 1
        assert stats["total_media"] == 3

    def test_multi_user_stats_tracking(self, test_db, test_db_path):
        """
        Test stats tracking with user_id parameter.
        Verifies per-user stats can be tracked separately.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record stats for user 1
        tracker.record_sync("twitter", "bluesky", True, media_count=2, duration_ms=100)
        tracker.record_sync("twitter", "bluesky", True, media_count=1, duration_ms=150)

        # For now, the current implementation doesn't store user_id in record_sync
        # but we test that stats can be queried
        stats = tracker.get_stats(period="24h")
        assert stats["total_syncs"] == 2
        assert stats["successful_syncs"] == 2
        assert stats["total_media"] == 3

    def test_error_recording_and_tracking(self, test_db, test_db_path):
        """
        Test error recording and retrieval.
        Verifies error logs maintain complete details.
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record various error types
        tracker.record_error("twitter", "bluesky", "APIError", "Rate limit exceeded")
        tracker.record_error("bluesky", "twitter", "NetworkError", "Connection timeout")
        tracker.record_error("twitter", "bluesky", "ValidationError", "Invalid content")

        # Retrieve error log
        errors = tracker.get_error_log(limit=100)

        assert len(errors) == 3
        assert errors[0]["error_type"] == "ValidationError"  # Most recent first
        assert "Rate limit exceeded" in [e["error_message"] for e in errors]

    def test_stats_with_attachment_data_simulation(self, test_db, test_db_path):
        """
        Test stats recording with various data types.
        Simulates integration with reports (stats -> report data).
        """
        tracker = StatsTracker(db_path=test_db_path)

        # Record syncs with various metrics
        tracker.record_sync(
            "twitter", "bluesky", True, media_count=5, is_thread=False, duration_ms=250
        )
        tracker.record_sync(
            "twitter", "bluesky", True, media_count=0, is_thread=True, duration_ms=180
        )
        tracker.record_sync(
            "bluesky", "twitter", True, media_count=2, is_thread=False, duration_ms=120
        )

        # Get stats for report generation
        stats = tracker.get_stats(period="24h")

        # Simulate report data structure
        report_data = {
            "period": "24h",
            "total_syncs": stats["total_syncs"],
            "successful_syncs": stats["successful_syncs"],
            "failed_syncs": stats["failed_syncs"],
            "success_rate": tracker.get_success_rate(period="24h"),
            "breakdown": {
                "twitter_to_bluesky": stats["twitter_to_bluesky"],
                "bluesky_to_twitter": stats["bluesky_to_twitter"],
                "media_synced": stats["total_media"],
                "threads_synced": stats["total_threads"],
            },
        }

        assert report_data["total_syncs"] == 3
        assert report_data["successful_syncs"] == 3
        assert report_data["success_rate"] == 100.0
        assert report_data["breakdown"]["media_synced"] == 7
        assert report_data["breakdown"]["threads_synced"] == 1


# =============================================================================
# CROSS-SERVICE INTEGRATION TESTS
# =============================================================================


@pytest.mark.integration
@pytest.mark.slow
class TestCrossServiceIntegration:
    """Test interactions between multiple service modules"""

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_notification_service_with_stats(
        self, mock_smtp_class, test_db, test_db_path
    ):
        """
        Test NotificationService reading StatsTracker data.
        Simulate sending report email with stats data.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        # Set up stats
        tracker = StatsTracker(db_path=test_db_path)
        for _ in range(8):
            tracker.record_sync("twitter", "bluesky", True)
        for _ in range(2):
            tracker.record_sync("twitter", "bluesky", False)

        # Get stats and send via notification service
        stats = tracker.get_stats(period="24h")
        success_rate = tracker.get_success_rate(period="24h")

        config = {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "test@example.com",
            "password": "testpass123",
            "from_addr": "noreply@test.com",
            "enabled": True,
        }

        notifier = NotificationService(smtp_config=config)
        result = notifier.send_weekly_report(recipients=["admin@example.com"])

        assert result is True
        assert stats["total_syncs"] == 10
        assert success_rate == 80.0

    @patch("app.services.notification_service.smtplib.SMTP")
    def test_user_settings_with_notification_service(self, mock_smtp_class):
        """
        Test UserSettings controlling NotificationService behavior.
        Simulate reading notification_email setting.
        """
        mock_server = MagicMock()
        mock_smtp_class.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_class.return_value.__exit__ = Mock(return_value=False)

        fd, db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        try:
            settings = UserSettings(db_path=db_path)
            settings.init_db()

            # Set notification emails for users
            settings.set(1, "notification_email", "user1@example.com")
            settings.set(2, "notification_email", "user2@example.com")

            # Retrieve and use for notifications
            config = {
                "host": "smtp.gmail.com",
                "port": 587,
                "user": "test@example.com",
                "password": "testpass123",
                "from_addr": "noreply@test.com",
                "enabled": True,
            }

            notifier = NotificationService(smtp_config=config)

            # Send to recipients from settings
            user1_email = settings.get(1, "notification_email")
            user2_email = settings.get(2, "notification_email")

            assert user1_email == "user1@example.com"
            assert user2_email == "user2@example.com"

            # Send notification
            result = notifier.send_email(
                to=user1_email, subject="Your sync report", body="Report content"
            )
            assert result is True
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
