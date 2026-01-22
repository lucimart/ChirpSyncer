import os

from flask import g, jsonify


def _contains_stack_trace(obj, depth=0):
    """Check if object might contain stack trace information."""
    if depth > 5:  # Prevent infinite recursion
        return False
    if obj is None:
        return False
    if isinstance(obj, str):
        # Check for common stack trace patterns
        trace_indicators = ["Traceback", 'File "', "line ", "Error:", "Exception:"]
        return any(indicator in obj for indicator in trace_indicators)
    if isinstance(obj, dict):
        return any(_contains_stack_trace(v, depth + 1) for v in obj.values())
    if isinstance(obj, (list, tuple)):
        return any(_contains_stack_trace(item, depth + 1) for item in obj)
    return False


def _sanitize_response_data(data):
    """Sanitize response data to avoid exposing stack traces in production."""
    if os.environ.get("FLASK_ENV") != "production":
        return data
    if data is None:
        return None
    if _contains_stack_trace(data):
        # In production, don't expose data that looks like it contains stack traces
        return {"error": "An internal error occurred"}
    return data


def api_response(data=None, status: int = 200):
    sanitized_data = _sanitize_response_data(data)
    payload = {
        "success": True,
        "data": sanitized_data,
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
