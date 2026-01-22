"""
Admin API v1 Blueprint

Provides endpoints for admin user management.
All endpoints require admin privileges.
"""

import time
from functools import wraps

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.auth.user_manager import UserManager
from app.web.api.v1.responses import api_error, api_response

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def require_admin(f):
    """Decorator to require admin privileges."""

    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not g.user.is_admin:
            return api_error("FORBIDDEN", "Admin privileges required", status=403)
        return f(*args, **kwargs)

    return decorated


def _get_user_manager():
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return UserManager(db_path)


def _format_user(user):
    """Format a user object for API response."""
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(user.created_at)),
        "last_login": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(user.last_login))
        if user.last_login
        else None,
    }


@admin_bp.route("/users", methods=["GET"])
@require_admin
def list_users():
    """List all users with optional search and pagination."""
    search = request.args.get("search", "").strip()
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 50)), 100)

    user_manager = _get_user_manager()
    all_users = user_manager.list_users()

    # Filter by search term if provided
    if search:
        search_lower = search.lower()
        all_users = [
            u
            for u in all_users
            if search_lower in u.username.lower() or search_lower in u.email.lower()
        ]

    # Paginate
    total = len(all_users)
    start = (page - 1) * limit
    end = start + limit
    users = all_users[start:end]

    return api_response(
        {
            "users": [_format_user(u) for u in users],
            "total": total,
            "page": page,
            "limit": limit,
        }
    )


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@require_admin
def get_user(user_id):
    """Get a specific user by ID."""
    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    return api_response(_format_user(user))


@admin_bp.route("/users/<int:user_id>", methods=["PUT"])
@require_admin
def update_user(user_id):
    """Update a user's details."""
    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    data = request.get_json(silent=True) or {}
    updates = {}

    # Allowed fields to update
    if "email" in data:
        updates["email"] = data["email"]
    if "password" in data and data["password"]:
        updates["password"] = data["password"]
    if "is_active" in data:
        updates["is_active"] = bool(data["is_active"])
    if "is_admin" in data:
        updates["is_admin"] = bool(data["is_admin"])

    if updates:
        success = user_manager.update_user(user_id, **updates)
        if not success:
            return api_error("UPDATE_FAILED", "Failed to update user", status=500)

    # Fetch updated user
    updated_user = user_manager.get_user_by_id(user_id)
    return api_response(_format_user(updated_user))


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    """Delete a user."""
    # Prevent deleting self
    if user_id == g.user.id:
        return api_error(
            "INVALID_REQUEST", "Cannot delete your own account", status=400
        )

    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    success = user_manager.delete_user(user_id)
    if not success:
        return api_error("DELETE_FAILED", "Failed to delete user", status=500)

    return api_response({"success": True})


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["POST"])
@require_admin
def toggle_active(user_id):
    """Toggle a user's active status."""
    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    # Toggle the status
    new_status = not user.is_active
    success = user_manager.update_user(user_id, is_active=new_status)

    if not success:
        return api_error("UPDATE_FAILED", "Failed to update user status", status=500)

    updated_user = user_manager.get_user_by_id(user_id)
    return api_response(_format_user(updated_user))


@admin_bp.route("/users/<int:user_id>/toggle-admin", methods=["POST"])
@require_admin
def toggle_admin(user_id):
    """Toggle a user's admin status."""
    # Prevent toggling own admin status
    if user_id == g.user.id:
        return api_error(
            "INVALID_REQUEST", "Cannot change your own admin status", status=400
        )

    user_manager = _get_user_manager()
    user = user_manager.get_user_by_id(user_id)

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    # Toggle the status
    new_status = not user.is_admin
    success = user_manager.update_user(user_id, is_admin=new_status)

    if not success:
        return api_error("UPDATE_FAILED", "Failed to update admin status", status=500)

    updated_user = user_manager.get_user_by_id(user_id)
    return api_response(_format_user(updated_user))
