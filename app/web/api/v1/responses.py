import os

from flask import g, jsonify


def api_response(data=None, status: int = 200):
    payload = {
        "success": True,
        "data": data,
        "correlation_id": getattr(g, "correlation_id", None),
    }
    return jsonify(payload), status


def _sanitize_details(details):
    """Sanitize error details to avoid exposing stack traces in production."""
    if details is None:
        return None
    if os.environ.get("FLASK_ENV") == "production":
        # In production, only return safe error details
        if isinstance(details, dict):
            # Allow only known safe keys
            safe_keys = {"field", "fields", "validation_errors", "constraint"}
            return {k: v for k, v in details.items() if k in safe_keys}
        # Don't expose string details that might contain stack traces
        return None
    return details


def api_error(code: str, message: str, status: int = 400, details=None):
    payload = {
        "success": False,
        "error": {"code": code, "message": message},
        "correlation_id": getattr(g, "correlation_id", None),
    }
    sanitized = _sanitize_details(details)
    if sanitized is not None:
        payload["error"]["details"] = sanitized
    return jsonify(payload), status
