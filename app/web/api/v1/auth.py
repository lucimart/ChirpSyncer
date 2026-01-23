import logging
import os
from datetime import datetime

from flask import Blueprint, request, make_response, g, current_app, redirect

logger = logging.getLogger(__name__)

from app.auth.api_auth import require_auth
from app.auth.jwt_handler import create_token
from app.auth.user_manager import UserManager
from app.auth.oauth_handler import OAuthHandler
from app.auth.oauth_providers import (
    get_configured_providers,
    is_provider_configured,
    OAUTH_REDIRECT_BASE,
)
from app.web.api.v1.responses import api_error, api_response

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _get_oauth_handler():
    """Get OAuth handler instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    master_key = current_app.config.get("MASTER_KEY")
    if master_key and isinstance(master_key, str):
        master_key = master_key.encode("utf-8")[:32].ljust(32, b"\0")
    return OAuthHandler(db_path, master_key)


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
    response_data = {"token": token, "user": _format_user(user)}
    response, status = api_response(response_data, status=200)

    if data.get("use_cookie"):
        resp = make_response(response, status)
        resp.set_cookie("auth_token", token, httponly=True, samesite="Lax", secure=True)
        return resp

    return response, status


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    response, status = api_response({"logout": True}, status=200)
    resp = make_response(response, status)
    resp.set_cookie(
        "auth_token", "", expires=0, httponly=True, samesite="Lax", secure=True
    )
    return resp


@auth_bp.route("/register", methods=["POST"])
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
            # In production: send email with reset link
            # For development: return token in response (remove in production!)
            return api_response(
                {
                    "success": True,
                    "message": "If an account with that email exists, a password reset link has been sent.",
                    # DEV ONLY - remove in production
                    "dev_token": token,
                    "dev_reset_url": f"/reset-password?token={token}",
                }
            )
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

    # Create JWT token
    jwt_token = create_token(user.id, user.username, user.is_admin)

    # Redirect to frontend with token
    return redirect(f"{frontend_url}/auth/callback?token={jwt_token}")


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

    auth_url = oauth_handler.generate_auth_url(provider, redirect_uri)
    if not auth_url:
        return api_error("SSO_ERROR", "Failed to generate authorization URL", status=500)

    return api_response({"auth_url": auth_url})


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
