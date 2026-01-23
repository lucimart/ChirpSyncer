"""
Base Trigger class for workflow automation.

All triggers must inherit from this class.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseTrigger(ABC):
    """
    Base class for workflow triggers.

    Triggers determine when a workflow should execute based on events.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize trigger with configuration.

        Args:
            config: Trigger-specific configuration
        """
        self.config = config

    @abstractmethod
    def check(self, context: Dict[str, Any]) -> bool:
        """
        Check if trigger conditions are met.

        Args:
            context: Event context with relevant data

        Returns:
            True if trigger should fire, False otherwise
        """
        pass

    def get_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract relevant data from context for workflow execution.

        Args:
            context: Event context

        Returns:
            Dict with data to pass to workflow actions
        """
        return context.copy()

    @property
    def trigger_type(self) -> str:
        """Return the trigger type identifier."""
        return self.__class__.__name__.replace("Trigger", "").lower()
