"""
TikTok API Blueprint
OAuth 2.0 authenticated TikTok API for Developers
"""

import time
from functools import wraps

import requests
from flask import Blueprint, g, request

from app.auth.credential_manager import CredentialManager
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

tiktok_bp = Blueprint("tiktok", __name__, url_prefix="/tiktok")

TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"


def require_tiktok_credentials(f):
    """Decorator to require TikTok credentials."""

    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = g.user_id

        credentials = CredentialManager().get_credentials(user_id, "tiktok", "api")
        if not credentials:
            raise ApiError("TIKTOK_NOT_CONNECTED", "TikTok account not connected", 401)

        access_token = credentials.get("access_token")
        if not access_token:
            raise ApiError("TIKTOK_INVALID_CREDENTIALS", "Invalid TikTok credentials", 401)

        # Check if token needs refresh
        expires_at = credentials.get("expires_at", 0)
        if expires_at and time.time() > expires_at - 300:  # 5 min buffer
            credentials = _refresh_token(user_id, credentials)

        g.tiktok_credentials = credentials
        return f(*args, **kwargs)

    return decorated


def _refresh_token(user_id: str, credentials: dict) -> dict:
    """Refresh TikTok access token."""
    refresh_token = credentials.get("refresh_token")
    client_key = credentials.get("client_key")
    client_secret = credentials.get("client_secret")

    if not all([refresh_token, client_key, client_secret]):
        raise ApiError("TIKTOK_REFRESH_FAILED", "Missing credentials for token refresh", 401)

    response = requests.post(
        TIKTOK_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_key": client_key,
            "client_secret": client_secret,
        },
        timeout=30,
    )

    if not response.ok:
        raise ApiError("TIKTOK_REFRESH_FAILED", "Failed to refresh access token", 401)

    data = response.json()
    if "error" in data:
        raise ApiError("TIKTOK_REFRESH_FAILED", data.get("error_description", "Token refresh failed"), 401)

    credentials["access_token"] = data["access_token"]
    if "refresh_token" in data:
        credentials["refresh_token"] = data["refresh_token"]
    credentials["expires_at"] = time.time() + data.get("expires_in", 86400)

    CredentialManager().save_credentials(user_id, "tiktok", "api", credentials)
    return credentials


def _tiktok_request(
    method: str,
    endpoint: str,
    access_token: str,
    data: dict = None,
    params: dict = None,
    fields: list = None,
) -> dict:
    """Make authenticated request to TikTok API."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    url = f"{TIKTOK_API_BASE}{endpoint}"

    # TikTok uses 'fields' query parameter for specifying response fields
    if fields:
        if params is None:
            params = {}
        params["fields"] = ",".join(fields)

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
        error_msg = error_data.get("error", {}).get("message", f"TikTok API error: {response.status_code}")
        raise ApiError("TIKTOK_API_ERROR", error_msg, response.status_code)

    result = response.json()
    if "error" in result and result["error"].get("code") != "ok":
        raise ApiError("TIKTOK_API_ERROR", result["error"].get("message", "API error"), 400)

    return result.get("data", result)


# ============================================================================
# User Endpoints
# ============================================================================


@tiktok_bp.route("/me", methods=["GET"])
@require_tiktok_credentials
def get_me():
    """Get authenticated user profile."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    fields = [
        "open_id",
        "union_id",
        "avatar_url",
        "avatar_url_100",
        "avatar_large_url",
        "display_name",
        "bio_description",
        "profile_deep_link",
        "is_verified",
        "follower_count",
        "following_count",
        "likes_count",
        "video_count",
    ]

    result = _tiktok_request("GET", "/user/info/", access_token, fields=fields)

    user = result.get("user", {})
    return api_response(
        {
            "open_id": user.get("open_id"),
            "union_id": user.get("union_id"),
            "display_name": user.get("display_name"),
            "avatar_url": user.get("avatar_url") or user.get("avatar_url_100"),
            "avatar_large_url": user.get("avatar_large_url"),
            "bio": user.get("bio_description"),
            "profile_url": user.get("profile_deep_link"),
            "is_verified": user.get("is_verified"),
            "follower_count": user.get("follower_count"),
            "following_count": user.get("following_count"),
            "likes_count": user.get("likes_count"),
            "video_count": user.get("video_count"),
        }
    )


# ============================================================================
# Video Endpoints
# ============================================================================


def _format_video(video: dict) -> dict:
    """Format video data for response."""
    return {
        "id": video.get("id"),
        "title": video.get("title"),
        "description": video.get("video_description"),
        "duration": video.get("duration"),
        "cover_image_url": video.get("cover_image_url"),
        "embed_link": video.get("embed_link"),
        "share_url": video.get("share_url"),
        "width": video.get("width"),
        "height": video.get("height"),
        "create_time": video.get("create_time"),
        "view_count": video.get("view_count"),
        "like_count": video.get("like_count"),
        "comment_count": video.get("comment_count"),
        "share_count": video.get("share_count"),
    }


@tiktok_bp.route("/videos", methods=["GET"])
@require_tiktok_credentials
def get_my_videos():
    """Get authenticated user's videos."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    max_count = request.args.get("max_count", 20, type=int)
    cursor = request.args.get("cursor")

    fields = [
        "id",
        "title",
        "video_description",
        "duration",
        "cover_image_url",
        "embed_link",
        "share_url",
        "width",
        "height",
        "create_time",
        "view_count",
        "like_count",
        "comment_count",
        "share_count",
    ]

    data = {"max_count": min(max_count, 20)}
    if cursor:
        data["cursor"] = int(cursor)

    result = _tiktok_request("POST", "/video/list/", access_token, data=data, fields=fields)

    videos = [_format_video(v) for v in result.get("videos", [])]

    return api_response(
        {
            "videos": videos,
            "cursor": result.get("cursor"),
            "has_more": result.get("has_more", False),
        }
    )


@tiktok_bp.route("/video/<video_id>", methods=["GET"])
@require_tiktok_credentials
def get_video(video_id):
    """Get video details by ID."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    fields = [
        "id",
        "title",
        "video_description",
        "duration",
        "cover_image_url",
        "embed_link",
        "share_url",
        "width",
        "height",
        "create_time",
        "view_count",
        "like_count",
        "comment_count",
        "share_count",
    ]

    data = {"filters": {"video_ids": [video_id]}}

    result = _tiktok_request("POST", "/video/query/", access_token, data=data, fields=fields)

    videos = result.get("videos", [])
    if not videos:
        raise ApiError("TIKTOK_VIDEO_NOT_FOUND", "Video not found", 404)

    return api_response(_format_video(videos[0]))


# ============================================================================
# Video Publishing Endpoints
# ============================================================================


@tiktok_bp.route("/video/init", methods=["POST"])
@require_tiktok_credentials
def init_video_upload():
    """Initialize video upload (Direct Post)."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    post_info = {
        "title": data.get("title", ""),
        "privacy_level": data.get("privacy_level", "SELF_ONLY"),
        "disable_duet": data.get("disable_duet", False),
        "disable_comment": data.get("disable_comment", False),
        "disable_stitch": data.get("disable_stitch", False),
    }

    # Video must be provided via URL
    source_info = {}
    if data.get("video_url"):
        source_info["source"] = "PULL_FROM_URL"
        source_info["video_url"] = data["video_url"]
    else:
        # For file upload, use chunk upload
        source_info["source"] = "FILE_UPLOAD"
        video_size = data.get("video_size")
        chunk_size = data.get("chunk_size", 10000000)  # 10MB default
        total_chunk_count = data.get("total_chunk_count", 1)

        if not video_size:
            raise ApiError("INVALID_REQUEST", "video_size required for file upload", 400)

        source_info["video_size"] = video_size
        source_info["chunk_size"] = chunk_size
        source_info["total_chunk_count"] = total_chunk_count

    upload_data = {
        "post_info": post_info,
        "source_info": source_info,
    }

    result = _tiktok_request("POST", "/post/publish/video/init/", access_token, data=upload_data)

    return api_response(
        {
            "publish_id": result.get("publish_id"),
            "upload_url": result.get("upload_url"),
        }
    )


@tiktok_bp.route("/video/status", methods=["GET"])
@require_tiktok_credentials
def get_video_status():
    """Get video publish status."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    publish_id = request.args.get("publish_id")
    if not publish_id:
        raise ApiError("INVALID_REQUEST", "publish_id required", 400)

    data = {"publish_id": publish_id}

    result = _tiktok_request("POST", "/post/publish/status/fetch/", access_token, data=data)

    return api_response(
        {
            "status": result.get("status"),
            "fail_reason": result.get("fail_reason"),
            "published_video_id": result.get("publicaly_available_post_id", [None])[0],
        }
    )


# ============================================================================
# Creator Info Endpoints
# ============================================================================


@tiktok_bp.route("/creator/info", methods=["GET"])
@require_tiktok_credentials
def get_creator_info():
    """Get creator info for posting permissions."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    result = _tiktok_request("POST", "/post/publish/creator_info/query/", access_token)

    return api_response(
        {
            "creator_avatar_url": result.get("creator_avatar_url"),
            "creator_username": result.get("creator_username"),
            "creator_nickname": result.get("creator_nickname"),
            "privacy_level_options": result.get("privacy_level_options", []),
            "comment_disabled": result.get("comment_disabled"),
            "duet_disabled": result.get("duet_disabled"),
            "stitch_disabled": result.get("stitch_disabled"),
            "max_video_post_duration_sec": result.get("max_video_post_duration_sec"),
        }
    )


# ============================================================================
# Comments Endpoints
# ============================================================================


@tiktok_bp.route("/video/<video_id>/comments", methods=["GET"])
@require_tiktok_credentials
def get_video_comments(video_id):
    """Get comments for a video."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    max_count = request.args.get("max_count", 20, type=int)
    cursor = request.args.get("cursor")

    fields = ["id", "text", "create_time", "like_count", "reply_count", "parent_comment_id"]

    data = {
        "video_id": video_id,
        "max_count": min(max_count, 50),
    }
    if cursor:
        data["cursor"] = int(cursor)

    result = _tiktok_request("POST", "/comment/list/", access_token, data=data, fields=fields)

    comments = []
    for comment in result.get("comments", []):
        comments.append(
            {
                "id": comment.get("id"),
                "text": comment.get("text"),
                "create_time": comment.get("create_time"),
                "like_count": comment.get("like_count"),
                "reply_count": comment.get("reply_count"),
                "parent_comment_id": comment.get("parent_comment_id"),
            }
        )

    return api_response(
        {
            "comments": comments,
            "cursor": result.get("cursor"),
            "has_more": result.get("has_more", False),
        }
    )


@tiktok_bp.route("/video/<video_id>/comments", methods=["POST"])
@require_tiktok_credentials
def post_comment(video_id):
    """Post a comment on a video."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    req_data = request.get_json()
    if not req_data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    text = req_data.get("text")
    if not text:
        raise ApiError("INVALID_REQUEST", "Comment text required", 400)

    data = {
        "video_id": video_id,
        "text": text,
    }

    # For replies
    if req_data.get("parent_comment_id"):
        data["parent_comment_id"] = req_data["parent_comment_id"]

    result = _tiktok_request("POST", "/comment/reply/", access_token, data=data)

    return api_response(
        {
            "id": result.get("comment_id"),
            "text": text,
        }
    )


# ============================================================================
# Research/Insights Endpoints (requires research API access)
# ============================================================================


@tiktok_bp.route("/research/videos", methods=["POST"])
@require_tiktok_credentials
def query_videos():
    """Query videos for research (requires research API access)."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    # Build query
    query_data = {
        "query": data.get("query", {}),
        "max_count": min(data.get("max_count", 20), 100),
    }

    if data.get("cursor"):
        query_data["cursor"] = data["cursor"]

    if data.get("start_date"):
        query_data["start_date"] = data["start_date"]
    if data.get("end_date"):
        query_data["end_date"] = data["end_date"]

    fields = [
        "id",
        "video_description",
        "create_time",
        "region_code",
        "share_count",
        "view_count",
        "like_count",
        "comment_count",
        "music_id",
        "hashtag_names",
        "username",
        "effect_ids",
        "playlist_id",
        "voice_to_text",
    ]

    result = _tiktok_request("POST", "/research/video/query/", access_token, data=query_data, fields=fields)

    videos = []
    for video in result.get("videos", []):
        videos.append(
            {
                "id": video.get("id"),
                "description": video.get("video_description"),
                "create_time": video.get("create_time"),
                "region_code": video.get("region_code"),
                "username": video.get("username"),
                "view_count": video.get("view_count"),
                "like_count": video.get("like_count"),
                "comment_count": video.get("comment_count"),
                "share_count": video.get("share_count"),
                "hashtags": video.get("hashtag_names", []),
                "music_id": video.get("music_id"),
            }
        )

    return api_response(
        {
            "videos": videos,
            "cursor": result.get("cursor"),
            "has_more": result.get("has_more", False),
        }
    )


@tiktok_bp.route("/research/users", methods=["POST"])
@require_tiktok_credentials
def query_users():
    """Query user info for research (requires research API access)."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    usernames = data.get("usernames", [])
    if not usernames:
        raise ApiError("INVALID_REQUEST", "usernames required", 400)

    query_data = {"usernames": usernames[:100]}  # Max 100

    fields = [
        "display_name",
        "bio_description",
        "avatar_url",
        "is_verified",
        "follower_count",
        "following_count",
        "likes_count",
        "video_count",
    ]

    result = _tiktok_request("POST", "/research/user/info/", access_token, data=query_data, fields=fields)

    return api_response({"users": result.get("users", [])})


# ============================================================================
# Hashtag/Trending Endpoints
# ============================================================================


@tiktok_bp.route("/hashtag/search", methods=["GET"])
@require_tiktok_credentials
def search_hashtags():
    """Search for hashtags."""
    credentials = g.tiktok_credentials
    access_token = credentials["access_token"]

    keyword = request.args.get("keyword")
    if not keyword:
        raise ApiError("INVALID_REQUEST", "keyword required", 400)

    data = {"keyword": keyword}

    result = _tiktok_request("POST", "/research/hashtag/query/", access_token, data=data)

    hashtags = []
    for tag in result.get("hashtags", []):
        hashtags.append(
            {
                "id": tag.get("id"),
                "name": tag.get("name"),
                "video_count": tag.get("video_count"),
            }
        )

    return api_response({"hashtags": hashtags})


# ============================================================================
# Embed Endpoints
# ============================================================================


@tiktok_bp.route("/embed", methods=["GET"])
def get_embed():
    """Get embed HTML for a TikTok video (no auth required)."""
    url = request.args.get("url")
    if not url:
        raise ApiError("INVALID_REQUEST", "TikTok URL required", 400)

    # Use TikTok's oEmbed endpoint (public)
    oembed_url = "https://www.tiktok.com/oembed"
    params = {"url": url}

    response = requests.get(oembed_url, params=params, timeout=30)

    if not response.ok:
        raise ApiError("TIKTOK_EMBED_ERROR", "Failed to get embed", response.status_code)

    data = response.json()

    return api_response(
        {
            "title": data.get("title"),
            "author_name": data.get("author_name"),
            "author_url": data.get("author_url"),
            "thumbnail_url": data.get("thumbnail_url"),
            "thumbnail_width": data.get("thumbnail_width"),
            "thumbnail_height": data.get("thumbnail_height"),
            "html": data.get("html"),
        }
    )
