"""
Workflow Engine - Orchestrates workflow execution.

Evaluates triggers and executes actions for matching workflows.
"""

import logging
from typing import Any, Dict, List

from app.features.workflows.models import WorkflowManager
from app.features.workflows.triggers import get_trigger
from app.features.workflows.actions import get_action

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """
    Engine that orchestrates workflow execution.

    Evaluates incoming events against workflow triggers and
    executes matching workflows.
    """

    def __init__(self, db_path: str = "chirpsyncer.db"):
        """
        Initialize WorkflowEngine.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.manager = WorkflowManager(db_path=db_path)

    def evaluate_triggers(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Find workflows whose triggers match an event.

        Args:
            event: Event data (event_type, platform, etc.)

        Returns:
            List of matching workflow dicts
        """
        matching = []

        # Get all active workflows
        # Note: In production, we'd want to scope this to relevant users
        # For now, we check all active workflows
        conn = self.manager._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("""
                SELECT * FROM workflows WHERE is_active = 1
            """)
            rows = cursor.fetchall()
        finally:
            conn.close()

        for row in rows:
            workflow = self.manager._row_to_workflow(row)

            try:
                trigger_config = workflow["trigger_config"]
                trigger_type = trigger_config.get("type")

                if not trigger_type:
                    continue

                trigger = get_trigger(trigger_type, trigger_config)

                if trigger.check(event):
                    matching.append(workflow)

            except Exception as e:
                logger.error(
                    f"Error evaluating trigger for workflow {workflow['id']}: {e}"
                )

        return matching

    def execute_workflow(
        self,
        workflow: Dict[str, Any],
        trigger_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute a workflow with given trigger data.

        Args:
            workflow: Workflow dict
            trigger_data: Data from the trigger

        Returns:
            Dict with success status, run_id, and action results
        """
        workflow_id = workflow["id"]
        actions_config = workflow["actions_config"]

        # Create run record
        run_id = self.manager.create_run(workflow_id, trigger_data)

        context = {**trigger_data}
        actions_completed = []
        error_message = None
        all_success = True

        try:
            for action_config in actions_config:
                action_type = action_config.get("type")

                if not action_type:
                    continue

                result = self._execute_action(action_config, context)

                actions_completed.append({
                    "action": action_type,
                    "success": result.get("success", False),
                    "result": result,
                })

                # Update context with action results for chaining
                context[f"{action_type}_result"] = result

                if not result.get("success"):
                    all_success = False
                    # Continue executing other actions or stop?
                    # For now, continue to allow partial success

        except Exception as e:
            all_success = False
            error_message = str(e)
            logger.error(f"Error executing workflow {workflow_id}: {e}")

        # Update run record
        status = "completed" if all_success else "failed"
        self.manager.update_run(
            run_id,
            status=status,
            actions_completed=actions_completed,
            error_message=error_message,
        )

        # Increment workflow run count
        self.manager.increment_run_count(workflow_id)

        return {
            "success": all_success,
            "run_id": run_id,
            "actions_completed": actions_completed,
            "error": error_message,
        }

    def _execute_action(
        self,
        action_config: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute a single action.

        Args:
            action_config: Action configuration
            context: Workflow context

        Returns:
            Action result dict
        """
        action_type = action_config.get("type")

        # Remove 'type' from config to pass only action-specific settings
        config = {k: v for k, v in action_config.items() if k != "type"}

        action = get_action(action_type, config)
        return action.execute(context)

    def process_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process an event through all matching workflows.

        Args:
            event: Event data

        Returns:
            List of execution results
        """
        results = []

        matching_workflows = self.evaluate_triggers(event)

        for workflow in matching_workflows:
            try:
                # Get trigger data
                trigger_config = workflow["trigger_config"]
                trigger_type = trigger_config.get("type")
                trigger = get_trigger(trigger_type, trigger_config)
                trigger_data = trigger.get_data(event)

                # Execute workflow
                result = self.execute_workflow(workflow, trigger_data)
                result["workflow_id"] = workflow["id"]
                result["workflow_name"] = workflow["name"]
                results.append(result)

            except Exception as e:
                logger.error(f"Error processing workflow {workflow['id']}: {e}")
                results.append({
                    "workflow_id": workflow["id"],
                    "workflow_name": workflow["name"],
                    "success": False,
                    "error": str(e),
                })

        return results

    def test_workflow(
        self,
        workflow_id: int,
        sample_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Test a workflow with sample data without recording the run.

        Args:
            workflow_id: Workflow ID to test
            sample_data: Sample trigger data

        Returns:
            Dict with test results
        """
        workflow = self.manager.get_workflow(workflow_id)

        if not workflow:
            return {
                "success": False,
                "error": "Workflow not found",
            }

        # Execute without incrementing run count
        context = {**sample_data}
        actions_results = []
        all_success = True

        try:
            for action_config in workflow["actions_config"]:
                action_type = action_config.get("type")

                if not action_type:
                    continue

                result = self._execute_action(action_config, context)

                actions_results.append({
                    "action": action_type,
                    "success": result.get("success", False),
                    "result": result,
                })

                context[f"{action_type}_result"] = result

                if not result.get("success"):
                    all_success = False

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

        return {
            "success": all_success,
            "test_mode": True,
            "actions_results": actions_results,
        }
