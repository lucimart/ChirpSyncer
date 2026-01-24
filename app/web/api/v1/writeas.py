"""Write.as API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

writeas_bp = Blueprint("writeas", __name__)


WRITEAS_API_BASE = "https://write.as/api"


def get_writeas_credentials():
    """Get Write.as credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("writeas")


def writeas_request(method: str, endpoint: str, creds: dict = None, **kwargs):
    """Make authenticated request to Write.as API."""
    url = f"{WRITEAS_API_BASE}/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Content-Type"] = "application/json"

    if creds and creds.get("access_token"):
        headers["Authorization"] = f"Token {creds['access_token']}"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@writeas_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Write.as."""
    data = request.get_json() or {}

    alias = data.get("alias")
    password = data.get("password")

    if not all([alias, password]):
        return api_error("alias and password required", 400)

    try:
        response = http_requests.post(
            f"{WRITEAS_API_BASE}/auth/login",
            json={"alias": alias, "pass": password}
        )

        if not response.ok:
            return api_error("Invalid credentials", 401)

        auth_data = response.json().get("data", {})
        access_token = auth_data.get("access_token")

        if not access_token:
            return api_error("No access token received", 400)

        # Fetch user info
        user_response = http_requests.get(
            f"{WRITEAS_API_BASE}/me",
            headers={"Authorization": f"Token {access_token}"}
        )

        user_data = {}
        if user_response.ok:
            user_data = user_response.json().get("data", {})

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("writeas", {
            "access_token": access_token,
            "username": user_data.get("username", alias),
        })

        return api_response({
            "authenticated": True,
            "user": user_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@writeas_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    response = writeas_request("GET", "me", creds)

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json().get("data", {}))


@writeas_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List user's posts."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    response = writeas_request("GET", "me/posts", creds)

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response({"posts": response.json().get("data", [])})


@writeas_bp.route("/posts/<post_id>", methods=["GET"])
def get_post(post_id: str):
    """Get a specific post (public)."""
    response = writeas_request("GET", f"posts/{post_id}")

    if not response.ok:
        return api_error("Post not found", response.status_code)

    return api_response(response.json().get("data", {}))


@writeas_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new post."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    data = request.get_json() or {}

    if not data.get("body"):
        return api_error("body required", 400)

    post_data = {
        "body": data.get("body"),
        "title": data.get("title"),
        "font": data.get("font", "norm"),
        "lang": data.get("lang"),
        "rtl": data.get("rtl", False),
    }

    # Post to collection if specified
    collection = data.get("collection")
    if collection:
        endpoint = f"collections/{collection}/posts"
    else:
        endpoint = "posts"

    response = writeas_request("POST", endpoint, creds, json=post_data)

    if not response.ok:
        return api_error("Failed to create post", response.status_code)

    return api_response(response.json().get("data", {}), status_code=201)


@writeas_bp.route("/posts/<post_id>", methods=["PUT"])
@require_auth
def update_post(post_id: str):
    """Update an existing post."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    data = request.get_json() or {}

    # Write.as requires token for anonymous posts
    post_data = {k: v for k, v in data.items() if v is not None}

    response = writeas_request("POST", f"posts/{post_id}", creds, json=post_data)

    if not response.ok:
        return api_error("Failed to update post", response.status_code)

    return api_response(response.json().get("data", {}))


@writeas_bp.route("/posts/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id: str):
    """Delete a post."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    response = writeas_request("DELETE", f"posts/{post_id}", creds)

    if not response.ok:
        return api_error("Failed to delete post", response.status_code)

    return api_response({"deleted": True})


@writeas_bp.route("/collections", methods=["GET"])
@require_auth
def list_collections():
    """List user's collections (blogs)."""
    creds = get_writeas_credentials()
    if not creds:
        return api_error("Write.as not configured", 400)

    response = writeas_request("GET", "me/collections", creds)

    if not response.ok:
        return api_error("Failed to fetch collections", response.status_code)

    return api_response({"collections": response.json().get("data", [])})


@writeas_bp.route("/collections/<alias>", methods=["GET"])
def get_collection(alias: str):
    """Get a collection by alias."""
    response = writeas_request("GET", f"collections/{alias}")

    if not response.ok:
        return api_error("Collection not found", response.status_code)

    return api_response(response.json().get("data", {}))


@writeas_bp.route("/collections/<alias>/posts", methods=["GET"])
def get_collection_posts(alias: str):
    """Get posts from a collection."""
    page = request.args.get("page", 1)

    response = writeas_request("GET", f"collections/{alias}/posts", params={"page": page})

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response(response.json().get("data", {}))
