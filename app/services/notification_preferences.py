"""
Notification Preferences Manager for ChirpSyncer.

Manages per-user notification preferences with support for:
- Email and in-app notification toggles
- Per-notification-type settings
- Quiet hours
- Digest frequency
- Unsubscribe tokens
"""

import json
import secrets
import sqlite3
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

from app.core.logger import setup_logger

logger = setup_logger(__name__)


class NotificationPreferences:
    """
    Manager for user notification preferences.

    Handles storage and retrieval of notification settings with
    sensible defaults for backward compatibility.
    """

    NOTIFICATION_TYPES = [
        "sync_complete",
        "sync_failed",
        "weekly_report",
        "rate_limit",
        "credential_expired",
    ]

    DEFAULTS: Dict[str, Any] = {
        "email_enabled": False,  # Opt-in for existing users
        "inapp_enabled": True,
        "digest_frequency": "immediate",  # immediate, daily, weekly
        "quiet_hours_start": None,  # Hour (0-23) or None
        "quiet_hours_end": None,
        "email_types": {t: True for t in NOTIFICATION_TYPES},
        "inapp_types": {t: True for t in NOTIFICATION_TYPES},
    }

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize NotificationPreferences manager.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def init_db(self) -> None:
        """Create notification_preferences table if it doesn't exist."""
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER UNIQUE NOT NULL,
                    email_enabled INTEGER DEFAULT 0,
                    inapp_enabled INTEGER DEFAULT 1,
                    digest_frequency TEXT DEFAULT 'immediate',
                    quiet_hours_start INTEGER,
                    quiet_hours_end INTEGER,
                    email_types_json TEXT,
                    inapp_types_json TEXT,
                    unsubscribe_token TEXT UNIQUE,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            # Index for fast token lookup
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_notification_prefs_unsubscribe_token
                ON notification_preferences(unsubscribe_token)
                """
            )
            conn.commit()
            logger.info("notification_preferences table initialized")
        finally:
            conn.close()

    def get_preferences(self, user_id: int) -> Dict[str, Any]:
        """
        Get notification preferences for a user.

        Returns defaults merged with stored preferences.
        Creates default row if user has no preferences yet.

        Args:
            user_id: User ID

        Returns:
            Dictionary with all preference settings
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM notification_preferences WHERE user_id = ?
                """,
                (user_id,),
            )
            row = cursor.fetchone()

            if not row:
                # Return defaults (don't create row until user explicitly saves)
                return self._get_defaults_copy()

            # Merge stored values with defaults
            prefs = self._get_defaults_copy()
            prefs["email_enabled"] = bool(row["email_enabled"])
            prefs["inapp_enabled"] = bool(row["inapp_enabled"])
            prefs["digest_frequency"] = row["digest_frequency"] or "immediate"
            prefs["quiet_hours_start"] = row["quiet_hours_start"]
            prefs["quiet_hours_end"] = row["quiet_hours_end"]

            # Parse JSON fields
            if row["email_types_json"]:
                try:
                    prefs["email_types"] = json.loads(row["email_types_json"])
                except json.JSONDecodeError:
                    pass

            if row["inapp_types_json"]:
                try:
                    prefs["inapp_types"] = json.loads(row["inapp_types_json"])
                except json.JSONDecodeError:
                    pass

            return prefs

        finally:
            conn.close()

    def update_preferences(self, user_id: int, **kwargs) -> bool:
        """
        Update notification preferences for a user.

        Creates row if it doesn't exist (upsert).

        Args:
            user_id: User ID
            **kwargs: Preference fields to update:
                - email_enabled: bool
                - inapp_enabled: bool
                - digest_frequency: str
                - quiet_hours_start: int or None
                - quiet_hours_end: int or None
                - email_types: dict
                - inapp_types: dict

        Returns:
            True if update successful
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            now = int(time.time())

            # Check if row exists
            cursor.execute(
                "SELECT id FROM notification_preferences WHERE user_id = ?",
                (user_id,),
            )
            existing = cursor.fetchone()

            # Prepare values
            email_enabled = kwargs.get("email_enabled")
            inapp_enabled = kwargs.get("inapp_enabled")
            digest_frequency = kwargs.get("digest_frequency")
            quiet_hours_start = kwargs.get("quiet_hours_start")
            quiet_hours_end = kwargs.get("quiet_hours_end")
            email_types = kwargs.get("email_types")
            inapp_types = kwargs.get("inapp_types")

            email_types_json = json.dumps(email_types) if email_types else None
            inapp_types_json = json.dumps(inapp_types) if inapp_types else None

            if existing:
                # Build dynamic UPDATE query for provided fields only
                updates = []
                params = []

                if email_enabled is not None:
                    updates.append("email_enabled = ?")
                    params.append(1 if email_enabled else 0)

                if inapp_enabled is not None:
                    updates.append("inapp_enabled = ?")
                    params.append(1 if inapp_enabled else 0)

                if digest_frequency is not None:
                    updates.append("digest_frequency = ?")
                    params.append(digest_frequency)

                if "quiet_hours_start" in kwargs:
                    updates.append("quiet_hours_start = ?")
                    params.append(quiet_hours_start)

                if "quiet_hours_end" in kwargs:
                    updates.append("quiet_hours_end = ?")
                    params.append(quiet_hours_end)

                if email_types_json:
                    updates.append("email_types_json = ?")
                    params.append(email_types_json)

                if inapp_types_json:
                    updates.append("inapp_types_json = ?")
                    params.append(inapp_types_json)

                if updates:
                    updates.append("updated_at = ?")
                    params.append(now)
                    params.append(user_id)

                    # updates list contains only validated column names from the code above
                    query = f"UPDATE notification_preferences SET {', '.join(updates)} WHERE user_id = ?"  # nosec B608
                    cursor.execute(query, params)

            else:
                # INSERT new row with defaults + provided values
                cursor.execute(
                    """
                    INSERT INTO notification_preferences (
                        user_id, email_enabled, inapp_enabled, digest_frequency,
                        quiet_hours_start, quiet_hours_end, email_types_json,
                        inapp_types_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        1 if email_enabled else 0,
                        1 if inapp_enabled is None or inapp_enabled else 0,
                        digest_frequency or "immediate",
                        quiet_hours_start,
                        quiet_hours_end,
                        email_types_json or json.dumps(self.DEFAULTS["email_types"]),
                        inapp_types_json or json.dumps(self.DEFAULTS["inapp_types"]),
                        now,
                        now,
                    ),
                )

            conn.commit()
            logger.info(f"Updated notification preferences for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update preferences for user {user_id}: {e}")
            return False
        finally:
            conn.close()

    def should_notify(
        self, user_id: int, notification_type: str, channel: str = "email"
    ) -> bool:
        """
        Check if a notification should be sent to a user.

        Considers:
        - Channel enabled (email_enabled / inapp_enabled)
        - Type enabled for channel
        - Quiet hours (for email only)

        Args:
            user_id: User ID
            notification_type: One of NOTIFICATION_TYPES
            channel: 'email' or 'inapp'

        Returns:
            True if notification should be sent
        """
        prefs = self.get_preferences(user_id)

        # Check channel enabled
        if channel == "email" and not prefs["email_enabled"]:
            return False
        if channel == "inapp" and not prefs["inapp_enabled"]:
            return False

        # Check type enabled for channel
        types_key = f"{channel}_types"
        type_settings = prefs.get(types_key, {})
        if not type_settings.get(notification_type, True):
            return False

        # Check quiet hours (email only)
        if channel == "email":
            if not self._is_outside_quiet_hours(prefs):
                logger.debug(
                    f"Skipping email for user {user_id}: in quiet hours"
                )
                return False

        return True

    def generate_unsubscribe_token(self, user_id: int) -> str:
        """
        Generate or return existing unsubscribe token for a user.

        Args:
            user_id: User ID

        Returns:
            Unsubscribe token (URL-safe string)
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()

            # Check for existing token
            cursor.execute(
                """
                SELECT unsubscribe_token FROM notification_preferences
                WHERE user_id = ?
                """,
                (user_id,),
            )
            row = cursor.fetchone()

            if row and row[0]:
                return row[0]

            # Generate new token
            token = secrets.token_urlsafe(32)
            now = int(time.time())

            if row:
                # Update existing row
                cursor.execute(
                    """
                    UPDATE notification_preferences
                    SET unsubscribe_token = ?, updated_at = ?
                    WHERE user_id = ?
                    """,
                    (token, now, user_id),
                )
            else:
                # Create new row with token
                cursor.execute(
                    """
                    INSERT INTO notification_preferences (
                        user_id, email_enabled, inapp_enabled, digest_frequency,
                        email_types_json, inapp_types_json, unsubscribe_token,
                        created_at, updated_at
                    ) VALUES (?, 0, 1, 'immediate', ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        json.dumps(self.DEFAULTS["email_types"]),
                        json.dumps(self.DEFAULTS["inapp_types"]),
                        token,
                        now,
                        now,
                    ),
                )

            conn.commit()
            logger.info(f"Generated unsubscribe token for user {user_id}")
            return token

        finally:
            conn.close()

    def get_user_by_unsubscribe_token(self, token: str) -> Optional[int]:
        """
        Get user ID by unsubscribe token.

        Args:
            token: Unsubscribe token

        Returns:
            User ID or None if token invalid
        """
        if not token:
            return None

        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT user_id FROM notification_preferences
                WHERE unsubscribe_token = ?
                """,
                (token,),
            )
            row = cursor.fetchone()
            return row[0] if row else None
        finally:
            conn.close()

    def unsubscribe_by_token(
        self, token: str, notification_type: Optional[str] = None
    ) -> bool:
        """
        Unsubscribe user using token.

        Args:
            token: Unsubscribe token
            notification_type: Specific type to unsubscribe from,
                              or None to disable all email notifications

        Returns:
            True if successful
        """
        user_id = self.get_user_by_unsubscribe_token(token)
        if not user_id:
            return False

        if notification_type:
            # Disable specific type
            prefs = self.get_preferences(user_id)
            email_types = prefs.get("email_types", {})
            email_types[notification_type] = False
            return self.update_preferences(user_id, email_types=email_types)
        else:
            # Disable all email notifications
            return self.update_preferences(user_id, email_enabled=False)

    def get_users_with_preference(
        self, preference: str, value: Any = True
    ) -> List[int]:
        """
        Get list of user IDs with a specific preference value.

        Useful for batch operations like weekly reports.

        Args:
            preference: Preference field name
            value: Value to match

        Returns:
            List of user IDs
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()

            if preference == "email_enabled":
                cursor.execute(
                    """
                    SELECT user_id FROM notification_preferences
                    WHERE email_enabled = ?
                    """,
                    (1 if value else 0,),
                )
            elif preference == "weekly_report_enabled":
                # Check email_enabled AND weekly_report in email_types
                cursor.execute(
                    """
                    SELECT user_id, email_types_json FROM notification_preferences
                    WHERE email_enabled = 1
                    """
                )
                user_ids = []
                for row in cursor.fetchall():
                    if row[1]:
                        try:
                            email_types = json.loads(row[1])
                            if email_types.get("weekly_report", True):
                                user_ids.append(row[0])
                        except json.JSONDecodeError:
                            pass
                return user_ids
            else:
                return []

            return [row[0] for row in cursor.fetchall()]

        finally:
            conn.close()

    def _get_defaults_copy(self) -> Dict[str, Any]:
        """Get a deep copy of defaults."""
        return {
            "email_enabled": self.DEFAULTS["email_enabled"],
            "inapp_enabled": self.DEFAULTS["inapp_enabled"],
            "digest_frequency": self.DEFAULTS["digest_frequency"],
            "quiet_hours_start": self.DEFAULTS["quiet_hours_start"],
            "quiet_hours_end": self.DEFAULTS["quiet_hours_end"],
            "email_types": dict(self.DEFAULTS["email_types"]),
            "inapp_types": dict(self.DEFAULTS["inapp_types"]),
        }

    def _is_outside_quiet_hours(self, prefs: Dict[str, Any]) -> bool:
        """
        Check if current time is outside quiet hours.

        Args:
            prefs: User preferences dict

        Returns:
            True if notifications can be sent (outside quiet hours)
        """
        start = prefs.get("quiet_hours_start")
        end = prefs.get("quiet_hours_end")

        if start is None or end is None:
            return True  # No quiet hours configured

        current_hour = datetime.now().hour

        if start <= end:
            # Simple range (e.g., 22-6 means 22:00 to 06:00 is quiet)
            # Actually this is inverted - if start=22, end=6
            # quiet hours are 22:00-06:00
            return not (start <= current_hour < end)
        else:
            # Range spans midnight (e.g., 22-6)
            return not (current_hour >= start or current_hour < end)
