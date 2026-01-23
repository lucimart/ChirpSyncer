"""
Pinterest API Blueprint
OAuth 2.0 authenticated Pinterest API v5
"""

import hashlib
import hmac
import time
from functools import wraps

import requests
from flask import Blueprint, g, request

from app.auth.credential_manager import credential_manager
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

pinterest_bp = Blueprint("pinterest", __name__, url_prefix="/pinterest")

PINTEREST_API_BASE = "https://api.pinterest.com/v5"


def require_pinterest_credentials(f):
    """Decorator to require Pinterest credentials."""

    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = g.user_id

        credentials = credential_manager.get_credentials(user_id, "pinterest")
        if not credentials:
            raise ApiError("PINTEREST_NOT_CONNECTED", "Pinterest account not connected", 401)

        access_token = credentials.get("access_token")
        if not access_token:
            raise ApiError("PINTEREST_INVALID_CREDENTIALS", "Invalid Pinterest credentials", 401)

        # Check if token needs refresh
        expires_at = credentials.get("expires_at", 0)
        if expires_at and time.time() > expires_at - 300:  # 5 min buffer
            credentials = _refresh_token(user_id, credentials)

        g.pinterest_credentials = credentials
        return f(*args, **kwargs)

    return decorated


def _refresh_token(user_id: str, credentials: dict) -> dict:
    """Refresh Pinterest access token."""
    refresh_token = credentials.get("refresh_token")
    client_id = credentials.get("client_id")
    client_secret = credentials.get("client_secret")

    if not all([refresh_token, client_id, client_secret]):
        raise ApiError("PINTEREST_REFRESH_FAILED", "Missing credentials for token refresh", 401)

    response = requests.post(
        "https://api.pinterest.com/v5/oauth/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
    )

    if not response.ok:
        raise ApiError("PINTEREST_REFRESH_FAILED", "Failed to refresh access token", 401)

    data = response.json()
    credentials["access_token"] = data["access_token"]
    if "refresh_token" in data:
        credentials["refresh_token"] = data["refresh_token"]
    credentials["expires_at"] = time.time() + data.get("expires_in", 3600)

    credential_manager.store_credentials(user_id, "pinterest", credentials)
    return credentials


def _pinterest_request(
    method: str,
    endpoint: str,
    access_token: str,
    data: dict = None,
    params: dict = None,
) -> dict:
    """Make authenticated request to Pinterest API."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    url = f"{PINTEREST_API_BASE}{endpoint}"

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        json=data,
        params=params,
        timeout=30,
    )

    if not response.ok:
        error_data = response.json() if response.content else {}
        error_msg = error_data.get("message", f"Pinterest API error: {response.status_code}")
        raise ApiError("PINTEREST_API_ERROR", error_msg, response.status_code)

    if response.status_code == 204:
        return {}

    return response.json()


# ============================================================================
# User Endpoints
# ============================================================================


@pinterest_bp.route("/me", methods=["GET"])
@require_pinterest_credentials
def get_me():
    """Get authenticated user profile."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    result = _pinterest_request("GET", "/user_account", access_token)

    return api_response(
        {
            "username": result.get("username"),
            "account_type": result.get("account_type"),
            "profile_image": result.get("profile_image"),
            "website_url": result.get("website_url"),
            "business_name": result.get("business_name"),
        }
    )


# ============================================================================
# Boards Endpoints
# ============================================================================


@pinterest_bp.route("/boards", methods=["GET"])
@require_pinterest_credentials
def get_boards():
    """Get user's boards."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    page_size = request.args.get("page_size", 25, type=int)
    bookmark = request.args.get("bookmark")

    params = {"page_size": min(page_size, 100)}
    if bookmark:
        params["bookmark"] = bookmark

    result = _pinterest_request("GET", "/boards", access_token, params=params)

    boards = []
    for board in result.get("items", []):
        boards.append(
            {
                "id": board.get("id"),
                "name": board.get("name"),
                "description": board.get("description"),
                "pin_count": board.get("pin_count"),
                "follower_count": board.get("follower_count"),
                "privacy": board.get("privacy"),
                "owner": board.get("owner"),
            }
        )

    return api_response(
        {
            "boards": boards,
            "bookmark": result.get("bookmark"),
        }
    )


@pinterest_bp.route("/boards", methods=["POST"])
@require_pinterest_credentials
def create_board():
    """Create a new board."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    name = data.get("name")
    if not name:
        raise ApiError("INVALID_REQUEST", "Board name required", 400)

    board_data = {
        "name": name,
        "description": data.get("description", ""),
        "privacy": data.get("privacy", "PUBLIC"),
    }

    result = _pinterest_request("POST", "/boards", access_token, data=board_data)

    return api_response(
        {
            "id": result.get("id"),
            "name": result.get("name"),
            "description": result.get("description"),
            "privacy": result.get("privacy"),
        }
    )


@pinterest_bp.route("/boards/<board_id>", methods=["GET"])
@require_pinterest_credentials
def get_board(board_id):
    """Get board details."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    result = _pinterest_request("GET", f"/boards/{board_id}", access_token)

    return api_response(
        {
            "id": result.get("id"),
            "name": result.get("name"),
            "description": result.get("description"),
            "pin_count": result.get("pin_count"),
            "follower_count": result.get("follower_count"),
            "privacy": result.get("privacy"),
            "owner": result.get("owner"),
        }
    )


@pinterest_bp.route("/boards/<board_id>", methods=["DELETE"])
@require_pinterest_credentials
def delete_board(board_id):
    """Delete a board."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    _pinterest_request("DELETE", f"/boards/{board_id}", access_token)

    return api_response({"deleted": True})


@pinterest_bp.route("/boards/<board_id>/pins", methods=["GET"])
@require_pinterest_credentials
def get_board_pins(board_id):
    """Get pins from a board."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    page_size = request.args.get("page_size", 25, type=int)
    bookmark = request.args.get("bookmark")

    params = {"page_size": min(page_size, 100)}
    if bookmark:
        params["bookmark"] = bookmark

    result = _pinterest_request("GET", f"/boards/{board_id}/pins", access_token, params=params)

    pins = []
    for pin in result.get("items", []):
        pins.append(_format_pin(pin))

    return api_response(
        {
            "pins": pins,
            "bookmark": result.get("bookmark"),
        }
    )


# ============================================================================
# Pins Endpoints
# ============================================================================


def _format_pin(pin: dict) -> dict:
    """Format pin data for response."""
    return {
        "id": pin.get("id"),
        "title": pin.get("title"),
        "description": pin.get("description"),
        "link": pin.get("link"),
        "board_id": pin.get("board_id"),
        "created_at": pin.get("created_at"),
        "media": pin.get("media"),
        "dominant_color": pin.get("dominant_color"),
        "alt_text": pin.get("alt_text"),
    }


@pinterest_bp.route("/pins", methods=["GET"])
@require_pinterest_credentials
def get_pins():
    """Get user's pins."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    page_size = request.args.get("page_size", 25, type=int)
    bookmark = request.args.get("bookmark")

    params = {"page_size": min(page_size, 100)}
    if bookmark:
        params["bookmark"] = bookmark

    result = _pinterest_request("GET", "/pins", access_token, params=params)

    pins = []
    for pin in result.get("items", []):
        pins.append(_format_pin(pin))

    return api_response(
        {
            "pins": pins,
            "bookmark": result.get("bookmark"),
        }
    )


@pinterest_bp.route("/pins", methods=["POST"])
@require_pinterest_credentials
def create_pin():
    """Create a new pin."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    board_id = data.get("board_id")
    if not board_id:
        raise ApiError("INVALID_REQUEST", "Board ID required", 400)

    media_source = data.get("media_source")
    if not media_source:
        raise ApiError("INVALID_REQUEST", "Media source required", 400)

    pin_data = {
        "board_id": board_id,
        "media_source": media_source,
    }

    if data.get("title"):
        pin_data["title"] = data["title"]
    if data.get("description"):
        pin_data["description"] = data["description"]
    if data.get("link"):
        pin_data["link"] = data["link"]
    if data.get("alt_text"):
        pin_data["alt_text"] = data["alt_text"]

    result = _pinterest_request("POST", "/pins", access_token, data=pin_data)

    return api_response(_format_pin(result))


@pinterest_bp.route("/pins/<pin_id>", methods=["GET"])
@require_pinterest_credentials
def get_pin(pin_id):
    """Get pin details."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    result = _pinterest_request("GET", f"/pins/{pin_id}", access_token)

    return api_response(_format_pin(result))


@pinterest_bp.route("/pins/<pin_id>", methods=["PATCH"])
@require_pinterest_credentials
def update_pin(pin_id):
    """Update a pin."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    update_data = {}
    if "title" in data:
        update_data["title"] = data["title"]
    if "description" in data:
        update_data["description"] = data["description"]
    if "link" in data:
        update_data["link"] = data["link"]
    if "alt_text" in data:
        update_data["alt_text"] = data["alt_text"]
    if "board_id" in data:
        update_data["board_id"] = data["board_id"]

    result = _pinterest_request("PATCH", f"/pins/{pin_id}", access_token, data=update_data)

    return api_response(_format_pin(result))


@pinterest_bp.route("/pins/<pin_id>", methods=["DELETE"])
@require_pinterest_credentials
def delete_pin(pin_id):
    """Delete a pin."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    _pinterest_request("DELETE", f"/pins/{pin_id}", access_token)

    return api_response({"deleted": True})


@pinterest_bp.route("/pins/<pin_id>/save", methods=["POST"])
@require_pinterest_credentials
def save_pin(pin_id):
    """Save a pin to a board."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    board_id = data.get("board_id")
    if not board_id:
        raise ApiError("INVALID_REQUEST", "Board ID required", 400)

    save_data = {"board_id": board_id}

    result = _pinterest_request("POST", f"/pins/{pin_id}/save", access_token, data=save_data)

    return api_response(_format_pin(result))


# ============================================================================
# Search Endpoints
# ============================================================================


@pinterest_bp.route("/search/pins", methods=["GET"])
@require_pinterest_credentials
def search_pins():
    """Search for pins."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    query = request.args.get("query")
    if not query:
        raise ApiError("INVALID_REQUEST", "Query required", 400)

    page_size = request.args.get("page_size", 25, type=int)
    bookmark = request.args.get("bookmark")

    params = {
        "query": query,
        "page_size": min(page_size, 100),
    }
    if bookmark:
        params["bookmark"] = bookmark

    result = _pinterest_request("GET", "/search/pins", access_token, params=params)

    pins = []
    for pin in result.get("items", []):
        pins.append(_format_pin(pin))

    return api_response(
        {
            "pins": pins,
            "bookmark": result.get("bookmark"),
        }
    )


# ============================================================================
# Analytics Endpoints
# ============================================================================


@pinterest_bp.route("/analytics/pins", methods=["GET"])
@require_pinterest_credentials
def get_pin_analytics():
    """Get pin analytics (business accounts only)."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    pin_ids = request.args.get("pin_ids")

    if not all([start_date, end_date, pin_ids]):
        raise ApiError("INVALID_REQUEST", "start_date, end_date, and pin_ids required", 400)

    params = {
        "start_date": start_date,
        "end_date": end_date,
        "pin_ids": pin_ids,
        "metric_types": "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK",
    }

    result = _pinterest_request("GET", "/pins/analytics", access_token, params=params)

    return api_response(result)


@pinterest_bp.route("/analytics/account", methods=["GET"])
@require_pinterest_credentials
def get_account_analytics():
    """Get account analytics (business accounts only)."""
    credentials = g.pinterest_credentials
    access_token = credentials["access_token"]

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if not all([start_date, end_date]):
        raise ApiError("INVALID_REQUEST", "start_date and end_date required", 400)

    params = {
        "start_date": start_date,
        "end_date": end_date,
        "metric_types": "IMPRESSION,ENGAGEMENT,PIN_CLICK,OUTBOUND_CLICK",
        "granularity": request.args.get("granularity", "DAY"),
    }

    result = _pinterest_request("GET", "/user_account/analytics", access_token, params=params)

    return api_response(result)
