"""
Mastodon API endpoints for direct platform interactions.

Provides endpoints for:
- Instance info
- Timeline/feed retrieval
- Status creation, deletion
- Favourites and boosts
"""

from flask import Blueprint, request
import requests

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_response, api_error
from app.core.logger import setup_logger

logger = setup_logger(__name__)

mastodon_bp = Blueprint("mastodon", __name__, url_prefix="/mastodon")

DEFAULT_INSTANCE = "https://mastodon.social"


def _get_mastodon_credentials(user_id: int) -> tuple[str, str]:
    """Get Mastodon instance URL and access token for user."""
    cm = CredentialManager()
    # Try to get mastodon credentials, fall back to stored instance
    creds = cm.get_credentials(user_id, "mastodon", "api")

    if not creds:
        raise ValueError("No Mastodon credentials found")

    instance_url = creds.get("instance_url", DEFAULT_INSTANCE)
    access_token = creds.get("access_token")

    if not access_token:
        raise ValueError("Mastodon access token not configured")

    return instance_url, access_token


def _mastodon_request(instance_url: str, token: str, endpoint: str, method: str = "GET", data: dict = None):
    """Make authenticated request to Mastodon API."""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{instance_url}/api/v1{endpoint}"

    if method == "GET":
        response = requests.get(url, headers=headers, params=data, timeout=30)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data, timeout=30)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers, timeout=30)
    else:
        raise ValueError(f"Unsupported method: {method}")

    response.raise_for_status()
    return response.json() if response.text else None


def _format_account(account: dict) -> dict:
    """Format Mastodon account to API response."""
    return {
        "id": account.get("id"),
        "username": account.get("username"),
        "acct": account.get("acct"),
        "displayName": account.get("display_name") or account.get("username"),
        "locked": account.get("locked", False),
        "bot": account.get("bot", False),
        "createdAt": account.get("created_at"),
        "note": account.get("note"),
        "url": account.get("url"),
        "avatar": account.get("avatar"),
        "header": account.get("header"),
        "followersCount": account.get("followers_count", 0),
        "followingCount": account.get("following_count", 0),
        "statusesCount": account.get("statuses_count", 0),
    }


def _format_status(status: dict) -> dict:
    """Format Mastodon status to API response."""
    return {
        "id": status.get("id"),
        "createdAt": status.get("created_at"),
        "inReplyToId": status.get("in_reply_to_id"),
        "sensitive": status.get("sensitive", False),
        "spoilerText": status.get("spoiler_text", ""),
        "visibility": status.get("visibility", "public"),
        "language": status.get("language"),
        "uri": status.get("uri"),
        "url": status.get("url"),
        "repliesCount": status.get("replies_count", 0),
        "reblogsCount": status.get("reblogs_count", 0),
        "favouritesCount": status.get("favourites_count", 0),
        "editedAt": status.get("edited_at"),
        "content": status.get("content", ""),
        "reblog": _format_status(status["reblog"]) if status.get("reblog") else None,
        "account": _format_account(status["account"]) if status.get("account") else None,
        "mediaAttachments": [
            {
                "id": m.get("id"),
                "type": m.get("type"),
                "url": m.get("url"),
                "previewUrl": m.get("preview_url"),
                "description": m.get("description"),
            }
            for m in status.get("media_attachments", [])
        ],
        "mentions": [
            {"id": m.get("id"), "username": m.get("username"), "acct": m.get("acct")}
            for m in status.get("mentions", [])
        ],
        "tags": [{"name": t.get("name"), "url": t.get("url")} for t in status.get("tags", [])],
        "favourited": status.get("favourited", False),
        "reblogged": status.get("reblogged", False),
        "bookmarked": status.get("bookmarked", False),
    }


@mastodon_bp.route("/instance", methods=["GET"])
@require_auth
def get_instance():
    """Get information about the Mastodon instance."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        data = _mastodon_request(instance_url, token, "/instance")

        return api_response({
            "uri": data.get("uri"),
            "title": data.get("title"),
            "shortDescription": data.get("short_description"),
            "description": data.get("description"),
            "email": data.get("email"),
            "version": data.get("version"),
            "stats": data.get("stats"),
            "thumbnail": data.get("thumbnail"),
            "languages": data.get("languages", []),
            "registrations": data.get("registrations", False),
            "configuration": data.get("configuration"),
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching instance: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon instance: {e}")
        return api_error("Failed to fetch instance info", 500)


@mastodon_bp.route("/timeline/home", methods=["GET"])
@require_auth
def get_home_timeline():
    """Get authenticated user's home timeline."""
    max_id = request.args.get("max_id")
    since_id = request.args.get("since_id")
    limit = min(int(request.args.get("limit", 40)), 80)

    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        params = {"limit": limit}
        if max_id:
            params["max_id"] = max_id
        if since_id:
            params["since_id"] = since_id

        statuses = _mastodon_request(instance_url, token, "/timelines/home", data=params)

        return api_response({
            "statuses": [_format_status(s) for s in statuses],
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching timeline: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon timeline: {e}")
        return api_error("Failed to fetch timeline", 500)


@mastodon_bp.route("/timeline/public", methods=["GET"])
@require_auth
def get_public_timeline():
    """Get public timeline."""
    max_id = request.args.get("max_id")
    since_id = request.args.get("since_id")
    limit = min(int(request.args.get("limit", 40)), 80)
    local = request.args.get("local", "false").lower() == "true"

    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        params = {"limit": limit, "local": local}
        if max_id:
            params["max_id"] = max_id
        if since_id:
            params["since_id"] = since_id

        statuses = _mastodon_request(instance_url, token, "/timelines/public", data=params)

        return api_response({
            "statuses": [_format_status(s) for s in statuses],
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching public timeline: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon public timeline: {e}")
        return api_error("Failed to fetch public timeline", 500)


@mastodon_bp.route("/status/<status_id>", methods=["GET"])
@require_auth
def get_status(status_id: str):
    """Get a single status by ID."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        status = _mastodon_request(instance_url, token, f"/statuses/{status_id}")
        return api_response(_format_status(status))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon status: {e}")
        return api_error("Failed to fetch status", 500)


@mastodon_bp.route("/status", methods=["POST"])
@require_auth
def create_status():
    """Create a new status."""
    data = request.get_json() or {}
    status_text = data.get("status", "").strip()
    visibility = data.get("visibility", "public")
    in_reply_to_id = data.get("in_reply_to_id")
    sensitive = data.get("sensitive", False)
    spoiler_text = data.get("spoiler_text", "")

    if not status_text:
        return api_error("Status text is required", 400)

    if len(status_text) > 500:
        return api_error("Status exceeds 500 character limit", 400)

    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        post_data = {
            "status": status_text,
            "visibility": visibility,
            "sensitive": sensitive,
        }
        if in_reply_to_id:
            post_data["in_reply_to_id"] = in_reply_to_id
        if spoiler_text:
            post_data["spoiler_text"] = spoiler_text

        status = _mastodon_request(instance_url, token, "/statuses", method="POST", data=post_data)
        return api_response(_format_status(status), 201)
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error creating status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error creating Mastodon status: {e}")
        return api_error("Failed to create status", 500)


@mastodon_bp.route("/status/<status_id>", methods=["DELETE"])
@require_auth
def delete_status(status_id: str):
    """Delete a status."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        _mastodon_request(instance_url, token, f"/statuses/{status_id}", method="DELETE")
        return api_response({"deleted": True})
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error deleting status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error deleting Mastodon status: {e}")
        return api_error("Failed to delete status", 500)


@mastodon_bp.route("/status/<status_id>/favourite", methods=["POST"])
@require_auth
def favourite_status(status_id: str):
    """Favourite a status."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        status = _mastodon_request(instance_url, token, f"/statuses/{status_id}/favourite", method="POST")
        return api_response(_format_status(status))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error favouriting status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error favouriting Mastodon status: {e}")
        return api_error("Failed to favourite status", 500)


@mastodon_bp.route("/status/<status_id>/unfavourite", methods=["POST"])
@require_auth
def unfavourite_status(status_id: str):
    """Remove favourite from a status."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        status = _mastodon_request(instance_url, token, f"/statuses/{status_id}/unfavourite", method="POST")
        return api_response(_format_status(status))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error unfavouriting status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error unfavouriting Mastodon status: {e}")
        return api_error("Failed to unfavourite status", 500)


@mastodon_bp.route("/status/<status_id>/reblog", methods=["POST"])
@require_auth
def reblog_status(status_id: str):
    """Boost/reblog a status."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        status = _mastodon_request(instance_url, token, f"/statuses/{status_id}/reblog", method="POST")
        return api_response(_format_status(status))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error reblogging status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error reblogging Mastodon status: {e}")
        return api_error("Failed to reblog status", 500)


@mastodon_bp.route("/status/<status_id>/unreblog", methods=["POST"])
@require_auth
def unreblog_status(status_id: str):
    """Remove boost/reblog from a status."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        status = _mastodon_request(instance_url, token, f"/statuses/{status_id}/unreblog", method="POST")
        return api_response(_format_status(status))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error unreblogging status: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error unreblogging Mastodon status: {e}")
        return api_error("Failed to unreblog status", 500)


@mastodon_bp.route("/account/<account_id>", methods=["GET"])
@require_auth
def get_account(account_id: str):
    """Get account information."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        account = _mastodon_request(instance_url, token, f"/accounts/{account_id}")
        return api_response(_format_account(account))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching account: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon account: {e}")
        return api_error("Failed to fetch account", 500)


@mastodon_bp.route("/account/<account_id>/statuses", methods=["GET"])
@require_auth
def get_account_statuses(account_id: str):
    """Get statuses from an account."""
    max_id = request.args.get("max_id")
    since_id = request.args.get("since_id")
    limit = min(int(request.args.get("limit", 40)), 80)
    exclude_replies = request.args.get("exclude_replies", "false").lower() == "true"
    exclude_reblogs = request.args.get("exclude_reblogs", "false").lower() == "true"

    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        params = {
            "limit": limit,
            "exclude_replies": exclude_replies,
            "exclude_reblogs": exclude_reblogs,
        }
        if max_id:
            params["max_id"] = max_id
        if since_id:
            params["since_id"] = since_id

        statuses = _mastodon_request(instance_url, token, f"/accounts/{account_id}/statuses", data=params)
        return api_response({
            "statuses": [_format_status(s) for s in statuses],
        })
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error fetching account statuses: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error fetching Mastodon account statuses: {e}")
        return api_error("Failed to fetch account statuses", 500)


@mastodon_bp.route("/verify_credentials", methods=["GET"])
@require_auth
def verify_credentials():
    """Verify credentials and get current user info."""
    try:
        instance_url, token = _get_mastodon_credentials(request.user_id)
        account = _mastodon_request(instance_url, token, "/accounts/verify_credentials")
        return api_response(_format_account(account))
    except ValueError as e:
        return api_error(str(e), 400)
    except requests.RequestException as e:
        logger.error(f"Mastodon API error verifying credentials: {e}")
        return api_error(f"Mastodon error: {str(e)}", 502)
    except Exception as e:
        logger.error(f"Error verifying Mastodon credentials: {e}")
        return api_error("Failed to verify credentials", 500)
