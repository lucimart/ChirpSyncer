"""
Unit tests for user_settings module.
"""
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from user_settings import UserSettings


class TestUserSettingsInit(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_init_creates_table(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'")
        self.assertIsNotNone(cursor.fetchone())
        conn.close()

    def test_init_creates_index(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_settings_user'")
        self.assertIsNotNone(cursor.fetchone())
        conn.close()


class TestUserSettingsGetSet(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_set_and_get_string(self):
        result = self.settings.set(1, 'theme', 'dark')
        self.assertTrue(result)
        value = self.settings.get(1, 'theme')
        self.assertEqual(value, 'dark')

    def test_set_and_get_integer(self):
        self.settings.set(1, 'sync_interval', 7200)
        value = self.settings.get(1, 'sync_interval')
        self.assertEqual(value, 7200)

    def test_get_uses_class_defaults(self):
        value = self.settings.get(1, 'sync_interval')
        self.assertEqual(value, 3600)

    def test_user_isolation(self):
        self.settings.set(1, 'theme', 'dark')
        self.settings.set(2, 'theme', 'light')
        self.assertEqual(self.settings.get(1, 'theme'), 'dark')
        self.assertEqual(self.settings.get(2, 'theme'), 'light')


class TestUserSettingsGetAll(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_get_all_includes_defaults(self):
        all_settings = self.settings.get_all(1)
        self.assertIn('sync_interval', all_settings)
        self.assertEqual(all_settings['sync_interval'], 3600)

    def test_get_all_overrides_defaults(self):
        self.settings.set(1, 'sync_interval', 7200)
        all_settings = self.settings.get_all(1)
        self.assertEqual(all_settings['sync_interval'], 7200)


class TestUserSettingsUpdateBulk(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_update_bulk_multiple_settings(self):
        updates = {'theme': 'dark', 'sync_interval': 1800}
        result = self.settings.update_bulk(1, updates)
        self.assertTrue(result)
        self.assertEqual(self.settings.get(1, 'theme'), 'dark')


class TestUserSettingsDelete(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_delete_existing_setting(self):
        self.settings.set(1, 'theme', 'dark')
        result = self.settings.delete(1, 'theme')
        self.assertTrue(result)

    def test_delete_nonexistent_setting(self):
        result = self.settings.delete(1, 'nonexistent')
        self.assertFalse(result)


class TestUserSettingsReset(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_reset_removes_all_user_settings(self):
        self.settings.set(1, 'sync_interval', 7200)
        result = self.settings.reset_to_defaults(1)
        self.assertTrue(result)
        self.assertEqual(self.settings.get(1, 'sync_interval'), 3600)


class TestUserSettingsDefaults(unittest.TestCase):

    def test_defaults_contains_expected_keys(self):
        expected = ['sync_interval', 'twitter_to_bluesky_enabled', 'timezone']
        for key in expected:
            self.assertIn(key, UserSettings.DEFAULTS)


if __name__ == '__main__':
    unittest.main()



class TestUserSettingsExceptionHandling(unittest.TestCase):
    """Tests for exception handling in user_settings"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_get_invalid_json_returns_raw_value(self):
        """Test that get() returns raw value if JSON decoding fails"""
        # Manually insert invalid JSON
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)",
            (1, 'bad_json', 'not valid json', 12345)
        )
        conn.commit()
        conn.close()
        
        result = self.settings.get(user_id=1, key='bad_json')
        self.assertEqual(result, 'not valid json')

    def test_set_exception_returns_false(self):
        """Test that set() returns False on exception"""
        # Drop table to cause an error
        conn = sqlite3.connect(self.db_path)
        conn.execute("DROP TABLE user_settings")
        conn.commit()
        conn.close()
        
        result = self.settings.set(user_id=1, key='test', value='value')
        self.assertFalse(result)

    def test_delete_exception_returns_false(self):
        """Test that delete() returns False on exception"""
        # Drop table to cause an error
        conn = sqlite3.connect(self.db_path)
        conn.execute("DROP TABLE user_settings")
        conn.commit()
        conn.close()
        
        result = self.settings.delete(user_id=1, key='test')
        self.assertFalse(result)

    def test_reset_exception_returns_false(self):
        """Test that reset() returns False on exception"""
        # Drop table to cause an error
        conn = sqlite3.connect(self.db_path)
        conn.execute("DROP TABLE user_settings")
        conn.commit()
        conn.close()
        
        result = self.settings.reset(user_id=1)
        self.assertFalse(result)


class TestUserSettingsGetAllInvalid(unittest.TestCase):
    """Tests for get_all with invalid JSON"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.settings = UserSettings(self.db_path)
        self.settings.init_db()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_get_all_handles_invalid_json(self):
        """Test that get_all handles invalid JSON values gracefully"""
        # Insert valid and invalid JSON
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)",
            (1, 'bad_json', 'not valid json', 12345)
        )
        cursor.execute(
            "INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)",
            (1, 'good_json', '"valid string"', 12345)
        )
        conn.commit()
        conn.close()
        
        result = self.settings.get_all(user_id=1)
        # Should have both keys
        self.assertIn('bad_json', result)
        self.assertIn('good_json', result)
        # Bad JSON should be raw string
        self.assertEqual(result['bad_json'], 'not valid json')
        # Good JSON should be parsed
        self.assertEqual(result['good_json'], 'valid string')
