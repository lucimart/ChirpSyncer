"""Facebook Graph API endpoints.

Provides REST API endpoints for Facebook Page integration using the Graph API.
Requires OAuth 2.0 authentication with appropriate permissions.

Required permissions:
- pages_show_list: List pages user manages
- pages_read_engagement: Read page posts and insights
- pages_manage_posts: Create and delete posts
- pages_manage_engagement: Manage comments and reactions
- pages_read_user_content: Read user posts on page
"""

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response

logger = get_logger(__name__)

facebook_bp = Blueprint("facebook", __name__, url_prefix="/facebook")


def _get_facebook_credentials(user_id: int) -> dict:
    """Get Facebook credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "facebook", "api")

    if not creds or not creds.get("access_token"):
        raise ApiError("FACEBOOK_NOT_CONFIGURED", "Facebook credentials not found", 404)

    return creds


def _facebook_request(
    access_token: str,
    method: str,
    endpoint: str,
    data: dict | None = None,
    params: dict | None = None,
    api_version: str = "v19.0",
) -> dict:
    """Make a request to the Facebook Graph API.

    Args:
        access_token: OAuth 2.0 access token (user or page token)
        method: HTTP method
        endpoint: API endpoint (without base URL)
        data: Request body for POST
        params: Query parameters
        api_version: Graph API version

    Returns:
        API response data
    """
    import requests

    base_url = f"https://graph.facebook.com/{api_version}"
    url = f"{base_url}{endpoint}"

    # Add access token to params
    if params is None:
        params = {}
    params["access_token"] = access_token

    headers = {
        "Content-Type": "application/json",
    }

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=data if data and method in ("POST", "PUT") else None,
            timeout=30,
        )

        response_data = response.json()

        if "error" in response_data:
            error = response_data["error"]
            error_code = error.get("code", 0)
            error_msg = error.get("message", "Facebook API error")

            if error_code == 190:  # Invalid/expired token
                raise ApiError("FACEBOOK_AUTH_EXPIRED", "Facebook access token expired", 401)
            if error_code in (4, 17, 341):  # Rate limiting
                raise ApiError("FACEBOOK_RATE_LIMIT", "Facebook API rate limit exceeded", 429)
            if error_code == 10:  # Permission denied
                raise ApiError("FACEBOOK_FORBIDDEN", "Facebook API permission denied", 403)

            raise ApiError("FACEBOOK_API_ERROR", error_msg, response.status_code or 400)

        return response_data

    except requests.RequestException as e:
        logger.error(f"Facebook API request failed: {e}")
        raise ApiError("FACEBOOK_REQUEST_FAILED", "Failed to connect to Facebook", 503)


# =============================================================================
# User/Page Endpoints
# =============================================================================


@facebook_bp.route("/me", methods=["GET"])
@require_auth
def get_me(user_id: int):
    """Get the authenticated user's Facebook profile.

    Returns:
        User profile data
    """
    creds = _get_facebook_credentials(user_id)

    user = _facebook_request(
        creds["access_token"],
        "GET",
        "/me",
        params={"fields": "id,name,email,picture.type(large)"},
    )

    return api_response({
        "id": user.get("id"),
        "name": user.get("name"),
        "email": user.get("email"),
        "picture_url": user.get("picture", {}).get("data", {}).get("url"),
    })


@facebook_bp.route("/pages", methods=["GET"])
@require_auth
def get_pages(user_id: int):
    """Get pages the user manages.

    Returns:
        List of pages with their access tokens
    """
    creds = _get_facebook_credentials(user_id)

    pages = _facebook_request(
        creds["access_token"],
        "GET",
        "/me/accounts",
        params={"fields": "id,name,category,picture.type(large),access_token,fan_count"},
    )

    return api_response({
        "pages": pages.get("data", []),
        "paging": pages.get("paging", {}),
    })


@facebook_bp.route("/page/<page_id>", methods=["GET"])
@require_auth
def get_page(user_id: int, page_id: str):
    """Get a specific page's details.

    Args:
        page_id: The page ID

    Returns:
        Page details
    """
    creds = _get_facebook_credentials(user_id)

    page = _facebook_request(
        creds["access_token"],
        "GET",
        f"/{page_id}",
        params={
            "fields": "id,name,category,about,description,picture.type(large),cover,"
                     "fan_count,followers_count,link,website,phone,emails"
        },
    )

    return api_response(page)


# =============================================================================
# Posts Endpoints
# =============================================================================


@facebook_bp.route("/page/<page_id>/posts", methods=["GET"])
@require_auth
def get_page_posts(user_id: int, page_id: str):
    """Get posts from a page.

    Args:
        page_id: The page ID

    Query params:
        limit: Number of posts (default 25)
        after: Pagination cursor

    Returns:
        List of posts
    """
    creds = _get_facebook_credentials(user_id)
    limit = min(int(request.args.get("limit", 25)), 100)
    after = request.args.get("after")

    params = {
        "fields": "id,message,created_time,full_picture,permalink_url,shares,"
                 "reactions.summary(total_count),comments.summary(total_count),"
                 "attachments{media,media_type,url,title,description}",
        "limit": limit,
    }
    if after:
        params["after"] = after

    # Get page access token first
    pages = _facebook_request(
        creds["access_token"],
        "GET",
        "/me/accounts",
        params={"fields": "id,access_token"},
    )

    page_token = None
    for page in pages.get("data", []):
        if page.get("id") == page_id:
            page_token = page.get("access_token")
            break

    if not page_token:
        raise ApiError("PAGE_NOT_FOUND", "Page not found or no access", 404)

    posts = _facebook_request(
        page_token,
        "GET",
        f"/{page_id}/posts",
        params=params,
    )

    return api_response({
        "posts": posts.get("data", []),
        "paging": posts.get("paging", {}),
    })


@facebook_bp.route("/post/<post_id>", methods=["GET"])
@require_auth
def get_post(user_id: int, post_id: str):
    """Get a specific post.

    Args:
        post_id: The post ID

    Returns:
        Post details
    """
    creds = _get_facebook_credentials(user_id)

    post = _facebook_request(
        creds["access_token"],
        "GET",
        f"/{post_id}",
        params={
            "fields": "id,message,created_time,full_picture,permalink_url,shares,"
                     "reactions.summary(total_count),comments.summary(total_count),"
                     "attachments{media,media_type,url,title,description}"
        },
    )

    return api_response(post)


@facebook_bp.route("/page/<page_id>/post", methods=["POST"])
@require_auth
def create_post(user_id: int, page_id: str):
    """Create a new post on a page.

    Args:
        page_id: The page ID

    Request body:
        message: Post text (required for text posts)
        link: URL to share (optional)
        published: Whether to publish immediately (default true)
        scheduled_publish_time: Unix timestamp for scheduled posts

    Returns:
        Created post ID
    """
    creds = _get_facebook_credentials(user_id)
    data = request.get_json() or {}

    message = data.get("message", "").strip()
    link = data.get("link")

    if not message and not link:
        raise ApiError("VALIDATION_ERROR", "Message or link is required", 400)

    if message and len(message) > 63206:
        raise ApiError("VALIDATION_ERROR", "Message exceeds 63,206 character limit", 400)

    # Get page access token
    pages = _facebook_request(
        creds["access_token"],
        "GET",
        "/me/accounts",
        params={"fields": "id,access_token"},
    )

    page_token = None
    for page in pages.get("data", []):
        if page.get("id") == page_id:
            page_token = page.get("access_token")
            break

    if not page_token:
        raise ApiError("PAGE_NOT_FOUND", "Page not found or no access", 404)

    post_data = {}
    if message:
        post_data["message"] = message
    if link:
        post_data["link"] = link
    if data.get("published") is not None:
        post_data["published"] = data["published"]
    if data.get("scheduled_publish_time"):
        post_data["scheduled_publish_time"] = data["scheduled_publish_time"]
        post_data["published"] = False

    result = _facebook_request(
        page_token,
        "POST",
        f"/{page_id}/feed",
        data=post_data,
    )

    return api_response({
        "id": result.get("id"),
        "status": "PUBLISHED" if data.get("published", True) else "SCHEDULED",
    }, status=201)


@facebook_bp.route("/post/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(user_id: int, post_id: str):
    """Delete a post.

    Args:
        post_id: The post ID

    Returns:
        Success confirmation
    """
    creds = _get_facebook_credentials(user_id)

    # Extract page ID from post ID (format: pageId_postId)
    page_id = post_id.split("_")[0] if "_" in post_id else None

    if page_id:
        # Get page access token
        pages = _facebook_request(
            creds["access_token"],
            "GET",
            "/me/accounts",
            params={"fields": "id,access_token"},
        )

        page_token = None
        for page in pages.get("data", []):
            if page.get("id") == page_id:
                page_token = page.get("access_token")
                break

        if page_token:
            _facebook_request(page_token, "DELETE", f"/{post_id}")
            return api_response({"deleted": True, "id": post_id})

    # Fall back to user token
    _facebook_request(creds["access_token"], "DELETE", f"/{post_id}")
    return api_response({"deleted": True, "id": post_id})


# =============================================================================
# Photo/Video Endpoints
# =============================================================================


@facebook_bp.route("/page/<page_id>/photo", methods=["POST"])
@require_auth
def create_photo_post(user_id: int, page_id: str):
    """Create a photo post on a page.

    Args:
        page_id: The page ID

    Request body:
        url: URL of the image to post
        caption: Photo caption (optional)
        published: Whether to publish immediately (default true)

    Returns:
        Created photo post ID
    """
    creds = _get_facebook_credentials(user_id)
    data = request.get_json() or {}

    url = data.get("url")
    if not url:
        raise ApiError("VALIDATION_ERROR", "Image URL is required", 400)

    # Get page access token
    pages = _facebook_request(
        creds["access_token"],
        "GET",
        "/me/accounts",
        params={"fields": "id,access_token"},
    )

    page_token = None
    for page in pages.get("data", []):
        if page.get("id") == page_id:
            page_token = page.get("access_token")
            break

    if not page_token:
        raise ApiError("PAGE_NOT_FOUND", "Page not found or no access", 404)

    photo_data = {"url": url}
    if data.get("caption"):
        photo_data["caption"] = data["caption"]
    if data.get("published") is not None:
        photo_data["published"] = data["published"]

    result = _facebook_request(
        page_token,
        "POST",
        f"/{page_id}/photos",
        data=photo_data,
    )

    return api_response({
        "id": result.get("id"),
        "post_id": result.get("post_id"),
    }, status=201)


# =============================================================================
# Comments Endpoints
# =============================================================================


@facebook_bp.route("/post/<post_id>/comments", methods=["GET"])
@require_auth
def get_comments(user_id: int, post_id: str):
    """Get comments on a post.

    Args:
        post_id: The post ID

    Query params:
        limit: Number of comments (default 25)
        after: Pagination cursor

    Returns:
        List of comments
    """
    creds = _get_facebook_credentials(user_id)
    limit = min(int(request.args.get("limit", 25)), 100)
    after = request.args.get("after")

    params = {
        "fields": "id,message,created_time,from{id,name,picture},"
                 "reactions.summary(total_count),comment_count",
        "limit": limit,
    }
    if after:
        params["after"] = after

    comments = _facebook_request(
        creds["access_token"],
        "GET",
        f"/{post_id}/comments",
        params=params,
    )

    return api_response({
        "comments": comments.get("data", []),
        "paging": comments.get("paging", {}),
    })


@facebook_bp.route("/post/<post_id>/comment", methods=["POST"])
@require_auth
def create_comment(user_id: int, post_id: str):
    """Create a comment on a post.

    Args:
        post_id: The post ID

    Request body:
        message: Comment text

    Returns:
        Created comment ID
    """
    creds = _get_facebook_credentials(user_id)
    data = request.get_json() or {}

    message = data.get("message", "").strip()
    if not message:
        raise ApiError("VALIDATION_ERROR", "Comment message is required", 400)

    # Extract page ID from post ID to get page token
    page_id = post_id.split("_")[0] if "_" in post_id else None

    token = creds["access_token"]
    if page_id:
        pages = _facebook_request(
            creds["access_token"],
            "GET",
            "/me/accounts",
            params={"fields": "id,access_token"},
        )
        for page in pages.get("data", []):
            if page.get("id") == page_id:
                token = page.get("access_token", token)
                break

    result = _facebook_request(
        token,
        "POST",
        f"/{post_id}/comments",
        data={"message": message},
    )

    return api_response({
        "id": result.get("id"),
    }, status=201)


# =============================================================================
# Reactions Endpoints
# =============================================================================


@facebook_bp.route("/post/<post_id>/reactions", methods=["GET"])
@require_auth
def get_reactions(user_id: int, post_id: str):
    """Get reactions on a post.

    Args:
        post_id: The post ID

    Query params:
        limit: Number of reactions (default 25)
        type: Filter by reaction type (LIKE, LOVE, WOW, HAHA, SAD, ANGRY, CARE)

    Returns:
        List of reactions
    """
    creds = _get_facebook_credentials(user_id)
    limit = min(int(request.args.get("limit", 25)), 100)
    reaction_type = request.args.get("type")

    params = {
        "fields": "id,name,type,pic",
        "limit": limit,
    }
    if reaction_type:
        params["type"] = reaction_type

    reactions = _facebook_request(
        creds["access_token"],
        "GET",
        f"/{post_id}/reactions",
        params=params,
    )

    return api_response({
        "reactions": reactions.get("data", []),
        "paging": reactions.get("paging", {}),
        "summary": reactions.get("summary", {}),
    })


# =============================================================================
# Insights/Analytics Endpoints
# =============================================================================


@facebook_bp.route("/page/<page_id>/insights", methods=["GET"])
@require_auth
def get_page_insights(user_id: int, page_id: str):
    """Get insights for a page.

    Args:
        page_id: The page ID

    Query params:
        period: day, week, days_28 (default: day)
        since: Start date (Unix timestamp)
        until: End date (Unix timestamp)

    Returns:
        Page insights metrics
    """
    creds = _get_facebook_credentials(user_id)
    period = request.args.get("period", "day")
    since = request.args.get("since")
    until = request.args.get("until")

    # Get page access token
    pages = _facebook_request(
        creds["access_token"],
        "GET",
        "/me/accounts",
        params={"fields": "id,access_token"},
    )

    page_token = None
    for page in pages.get("data", []):
        if page.get("id") == page_id:
            page_token = page.get("access_token")
            break

    if not page_token:
        raise ApiError("PAGE_NOT_FOUND", "Page not found or no access", 404)

    # Request common page insights
    metrics = [
        "page_impressions",
        "page_impressions_unique",
        "page_engaged_users",
        "page_post_engagements",
        "page_fans",
        "page_fan_adds",
        "page_views_total",
    ]

    params = {
        "metric": ",".join(metrics),
        "period": period,
    }
    if since:
        params["since"] = since
    if until:
        params["until"] = until

    insights = _facebook_request(
        page_token,
        "GET",
        f"/{page_id}/insights",
        params=params,
    )

    return api_response({
        "insights": insights.get("data", []),
        "paging": insights.get("paging", {}),
    })


@facebook_bp.route("/post/<post_id>/insights", methods=["GET"])
@require_auth
def get_post_insights(user_id: int, post_id: str):
    """Get insights for a specific post.

    Args:
        post_id: The post ID

    Returns:
        Post insights metrics
    """
    creds = _get_facebook_credentials(user_id)

    # Extract page ID from post ID
    page_id = post_id.split("_")[0] if "_" in post_id else None

    token = creds["access_token"]
    if page_id:
        pages = _facebook_request(
            creds["access_token"],
            "GET",
            "/me/accounts",
            params={"fields": "id,access_token"},
        )
        for page in pages.get("data", []):
            if page.get("id") == page_id:
                token = page.get("access_token", token)
                break

    # Request post insights
    metrics = [
        "post_impressions",
        "post_impressions_unique",
        "post_engaged_users",
        "post_clicks",
        "post_reactions_by_type_total",
    ]

    insights = _facebook_request(
        token,
        "GET",
        f"/{post_id}/insights",
        params={"metric": ",".join(metrics)},
    )

    return api_response({
        "post_id": post_id,
        "insights": insights.get("data", []),
    })
