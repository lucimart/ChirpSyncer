"""
Dev.to (Forem) API Integration

Endpoints for Dev.to developer blogging platform:
- Articles (CRUD, publish, unpublish)
- User profile
- Comments
- Tags
- Organizations
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

devto_bp = Blueprint("devto", __name__, url_prefix="/devto")

DEVTO_API_BASE = "https://dev.to/api"


def get_devto_headers(api_key: str) -> dict:
    """Get headers for Dev.to API requests."""
    return {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@devto_bp.route("/me", methods=["GET"])
def get_current_user():
    """Get authenticated user's profile."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    resp = http_requests.get(f"{DEVTO_API_BASE}/users/me", headers=headers, timeout=30)

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@devto_bp.route("/articles", methods=["GET"])
def get_articles():
    """Get user's articles."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    # Query params
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    state = request.args.get("state", "all")  # all, published, unpublished

    params = {"page": page, "per_page": min(per_page, 1000)}
    if state != "all":
        params["state"] = state

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/articles/me",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"articles": resp.json()})


@devto_bp.route("/articles/published", methods=["GET"])
def get_published_articles():
    """Get user's published articles."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/articles/me/published",
        headers=headers,
        params={"page": page, "per_page": min(per_page, 1000)},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"articles": resp.json()})


@devto_bp.route("/articles/unpublished", methods=["GET"])
def get_unpublished_articles():
    """Get user's unpublished/draft articles."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/articles/me/unpublished",
        headers=headers,
        params={"page": page, "per_page": min(per_page, 1000)},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"articles": resp.json()})


@devto_bp.route("/articles/<int:article_id>", methods=["GET"])
def get_article(article_id: int):
    """Get a specific article by ID."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/articles/{article_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@devto_bp.route("/articles", methods=["POST"])
def create_article():
    """Create a new article."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    body = request.get_json() or {}
    title = body.get("title")
    body_markdown = body.get("body_markdown")
    published = body.get("published", False)
    tags = body.get("tags", [])
    series = body.get("series")
    main_image = body.get("main_image")
    canonical_url = body.get("canonical_url")
    description = body.get("description")
    organization_id = body.get("organization_id")

    if not title or not body_markdown:
        return api_error("Title and body_markdown are required", 400)

    article_data = {
        "title": title,
        "body_markdown": body_markdown,
        "published": published,
        "tags": tags[:4],  # Dev.to allows max 4 tags
    }

    if series:
        article_data["series"] = series
    if main_image:
        article_data["main_image"] = main_image
    if canonical_url:
        article_data["canonical_url"] = canonical_url
    if description:
        article_data["description"] = description
    if organization_id:
        article_data["organization_id"] = organization_id

    payload = {"article": article_data}

    resp = http_requests.post(
        f"{DEVTO_API_BASE}/articles",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@devto_bp.route("/articles/<int:article_id>", methods=["PUT"])
def update_article(article_id: int):
    """Update an existing article."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    body = request.get_json() or {}
    article_data = {}

    # Only include fields that are provided
    if "title" in body:
        article_data["title"] = body["title"]
    if "body_markdown" in body:
        article_data["body_markdown"] = body["body_markdown"]
    if "published" in body:
        article_data["published"] = body["published"]
    if "tags" in body:
        article_data["tags"] = body["tags"][:4]
    if "series" in body:
        article_data["series"] = body["series"]
    if "main_image" in body:
        article_data["main_image"] = body["main_image"]
    if "canonical_url" in body:
        article_data["canonical_url"] = body["canonical_url"]
    if "description" in body:
        article_data["description"] = body["description"]

    payload = {"article": article_data}

    resp = http_requests.put(
        f"{DEVTO_API_BASE}/articles/{article_id}",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@devto_bp.route("/articles/<int:article_id>/unpublish", methods=["PUT"])
def unpublish_article(article_id: int):
    """Unpublish an article (set to draft)."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    payload = {"article": {"published": False}}

    resp = http_requests.put(
        f"{DEVTO_API_BASE}/articles/{article_id}",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@devto_bp.route("/comments", methods=["GET"])
def get_comments():
    """Get comments for an article."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    article_id = request.args.get("a_id")
    if not article_id:
        return api_error("Article ID (a_id) is required", 400)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/comments",
        headers=headers,
        params={"a_id": article_id},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"comments": resp.json()})


@devto_bp.route("/tags", methods=["GET"])
def get_tags():
    """Get popular tags."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/tags",
        headers=headers,
        params={"page": page, "per_page": min(per_page, 1000)},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"tags": resp.json()})


@devto_bp.route("/organizations/<organization_id>", methods=["GET"])
def get_organization(organization_id: str):
    """Get organization details."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/organizations/{organization_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@devto_bp.route("/followers", methods=["GET"])
def get_followers():
    """Get user's followers."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 80, type=int)
    sort = request.args.get("sort", "created_at")  # created_at

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/followers/users",
        headers=headers,
        params={"page": page, "per_page": min(per_page, 1000), "sort": sort},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"followers": resp.json()})


@devto_bp.route("/readinglist", methods=["GET"])
def get_reading_list():
    """Get user's reading list."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("devto")
    if not creds:
        return api_error("Dev.to credentials not found", 404)

    api_key = creds.get("api_key")
    headers = get_devto_headers(api_key)

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)

    resp = http_requests.get(
        f"{DEVTO_API_BASE}/readinglist",
        headers=headers,
        params={"page": page, "per_page": min(per_page, 1000)},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Dev.to API error: {resp.status_code}", resp.status_code)

    return api_response({"reading_list": resp.json()})
