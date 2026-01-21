from functools import wraps

from flask import g, jsonify, request, current_app

from app.auth.jwt_handler import verify_token, AuthError
from app.auth.user_manager import UserManager


def _error_response(code: str, message: str, status: int, details=None):
    payload = {
        "success": False,
        "error": {"code": code, "message": message},
        "correlation_id": getattr(g, "correlation_id", None),
    }
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status


def _get_user_manager():
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return UserManager(db_path)


def _extract_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return request.cookies.get("auth_token")


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token()
        if not token:
            return _error_response("AUTH_REQUIRED", "Authentication required", 401)

        try:
            payload = verify_token(token)
        except AuthError as exc:
            return _error_response(exc.code, exc.message, exc.status_code)

        user_manager = _get_user_manager()
        user = user_manager.get_user_by_id(payload.get("sub"))
        if not user:
            return _error_response("USER_NOT_FOUND", "User not found", 401)

        g.user = user
        return f(*args, **kwargs)

    return decorated
