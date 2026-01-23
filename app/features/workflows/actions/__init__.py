"""
Workflow Actions.

Actions are executed when a workflow's trigger conditions are met.
"""

from app.features.workflows.actions.base import BaseAction
from app.features.workflows.actions.cross_post import CrossPostAction
from app.features.workflows.actions.send_notification import SendNotificationAction
from app.features.workflows.actions.transform_content import TransformContentAction
from app.features.workflows.actions.add_to_queue import AddToQueueAction

ACTION_REGISTRY = {
    "cross_post": CrossPostAction,
    "send_notification": SendNotificationAction,
    "transform_content": TransformContentAction,
    "add_to_queue": AddToQueueAction,
}


def get_action(action_type: str, config: dict) -> BaseAction:
    """Get an action instance by type."""
    action_class = ACTION_REGISTRY.get(action_type)
    if not action_class:
        raise ValueError(f"Unknown action type: {action_type}")
    return action_class(config=config)


__all__ = [
    "BaseAction",
    "CrossPostAction",
    "SendNotificationAction",
    "TransformContentAction",
    "AddToQueueAction",
    "ACTION_REGISTRY",
    "get_action",
]
