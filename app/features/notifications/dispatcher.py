"""
NotificationDispatcher - Centralized notification dispatch system.

Handles routing notifications to multiple channels based on user preferences,
respecting quiet hours and priority levels.
"""

import os
import sqlite3
import time
from datetime import datetime
from typing import Any, Dict, Optional

from app.core.logger import setup_logger
from app.features.notifications.models import (
    Notification,
    NotificationCategory,
    NotificationPriority,
    init_notifications_hub_db,
)
from app.features.notifications.channels.telegram import TelegramChannel
from app.features.notifications.channels.discord import DiscordChannel
from app.features.notifications.channels.email import EmailChannel

logger = setup_logger(__name__)


class NotificationDispatcher:
    """
    Centralized notification dispatcher.

    Routes notifications to appropriate channels based on:
    - User channel preferences (enabled/disabled)
    - Quiet hours settings
    - Notification priority
    - Channel availability
    """

    def __init__(
        self,
        db_path: str = "chirpsyncer.db",
        telegram_bot_token: Optional[str] = None,
    ):
        """
        Initialize NotificationDispatcher.

        Args:
            db_path: Path to SQLite database
            telegram_bot_token: Default Telegram bot token
        """
        self.db_path = db_path
        self.telegram_channel = TelegramChannel(
            bot_token=telegram_bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        )
        self.discord_channel = DiscordChannel()
        self.email_channel = EmailChannel(db_path=db_path)

        # Initialize DB tables
        init_notifications_hub_db(db_path)

    def send(
        self,
        user_id: int,
        type: str,
        category: NotificationCategory,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
    ) -> Dict[str, Any]:
        """
        Send notification to user via configured channels.

        Always creates in-app notification. External channels (Telegram, Discord, email)
        respect quiet hours unless priority is URGENT or CRITICAL.

        Args:
            user_id: Target user ID
            type: Notification type (e.g., sync_complete)
            category: Notification category
            title: Notification title
            body: Notification body
            data: Additional metadata
            priority: Priority level

        Returns:
            Dict with success status and channel results
        """
        data = data or {}
        result = {
            "success": True,
            "channels": {},
        }

        # Create in-app notification (always)
        notification = Notification(
            user_id=user_id,
            type=type,
            category=category,
            title=title,
            body=body,
            data=data,
            priority=priority,
        )
        notification.save(self.db_path)
        result["notification_id"] = notification.id
        result["channels"]["inapp"] = {"success": True}

        # Get user preferences
        prefs = self.get_user_channel_preferences(user_id)

        # Check quiet hours (bypass for urgent/critical)
        in_quiet_hours = not self.is_outside_quiet_hours(user_id)
        bypass_quiet_hours = priority >= NotificationPriority.URGENT

        # Telegram channel
        if prefs.get("telegram_enabled") and prefs.get("telegram_chat_id"):
            if in_quiet_hours and not bypass_quiet_hours:
                result["channels"]["telegram"] = {"skipped": True, "reason": "quiet_hours"}
            else:
                telegram_result = self.telegram_channel.send(
                    chat_id=prefs["telegram_chat_id"],
                    title=title,
                    body=body,
                    data=data,
                )
                result["channels"]["telegram"] = telegram_result
        else:
            result["channels"]["telegram"] = {"skipped": True, "reason": "not_enabled"}

        # Discord channel
        if prefs.get("discord_enabled") and prefs.get("discord_webhook_url"):
            if in_quiet_hours and not bypass_quiet_hours:
                result["channels"]["discord"] = {"skipped": True, "reason": "quiet_hours"}
            else:
                discord_result = self.discord_channel.send(
                    webhook_url=prefs["discord_webhook_url"],
                    title=title,
                    body=body,
                    category=category,
                    priority=priority,
                    data=data,
                )
                result["channels"]["discord"] = discord_result
        else:
            result["channels"]["discord"] = {"skipped": True, "reason": "not_enabled"}

        # Email digest (queue, don't send immediately)
        if prefs.get("email_digest_enabled"):
            email_result = self.email_channel.queue_for_digest(
                user_id=user_id,
                title=title,
                body=body,
                category=category.value if isinstance(category, NotificationCategory) else category,
                priority=priority.value if isinstance(priority, NotificationPriority) else priority,
                data=data,
            )
            result["channels"]["email_digest"] = email_result

        logger.info(
            f"Dispatched notification to user {user_id}: {title} "
            f"(channels: {list(result['channels'].keys())})"
        )

        return result

    def send_to_channel(
        self,
        channel: str,
        user_id: int,
        title: str,
        body: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Send notification to a specific channel only.

        Args:
            channel: Channel name (telegram, discord, email)
            user_id: Target user ID
            title: Notification title
            body: Notification body
            **kwargs: Additional channel-specific parameters

        Returns:
            Dict with success status
        """
        prefs = self.get_user_channel_preferences(user_id)

        if channel == "telegram":
            chat_id = kwargs.get("chat_id") or prefs.get("telegram_chat_id")
            if not chat_id:
                return {"success": False, "error": "No Telegram chat_id configured"}
            return self.telegram_channel.send(
                chat_id=chat_id,
                title=title,
                body=body,
                data=kwargs.get("data"),
            )

        elif channel == "discord":
            webhook_url = kwargs.get("webhook_url") or prefs.get("discord_webhook_url")
            if not webhook_url:
                return {"success": False, "error": "No Discord webhook configured"}
            return self.discord_channel.send(
                webhook_url=webhook_url,
                title=title,
                body=body,
                category=kwargs.get("category", NotificationCategory.SYSTEM),
                priority=kwargs.get("priority", NotificationPriority.NORMAL),
                data=kwargs.get("data"),
            )

        elif channel == "email":
            return self.email_channel.queue_for_digest(
                user_id=user_id,
                title=title,
                body=body,
                category=kwargs.get("category", "system"),
                priority=kwargs.get("priority", 2),
                data=kwargs.get("data"),
            )

        else:
            return {"success": False, "error": f"Unknown channel: {channel}"}

    def is_outside_quiet_hours(self, user_id: int) -> bool:
        """
        Check if current time is outside user's quiet hours.

        Args:
            user_id: User ID

        Returns:
            True if notifications can be sent (outside quiet hours)
        """
        prefs = self.get_user_channel_preferences(user_id)
        start = prefs.get("quiet_hours_start")
        end = prefs.get("quiet_hours_end")

        if start is None or end is None:
            return True  # No quiet hours configured

        current_hour = datetime.now().hour

        if start <= end:
            # Simple range (e.g., 22:00 to 06:00 means 22 to 6)
            return not (start <= current_hour < end)
        else:
            # Range spans midnight (e.g., 22 to 6)
            return not (current_hour >= start or current_hour < end)

    def set_user_quiet_hours(
        self,
        user_id: int,
        start_hour: Optional[int],
        end_hour: Optional[int],
    ) -> bool:
        """
        Set user's quiet hours.

        Args:
            user_id: User ID
            start_hour: Start hour (0-23) or None to disable
            end_hour: End hour (0-23) or None to disable

        Returns:
            True if updated successfully
        """
        return self.update_user_channel_preferences(
            user_id=user_id,
            quiet_hours_start=start_hour,
            quiet_hours_end=end_hour,
        )

    def get_user_channel_preferences(self, user_id: int) -> Dict[str, Any]:
        """
        Get user's channel preferences.

        Args:
            user_id: User ID

        Returns:
            Dict with channel preferences
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM notification_channel_preferences WHERE user_id = ?
                """,
                (user_id,),
            )
            row = cursor.fetchone()

            if not row:
                # Return defaults
                return {
                    "in_app_enabled": True,
                    "push_enabled": False,
                    "telegram_enabled": False,
                    "telegram_chat_id": None,
                    "discord_enabled": False,
                    "discord_webhook_url": None,
                    "email_digest_enabled": False,
                    "email_digest_frequency": "daily",
                    "quiet_hours_start": None,
                    "quiet_hours_end": None,
                }

            return {
                "in_app_enabled": bool(row["in_app_enabled"]),
                "push_enabled": bool(row["push_enabled"]),
                "telegram_enabled": bool(row["telegram_enabled"]),
                "telegram_chat_id": row["telegram_chat_id"],
                "discord_enabled": bool(row["discord_enabled"]),
                "discord_webhook_url": row["discord_webhook_url"],
                "email_digest_enabled": bool(row["email_digest_enabled"]),
                "email_digest_frequency": row["email_digest_frequency"] or "daily",
                "quiet_hours_start": row["quiet_hours_start"],
                "quiet_hours_end": row["quiet_hours_end"],
            }

        finally:
            conn.close()

    def update_user_channel_preferences(
        self,
        user_id: int,
        **kwargs,
    ) -> bool:
        """
        Update user's channel preferences.

        Args:
            user_id: User ID
            **kwargs: Preference fields to update:
                - in_app_enabled: bool
                - push_enabled: bool
                - telegram_enabled: bool
                - telegram_chat_id: str
                - discord_enabled: bool
                - discord_webhook_url: str
                - email_digest_enabled: bool
                - email_digest_frequency: str
                - quiet_hours_start: int
                - quiet_hours_end: int

        Returns:
            True if updated successfully
        """
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            now = int(time.time())

            # Check if row exists
            cursor.execute(
                "SELECT id FROM notification_channel_preferences WHERE user_id = ?",
                (user_id,),
            )
            existing = cursor.fetchone()

            if existing:
                # Build dynamic UPDATE
                updates = []
                params = []

                field_mapping = {
                    "in_app_enabled": ("in_app_enabled", lambda x: 1 if x else 0),
                    "push_enabled": ("push_enabled", lambda x: 1 if x else 0),
                    "telegram_enabled": ("telegram_enabled", lambda x: 1 if x else 0),
                    "telegram_chat_id": ("telegram_chat_id", str),
                    "discord_enabled": ("discord_enabled", lambda x: 1 if x else 0),
                    "discord_webhook_url": ("discord_webhook_url", str),
                    "email_digest_enabled": ("email_digest_enabled", lambda x: 1 if x else 0),
                    "email_digest_frequency": ("email_digest_frequency", str),
                    "quiet_hours_start": ("quiet_hours_start", lambda x: x),
                    "quiet_hours_end": ("quiet_hours_end", lambda x: x),
                }

                for key, (column, converter) in field_mapping.items():
                    if key in kwargs:
                        value = kwargs[key]
                        updates.append(f"{column} = ?")
                        params.append(converter(value) if value is not None else None)

                if updates:
                    updates.append("updated_at = ?")
                    params.append(now)
                    params.append(user_id)

                    query = f"UPDATE notification_channel_preferences SET {', '.join(updates)} WHERE user_id = ?"  # nosec B608
                    cursor.execute(query, params)

            else:
                # INSERT new row
                cursor.execute(
                    """
                    INSERT INTO notification_channel_preferences (
                        user_id, in_app_enabled, push_enabled,
                        telegram_enabled, telegram_chat_id,
                        discord_enabled, discord_webhook_url,
                        email_digest_enabled, email_digest_frequency,
                        quiet_hours_start, quiet_hours_end,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        1 if kwargs.get("in_app_enabled", True) else 0,
                        1 if kwargs.get("push_enabled", False) else 0,
                        1 if kwargs.get("telegram_enabled", False) else 0,
                        kwargs.get("telegram_chat_id"),
                        1 if kwargs.get("discord_enabled", False) else 0,
                        kwargs.get("discord_webhook_url"),
                        1 if kwargs.get("email_digest_enabled", False) else 0,
                        kwargs.get("email_digest_frequency", "daily"),
                        kwargs.get("quiet_hours_start"),
                        kwargs.get("quiet_hours_end"),
                        now,
                        now,
                    ),
                )

            conn.commit()
            logger.info(f"Updated channel preferences for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to update channel preferences: {e}")
            return False
        finally:
            conn.close()
