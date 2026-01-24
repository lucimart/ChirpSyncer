"""PeerTube API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

peertube_bp = Blueprint("peertube", __name__)



def get_peertube_credentials():
    """Get PeerTube credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("peertube")


def peertube_request(method: str, endpoint: str, creds: dict, **kwargs):
    """Make authenticated request to PeerTube API."""
    instance_url = creds.get("instance_url", "").rstrip("/")
    url = f"{instance_url}/api/v1/{endpoint}"

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {creds.get('access_token')}"

    response = http_requests.request(method, url, headers=headers, **kwargs)
    return response


@peertube_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with PeerTube using OAuth2."""
    data = request.get_json() or {}

    instance_url = data.get("instance_url")
    username = data.get("username")
    password = data.get("password")

    if not all([instance_url, username, password]):
        return api_error("instance_url, username, and password required", 400)

    try:
        instance_url = instance_url.rstrip("/")

        # Get OAuth client credentials
        client_response = http_requests.get(
            f"{instance_url}/api/v1/oauth-clients/local"
        )

        if not client_response.ok:
            return api_error("Failed to get OAuth client", 400)

        client_data = client_response.json()
        client_id = client_data.get("client_id")
        client_secret = client_data.get("client_secret")

        # Get access token
        token_response = http_requests.post(
            f"{instance_url}/api/v1/users/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "password",
                "username": username,
                "password": password,
            }
        )

        if not token_response.ok:
            return api_error("Invalid credentials", 401)

        token_data = token_response.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")

        # Get user info
        user_response = http_requests.get(
            f"{instance_url}/api/v1/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        user_data = {}
        if user_response.ok:
            user_data = user_response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("peertube", {
            "instance_url": instance_url,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "username": user_data.get("username"),
            "user_id": user_data.get("id"),
        })

        return api_response({
            "authenticated": True,
            "user": user_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@peertube_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    response = peertube_request("GET", "users/me", creds)

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/videos", methods=["GET"])
@require_auth
def list_videos():
    """List videos."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    params = {
        "count": request.args.get("count", 15),
        "start": request.args.get("start", 0),
        "sort": request.args.get("sort", "-publishedAt"),
        "nsfw": request.args.get("nsfw", "false"),
    }

    if request.args.get("categoryOneOf"):
        params["categoryOneOf"] = request.args.get("categoryOneOf")
    if request.args.get("tagsOneOf"):
        params["tagsOneOf"] = request.args.get("tagsOneOf")
    if request.args.get("search"):
        params["search"] = request.args.get("search")

    response = peertube_request("GET", "videos", creds, params=params)

    if not response.ok:
        return api_error("Failed to fetch videos", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/videos/<video_id>", methods=["GET"])
@require_auth
def get_video(video_id: str):
    """Get a specific video."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    response = peertube_request("GET", f"videos/{video_id}", creds)

    if not response.ok:
        return api_error("Video not found", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/videos", methods=["POST"])
@require_auth
def upload_video():
    """Upload a video to PeerTube."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    if "videofile" not in request.files:
        return api_error("No video file provided", 400)

    video_file = request.files["videofile"]

    # Required fields
    name = request.form.get("name")
    channel_id = request.form.get("channelId")

    if not name:
        return api_error("name required", 400)
    if not channel_id:
        return api_error("channelId required", 400)

    instance_url = creds.get("instance_url", "").rstrip("/")

    form_data = {
        "name": name,
        "channelId": channel_id,
        "privacy": request.form.get("privacy", "1"),  # 1=public
        "category": request.form.get("category"),
        "description": request.form.get("description"),
        "language": request.form.get("language"),
        "licence": request.form.get("licence"),
        "nsfw": request.form.get("nsfw", "false"),
        "tags": request.form.getlist("tags"),
    }

    form_data = {k: v for k, v in form_data.items() if v}

    response = http_requests.post(
        f"{instance_url}/api/v1/videos/upload",
        headers={"Authorization": f"Bearer {creds.get('access_token')}"},
        data=form_data,
        files={"videofile": (video_file.filename, video_file.read(), video_file.content_type)},
    )

    if not response.ok:
        return api_error("Failed to upload video", response.status_code)

    return api_response(response.json(), status_code=201)


@peertube_bp.route("/videos/<video_id>", methods=["PUT"])
@require_auth
def update_video(video_id: str):
    """Update video metadata."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    data = request.get_json() or {}

    response = peertube_request("PUT", f"videos/{video_id}", creds, json=data)

    if not response.ok:
        return api_error("Failed to update video", response.status_code)

    return api_response({"updated": True})


@peertube_bp.route("/videos/<video_id>", methods=["DELETE"])
@require_auth
def delete_video(video_id: str):
    """Delete a video."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    response = peertube_request("DELETE", f"videos/{video_id}", creds)

    if not response.ok:
        return api_error("Failed to delete video", response.status_code)

    return api_response({"deleted": True})


@peertube_bp.route("/videos/<video_id>/rate", methods=["PUT"])
@require_auth
def rate_video(video_id: str):
    """Rate a video (like/dislike)."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    data = request.get_json() or {}
    rating = data.get("rating", "like")  # like, dislike, none

    if rating not in ["like", "dislike", "none"]:
        return api_error("rating must be like, dislike, or none", 400)

    response = peertube_request(
        "PUT",
        f"videos/{video_id}/rate",
        creds,
        json={"rating": rating}
    )

    if not response.ok:
        return api_error("Failed to rate video", response.status_code)

    return api_response({"rated": rating})


@peertube_bp.route("/videos/<video_id>/comments", methods=["GET"])
@require_auth
def get_comments(video_id: str):
    """Get video comments."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    response = peertube_request("GET", f"videos/{video_id}/comment-threads", creds)

    if not response.ok:
        return api_error("Failed to fetch comments", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/videos/<video_id>/comments", methods=["POST"])
@require_auth
def add_comment(video_id: str):
    """Add a comment to a video."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    data = request.get_json() or {}

    if not data.get("text"):
        return api_error("text required", 400)

    response = peertube_request(
        "POST",
        f"videos/{video_id}/comment-threads",
        creds,
        json={"text": data.get("text")}
    )

    if not response.ok:
        return api_error("Failed to add comment", response.status_code)

    return api_response(response.json(), status_code=201)


@peertube_bp.route("/channels", methods=["GET"])
@require_auth
def list_my_channels():
    """List user's channels."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    username = creds.get("username")
    if not username:
        return api_error("Username not configured", 400)

    response = peertube_request("GET", f"accounts/{username}/video-channels", creds)

    if not response.ok:
        return api_error("Failed to fetch channels", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/subscriptions", methods=["GET"])
@require_auth
def list_subscriptions():
    """List user's subscriptions."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    response = peertube_request("GET", "users/me/subscriptions", creds)

    if not response.ok:
        return api_error("Failed to fetch subscriptions", response.status_code)

    return api_response(response.json())


@peertube_bp.route("/subscriptions", methods=["POST"])
@require_auth
def subscribe():
    """Subscribe to a channel."""
    creds = get_peertube_credentials()
    if not creds:
        return api_error("PeerTube not configured", 400)

    data = request.get_json() or {}
    uri = data.get("uri")  # Format: username@host or channel_handle@host

    if not uri:
        return api_error("uri required", 400)

    response = peertube_request(
        "POST",
        "users/me/subscriptions",
        creds,
        json={"uri": uri}
    )

    if not response.ok:
        return api_error("Failed to subscribe", response.status_code)

    return api_response({"subscribed": True})
