"""
YouTube API Blueprint
OAuth 2.0 authenticated YouTube Data API v3
"""

import time
from functools import wraps

import requests
from flask import Blueprint, g, request

from app.auth.credential_manager import CredentialManager
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

youtube_bp = Blueprint("youtube", __name__, url_prefix="/youtube")

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"  # nosec B105


def require_youtube_credentials(f):
    """Decorator to require YouTube credentials."""

    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = g.user_id

        credentials = CredentialManager().get_credentials(user_id, "youtube", "api")
        if not credentials:
            raise ApiError("YOUTUBE_NOT_CONNECTED", "YouTube account not connected", 401)

        access_token = credentials.get("access_token")
        if not access_token:
            raise ApiError("YOUTUBE_INVALID_CREDENTIALS", "Invalid YouTube credentials", 401)

        # Check if token needs refresh
        expires_at = credentials.get("expires_at", 0)
        if expires_at and time.time() > expires_at - 300:  # 5 min buffer
            credentials = _refresh_token(user_id, credentials)

        g.youtube_credentials = credentials
        return f(*args, **kwargs)

    return decorated


def _refresh_token(user_id: str, credentials: dict) -> dict:
    """Refresh YouTube/Google access token."""
    refresh_token = credentials.get("refresh_token")
    client_id = credentials.get("client_id")
    client_secret = credentials.get("client_secret")

    if not all([refresh_token, client_id, client_secret]):
        raise ApiError("YOUTUBE_REFRESH_FAILED", "Missing credentials for token refresh", 401)

    response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
    )

    if not response.ok:
        raise ApiError("YOUTUBE_REFRESH_FAILED", "Failed to refresh access token", 401)

    data = response.json()
    credentials["access_token"] = data["access_token"]
    credentials["expires_at"] = time.time() + data.get("expires_in", 3600)

    CredentialManager().save_credentials(user_id, "youtube", "api", credentials)
    return credentials


def _youtube_request(
    method: str,
    endpoint: str,
    access_token: str,
    data: dict = None,
    params: dict = None,
) -> dict:
    """Make authenticated request to YouTube API."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    url = f"{YOUTUBE_API_BASE}{endpoint}"

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
        error_info = error_data.get("error", {})
        error_msg = error_info.get("message", f"YouTube API error: {response.status_code}")
        raise ApiError("YOUTUBE_API_ERROR", error_msg, response.status_code)

    if response.status_code == 204:
        return {}

    return response.json()


# ============================================================================
# Channel Endpoints
# ============================================================================


@youtube_bp.route("/me", methods=["GET"])
@require_youtube_credentials
def get_me():
    """Get authenticated user's channel."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {
        "part": "snippet,contentDetails,statistics",
        "mine": "true",
    }

    result = _youtube_request("GET", "/channels", access_token, params=params)

    items = result.get("items", [])
    if not items:
        raise ApiError("YOUTUBE_NO_CHANNEL", "No channel found for this account", 404)

    channel = items[0]
    snippet = channel.get("snippet", {})
    statistics = channel.get("statistics", {})
    content_details = channel.get("contentDetails", {})

    return api_response(
        {
            "id": channel.get("id"),
            "title": snippet.get("title"),
            "description": snippet.get("description"),
            "custom_url": snippet.get("customUrl"),
            "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "subscriber_count": int(statistics.get("subscriberCount", 0)),
            "video_count": int(statistics.get("videoCount", 0)),
            "view_count": int(statistics.get("viewCount", 0)),
            "uploads_playlist": content_details.get("relatedPlaylists", {}).get("uploads"),
        }
    )


@youtube_bp.route("/channel/<channel_id>", methods=["GET"])
@require_youtube_credentials
def get_channel(channel_id):
    """Get channel details by ID."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {
        "part": "snippet,contentDetails,statistics",
        "id": channel_id,
    }

    result = _youtube_request("GET", "/channels", access_token, params=params)

    items = result.get("items", [])
    if not items:
        raise ApiError("YOUTUBE_CHANNEL_NOT_FOUND", "Channel not found", 404)

    channel = items[0]
    snippet = channel.get("snippet", {})
    statistics = channel.get("statistics", {})

    return api_response(
        {
            "id": channel.get("id"),
            "title": snippet.get("title"),
            "description": snippet.get("description"),
            "custom_url": snippet.get("customUrl"),
            "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url"),
            "subscriber_count": int(statistics.get("subscriberCount", 0)),
            "video_count": int(statistics.get("videoCount", 0)),
            "view_count": int(statistics.get("viewCount", 0)),
        }
    )


# ============================================================================
# Video Endpoints
# ============================================================================


def _format_video(video: dict) -> dict:
    """Format video data for response."""
    snippet = video.get("snippet", {})
    statistics = video.get("statistics", {})
    content_details = video.get("contentDetails", {})
    status = video.get("status", {})

    return {
        "id": video.get("id") if isinstance(video.get("id"), str) else video.get("id", {}).get("videoId"),
        "title": snippet.get("title"),
        "description": snippet.get("description"),
        "channel_id": snippet.get("channelId"),
        "channel_title": snippet.get("channelTitle"),
        "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
        "published_at": snippet.get("publishedAt"),
        "tags": snippet.get("tags", []),
        "category_id": snippet.get("categoryId"),
        "duration": content_details.get("duration"),
        "definition": content_details.get("definition"),
        "view_count": int(statistics.get("viewCount", 0)) if statistics else None,
        "like_count": int(statistics.get("likeCount", 0)) if statistics else None,
        "comment_count": int(statistics.get("commentCount", 0)) if statistics else None,
        "privacy_status": status.get("privacyStatus"),
        "upload_status": status.get("uploadStatus"),
    }


@youtube_bp.route("/videos", methods=["GET"])
@require_youtube_credentials
def get_my_videos():
    """Get authenticated user's videos."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    # First get uploads playlist
    channel_params = {
        "part": "contentDetails",
        "mine": "true",
    }
    channel_result = _youtube_request("GET", "/channels", access_token, params=channel_params)

    items = channel_result.get("items", [])
    if not items:
        raise ApiError("YOUTUBE_NO_CHANNEL", "No channel found", 404)

    uploads_playlist = items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
    if not uploads_playlist:
        return api_response({"videos": [], "next_page_token": None})  # nosec B105

    # Get videos from uploads playlist
    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")

    playlist_params = {
        "part": "snippet,contentDetails",
        "playlistId": uploads_playlist,
        "maxResults": min(max_results, 50),
    }
    if page_token:
        playlist_params["pageToken"] = page_token

    playlist_result = _youtube_request("GET", "/playlistItems", access_token, params=playlist_params)

    # Get detailed video info
    video_ids = [item.get("contentDetails", {}).get("videoId") for item in playlist_result.get("items", [])]
    video_ids = [vid for vid in video_ids if vid]

    if video_ids:
        video_params = {
            "part": "snippet,statistics,contentDetails,status",
            "id": ",".join(video_ids),
        }
        video_result = _youtube_request("GET", "/videos", access_token, params=video_params)
        videos = [_format_video(v) for v in video_result.get("items", [])]
    else:
        videos = []

    return api_response(
        {
            "videos": videos,
            "next_page_token": playlist_result.get("nextPageToken"),
        }
    )


@youtube_bp.route("/video/<video_id>", methods=["GET"])
@require_youtube_credentials
def get_video(video_id):
    """Get video details."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {
        "part": "snippet,statistics,contentDetails,status",
        "id": video_id,
    }

    result = _youtube_request("GET", "/videos", access_token, params=params)

    items = result.get("items", [])
    if not items:
        raise ApiError("YOUTUBE_VIDEO_NOT_FOUND", "Video not found", 404)

    return api_response(_format_video(items[0]))


@youtube_bp.route("/video/<video_id>", methods=["PUT"])
@require_youtube_credentials
def update_video(video_id):
    """Update video metadata."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    # First get current video data
    get_params = {
        "part": "snippet,status",
        "id": video_id,
    }
    current = _youtube_request("GET", "/videos", access_token, params=get_params)

    items = current.get("items", [])
    if not items:
        raise ApiError("YOUTUBE_VIDEO_NOT_FOUND", "Video not found", 404)

    current_video = items[0]
    snippet = current_video.get("snippet", {})

    # Build update payload
    update_data = {
        "id": video_id,
        "snippet": {
            "title": data.get("title", snippet.get("title")),
            "description": data.get("description", snippet.get("description")),
            "categoryId": data.get("category_id", snippet.get("categoryId")),
            "tags": data.get("tags", snippet.get("tags", [])),
        },
    }

    params = {"part": "snippet"}

    if "privacy_status" in data:
        update_data["status"] = {"privacyStatus": data["privacy_status"]}
        params["part"] += ",status"

    result = _youtube_request("PUT", "/videos", access_token, data=update_data, params=params)

    return api_response(_format_video(result))


@youtube_bp.route("/video/<video_id>", methods=["DELETE"])
@require_youtube_credentials
def delete_video(video_id):
    """Delete a video."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {"id": video_id}
    _youtube_request("DELETE", "/videos", access_token, params=params)

    return api_response({"deleted": True})


# ============================================================================
# Playlist Endpoints
# ============================================================================


def _format_playlist(playlist: dict) -> dict:
    """Format playlist data for response."""
    snippet = playlist.get("snippet", {})
    content_details = playlist.get("contentDetails", {})
    status = playlist.get("status", {})

    return {
        "id": playlist.get("id"),
        "title": snippet.get("title"),
        "description": snippet.get("description"),
        "channel_id": snippet.get("channelId"),
        "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
        "published_at": snippet.get("publishedAt"),
        "item_count": content_details.get("itemCount", 0),
        "privacy_status": status.get("privacyStatus"),
    }


@youtube_bp.route("/playlists", methods=["GET"])
@require_youtube_credentials
def get_playlists():
    """Get authenticated user's playlists."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")

    params = {
        "part": "snippet,contentDetails,status",
        "mine": "true",
        "maxResults": min(max_results, 50),
    }
    if page_token:
        params["pageToken"] = page_token

    result = _youtube_request("GET", "/playlists", access_token, params=params)

    playlists = [_format_playlist(p) for p in result.get("items", [])]

    return api_response(
        {
            "playlists": playlists,
            "next_page_token": result.get("nextPageToken"),
        }
    )


@youtube_bp.route("/playlists", methods=["POST"])
@require_youtube_credentials
def create_playlist():
    """Create a new playlist."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    title = data.get("title")
    if not title:
        raise ApiError("INVALID_REQUEST", "Playlist title required", 400)

    playlist_data = {
        "snippet": {
            "title": title,
            "description": data.get("description", ""),
        },
        "status": {
            "privacyStatus": data.get("privacy_status", "private"),
        },
    }

    params = {"part": "snippet,status"}
    result = _youtube_request("POST", "/playlists", access_token, data=playlist_data, params=params)

    return api_response(_format_playlist(result))


@youtube_bp.route("/playlist/<playlist_id>", methods=["DELETE"])
@require_youtube_credentials
def delete_playlist(playlist_id):
    """Delete a playlist."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {"id": playlist_id}
    _youtube_request("DELETE", "/playlists", access_token, params=params)

    return api_response({"deleted": True})


@youtube_bp.route("/playlist/<playlist_id>/items", methods=["GET"])
@require_youtube_credentials
def get_playlist_items(playlist_id):
    """Get videos in a playlist."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")

    params = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "maxResults": min(max_results, 50),
    }
    if page_token:
        params["pageToken"] = page_token

    result = _youtube_request("GET", "/playlistItems", access_token, params=params)

    items = []
    for item in result.get("items", []):
        snippet = item.get("snippet", {})
        items.append(
            {
                "id": item.get("id"),
                "video_id": item.get("contentDetails", {}).get("videoId"),
                "title": snippet.get("title"),
                "description": snippet.get("description"),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                "position": snippet.get("position"),
                "channel_title": snippet.get("channelTitle"),
            }
        )

    return api_response(
        {
            "items": items,
            "next_page_token": result.get("nextPageToken"),
        }
    )


@youtube_bp.route("/playlist/<playlist_id>/items", methods=["POST"])
@require_youtube_credentials
def add_to_playlist(playlist_id):
    """Add a video to a playlist."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    video_id = data.get("video_id")
    if not video_id:
        raise ApiError("INVALID_REQUEST", "Video ID required", 400)

    item_data = {
        "snippet": {
            "playlistId": playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": video_id,
            },
        }
    }

    if "position" in data:
        item_data["snippet"]["position"] = data["position"]

    params = {"part": "snippet"}
    result = _youtube_request("POST", "/playlistItems", access_token, data=item_data, params=params)

    return api_response(
        {
            "id": result.get("id"),
            "video_id": video_id,
            "playlist_id": playlist_id,
        }
    )


@youtube_bp.route("/playlist/<playlist_id>/items/<item_id>", methods=["DELETE"])
@require_youtube_credentials
def remove_from_playlist(playlist_id, item_id):
    """Remove a video from a playlist."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {"id": item_id}
    _youtube_request("DELETE", "/playlistItems", access_token, params=params)

    return api_response({"deleted": True})


# ============================================================================
# Comment Endpoints
# ============================================================================


@youtube_bp.route("/video/<video_id>/comments", methods=["GET"])
@require_youtube_credentials
def get_video_comments(video_id):
    """Get comments for a video."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")
    order = request.args.get("order", "relevance")

    params = {
        "part": "snippet",
        "videoId": video_id,
        "maxResults": min(max_results, 100),
        "order": order,
    }
    if page_token:
        params["pageToken"] = page_token

    result = _youtube_request("GET", "/commentThreads", access_token, params=params)

    comments = []
    for thread in result.get("items", []):
        top_comment = thread.get("snippet", {}).get("topLevelComment", {})
        snippet = top_comment.get("snippet", {})
        comments.append(
            {
                "id": top_comment.get("id"),
                "thread_id": thread.get("id"),
                "text": snippet.get("textDisplay"),
                "author": snippet.get("authorDisplayName"),
                "author_channel_id": snippet.get("authorChannelId", {}).get("value"),
                "author_profile_image": snippet.get("authorProfileImageUrl"),
                "like_count": snippet.get("likeCount", 0),
                "published_at": snippet.get("publishedAt"),
                "reply_count": thread.get("snippet", {}).get("totalReplyCount", 0),
            }
        )

    return api_response(
        {
            "comments": comments,
            "next_page_token": result.get("nextPageToken"),
        }
    )


@youtube_bp.route("/video/<video_id>/comments", methods=["POST"])
@require_youtube_credentials
def post_comment(video_id):
    """Post a comment on a video."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    text = data.get("text")
    if not text:
        raise ApiError("INVALID_REQUEST", "Comment text required", 400)

    comment_data = {
        "snippet": {
            "videoId": video_id,
            "topLevelComment": {
                "snippet": {
                    "textOriginal": text,
                }
            },
        }
    }

    params = {"part": "snippet"}
    result = _youtube_request("POST", "/commentThreads", access_token, data=comment_data, params=params)

    top_comment = result.get("snippet", {}).get("topLevelComment", {})
    snippet = top_comment.get("snippet", {})

    return api_response(
        {
            "id": top_comment.get("id"),
            "thread_id": result.get("id"),
            "text": snippet.get("textDisplay"),
        }
    )


# ============================================================================
# Search Endpoints
# ============================================================================


@youtube_bp.route("/search", methods=["GET"])
@require_youtube_credentials
def search():
    """Search YouTube."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    query = request.args.get("q")
    if not query:
        raise ApiError("INVALID_REQUEST", "Query required", 400)

    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")
    search_type = request.args.get("type", "video")
    order = request.args.get("order", "relevance")

    params = {
        "part": "snippet",
        "q": query,
        "type": search_type,
        "maxResults": min(max_results, 50),
        "order": order,
    }
    if page_token:
        params["pageToken"] = page_token

    channel_id = request.args.get("channel_id")
    if channel_id:
        params["channelId"] = channel_id

    result = _youtube_request("GET", "/search", access_token, params=params)

    items = []
    for item in result.get("items", []):
        snippet = item.get("snippet", {})
        item_id = item.get("id", {})
        items.append(
            {
                "kind": item_id.get("kind"),
                "video_id": item_id.get("videoId"),
                "channel_id": item_id.get("channelId"),
                "playlist_id": item_id.get("playlistId"),
                "title": snippet.get("title"),
                "description": snippet.get("description"),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                "channel_title": snippet.get("channelTitle"),
                "published_at": snippet.get("publishedAt"),
            }
        )

    return api_response(
        {
            "items": items,
            "next_page_token": result.get("nextPageToken"),
            "total_results": result.get("pageInfo", {}).get("totalResults"),
        }
    )


# ============================================================================
# Subscription Endpoints
# ============================================================================


@youtube_bp.route("/subscriptions", methods=["GET"])
@require_youtube_credentials
def get_subscriptions():
    """Get authenticated user's subscriptions."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    max_results = request.args.get("max_results", 25, type=int)
    page_token = request.args.get("page_token")

    params = {
        "part": "snippet,contentDetails",
        "mine": "true",
        "maxResults": min(max_results, 50),
    }
    if page_token:
        params["pageToken"] = page_token

    result = _youtube_request("GET", "/subscriptions", access_token, params=params)

    subscriptions = []
    for sub in result.get("items", []):
        snippet = sub.get("snippet", {})
        resource = snippet.get("resourceId", {})
        subscriptions.append(
            {
                "id": sub.get("id"),
                "channel_id": resource.get("channelId"),
                "title": snippet.get("title"),
                "description": snippet.get("description"),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                "published_at": snippet.get("publishedAt"),
            }
        )

    return api_response(
        {
            "subscriptions": subscriptions,
            "next_page_token": result.get("nextPageToken"),
        }
    )


@youtube_bp.route("/subscriptions", methods=["POST"])
@require_youtube_credentials
def subscribe():
    """Subscribe to a channel."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    data = request.get_json()
    if not data:
        raise ApiError("INVALID_REQUEST", "Request body required", 400)

    channel_id = data.get("channel_id")
    if not channel_id:
        raise ApiError("INVALID_REQUEST", "Channel ID required", 400)

    sub_data = {
        "snippet": {
            "resourceId": {
                "kind": "youtube#channel",
                "channelId": channel_id,
            }
        }
    }

    params = {"part": "snippet"}
    result = _youtube_request("POST", "/subscriptions", access_token, data=sub_data, params=params)

    return api_response(
        {
            "id": result.get("id"),
            "channel_id": channel_id,
            "subscribed": True,
        }
    )


@youtube_bp.route("/subscriptions/<subscription_id>", methods=["DELETE"])
@require_youtube_credentials
def unsubscribe(subscription_id):
    """Unsubscribe from a channel."""
    credentials = g.youtube_credentials
    access_token = credentials["access_token"]

    params = {"id": subscription_id}
    _youtube_request("DELETE", "/subscriptions", access_token, params=params)

    return api_response({"unsubscribed": True})
