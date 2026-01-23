"""
Pixelfed API Integration

Endpoints for Pixelfed (ActivityPub photo sharing):
- Account/profile operations
- Timeline retrieval
- Photo/status operations
- Interactions (like, share, comment)

Note: Pixelfed uses Mastodon-compatible API.
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

pixelfed_bp = Blueprint("pixelfed", __name__, url_prefix="/pixelfed")


def get_pixelfed_headers(access_token: str) -> dict:
    """Get headers for Pixelfed API requests."""
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def get_api_base(instance_url: str) -> str:
    """Get API base URL for instance."""
    return f"{instance_url.rstrip('/')}/api/v1"


@pixelfed_bp.route("/verify_credentials", methods=["GET"])
def verify_credentials():
    """Verify credentials and get current user."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")

    if not instance_url:
        return api_error("Instance URL not configured", 400)

    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.get(
        f"{api_base}/accounts/verify_credentials",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/accounts/<account_id>", methods=["GET"])
def get_account(account_id: str):
    """Get account by ID."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.get(
        f"{api_base}/accounts/{account_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/accounts/<account_id>/statuses", methods=["GET"])
def get_account_statuses(account_id: str):
    """Get statuses/posts from an account."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    # Query params
    limit = request.args.get("limit", 20, type=int)
    max_id = request.args.get("max_id")
    min_id = request.args.get("min_id")
    only_media = request.args.get("only_media", "true")

    params = {"limit": min(limit, 40), "only_media": only_media}
    if max_id:
        params["max_id"] = max_id
    if min_id:
        params["min_id"] = min_id

    resp = http_requests.get(
        f"{api_base}/accounts/{account_id}/statuses",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response({"statuses": resp.json()})


@pixelfed_bp.route("/timelines/home", methods=["GET"])
def get_home_timeline():
    """Get home timeline."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    limit = request.args.get("limit", 20, type=int)
    max_id = request.args.get("max_id")
    min_id = request.args.get("min_id")

    params = {"limit": min(limit, 40)}
    if max_id:
        params["max_id"] = max_id
    if min_id:
        params["min_id"] = min_id

    resp = http_requests.get(
        f"{api_base}/timelines/home",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response({"statuses": resp.json()})


@pixelfed_bp.route("/timelines/public", methods=["GET"])
def get_public_timeline():
    """Get public/local timeline."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    limit = request.args.get("limit", 20, type=int)
    local = request.args.get("local", "true")

    params = {"limit": min(limit, 40), "local": local}

    resp = http_requests.get(
        f"{api_base}/timelines/public",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response({"statuses": resp.json()})


@pixelfed_bp.route("/statuses", methods=["POST"])
def create_status():
    """Create a new photo post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    body = request.get_json() or {}
    status_text = body.get("status", "")
    media_ids = body.get("media_ids", [])
    visibility = body.get("visibility", "public")
    sensitive = body.get("sensitive", False)
    spoiler_text = body.get("spoiler_text", "")

    if not media_ids:
        return api_error("Pixelfed requires at least one media attachment", 400)

    payload = {
        "status": status_text,
        "media_ids": media_ids,
        "visibility": visibility,
        "sensitive": sensitive,
    }

    if spoiler_text:
        payload["spoiler_text"] = spoiler_text

    resp = http_requests.post(
        f"{api_base}/statuses",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@pixelfed_bp.route("/statuses/<status_id>", methods=["GET"])
def get_status(status_id: str):
    """Get a specific status."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.get(
        f"{api_base}/statuses/{status_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/statuses/<status_id>", methods=["DELETE"])
def delete_status(status_id: str):
    """Delete a status."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.delete(
        f"{api_base}/statuses/{status_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response({"deleted": True})


@pixelfed_bp.route("/statuses/<status_id>/favourite", methods=["POST"])
def favourite_status(status_id: str):
    """Like a status."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.post(
        f"{api_base}/statuses/{status_id}/favourite",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/statuses/<status_id>/unfavourite", methods=["POST"])
def unfavourite_status(status_id: str):
    """Unlike a status."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.post(
        f"{api_base}/statuses/{status_id}/unfavourite",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/statuses/<status_id>/reblog", methods=["POST"])
def reblog_status(status_id: str):
    """Share/reblog a status."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.post(
        f"{api_base}/statuses/{status_id}/reblog",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/media", methods=["POST"])
def upload_media():
    """Upload media attachment."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)

    if "file" not in request.files:
        return api_error("No file provided", 400)

    file = request.files["file"]
    description = request.form.get("description", "")

    headers = {"Authorization": f"Bearer {access_token}"}
    files = {"file": (file.filename, file.stream, file.content_type)}
    data = {}
    if description:
        data["description"] = description

    resp = http_requests.post(
        f"{api_base}/media",
        headers=headers,
        files=files,
        data=data,
        timeout=60,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@pixelfed_bp.route("/accounts/<account_id>/follow", methods=["POST"])
def follow_account(account_id: str):
    """Follow an account."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.post(
        f"{api_base}/accounts/{account_id}/follow",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/accounts/<account_id>/unfollow", methods=["POST"])
def unfollow_account(account_id: str):
    """Unfollow an account."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.post(
        f"{api_base}/accounts/{account_id}/unfollow",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@pixelfed_bp.route("/discover/posts", methods=["GET"])
def discover_posts():
    """Get discover/explore posts."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("pixelfed")
    if not creds:
        return api_error("Pixelfed credentials not found", 404)

    instance_url = creds.get("instance_url")
    access_token = creds.get("access_token")
    api_base = get_api_base(instance_url)
    headers = get_pixelfed_headers(access_token)

    resp = http_requests.get(
        f"{api_base}/discover/posts",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Pixelfed API error: {resp.status_code}", resp.status_code)

    return api_response({"posts": resp.json()})
