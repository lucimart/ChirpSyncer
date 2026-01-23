"""
Notifications Hub - Centralized notification system for ChirpSyncer.

Provides multi-channel notifications (in-app, Telegram, Discord, email digest)
with user preferences, quiet hours, and priority-based delivery.
"""

from app.features.notifications.models import (
    Notification,
    NotificationCategory,
    NotificationPriority,
    init_notifications_hub_db,
)
from app.features.notifications.dispatcher import NotificationDispatcher

__all__ = [
    "Notification",
    "NotificationCategory",
    "NotificationPriority",
    "NotificationDispatcher",
    "init_notifications_hub_db",
]
