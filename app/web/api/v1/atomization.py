"""
Atomization API v1 Blueprint.

Endpoints for content atomization - transforming content
into platform-specific formats.
"""

from datetime import datetime
from typing import Any, Dict

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.atomization.service import AtomizationService
from app.web.api.v1.responses import api_error, api_response

atomization_bp = Blueprint("atomization", __name__, url_prefix="/atomize")


def _get_service() -> AtomizationService:
    """Get AtomizationService instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return AtomizationService(db_path=db_path)


def _format_job(job) -> Dict[str, Any]:
    """Format job for API response."""
    return {
        "id": job.id,
        "source_type": job.source_type,
        "source_url": job.source_url,
        "status": job.status,
        "created_at": datetime.fromtimestamp(job.created_at).isoformat(),
        "completed_at": datetime.fromtimestamp(job.completed_at).isoformat()
        if job.completed_at
        else None,
        "error": job.error,
    }


def _format_output(output) -> Dict[str, Any]:
    """Format atomized content for API response."""
    return {
        "id": output.id,
        "job_id": output.job_id,
        "platform": output.platform,
        "format": output.format,
        "content": output.content,
        "media_urls": output.media_urls or [],
        "is_published": output.is_published,
        "scheduled_for": datetime.fromtimestamp(output.scheduled_for).isoformat()
        if output.scheduled_for
        else None,
        "published_at": datetime.fromtimestamp(output.published_at).isoformat()
        if output.published_at
        else None,
        "created_at": datetime.fromtimestamp(output.created_at).isoformat(),
    }


@atomization_bp.route("", methods=["POST"])
@require_auth
def create_atomization_job():
    """
    Start a new content atomization job.

    Request body:
    {
        "source_type": "youtube" | "blog" | "thread",
        "source_url": "https://...",  // For URL-based content
        "source_content": "..."       // For raw content
    }

    Returns:
    {
        "id": "job-uuid",
        "source_type": "youtube",
        "status": "pending",
        ...
    }
    """
    data = request.get_json(silent=True) or {}

    source_type = data.get("source_type")
    source_url = data.get("source_url")
    source_content = data.get("source_content")

    # Validation
    if not source_type:
        return api_error("INVALID_REQUEST", "source_type is required", status=400)

    valid_types = ["youtube", "video", "blog", "thread"]
    if source_type not in valid_types:
        return api_error(
            "INVALID_REQUEST",
            f"Invalid source_type. Must be one of: {', '.join(valid_types)}",
            status=400,
        )

    if not source_url and not source_content:
        return api_error(
            "INVALID_REQUEST",
            "Either source_url or source_content is required",
            status=400,
        )

    service = _get_service()

    try:
        job = service.create_job(
            user_id=g.user.id,
            source={
                "type": source_type,
                "url": source_url,
                "content": source_content,
            },
        )

        return api_response(_format_job(job), status=201)

    except Exception as e:
        current_app.logger.error(f"Error creating atomization job: {e}")
        return api_error("INTERNAL_ERROR", "Failed to create job", status=500)


@atomization_bp.route("/<job_id>", methods=["GET"])
@require_auth
def get_job_status(job_id: str):
    """
    Get atomization job status.

    Returns:
    {
        "id": "job-uuid",
        "source_type": "youtube",
        "status": "completed",
        ...
    }
    """
    service = _get_service()
    job = service.get_job(job_id)

    if not job:
        return api_error("NOT_FOUND", "Job not found", status=404)

    # Verify ownership
    if job.user_id != g.user.id:
        return api_error("NOT_FOUND", "Job not found", status=404)

    return api_response(_format_job(job))


@atomization_bp.route("/<job_id>/process", methods=["POST"])
@require_auth
def process_job(job_id: str):
    """
    Process an atomization job.

    Triggers the content transformation pipeline.

    Returns:
    {
        "job": {...},
        "outputs": [...]
    }
    """
    service = _get_service()
    job = service.get_job(job_id)

    if not job:
        return api_error("NOT_FOUND", "Job not found", status=404)

    if job.user_id != g.user.id:
        return api_error("NOT_FOUND", "Job not found", status=404)

    if job.status not in ("pending", "failed"):
        return api_error(
            "INVALID_REQUEST",
            f"Job cannot be processed (status: {job.status})",
            status=400,
        )

    try:
        outputs = service.process_job(job_id)

        # Get updated job
        updated_job = service.get_job(job_id)

        return api_response(
            {
                "job": _format_job(updated_job) if updated_job else None,
                "outputs": [_format_output(o) for o in outputs],
            }
        )

    except ValueError as e:
        return api_error("INVALID_REQUEST", str(e), status=400)
    except Exception as e:
        current_app.logger.error(f"Error processing job {job_id}: {e}")
        return api_error("INTERNAL_ERROR", "Failed to process job", status=500)


@atomization_bp.route("/<job_id>/outputs", methods=["GET"])
@require_auth
def get_job_outputs(job_id: str):
    """
    Get generated content for a job.

    Returns:
    {
        "outputs": [
            {
                "id": "...",
                "platform": "twitter",
                "content": "...",
                ...
            }
        ]
    }
    """
    service = _get_service()
    job = service.get_job(job_id)

    if not job:
        return api_error("NOT_FOUND", "Job not found", status=404)

    if job.user_id != g.user.id:
        return api_error("NOT_FOUND", "Job not found", status=404)

    outputs = service.get_job_outputs(job_id)

    return api_response({"outputs": [_format_output(o) for o in outputs]})


@atomization_bp.route("/<job_id>/publish", methods=["POST"])
@require_auth
def publish_outputs(job_id: str):
    """
    Publish selected outputs.

    Request body:
    {
        "output_ids": ["id1", "id2"]  // Optional, publishes all if not specified
    }

    Returns:
    {
        "published": ["id1", "id2"],
        "failed": []
    }
    """
    service = _get_service()
    job = service.get_job(job_id)

    if not job:
        return api_error("NOT_FOUND", "Job not found", status=404)

    if job.user_id != g.user.id:
        return api_error("NOT_FOUND", "Job not found", status=404)

    data = request.get_json(silent=True) or {}
    output_ids = data.get("output_ids")

    # Get outputs to publish
    all_outputs = service.get_job_outputs(job_id)

    if output_ids:
        outputs_to_publish = [o for o in all_outputs if o.id in output_ids]
    else:
        outputs_to_publish = [o for o in all_outputs if not o.is_published]

    published = []
    failed = []

    for output in outputs_to_publish:
        try:
            success = service.publish_output(output.id)
            if success:
                published.append(output.id)
            else:
                failed.append(output.id)
        except Exception as e:
            current_app.logger.error(f"Error publishing output {output.id}: {e}")
            failed.append(output.id)

    return api_response({"published": published, "failed": failed})


@atomization_bp.route("/<job_id>/schedule", methods=["POST"])
@require_auth
def schedule_outputs(job_id: str):
    """
    Schedule outputs for future publishing.

    Request body:
    {
        "schedules": [
            {"output_id": "id1", "scheduled_for": 1234567890},
            {"output_id": "id2", "scheduled_for": 1234567890}
        ]
    }

    Returns:
    {
        "scheduled": ["id1", "id2"],
        "failed": []
    }
    """
    service = _get_service()
    job = service.get_job(job_id)

    if not job:
        return api_error("NOT_FOUND", "Job not found", status=404)

    if job.user_id != g.user.id:
        return api_error("NOT_FOUND", "Job not found", status=404)

    data = request.get_json(silent=True) or {}
    schedules = data.get("schedules", [])

    if not schedules:
        return api_error("INVALID_REQUEST", "schedules is required", status=400)

    # Validate schedules belong to this job
    job_outputs = {o.id for o in service.get_job_outputs(job_id)}

    scheduled = []
    failed = []

    for schedule in schedules:
        output_id = schedule.get("output_id")
        scheduled_for = schedule.get("scheduled_for")

        if not output_id or not scheduled_for:
            failed.append(output_id or "unknown")
            continue

        if output_id not in job_outputs:
            failed.append(output_id)
            continue

        try:
            success = service.schedule_output(output_id, scheduled_for)
            if success:
                scheduled.append(output_id)
            else:
                failed.append(output_id)
        except Exception as e:
            current_app.logger.error(f"Error scheduling output {output_id}: {e}")
            failed.append(output_id)

    return api_response({"scheduled": scheduled, "failed": failed})


@atomization_bp.route("", methods=["GET"])
@require_auth
def list_jobs():
    """
    List atomization jobs for the current user.

    Query params:
    - status: Filter by status (pending, processing, completed, failed)
    - limit: Max number of jobs (default 50)

    Returns:
    {
        "jobs": [...]
    }
    """
    service = _get_service()

    status = request.args.get("status")
    limit = min(int(request.args.get("limit", 50)), 100)

    jobs = service.get_user_jobs(g.user.id, status=status, limit=limit)

    return api_response({"jobs": [_format_job(j) for j in jobs]})
