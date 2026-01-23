from celery import Celery
from celery.schedules import crontab

from app.core import config

celery_app = Celery(
    "chirpsyncer",
    broker=config.CELERY_BROKER_URL,
    backend=config.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "weekly-report-monday-9am": {
        "task": "app.tasks.notification_tasks.send_weekly_reports",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),  # Monday 9 AM UTC
    },
    "check-scheduled-workflows-every-5-min": {
        "task": "app.tasks.workflow_tasks.check_scheduled_workflows",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
    "publish-scheduled-content-every-minute": {
        "task": "app.tasks.atomization_tasks.publish_scheduled_content",
        "schedule": crontab(minute="*"),  # Every minute
    },
}

celery_app.autodiscover_tasks(["app.tasks"])
