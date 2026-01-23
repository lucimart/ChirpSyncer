"""
Workflows API v1 Blueprint

Provides endpoints for workflow automation management.
"""

from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.workflows.models import WorkflowManager
from app.features.workflows.engine import WorkflowEngine
from app.web.api.v1.responses import api_error, api_response

workflows_bp = Blueprint("workflows", __name__, url_prefix="/workflows")


def _get_manager() -> WorkflowManager:
    """Get WorkflowManager instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return WorkflowManager(db_path=db_path)


def _get_engine() -> WorkflowEngine:
    """Get WorkflowEngine instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return WorkflowEngine(db_path=db_path)


def _format_workflow(workflow: dict) -> dict:
    """Format workflow for API response."""
    return {
        "id": workflow["id"],
        "name": workflow["name"],
        "description": workflow.get("description"),
        "is_active": bool(workflow["is_active"]),
        "trigger": workflow["trigger_config"],
        "actions": workflow["actions_config"],
        "run_count": workflow["run_count"],
        "last_run_at": datetime.fromtimestamp(workflow["last_run_at"]).isoformat()
        if workflow["last_run_at"]
        else None,
        "created_at": datetime.fromtimestamp(workflow["created_at"]).isoformat(),
        "updated_at": datetime.fromtimestamp(workflow["updated_at"]).isoformat(),
    }


def _format_run(run: dict) -> dict:
    """Format workflow run for API response."""
    return {
        "id": run["id"],
        "workflow_id": run["workflow_id"],
        "status": run["status"],
        "trigger_data": run["trigger_data"],
        "actions_completed": run["actions_completed"],
        "error_message": run["error_message"],
        "started_at": datetime.fromtimestamp(run["started_at"]).isoformat(),
        "completed_at": datetime.fromtimestamp(run["completed_at"]).isoformat()
        if run["completed_at"]
        else None,
    }


@workflows_bp.route("", methods=["GET"])
@require_auth
def list_workflows():
    """List workflows for the current user."""
    manager = _get_manager()
    active_only = request.args.get("active_only", "false").lower() == "true"

    workflows = manager.list_workflows(user_id=g.user.id, active_only=active_only)

    return api_response({
        "workflows": [_format_workflow(w) for w in workflows],
        "total": len(workflows),
    })


@workflows_bp.route("", methods=["POST"])
@require_auth
def create_workflow():
    """Create a new workflow."""
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    description = data.get("description", "").strip() or None
    trigger = data.get("trigger")
    actions = data.get("actions")

    # Validation
    if not name:
        return api_error("INVALID_REQUEST", "name is required", status=400)

    if not trigger:
        return api_error("INVALID_REQUEST", "trigger is required", status=400)

    if not actions or not isinstance(actions, list):
        return api_error("INVALID_REQUEST", "actions must be a non-empty list", status=400)

    # Validate trigger has type
    if not trigger.get("type"):
        return api_error("INVALID_REQUEST", "trigger.type is required", status=400)

    # Validate actions have types
    for i, action in enumerate(actions):
        if not action.get("type"):
            return api_error(
                "INVALID_REQUEST", f"actions[{i}].type is required", status=400
            )

    manager = _get_manager()

    workflow_id = manager.create_workflow(
        user_id=g.user.id,
        name=name,
        description=description,
        trigger_config=trigger,
        actions_config=actions,
    )

    workflow = manager.get_workflow(workflow_id)

    return api_response(_format_workflow(workflow), status=201)


@workflows_bp.route("/<int:workflow_id>", methods=["GET"])
@require_auth
def get_workflow(workflow_id: int):
    """Get a specific workflow."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    # Verify ownership
    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    return api_response(_format_workflow(workflow))


@workflows_bp.route("/<int:workflow_id>", methods=["PUT"])
@require_auth
def update_workflow(workflow_id: int):
    """Update a workflow."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    data = request.get_json(silent=True) or {}

    # Extract updateable fields
    updates = {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return api_error("INVALID_REQUEST", "name cannot be empty", status=400)
        updates["name"] = name

    if "description" in data:
        updates["description"] = data["description"].strip() or None

    if "trigger" in data:
        trigger = data["trigger"]
        if not trigger.get("type"):
            return api_error("INVALID_REQUEST", "trigger.type is required", status=400)
        updates["trigger_config"] = trigger

    if "actions" in data:
        actions = data["actions"]
        if not actions or not isinstance(actions, list):
            return api_error(
                "INVALID_REQUEST", "actions must be a non-empty list", status=400
            )
        for i, action in enumerate(actions):
            if not action.get("type"):
                return api_error(
                    "INVALID_REQUEST", f"actions[{i}].type is required", status=400
                )
        updates["actions_config"] = actions

    if updates:
        manager.update_workflow(workflow_id, **updates)

    updated = manager.get_workflow(workflow_id)
    return api_response(_format_workflow(updated))


@workflows_bp.route("/<int:workflow_id>", methods=["DELETE"])
@require_auth
def delete_workflow(workflow_id: int):
    """Delete a workflow."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    manager.delete_workflow(workflow_id)

    return api_response({"success": True})


@workflows_bp.route("/<int:workflow_id>/toggle", methods=["POST"])
@require_auth
def toggle_workflow(workflow_id: int):
    """Toggle workflow active status."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    manager.toggle_workflow(workflow_id)

    updated = manager.get_workflow(workflow_id)
    return api_response(_format_workflow(updated))


@workflows_bp.route("/<int:workflow_id>/runs", methods=["GET"])
@require_auth
def get_workflow_runs(workflow_id: int):
    """Get workflow run history."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    # Pagination
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))

    runs = manager.get_runs(workflow_id, limit=limit, offset=offset)

    return api_response({
        "runs": [_format_run(r) for r in runs],
        "total": len(runs),
        "limit": limit,
        "offset": offset,
    })


@workflows_bp.route("/<int:workflow_id>/test", methods=["POST"])
@require_auth
def test_workflow(workflow_id: int):
    """Test run a workflow with sample data."""
    manager = _get_manager()
    workflow = manager.get_workflow(workflow_id)

    if not workflow:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    if workflow["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Workflow not found", status=404)

    data = request.get_json(silent=True) or {}
    sample_data = data.get("sample_data", {})

    # Add user_id to context for actions that need it
    sample_data["user_id"] = g.user.id

    engine = _get_engine()
    result = engine.test_workflow(workflow_id, sample_data)

    return api_response(result)
