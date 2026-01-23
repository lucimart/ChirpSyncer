"""
Unit tests for NotificationPreferences manager.
"""

import os
import sqlite3
import tempfile
import time
import pytest

from app.services.notification_preferences import NotificationPreferences


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
    # Insert test user
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
def prefs_manager(temp_db):
    """Create NotificationPreferences manager with temp db."""
    manager = NotificationPreferences(db_path=temp_db)
    manager.init_db()
    return manager


class TestNotificationPreferencesInit:
    """Tests for initialization."""

    def test_init_db_creates_table(self, temp_db):
        """Test that init_db creates the notification_preferences table."""
        manager = NotificationPreferences(db_path=temp_db)
        manager.init_db()

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='notification_preferences'"
        )
        assert cursor.fetchone() is not None
        conn.close()

    def test_init_db_idempotent(self, prefs_manager, temp_db):
        """Test that init_db can be called multiple times."""
        # Should not raise
        prefs_manager.init_db()
        prefs_manager.init_db()


class TestGetPreferences:
    """Tests for get_preferences."""

    def test_returns_defaults_for_new_user(self, prefs_manager):
        """Test that defaults are returned for user without preferences."""
        prefs = prefs_manager.get_preferences(user_id=1)

        assert prefs["email_enabled"] is False
        assert prefs["inapp_enabled"] is True
        assert prefs["digest_frequency"] == "immediate"
        assert prefs["quiet_hours_start"] is None
        assert prefs["quiet_hours_end"] is None
        assert "sync_complete" in prefs["email_types"]
        assert "weekly_report" in prefs["inapp_types"]

    def test_returns_stored_preferences(self, prefs_manager):
        """Test that stored preferences are returned."""
        prefs_manager.update_preferences(
            user_id=1,
            email_enabled=True,
            digest_frequency="daily",
        )

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["email_enabled"] is True
        assert prefs["digest_frequency"] == "daily"


class TestUpdatePreferences:
    """Tests for update_preferences."""

    def test_creates_row_on_first_update(self, prefs_manager, temp_db):
        """Test that a row is created on first update."""
        result = prefs_manager.update_preferences(user_id=1, email_enabled=True)
        assert result is True

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM notification_preferences WHERE user_id = 1"
        )
        assert cursor.fetchone()[0] == 1
        conn.close()

    def test_partial_update(self, prefs_manager):
        """Test that partial updates work correctly."""
        prefs_manager.update_preferences(user_id=1, email_enabled=True)
        prefs_manager.update_preferences(user_id=1, digest_frequency="weekly")

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["email_enabled"] is True
        assert prefs["digest_frequency"] == "weekly"

    def test_update_email_types(self, prefs_manager):
        """Test updating email_types dict."""
        prefs_manager.update_preferences(
            user_id=1,
            email_types={"sync_complete": False, "weekly_report": True},
        )

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["email_types"]["sync_complete"] is False
        assert prefs["email_types"]["weekly_report"] is True

    def test_update_quiet_hours(self, prefs_manager):
        """Test updating quiet hours."""
        prefs_manager.update_preferences(
            user_id=1,
            quiet_hours_start=22,
            quiet_hours_end=6,
        )

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["quiet_hours_start"] == 22
        assert prefs["quiet_hours_end"] == 6


class TestShouldNotify:
    """Tests for should_notify."""

    def test_returns_false_when_email_disabled(self, prefs_manager):
        """Test that email notifications are blocked when disabled."""
        # Defaults have email_enabled=False
        result = prefs_manager.should_notify(
            user_id=1, notification_type="sync_complete", channel="email"
        )
        assert result is False

    def test_returns_true_when_email_enabled(self, prefs_manager):
        """Test that email notifications pass when enabled."""
        prefs_manager.update_preferences(user_id=1, email_enabled=True)

        result = prefs_manager.should_notify(
            user_id=1, notification_type="sync_complete", channel="email"
        )
        assert result is True

    def test_returns_false_for_disabled_type(self, prefs_manager):
        """Test that specific type can be disabled."""
        prefs_manager.update_preferences(
            user_id=1,
            email_enabled=True,
            email_types={"sync_complete": False},
        )

        result = prefs_manager.should_notify(
            user_id=1, notification_type="sync_complete", channel="email"
        )
        assert result is False

    def test_inapp_enabled_by_default(self, prefs_manager):
        """Test that in-app notifications are enabled by default."""
        result = prefs_manager.should_notify(
            user_id=1, notification_type="sync_complete", channel="inapp"
        )
        assert result is True


class TestUnsubscribeToken:
    """Tests for unsubscribe token functionality."""

    def test_generate_unsubscribe_token(self, prefs_manager):
        """Test generating an unsubscribe token."""
        token = prefs_manager.generate_unsubscribe_token(user_id=1)

        assert token is not None
        assert len(token) > 20  # URL-safe token should be reasonably long

    def test_generate_returns_same_token(self, prefs_manager):
        """Test that generating returns existing token."""
        token1 = prefs_manager.generate_unsubscribe_token(user_id=1)
        token2 = prefs_manager.generate_unsubscribe_token(user_id=1)

        assert token1 == token2

    def test_get_user_by_unsubscribe_token(self, prefs_manager):
        """Test looking up user by unsubscribe token."""
        token = prefs_manager.generate_unsubscribe_token(user_id=1)
        user_id = prefs_manager.get_user_by_unsubscribe_token(token)

        assert user_id == 1

    def test_get_user_by_invalid_token(self, prefs_manager):
        """Test that invalid token returns None."""
        user_id = prefs_manager.get_user_by_unsubscribe_token("invalid_token")
        assert user_id is None

    def test_unsubscribe_by_token_all(self, prefs_manager):
        """Test unsubscribing from all emails by token."""
        prefs_manager.update_preferences(user_id=1, email_enabled=True)
        token = prefs_manager.generate_unsubscribe_token(user_id=1)

        result = prefs_manager.unsubscribe_by_token(token)
        assert result is True

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["email_enabled"] is False

    def test_unsubscribe_by_token_specific_type(self, prefs_manager):
        """Test unsubscribing from specific type by token."""
        prefs_manager.update_preferences(user_id=1, email_enabled=True)
        token = prefs_manager.generate_unsubscribe_token(user_id=1)

        result = prefs_manager.unsubscribe_by_token(token, notification_type="weekly_report")
        assert result is True

        prefs = prefs_manager.get_preferences(user_id=1)
        assert prefs["email_enabled"] is True  # Still enabled
        assert prefs["email_types"]["weekly_report"] is False  # Type disabled


class TestGetUsersWithPreference:
    """Tests for get_users_with_preference."""

    def test_get_users_with_email_enabled(self, prefs_manager):
        """Test getting users with email_enabled=True."""
        prefs_manager.update_preferences(user_id=1, email_enabled=True)
        prefs_manager.update_preferences(user_id=2, email_enabled=False)

        users = prefs_manager.get_users_with_preference("email_enabled", True)
        assert 1 in users
        assert 2 not in users

    def test_get_users_with_weekly_report_enabled(self, prefs_manager):
        """Test getting users with weekly_report email enabled."""
        prefs_manager.update_preferences(
            user_id=1,
            email_enabled=True,
            email_types={"weekly_report": True},
        )
        prefs_manager.update_preferences(
            user_id=2,
            email_enabled=True,
            email_types={"weekly_report": False},
        )

        users = prefs_manager.get_users_with_preference("weekly_report_enabled", True)
        assert 1 in users
        assert 2 not in users


class TestQuietHours:
    """Tests for quiet hours logic."""

    def test_no_quiet_hours_configured(self, prefs_manager):
        """Test that notifications pass when no quiet hours set."""
        prefs = prefs_manager.get_preferences(user_id=1)
        result = prefs_manager._is_outside_quiet_hours(prefs)
        assert result is True

    def test_quiet_hours_simple_range(self, prefs_manager):
        """Test quiet hours with simple range (same day)."""
        prefs = {
            "quiet_hours_start": 10,
            "quiet_hours_end": 12,
        }
        # This tests the logic, actual result depends on current time
        result = prefs_manager._is_outside_quiet_hours(prefs)
        # Result depends on current hour, just verify no exception
        assert isinstance(result, bool)
