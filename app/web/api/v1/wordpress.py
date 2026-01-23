"""WordPress API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

wordpress_bp = Blueprint("wordpress", __name__)



def get_wp_credentials():
    """Get WordPress credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("wordpress")


def wp_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to WordPress REST API."""
    site_url = creds.get("site_url", "").rstrip("/")
    url = f"{site_url}/wp-json/wp/v2/{endpoint}"

    headers = kwargs.pop("headers", {})

    # Support both Application Passwords and JWT
    if creds.get("app_password"):
        import base64
        credentials = f"{creds['username']}:{creds['app_password']}"
        encoded = base64.b64encode(credentials.encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"
    elif creds.get("jwt_token"):
        headers["Authorization"] = f"Bearer {creds['jwt_token']}"

    headers["Content-Type"] = "application/json"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@wordpress_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with WordPress using Application Password or JWT."""
    data = request.get_json() or {}

    site_url = data.get("site_url")
    username = data.get("username")
    app_password = data.get("app_password")

    if not all([site_url, username, app_password]):
        return api_error("site_url, username, and app_password required", 400)

    # Verify credentials by fetching user info
    try:
        import base64
        credentials = f"{username}:{app_password}"
        encoded = base64.b64encode(credentials.encode()).decode()

        response = http_requests.get(
            f"{site_url.rstrip('/')}/wp-json/wp/v2/users/me",
            headers={"Authorization": f"Basic {encoded}"}
        )

        if not response.ok:
            return api_error("Invalid credentials", 401)

        user_data = response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("wordpress", {
            "site_url": site_url,
            "username": username,
            "app_password": app_password,
            "user_id": user_data.get("id"),
            "display_name": user_data.get("name"),
        })

        return api_response({
            "authenticated": True,
            "user": {
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "slug": user_data.get("slug"),
            }
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@wordpress_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    response = wp_request("GET", "users/me", creds)

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json())


@wordpress_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List WordPress posts."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    params = {
        "per_page": request.args.get("per_page", 10),
        "page": request.args.get("page", 1),
        "status": request.args.get("status", "publish,draft"),
        "orderby": request.args.get("orderby", "date"),
        "order": request.args.get("order", "desc"),
    }

    response = wp_request("GET", "posts", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response({
        "posts": response.json(),
        "total": response.headers.get("X-WP-Total"),
        "total_pages": response.headers.get("X-WP-TotalPages"),
    })


@wordpress_bp.route("/posts/<int:post_id>", methods=["GET"])
@require_auth
def get_post(post_id: int):
    """Get a specific post."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    response = wp_request("GET", f"posts/{post_id}", creds)

    if not response.ok:
        return api_error("Post not found", response.status_code)

    return api_response(response.json())


@wordpress_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new WordPress post."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    data = request.get_json() or {}

    if not data.get("title") and not data.get("content"):
        return api_error("title or content required", 400)

    post_data = {
        "title": data.get("title", ""),
        "content": data.get("content", ""),
        "status": data.get("status", "draft"),
        "excerpt": data.get("excerpt"),
        "categories": data.get("categories", []),
        "tags": data.get("tags", []),
        "featured_media": data.get("featured_media"),
        "format": data.get("format", "standard"),
    }

    # Remove None values
    post_data = {k: v for k, v in post_data.items() if v is not None}

    response = wp_request("POST", "posts", creds, json=post_data)

    if not response.ok:
        return api_error("Failed to create post", response.status_code)

    return api_response(response.json(), status_code=201)


@wordpress_bp.route("/posts/<int:post_id>", methods=["PUT"])
@require_auth
def update_post(post_id: int):
    """Update an existing post."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    data = request.get_json() or {}

    response = wp_request("PUT", f"posts/{post_id}", creds, json=data)

    if not response.ok:
        return api_error("Failed to update post", response.status_code)

    return api_response(response.json())


@wordpress_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id: int):
    """Delete a post."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    force = request.args.get("force", "false").lower() == "true"

    response = wp_request("DELETE", f"posts/{post_id}", creds, params={"force": force})

    if not response.ok:
        return api_error("Failed to delete post", response.status_code)

    return api_response({"deleted": True, "post": response.json()})


@wordpress_bp.route("/categories", methods=["GET"])
@require_auth
def list_categories():
    """List categories."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    response = wp_request("GET", "categories", creds, params={"per_page": 100})

    if not response.ok:
        return api_error("Failed to fetch categories", response.status_code)

    return api_response({"categories": response.json()})


@wordpress_bp.route("/tags", methods=["GET"])
@require_auth
def list_tags():
    """List tags."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    response = wp_request("GET", "tags", creds, params={"per_page": 100})

    if not response.ok:
        return api_error("Failed to fetch tags", response.status_code)

    return api_response({"tags": response.json()})


@wordpress_bp.route("/media", methods=["POST"])
@require_auth
def upload_media():
    """Upload media to WordPress."""
    creds = get_wp_credentials()
    if not creds:
        return api_error("WordPress not configured", 400)

    if "file" not in request.files:
        return api_error("No file provided", 400)

    file = request.files["file"]

    site_url = creds.get("site_url", "").rstrip("/")
    url = f"{site_url}/wp-json/wp/v2/media"

    import base64
    credentials = f"{creds['username']}:{creds['app_password']}"
    encoded = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded}",
        "Content-Disposition": f'attachment; filename="{file.filename}"',
    }

    response = http_requests.post(
        url,
        headers=headers,
        data=file.read(),
    )

    if not response.ok:
        return api_error("Failed to upload media", response.status_code)

    return api_response(response.json(), status_code=201)
