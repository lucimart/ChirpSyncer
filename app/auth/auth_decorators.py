"""
Auth Decorators (Sprint 6 - DASH-002)

Provides authentication and authorization decorators for Flask routes:
- @require_auth - requires authenticated user
- @require_admin - requires admin user
- @require_self_or_admin - requires user is self or admin
"""

from functools import wraps
from flask import session, redirect, url_for, abort, current_app, flash
from app.auth.user_manager import UserManager


def _get_user_manager():
    """Get UserManager instance with configured database path"""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return UserManager(db_path)


def require_auth(f):
    """
    Decorator that requires user to be authenticated.

    Redirects to login page if user is not authenticated or session expired.

    Usage:
        @app.route('/protected')
        @require_auth
        def protected_route():
            return 'Protected content'
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        # Validate session if session_token exists
        if "session_token" in session:
            user_manager = _get_user_manager()
            validated_user = user_manager.validate_session(session["session_token"])

            if validated_user is None:
                # Session expired or invalid
                session.clear()
                flash("Your session has expired. Please log in again.", "warning")
                return redirect(url_for("login"))

            # Update session user_id in case it changed
            session["user_id"] = validated_user.id

        return f(*args, **kwargs)

    return decorated_function


def require_admin(f):
    """
    Decorator that requires user to be authenticated as admin.

    Redirects to login if not authenticated or session expired.
    Returns 403 Forbidden if authenticated but not admin.

    Usage:
        @app.route('/admin-only')
        @require_admin
        def admin_route():
            return 'Admin content'
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        # Validate session if session_token exists
        user_manager = _get_user_manager()
        if "session_token" in session:
            validated_user = user_manager.validate_session(session["session_token"])

            if validated_user is None:
                # Session expired or invalid
                session.clear()
                flash("Your session has expired. Please log in again.", "warning")
                return redirect(url_for("login"))

            session["user_id"] = validated_user.id

        user = user_manager.get_user_by_id(session["user_id"])

        if not user or not user.is_admin:
            abort(403)  # Forbidden

        return f(*args, **kwargs)

    return decorated_function


def require_self_or_admin(f):
    """
    Decorator that requires user to be accessing their own resource or be admin.

    The decorated function must have a 'user_id' parameter.
    Redirects to login if not authenticated or session expired.
    Returns 403 Forbidden if trying to access another user's resource without being admin.

    Usage:
        @app.route('/users/<int:user_id>/profile')
        @require_self_or_admin
        def user_profile(user_id):
            return f'User {user_id} profile'
    """

    @wraps(f)
    def decorated_function(user_id, *args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        # Validate session if session_token exists
        user_manager = _get_user_manager()
        if "session_token" in session:
            validated_user = user_manager.validate_session(session["session_token"])

            if validated_user is None:
                # Session expired or invalid
                session.clear()
                flash("Your session has expired. Please log in again.", "warning")
                return redirect(url_for("login"))

            session["user_id"] = validated_user.id

        current_user = user_manager.get_user_by_id(session["user_id"])

        if not current_user:
            return redirect(url_for("login"))

        # Allow if user is accessing their own resource or is admin
        if current_user.id != user_id and not current_user.is_admin:
            abort(403)  # Forbidden

        return f(user_id, *args, **kwargs)

    return decorated_function
