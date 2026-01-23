"""
Instagram Graph API endpoints for read-only platform interactions.

Provides endpoints for:
- Profile retrieval
- Media feed
- Media insights (Business accounts)
- Stories

Note: Instagram Graph API requires Business/Creator account for full access.
Publishing is not supported without Content Publishing API approval.
"""

from flask import Blueprint, request
import requests
from typing import Optional

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_response, api_error
from app.core.logger import setup_logger

logger = setup_logger(__name__)

instagram_bp = Blueprint("instagram", __name__, url_prefix="/instagram")

# Instagram Graph API base URL
GRAPH_API_BASE = "https://graph.instagram.com"
GRAPH_API_VERSION = "v18.0"


def _get_instagram_credentials(user_id: int) -> tuple[str, str]:
    """
    Get Instagram access token and user ID for authenticated user.

    Args:
        user_id: The application user ID

    Returns:
        Tuple of (access_token, instagram_user_id)

    Raises:
        ValueError: If no credentials found or token missing
    """
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "instagram", "api")

    if not creds:
        raise ValueError("No Instagram credentials found")

    access_token = creds.get("access_token")
    instagram_user_id = creds.get("user_id")

    if not access_token:
        raise ValueError("Instagram access token not configured")

    return access_token, instagram_user_id


def _instagram_request(
    access_token: str,
    endpoint: str,
    params: Optional[dict] = None,
) -> dict:
    """
    Make authenticated request to Instagram Graph API.

    Args:
        access_token: Instagram access token
        endpoint: API endpoint path
        params: Optional query parameters

    Returns:
        JSON response from API
    """
    url = f"{GRAPH_API_BASE}/{GRAPH_API_VERSION}{endpoint}"

    request_params = params or {}
    request_params["access_token"] = access_token

    response = requests.get(url, params=request_params, timeout=30)
    response.raise_for_status()

    return response.json() if response.text else {}


def _format_profile(profile: dict) -> dict:
    """Format Instagram profile to API response."""
    return {
        "id": profile.get("id"),
        "username": profile.get("username"),
        "name": profile.get("name"),
        "biography": profile.get("biography"),
        "profile_picture_url": profile.get("profile_picture_url"),
        "website": profile.get("website"),
        "followers_count": profile.get("followers_count", 0),
        "follows_count": profile.get("follows_count", 0),
        "media_count": profile.get("media_count", 0),
        "account_type": profile.get("account_type", "PERSONAL"),
    }


def _format_media(media: dict) -> dict:
    """Format Instagram media to API response."""
    formatted = {
        "id": media.get("id"),
        "caption": media.get("caption"),
        "media_type": media.get("media_type"),
        "media_url": media.get("media_url"),
        "thumbnail_url": media.get("thumbnail_url"),
        "permalink": media.get("permalink"),
        "timestamp": media.get("timestamp"),
        "like_count": media.get("like_count"),
        "comments_count": media.get("comments_count"),
        "username": media.get("username"),
    }

    # Handle carousel albums with children
    if media.get("children") and media["children"].get("data"):
        formatted["children"] = [
            {
                "id": child.get("id"),
                "media_type": child.get("media_type"),
                "media_url": child.get("media_url"),
            }
            for child in media["children"]["data"]
        ]

    return formatted


def _format_insights(media_id: str, insights: dict) -> dict:
    """Format Instagram insights to API response."""
    result = {"media_id": media_id}

    for metric in insights.get("data", []):
        name = metric.get("name")
        values = metric.get("values", [])
        if values:
            result[name] = values[0].get("value", 0)

    return result


def _format_story(story: dict) -> dict:
    """Format Instagram story to API response."""
    return {
        "id": story.get("id"),
        "media_type": story.get("media_type"),
        "media_url": story.get("media_url"),
        "timestamp": story.get("timestamp"),
    }


@instagram_bp.route("/profile", methods=["GET"])
@require_auth
def get_own_profile():
    """
    Get the authenticated user's Instagram profile.

    Returns profile info including followers, following, media count.
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        fields = "id,username,name,biography,profile_picture_url,website,followers_count,follows_count,media_count,account_type"
        profile = _instagram_request(
            access_token,
            f"/{user_id}",
            {"fields": fields},
        )

        return api_response(_format_profile(profile))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching profile: {e}")
        error_msg = "Instagram API error"
        if e.response is not None and e.response.status_code == 404:
            error_msg = "Profile not found"
        return api_error(error_msg, status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram profile: {e}")
        return api_error("Failed to fetch profile", status=500)


@instagram_bp.route("/profile/<username>", methods=["GET"])
@require_auth
def get_profile_by_username(username: str):
    """
    Get Instagram profile by username.

    Note: Instagram Graph API doesn't support direct username lookup.
    This endpoint uses the Business Discovery API which requires
    the authenticated account to be a Business/Creator account.
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        # Use Business Discovery API to look up other users
        fields = f"business_discovery.username({username}){{id,username,name,biography,profile_picture_url,website,followers_count,follows_count,media_count}}"
        result = _instagram_request(
            access_token,
            f"/{user_id}",
            {"fields": fields},
        )

        if "business_discovery" not in result:
            return api_error("Profile not found or not accessible", status=404)

        return api_response(_format_profile(result["business_discovery"]))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching profile {username}: {e}")
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram profile {username}: {e}")
        return api_error("Failed to fetch profile", status=500)


@instagram_bp.route("/media", methods=["GET"])
@require_auth
def get_media():
    """
    Get the authenticated user's media feed.

    Query params:
        limit: Number of items to return (default 25, max 100)
        after: Pagination cursor
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        limit = min(int(request.args.get("limit", 25)), 100)
        after = request.args.get("after")

        fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url}"
        params = {"fields": fields, "limit": limit}
        if after:
            params["after"] = after

        result = _instagram_request(access_token, f"/{user_id}/media", params)

        media_list = [_format_media(m) for m in result.get("data", [])]

        response_data = {"data": media_list}
        if result.get("paging", {}).get("cursors", {}).get("after"):
            response_data["next_cursor"] = result["paging"]["cursors"]["after"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching media: {e}")
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram media: {e}")
        return api_error("Failed to fetch media", status=500)


@instagram_bp.route("/media/<media_id>", methods=["GET"])
@require_auth
def get_single_media(media_id: str):
    """Get a single media item by ID."""
    try:
        access_token, _ = _get_instagram_credentials(request.user_id)

        fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url}"
        result = _instagram_request(access_token, f"/{media_id}", {"fields": fields})

        return api_response(_format_media(result))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching media {media_id}: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Media not found", status=404)
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram media {media_id}: {e}")
        return api_error("Failed to fetch media", status=500)


@instagram_bp.route("/media/<media_id>/insights", methods=["GET"])
@require_auth
def get_media_insights(media_id: str):
    """
    Get insights for a media item.

    Note: Only available for Business/Creator accounts.
    Metrics vary by media type (image, video, carousel, reel).
    """
    try:
        access_token, _ = _get_instagram_credentials(request.user_id)

        # Different metrics for different media types
        # Default to image metrics, caller can specify via query param
        media_type = request.args.get("media_type", "IMAGE").upper()

        if media_type == "VIDEO" or media_type == "REELS":
            metric = "impressions,reach,video_views,saved"
        elif media_type == "CAROUSEL_ALBUM":
            metric = "impressions,reach,carousel_album_engagement,carousel_album_reach"
        else:
            metric = "impressions,reach,engagement,saved"

        result = _instagram_request(
            access_token,
            f"/{media_id}/insights",
            {"metric": metric},
        )

        return api_response(_format_insights(media_id, result))

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching insights for {media_id}: {e}")
        if e.response is not None:
            if e.response.status_code == 400:
                return api_error("Insights not available for this media or account type", status=400)
            if e.response.status_code == 404:
                return api_error("Media not found", status=404)
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram insights for {media_id}: {e}")
        return api_error("Failed to fetch insights", status=500)


@instagram_bp.route("/stories", methods=["GET"])
@require_auth
def get_stories():
    """
    Get the authenticated user's active stories.

    Note: Only returns stories that are still active (within 24 hours).
    Requires Business/Creator account.
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        fields = "id,media_type,media_url,timestamp"
        result = _instagram_request(access_token, f"/{user_id}/stories", {"fields": fields})

        stories = [_format_story(s) for s in result.get("data", [])]

        return api_response({"data": stories})

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching stories: {e}")
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram stories: {e}")
        return api_error("Failed to fetch stories", status=500)


@instagram_bp.route("/account/insights", methods=["GET"])
@require_auth
def get_account_insights():
    """
    Get account-level insights.

    Query params:
        period: Time period (day, week, days_28, lifetime)
        metric: Specific metrics to retrieve

    Note: Only available for Business/Creator accounts.
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        period = request.args.get("period", "day")
        metric = request.args.get(
            "metric",
            "impressions,reach,follower_count,profile_views",
        )

        result = _instagram_request(
            access_token,
            f"/{user_id}/insights",
            {"metric": metric, "period": period},
        )

        # Format insights data
        insights = {}
        for item in result.get("data", []):
            name = item.get("name")
            values = item.get("values", [])
            if values:
                insights[name] = values[0].get("value", 0)

        return api_response({"period": period, "insights": insights})

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching account insights: {e}")
        if e.response is not None and e.response.status_code == 400:
            return api_error("Account insights not available (requires Business account)", status=400)
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram account insights: {e}")
        return api_error("Failed to fetch account insights", status=500)


# ============================================================================
# Content Publishing API (requires Meta App Review approval)
# ============================================================================


def _instagram_post(
    access_token: str,
    endpoint: str,
    data: Optional[dict] = None,
) -> dict:
    """
    Make authenticated POST request to Instagram Graph API.

    Args:
        access_token: Instagram access token
        endpoint: API endpoint path
        data: POST body data

    Returns:
        JSON response from API
    """
    url = f"{GRAPH_API_BASE}/{GRAPH_API_VERSION}{endpoint}"

    request_data = data or {}
    request_data["access_token"] = access_token

    response = requests.post(url, data=request_data, timeout=60)
    response.raise_for_status()

    return response.json() if response.text else {}


@instagram_bp.route("/media/container", methods=["POST"])
@require_auth
def create_media_container():
    """
    Create a media container for publishing.

    This is step 1 of the Instagram Content Publishing flow.
    Requires Content Publishing API approval from Meta.

    Body:
        image_url: URL of the image to publish (must be publicly accessible)
        video_url: URL of the video to publish (for Reels)
        caption: Post caption (optional)
        media_type: IMAGE, VIDEO, CAROUSEL_ALBUM, or REELS
        children: List of container IDs for carousel (if media_type is CAROUSEL_ALBUM)
        location_id: Facebook Page location ID (optional)
        user_tags: List of user tags with coordinates (optional)

    Returns:
        Container ID for use in publishing step
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        body = request.get_json() or {}
        media_type = body.get("media_type", "IMAGE").upper()

        # Build container creation params
        params = {}

        if media_type == "IMAGE":
            if not body.get("image_url"):
                return api_error("image_url is required for IMAGE type", status=400)
            params["image_url"] = body["image_url"]

        elif media_type in ("VIDEO", "REELS"):
            if not body.get("video_url"):
                return api_error("video_url is required for VIDEO/REELS type", status=400)
            params["video_url"] = body["video_url"]
            params["media_type"] = "REELS" if media_type == "REELS" else "VIDEO"

        elif media_type == "CAROUSEL_ALBUM":
            if not body.get("children"):
                return api_error("children container IDs required for CAROUSEL_ALBUM", status=400)
            params["media_type"] = "CAROUSEL"
            params["children"] = ",".join(body["children"])

        else:
            return api_error(f"Unsupported media_type: {media_type}", status=400)

        # Optional params
        if body.get("caption"):
            params["caption"] = body["caption"]
        if body.get("location_id"):
            params["location_id"] = body["location_id"]
        if body.get("user_tags"):
            import json
            params["user_tags"] = json.dumps(body["user_tags"])

        result = _instagram_post(access_token, f"/{user_id}/media", params)

        return api_response({
            "container_id": result.get("id"),
            "status": "PENDING",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error creating media container: {e}")
        if e.response is not None:
            if e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", "Invalid request")
                    # Check for common publishing errors
                    if "not authorized" in error_msg.lower():
                        return api_error(
                            "Content Publishing not authorized. App requires Meta approval.",
                            status=403
                        )
                    return api_error(error_msg, status=400)
                except Exception:
                    pass
            if e.response.status_code == 403:
                return api_error(
                    "Content Publishing API not enabled. Requires Meta App Review approval.",
                    status=403
                )
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error creating Instagram media container: {e}")
        return api_error("Failed to create media container", status=500)


@instagram_bp.route("/media/container/<container_id>/status", methods=["GET"])
@require_auth
def get_container_status(container_id: str):
    """
    Check the status of a media container.

    For videos/reels, Instagram processes them asynchronously.
    Poll this endpoint until status is FINISHED before publishing.

    Returns:
        status: IN_PROGRESS, FINISHED, ERROR, or EXPIRED
        status_code: Detailed status code if available
    """
    try:
        access_token, _ = _get_instagram_credentials(request.user_id)

        result = _instagram_request(
            access_token,
            f"/{container_id}",
            {"fields": "status,status_code"},
        )

        return api_response({
            "container_id": container_id,
            "status": result.get("status", "UNKNOWN"),
            "status_code": result.get("status_code"),
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error checking container status: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Container not found or expired", status=404)
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error checking Instagram container status: {e}")
        return api_error("Failed to check container status", status=500)


@instagram_bp.route("/media/publish", methods=["POST"])
@require_auth
def publish_media():
    """
    Publish a media container to Instagram.

    This is step 2 of the Instagram Content Publishing flow.
    The container must be in FINISHED status before publishing.

    Body:
        container_id: The media container ID from create_media_container

    Returns:
        media_id: The published media ID
        permalink: URL to the published post
    """
    try:
        access_token, user_id = _get_instagram_credentials(request.user_id)

        body = request.get_json() or {}
        container_id = body.get("container_id")

        if not container_id:
            return api_error("container_id is required", status=400)

        # Publish the container
        result = _instagram_post(
            access_token,
            f"/{user_id}/media_publish",
            {"creation_id": container_id},
        )

        media_id = result.get("id")

        # Fetch the permalink for the published post
        permalink = None
        if media_id:
            try:
                media_info = _instagram_request(
                    access_token,
                    f"/{media_id}",
                    {"fields": "permalink"},
                )
                permalink = media_info.get("permalink")
            except Exception:
                pass  # Non-critical, proceed without permalink

        return api_response({
            "media_id": media_id,
            "permalink": permalink,
            "status": "PUBLISHED",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error publishing media: {e}")
        if e.response is not None:
            if e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get("error", {}).get("message", "Publish failed")
                    return api_error(error_msg, status=400)
                except Exception:
                    pass
            if e.response.status_code == 403:
                return api_error(
                    "Content Publishing API not authorized",
                    status=403
                )
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error publishing Instagram media: {e}")
        return api_error("Failed to publish media", status=500)


@instagram_bp.route("/media/<media_id>/comments", methods=["GET"])
@require_auth
def get_media_comments(media_id: str):
    """
    Get comments on a media item.

    Query params:
        limit: Number of comments to return (default 25)
        after: Pagination cursor
    """
    try:
        access_token, _ = _get_instagram_credentials(request.user_id)

        limit = min(int(request.args.get("limit", 25)), 100)
        after = request.args.get("after")

        params = {"fields": "id,text,timestamp,username,like_count", "limit": limit}
        if after:
            params["after"] = after

        result = _instagram_request(access_token, f"/{media_id}/comments", params)

        comments = [
            {
                "id": c.get("id"),
                "text": c.get("text"),
                "timestamp": c.get("timestamp"),
                "username": c.get("username"),
                "like_count": c.get("like_count", 0),
            }
            for c in result.get("data", [])
        ]

        response_data = {"data": comments}
        if result.get("paging", {}).get("cursors", {}).get("after"):
            response_data["next_cursor"] = result["paging"]["cursors"]["after"]

        return api_response(response_data)

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error fetching comments: {e}")
        if e.response is not None and e.response.status_code == 404:
            return api_error("Media not found", status=404)
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error fetching Instagram comments: {e}")
        return api_error("Failed to fetch comments", status=500)


@instagram_bp.route("/media/<media_id>/comments", methods=["POST"])
@require_auth
def reply_to_comment(media_id: str):
    """
    Reply to a comment or add a comment to a media item.

    Body:
        message: The comment text
        comment_id: (optional) The comment ID to reply to

    Note: Requires instagram_manage_comments permission.
    """
    try:
        access_token, _ = _get_instagram_credentials(request.user_id)

        body = request.get_json() or {}
        message = body.get("message")
        comment_id = body.get("comment_id")

        if not message:
            return api_error("message is required", status=400)

        # Reply to specific comment or add new comment to media
        if comment_id:
            endpoint = f"/{comment_id}/replies"
        else:
            endpoint = f"/{media_id}/comments"

        result = _instagram_post(access_token, endpoint, {"message": message})

        return api_response({
            "comment_id": result.get("id"),
            "status": "CREATED",
        })

    except ValueError as e:
        return api_error(str(e), status=400)
    except requests.HTTPError as e:
        logger.error(f"Instagram API error posting comment: {e}")
        if e.response is not None:
            if e.response.status_code == 403:
                return api_error(
                    "Comment permissions not granted. Requires instagram_manage_comments.",
                    status=403
                )
        return api_error("Instagram API error", status=502)
    except Exception as e:
        logger.error(f"Error posting Instagram comment: {e}")
        return api_error("Failed to post comment", status=500)
