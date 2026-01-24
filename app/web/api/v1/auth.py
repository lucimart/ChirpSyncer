import logging
import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, request, make_response, g, current_app, redirect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logger = logging.getLogger(__name__)

from app.auth.api_auth import require_auth
from app.auth.jwt_handler import (
    create_token,
    create_refresh_token,
    rotate_refresh_token,
    revoke_all_user_tokens,
    get_user_sessions,
    revoke_session,
    revoke_other_sessions,
    update_session_last_used,
    AuthError,
)
from app.auth.user_manager import UserManager
from app.auth.oauth_handler import OAuthHandler
from app.auth.oauth_providers import (
    get_configured_providers,
    is_provider_configured,
    OAUTH_REDIRECT_BASE,
)
from app.web.api.v1.responses import api_error, api_response

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Rate limiter for auth endpoints
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)


def init_limiter(app):
    """Initialize rate limiter with Flask app."""
    limiter.init_app(app)


_oauth_handler_initialized = False


def _get_oauth_handler():
    """Get OAuth handler instance."""
    global _oauth_handler_initialized
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    master_key = current_app.config.get("MASTER_KEY")
    if master_key and isinstance(master_key, str):
        master_key = master_key.encode("utf-8")[:32].ljust(32, b"\0")
    handler = OAuthHandler(db_path, master_key)
    if not _oauth_handler_initialized:
        handler.init_db()
        _oauth_handler_initialized = True
    return handler


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
@limiter.limit("5 per minute")  # Strict limit to prevent brute force
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return api_error(
            "INVALID_REQUEST", "Username and password are required", status=400
        )

    user_manager = _get_user_manager()
    user = user_manager.authenticate_user(username, password)
    if not user:
        return api_error(
            "INVALID_CREDENTIALS", "Invalid username or password", status=401
        )

    token = create_token(user.id, user.username, user.is_admin)
    refresh_token = create_refresh_token(
        user.id,
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.remote_addr,
    )
    response_data = {
        "token": token,
        "refresh_token": refresh_token,
        "user": _format_user(user),
    }
    response, status = api_response(response_data, status=200)

    if data.get("use_cookie"):
        resp = make_response(response, status)
        resp.set_cookie("auth_token", token, httponly=True, samesite="Lax", secure=True)
        resp.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            samesite="Lax",
            secure=True,
            max_age=30 * 24 * 60 * 60,  # 30 days
        )
        return resp

    return response, status


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    # Revoke all refresh tokens for user
    revoke_all_user_tokens(g.user.id)

    response, status = api_response({"logout": True}, status=200)
    resp = make_response(response, status)
    resp.set_cookie(
        "auth_token", "", expires=0, httponly=True, samesite="Lax", secure=True
    )
    resp.set_cookie(
        "refresh_token", "", expires=0, httponly=True, samesite="Lax", secure=True
    )
    return resp


@auth_bp.route("/refresh", methods=["POST"])
@limiter.limit("30 per minute")
def refresh():
    """Refresh access token using refresh token.

    Implements token rotation: old refresh token is invalidated,
    new access and refresh tokens are issued.
    """
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token") or request.cookies.get("refresh_token")

    if not refresh_token:
        return api_error("INVALID_REQUEST", "Refresh token is required", status=400)

    try:
        new_access, new_refresh = rotate_refresh_token(refresh_token)
    except AuthError as e:
        return api_error(e.code, e.message, status=e.status_code)

    response_data = {"token": new_access, "refresh_token": new_refresh}
    response, status = api_response(response_data, status=200)

    # Also set cookies if they were used
    if request.cookies.get("refresh_token"):
        resp = make_response(response, status)
        resp.set_cookie("auth_token", new_access, httponly=True, samesite="Lax", secure=True)
        resp.set_cookie(
            "refresh_token",
            new_refresh,
            httponly=True,
            samesite="Lax",
            secure=True,
            max_age=30 * 24 * 60 * 60,
        )
        return resp

    return response, status


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("3 per minute")  # Prevent mass account creation
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return api_error(
            "INVALID_REQUEST", "Username, email, and password are required", status=400
        )

    user_manager = _get_user_manager()
    try:
        user_id = user_manager.create_user(username, email, password, is_admin=False)
    except ValueError:
        # Do not expose internal error details to the client
        return api_error(
            "REGISTRATION_FAILED",
            "Unable to complete registration with the provided data.",
            status=400,
        )

    user = user_manager.get_user_by_id(user_id)
    if not user:
        return api_error(
            "REGISTRATION_FAILED", "Failed to retrieve created user", status=500
        )
    token = create_token(user.id, user.username, user.is_admin)
    refresh_token = create_refresh_token(user.id)
    return api_response({
        "token": token,
        "refresh_token": refresh_token,
        "user": _format_user(user),
    }, status=201)


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


@auth_bp.route("/me", methods=["PUT"])
@require_auth
def update_profile():
    """Update current user's profile."""
    data = request.get_json(silent=True) or {}

    user_manager = _get_user_manager()
    updates = {}

    if "email" in data:
        email = data["email"].strip()
        if not email or "@" not in email:
            return api_error("INVALID_REQUEST", "Invalid email format", status=400)
        updates["email"] = email

    if "settings" in data and isinstance(data["settings"], dict):
        import json

        updates["settings_json"] = json.dumps(data["settings"])

    if not updates:
        return api_error("INVALID_REQUEST", "No valid fields to update", status=400)

    success = user_manager.update_user(g.user.id, **updates)
    if not success:
        return api_error("UPDATE_FAILED", "Failed to update profile", status=500)

    # Fetch updated user
    user = user_manager.get_user_by_id(g.user.id)
    return api_response(_format_user(user))


@auth_bp.route("/change-password", methods=["POST"])
@require_auth
def change_password():
    """Change current user's password."""
    data = request.get_json(silent=True) or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return api_error(
            "INVALID_REQUEST",
            "Current password and new password are required",
            status=400,
        )

    if len(new_password) < 8:
        return api_error(
            "INVALID_REQUEST", "New password must be at least 8 characters", status=400
        )

    user_manager = _get_user_manager()

    # Verify current password
    user = user_manager.authenticate_user(g.user.username, current_password)
    if not user:
        return api_error(
            "INVALID_CREDENTIALS", "Current password is incorrect", status=401
        )

    # Update password
    success = user_manager.update_user(g.user.id, password=new_password)
    if not success:
        return api_error("UPDATE_FAILED", "Failed to update password", status=500)

    return api_response({"success": True})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Request a password reset token."""
    data = request.get_json(silent=True) or {}
    email = data.get("email")

    if not email:
        return api_error("INVALID_REQUEST", "Email is required", status=400)

    user_manager = _get_user_manager()
    user = user_manager.get_user_by_email(email)

    # Always return success to prevent email enumeration
    # In production, you would send an email with the reset link
    if user:
        try:
            token = user_manager.create_password_reset_token(user.id)
            # Send password reset email asynchronously
            from app.tasks.notification_tasks import send_password_reset_email
            send_password_reset_email.delay(user.id, token, user.email)
            logger.info(f"Password reset email queued for user {user.id}")
        except Exception as e:
            # Log error but don't expose to user (security: prevent enumeration)
            logger.error(f"Password reset token creation failed: {e}")

    # Return same response even if user not found (security)
    return api_response(
        {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent.",
        }
    )


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password using a valid reset token."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return api_error(
            "INVALID_REQUEST", "Token and new password are required", status=400
        )

    if len(new_password) < 8:
        return api_error(
            "INVALID_REQUEST", "Password must be at least 8 characters", status=400
        )

    user_manager = _get_user_manager()

    # Validate token first
    user = user_manager.validate_password_reset_token(token)
    if not user:
        return api_error("INVALID_TOKEN", "Invalid or expired reset token", status=400)

    # Reset password
    success = user_manager.reset_password_with_token(token, new_password)
    if not success:
        return api_error("RESET_FAILED", "Failed to reset password", status=500)

    return api_response(
        {"success": True, "message": "Password has been reset successfully."}
    )


@auth_bp.route("/validate-reset-token", methods=["POST"])
def validate_reset_token():
    """Validate a password reset token without using it."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")

    if not token:
        return api_error("INVALID_REQUEST", "Token is required", status=400)

    user_manager = _get_user_manager()
    user = user_manager.validate_password_reset_token(token)

    if not user:
        return api_error("INVALID_TOKEN", "Invalid or expired reset token", status=400)

    return api_response({"valid": True, "email": user.email})


# ============================================================================
# Session Management Endpoints
# ============================================================================


@auth_bp.route("/sessions", methods=["GET"])
@require_auth
def list_sessions():
    """List all active sessions for the current user."""
    sessions = get_user_sessions(g.user.id)

    # Format sessions for response
    formatted = []
    for session in sessions:
        formatted.append({
            "id": session["id"],
            "created_at": datetime.utcfromtimestamp(session["created_at"]).isoformat() if session["created_at"] else None,
            "last_used_at": datetime.utcfromtimestamp(session["last_used_at"]).isoformat() if session["last_used_at"] else None,
            "user_agent": session["user_agent"],
            "ip_address": session["ip_address"],
            "expires_at": datetime.utcfromtimestamp(session["expires_at"]).isoformat() if session["expires_at"] else None,
            "is_current": False,  # Will be set by frontend based on stored family_id
        })

    return api_response({"sessions": formatted, "count": len(formatted)})


@auth_bp.route("/sessions/<int:session_id>", methods=["DELETE"])
@require_auth
def delete_session(session_id: int):
    """Revoke a specific session."""
    success = revoke_session(g.user.id, session_id)

    if not success:
        return api_error("SESSION_NOT_FOUND", "Session not found or already revoked", status=404)

    return api_response({"success": True})


@auth_bp.route("/sessions/revoke-others", methods=["POST"])
@require_auth
def revoke_other_sessions_endpoint():
    """Revoke all sessions except the current one."""
    data = request.get_json(silent=True) or {}
    current_refresh_token = data.get("refresh_token") or request.cookies.get("refresh_token")

    if not current_refresh_token:
        return api_error("INVALID_REQUEST", "Current refresh token is required", status=400)

    # Get family_id from current token
    import hashlib
    from flask import current_app

    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    token_hash = hashlib.sha256(current_refresh_token.encode()).hexdigest()

    import sqlite3
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT family_id FROM refresh_tokens WHERE token_hash = ?", (token_hash,))
        row = cursor.fetchone()

    if not row:
        return api_error("INVALID_TOKEN", "Invalid refresh token", status=401)

    family_id = row[0]
    count = revoke_other_sessions(g.user.id, family_id)

    return api_response({"success": True, "revoked_count": count})


# ============================================================================
# SSO / OAuth Endpoints
# ============================================================================


@auth_bp.route("/sso/providers", methods=["GET"])
def get_sso_providers():
    """Get list of available SSO providers."""
    providers = get_configured_providers()
    return api_response({
        "providers": providers,
        "enabled": {p: is_provider_configured(p) for p in ["google", "github", "twitter"]},
    })


@auth_bp.route("/sso/<provider>", methods=["GET"])
@limiter.limit("10 per minute")  # Prevent SSO abuse
def sso_redirect(provider: str):
    """
    Initiate SSO authentication flow.

    Redirects user to OAuth provider authorization page.
    """
    if provider not in ["google", "github", "twitter"]:
        return api_error("INVALID_PROVIDER", f"Unknown provider: {provider}", status=400)

    if not is_provider_configured(provider):
        return api_error(
            "PROVIDER_NOT_CONFIGURED",
            f"Provider {provider} is not configured",
            status=400,
        )

    oauth_handler = _get_oauth_handler()
    redirect_uri = f"{OAUTH_REDIRECT_BASE}/api/v1/auth/sso/{provider}/callback"

    auth_url = oauth_handler.generate_auth_url(provider, redirect_uri)
    if not auth_url:
        return api_error("SSO_ERROR", "Failed to generate authorization URL", status=500)

    return redirect(auth_url)


@auth_bp.route("/sso/<provider>/callback", methods=["GET"])
@limiter.limit("20 per minute")  # Prevent callback abuse
def sso_callback(provider: str):
    """
    Handle OAuth callback from provider.

    Creates or logs in user and redirects to frontend with token.
    """
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    if error:
        logger.error(f"OAuth error from {provider}: {error}")
        return redirect(f"{frontend_url}/login?error=oauth_denied")

    if not code or not state:
        return redirect(f"{frontend_url}/login?error=oauth_invalid")

    oauth_handler = _get_oauth_handler()

    # Validate state
    state_data = oauth_handler.validate_state(state)
    if not state_data:
        return redirect(f"{frontend_url}/login?error=oauth_state_invalid")

    redirect_uri = state_data["redirect_uri"]
    code_verifier = state_data.get("code_verifier")

    # Exchange code for tokens
    tokens = oauth_handler.exchange_code(provider, code, redirect_uri, code_verifier)
    if not tokens:
        return redirect(f"{frontend_url}/login?error=oauth_token_error")

    access_token = tokens.get("access_token")
    if not access_token:
        return redirect(f"{frontend_url}/login?error=oauth_token_missing")

    # Fetch user info
    user_info = oauth_handler.fetch_user_info(provider, access_token)
    if not user_info:
        return redirect(f"{frontend_url}/login?error=oauth_userinfo_error")

    # Check if OAuth account exists
    oauth_account = oauth_handler.find_oauth_account(provider, user_info.provider_user_id)

    user_manager = _get_user_manager()

    if oauth_account:
        # Existing OAuth account - log in
        user_id = oauth_account["user_id"]
        user = user_manager.get_user_by_id(user_id)
        if not user:
            return redirect(f"{frontend_url}/login?error=user_not_found")

        # Update tokens
        oauth_handler.link_oauth_account(user_id, user_info, tokens)

    else:
        # New OAuth login
        if user_info.email:
            # Check if user with this email exists
            existing_user = oauth_handler.find_user_by_email(user_info.email)
            if existing_user:
                # Link OAuth to existing user
                user_id = existing_user["id"]
                oauth_handler.link_oauth_account(user_id, user_info, tokens)
                user = user_manager.get_user_by_id(user_id)
            else:
                # Create new user
                user_id = oauth_handler.create_sso_user(user_info)
                oauth_handler.link_oauth_account(user_id, user_info, tokens)
                user = user_manager.get_user_by_id(user_id)
        else:
            # No email from provider - create new user
            user_id = oauth_handler.create_sso_user(user_info)
            oauth_handler.link_oauth_account(user_id, user_info, tokens)
            user = user_manager.get_user_by_id(user_id)

    if not user:
        return redirect(f"{frontend_url}/login?error=user_creation_failed")

    # Create JWT token and refresh token
    jwt_token = create_token(user.id, user.username, user.is_admin)
    refresh_token = create_refresh_token(user.id)

    # Redirect to frontend with tokens
    return redirect(f"{frontend_url}/auth/callback?token={jwt_token}&refresh_token={refresh_token}")


@auth_bp.route("/sso/link/<provider>", methods=["POST"])
@require_auth
def link_sso_account(provider: str):
    """
    Link SSO account to current user.

    Returns authorization URL for linking.
    """
    if provider not in ["google", "github", "twitter"]:
        return api_error("INVALID_PROVIDER", f"Unknown provider: {provider}", status=400)

    if not is_provider_configured(provider):
        return api_error(
            "PROVIDER_NOT_CONFIGURED",
            f"Provider {provider} is not configured",
            status=400,
        )

    oauth_handler = _get_oauth_handler()
    redirect_uri = f"{OAUTH_REDIRECT_BASE}/api/v1/auth/sso/{provider}/link/callback"

    # Store user_id in state for callback
    auth_url = oauth_handler.generate_auth_url(provider, redirect_uri, user_id=g.user.id)
    if not auth_url:
        return api_error("SSO_ERROR", "Failed to generate authorization URL", status=500)

    return api_response({"auth_url": auth_url})


@auth_bp.route("/sso/<provider>/link/callback", methods=["GET"])
@limiter.limit("20 per minute")
def sso_link_callback(provider: str):
    """
    Handle OAuth callback for linking account to existing user.
    """
    code = request.args.get("code")
    state = request.args.get("state")
    error = request.args.get("error")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    settings_url = f"{frontend_url}/dashboard/settings"

    if error:
        logger.error(f"OAuth link error from {provider}: {error}")
        return redirect(f"{settings_url}?error=oauth_denied")

    if not code or not state:
        return redirect(f"{settings_url}?error=oauth_invalid")

    oauth_handler = _get_oauth_handler()

    # Validate state and get user_id
    state_data = oauth_handler.validate_state(state)
    if not state_data:
        return redirect(f"{settings_url}?error=oauth_state_invalid")

    user_id = state_data.get("user_id")
    if not user_id:
        return redirect(f"{settings_url}?error=oauth_state_invalid")

    redirect_uri = state_data["redirect_uri"]
    code_verifier = state_data.get("code_verifier")

    # Exchange code for tokens
    tokens = oauth_handler.exchange_code(provider, code, redirect_uri, code_verifier)
    if not tokens:
        return redirect(f"{settings_url}?error=oauth_token_error")

    access_token = tokens.get("access_token")
    if not access_token:
        return redirect(f"{settings_url}?error=oauth_token_missing")

    # Fetch user info from provider
    user_info = oauth_handler.fetch_user_info(provider, access_token)
    if not user_info:
        return redirect(f"{settings_url}?error=oauth_userinfo_error")

    # Check if this OAuth account is already linked to another user
    existing_oauth = oauth_handler.find_oauth_account(provider, user_info.provider_user_id)
    if existing_oauth and existing_oauth["user_id"] != user_id:
        return redirect(f"{settings_url}?error=oauth_already_linked")

    # Link the OAuth account to the user
    oauth_handler.link_oauth_account(user_id, user_info, tokens)

    return redirect(f"{settings_url}?linked={provider}")


@auth_bp.route("/sso/unlink/<provider>", methods=["DELETE"])
@require_auth
def unlink_sso_account(provider: str):
    """Unlink SSO account from current user."""
    if provider not in ["google", "github", "twitter"]:
        return api_error("INVALID_PROVIDER", f"Unknown provider: {provider}", status=400)

    oauth_handler = _get_oauth_handler()
    success = oauth_handler.unlink_oauth_account(g.user.id, provider)

    if not success:
        return api_error(
            "UNLINK_FAILED",
            "Cannot unlink account. Ensure you have another login method.",
            status=400,
        )

    return api_response({"success": True})


@auth_bp.route("/sso/accounts", methods=["GET"])
@require_auth
def get_linked_accounts():
    """Get SSO accounts linked to current user."""
    oauth_handler = _get_oauth_handler()
    accounts = oauth_handler.get_user_oauth_accounts(g.user.id)

    return api_response({
        "accounts": accounts,
        "available_providers": get_configured_providers(),
    })
