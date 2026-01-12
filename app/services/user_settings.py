"""
UserSettings - Per-User Configuration Management (Sprint 6 - CONFIG-003)

Provides per-user settings storage and retrieval with JSON value support.
Settings are stored in SQLite with user isolation.
"""
import sqlite3
import json
import time
from typing import Optional, Any, Dict


class UserSettings:
    """
    User settings management system.

    Provides per-user configuration storage with JSON support.
    All settings are isolated by user_id.
    """

    # Default settings
    DEFAULTS = {
        'sync_interval': 3600,  # 1 hour in seconds
        'twitter_to_bluesky_enabled': True,
        'bluesky_to_twitter_enabled': True,
        'sync_threads': True,
        'sync_media': True,
        'max_tweets_per_sync': 50,
        'notification_email': None,
        'timezone': 'UTC',
    }

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize UserSettings.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database table for user settings"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                setting_key TEXT NOT NULL,
                setting_value TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, setting_key)
            )
        ''')

        # Create index
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_settings_user ON user_settings(user_id)')

        conn.commit()
        conn.close()

    def get(self, user_id: int, key: str, default: Any = None) -> Any:
        """
        Get setting value for user.

        Args:
            user_id: User ID
            key: Setting key
            default: Default value if not found

        Returns:
            Setting value (deserialized from JSON) or default
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT setting_value FROM user_settings
                WHERE user_id = ? AND setting_key = ?
            ''', (user_id, key))

            row = cursor.fetchone()

            if row:
                # Deserialize JSON value
                try:
                    return json.loads(row['setting_value'])
                except json.JSONDecodeError:
                    return row['setting_value']

            # Return default from DEFAULTS dict or provided default
            if default is None and key in self.DEFAULTS:
                return self.DEFAULTS[key]

            return default

        finally:
            conn.close()

    def set(self, user_id: int, key: str, value: Any) -> bool:
        """
        Set setting value for user.

        Args:
            user_id: User ID
            key: Setting key
            value: Setting value (will be serialized to JSON)

        Returns:
            True if set successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Serialize value to JSON
            value_json = json.dumps(value)
            updated_at = int(time.time())

            # Insert or replace
            cursor.execute('''
                INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
                VALUES (?, ?, ?, ?)
            ''', (user_id, key, value_json, updated_at))

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            print(f"Error setting user setting: {e}")
            return False
        finally:
            conn.close()

    def get_all(self, user_id: int) -> Dict[str, Any]:
        """
        Get all settings for user.

        Args:
            user_id: User ID

        Returns:
            Dict of all settings (including defaults for missing keys)
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT setting_key, setting_value FROM user_settings
                WHERE user_id = ?
            ''', (user_id,))

            rows = cursor.fetchall()

            # Start with defaults
            settings = self.DEFAULTS.copy()

            # Override with user settings
            for row in rows:
                key = row['setting_key']
                try:
                    settings[key] = json.loads(row['setting_value'])
                except json.JSONDecodeError:
                    settings[key] = row['setting_value']

            return settings

        finally:
            conn.close()

    def update_bulk(self, user_id: int, settings: Dict[str, Any]) -> bool:
        """
        Update multiple settings at once.

        Args:
            user_id: User ID
            settings: Dict of setting key-value pairs

        Returns:
            True if all updates successful, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            updated_at = int(time.time())

            for key, value in settings.items():
                value_json = json.dumps(value)

                cursor.execute('''
                    INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, key, value_json, updated_at))

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            print(f"Error updating user settings: {e}")
            return False
        finally:
            conn.close()

    def delete(self, user_id: int, key: str) -> bool:
        """
        Delete a setting.

        Args:
            user_id: User ID
            key: Setting key

        Returns:
            True if deleted, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                DELETE FROM user_settings
                WHERE user_id = ? AND setting_key = ?
            ''', (user_id, key))

            conn.commit()
            return cursor.rowcount > 0

        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()

    def reset_to_defaults(self, user_id: int) -> bool:
        """
        Reset all settings to defaults for a user.

        Args:
            user_id: User ID

        Returns:
            True if reset successful, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Delete all user settings (will fall back to defaults)
            cursor.execute('DELETE FROM user_settings WHERE user_id = ?', (user_id,))
            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()
