"""
Medium API Integration

Endpoints for Medium publishing platform:
- User profile
- Publications
- Posts (create, get)
- Images upload
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

medium_bp = Blueprint("medium", __name__, url_prefix="/medium")

MEDIUM_API_BASE = "https://api.medium.com/v1"


def get_medium_headers(access_token: str) -> dict:
    """Get headers for Medium API requests."""
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Charset": "utf-8",
    }


@medium_bp.route("/me", methods=["GET"])
def get_current_user():
    """Get authenticated user's profile."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_medium_headers(access_token)

    resp = http_requests.get(f"{MEDIUM_API_BASE}/me", headers=headers, timeout=30)

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", {})
    return api_response(data)


@medium_bp.route("/users/<user_id>/publications", methods=["GET"])
def get_user_publications(user_id: str):
    """Get publications for a user."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_medium_headers(access_token)

    resp = http_requests.get(
        f"{MEDIUM_API_BASE}/users/{user_id}/publications",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", [])
    return api_response({"publications": data})


@medium_bp.route("/users/<user_id>/posts", methods=["POST"])
def create_user_post(user_id: str):
    """Create a post under user's profile."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_medium_headers(access_token)

    body = request.get_json() or {}
    title = body.get("title")
    content = body.get("content")
    content_format = body.get("contentFormat", "markdown")  # html or markdown
    publish_status = body.get("publishStatus", "draft")  # public, draft, unlisted
    tags = body.get("tags", [])
    canonical_url = body.get("canonicalUrl")
    license_type = body.get("license", "all-rights-reserved")

    if not title or not content:
        return api_error("Title and content are required", 400)

    payload = {
        "title": title,
        "contentFormat": content_format,
        "content": content,
        "publishStatus": publish_status,
        "tags": tags[:5],  # Medium allows max 5 tags
        "license": license_type,
    }

    if canonical_url:
        payload["canonicalUrl"] = canonical_url

    resp = http_requests.post(
        f"{MEDIUM_API_BASE}/users/{user_id}/posts",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", {})
    return api_response(data, 201)


@medium_bp.route("/publications/<publication_id>/posts", methods=["POST"])
def create_publication_post(publication_id: str):
    """Create a post under a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_medium_headers(access_token)

    body = request.get_json() or {}
    title = body.get("title")
    content = body.get("content")
    content_format = body.get("contentFormat", "markdown")
    publish_status = body.get("publishStatus", "draft")
    tags = body.get("tags", [])
    canonical_url = body.get("canonicalUrl")
    license_type = body.get("license", "all-rights-reserved")

    if not title or not content:
        return api_error("Title and content are required", 400)

    payload = {
        "title": title,
        "contentFormat": content_format,
        "content": content,
        "publishStatus": publish_status,
        "tags": tags[:5],
        "license": license_type,
    }

    if canonical_url:
        payload["canonicalUrl"] = canonical_url

    resp = http_requests.post(
        f"{MEDIUM_API_BASE}/publications/{publication_id}/posts",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", {})
    return api_response(data, 201)


@medium_bp.route("/images", methods=["POST"])
def upload_image():
    """Upload an image to Medium."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")

    if "image" not in request.files:
        return api_error("No image file provided", 400)

    image_file = request.files["image"]
    content_type = image_file.content_type

    if content_type not in ["image/jpeg", "image/png", "image/gif", "image/tiff"]:
        return api_error("Invalid image type. Supported: JPEG, PNG, GIF, TIFF", 400)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": content_type,
        "Accept": "application/json",
    }

    resp = http_requests.post(
        f"{MEDIUM_API_BASE}/images",
        headers=headers,
        data=image_file.read(),
        timeout=60,
    )

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", {})
    return api_response(data, 201)


@medium_bp.route("/publications/<publication_id>/contributors", methods=["GET"])
def get_publication_contributors(publication_id: str):
    """Get contributors of a publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("medium")
    if not creds:
        return api_error("Medium credentials not found", 404)

    access_token = creds.get("access_token")
    headers = get_medium_headers(access_token)

    resp = http_requests.get(
        f"{MEDIUM_API_BASE}/publications/{publication_id}/contributors",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Medium API error: {resp.status_code}", resp.status_code)

    data = resp.json().get("data", [])
    return api_response({"contributors": data})
