"""
API endpoints for notification settings.

Allows users to manage their notification preferences.
"""

import os
from flask import Blueprint, request, g

from app.auth.api_auth import require_auth
from app.web.api.v1.responses import api_response, api_error
from app.services.notification_preferences import NotificationPreferences
from app.services.notification_service import NotificationService
from app.core.logger import setup_logger

logger = setup_logger(__name__)

notification_settings_bp = Blueprint(
    "notification_settings", __name__, url_prefix="/settings"
)

DB_PATH = os.getenv("DB_PATH", "chirpsyncer.db")


def _get_preferences_manager() -> NotificationPreferences:
    """Get NotificationPreferences instance."""
    return NotificationPreferences(db_path=DB_PATH)


@notification_settings_bp.route("/notifications", methods=["GET"])
@require_auth
def get_notification_settings():
    """
    Get current user's notification preferences.

    Returns all notification settings with defaults applied.
    """
    prefs_manager = _get_preferences_manager()
    preferences = prefs_manager.get_preferences(g.user.id)

    return api_response({
        "preferences": preferences,
        "notification_types": NotificationPreferences.NOTIFICATION_TYPES,
    })


@notification_settings_bp.route("/notifications", methods=["PATCH"])
@require_auth
def update_notification_settings():
    """
    Update current user's notification preferences.

    Accepts partial updates - only provided fields are updated.

    Request body (all fields optional):
    {
        "email_enabled": bool,
        "inapp_enabled": bool,
        "digest_frequency": "immediate" | "daily" | "weekly",
        "quiet_hours_start": int (0-23) | null,
        "quiet_hours_end": int (0-23) | null,
        "email_types": {
            "sync_complete": bool,
            "sync_failed": bool,
            "weekly_report": bool,
            "rate_limit": bool,
            "credential_expired": bool
        },
        "inapp_types": { ... same as email_types ... }
    }
    """
    data = request.get_json(silent=True) or {}

    # Validate fields
    valid_frequencies = ["immediate", "daily", "weekly"]
    if "digest_frequency" in data:
        if data["digest_frequency"] not in valid_frequencies:
            return api_error(
                "INVALID_REQUEST",
                f"digest_frequency must be one of: {', '.join(valid_frequencies)}",
                status=400,
            )

    if "quiet_hours_start" in data:
        val = data["quiet_hours_start"]
        if val is not None and (not isinstance(val, int) or val < 0 or val > 23):
            return api_error(
                "INVALID_REQUEST",
                "quiet_hours_start must be an integer 0-23 or null",
                status=400,
            )

    if "quiet_hours_end" in data:
        val = data["quiet_hours_end"]
        if val is not None and (not isinstance(val, int) or val < 0 or val > 23):
            return api_error(
                "INVALID_REQUEST",
                "quiet_hours_end must be an integer 0-23 or null",
                status=400,
            )

    # Validate type dicts
    valid_types = set(NotificationPreferences.NOTIFICATION_TYPES)
    for types_key in ["email_types", "inapp_types"]:
        if types_key in data:
            if not isinstance(data[types_key], dict):
                return api_error(
                    "INVALID_REQUEST",
                    f"{types_key} must be an object",
                    status=400,
                )
            for key in data[types_key]:
                if key not in valid_types:
                    return api_error(
                        "INVALID_REQUEST",
                        f"Unknown notification type: {key}",
                        status=400,
                    )

    # Build update kwargs
    update_kwargs = {}
    for field in [
        "email_enabled",
        "inapp_enabled",
        "digest_frequency",
        "quiet_hours_start",
        "quiet_hours_end",
        "email_types",
        "inapp_types",
    ]:
        if field in data:
            update_kwargs[field] = data[field]

    if not update_kwargs:
        return api_error("INVALID_REQUEST", "No valid fields to update", status=400)

    prefs_manager = _get_preferences_manager()
    success = prefs_manager.update_preferences(g.user.id, **update_kwargs)

    if not success:
        return api_error(
            "UPDATE_FAILED", "Failed to update notification settings", status=500
        )

    # Return updated preferences
    preferences = prefs_manager.get_preferences(g.user.id)
    return api_response({"preferences": preferences})


@notification_settings_bp.route("/notifications/test", methods=["POST"])
@require_auth
def send_test_notification():
    """
    Send a test email to verify notification settings.

    Sends a test email to the current user's email address.
    Requires email_enabled to be true.
    """
    prefs_manager = _get_preferences_manager()
    preferences = prefs_manager.get_preferences(g.user.id)

    if not preferences["email_enabled"]:
        return api_error(
            "EMAIL_DISABLED",
            "Email notifications are disabled. Enable them first.",
            status=400,
        )

    if not g.user.email:
        return api_error("NO_EMAIL", "No email address configured", status=400)

    notification_service = NotificationService()

    # Check if SMTP is configured
    if not notification_service.smtp_config.get("enabled"):
        return api_error(
            "SMTP_DISABLED",
            "SMTP is not configured. Contact administrator.",
            status=503,
        )

    # Send test email
    html_body = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .success-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email</h1>
        </div>
        <div class="content">
            <div class="success-box">
                <strong>Email notifications are working!</strong>
                <p>If you received this email, your notification settings are configured correctly.</p>
            </div>
            <p>You will receive notifications based on your preferences for:</p>
            <ul>
                <li>Sync completions and failures</li>
                <li>Weekly activity reports</li>
                <li>Rate limit warnings</li>
                <li>Credential expiration alerts</li>
            </ul>
        </div>
        <div class="footer">
            <p>ChirpSyncer - Twitter & Bluesky Sync</p>
        </div>
    </div>
</body>
</html>
"""

    success = notification_service.send_email(
        to=g.user.email,
        subject="ChirpSyncer Test Notification",
        body=html_body,
        html=True,
    )

    if success:
        logger.info(f"Test email sent to {g.user.email}")
        return api_response({"success": True, "message": "Test email sent"})
    else:
        return api_error(
            "SEND_FAILED",
            "Failed to send test email. Check SMTP configuration.",
            status=500,
        )


# Unsubscribe endpoints (no auth required - uses token)

unsubscribe_bp = Blueprint("unsubscribe", __name__, url_prefix="/unsubscribe")


@unsubscribe_bp.route("", methods=["GET"])
def get_unsubscribe_info():
    """
    Get unsubscribe information for a token.

    Query params:
        token: Unsubscribe token
        type: Optional notification type to unsubscribe from
    """
    token = request.args.get("token")
    notification_type = request.args.get("type")

    if not token:
        return api_error("INVALID_REQUEST", "Token is required", status=400)

    prefs_manager = _get_preferences_manager()
    user_id = prefs_manager.get_user_by_unsubscribe_token(token)

    if not user_id:
        return api_error("INVALID_TOKEN", "Invalid or expired token", status=400)

    # Get current preferences to show what they're unsubscribing from
    preferences = prefs_manager.get_preferences(user_id)

    return api_response({
        "valid": True,
        "notification_type": notification_type,
        "current_email_enabled": preferences["email_enabled"],
    })


@unsubscribe_bp.route("", methods=["POST"])
def process_unsubscribe():
    """
    Process unsubscribe request.

    Request body:
    {
        "token": "unsubscribe_token",
        "type": "weekly_report" (optional - if not provided, disables all email)
    }
    """
    data = request.get_json(silent=True) or {}
    token = data.get("token") or request.args.get("token")
    notification_type = data.get("type") or request.args.get("type")

    if not token:
        return api_error("INVALID_REQUEST", "Token is required", status=400)

    # Validate notification type if provided
    if notification_type and notification_type not in NotificationPreferences.NOTIFICATION_TYPES:
        return api_error(
            "INVALID_REQUEST",
            f"Invalid notification type: {notification_type}",
            status=400,
        )

    prefs_manager = _get_preferences_manager()
    success = prefs_manager.unsubscribe_by_token(token, notification_type)

    if not success:
        return api_error("UNSUBSCRIBE_FAILED", "Invalid token", status=400)

    if notification_type:
        message = f"Unsubscribed from {notification_type.replace('_', ' ')} emails"
    else:
        message = "Unsubscribed from all email notifications"

    logger.info(f"Unsubscribe processed: token={token[:8]}..., type={notification_type}")

    return api_response({"success": True, "message": message})
