"""
Cohost API Integration

Endpoints for Cohost social platform:
- User/Project profile
- Posts (chost creation, editing)
- Likes and shares
- Followers/Following
- Tags

Note: Cohost uses cookie-based authentication.
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

cohost_bp = Blueprint("cohost", __name__, url_prefix="/cohost")

COHOST_API_BASE = "https://cohost.org/api/v1"


def get_cohost_headers(cookie: str) -> dict:
    """Get headers for Cohost API requests."""
    return {
        "Cookie": cookie,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "ChirpSyncer/1.0",
    }


@cohost_bp.route("/login", methods=["POST"])
def login():
    """Login to Cohost and get session cookie."""
    body = request.get_json() or {}
    email = body.get("email")
    password = body.get("password")

    if not email or not password:
        return api_error("Email and password are required", 400)

    # Get salt first
    salt_resp = http_requests.get(
        f"{COHOST_API_BASE}/login/salt",
        params={"email": email},
        timeout=30,
    )

    if not salt_resp.ok:
        return api_error("Failed to get login salt", salt_resp.status_code)

    salt_data = salt_resp.json()
    salt = salt_data.get("salt")

    if not salt:
        return api_error("Invalid email", 400)

    # Login with credentials
    # Note: Cohost uses client-side hashing, simplified here
    login_resp = http_requests.post(
        f"{COHOST_API_BASE}/login",
        json={"email": email, "clientHash": password},  # Should be hashed
        timeout=30,
    )

    if not login_resp.ok:
        return api_error("Login failed", login_resp.status_code)

    # Extract session cookie
    cookies = login_resp.cookies
    session_cookie = "; ".join([f"{k}={v}" for k, v in cookies.items()])

    return api_response({"cookie": session_cookie, "message": "Login successful"})


@cohost_bp.route("/me", methods=["GET"])
def get_logged_in_user():
    """Get currently logged in user info."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/trpc/login.loggedIn",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    return api_response(data.get("result", {}).get("data", {}))


@cohost_bp.route("/projects", methods=["GET"])
def get_my_projects():
    """Get user's projects (pages)."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/trpc/projects.listEditedProjects",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    return api_response({"projects": data.get("result", {}).get("data", {}).get("projects", [])})


@cohost_bp.route("/projects/<handle>", methods=["GET"])
def get_project(handle: str):
    """Get a project by handle."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/project/{handle}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@cohost_bp.route("/projects/<handle>/posts", methods=["GET"])
def get_project_posts(handle: str):
    """Get posts from a project."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    page = request.args.get("page", 0, type=int)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/project/{handle}/posts",
        headers=headers,
        params={"page": page},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    return api_response({
        "posts": data.get("items", []),
        "pagination": {
            "currentPage": data.get("currentPage"),
            "totalPages": data.get("nPages"),
            "totalItems": data.get("nItems"),
        },
    })


@cohost_bp.route("/projects/<project_id>/posts", methods=["POST"])
def create_post(project_id: str):
    """Create a new post (chost)."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    body = request.get_json() or {}

    # Post content blocks
    blocks = body.get("blocks", [])
    headline = body.get("headline", "")
    adult_content = body.get("adultContent", False)
    tags = body.get("tags", [])
    cws = body.get("cws", [])  # Content warnings
    share_of_post_id = body.get("shareOfPostId")  # For reblogs

    if not blocks:
        return api_error("At least one content block is required", 400)

    payload = {
        "postState": 1,  # 0=draft, 1=published
        "headline": headline,
        "adultContent": adult_content,
        "blocks": blocks,
        "cws": cws,
        "tags": tags,
    }

    if share_of_post_id:
        payload["shareOfPostId"] = share_of_post_id

    resp = http_requests.post(
        f"{COHOST_API_BASE}/project/{project_id}/posts",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@cohost_bp.route("/projects/<project_id>/posts/<int:post_id>", methods=["PUT"])
def update_post(project_id: str, post_id: int):
    """Update an existing post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    body = request.get_json() or {}

    resp = http_requests.put(
        f"{COHOST_API_BASE}/project/{project_id}/posts/{post_id}",
        headers=headers,
        json=body,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@cohost_bp.route("/projects/<project_id>/posts/<int:post_id>", methods=["DELETE"])
def delete_post(project_id: str, post_id: int):
    """Delete a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    resp = http_requests.delete(
        f"{COHOST_API_BASE}/project/{project_id}/posts/{post_id}",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response({"deleted": True})


@cohost_bp.route("/posts/<int:post_id>/like", methods=["POST"])
def like_post(post_id: int):
    """Like a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    project_id = creds.get("default_project_id")
    headers = get_cohost_headers(cookie)

    if not project_id:
        return api_error("Default project ID not configured", 400)

    resp = http_requests.post(
        f"{COHOST_API_BASE}/trpc/relationships.like",
        headers=headers,
        json={"fromProjectId": project_id, "toPostId": post_id},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response({"liked": True})


@cohost_bp.route("/posts/<int:post_id>/unlike", methods=["POST"])
def unlike_post(post_id: int):
    """Unlike a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    project_id = creds.get("default_project_id")
    headers = get_cohost_headers(cookie)

    if not project_id:
        return api_error("Default project ID not configured", 400)

    resp = http_requests.post(
        f"{COHOST_API_BASE}/trpc/relationships.unlike",
        headers=headers,
        json={"fromProjectId": project_id, "toPostId": post_id},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response({"unliked": True})


@cohost_bp.route("/dashboard", methods=["GET"])
def get_dashboard():
    """Get user's dashboard feed."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    page = request.args.get("page", 0, type=int)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/trpc/posts.listDashboardPosts",
        headers=headers,
        params={"page": page},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    result = data.get("result", {}).get("data", {})
    return api_response({
        "posts": result.get("posts", []),
        "pagination": {
            "currentPage": result.get("currentPage"),
            "totalPages": result.get("nPages"),
        },
    })


@cohost_bp.route("/projects/<handle>/follow", methods=["POST"])
def follow_project(handle: str):
    """Follow a project."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    project_id = creds.get("default_project_id")
    headers = get_cohost_headers(cookie)

    if not project_id:
        return api_error("Default project ID not configured", 400)

    resp = http_requests.post(
        f"{COHOST_API_BASE}/trpc/relationships.follow",
        headers=headers,
        json={"fromProjectId": project_id, "toProjectHandle": handle},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response({"following": True})


@cohost_bp.route("/projects/<handle>/unfollow", methods=["POST"])
def unfollow_project(handle: str):
    """Unfollow a project."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    project_id = creds.get("default_project_id")
    headers = get_cohost_headers(cookie)

    if not project_id:
        return api_error("Default project ID not configured", 400)

    resp = http_requests.post(
        f"{COHOST_API_BASE}/trpc/relationships.unfollow",
        headers=headers,
        json={"fromProjectId": project_id, "toProjectHandle": handle},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response({"unfollowed": True})


@cohost_bp.route("/notifications", methods=["GET"])
def get_notifications():
    """Get user's notifications."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    project_id = creds.get("default_project_id")
    headers = get_cohost_headers(cookie)

    if not project_id:
        return api_error("Default project ID not configured", 400)

    page = request.args.get("page", 0, type=int)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/notifications/list",
        headers=headers,
        params={"projectId": project_id, "page": page},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@cohost_bp.route("/tags/<tag>", methods=["GET"])
def get_tag_posts(tag: str):
    """Get posts for a specific tag."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("cohost")
    if not creds:
        return api_error("Cohost credentials not found", 404)

    cookie = creds.get("cookie")
    headers = get_cohost_headers(cookie)

    page = request.args.get("page", 0, type=int)

    resp = http_requests.get(
        f"{COHOST_API_BASE}/tagged/{tag}",
        headers=headers,
        params={"page": page},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Cohost API error: {resp.status_code}", resp.status_code)

    data = resp.json()
    return api_response({
        "posts": data.get("items", []),
        "pagination": {
            "currentPage": data.get("currentPage"),
            "totalPages": data.get("nPages"),
        },
    })
