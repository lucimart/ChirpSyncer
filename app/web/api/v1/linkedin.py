"""LinkedIn API v2 endpoints.

Provides REST API endpoints for LinkedIn integration using the LinkedIn API.
Requires OAuth 2.0 authentication with appropriate scopes.

Required scopes:
- r_liteprofile: Basic profile info
- r_emailaddress: Email address (optional)
- w_member_social: Post on behalf of member
- r_organization_social: Read organization posts (for company pages)
- w_organization_social: Post on behalf of organization
"""

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import CredentialManager
from app.core.logger import get_logger
from app.web.api.v1.errors import ApiError
from app.web.api.v1.responses import api_response, api_error

logger = get_logger(__name__)

linkedin_bp = Blueprint("linkedin", __name__, url_prefix="/linkedin")


def _get_linkedin_credentials(user_id: int) -> dict:
    """Get LinkedIn credentials for the user."""
    cm = CredentialManager()
    creds = cm.get_credentials(user_id, "linkedin", "api")

    if not creds or not creds.get("access_token"):
        raise ApiError("LINKEDIN_NOT_CONFIGURED", "LinkedIn credentials not found", 404)

    return creds


def _linkedin_request(
    access_token: str,
    method: str,
    endpoint: str,
    data: dict | None = None,
    api_version: str = "202401",
) -> dict:
    """Make a request to the LinkedIn API.

    Args:
        access_token: OAuth 2.0 access token
        method: HTTP method
        endpoint: API endpoint (without base URL)
        data: Request body for POST/PUT
        api_version: LinkedIn API version

    Returns:
        API response data
    """
    import requests

    base_url = "https://api.linkedin.com/v2"
    url = f"{base_url}{endpoint}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": api_version,
    }

    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            timeout=30,
        )

        if response.status_code == 401:
            raise ApiError("LINKEDIN_AUTH_EXPIRED", "LinkedIn access token expired", 401)

        if response.status_code == 403:
            raise ApiError("LINKEDIN_FORBIDDEN", "LinkedIn API access denied", 403)

        if response.status_code == 429:
            raise ApiError("LINKEDIN_RATE_LIMIT", "LinkedIn API rate limit exceeded", 429)

        if not response.ok:
            error_msg = "LinkedIn API error"
            try:
                error_data = response.json()
                if "message" in error_data:
                    error_msg = error_data["message"]
            except Exception:  # nosec B110 - intentionally ignore JSON parse errors, use default error_msg
                pass
            raise ApiError("LINKEDIN_API_ERROR", error_msg, response.status_code)

        # Some endpoints return empty response
        if response.status_code == 204 or not response.content:
            return {}

        return response.json()

    except requests.RequestException as e:
        logger.error(f"LinkedIn API request failed: {e}")
        raise ApiError("LINKEDIN_REQUEST_FAILED", "Failed to connect to LinkedIn", 503)


# =============================================================================
# Profile Endpoints
# =============================================================================


@linkedin_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile(user_id: int):
    """Get the authenticated user's LinkedIn profile.

    Returns:
        Profile data including id, name, profile picture
    """
    creds = _get_linkedin_credentials(user_id)

    # Use the userinfo endpoint for basic profile (OpenID Connect)
    profile = _linkedin_request(
        creds["access_token"],
        "GET",
        "/userinfo",
    )

    # Transform to consistent format
    result = {
        "id": profile.get("sub"),
        "first_name": profile.get("given_name"),
        "last_name": profile.get("family_name"),
        "name": profile.get("name"),
        "email": profile.get("email"),
        "profile_picture_url": profile.get("picture"),
        "locale": profile.get("locale"),
    }

    return api_response(result)


@linkedin_bp.route("/profile/urn", methods=["GET"])
@require_auth
def get_profile_urn(user_id: int):
    """Get the authenticated user's LinkedIn URN (person ID).

    The URN is required for posting and other operations.

    Returns:
        URN in format 'urn:li:person:XXXXX'
    """
    creds = _get_linkedin_credentials(user_id)

    # Get the member's URN using the me endpoint
    me = _linkedin_request(
        creds["access_token"],
        "GET",
        "/me",
    )

    return api_response({
        "urn": f"urn:li:person:{me.get('id')}",
        "id": me.get("id"),
    })


# =============================================================================
# Posts/Shares Endpoints
# =============================================================================


@linkedin_bp.route("/posts", methods=["GET"])
@require_auth
def get_posts(user_id: int):
    """Get the authenticated user's posts/shares.

    Query params:
        count: Number of posts to retrieve (default 10, max 100)
        start: Pagination start index

    Returns:
        List of posts with engagement metrics
    """
    creds = _get_linkedin_credentials(user_id)
    count = min(int(request.args.get("count", 10)), 100)
    start = int(request.args.get("start", 0))

    # First get the user's URN
    me = _linkedin_request(creds["access_token"], "GET", "/me")
    author_urn = f"urn:li:person:{me.get('id')}"

    # Get posts using the posts API
    posts = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/posts?author={author_urn}&count={count}&start={start}",
    )

    return api_response({
        "posts": posts.get("elements", []),
        "paging": posts.get("paging", {}),
    })


@linkedin_bp.route("/post/<post_id>", methods=["GET"])
@require_auth
def get_post(user_id: int, post_id: str):
    """Get a specific post by ID.

    Args:
        post_id: The post URN or ID

    Returns:
        Post details with content and metrics
    """
    creds = _get_linkedin_credentials(user_id)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    post = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/posts/{post_id}",
    )

    return api_response(post)


@linkedin_bp.route("/post", methods=["POST"])
@require_auth
def create_post(user_id: int):
    """Create a new LinkedIn post.

    Request body:
        text: Post text content (required)
        visibility: 'PUBLIC', 'CONNECTIONS', or 'LOGGED_IN' (default PUBLIC)
        media_category: 'NONE', 'ARTICLE', 'IMAGE' (default NONE)
        original_url: URL for article posts
        image_urns: List of image URNs for image posts

    Returns:
        Created post ID and URN
    """
    creds = _get_linkedin_credentials(user_id)
    data = request.get_json() or {}

    text = data.get("text", "").strip()
    if not text:
        raise ApiError("VALIDATION_ERROR", "Post text is required", 400)

    if len(text) > 3000:
        raise ApiError("VALIDATION_ERROR", "Post text exceeds 3000 character limit", 400)

    # Get author URN
    me = _linkedin_request(creds["access_token"], "GET", "/me")
    author_urn = f"urn:li:person:{me.get('id')}"

    visibility = data.get("visibility", "PUBLIC")
    visibility_map = {
        "PUBLIC": "PUBLIC",
        "CONNECTIONS": "CONNECTIONS",
        "LOGGED_IN": "LOGGED_IN",
    }

    post_data = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "visibility": visibility_map.get(visibility, "PUBLIC"),
        "commentary": text,
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
    }

    # Handle media
    media_category = data.get("media_category", "NONE")
    if media_category == "ARTICLE" and data.get("original_url"):
        post_data["content"] = {
            "article": {
                "source": data["original_url"],
                "title": data.get("title", ""),
                "description": data.get("description", ""),
            }
        }
    elif media_category == "IMAGE" and data.get("image_urns"):
        post_data["content"] = {
            "multiImage": {
                "images": [{"id": urn} for urn in data["image_urns"]]
            }
        }

    result = _linkedin_request(
        creds["access_token"],
        "POST",
        "/posts",
        post_data,
    )

    return api_response({
        "id": result.get("id"),
        "urn": result.get("id"),
        "status": "PUBLISHED",
    }, status=201)


@linkedin_bp.route("/post/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(user_id: int, post_id: str):
    """Delete a post.

    Args:
        post_id: The post URN or ID

    Returns:
        Success confirmation
    """
    creds = _get_linkedin_credentials(user_id)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    _linkedin_request(
        creds["access_token"],
        "DELETE",
        f"/posts/{post_id}",
    )

    return api_response({"deleted": True, "id": post_id})


# =============================================================================
# Media Upload Endpoints
# =============================================================================


@linkedin_bp.route("/media/upload/initialize", methods=["POST"])
@require_auth
def initialize_media_upload(user_id: int):
    """Initialize a media upload for images.

    Request body:
        owner_urn: The owner URN (optional, defaults to authenticated user)

    Returns:
        Upload URL and asset URN for the upload
    """
    creds = _get_linkedin_credentials(user_id)
    data = request.get_json() or {}

    # Get owner URN
    if data.get("owner_urn"):
        owner_urn = data["owner_urn"]
    else:
        me = _linkedin_request(creds["access_token"], "GET", "/me")
        owner_urn = f"urn:li:person:{me.get('id')}"

    # Register upload
    register_data = {
        "registerUploadRequest": {
            "owner": owner_urn,
            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
            "serviceRelationships": [
                {
                    "identifier": "urn:li:userGeneratedContent",
                    "relationshipType": "OWNER",
                }
            ],
        }
    }

    result = _linkedin_request(
        creds["access_token"],
        "POST",
        "/assets?action=registerUpload",
        register_data,
    )

    upload_info = result.get("value", {})

    return api_response({
        "upload_url": upload_info.get("uploadMechanism", {})
            .get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {})
            .get("uploadUrl"),
        "asset_urn": upload_info.get("asset"),
    })


# =============================================================================
# Comments Endpoints
# =============================================================================


@linkedin_bp.route("/post/<post_id>/comments", methods=["GET"])
@require_auth
def get_comments(user_id: int, post_id: str):
    """Get comments on a post.

    Args:
        post_id: The post URN or ID

    Query params:
        count: Number of comments (default 10)
        start: Pagination start

    Returns:
        List of comments
    """
    creds = _get_linkedin_credentials(user_id)
    count = min(int(request.args.get("count", 10)), 100)
    start = int(request.args.get("start", 0))

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    comments = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/socialActions/{post_id}/comments?count={count}&start={start}",
    )

    return api_response({
        "comments": comments.get("elements", []),
        "paging": comments.get("paging", {}),
    })


@linkedin_bp.route("/post/<post_id>/comment", methods=["POST"])
@require_auth
def create_comment(user_id: int, post_id: str):
    """Create a comment on a post.

    Args:
        post_id: The post URN or ID

    Request body:
        text: Comment text (required)

    Returns:
        Created comment data
    """
    creds = _get_linkedin_credentials(user_id)
    data = request.get_json() or {}

    text = data.get("text", "").strip()
    if not text:
        raise ApiError("VALIDATION_ERROR", "Comment text is required", 400)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    # Get author URN
    me = _linkedin_request(creds["access_token"], "GET", "/me")
    actor_urn = f"urn:li:person:{me.get('id')}"

    comment_data = {
        "actor": actor_urn,
        "message": {
            "text": text,
        },
    }

    result = _linkedin_request(
        creds["access_token"],
        "POST",
        f"/socialActions/{post_id}/comments",
        comment_data,
    )

    return api_response(result, status=201)


# =============================================================================
# Reactions/Likes Endpoints
# =============================================================================


@linkedin_bp.route("/post/<post_id>/reactions", methods=["GET"])
@require_auth
def get_reactions(user_id: int, post_id: str):
    """Get reactions on a post.

    Args:
        post_id: The post URN or ID

    Query params:
        count: Number of reactions (default 10)

    Returns:
        List of reactions with types
    """
    creds = _get_linkedin_credentials(user_id)
    count = min(int(request.args.get("count", 10)), 100)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    reactions = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/socialActions/{post_id}/likes?count={count}",
    )

    return api_response({
        "reactions": reactions.get("elements", []),
        "paging": reactions.get("paging", {}),
    })


@linkedin_bp.route("/post/<post_id>/react", methods=["POST"])
@require_auth
def react_to_post(user_id: int, post_id: str):
    """React to a post (like).

    Args:
        post_id: The post URN or ID

    Request body:
        reaction_type: LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY (default LIKE)

    Returns:
        Success confirmation
    """
    creds = _get_linkedin_credentials(user_id)
    data = request.get_json() or {}

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    # Get actor URN
    me = _linkedin_request(creds["access_token"], "GET", "/me")
    actor_urn = f"urn:li:person:{me.get('id')}"

    reaction_type = data.get("reaction_type", "LIKE")
    valid_reactions = ["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "FUNNY"]
    if reaction_type not in valid_reactions:
        raise ApiError("VALIDATION_ERROR", f"Invalid reaction type. Must be one of: {valid_reactions}", 400)

    reaction_data = {
        "actor": actor_urn,
        "reactionType": reaction_type,
    }

    _linkedin_request(
        creds["access_token"],
        "POST",
        f"/socialActions/{post_id}/likes",
        reaction_data,
    )

    return api_response({"reacted": True, "type": reaction_type})


@linkedin_bp.route("/post/<post_id>/react", methods=["DELETE"])
@require_auth
def unreact_to_post(user_id: int, post_id: str):
    """Remove reaction from a post.

    Args:
        post_id: The post URN or ID

    Returns:
        Success confirmation
    """
    creds = _get_linkedin_credentials(user_id)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    # Get actor URN
    me = _linkedin_request(creds["access_token"], "GET", "/me")
    actor_urn = f"urn:li:person:{me.get('id')}"

    _linkedin_request(
        creds["access_token"],
        "DELETE",
        f"/socialActions/{post_id}/likes/{actor_urn}",
    )

    return api_response({"unreacted": True})


# =============================================================================
# Analytics/Insights Endpoints
# =============================================================================


@linkedin_bp.route("/post/<post_id>/analytics", methods=["GET"])
@require_auth
def get_post_analytics(user_id: int, post_id: str):
    """Get analytics for a specific post.

    Args:
        post_id: The post URN or ID

    Returns:
        Post engagement metrics
    """
    creds = _get_linkedin_credentials(user_id)

    # Ensure proper URN format
    if not post_id.startswith("urn:"):
        post_id = f"urn:li:share:{post_id}"

    # Get social metadata (counts)
    social_metadata = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/socialMetadata/{post_id}",
    )

    return api_response({
        "post_id": post_id,
        "total_shares": social_metadata.get("totalShareStatistics", {}).get("shareCount", 0),
        "unique_impressions": social_metadata.get("totalShareStatistics", {}).get("uniqueImpressionsCount", 0),
        "engagement": social_metadata.get("totalShareStatistics", {}).get("engagement", 0),
        "click_count": social_metadata.get("totalShareStatistics", {}).get("clickCount", 0),
        "like_count": social_metadata.get("totalShareStatistics", {}).get("likeCount", 0),
        "comment_count": social_metadata.get("totalShareStatistics", {}).get("commentCount", 0),
    })


# =============================================================================
# Organization/Company Page Endpoints (for company pages)
# =============================================================================


@linkedin_bp.route("/organizations", methods=["GET"])
@require_auth
def get_organizations(user_id: int):
    """Get organizations the user can post on behalf of.

    Returns:
        List of organizations with admin access
    """
    creds = _get_linkedin_credentials(user_id)

    # Get organizations where user is admin
    orgs = _linkedin_request(
        creds["access_token"],
        "GET",
        "/organizationAcls?q=roleAssignee&role=ADMINISTRATOR",
    )

    return api_response({
        "organizations": orgs.get("elements", []),
    })


@linkedin_bp.route("/organization/<org_id>/posts", methods=["GET"])
@require_auth
def get_organization_posts(user_id: int, org_id: str):
    """Get posts from an organization page.

    Args:
        org_id: Organization ID

    Query params:
        count: Number of posts (default 10)
        start: Pagination start

    Returns:
        List of organization posts
    """
    creds = _get_linkedin_credentials(user_id)
    count = min(int(request.args.get("count", 10)), 100)
    start = int(request.args.get("start", 0))

    org_urn = f"urn:li:organization:{org_id}"

    posts = _linkedin_request(
        creds["access_token"],
        "GET",
        f"/posts?author={org_urn}&count={count}&start={start}",
    )

    return api_response({
        "posts": posts.get("elements", []),
        "paging": posts.get("paging", {}),
    })
