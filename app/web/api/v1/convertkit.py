"""ConvertKit API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

convertkit_bp = Blueprint("convertkit", __name__)


CONVERTKIT_API_BASE = "https://api.convertkit.com/v3"


def get_convertkit_credentials():
    """Get ConvertKit credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("convertkit")


def convertkit_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to ConvertKit API."""
    url = f"{CONVERTKIT_API_BASE}/{endpoint}"

    params = kwargs.pop("params", {})
    params["api_secret"] = creds.get("api_secret")

    response = http_requests.request(method, url, params=params, **kwargs)
    return response


@convertkit_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with ConvertKit using API secret."""
    data = request.get_json() or {}

    api_secret = data.get("api_secret")

    if not api_secret:
        return api_error("api_secret required", 400)

    try:
        # Verify key by fetching account info
        response = http_requests.get(
            f"{CONVERTKIT_API_BASE}/account",
            params={"api_secret": api_secret}
        )

        if not response.ok:
            return api_error("Invalid API secret", 401)

        account_data = response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("convertkit", {
            "api_secret": api_secret,
            "name": account_data.get("name"),
            "primary_email_address": account_data.get("primary_email_address"),
        })

        return api_response({
            "authenticated": True,
            "account": account_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@convertkit_bp.route("/account", methods=["GET"])
@require_auth
def get_account():
    """Get account information."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", "account", creds)

    if not response.ok:
        return api_error("Failed to fetch account", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/broadcasts", methods=["GET"])
@require_auth
def list_broadcasts():
    """List broadcasts (emails)."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    params = {
        "page": request.args.get("page", 1),
    }

    response = convertkit_request("GET", "broadcasts", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch broadcasts", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/broadcasts/<broadcast_id>", methods=["GET"])
@require_auth
def get_broadcast(broadcast_id: str):
    """Get a specific broadcast."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", f"broadcasts/{broadcast_id}", creds)

    if not response.ok:
        return api_error("Broadcast not found", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/broadcasts", methods=["POST"])
@require_auth
def create_broadcast():
    """Create a new broadcast."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    data = request.get_json() or {}

    if not data.get("content"):
        return api_error("content required", 400)

    broadcast_data = {
        "api_secret": creds.get("api_secret"),
        "content": data.get("content"),
        "subject": data.get("subject"),
        "description": data.get("description"),
        "public": data.get("public", True),
        "published_at": data.get("published_at"),
        "send_at": data.get("send_at"),
        "email_address": data.get("email_address"),
        "email_layout_template": data.get("email_layout_template"),
        "thumbnail_alt": data.get("thumbnail_alt"),
        "thumbnail_url": data.get("thumbnail_url"),
        "preview_text": data.get("preview_text"),
    }

    # Remove None values
    broadcast_data = {k: v for k, v in broadcast_data.items() if v is not None}

    response = http_requests.post(
        f"{CONVERTKIT_API_BASE}/broadcasts",
        json=broadcast_data
    )

    if not response.ok:
        return api_error("Failed to create broadcast", response.status_code)

    return api_response(response.json(), status_code=201)


@convertkit_bp.route("/broadcasts/<broadcast_id>", methods=["PUT"])
@require_auth
def update_broadcast(broadcast_id: str):
    """Update an existing broadcast."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    data = request.get_json() or {}
    data["api_secret"] = creds.get("api_secret")

    response = http_requests.put(
        f"{CONVERTKIT_API_BASE}/broadcasts/{broadcast_id}",
        json=data
    )

    if not response.ok:
        return api_error("Failed to update broadcast", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/broadcasts/<broadcast_id>", methods=["DELETE"])
@require_auth
def delete_broadcast(broadcast_id: str):
    """Delete a broadcast."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("DELETE", f"broadcasts/{broadcast_id}", creds)

    if not response.ok:
        return api_error("Failed to delete broadcast", response.status_code)

    return api_response({"deleted": True})


@convertkit_bp.route("/subscribers", methods=["GET"])
@require_auth
def list_subscribers():
    """List subscribers."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    params = {
        "page": request.args.get("page", 1),
        "from": request.args.get("from"),
        "to": request.args.get("to"),
        "sort_order": request.args.get("sort_order", "desc"),
    }
    params = {k: v for k, v in params.items() if v}

    response = convertkit_request("GET", "subscribers", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch subscribers", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/subscribers/<subscriber_id>", methods=["GET"])
@require_auth
def get_subscriber(subscriber_id: str):
    """Get a specific subscriber."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", f"subscribers/{subscriber_id}", creds)

    if not response.ok:
        return api_error("Subscriber not found", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/forms", methods=["GET"])
@require_auth
def list_forms():
    """List forms."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", "forms", creds)

    if not response.ok:
        return api_error("Failed to fetch forms", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/sequences", methods=["GET"])
@require_auth
def list_sequences():
    """List sequences (automations)."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", "sequences", creds)

    if not response.ok:
        return api_error("Failed to fetch sequences", response.status_code)

    return api_response(response.json())


@convertkit_bp.route("/tags", methods=["GET"])
@require_auth
def list_tags():
    """List tags."""
    creds = get_convertkit_credentials()
    if not creds:
        return api_error("ConvertKit not configured", 400)

    response = convertkit_request("GET", "tags", creds)

    if not response.ok:
        return api_error("Failed to fetch tags", response.status_code)

    return api_response(response.json())
