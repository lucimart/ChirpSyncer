"""Buttondown API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

buttondown_bp = Blueprint("buttondown", __name__)


BUTTONDOWN_API_BASE = "https://api.buttondown.email/v1"


def get_buttondown_credentials():
    """Get Buttondown credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("buttondown")


def buttondown_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to Buttondown API."""
    url = f"{BUTTONDOWN_API_BASE}/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Token {creds.get('api_key')}"
    headers["Content-Type"] = "application/json"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@buttondown_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Buttondown using API key."""
    data = request.get_json() or {}

    api_key = data.get("api_key")

    if not api_key:
        return api_error("api_key required", 400)

    try:
        # Verify key by fetching newsletters
        response = http_requests.get(
            f"{BUTTONDOWN_API_BASE}/newsletters",
            headers={"Authorization": f"Token {api_key}"}
        )

        if not response.ok:
            return api_error("Invalid API key", 401)

        newsletters = response.json().get("results", [])

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("buttondown", {
            "api_key": api_key,
        })

        return api_response({
            "authenticated": True,
            "newsletters": newsletters,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@buttondown_bp.route("/newsletters", methods=["GET"])
@require_auth
def list_newsletters():
    """List newsletters."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    response = buttondown_request("GET", "newsletters", creds)

    if not response.ok:
        return api_error("Failed to fetch newsletters", response.status_code)

    return api_response(response.json())


@buttondown_bp.route("/emails", methods=["GET"])
@require_auth
def list_emails():
    """List sent emails/newsletters."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    params = {
        "page": request.args.get("page", 1),
        "status": request.args.get("status"),
    }
    params = {k: v for k, v in params.items() if v}

    response = buttondown_request("GET", "emails", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch emails", response.status_code)

    return api_response(response.json())


@buttondown_bp.route("/emails/<email_id>", methods=["GET"])
@require_auth
def get_email(email_id: str):
    """Get a specific email."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    response = buttondown_request("GET", f"emails/{email_id}", creds)

    if not response.ok:
        return api_error("Email not found", response.status_code)

    return api_response(response.json())


@buttondown_bp.route("/emails", methods=["POST"])
@require_auth
def create_email():
    """Create a new email/newsletter."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    data = request.get_json() or {}

    if not data.get("subject") or not data.get("body"):
        return api_error("subject and body required", 400)

    email_data = {
        "subject": data.get("subject"),
        "body": data.get("body"),
        "status": data.get("status", "draft"),
    }

    if data.get("secondary_id"):
        email_data["secondary_id"] = data.get("secondary_id")

    response = buttondown_request("POST", "emails", creds, json=email_data)

    if not response.ok:
        return api_error("Failed to create email", response.status_code)

    return api_response(response.json(), status_code=201)


@buttondown_bp.route("/emails/<email_id>", methods=["PATCH"])
@require_auth
def update_email(email_id: str):
    """Update an existing email."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    data = request.get_json() or {}

    response = buttondown_request("PATCH", f"emails/{email_id}", creds, json=data)

    if not response.ok:
        return api_error("Failed to update email", response.status_code)

    return api_response(response.json())


@buttondown_bp.route("/emails/<email_id>/send", methods=["POST"])
@require_auth
def send_email(email_id: str):
    """Send a draft email."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    response = buttondown_request(
        "PATCH",
        f"emails/{email_id}",
        creds,
        json={"status": "sent"}
    )

    if not response.ok:
        return api_error("Failed to send email", response.status_code)

    return api_response({"sent": True, "email": response.json()})


@buttondown_bp.route("/subscribers", methods=["GET"])
@require_auth
def list_subscribers():
    """List subscribers."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    params = {
        "page": request.args.get("page", 1),
        "type": request.args.get("type"),
    }
    params = {k: v for k, v in params.items() if v}

    response = buttondown_request("GET", "subscribers", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch subscribers", response.status_code)

    return api_response(response.json())


@buttondown_bp.route("/subscribers", methods=["POST"])
@require_auth
def add_subscriber():
    """Add a new subscriber."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    data = request.get_json() or {}

    if not data.get("email"):
        return api_error("email required", 400)

    subscriber_data = {
        "email": data.get("email"),
        "metadata": data.get("metadata", {}),
        "tags": data.get("tags", []),
    }

    response = buttondown_request("POST", "subscribers", creds, json=subscriber_data)

    if not response.ok:
        return api_error("Failed to add subscriber", response.status_code)

    return api_response(response.json(), status_code=201)


@buttondown_bp.route("/subscribers/<subscriber_id>", methods=["DELETE"])
@require_auth
def remove_subscriber(subscriber_id: str):
    """Remove a subscriber."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    response = buttondown_request("DELETE", f"subscribers/{subscriber_id}", creds)

    if not response.ok:
        return api_error("Failed to remove subscriber", response.status_code)

    return api_response({"deleted": True})


@buttondown_bp.route("/analytics", methods=["GET"])
@require_auth
def get_analytics():
    """Get newsletter analytics."""
    creds = get_buttondown_credentials()
    if not creds:
        return api_error("Buttondown not configured", 400)

    response = buttondown_request("GET", "analytics", creds)

    if not response.ok:
        return api_error("Failed to fetch analytics", response.status_code)

    return api_response(response.json())
