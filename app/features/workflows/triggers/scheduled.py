"""
Scheduled Trigger - Fires at scheduled times (cron-based).
"""

from typing import Any, Dict

from app.features.workflows.triggers.base import BaseTrigger


class ScheduledTrigger(BaseTrigger):
    """
    Trigger that fires at scheduled times.

    Config:
        schedule: Cron expression (e.g., "0 9 * * *" for 9 AM daily)
    """

    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if this is a scheduled event.

        Args:
            context: Event context

        Returns:
            True if this is a scheduled trigger event
        """
        return context.get("event_type") == "scheduled"

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract schedule data from context.

        Args:
            context: Event context

        Returns:
            Dict with schedule info
        """
        return {
            "schedule_id": context.get("schedule_id"),
            "scheduled_time": context.get("scheduled_time"),
            "workflow_id": context.get("workflow_id"),
        }

    @property
    def schedule(self) -> str:
        """Return the cron schedule expression."""
        return self.config.get("schedule", "")
