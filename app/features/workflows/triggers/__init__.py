"""
Workflow Triggers.

Triggers determine when a workflow should execute.
"""

from app.features.workflows.triggers.base import BaseTrigger
from app.features.workflows.triggers.new_post import NewPostTrigger
from app.features.workflows.triggers.viral_post import ViralPostTrigger
from app.features.workflows.triggers.new_mention import NewMentionTrigger
from app.features.workflows.triggers.scheduled import ScheduledTrigger
from app.features.workflows.triggers.webhook import WebhookTrigger
from app.features.workflows.triggers.rss import RSSTrigger

TRIGGER_REGISTRY = {
    "new_post": NewPostTrigger,
    "viral_post": ViralPostTrigger,
    "new_mention": NewMentionTrigger,
    "scheduled": ScheduledTrigger,
    "webhook": WebhookTrigger,
    "rss": RSSTrigger,
}


def get_trigger(trigger_type: str, config: dict) -> BaseTrigger:
    """Get a trigger instance by type."""
    trigger_class = TRIGGER_REGISTRY.get(trigger_type)
    if not trigger_class:
        raise ValueError(f"Unknown trigger type: {trigger_type}")
    return trigger_class(config=config)


__all__ = [
    "BaseTrigger",
    "NewPostTrigger",
    "ViralPostTrigger",
    "NewMentionTrigger",
    "ScheduledTrigger",
    "WebhookTrigger",
    "RSSTrigger",
    "TRIGGER_REGISTRY",
    "get_trigger",
]
