"""
Threads API endpoints (Meta's text-based platform).

Threads uses the same Meta Graph API infrastructure as Instagram.
Requires a Threads-enabled Instagram Business/Creator account.

Provides endpoints for:
- Profile retrieval
- Thread posts (read and publish)
- Replies and conversations
- Insights (Business accounts)
"""

from flask import Blueprint, request
import requests
from typing import Optional

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_response, api_error
from app.core.logger import setup_logger

logger = setup_logger(__name__)

threads_bp = Blueprint("threads", __name__, url_prefix="/threads")

# Threads Graph API base URL
GRAPH_API_BASE = "https://graph.threads.net"
GRAPH_API_VERSION = "v1.0"


def _get_threads_credentials(user_id: int) -> tuple[str, str]:
    """
    Get Threads access token and user ID for authenticated user.

    Args:
        user_id: The application user ID

    Returns:
        Tuple of (access_token, threads_user_id)

    Raises:
        ValueError: If no credentials found or token missing
    """
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "threads", "api")

    if not creds:
        raise ValueError("No Threads credentials found")

    access_token = creds.get("access_token")
    threads_user_id = creds.get("user_id")

    if not access_token:
        raise ValueError("Threads access token not configured")

    return access_token, threads_user_id


def _threads_request(
    access_token: str,
    endpoint: str,
    params: Optional[dict] = None,
) -> dict:
    """Make authenticated GET request to Threads Graph API."""
    url = f"{GRAPH_API_BASE}/{GRAPH_API_VERSION}{endpoint}"

    request_params = params or {}
    request_params["access_token"] = access_token

    response = requests.get(url, params=request_params, timeout=30)
    response.raise_for_status()

    return response.json() if response.text else {}


def _threads_post(
    access_token: str,
    endpoint: str,
    data: Optional[dict] = None,
) -> dict:
    """Make authenticated POST request to Threads Graph API."""
    url = f"{GRAPH_API_BASE}/{GRAPH_API_VERSION}{endpoint}"

    request_data = data or {}
    request_data["access_token"] = access_token

    response = requests.post(url, data=request_data, timeout=60)
    response.raise_for_status()

    return response.json() if response.text else {}


def _format_profile(profile: dict) -> dict:
    """Format Threads profile to API response."""
    return {
        "id": profile.get("id"),
        "username": profile.get("username"),
        "name": profile.get("name"),
        "threads_profile_picture_url": profile.get("threads_profile_picture_url"),
        "threads_biography": profile.get("threads_biography"),
        "is_eligible_for_geo_gating": profile.get("is_eligible_for_geo_gating", False),
    }


def _format_thread(thread: dict) -> dict:
    """Format Threads post to API response."""
    return {
        "id": thread.get("id"),
        "media_product_type": thread.get("media_product_type"),
        "media_type": thread.get("media_type"),
        "media_url": thread.get("media_url"),
        "permalink": thread.get("permalink"),
        "owner": thread.get("owner"),
        "username": thread.get("username"),
        "text": thread.get("text"),
        "timestamp": thread.get("timestamp"),
        "shortcode": thread.get("shortcode"),
        "is_quote_post": thread.get("is_quote_post", False),
        "children": thread.get("children"),
    }


def _format_insights(thread_id: str, insights: dict) -> dict:
    """Format Threads insights to API response."""
    result = {"thread_id": thread_id}

    for metric in insights.get("data", []):
        name = metric.get("name")
        values = metric.get("values", [])
        if values:
            result[name] = values[0].get("value", 0)

    return result


@threads_bp.route("/profile", methods=["GET"])
@require_auth
def get_own_profile():
    """
    Get the authenticated user's Threads profile.

    Returns profile info including username, bio, profile picture.
    """
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        fields = "id,username,name,threads_profile_picture_url,threads_biography"
        profile = _threads_request(
            access_token,
            f"/{user_id}",
            {"fields": fields},
        )

        return api_response(_format_profile(profile))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching profile: {e}")
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Threads profile: {e}")
        return api_error("Failed to fetch profile", status=500)


@threads_bp.route("/threads", methods=["GET"])
@require_auth
def get_threads():
    """
    Get the authenticated user's threads.

    Query params:
        limit: Number of items to return (default 25, max 100)
        since: Unix timestamp to filter posts after
        until: Unix timestamp to filter posts before
    """
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        limit = min(int(request.args.get("limit", 25)), 100)
        since = request.args.get("since")
        until = request.args.get("until")

        fields = "id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,is_quote_post"
        params = {"fields": fields, "limit": limit}

        if since:
            params["since"] = since
        if until:
            params["until"] = until

        result = _threads_request(access_token, f"/{user_id}/threads", params)

        threads_list = [_format_thread(t) for t in result.get("data", [])]

        response_data = {"data": threads_list}
        if result.get("paging", {}).get("cursors", {}).get("after"):
            response_data["next_cursor"] = result["paging"]["cursors"]["after"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching threads: {e}")
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching threads: {e}")
        return api_error("Failed to fetch threads", status=500)


@threads_bp.route("/thread/<thread_id>", methods=["GET"])
@require_auth
def get_single_thread(thread_id: str):
    """Get a single thread by ID."""
    try:
        access_token, _ = _get_threads_credentials(request.user_id)

        fields = "id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp,shortcode,is_quote_post,children"
        result = _threads_request(access_token, f"/{thread_id}", {"fields": fields})

        return api_response(_format_thread(result))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching thread {thread_id}: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Thread not found", status=404)
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching thread {thread_id}: {e}")
        return api_error("Failed to fetch thread", status=500)


@threads_bp.route("/thread/<thread_id>/replies", methods=["GET"])
@require_auth
def get_thread_replies(thread_id: str):
    """
    Get replies to a thread.

    Query params:
        limit: Number of replies (default 25, max 100)
        reverse: If true, return oldest first
    """
    try:
        access_token, _ = _get_threads_credentials(request.user_id)

        limit = min(int(request.args.get("limit", 25)), 100)
        reverse = request.args.get("reverse", "").lower() == "true"

        fields = "id,media_product_type,media_type,text,timestamp,username,permalink"
        params = {"fields": fields, "limit": limit}
        if reverse:
            params["reverse"] = "true"

        result = _threads_request(access_token, f"/{thread_id}/replies", params)

        replies = [_format_thread(r) for r in result.get("data", [])]

        response_data = {"data": replies}
        if result.get("paging", {}).get("cursors", {}).get("after"):
            response_data["next_cursor"] = result["paging"]["cursors"]["after"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching replies for {thread_id}: {e}")
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching thread replies: {e}")
        return api_error("Failed to fetch replies", status=500)


@threads_bp.route("/thread/<thread_id>/conversation", methods=["GET"])
@require_auth
def get_thread_conversation(thread_id: str):
    """
    Get the full conversation for a thread (all replies in tree).

    Query params:
        limit: Number of items (default 25, max 100)
    """
    try:
        access_token, _ = _get_threads_credentials(request.user_id)

        limit = min(int(request.args.get("limit", 25)), 100)

        fields = "id,media_product_type,media_type,text,timestamp,username,permalink"
        params = {"fields": fields, "limit": limit}

        result = _threads_request(access_token, f"/{thread_id}/conversation", params)

        conversation = [_format_thread(t) for t in result.get("data", [])]

        return api_response({"data": conversation})

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching conversation for {thread_id}: {e}")
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching thread conversation: {e}")
        return api_error("Failed to fetch conversation", status=500)


@threads_bp.route("/thread/<thread_id>/insights", methods=["GET"])
@require_auth
def get_thread_insights(thread_id: str):
    """
    Get insights for a thread.

    Available metrics: views, likes, replies, reposts, quotes
    """
    try:
        access_token, _ = _get_threads_credentials(request.user_id)

        metric = "views,likes,replies,reposts,quotes"
        result = _threads_request(
            access_token,
            f"/{thread_id}/insights",
            {"metric": metric},
        )

        return api_response(_format_insights(thread_id, result))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching insights for {thread_id}: {e}")
        if e.response is not None and e.response.status_code == 400:
            return api_error("Insights not available for this thread", status=400)
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching thread insights: {e}")
        return api_error("Failed to fetch insights", status=500)


@threads_bp.route("/account/insights", methods=["GET"])
@require_auth
def get_account_insights():
    """
    Get account-level insights.

    Query params:
        since: Unix timestamp for start date (required)
        until: Unix timestamp for end date (required)
        metric: Specific metrics (default: views,likes,replies,reposts,quotes,followers_count)

    Note: Requires Business/Creator account.
    """
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        since = request.args.get("since")
        until = request.args.get("until")

        if not since or not until:
            return api_error("since and until timestamps are required", status=400)

        metric = request.args.get(
            "metric",
            "views,likes,replies,reposts,quotes,followers_count",
        )

        result = _threads_request(
            access_token,
            f"/{user_id}/threads_insights",
            {"metric": metric, "since": since, "until": until},
        )

        # Format insights data
        insights = {}
        for item in result.get("data", []):
            name = item.get("name")
            total = item.get("total_value", {}).get("value")
            if total is not None:
                insights[name] = total
            elif item.get("values"):
                # Time series data
                insights[name] = item["values"]

        return api_response({
            "since": since,
            "until": until,
            "insights": insights,
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error fetching account insights: {e}")
        if e.response is not None and e.response.status_code == 400:
            return api_error("Account insights not available", status=400)
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Threads account insights: {e}")
        return api_error("Failed to fetch account insights", status=500)


# ============================================================================
# Publishing API
# ============================================================================


@threads_bp.route("/thread/container", methods=["POST"])
@require_auth
def create_thread_container():
    """
    Create a thread container for publishing.

    Step 1 of publishing flow.

    Body:
        media_type: TEXT, IMAGE, VIDEO, or CAROUSEL
        text: The thread text content (required for TEXT, optional for others)
        image_url: URL of image (for IMAGE type)
        video_url: URL of video (for VIDEO type)
        children: List of container IDs (for CAROUSEL type)
        reply_to_id: Thread ID to reply to (optional)
        quote_post_id: Thread ID to quote (optional)

    Returns:
        container_id: ID to use in publish step
    """
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        body = request.get_json() or {}
        media_type = body.get("media_type", "TEXT").upper()

        params = {"media_type": media_type}

        if media_type == "TEXT":
            if not body.get("text"):
                return api_error("text is required for TEXT type", status=400)
            params["text"] = body["text"]

        elif media_type == "IMAGE":
            if not body.get("image_url"):
                return api_error("image_url is required for IMAGE type", status=400)
            params["image_url"] = body["image_url"]
            if body.get("text"):
                params["text"] = body["text"]

        elif media_type == "VIDEO":
            if not body.get("video_url"):
                return api_error("video_url is required for VIDEO type", status=400)
            params["video_url"] = body["video_url"]
            if body.get("text"):
                params["text"] = body["text"]

        elif media_type == "CAROUSEL":
            if not body.get("children"):
                return api_error("children container IDs required for CAROUSEL", status=400)
            params["children"] = ",".join(body["children"])
            if body.get("text"):
                params["text"] = body["text"]

        else:
            return api_error(f"Unsupported media_type: {media_type}", status=400)

        # Optional: reply or quote
        if body.get("reply_to_id"):
            params["reply_to_id"] = body["reply_to_id"]
        if body.get("quote_post_id"):
            params["quote_post_id"] = body["quote_post_id"]

        result = _threads_post(access_token, f"/{user_id}/threads", params)

        return api_response({
            "container_id": result.get("id"),
            "status": "PENDING",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error creating container: {e}")
        if e.response is not None:
            if e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", "Invalid request")
                    return api_error(error_msg, status=400)
                except Exception:  # nosec B110 - intentionally ignore JSON parse errors
                    pass
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error creating Threads container: {e}")
        return api_error("Failed to create container", status=500)


@threads_bp.route("/thread/container/<container_id>/status", methods=["GET"])
@require_auth
def get_container_status(container_id: str):
    """
    Check the status of a thread container.

    For media posts, Threads processes them asynchronously.
    Poll this endpoint until status is FINISHED.

    Returns:
        status: IN_PROGRESS, FINISHED, ERROR, or EXPIRED
        error_message: If status is ERROR
    """
    try:
        access_token, _ = _get_threads_credentials(request.user_id)

        result = _threads_request(
            access_token,
            f"/{container_id}",
            {"fields": "status,error_message"},
        )

        return api_response({
            "container_id": container_id,
            "status": result.get("status", "UNKNOWN"),
            "error_message": result.get("error_message"),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error checking container status: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Container not found or expired", status=404)
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error checking Threads container status: {e}")
        return api_error("Failed to check container status", status=500)


@threads_bp.route("/thread/publish", methods=["POST"])
@require_auth
def publish_thread():
    """
    Publish a thread container.

    Step 2 of publishing flow.
    Container must be in FINISHED status.

    Body:
        container_id: The container ID from create_thread_container

    Returns:
        thread_id: The published thread ID
        permalink: URL to the published thread
    """
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        body = request.get_json() or {}
        container_id = body.get("container_id")

        if not container_id:
            return api_error("container_id is required", status=400)

        result = _threads_post(
            access_token,
            f"/{user_id}/threads_publish",
            {"creation_id": container_id},
        )

        thread_id = result.get("id")

        # Fetch permalink
        permalink = None
        if thread_id:
            try:
                thread_info = _threads_request(
                    access_token,
                    f"/{thread_id}",
                    {"fields": "permalink"},
                )
                permalink = thread_info.get("permalink")
            except Exception:  # nosec B110 - permalink is optional, continue without it
                pass

        return api_response({
            "thread_id": thread_id,
            "permalink": permalink,
            "status": "PUBLISHED",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Threads API error publishing: {e}")
        if e.response is not None:
            if e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", "Publish failed")
                    return api_error(error_msg, status=400)
                except Exception:  # nosec B110 - intentionally ignore JSON parse errors
                    pass
        return api_error("Threads API error", status=502)
    except Exception as e:
        logger.error(f"Error publishing thread: {e}")
        return api_error("Failed to publish thread", status=500)


@threads_bp.route("/reply_control", methods=["GET"])
@require_auth
def get_reply_control():
    """Get the user's default reply control setting."""
    try:
        access_token, user_id = _get_threads_credentials(request.user_id)

        result = _threads_request(
            access_token,
            f"/{user_id}",
            {"fields": "threads_default_reply_config"},
        )

        return api_response({
            "default_reply_config": result.get("threads_default_reply_config", "everyone"),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except Exception as e:
        logger.error(f"Error fetching reply control: {e}")
        return api_error("Failed to fetch reply control", status=500)
