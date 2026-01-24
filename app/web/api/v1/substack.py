"""
Substack API Integration

Endpoints for Substack newsletter platform:
- Publication info
- Posts (drafts, published)
- Subscribers (stats)
- Email sending

Note: Substack uses an unofficial API, functionality may be limited.
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

substack_bp = Blueprint("substack", __name__, url_prefix="/substack")


def get_substack_base_url(subdomain: str) -> str:
    """Get base URL for Substack publication."""
    return f"https://{subdomain}.substack.com/api/v1"


def get_substack_headers(session_cookie: str) -> dict:
    """Get headers for Substack API requests."""
    return {
        "Cookie": f"substack.sid={session_cookie}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@substack_bp.route("/publication", methods=["GET"])
def get_publication():
    """Get publication details."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    resp = http_requests.get(
        f"{base_url}/publication",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/posts", methods=["GET"])
def get_posts():
    """Get posts from publication."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    # Query params
    limit = request.args.get("limit", 12, type=int)
    offset = request.args.get("offset", 0, type=int)
    post_type = request.args.get("type", "newsletter")  # newsletter, podcast, thread

    resp = http_requests.get(
        f"{base_url}/posts",
        headers=headers,
        params={"limit": limit, "offset": offset, "type": post_type},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/drafts", methods=["GET"])
def get_drafts():
    """Get draft posts."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    resp = http_requests.get(
        f"{base_url}/drafts",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/posts", methods=["POST"])
def create_draft():
    """Create a new draft post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    body = request.get_json() or {}
    title = body.get("title", "")
    subtitle = body.get("subtitle", "")
    body_html = body.get("body", "")
    post_type = body.get("type", "newsletter")

    payload = {
        "title": title,
        "subtitle": subtitle,
        "body_html": body_html,
        "type": post_type,
        "draft": True,
    }

    resp = http_requests.post(
        f"{base_url}/drafts",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@substack_bp.route("/posts/<post_id>", methods=["PUT"])
def update_post(post_id: str):
    """Update a draft post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    body = request.get_json() or {}

    resp = http_requests.put(
        f"{base_url}/drafts/{post_id}",
        headers=headers,
        json=body,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/posts/<post_id>", methods=["DELETE"])
def delete_post(post_id: str):
    """Delete a draft post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    resp = http_requests.delete(
        f"{base_url}/drafts/{post_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response({"deleted": True})


@substack_bp.route("/posts/<post_id>/publish", methods=["POST"])
def publish_post(post_id: str):
    """Publish a draft post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    body = request.get_json() or {}
    send_email = body.get("send_email", True)
    audience = body.get("audience", "everyone")  # everyone, paid, founding

    payload = {
        "send": send_email,
        "audience": audience,
    }

    resp = http_requests.post(
        f"{base_url}/drafts/{post_id}/publish",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/subscribers/stats", methods=["GET"])
def get_subscriber_stats():
    """Get subscriber statistics."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    resp = http_requests.get(
        f"{base_url}/subscriber_stats",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@substack_bp.route("/settings", methods=["GET"])
def get_settings():
    """Get publication settings."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("substack")
    if not creds:
        return api_error("Substack credentials not found", 404)

    subdomain = creds.get("subdomain")
    session_cookie = creds.get("session_cookie")

    if not subdomain:
        return api_error("Substack subdomain not configured", 400)

    base_url = get_substack_base_url(subdomain)
    headers = get_substack_headers(session_cookie)

    resp = http_requests.get(
        f"{base_url}/settings",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Substack API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())
