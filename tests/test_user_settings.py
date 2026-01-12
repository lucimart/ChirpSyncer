"""
Tests for UserSettings (Sprint 6 - CONFIG-003)

Comprehensive tests for per-user settings management with JSON serialization.
Tests cover core operations, bulk operations, user isolation, and edge cases.
"""
import pytest
import time
import os
import tempfile
import json
import sqlite3
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.user_settings import UserSettings


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def user_settings(temp_db):
    """Create UserSettings instance with test database"""
    settings = UserSettings(db_path=temp_db)
    settings.init_db()
    return settings


@pytest.fixture
def user_settings_with_users(temp_db):
    """Create UserSettings instance with test database and user table"""
    # Create users table for foreign key constraint
    conn = sqlite3.connect(temp_db)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at INTEGER NOT NULL
        )
    ''')
    # Create test users
    cursor.execute('INSERT INTO users (id, username, email, created_at) VALUES (1, "user1", "user1@test.com", ?)', (int(time.time()),))
    cursor.execute('INSERT INTO users (id, username, email, created_at) VALUES (2, "user2", "user2@test.com", ?)', (int(time.time()),))
    conn.commit()
    conn.close()

    settings = UserSettings(db_path=temp_db)
    settings.init_db()
    return settings


class TestCoreOperations:
    """Tests for core get/set operations (Priority 1)"""

    def test_get_existing_value(self, user_settings):
        """Test retrieving an existing setting value"""
        user_settings.set(1, 'sync_interval', 7200)

        value = user_settings.get(1, 'sync_interval')
        assert value == 7200

    def test_get_missing_value_returns_default(self, user_settings):
        """Test retrieving missing value returns provided default"""
        value = user_settings.get(1, 'nonexistent_key', 'custom_default')
        assert value == 'custom_default'

    def test_get_fallback_to_defaults(self, user_settings):
        """Test retrieving missing value falls back to DEFAULTS dict"""
        # sync_interval is in DEFAULTS with value 3600
        value = user_settings.get(1, 'sync_interval')
        assert value == 3600
        assert value == UserSettings.DEFAULTS['sync_interval']

    def test_get_missing_not_in_defaults_returns_none(self, user_settings):
        """Test retrieving missing value not in DEFAULTS returns None"""
        value = user_settings.get(1, 'custom_key')
        assert value is None

    def test_set_string_value(self, user_settings):
        """Test setting and retrieving string value"""
        result = user_settings.set(1, 'timezone', 'America/New_York')
        assert result is True

        value = user_settings.get(1, 'timezone')
        assert value == 'America/New_York'
        assert isinstance(value, str)

    def test_set_integer_value(self, user_settings):
        """Test setting and retrieving integer value"""
        result = user_settings.set(1, 'max_tweets_per_sync', 100)
        assert result is True

        value = user_settings.get(1, 'max_tweets_per_sync')
        assert value == 100
        assert isinstance(value, int)

    def test_set_boolean_value(self, user_settings):
        """Test setting and retrieving boolean value"""
        result = user_settings.set(1, 'sync_media', False)
        assert result is True

        value = user_settings.get(1, 'sync_media')
        assert value is False
        assert isinstance(value, bool)

    def test_set_dict_value(self, user_settings):
        """Test setting and retrieving dictionary value"""
        test_dict = {
            'enabled': True,
            'frequency': 60,
            'filters': ['important', 'urgent']
        }
        result = user_settings.set(1, 'notification_config', test_dict)
        assert result is True

        value = user_settings.get(1, 'notification_config')
        assert value == test_dict
        assert isinstance(value, dict)
        assert value['enabled'] is True
        assert value['frequency'] == 60

    def test_set_list_value(self, user_settings):
        """Test setting and retrieving list value"""
        test_list = ['twitter', 'bluesky', 'mastodon']
        result = user_settings.set(1, 'enabled_platforms', test_list)
        assert result is True

        value = user_settings.get(1, 'enabled_platforms')
        assert value == test_list
        assert isinstance(value, list)
        assert len(value) == 3

    def test_set_none_value(self, user_settings):
        """Test setting and retrieving None value"""
        result = user_settings.set(1, 'notification_email', None)
        assert result is True

        value = user_settings.get(1, 'notification_email')
        assert value is None

    def test_json_serialization_round_trip(self, user_settings):
        """Test complex data survives JSON serialization round-trip"""
        complex_data = {
            'string': 'test',
            'number': 42,
            'float': 3.14,
            'boolean': True,
            'null': None,
            'list': [1, 2, 3],
            'nested': {
                'key': 'value',
                'items': [{'a': 1}, {'b': 2}]
            }
        }

        user_settings.set(1, 'complex_setting', complex_data)
        retrieved = user_settings.get(1, 'complex_setting')

        assert retrieved == complex_data
        assert retrieved['string'] == 'test'
        assert retrieved['number'] == 42
        assert retrieved['float'] == 3.14
        assert retrieved['boolean'] is True
        assert retrieved['null'] is None
        assert retrieved['nested']['items'][0]['a'] == 1

    def test_set_updates_existing_value(self, user_settings):
        """Test that set() updates existing value (INSERT OR REPLACE)"""
        user_settings.set(1, 'sync_interval', 1800)
        value1 = user_settings.get(1, 'sync_interval')
        assert value1 == 1800

        # Update the same key
        user_settings.set(1, 'sync_interval', 3600)
        value2 = user_settings.get(1, 'sync_interval')
        assert value2 == 3600


class TestBulkOperations:
    """Tests for bulk operations (Priority 2)"""

    def test_get_all_defaults_only(self, user_settings):
        """Test get_all() returns DEFAULTS when user has no custom settings"""
        settings = user_settings.get_all(1)

        assert settings == UserSettings.DEFAULTS
        assert settings['sync_interval'] == 3600
        assert settings['twitter_to_bluesky_enabled'] is True
        assert settings['sync_media'] is True

    def test_get_all_with_user_overrides(self, user_settings):
        """Test get_all() includes user overrides"""
        user_settings.set(1, 'sync_interval', 7200)
        user_settings.set(1, 'sync_media', False)

        settings = user_settings.get_all(1)

        # User overrides should be present
        assert settings['sync_interval'] == 7200
        assert settings['sync_media'] is False

        # Defaults should still be present for non-overridden keys
        assert settings['twitter_to_bluesky_enabled'] is True
        assert settings['max_tweets_per_sync'] == 50

    def test_get_all_merges_correctly(self, user_settings):
        """Test get_all() correctly merges DEFAULTS with user settings"""
        # Set some user-specific settings
        user_settings.set(1, 'sync_interval', 1800)
        user_settings.set(1, 'custom_key', 'custom_value')

        settings = user_settings.get_all(1)

        # Should have all default keys
        for key in UserSettings.DEFAULTS:
            assert key in settings

        # Should have overridden values
        assert settings['sync_interval'] == 1800

        # Should have custom keys
        assert settings['custom_key'] == 'custom_value'

    def test_update_bulk_success(self, user_settings):
        """Test bulk update of multiple settings"""
        bulk_settings = {
            'sync_interval': 7200,
            'sync_media': False,
            'max_tweets_per_sync': 25,
            'timezone': 'Europe/London'
        }

        result = user_settings.update_bulk(1, bulk_settings)
        assert result is True

        # Verify all settings were updated
        for key, value in bulk_settings.items():
            assert user_settings.get(1, key) == value

    def test_update_bulk_atomicity(self, user_settings):
        """Test bulk update transaction atomicity"""
        # Set initial values
        user_settings.set(1, 'sync_interval', 1800)
        user_settings.set(1, 'sync_media', True)

        # Update multiple settings
        bulk_settings = {
            'sync_interval': 7200,
            'sync_media': False,
            'new_setting': 'new_value'
        }

        result = user_settings.update_bulk(1, bulk_settings)
        assert result is True

        # All updates should be committed
        settings = user_settings.get_all(1)
        assert settings['sync_interval'] == 7200
        assert settings['sync_media'] is False
        assert settings['new_setting'] == 'new_value'

    def test_update_bulk_empty_dict(self, user_settings):
        """Test bulk update with empty dictionary"""
        result = user_settings.update_bulk(1, {})
        assert result is True

        # Should still return defaults
        settings = user_settings.get_all(1)
        assert settings == UserSettings.DEFAULTS

    def test_delete_removes_setting(self, user_settings):
        """Test delete() removes a setting"""
        user_settings.set(1, 'custom_setting', 'value')

        # Verify it exists
        assert user_settings.get(1, 'custom_setting') == 'value'

        # Delete it
        result = user_settings.delete(1, 'custom_setting')
        assert result is True

        # Verify it's gone (should return None)
        assert user_settings.get(1, 'custom_setting') is None

    def test_delete_fallback_to_default(self, user_settings):
        """Test delete() causes fallback to default value"""
        # Override a default setting
        user_settings.set(1, 'sync_interval', 7200)
        assert user_settings.get(1, 'sync_interval') == 7200

        # Delete the override
        result = user_settings.delete(1, 'sync_interval')
        assert result is True

        # Should now return default value
        assert user_settings.get(1, 'sync_interval') == UserSettings.DEFAULTS['sync_interval']
        assert user_settings.get(1, 'sync_interval') == 3600

    def test_delete_nonexistent_key(self, user_settings):
        """Test deleting a non-existent key returns False"""
        result = user_settings.delete(1, 'nonexistent_key')
        assert result is False


class TestEdgeCases:
    """Tests for edge cases and special scenarios (Priority 3)"""

    def test_user_isolation(self, user_settings):
        """Test that users cannot access each other's settings"""
        # User 1 sets a value
        user_settings.set(1, 'sync_interval', 1800)
        user_settings.set(1, 'custom_setting', 'user1_value')

        # User 2 sets different values
        user_settings.set(2, 'sync_interval', 7200)
        user_settings.set(2, 'custom_setting', 'user2_value')

        # Verify user 1's settings
        assert user_settings.get(1, 'sync_interval') == 1800
        assert user_settings.get(1, 'custom_setting') == 'user1_value'

        # Verify user 2's settings
        assert user_settings.get(2, 'sync_interval') == 7200
        assert user_settings.get(2, 'custom_setting') == 'user2_value'

        # Verify get_all isolation
        user1_settings = user_settings.get_all(1)
        user2_settings = user_settings.get_all(2)

        assert user1_settings['sync_interval'] == 1800
        assert user2_settings['sync_interval'] == 7200

    def test_reset_to_defaults_clears_all_settings(self, user_settings):
        """Test reset_to_defaults() removes all user settings"""
        # Set multiple custom settings
        user_settings.set(1, 'sync_interval', 1800)
        user_settings.set(1, 'sync_media', False)
        user_settings.set(1, 'custom_key', 'custom_value')

        # Verify they exist
        assert user_settings.get(1, 'sync_interval') == 1800
        assert user_settings.get(1, 'sync_media') is False
        assert user_settings.get(1, 'custom_key') == 'custom_value'

        # Reset to defaults
        result = user_settings.reset_to_defaults(1)
        assert result is True

        # All settings should now return defaults
        assert user_settings.get(1, 'sync_interval') == UserSettings.DEFAULTS['sync_interval']
        assert user_settings.get(1, 'sync_media') == UserSettings.DEFAULTS['sync_media']
        assert user_settings.get(1, 'custom_key') is None

        # get_all should return only defaults
        settings = user_settings.get_all(1)
        assert settings == UserSettings.DEFAULTS

    def test_reset_to_defaults_user_isolation(self, user_settings):
        """Test reset_to_defaults() only affects specified user"""
        # Set settings for both users
        user_settings.set(1, 'sync_interval', 1800)
        user_settings.set(2, 'sync_interval', 7200)

        # Reset user 1
        result = user_settings.reset_to_defaults(1)
        assert result is True

        # User 1 should have defaults
        assert user_settings.get(1, 'sync_interval') == UserSettings.DEFAULTS['sync_interval']

        # User 2 should still have custom value
        assert user_settings.get(2, 'sync_interval') == 7200

    def test_malformed_json_handling_on_get(self, user_settings):
        """Test handling of malformed JSON when retrieving settings"""
        # Manually insert malformed JSON into database
        conn = user_settings._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (1, 'malformed', 'not valid json {', int(time.time())))
        conn.commit()
        conn.close()

        # Should return the raw string when JSON parsing fails
        value = user_settings.get(1, 'malformed')
        assert value == 'not valid json {'

    def test_concurrent_updates_same_key(self, user_settings):
        """Test multiple updates to the same key"""
        # Rapidly update the same key
        for i in range(10):
            result = user_settings.set(1, 'counter', i)
            assert result is True

        # Should have the last value
        assert user_settings.get(1, 'counter') == 9

    def test_unicode_and_special_characters(self, user_settings):
        """Test handling of unicode and special characters"""
        special_strings = {
            'unicode': '你好世界 🌍',
            'special_chars': "!@#$%^&*()[]{}';:",
            'quotes': 'He said "Hello" and she said \'Hi\'',
            'newlines': 'Line 1\nLine 2\nLine 3',
            'tabs': 'Column1\tColumn2\tColumn3'
        }

        for key, value in special_strings.items():
            user_settings.set(1, key, value)
            retrieved = user_settings.get(1, key)
            assert retrieved == value

    def test_large_data_storage(self, user_settings):
        """Test storing large data structures"""
        large_list = [{'id': i, 'data': f'item_{i}' * 100} for i in range(100)]

        result = user_settings.set(1, 'large_data', large_list)
        assert result is True

        retrieved = user_settings.get(1, 'large_data')
        assert len(retrieved) == 100
        assert retrieved[0]['id'] == 0
        assert retrieved[99]['id'] == 99

    def test_get_with_custom_default_parameter(self, user_settings):
        """Test that custom default parameter overrides DEFAULTS when provided"""
        # When a custom default is provided, it should be used even if key is in DEFAULTS
        # (only when default is None does it fall back to DEFAULTS)
        value = user_settings.get(1, 'sync_interval', 9999)
        assert value == 9999  # Custom default overrides DEFAULTS

        # When default is None, should use DEFAULTS
        value = user_settings.get(1, 'sync_interval')
        assert value == UserSettings.DEFAULTS['sync_interval']

        # For a key that doesn't exist in DEFAULTS
        value = user_settings.get(1, 'nonexistent', 'custom')
        assert value == 'custom'


class TestDatabaseOperations:
    """Tests for database-level operations"""

    def test_init_db_creates_table(self, temp_db):
        """Test that init_db() creates the user_settings table"""
        settings = UserSettings(db_path=temp_db)
        settings.init_db()

        # Verify table exists
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='user_settings'
        ''')
        result = cursor.fetchone()
        conn.close()

        assert result is not None
        assert result[0] == 'user_settings'

    def test_init_db_creates_index(self, temp_db):
        """Test that init_db() creates the user index"""
        settings = UserSettings(db_path=temp_db)
        settings.init_db()

        # Verify index exists
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT name FROM sqlite_master
            WHERE type='index' AND name='idx_settings_user'
        ''')
        result = cursor.fetchone()
        conn.close()

        assert result is not None

    def test_init_db_idempotent(self, temp_db):
        """Test that init_db() can be called multiple times safely"""
        settings = UserSettings(db_path=temp_db)
        settings.init_db()
        settings.init_db()
        settings.init_db()

        # Should not raise any errors
        settings.set(1, 'test', 'value')
        assert settings.get(1, 'test') == 'value'

    def test_updated_at_timestamp(self, user_settings):
        """Test that updated_at timestamp is set correctly"""
        before = int(time.time())
        user_settings.set(1, 'test_key', 'test_value')
        after = int(time.time())

        # Query the timestamp directly
        conn = user_settings._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT updated_at FROM user_settings
            WHERE user_id = ? AND setting_key = ?
        ''', (1, 'test_key'))
        row = cursor.fetchone()
        conn.close()

        timestamp = row[0]
        assert before <= timestamp <= after

    def test_unique_constraint_user_key(self, user_settings):
        """Test that (user_id, setting_key) combination is unique"""
        # This is implicitly tested by INSERT OR REPLACE behavior
        user_settings.set(1, 'test_key', 'value1')
        user_settings.set(1, 'test_key', 'value2')

        # Should only have one row
        conn = user_settings._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT COUNT(*) FROM user_settings
            WHERE user_id = ? AND setting_key = ?
        ''', (1, 'test_key'))
        count = cursor.fetchone()[0]
        conn.close()

        assert count == 1
        assert user_settings.get(1, 'test_key') == 'value2'


class TestDefaults:
    """Tests for DEFAULTS dictionary functionality"""

    def test_defaults_structure(self):
        """Test that DEFAULTS dictionary has expected structure"""
        defaults = UserSettings.DEFAULTS

        assert isinstance(defaults, dict)
        assert 'sync_interval' in defaults
        assert 'twitter_to_bluesky_enabled' in defaults
        assert 'bluesky_to_twitter_enabled' in defaults
        assert 'sync_threads' in defaults
        assert 'sync_media' in defaults
        assert 'max_tweets_per_sync' in defaults
        assert 'notification_email' in defaults
        assert 'timezone' in defaults

    def test_defaults_values(self):
        """Test that DEFAULTS have correct types and values"""
        defaults = UserSettings.DEFAULTS

        assert defaults['sync_interval'] == 3600
        assert isinstance(defaults['sync_interval'], int)

        assert defaults['twitter_to_bluesky_enabled'] is True
        assert isinstance(defaults['twitter_to_bluesky_enabled'], bool)

        assert defaults['sync_media'] is True
        assert isinstance(defaults['sync_media'], bool)

        assert defaults['max_tweets_per_sync'] == 50
        assert isinstance(defaults['max_tweets_per_sync'], int)

        assert defaults['notification_email'] is None

        assert defaults['timezone'] == 'UTC'
        assert isinstance(defaults['timezone'], str)

    def test_defaults_not_modified_by_instance(self, user_settings):
        """Test that instance operations don't modify the class-level DEFAULTS"""
        original_defaults = UserSettings.DEFAULTS.copy()

        # Perform various operations
        user_settings.set(1, 'sync_interval', 9999)
        user_settings.update_bulk(1, {'sync_media': False})

        # DEFAULTS should remain unchanged
        assert UserSettings.DEFAULTS == original_defaults


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
