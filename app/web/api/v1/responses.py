from flask import g, jsonify


def api_response(data=None, status: int = 200):
    payload = {
        "success": True,
        "data": data,
        "correlation_id": getattr(g, "correlation_id", None),
    }
    return jsonify(payload), status


def api_error(code: str, message: str, status: int = 400, details=None):
    payload = {
        "success": False,
        "error": {"code": code, "message": message},
        "correlation_id": getattr(g, "correlation_id", None),
    }
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status
