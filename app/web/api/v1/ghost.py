"""Ghost API endpoints for ChirpSyncer."""

import hashlib
import hmac
import json
from datetime import datetime, timezone
from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

ghost_bp = Blueprint("ghost", __name__)



def get_ghost_credentials():
    """Get Ghost credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("ghost")


def generate_ghost_token(key: str) -> str:
    """Generate JWT token for Ghost Admin API."""
    import jwt

    # Split the key into ID and secret
    key_id, secret = key.split(":")

    # Decode the secret from hex
    secret_bytes = bytes.fromhex(secret)

    # Create the token
    iat = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "iat": iat,
        "exp": iat + 300,  # 5 minutes
        "aud": "/admin/",
    }

    token = jwt.encode(
        payload,
        secret_bytes,
        algorithm="HS256",
        headers={"kid": key_id, "alg": "HS256", "typ": "JWT"},
    )

    return token


def ghost_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to Ghost Admin API."""
    api_url = creds.get("api_url", "").rstrip("/")
    admin_key = creds.get("admin_key")

    token = generate_ghost_token(admin_key)
    url = f"{api_url}/ghost/api/admin/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Ghost {token}"
    headers["Content-Type"] = "application/json"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@ghost_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Ghost using Admin API key."""
    data = request.get_json() or {}

    api_url = data.get("api_url")
    admin_key = data.get("admin_key")

    if not all([api_url, admin_key]):
        return api_error("api_url and admin_key required", 400)

    # Validate key format
    if ":" not in admin_key:
        return api_error("Invalid admin key format (should be id:secret)", 400)

    try:
        # Verify credentials by fetching site info
        token = generate_ghost_token(admin_key)
        response = http_requests.get(
            f"{api_url.rstrip('/')}/ghost/api/admin/site/",
            headers={"Authorization": f"Ghost {token}"}
        )

        if not response.ok:
            return api_error("Invalid credentials", 401)

        site_data = response.json().get("site", {})

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("ghost", {
            "api_url": api_url,
            "admin_key": admin_key,
            "site_title": site_data.get("title"),
        })

        return api_response({
            "authenticated": True,
            "site": site_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)
    except Exception as e:
        return api_error(f"Authentication failed: {type(e).__name__}", 400)


@ghost_bp.route("/site", methods=["GET"])
@require_auth
def get_site():
    """Get Ghost site information."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    response = ghost_request("GET", "site/", creds)

    if not response.ok:
        return api_error("Failed to fetch site info", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List Ghost posts."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    params = {
        "limit": request.args.get("limit", 15),
        "page": request.args.get("page", 1),
        "filter": request.args.get("filter", ""),
        "order": request.args.get("order", "published_at desc"),
        "include": request.args.get("include", "tags,authors"),
    }

    response = ghost_request("GET", "posts/", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/posts/<post_id>", methods=["GET"])
@require_auth
def get_post(post_id: str):
    """Get a specific post."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    response = ghost_request("GET", f"posts/{post_id}/", creds)

    if not response.ok:
        return api_error("Post not found", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new Ghost post."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    data = request.get_json() or {}

    if not data.get("title"):
        return api_error("title required", 400)

    post_data = {
        "posts": [{
            "title": data.get("title"),
            "html": data.get("html") or data.get("content"),
            "mobiledoc": data.get("mobiledoc"),
            "status": data.get("status", "draft"),
            "excerpt": data.get("excerpt"),
            "tags": data.get("tags", []),
            "featured": data.get("featured", False),
            "feature_image": data.get("feature_image"),
            "slug": data.get("slug"),
        }]
    }

    response = ghost_request("POST", "posts/", creds, json=post_data)

    if not response.ok:
        return api_error("Failed to create post", response.status_code)

    return api_response(response.json(), status_code=201)


@ghost_bp.route("/posts/<post_id>", methods=["PUT"])
@require_auth
def update_post(post_id: str):
    """Update an existing post."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    data = request.get_json() or {}

    # Ghost requires updated_at for updates
    if "updated_at" not in data:
        # Fetch current post to get updated_at
        current = ghost_request("GET", f"posts/{post_id}/", creds)
        if current.ok:
            current_data = current.json().get("posts", [{}])[0]
            data["updated_at"] = current_data.get("updated_at")

    post_data = {"posts": [data]}

    response = ghost_request("PUT", f"posts/{post_id}/", creds, json=post_data)

    if not response.ok:
        return api_error("Failed to update post", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/posts/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id: str):
    """Delete a post."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    response = ghost_request("DELETE", f"posts/{post_id}/", creds)

    if not response.ok:
        return api_error("Failed to delete post", response.status_code)

    return api_response({"deleted": True})


@ghost_bp.route("/tags", methods=["GET"])
@require_auth
def list_tags():
    """List tags."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    response = ghost_request("GET", "tags/", creds, params={"limit": "all"})

    if not response.ok:
        return api_error("Failed to fetch tags", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/authors", methods=["GET"])
@require_auth
def list_authors():
    """List authors."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    response = ghost_request("GET", "users/", creds)

    if not response.ok:
        return api_error("Failed to fetch authors", response.status_code)

    return api_response(response.json())


@ghost_bp.route("/images", methods=["POST"])
@require_auth
def upload_image():
    """Upload an image to Ghost."""
    creds = get_ghost_credentials()
    if not creds:
        return api_error("Ghost not configured", 400)

    if "file" not in request.files:
        return api_error("No file provided", 400)

    file = request.files["file"]
    purpose = request.form.get("purpose", "image")

    api_url = creds.get("api_url", "").rstrip("/")
    token = generate_ghost_token(creds.get("admin_key"))

    response = http_requests.post(
        f"{api_url}/ghost/api/admin/images/upload/",
        headers={"Authorization": f"Ghost {token}"},
        files={"file": (file.filename, file.read(), file.content_type)},
        data={"purpose": purpose},
    )

    if not response.ok:
        return api_error("Failed to upload image", response.status_code)

    return api_response(response.json(), status_code=201)
