"""
Lemmy API Integration

Endpoints for Lemmy (Reddit alternative, ActivityPub):
- User profile
- Communities
- Posts
- Comments
- Voting
"""

import requests as http_requests
from flask import Blueprint, request

from app.web.api.v1.responses import api_response, api_error
from app.auth.credential_manager import CredentialManager

lemmy_bp = Blueprint("lemmy", __name__, url_prefix="/lemmy")


def get_lemmy_headers(jwt_token: str = None) -> dict:
    """Get headers for Lemmy API requests."""
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"
    return headers


def get_api_base(instance_url: str) -> str:
    """Get API base URL for instance."""
    return f"{instance_url.rstrip('/')}/api/v3"


@lemmy_bp.route("/login", methods=["POST"])
def login():
    """Login to get JWT token."""
    body = request.get_json() or {}
    instance_url = body.get("instance_url")
    username_or_email = body.get("username_or_email")
    password = body.get("password")

    if not all([instance_url, username_or_email, password]):
        return api_error("instance_url, username_or_email, and password required", 400)

    api_base = get_api_base(instance_url)

    resp = http_requests.post(
        f"{api_base}/user/login",
        json={
            "username_or_email": username_or_email,
            "password": password,
        },
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy login failed: {resp.status_code}", resp.status_code)

    data = resp.json()
    return api_response({
        "jwt": data.get("jwt"),
        "registration_created": data.get("registration_created", False),
        "verify_email_sent": data.get("verify_email_sent", False),
    })


@lemmy_bp.route("/site", methods=["GET"])
def get_site():
    """Get site/instance info."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    resp = http_requests.get(
        f"{api_base}/site",
        headers=headers,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/user", methods=["GET"])
def get_user():
    """Get user details."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    username = request.args.get("username")
    person_id = request.args.get("person_id")

    params = {}
    if username:
        params["username"] = username
    if person_id:
        params["person_id"] = person_id

    resp = http_requests.get(
        f"{api_base}/user",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/community/list", methods=["GET"])
def list_communities():
    """List communities."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    # Query params
    sort = request.args.get("sort", "TopAll")  # Active, Hot, New, Old, TopDay, etc.
    limit = request.args.get("limit", 20, type=int)
    page = request.args.get("page", 1, type=int)
    listing_type = request.args.get("type_", "All")  # All, Local, Subscribed

    params = {
        "sort": sort,
        "limit": min(limit, 50),
        "page": page,
        "type_": listing_type,
    }

    resp = http_requests.get(
        f"{api_base}/community/list",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/community", methods=["GET"])
def get_community():
    """Get community details."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    community_id = request.args.get("id")
    name = request.args.get("name")

    params = {}
    if community_id:
        params["id"] = community_id
    if name:
        params["name"] = name

    resp = http_requests.get(
        f"{api_base}/community",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/community/follow", methods=["POST"])
def follow_community():
    """Subscribe/unsubscribe to a community."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    community_id = body.get("community_id")
    follow = body.get("follow", True)

    if not community_id:
        return api_error("community_id is required", 400)

    payload = {
        "community_id": community_id,
        "follow": follow,
    }

    resp = http_requests.post(
        f"{api_base}/community/follow",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/post/list", methods=["GET"])
def list_posts():
    """List posts."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    # Query params
    sort = request.args.get("sort", "Hot")
    limit = request.args.get("limit", 20, type=int)
    page = request.args.get("page", 1, type=int)
    listing_type = request.args.get("type_", "All")
    community_id = request.args.get("community_id")
    community_name = request.args.get("community_name")

    params = {
        "sort": sort,
        "limit": min(limit, 50),
        "page": page,
        "type_": listing_type,
    }
    if community_id:
        params["community_id"] = community_id
    if community_name:
        params["community_name"] = community_name

    resp = http_requests.get(
        f"{api_base}/post/list",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/post", methods=["GET"])
def get_post():
    """Get a specific post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    post_id = request.args.get("id")
    if not post_id:
        return api_error("Post ID is required", 400)

    resp = http_requests.get(
        f"{api_base}/post",
        headers=headers,
        params={"id": post_id},
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/post", methods=["POST"])
def create_post():
    """Create a new post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    name = body.get("name")  # Title
    community_id = body.get("community_id")
    url = body.get("url")
    post_body = body.get("body")
    nsfw = body.get("nsfw", False)
    language_id = body.get("language_id")

    if not name or not community_id:
        return api_error("name and community_id are required", 400)

    payload = {
        "name": name,
        "community_id": community_id,
        "nsfw": nsfw,
    }
    if url:
        payload["url"] = url
    if post_body:
        payload["body"] = post_body
    if language_id:
        payload["language_id"] = language_id

    resp = http_requests.post(
        f"{api_base}/post",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@lemmy_bp.route("/post", methods=["PUT"])
def edit_post():
    """Edit a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    post_id = body.get("post_id")

    if not post_id:
        return api_error("post_id is required", 400)

    payload = {"post_id": post_id}
    if "name" in body:
        payload["name"] = body["name"]
    if "url" in body:
        payload["url"] = body["url"]
    if "body" in body:
        payload["body"] = body["body"]
    if "nsfw" in body:
        payload["nsfw"] = body["nsfw"]

    resp = http_requests.put(
        f"{api_base}/post",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/post/delete", methods=["POST"])
def delete_post():
    """Delete a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    post_id = body.get("post_id")
    deleted = body.get("deleted", True)

    if not post_id:
        return api_error("post_id is required", 400)

    payload = {
        "post_id": post_id,
        "deleted": deleted,
    }

    resp = http_requests.post(
        f"{api_base}/post/delete",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/post/like", methods=["POST"])
def vote_post():
    """Upvote/downvote a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    post_id = body.get("post_id")
    score = body.get("score", 1)  # 1 = upvote, -1 = downvote, 0 = remove vote

    if not post_id:
        return api_error("post_id is required", 400)

    if score not in [-1, 0, 1]:
        return api_error("score must be -1, 0, or 1", 400)

    payload = {
        "post_id": post_id,
        "score": score,
    }

    resp = http_requests.post(
        f"{api_base}/post/like",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/comment/list", methods=["GET"])
def list_comments():
    """List comments for a post."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    post_id = request.args.get("post_id")
    sort = request.args.get("sort", "Hot")
    limit = request.args.get("limit", 50, type=int)
    page = request.args.get("page", 1, type=int)

    params = {
        "sort": sort,
        "limit": min(limit, 50),
        "page": page,
    }
    if post_id:
        params["post_id"] = post_id

    resp = http_requests.get(
        f"{api_base}/comment/list",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/comment", methods=["POST"])
def create_comment():
    """Create a comment."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    content = body.get("content")
    post_id = body.get("post_id")
    parent_id = body.get("parent_id")  # For reply to another comment

    if not content or not post_id:
        return api_error("content and post_id are required", 400)

    payload = {
        "content": content,
        "post_id": post_id,
    }
    if parent_id:
        payload["parent_id"] = parent_id

    resp = http_requests.post(
        f"{api_base}/comment",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json(), 201)


@lemmy_bp.route("/comment/like", methods=["POST"])
def vote_comment():
    """Upvote/downvote a comment."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    body = request.get_json() or {}
    comment_id = body.get("comment_id")
    score = body.get("score", 1)

    if not comment_id:
        return api_error("comment_id is required", 400)

    if score not in [-1, 0, 1]:
        return api_error("score must be -1, 0, or 1", 400)

    payload = {
        "comment_id": comment_id,
        "score": score,
    }

    resp = http_requests.post(
        f"{api_base}/comment/like",
        headers=headers,
        json=payload,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())


@lemmy_bp.route("/search", methods=["GET"])
def search():
    """Search posts, comments, communities, users."""
    master_key = request.headers.get("X-Master-Key")
    if not master_key:
        return api_error("Master key required", 401)

    cm = CredentialManager(master_key)
    creds = cm.get_credentials("lemmy")
    if not creds:
        return api_error("Lemmy credentials not found", 404)

    instance_url = creds.get("instance_url")
    jwt_token = creds.get("jwt_token")
    api_base = get_api_base(instance_url)
    headers = get_lemmy_headers(jwt_token)

    q = request.args.get("q")
    search_type = request.args.get("type_", "All")  # All, Posts, Comments, Communities, Users
    sort = request.args.get("sort", "TopAll")
    limit = request.args.get("limit", 20, type=int)
    page = request.args.get("page", 1, type=int)

    if not q:
        return api_error("Search query (q) is required", 400)

    params = {
        "q": q,
        "type_": search_type,
        "sort": sort,
        "limit": min(limit, 50),
        "page": page,
    }

    resp = http_requests.get(
        f"{api_base}/search",
        headers=headers,
        params=params,
        timeout=30,
    )

    if not resp.ok:
        return api_error(f"Lemmy API error: {resp.status_code}", resp.status_code)

    return api_response(resp.json())
