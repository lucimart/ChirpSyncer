"""
Tumblr API Integration

Uses OAuth 1.0a for authentication with the Tumblr API v2.
Supports posting, reading, reblogging, and liking.
"""

import time
import hmac
import hashlib
import base64
import urllib.parse
import uuid

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error

logger = get_logger(__name__)

tumblr_bp = Blueprint("tumblr", __name__, url_prefix="/tumblr")

TUMBLR_API_BASE = "https://api.tumblr.com/v2"


def get_tumblr_credentials(user_id: int) -> dict | None:
    """Get Tumblr credentials for user."""
    cm = CredentialManager()
    return cm.get_credentials(user_id, "tumblr", "api")


def oauth1_sign(method: str, url: str, params: dict, consumer_secret: str, token_secret: str = "") -> str:
    """Create OAuth 1.0a signature."""
    # Sort and encode parameters
    sorted_params = sorted(params.items())
    param_string = "&".join(f"{urllib.parse.quote(str(k), safe='')}"
                           f"={urllib.parse.quote(str(v), safe='')}"
                           for k, v in sorted_params)

    # Create signature base string
    base_string = "&".join([
        method.upper(),
        urllib.parse.quote(url, safe=""),
        urllib.parse.quote(param_string, safe=""),
    ])

    # Create signing key
    signing_key = f"{urllib.parse.quote(consumer_secret, safe='')}&{urllib.parse.quote(token_secret, safe='')}"

    # Generate signature
    signature = hmac.new(
        signing_key.encode("utf-8"),
        base_string.encode("utf-8"),
        hashlib.sha1,
    ).digest()

    return base64.b64encode(signature).decode("utf-8")


def get_oauth1_headers(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    oauth_token: str,
    oauth_token_secret: str,
    extra_params: dict | None = None,
) -> dict:
    """Generate OAuth 1.0a authorization header."""
    oauth_params = {
        "oauth_consumer_key": consumer_key,
        "oauth_token": oauth_token,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_nonce": str(uuid.uuid4().hex),
        "oauth_version": "1.0",
    }

    # Combine with extra params for signing
    sign_params = {**oauth_params}
    if extra_params:
        sign_params.update(extra_params)

    # Generate signature
    signature = oauth1_sign(method, url, sign_params, consumer_secret, oauth_token_secret)
    oauth_params["oauth_signature"] = signature

    # Build authorization header
    auth_header = "OAuth " + ", ".join(
        f'{urllib.parse.quote(k, safe="")}="{urllib.parse.quote(v, safe="")}"'
        for k, v in sorted(oauth_params.items())
    )

    return {"Authorization": auth_header}


def tumblr_request(method: str, endpoint: str, creds: dict, params: dict | None = None, json_body: dict | None = None):
    """Make an authenticated request to Tumblr API."""
    import requests

    url = f"{TUMBLR_API_BASE}{endpoint}"

    headers = get_oauth1_headers(
        method,
        url,
        creds["consumer_key"],
        creds["consumer_secret"],
        creds["oauth_token"],
        creds["oauth_token_secret"],
        params if method == "GET" else None,
    )

    if json_body:
        headers["Content-Type"] = "application/json"

    response = requests.request(
        method,
        url,
        headers=headers,
        params=params if method == "GET" else None,
        json=json_body if method != "GET" else None,
        timeout=15,
    )

    return response


# =============================================================================
# User / Account
# =============================================================================


@tumblr_bp.route("/me", methods=["GET"])
@require_auth
def get_user_info(user_id: int):
    """Get the authenticated user's info."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    try:
        response = tumblr_request("GET", "/user/info", creds)

        if response.status_code == 200:
            data = response.json().get("response", {}).get("user", {})
            return api_response({
                "name": data.get("name"),
                "likes": data.get("likes", 0),
                "following": data.get("following", 0),
                "blogs": [
                    {
                        "name": blog.get("name"),
                        "title": blog.get("title"),
                        "url": blog.get("url"),
                        "uuid": blog.get("uuid"),
                        "primary": blog.get("primary", False),
                        "followers": blog.get("followers", 0),
                        "posts": blog.get("posts", 0),
                        "avatar": blog.get("avatar", [{}])[0].get("url") if blog.get("avatar") else None,
                    }
                    for blog in data.get("blogs", [])
                ],
            })
        elif response.status_code == 401:
            return api_error("UNAUTHORIZED", "Invalid or expired credentials", status=401)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to connect to Tumblr", status=502)


@tumblr_bp.route("/dashboard", methods=["GET"])
@require_auth
def get_dashboard(user_id: int):
    """Get the user's dashboard feed."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 50)
    offset = request.args.get("offset", 0, type=int)
    post_type = request.args.get("type")  # text, photo, quote, link, chat, audio, video, answer

    params = {"limit": limit, "offset": offset}
    if post_type:
        params["type"] = post_type

    try:
        response = tumblr_request("GET", "/user/dashboard", creds, params=params)

        if response.status_code == 200:
            data = response.json().get("response", {})
            posts = [format_post(p) for p in data.get("posts", [])]
            return api_response({
                "posts": posts,
                "count": len(posts),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch dashboard", status=502)


@tumblr_bp.route("/following", methods=["GET"])
@require_auth
def get_following(user_id: int):
    """Get blogs the user is following."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 50)
    offset = request.args.get("offset", 0, type=int)

    try:
        response = tumblr_request("GET", "/user/following", creds, params={"limit": limit, "offset": offset})

        if response.status_code == 200:
            data = response.json().get("response", {})
            blogs = [
                {
                    "name": blog.get("name"),
                    "title": blog.get("title"),
                    "url": blog.get("url"),
                    "description": blog.get("description", "")[:200],
                    "updated": blog.get("updated"),
                }
                for blog in data.get("blogs", [])
            ]
            return api_response({
                "blogs": blogs,
                "total": data.get("total_blogs", len(blogs)),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch following", status=502)


@tumblr_bp.route("/follow", methods=["POST"])
@require_auth
def follow_blog(user_id: int):
    """Follow a blog."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    blog_url = data.get("url")

    if not blog_url:
        return api_error("MISSING_URL", "Blog URL required", status=400)

    try:
        response = tumblr_request("POST", "/user/follow", creds, json_body={"url": blog_url})

        if response.status_code == 200:
            return api_response({"followed": True})
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Blog not found", status=404)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to follow blog", status=502)


@tumblr_bp.route("/unfollow", methods=["POST"])
@require_auth
def unfollow_blog(user_id: int):
    """Unfollow a blog."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    blog_url = data.get("url")

    if not blog_url:
        return api_error("MISSING_URL", "Blog URL required", status=400)

    try:
        response = tumblr_request("POST", "/user/unfollow", creds, json_body={"url": blog_url})

        if response.status_code == 200:
            return api_response({"unfollowed": True})
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to unfollow blog", status=502)


# =============================================================================
# Blog
# =============================================================================


@tumblr_bp.route("/blog/<blog_identifier>", methods=["GET"])
@require_auth
def get_blog_info(user_id: int, blog_identifier: str):
    """Get blog info (blog_identifier can be name or name.tumblr.com)."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    try:
        response = tumblr_request("GET", f"/blog/{blog_identifier}/info", creds)

        if response.status_code == 200:
            blog = response.json().get("response", {}).get("blog", {})
            return api_response({
                "name": blog.get("name"),
                "title": blog.get("title"),
                "url": blog.get("url"),
                "uuid": blog.get("uuid"),
                "description": blog.get("description"),
                "posts": blog.get("posts", 0),
                "likes": blog.get("likes", 0),
                "is_nsfw": blog.get("is_nsfw", False),
                "avatar": blog.get("avatar", [{}])[0].get("url") if blog.get("avatar") else None,
            })
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Blog not found", status=404)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch blog info", status=502)


@tumblr_bp.route("/blog/<blog_identifier>/posts", methods=["GET"])
@require_auth
def get_blog_posts(user_id: int, blog_identifier: str):
    """Get posts from a blog."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 50)
    offset = request.args.get("offset", 0, type=int)
    post_type = request.args.get("type")
    tag = request.args.get("tag")

    params = {"limit": limit, "offset": offset}
    if post_type:
        params["type"] = post_type
    if tag:
        params["tag"] = tag

    try:
        response = tumblr_request("GET", f"/blog/{blog_identifier}/posts", creds, params=params)

        if response.status_code == 200:
            data = response.json().get("response", {})
            posts = [format_post(p) for p in data.get("posts", [])]
            return api_response({
                "posts": posts,
                "total_posts": data.get("total_posts", len(posts)),
            })
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Blog not found", status=404)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch posts", status=502)


# =============================================================================
# Posts
# =============================================================================


def format_post(post: dict) -> dict:
    """Format a Tumblr post for API response."""
    return {
        "id": post.get("id"),
        "id_string": post.get("id_string"),
        "blog_name": post.get("blog_name"),
        "type": post.get("type"),
        "timestamp": post.get("timestamp"),
        "date": post.get("date"),
        "format": post.get("format"),
        "reblog_key": post.get("reblog_key"),
        "tags": post.get("tags", []),
        "note_count": post.get("note_count", 0),
        "post_url": post.get("post_url"),
        "slug": post.get("slug"),
        "state": post.get("state"),
        # Type-specific content
        "title": post.get("title"),
        "body": post.get("body"),
        "caption": post.get("caption"),
        "text": post.get("text"),
        "source": post.get("source"),
        "source_url": post.get("source_url"),
        "photos": [
            {
                "url": p.get("original_size", {}).get("url"),
                "width": p.get("original_size", {}).get("width"),
                "height": p.get("original_size", {}).get("height"),
                "caption": p.get("caption"),
            }
            for p in post.get("photos", [])
        ] if post.get("photos") else None,
        "video_url": post.get("video_url"),
        "audio_url": post.get("audio_url"),
        "link_url": post.get("url"),
        "asking_name": post.get("asking_name"),
        "question": post.get("question"),
        "answer": post.get("answer"),
    }


@tumblr_bp.route("/blog/<blog_identifier>/post", methods=["POST"])
@require_auth
def create_post(user_id: int, blog_identifier: str):
    """
    Create a new post.

    Body:
        type: Post type (text, photo, quote, link, chat, audio, video)
        state: published, draft, queue, private
        tags: Comma-separated tags

        For text:
            title: Optional title
            body: HTML body content

        For photo:
            source: Photo URL
            caption: Optional caption

        For quote:
            quote: The quote text
            source: Quote source/attribution

        For link:
            url: Link URL
            title: Link title
            description: Link description

        For chat:
            title: Optional title
            conversation: Chat text
    """
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    post_type = data.get("type", "text")

    post_data = {
        "type": post_type,
        "state": data.get("state", "published"),
    }

    if data.get("tags"):
        post_data["tags"] = data["tags"]

    # Type-specific fields
    if post_type == "text":
        if data.get("title"):
            post_data["title"] = data["title"]
        if data.get("body"):
            post_data["body"] = data["body"]
        else:
            return api_error("MISSING_BODY", "Body required for text posts", status=400)

    elif post_type == "photo":
        if data.get("source"):
            post_data["source"] = data["source"]
        else:
            return api_error("MISSING_SOURCE", "Source URL required for photo posts", status=400)
        if data.get("caption"):
            post_data["caption"] = data["caption"]

    elif post_type == "quote":
        if data.get("quote"):
            post_data["quote"] = data["quote"]
        else:
            return api_error("MISSING_QUOTE", "Quote text required", status=400)
        if data.get("source"):
            post_data["source"] = data["source"]

    elif post_type == "link":
        if data.get("url"):
            post_data["url"] = data["url"]
        else:
            return api_error("MISSING_URL", "URL required for link posts", status=400)
        if data.get("title"):
            post_data["title"] = data["title"]
        if data.get("description"):
            post_data["description"] = data["description"]

    elif post_type == "chat":
        if data.get("conversation"):
            post_data["conversation"] = data["conversation"]
        else:
            return api_error("MISSING_CONVERSATION", "Conversation required for chat posts", status=400)
        if data.get("title"):
            post_data["title"] = data["title"]

    try:
        response = tumblr_request("POST", f"/blog/{blog_identifier}/post", creds, json_body=post_data)

        if response.status_code in [200, 201]:
            result = response.json().get("response", {})
            return api_response({
                "id": result.get("id"),
                "id_string": result.get("id_string"),
            })
        elif response.status_code == 401:
            return api_error("UNAUTHORIZED", "Not authorized to post to this blog", status=401)
        else:
            error_msg = response.json().get("response", {}).get("errors", [{}])[0].get("detail", "Unknown error")
            return api_error("POST_FAILED", error_msg, status=400)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to create post", status=502)


@tumblr_bp.route("/blog/<blog_identifier>/post/<post_id>", methods=["PUT"])
@require_auth
def edit_post(user_id: int, blog_identifier: str, post_id: str):
    """Edit an existing post."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    data["id"] = post_id

    try:
        response = tumblr_request("POST", f"/blog/{blog_identifier}/post/edit", creds, json_body=data)

        if response.status_code == 200:
            result = response.json().get("response", {})
            return api_response({
                "id": result.get("id"),
                "id_string": result.get("id_string"),
            })
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Post not found", status=404)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to edit post", status=502)


@tumblr_bp.route("/blog/<blog_identifier>/post/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(user_id: int, blog_identifier: str, post_id: str):
    """Delete a post."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    try:
        response = tumblr_request("POST", f"/blog/{blog_identifier}/post/delete", creds, json_body={"id": post_id})

        if response.status_code == 200:
            return api_response({"deleted": True})
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Post not found", status=404)
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to delete post", status=502)


# =============================================================================
# Reblog
# =============================================================================


@tumblr_bp.route("/blog/<blog_identifier>/reblog", methods=["POST"])
@require_auth
def reblog_post(user_id: int, blog_identifier: str):
    """
    Reblog a post.

    Body:
        id: Post ID to reblog
        reblog_key: Reblog key from the original post
        comment: Optional comment/addition
        tags: Optional tags
    """
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    post_id = data.get("id")
    reblog_key = data.get("reblog_key")

    if not post_id or not reblog_key:
        return api_error("MISSING_FIELDS", "Post ID and reblog_key required", status=400)

    reblog_data = {
        "id": post_id,
        "reblog_key": reblog_key,
    }

    if data.get("comment"):
        reblog_data["comment"] = data["comment"]
    if data.get("tags"):
        reblog_data["tags"] = data["tags"]

    try:
        response = tumblr_request("POST", f"/blog/{blog_identifier}/post/reblog", creds, json_body=reblog_data)

        if response.status_code in [200, 201]:
            result = response.json().get("response", {})
            return api_response({
                "id": result.get("id"),
                "id_string": result.get("id_string"),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to reblog post", status=502)


# =============================================================================
# Likes
# =============================================================================


@tumblr_bp.route("/likes", methods=["GET"])
@require_auth
def get_likes(user_id: int):
    """Get posts the user has liked."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 50)
    offset = request.args.get("offset", 0, type=int)

    try:
        response = tumblr_request("GET", "/user/likes", creds, params={"limit": limit, "offset": offset})

        if response.status_code == 200:
            data = response.json().get("response", {})
            posts = [format_post(p) for p in data.get("liked_posts", [])]
            return api_response({
                "posts": posts,
                "total": data.get("liked_count", len(posts)),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch likes", status=502)


@tumblr_bp.route("/like", methods=["POST"])
@require_auth
def like_post(user_id: int):
    """
    Like a post.

    Body:
        id: Post ID
        reblog_key: Reblog key from the post
    """
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    post_id = data.get("id")
    reblog_key = data.get("reblog_key")

    if not post_id or not reblog_key:
        return api_error("MISSING_FIELDS", "Post ID and reblog_key required", status=400)

    try:
        response = tumblr_request("POST", "/user/like", creds, json_body={"id": post_id, "reblog_key": reblog_key})

        if response.status_code == 200:
            return api_response({"liked": True})
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to like post", status=502)


@tumblr_bp.route("/unlike", methods=["POST"])
@require_auth
def unlike_post(user_id: int):
    """
    Unlike a post.

    Body:
        id: Post ID
        reblog_key: Reblog key from the post
    """
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    data = request.get_json() or {}
    post_id = data.get("id")
    reblog_key = data.get("reblog_key")

    if not post_id or not reblog_key:
        return api_error("MISSING_FIELDS", "Post ID and reblog_key required", status=400)

    try:
        response = tumblr_request("POST", "/user/unlike", creds, json_body={"id": post_id, "reblog_key": reblog_key})

        if response.status_code == 200:
            return api_response({"unliked": True})
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to unlike post", status=502)


# =============================================================================
# Tagged Posts (Explore)
# =============================================================================


@tumblr_bp.route("/tagged", methods=["GET"])
@require_auth
def get_tagged_posts(user_id: int):
    """Get posts with a specific tag."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    tag = request.args.get("tag")
    if not tag:
        return api_error("MISSING_TAG", "Tag required", status=400)

    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 50)
    before = request.args.get("before", type=int)  # Timestamp for pagination

    params = {"tag": tag, "limit": limit}
    if before:
        params["before"] = before

    try:
        response = tumblr_request("GET", "/tagged", creds, params=params)

        if response.status_code == 200:
            data = response.json().get("response", [])
            posts = [format_post(p) for p in data]
            return api_response({
                "posts": posts,
                "count": len(posts),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch tagged posts", status=502)


# =============================================================================
# Notes (Likes/Reblogs on a post)
# =============================================================================


@tumblr_bp.route("/blog/<blog_identifier>/post/<post_id>/notes", methods=["GET"])
@require_auth
def get_post_notes(user_id: int, blog_identifier: str, post_id: str):
    """Get notes (likes, reblogs, replies) on a post."""
    creds = get_tumblr_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Tumblr not configured", status=401)

    mode = request.args.get("mode", "all")  # all, likes, conversation, rollup, reblogs_with_tags

    try:
        response = tumblr_request(
            "GET",
            f"/blog/{blog_identifier}/notes",
            creds,
            params={"id": post_id, "mode": mode},
        )

        if response.status_code == 200:
            data = response.json().get("response", {})
            return api_response({
                "notes": data.get("notes", []),
                "total_notes": data.get("total_notes", 0),
            })
        else:
            return api_error("API_ERROR", f"Tumblr API error: {response.status_code}", status=502)

    except Exception as e:
        logger.error(f"Tumblr API error: {e}")
        return api_error("API_FAILED", "Failed to fetch notes", status=502)
