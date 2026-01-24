"""
Unit tests for Notifications Hub.

TDD tests for:
- Notification model creation
- NotificationDispatcher multi-channel dispatch
- Telegram channel
- Discord channel
- Quiet hours respect
- Preferences updates
"""

import json
import os
import sqlite3
import tempfile
import time
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.features.notifications.models import (
    Notification,
    NotificationCategory,
    NotificationPriority,
    init_notifications_hub_db,
)
from app.features.notifications.dispatcher import NotificationDispatcher
from app.features.notifications.channels.telegram import TelegramChannel
from app.features.notifications.channels.discord import DiscordChannel


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    # Create users table for foreign key
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
        INSERT INTO users (id, username, email, password_hash, is_admin, is_active, created_at)
        VALUES (1, 'testuser', 'test@example.com', 'hash', 0, 1, ?)
        """,
        (int(time.time()),),
    )
    conn.execute(
        """
        INSERT INTO users (id, username, email, password_hash, is_admin, is_active, created_at)
        VALUES (2, 'testuser2', 'test2@example.com', 'hash', 0, 1, ?)
        """,
        (int(time.time()),),
    )
    conn.commit()
    conn.close()

    yield path

    os.unlink(path)


@pytest.fixture
def db_with_tables(temp_db):
    """Create database with notifications hub tables."""
    init_notifications_hub_db(temp_db)
    return temp_db


@pytest.fixture
def dispatcher(db_with_tables):
    """Create NotificationDispatcher with temp db."""
    return NotificationDispatcher(db_path=db_with_tables)


# =============================================================================
# Model Tests
# =============================================================================


class TestNotificationModel:
    """Tests for Notification model."""

    def test_create_notification(self, db_with_tables):
        """Test creating a notification with all fields."""
        notification = Notification(
            user_id=1,
            type="sync_complete",
            category=NotificationCategory.SYNC,
            title="Sync Completed",
            body="Your sync has completed successfully.",
            data={"posts_synced": 10, "platform": "twitter"},
            priority=NotificationPriority.NORMAL,
        )

        notification.save(db_with_tables)

        assert notification.id is not None
        assert notification.user_id == 1
        assert notification.type == "sync_complete"
        assert notification.category == NotificationCategory.SYNC
        assert notification.title == "Sync Completed"
        assert notification.body == "Your sync has completed successfully."
        assert notification.data == {"posts_synced": 10, "platform": "twitter"}
        assert notification.priority == NotificationPriority.NORMAL
        assert notification.is_read is False
        assert notification.created_at is not None

    def test_create_notification_with_defaults(self, db_with_tables):
        """Test creating notification with default values."""
        notification = Notification(
            user_id=1,
            type="info",
            category=NotificationCategory.SYSTEM,
            title="Test",
            body="Test body",
        )

        notification.save(db_with_tables)

        assert notification.priority == NotificationPriority.NORMAL
        assert notification.data == {}
        assert notification.is_read is False

    def test_mark_as_read(self, db_with_tables):
        """Test marking notification as read."""
        notification = Notification(
            user_id=1,
            type="alert",
            category=NotificationCategory.ALERT,
            title="Alert",
            body="Alert body",
        )
        notification.save(db_with_tables)

        notification.mark_as_read(db_with_tables)

        # Reload from DB
        loaded = Notification.get_by_id(db_with_tables, notification.id)
        assert loaded.is_read is True

    def test_get_user_notifications(self, db_with_tables):
        """Test fetching user notifications."""
        # Create notifications for different users
        n1 = Notification(
            user_id=1,
            type="sync_complete",
            category=NotificationCategory.SYNC,
            title="Sync 1",
            body="Body 1",
        )
        n1.save(db_with_tables)

        n2 = Notification(
            user_id=1,
            type="alert",
            category=NotificationCategory.ALERT,
            title="Alert 1",
            body="Body 2",
        )
        n2.save(db_with_tables)

        n3 = Notification(
            user_id=2,
            type="sync_complete",
            category=NotificationCategory.SYNC,
            title="Sync for user 2",
            body="Body 3",
        )
        n3.save(db_with_tables)

        # Get notifications for user 1
        user_notifications = Notification.get_for_user(db_with_tables, user_id=1)

        assert len(user_notifications) == 2
        assert all(n.user_id == 1 for n in user_notifications)

    def test_notification_priority_values(self):
        """Test notification priority enum values."""
        assert NotificationPriority.LOW == 1
        assert NotificationPriority.NORMAL == 2
        assert NotificationPriority.HIGH == 3
        assert NotificationPriority.URGENT == 4
        assert NotificationPriority.CRITICAL == 5

    def test_notification_categories(self):
        """Test notification category enum values."""
        assert NotificationCategory.SYNC == "sync"
        assert NotificationCategory.ALERT == "alert"
        assert NotificationCategory.SYSTEM == "system"
        assert NotificationCategory.ENGAGEMENT == "engagement"
        assert NotificationCategory.SECURITY == "security"


# =============================================================================
# Dispatcher Tests
# =============================================================================


class TestNotificationDispatcher:
    """Tests for NotificationDispatcher."""

    def test_dispatcher_creates_notification(self, dispatcher, db_with_tables):
        """Test dispatcher creates in-app notification."""
        result = dispatcher.send(
            user_id=1,
            type="sync_complete",
            category=NotificationCategory.SYNC,
            title="Sync Done",
            body="Your sync completed",
        )

        assert result["success"] is True
        assert "notification_id" in result

        # Verify notification was created
        notification = Notification.get_by_id(db_with_tables, result["notification_id"])
        assert notification is not None
        assert notification.title == "Sync Done"

    def test_dispatcher_respects_quiet_hours(self, dispatcher, db_with_tables):
        """Test dispatcher respects quiet hours for external channels."""
        # Set quiet hours to current hour
        current_hour = datetime.now().hour
        dispatcher.set_user_quiet_hours(
            user_id=1,
            start_hour=current_hour,
            end_hour=(current_hour + 2) % 24,
        )

        # In-app should still work
        result = dispatcher.send(
            user_id=1,
            type="sync_complete",
            category=NotificationCategory.SYNC,
            title="Test",
            body="Test body",
        )

        assert result["success"] is True
        # External channels should be skipped due to quiet hours
        assert result.get("channels", {}).get("telegram", {}).get("skipped") is True
        assert result.get("channels", {}).get("discord", {}).get("skipped") is True

    def test_dispatcher_sends_to_enabled_channels(self, dispatcher, db_with_tables):
        """Test dispatcher sends to enabled channels only."""
        # Enable only Telegram
        dispatcher.update_user_channel_preferences(
            user_id=1,
            telegram_enabled=True,
            telegram_chat_id="123456",
            discord_enabled=False,
        )

        with patch.object(
            dispatcher.telegram_channel, "send", return_value=True
        ) as mock_telegram:
            result = dispatcher.send(
                user_id=1,
                type="alert",
                category=NotificationCategory.ALERT,
                title="Alert",
                body="Alert body",
            )

        assert result["success"] is True
        mock_telegram.assert_called_once()

    def test_check_quiet_hours_true_outside(self, dispatcher, db_with_tables):
        """Test quiet hours check returns true when outside quiet hours."""
        # Set quiet hours to a different time
        current_hour = datetime.now().hour
        start = (current_hour + 5) % 24
        end = (current_hour + 8) % 24

        dispatcher.set_user_quiet_hours(user_id=1, start_hour=start, end_hour=end)

        result = dispatcher.is_outside_quiet_hours(user_id=1)
        assert result is True

    def test_check_quiet_hours_false_inside(self, dispatcher, db_with_tables):
        """Test quiet hours check returns false when inside quiet hours."""
        current_hour = datetime.now().hour
        start = current_hour
        end = (current_hour + 2) % 24

        dispatcher.set_user_quiet_hours(user_id=1, start_hour=start, end_hour=end)

        result = dispatcher.is_outside_quiet_hours(user_id=1)
        assert result is False


# =============================================================================
# Channel Tests - Telegram
# =============================================================================


class TestTelegramChannel:
    """Tests for Telegram notification channel."""

    def test_telegram_send_success(self):
        """Test successful Telegram message send."""
        channel = TelegramChannel(bot_token="test_token")

        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"ok": True, "result": {"message_id": 123}},
            )

            result = channel.send(
                chat_id="123456",
                title="Test Title",
                body="Test body message",
            )

        assert result["success"] is True
        assert result["message_id"] == 123
        mock_post.assert_called_once()

    def test_telegram_send_failure(self):
        """Test Telegram message send failure."""
        channel = TelegramChannel(bot_token="test_token")

        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=400,
                json=lambda: {"ok": False, "description": "Bad Request"},
            )

            result = channel.send(
                chat_id="123456",
                title="Test Title",
                body="Test body",
            )

        assert result["success"] is False
        assert "error" in result

    def test_telegram_formats_message(self):
        """Test Telegram message formatting."""
        channel = TelegramChannel(bot_token="test_token")

        message = channel.format_message(
            title="Sync Completed",
            body="10 posts synced from Twitter to Bluesky",
            data={"posts_synced": 10},
        )

        assert "Sync Completed" in message
        assert "10 posts synced" in message

    def test_telegram_handles_network_error(self):
        """Test Telegram handles network errors gracefully."""
        channel = TelegramChannel(bot_token="test_token")

        with patch("requests.post") as mock_post:
            mock_post.side_effect = Exception("Network error")

            result = channel.send(
                chat_id="123456",
                title="Test",
                body="Body",
            )

        assert result["success"] is False
        assert "Network error" in result["error"]


# =============================================================================
# Channel Tests - Discord
# =============================================================================


class TestDiscordChannel:
    """Tests for Discord notification channel."""

    def test_discord_send_webhook_success(self):
        """Test successful Discord webhook send."""
        channel = DiscordChannel()

        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=204)

            result = channel.send(
                webhook_url="https://discord.com/api/webhooks/123/abc",
                title="Test Alert",
                body="Alert body message",
            )

        assert result["success"] is True
        mock_post.assert_called_once()

    def test_discord_send_failure(self):
        """Test Discord webhook send failure."""
        channel = DiscordChannel()

        with patch("requests.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=429,
                json=lambda: {"retry_after": 5},
            )

            result = channel.send(
                webhook_url="https://discord.com/api/webhooks/123/abc",
                title="Test",
                body="Body",
            )

        assert result["success"] is False
        assert "rate_limited" in result or "error" in result

    def test_discord_creates_embed(self):
        """Test Discord embed creation."""
        channel = DiscordChannel()

        embed = channel.create_embed(
            title="Sync Completed",
            body="Your sync has finished",
            category=NotificationCategory.SYNC,
            priority=NotificationPriority.NORMAL,
        )

        assert embed["title"] == "Sync Completed"
        assert embed["description"] == "Your sync has finished"
        assert "color" in embed
        assert "timestamp" in embed

    def test_discord_validates_webhook_url(self):
        """Test Discord validates webhook URL format."""
        channel = DiscordChannel()

        result = channel.send(
            webhook_url="invalid-url",
            title="Test",
            body="Body",
        )

        assert result["success"] is False
        assert "invalid" in result["error"].lower()


# =============================================================================
# Integration Tests
# =============================================================================


class TestNotificationHubIntegration:
    """Integration tests for the notification hub."""

    def test_full_notification_flow(self, dispatcher, db_with_tables):
        """Test full notification flow from send to delivery."""
        # Enable channels
        dispatcher.update_user_channel_preferences(
            user_id=1,
            telegram_enabled=True,
            telegram_chat_id="123456",
            discord_enabled=True,
            discord_webhook_url="https://discord.com/api/webhooks/123/abc",
        )

        with patch.object(
            dispatcher.telegram_channel, "send", return_value={"success": True}
        ):
            with patch.object(
                dispatcher.discord_channel, "send", return_value={"success": True}
            ):
                result = dispatcher.send(
                    user_id=1,
                    type="sync_complete",
                    category=NotificationCategory.SYNC,
                    title="Sync Complete",
                    body="Successfully synced 15 posts",
                    data={"posts_synced": 15},
                    priority=NotificationPriority.NORMAL,
                )

        assert result["success"] is True
        assert result["channels"]["inapp"]["success"] is True
        assert result["channels"]["telegram"]["success"] is True
        assert result["channels"]["discord"]["success"] is True

    def test_preferences_update(self, dispatcher, db_with_tables):
        """Test updating notification preferences."""
        result = dispatcher.update_user_channel_preferences(
            user_id=1,
            in_app_enabled=True,
            telegram_enabled=True,
            telegram_chat_id="999888",
            discord_enabled=False,
            discord_webhook_url=None,
            email_digest_enabled=True,
            email_digest_frequency="daily",
        )

        assert result is True

        # Verify preferences were saved
        prefs = dispatcher.get_user_channel_preferences(user_id=1)
        assert prefs["in_app_enabled"] is True
        assert prefs["telegram_enabled"] is True
        assert prefs["telegram_chat_id"] == "999888"
        assert prefs["discord_enabled"] is False
        assert prefs["email_digest_frequency"] == "daily"
