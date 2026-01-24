"""Misskey/Firefish API endpoints for ChirpSyncer."""

from flask import Blueprint, request

from app.auth.credential_manager import CredentialManager
from app.auth.auth_decorators import require_auth
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error
import requests as http_requests

misskey_bp = Blueprint("misskey", __name__)



def get_misskey_credentials():
    """Get Misskey credentials from credential manager."""
    cm = CredentialManager()
    return cm.get_credentials("misskey")


def misskey_request(method: str, endpoint: str, creds: dict, data: dict = None, **kwargs):
    """Make authenticated request to Misskey API."""
    instance_url = creds.get("instance_url", "").rstrip("/")
    url = f"{instance_url}/api/{endpoint}"

    # Misskey uses POST for all API calls with body containing auth
    body = data or {}
    body["i"] = creds.get("access_token")

    response = http_requests.post(url, json=body, **kwargs)
    return response


@misskey_bp.route("/auth", methods=["POST"])
def authenticate():
    """Authenticate with Misskey using access token."""
    data = request.get_json() or {}

    instance_url = data.get("instance_url")
    access_token = data.get("access_token")

    if not all([instance_url, access_token]):
        return api_error("instance_url and access_token required", 400)

    try:
        # Verify token by fetching user info
        response = http_requests.post(
            f"{instance_url.rstrip('/')}/api/i",
            json={"i": access_token}
        )

        if not response.ok:
            return api_error("Invalid credentials", 401)

        user_data = response.json()

        # Store credentials
        cm = CredentialManager()
        cm.store_credentials("misskey", {
            "instance_url": instance_url,
            "access_token": access_token,
            "user_id": user_data.get("id"),
            "username": user_data.get("username"),
        })

        return api_response({
            "authenticated": True,
            "user": user_data,
        })
    except http_requests.RequestException as e:
        return api_error(f"Connection failed: {type(e).__name__}", 500)


@misskey_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "i", creds)

    if not response.ok:
        return api_error("Failed to fetch user", response.status_code)

    return api_response(response.json())


@misskey_bp.route("/timeline/home", methods=["GET"])
@require_auth
def get_home_timeline():
    """Get home timeline."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = {
        "limit": int(request.args.get("limit", 20)),
    }

    if request.args.get("since_id"):
        data["sinceId"] = request.args.get("since_id")
    if request.args.get("until_id"):
        data["untilId"] = request.args.get("until_id")

    response = misskey_request("POST", "notes/timeline", creds, data)

    if not response.ok:
        return api_error("Failed to fetch timeline", response.status_code)

    return api_response({"notes": response.json()})


@misskey_bp.route("/timeline/local", methods=["GET"])
@require_auth
def get_local_timeline():
    """Get local timeline."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = {
        "limit": int(request.args.get("limit", 20)),
    }

    response = misskey_request("POST", "notes/local-timeline", creds, data)

    if not response.ok:
        return api_error("Failed to fetch timeline", response.status_code)

    return api_response({"notes": response.json()})


@misskey_bp.route("/timeline/global", methods=["GET"])
@require_auth
def get_global_timeline():
    """Get global (federated) timeline."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = {
        "limit": int(request.args.get("limit", 20)),
    }

    response = misskey_request("POST", "notes/global-timeline", creds, data)

    if not response.ok:
        return api_error("Failed to fetch timeline", response.status_code)

    return api_response({"notes": response.json()})


@misskey_bp.route("/notes", methods=["POST"])
@require_auth
def create_note():
    """Create a new note (post)."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = request.get_json() or {}

    if not data.get("text") and not data.get("fileIds"):
        return api_error("text or fileIds required", 400)

    note_data = {
        "text": data.get("text"),
        "visibility": data.get("visibility", "public"),
        "localOnly": data.get("local_only", False),
        "cw": data.get("cw"),  # Content warning
        "fileIds": data.get("file_ids", []),
        "replyId": data.get("reply_id"),
        "renoteId": data.get("renote_id"),
        "poll": data.get("poll"),
    }

    # Remove None values
    note_data = {k: v for k, v in note_data.items() if v is not None}

    response = misskey_request("POST", "notes/create", creds, note_data)

    if not response.ok:
        return api_error("Failed to create note", response.status_code)

    return api_response(response.json(), status_code=201)


@misskey_bp.route("/notes/<note_id>", methods=["GET"])
@require_auth
def get_note(note_id: str):
    """Get a specific note."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "notes/show", creds, {"noteId": note_id})

    if not response.ok:
        return api_error("Note not found", response.status_code)

    return api_response(response.json())


@misskey_bp.route("/notes/<note_id>", methods=["DELETE"])
@require_auth
def delete_note(note_id: str):
    """Delete a note."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "notes/delete", creds, {"noteId": note_id})

    if not response.ok:
        return api_error("Failed to delete note", response.status_code)

    return api_response({"deleted": True})


@misskey_bp.route("/notes/<note_id>/renote", methods=["POST"])
@require_auth
def renote(note_id: str):
    """Renote (boost) a note."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = request.get_json() or {}

    renote_data = {
        "renoteId": note_id,
        "text": data.get("text"),
        "visibility": data.get("visibility", "public"),
    }

    renote_data = {k: v for k, v in renote_data.items() if v is not None}

    response = misskey_request("POST", "notes/create", creds, renote_data)

    if not response.ok:
        return api_error("Failed to renote", response.status_code)

    return api_response(response.json(), status_code=201)


@misskey_bp.route("/notes/<note_id>/reaction", methods=["POST"])
@require_auth
def add_reaction(note_id: str):
    """Add reaction to a note."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = request.get_json() or {}
    reaction = data.get("reaction", "👍")

    response = misskey_request(
        "POST",
        "notes/reactions/create",
        creds,
        {"noteId": note_id, "reaction": reaction}
    )

    if not response.ok:
        return api_error("Failed to add reaction", response.status_code)

    return api_response({"reacted": True})


@misskey_bp.route("/notes/<note_id>/reaction", methods=["DELETE"])
@require_auth
def remove_reaction(note_id: str):
    """Remove reaction from a note."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request(
        "POST",
        "notes/reactions/delete",
        creds,
        {"noteId": note_id}
    )

    if not response.ok:
        return api_error("Failed to remove reaction", response.status_code)

    return api_response({"unreacted": True})


@misskey_bp.route("/users/<user_id>", methods=["GET"])
@require_auth
def get_user(user_id: str):
    """Get user profile."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "users/show", creds, {"userId": user_id})

    if not response.ok:
        return api_error("User not found", response.status_code)

    return api_response(response.json())


@misskey_bp.route("/users/<user_id>/follow", methods=["POST"])
@require_auth
def follow_user(user_id: str):
    """Follow a user."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "following/create", creds, {"userId": user_id})

    if not response.ok:
        return api_error("Failed to follow user", response.status_code)

    return api_response({"following": True})


@misskey_bp.route("/users/<user_id>/unfollow", methods=["POST"])
@require_auth
def unfollow_user(user_id: str):
    """Unfollow a user."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    response = misskey_request("POST", "following/delete", creds, {"userId": user_id})

    if not response.ok:
        return api_error("Failed to unfollow user", response.status_code)

    return api_response({"following": False})


@misskey_bp.route("/drive/files", methods=["POST"])
@require_auth
def upload_file():
    """Upload a file to Misskey Drive."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    if "file" not in request.files:
        return api_error("No file provided", 400)

    file = request.files["file"]
    instance_url = creds.get("instance_url", "").rstrip("/")

    response = http_requests.post(
        f"{instance_url}/api/drive/files/create",
        data={"i": creds.get("access_token")},
        files={"file": (file.filename, file.read(), file.content_type)},
    )

    if not response.ok:
        return api_error("Failed to upload file", response.status_code)

    return api_response(response.json(), status_code=201)


@misskey_bp.route("/notifications", methods=["GET"])
@require_auth
def get_notifications():
    """Get notifications."""
    creds = get_misskey_credentials()
    if not creds:
        return api_error("Misskey not configured", 400)

    data = {
        "limit": int(request.args.get("limit", 20)),
    }

    response = misskey_request("POST", "i/notifications", creds, data)

    if not response.ok:
        return api_error("Failed to fetch notifications", response.status_code)

    return api_response({"notifications": response.json()})
