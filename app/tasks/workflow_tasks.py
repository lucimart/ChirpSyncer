"""
Workflow Tasks - Celery tasks for workflow execution.

Handles executing workflows, processing events, and checking scheduled workflows.
"""

from typing import Any, Dict, List

from app.core.celery_app import celery_app
from app.core.logger import setup_logger

logger = setup_logger(__name__)


@celery_app.task(bind=True)
def execute_workflow(
    self, workflow_id: int, trigger_data: dict, db_path: str = "chirpsyncer.db"
) -> dict:
    """
    Execute a workflow with given trigger data.

    Runs all actions defined in the workflow sequentially.

    Args:
        workflow_id: ID of the workflow to execute
        trigger_data: Data from the trigger that initiated execution
        db_path: Path to the SQLite database

    Returns:
        Dict with success status, run_id, and action results
    """
    from app.features.workflows.engine import WorkflowEngine
    from app.features.workflows.models import WorkflowManager

    logger.info(f"Executing workflow {workflow_id} with trigger data: {trigger_data}")

    try:
        engine = WorkflowEngine(db_path=db_path)
        manager = WorkflowManager(db_path=db_path)

        # Get workflow
        workflow = manager.get_workflow(workflow_id)
        if not workflow:
            error_msg = f"Workflow not found: {workflow_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        if not workflow.get("is_active"):
            error_msg = f"Workflow is not active: {workflow_id}"
            logger.warning(error_msg)
            return {"success": False, "error": error_msg}

        # Execute workflow
        result = engine.execute_workflow(workflow, trigger_data)

        logger.info(
            f"Workflow {workflow_id} execution completed: "
            f"success={result.get('success')}, run_id={result.get('run_id')}"
        )

        return result

    except Exception as exc:
        logger.error(f"Workflow execution failed for {workflow_id}: {exc}")
        return {"success": False, "error": str(exc)}


@celery_app.task(bind=True)
def check_scheduled_workflows(self, db_path: str = "chirpsyncer.db") -> dict:
    """
    Check and run scheduled workflows.

    Called periodically by Celery beat to check for workflows with
    schedule triggers that should run.

    Args:
        db_path: Path to the SQLite database

    Returns:
        Dict with workflows checked and triggered counts
    """
    import sqlite3
    import time
    import json

    logger.info("Checking scheduled workflows")

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get all active workflows with schedule triggers
        cursor.execute("""
            SELECT id, user_id, trigger_config, last_run_at
            FROM workflows
            WHERE is_active = 1
        """)
        rows = cursor.fetchall()
        conn.close()

        checked_count = 0
        triggered_count = 0
        errors = []

        current_time = int(time.time())

        for row in rows:
            workflow_id = row["id"]
            trigger_config = json.loads(row["trigger_config"]) if row["trigger_config"] else {}

            # Only process schedule-type triggers
            if trigger_config.get("type") != "schedule":
                continue

            checked_count += 1

            try:
                # Check if workflow should run
                if _should_run_scheduled(trigger_config, row["last_run_at"], current_time):
                    # Queue workflow execution
                    trigger_data = {
                        "trigger_type": "schedule",
                        "scheduled_at": current_time,
                    }
                    execute_workflow.delay(workflow_id, trigger_data, db_path)
                    triggered_count += 1

                    logger.info(f"Triggered scheduled workflow {workflow_id}")

            except Exception as e:
                errors.append(f"Workflow {workflow_id}: {str(e)}")
                logger.error(f"Error checking workflow {workflow_id}: {e}")

        logger.info(
            f"Scheduled workflow check complete: "
            f"{checked_count} checked, {triggered_count} triggered"
        )

        return {
            "success": True,
            "checked_count": checked_count,
            "triggered_count": triggered_count,
            "errors": errors if errors else None,
        }

    except Exception as exc:
        logger.error(f"Scheduled workflow check failed: {exc}")
        return {"success": False, "error": str(exc)}


@celery_app.task(bind=True)
def process_event(self, event: dict, db_path: str = "chirpsyncer.db") -> dict:
    """
    Process an event through all matching workflows.

    Evaluates the event against all active workflow triggers and
    executes matching workflows.

    Args:
        event: Event data with type, platform, and other context
        db_path: Path to the SQLite database

    Returns:
        Dict with matching workflows and execution results
    """
    from app.features.workflows.engine import WorkflowEngine

    event_type = event.get("event_type", "unknown")
    logger.info(f"Processing event: {event_type}")

    try:
        engine = WorkflowEngine(db_path=db_path)

        # Process event through all matching workflows
        results = engine.process_event(event)

        successful = sum(1 for r in results if r.get("success"))
        failed = len(results) - successful

        logger.info(
            f"Event processing complete: {len(results)} workflows matched, "
            f"{successful} succeeded, {failed} failed"
        )

        return {
            "success": True,
            "event_type": event_type,
            "workflows_matched": len(results),
            "workflows_succeeded": successful,
            "workflows_failed": failed,
            "results": results,
        }

    except Exception as exc:
        logger.error(f"Event processing failed: {exc}")
        return {"success": False, "error": str(exc), "event_type": event_type}


def _should_run_scheduled(
    trigger_config: dict, last_run_at: int, current_time: int
) -> bool:
    """
    Determine if a scheduled workflow should run.

    Args:
        trigger_config: Trigger configuration with schedule settings
        last_run_at: Unix timestamp of last run (or None)
        current_time: Current Unix timestamp

    Returns:
        True if workflow should run
    """
    schedule_type = trigger_config.get("schedule_type", "interval")

    if schedule_type == "interval":
        # Interval-based scheduling (e.g., every 1 hour)
        interval_seconds = trigger_config.get("interval_seconds", 3600)

        if last_run_at is None:
            return True

        return (current_time - last_run_at) >= interval_seconds

    elif schedule_type == "cron":
        # Cron-based scheduling - simplified check
        # In production, use croniter library for accurate cron evaluation
        from datetime import datetime

        cron_expr = trigger_config.get("cron_expression", "")
        if not cron_expr:
            return False

        # Simple hourly/daily check for now
        # Real implementation would parse cron expression properly
        current_dt = datetime.utcfromtimestamp(current_time)

        if last_run_at is None:
            return True

        last_dt = datetime.utcfromtimestamp(last_run_at)

        # Check if we're in a new hour (simplified)
        if current_dt.hour != last_dt.hour:
            return True

        return False

    return False
