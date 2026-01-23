"""Beehiiv API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

beehiiv_bp = Blueprint("beehiiv", __name__)


BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"


def get_beehiiv_credentials():
    """Get Beehiiv credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("beehiiv")


def beehiiv_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to Beehiiv API."""
    url = f"{BEEHIIV_API_BASE}/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {creds.get('api_key')}"
    headers["Content-Type"] = "application/json"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@beehiiv_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Beehiiv using API key."""
    data = request.get_json() or {}

    api_key = data.get("api_key")
    publication_id = data.get("publication_id")

    if not api_key:
        return api_error("api_key required", 400)

    try:
        # Verify key by fetching publications
        response = http_requests.get(
            f"{BEEHIIV_API_BASE}/publications",
            headers={"Authorization": f"Bearer {api_key}"}
        )

        if not response.ok:
            return api_error("Invalid API key", 401)

        publications = response.json().get("data", [])

        # Use first publication if not specified
        if not publication_id and publications:
            publication_id = publications[0].get("id")

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("beehiiv", {
            "api_key": api_key,
            "publication_id": publication_id,
        })

        return api_response({
            "authenticated": True,
            "publications": publications,
            "selected_publication": publication_id,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@beehiiv_bp.route("/publications", methods=["GET"])
@require_auth
def list_publications():
    """List publications."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    response = beehiiv_request("GET", "publications", creds)

    if not response.ok:
        return api_error("Failed to fetch publications", response.status_code)

    return api_response(response.json())


@beehiiv_bp.route("/publications/<pub_id>", methods=["GET"])
@require_auth
def get_publication(pub_id: str):
    """Get a specific publication."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    response = beehiiv_request("GET", f"publications/{pub_id}", creds)

    if not response.ok:
        return api_error("Publication not found", response.status_code)

    return api_response(response.json())


@beehiiv_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List posts."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    pub_id = request.args.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    params = {
        "status": request.args.get("status"),
        "limit": request.args.get("limit", 10),
        "page": request.args.get("page", 1),
        "order_by": request.args.get("order_by", "created"),
        "direction": request.args.get("direction", "desc"),
    }
    params = {k: v for k, v in params.items() if v}

    response = beehiiv_request(
        "GET",
        f"publications/{pub_id}/posts",
        creds,
        params=params
    )

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response(response.json())


@beehiiv_bp.route("/posts/<post_id>", methods=["GET"])
@require_auth
def get_post(post_id: str):
    """Get a specific post."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    pub_id = request.args.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    response = beehiiv_request(
        "GET",
        f"publications/{pub_id}/posts/{post_id}",
        creds
    )

    if not response.ok:
        return api_error("Post not found", response.status_code)

    return api_response(response.json())


@beehiiv_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new post."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    data = request.get_json() or {}

    pub_id = data.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    if not data.get("title"):
        return api_error("title required", 400)

    post_data = {
        "title": data.get("title"),
        "subtitle": data.get("subtitle"),
        "content": data.get("content"),
        "status": data.get("status", "draft"),
        "content_tags": data.get("content_tags", []),
        "send_email": data.get("send_email", False),
    }

    response = beehiiv_request(
        "POST",
        f"publications/{pub_id}/posts",
        creds,
        json=post_data
    )

    if not response.ok:
        return api_error("Failed to create post", response.status_code)

    return api_response(response.json(), status_code=201)


@beehiiv_bp.route("/posts/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id: str):
    """Delete a post."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    pub_id = request.args.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    response = beehiiv_request(
        "DELETE",
        f"publications/{pub_id}/posts/{post_id}",
        creds
    )

    if not response.ok:
        return api_error("Failed to delete post", response.status_code)

    return api_response({"deleted": True})


@beehiiv_bp.route("/subscriptions", methods=["GET"])
@require_auth
def list_subscriptions():
    """List subscriptions."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    pub_id = request.args.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    params = {
        "status": request.args.get("status"),
        "limit": request.args.get("limit", 10),
        "page": request.args.get("page", 1),
    }
    params = {k: v for k, v in params.items() if v}

    response = beehiiv_request(
        "GET",
        f"publications/{pub_id}/subscriptions",
        creds,
        params=params
    )

    if not response.ok:
        return api_error("Failed to fetch subscriptions", response.status_code)

    return api_response(response.json())


@beehiiv_bp.route("/subscriptions", methods=["POST"])
@require_auth
def create_subscription():
    """Create a new subscription."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    data = request.get_json() or {}

    pub_id = data.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    if not data.get("email"):
        return api_error("email required", 400)

    subscription_data = {
        "email": data.get("email"),
        "reactivate_existing": data.get("reactivate_existing", False),
        "send_welcome_email": data.get("send_welcome_email", True),
        "utm_source": data.get("utm_source"),
        "utm_medium": data.get("utm_medium"),
        "utm_campaign": data.get("utm_campaign"),
        "referring_site": data.get("referring_site"),
    }

    subscription_data = {k: v for k, v in subscription_data.items() if v is not None}

    response = beehiiv_request(
        "POST",
        f"publications/{pub_id}/subscriptions",
        creds,
        json=subscription_data
    )

    if not response.ok:
        return api_error("Failed to create subscription", response.status_code)

    return api_response(response.json(), status_code=201)


@beehiiv_bp.route("/segments", methods=["GET"])
@require_auth
def list_segments():
    """List segments."""
    creds = get_beehiiv_credentials()
    if not creds:
        return api_error("Beehiiv not configured", 400)

    pub_id = request.args.get("publication_id") or creds.get("publication_id")
    if not pub_id:
        return api_error("publication_id required", 400)

    response = beehiiv_request(
        "GET",
        f"publications/{pub_id}/segments",
        creds
    )

    if not response.ok:
        return api_error("Failed to fetch segments", response.status_code)

    return api_response(response.json())
