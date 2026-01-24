"""
Base Action class for workflow automation.

All actions must inherit from this class.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAction(ABC):
    """
    Base class for workflow actions.

    Actions are executed when a workflow's trigger conditions are met.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize action with configuration.

        Args:
            config: Action-specific configuration
        """
        self.config = config

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the action.

        Args:
            context: Workflow context with trigger data and previous action results

        Returns:
            Dict with execution result including 'success' boolean
        """
        pass

    @property
    def action_type(self) -> str:
        """Return the action type identifier."""
        return self.__class__.__name__.replace("Action", "").lower()

    def validate_config(self) -> bool:
        """
        Validate action configuration.

        Returns:
            True if config is valid
        """
        return True
