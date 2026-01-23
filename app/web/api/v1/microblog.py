"""Micro.blog API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

microblog_bp = Blueprint("microblog", __name__)


MICROBLOG_API_BASE = "https://micro.blog"


def get_microblog_credentials():
    """Get Micro.blog credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("microblog")


def microblog_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to Micro.blog API."""
    url = f"{MICROBLOG_API_BASE}/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {creds.get('app_token')}"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@microblog_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Micro.blog using app token."""
    data = request.get_json() or {}

    app_token = data.get("app_token")

    if not app_token:
        return api_error("app_token required", 400)

    try:
        # Verify token by fetching user info
        response = http_requests.get(
            f"{MICROBLOG_API_BASE}/micropub",
            headers={"Authorization": f"Bearer {app_token}"},
            params={"q": "config"}
        )

        if not response.ok:
            return api_error("Invalid token", 401)

        config_data = response.json()

        # Get user details
        user_response = http_requests.post(
            f"{MICROBLOG_API_BASE}/account/verify",
            headers={"Authorization": f"Bearer {app_token}"}
        )

        user_data = {}
        if user_response.ok:
            user_data = user_response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("microblog", {
            "app_token": app_token,
            "username": user_data.get("username"),
            "default_site": user_data.get("default_site"),
        })

        return api_response({
            "authenticated": True,
            "user": user_data,
            "config": config_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@microblog_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    response = http_requests.post(
        f"{MICROBLOG_API_BASE}/account/verify",
        headers={"Authorization": f"Bearer {creds.get('app_token')}"}
    )

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json())


@microblog_bp.route("/timeline", methods=["GET"])
@require_auth
def get_timeline():
    """Get user's timeline."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    params = {}
    if request.args.get("count"):
        params["count"] = request.args.get("count")
    if request.args.get("since_id"):
        params["since_id"] = request.args.get("since_id")
    if request.args.get("before_id"):
        params["before_id"] = request.args.get("before_id")

    response = microblog_request("GET", "posts/timeline", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch timeline", response.status_code)

    return api_response({"posts": response.json()})


@microblog_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List user's posts."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    username = creds.get("username")
    if not username:
        return api_error("Username not configured", 400)

    response = microblog_request("GET", f"posts/{username}", creds)

    if not response.ok:
        return api_error("Failed to fetch posts", response.status_code)

    return api_response({"posts": response.json()})


@microblog_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new post via Micropub."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    data = request.get_json() or {}

    content = data.get("content")
    if not content:
        return api_error("content required", 400)

    # Micropub format
    post_data = {
        "h": "entry",
        "content": content,
    }

    if data.get("name"):
        post_data["name"] = data.get("name")
    if data.get("category"):
        post_data["category"] = data.get("category")
    if data.get("photo"):
        post_data["photo"] = data.get("photo")
    if data.get("mp-destination"):
        post_data["mp-destination"] = data.get("mp-destination")

    response = http_requests.post(
        f"{MICROBLOG_API_BASE}/micropub",
        headers={
            "Authorization": f"Bearer {creds.get('app_token')}",
            "Content-Type": "application/json",
        },
        json=post_data
    )

    if response.status_code not in [200, 201, 202]:
        return api_error("Failed to create post", response.status_code)

    # Location header contains the new post URL
    location = response.headers.get("Location", "")

    return api_response({
        "created": True,
        "url": location,
    }, status_code=201)


@microblog_bp.route("/posts/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id: str):
    """Delete a post via Micropub."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    post_url = request.args.get("url", post_id)

    response = http_requests.post(
        f"{MICROBLOG_API_BASE}/micropub",
        headers={
            "Authorization": f"Bearer {creds.get('app_token')}",
            "Content-Type": "application/json",
        },
        json={
            "action": "delete",
            "url": post_url,
        }
    )

    if not response.ok:
        return api_error("Failed to delete post", response.status_code)

    return api_response({"deleted": True})


@microblog_bp.route("/media", methods=["POST"])
@require_auth
def upload_media():
    """Upload media to Micro.blog."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    if "file" not in request.files:
        return api_error("No file provided", 400)

    file = request.files["file"]

    response = http_requests.post(
        f"{MICROBLOG_API_BASE}/micropub/media",
        headers={"Authorization": f"Bearer {creds.get('app_token')}"},
        files={"file": (file.filename, file.read(), file.content_type)},
    )

    if response.status_code not in [200, 201, 202]:
        return api_error("Failed to upload media", response.status_code)

    location = response.headers.get("Location", "")

    return api_response({
        "uploaded": True,
        "url": location,
    }, status_code=201)


@microblog_bp.route("/bookmarks", methods=["GET"])
@require_auth
def list_bookmarks():
    """List user's bookmarks."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    response = microblog_request("GET", "posts/bookmarks", creds)

    if not response.ok:
        return api_error("Failed to fetch bookmarks", response.status_code)

    return api_response({"bookmarks": response.json()})


@microblog_bp.route("/discover", methods=["GET"])
@require_auth
def discover():
    """Get discover feed."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    topic = request.args.get("topic", "")

    if topic:
        endpoint = f"posts/discover/{topic}"
    else:
        endpoint = "posts/discover"

    response = microblog_request("GET", endpoint, creds)

    if not response.ok:
        return api_error("Failed to fetch discover feed", response.status_code)

    return api_response({"posts": response.json()})


@microblog_bp.route("/following", methods=["GET"])
@require_auth
def list_following():
    """List users being followed."""
    creds = get_microblog_credentials()
    if not creds:
        return api_error("Micro.blog not configured", 400)

    username = creds.get("username")
    if not username:
        return api_error("Username not configured", 400)

    response = microblog_request("GET", f"users/following/{username}", creds)

    if not response.ok:
        return api_error("Failed to fetch following", response.status_code)

    return api_response({"following": response.json()})
