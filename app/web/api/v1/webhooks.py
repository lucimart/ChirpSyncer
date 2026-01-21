"""
Webhooks API - CRUD endpoints for webhook management.

Endpoints:
- POST   /api/v1/webhooks           - Create webhook
- GET    /api/v1/webhooks           - List webhooks
- GET    /api/v1/webhooks/:id       - Get webhook
- PUT    /api/v1/webhooks/:id       - Update webhook
- DELETE /api/v1/webhooks/:id       - Delete webhook
- POST   /api/v1/webhooks/:id/regenerate-secret - Regenerate secret
- GET    /api/v1/webhooks/:id/deliveries - List deliveries
- POST   /api/v1/webhooks/:id/test  - Send test webhook
"""

from flask import Blueprint, g, request

from app.auth.api_auth import require_auth
from app.services.webhooks import WebhookService
from app.web.api.v1.responses import api_error, api_response

webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/webhooks")


def _get_service() -> WebhookService:
    """Get webhook service instance."""
    db_path = getattr(g, "db_path", "chirpsyncer.db")
    return WebhookService(db_path=db_path)


def _format_webhook(webhook: dict, include_secret: bool = False) -> dict:
    """Format webhook for API response."""
    result = {
        "id": webhook["id"],
        "url": webhook["url"],
        "events": webhook["events"],
        "name": webhook["name"],
        "enabled": webhook["enabled"],
        "created_at": webhook["created_at"],
        "updated_at": webhook["updated_at"],
    }
    if include_secret:
        result["secret"] = webhook["secret"]
    return result


def _format_delivery(delivery: dict) -> dict:
    """Format delivery for API response."""
    return {
        "id": delivery["id"],
        "event_type": delivery["event_type"],
        "payload": delivery["payload"],
        "status_code": delivery["status_code"],
        "success": delivery["success"],
        "error": delivery["error"],
        "attempt": delivery["attempt"],
        "created_at": delivery["created_at"],
    }


# Valid event types
VALID_EVENTS = [
    "sync.started",
    "sync.progress",
    "sync.completed",
    "sync.failed",
    "cleanup.started",
    "cleanup.progress",
    "cleanup.completed",
    "cleanup.failed",
    "scheduled.posted",
    "scheduled.failed",
]


@webhooks_bp.route("", methods=["POST"])
@require_auth
def create_webhook():
    """
    Create a new webhook.

    Request body:
    {
        "url": "https://example.com/webhook",
        "events": ["sync.completed", "cleanup.completed"],
        "name": "My Webhook"  // optional
    }

    Returns:
        201: Created webhook (includes secret - only shown once!)
        400: Invalid request
    """
    data = request.get_json() or {}

    # Validate required fields
    url = data.get("url")
    if not url:
        return api_error("VALIDATION_ERROR", "url is required", status=400)

    if not url.startswith(("http://", "https://")):
        return api_error(
            "VALIDATION_ERROR", "url must be a valid HTTP(S) URL", status=400
        )

    events = data.get("events")
    if not events or not isinstance(events, list):
        return api_error(
            "VALIDATION_ERROR", "events must be a non-empty array", status=400
        )

    # Validate event types
    invalid_events = [e for e in events if e not in VALID_EVENTS]
    if invalid_events:
        return api_error(
            "VALIDATION_ERROR",
            f"Invalid event types: {', '.join(invalid_events)}. Valid types: {', '.join(VALID_EVENTS)}",
            status=400,
        )

    name = data.get("name")

    service = _get_service()
    webhook = service.create_webhook(
        user_id=g.user.id,
        url=url,
        events=events,
        name=name,
    )

    # Include secret in creation response (only time it's shown)
    return api_response(_format_webhook(webhook, include_secret=True), status=201)


@webhooks_bp.route("", methods=["GET"])
@require_auth
def list_webhooks():
    """
    List all webhooks for the current user.

    Returns:
        200: List of webhooks (secrets not included)
    """
    service = _get_service()
    webhooks = service.list_webhooks(user_id=g.user.id)

    return api_response(
        {
            "webhooks": [_format_webhook(w) for w in webhooks],
            "count": len(webhooks),
        }
    )


@webhooks_bp.route("/<int:webhook_id>", methods=["GET"])
@require_auth
def get_webhook(webhook_id: int):
    """
    Get a specific webhook.

    Returns:
        200: Webhook details (secret not included)
        404: Webhook not found
    """
    service = _get_service()
    webhook = service.get_webhook(webhook_id, user_id=g.user.id)

    if not webhook:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    return api_response(_format_webhook(webhook))


@webhooks_bp.route("/<int:webhook_id>", methods=["PUT"])
@require_auth
def update_webhook(webhook_id: int):
    """
    Update a webhook.

    Request body (all fields optional):
    {
        "url": "https://new-url.com/webhook",
        "events": ["sync.completed"],
        "name": "New Name",
        "enabled": false
    }

    Returns:
        200: Updated webhook
        404: Webhook not found
    """
    data = request.get_json() or {}

    # Validate URL if provided
    url = data.get("url")
    if url is not None and not url.startswith(("http://", "https://")):
        return api_error(
            "VALIDATION_ERROR", "url must be a valid HTTP(S) URL", status=400
        )

    # Validate events if provided
    events = data.get("events")
    if events is not None:
        if not isinstance(events, list) or len(events) == 0:
            return api_error(
                "VALIDATION_ERROR", "events must be a non-empty array", status=400
            )

        invalid_events = [e for e in events if e not in VALID_EVENTS]
        if invalid_events:
            return api_error(
                "VALIDATION_ERROR",
                f"Invalid event types: {', '.join(invalid_events)}",
                status=400,
            )

    service = _get_service()
    webhook = service.update_webhook(
        webhook_id=webhook_id,
        user_id=g.user.id,
        url=url,
        events=events,
        name=data.get("name"),
        enabled=data.get("enabled"),
    )

    if not webhook:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    return api_response(_format_webhook(webhook))


@webhooks_bp.route("/<int:webhook_id>", methods=["DELETE"])
@require_auth
def delete_webhook(webhook_id: int):
    """
    Delete a webhook.

    Returns:
        200: Success message
        404: Webhook not found
    """
    service = _get_service()
    deleted = service.delete_webhook(webhook_id, user_id=g.user.id)

    if not deleted:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    return api_response({"message": "Webhook deleted"})


@webhooks_bp.route("/<int:webhook_id>/regenerate-secret", methods=["POST"])
@require_auth
def regenerate_secret(webhook_id: int):
    """
    Regenerate webhook secret.

    Returns:
        200: Updated webhook with new secret
        404: Webhook not found
    """
    service = _get_service()
    webhook = service.regenerate_secret(webhook_id, user_id=g.user.id)

    if not webhook:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    # Include new secret in response
    return api_response(_format_webhook(webhook, include_secret=True))


@webhooks_bp.route("/<int:webhook_id>/deliveries", methods=["GET"])
@require_auth
def list_deliveries(webhook_id: int):
    """
    List delivery history for a webhook.

    Query params:
    - limit: Max results (default 50, max 100)

    Returns:
        200: List of deliveries
        404: Webhook not found
    """
    # Validate webhook exists and is owned by user
    service = _get_service()
    webhook = service.get_webhook(webhook_id, user_id=g.user.id)

    if not webhook:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    limit = min(int(request.args.get("limit", 50)), 100)
    deliveries = service.list_deliveries(webhook_id, user_id=g.user.id, limit=limit)

    return api_response(
        {
            "deliveries": [_format_delivery(d) for d in deliveries],
            "count": len(deliveries),
        }
    )


@webhooks_bp.route("/<int:webhook_id>/test", methods=["POST"])
@require_auth
def test_webhook(webhook_id: int):
    """
    Send a test webhook delivery.

    Returns:
        200: Test result
        404: Webhook not found
    """
    service = _get_service()
    webhook = service.get_webhook(webhook_id, user_id=g.user.id)

    if not webhook:
        return api_error("NOT_FOUND", "Webhook not found", status=404)

    # Send test payload
    test_payload = {
        "test": True,
        "message": "This is a test webhook delivery from ChirpSyncer",
    }

    # Use first subscribed event type for test
    event_type = webhook["events"][0] if webhook["events"] else "test"

    result = service.dispatch(
        webhook_id=webhook_id,
        event_type=event_type,
        payload=test_payload,
        max_retries=1,  # Only one attempt for test
    )

    return api_response(
        {
            "success": result.get("success", False),
            "status_code": result.get("status_code"),
            "error": result.get("error"),
            "skipped": result.get("skipped", False),
            "reason": result.get("reason"),
        }
    )


@webhooks_bp.route("/events", methods=["GET"])
@require_auth
def list_event_types():
    """
    List available webhook event types.

    Returns:
        200: List of valid event types
    """
    return api_response(
        {
            "events": VALID_EVENTS,
        }
    )
