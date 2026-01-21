from datetime import datetime

from flask import Blueprint, request, make_response, g, current_app

from app.auth.api_auth import require_auth
from app.auth.jwt_handler import create_token
from app.auth.user_manager import UserManager
from app.web.api.v1.responses import api_error, api_response

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _get_user_manager():
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return UserManager(db_path)


def _format_user(user):
    created_at = None
    if user.created_at:
        created_at = datetime.utcfromtimestamp(user.created_at).isoformat()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
        "created_at": created_at,
    }


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return api_error("INVALID_REQUEST", "Username and password are required", status=400)

    user_manager = _get_user_manager()
    user = user_manager.authenticate_user(username, password)
    if not user:
        return api_error("INVALID_CREDENTIALS", "Invalid username or password", status=401)

    token = create_token(user.id, user.username, user.is_admin)
    response_data = {"token": token, "user": _format_user(user)}
    response, status = api_response(response_data, status=200)

    if data.get("use_cookie"):
        resp = make_response(response, status)
        resp.set_cookie("auth_token", token, httponly=True, samesite="Lax")
        return resp

    return response, status


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    response, status = api_response({"logout": True}, status=200)
    resp = make_response(response, status)
    resp.set_cookie("auth_token", "", expires=0, httponly=True, samesite="Lax")
    return resp


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return api_error("INVALID_REQUEST", "Username, email, and password are required", status=400)

    user_manager = _get_user_manager()
    try:
        user_id = user_manager.create_user(username, email, password, is_admin=False)
    except ValueError as exc:
        return api_error("REGISTRATION_FAILED", str(exc), status=400)

    user = user_manager.get_user_by_id(user_id)
    token = create_token(user.id, user.username, user.is_admin)
    return api_response({"token": token, "user": _format_user(user)}, status=201)


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    return api_response(
        {
            "id": g.user.id,
            "username": g.user.username,
            "email": g.user.email,
            "is_admin": g.user.is_admin,
        }
    )
