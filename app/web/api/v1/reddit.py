"""
Reddit API Integration

Uses OAuth 2.0 for authentication with the Reddit API.
Supports posting, reading, voting, and commenting.
"""

from flask import Blueprint, request

from app.auth.auth_decorators import require_auth
from app.auth.credential_manager import credential_manager
from app.core.logger import get_logger
from app.web.api.v1.responses import api_response, api_error

logger = get_logger(__name__)

reddit_bp = Blueprint("reddit", __name__, url_prefix="/reddit")

REDDIT_API_BASE = "https://oauth.reddit.com"
REDDIT_USER_AGENT = "ChirpSyncer/1.0"


def get_reddit_credentials(user_id: int) -> dict | None:
    """Get Reddit credentials for user."""
    return credential_manager.get_credentials(user_id, "reddit")


def get_reddit_headers(access_token: str) -> dict:
    """Get headers for Reddit API."""
    return {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": REDDIT_USER_AGENT,
    }


def refresh_token_if_needed(user_id: int, creds: dict) -> dict | None:
    """Refresh access token if expired."""
    import time
    import requests

    if creds.get("expires_at", 0) > time.time() + 60:
        return creds

    refresh_token = creds.get("refresh_token")
    client_id = creds.get("client_id")
    client_secret = creds.get("client_secret")

    if not all([refresh_token, client_id, client_secret]):
        return None

    try:
        response = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(client_id, client_secret),
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={"User-Agent": REDDIT_USER_AGENT},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            creds["access_token"] = data["access_token"]
            creds["expires_at"] = time.time() + data.get("expires_in", 3600)

            # Save updated credentials
            credential_manager.store_credentials(user_id, "reddit", creds)
            return creds

    except requests.RequestException as e:
        logger.error(f"Reddit token refresh error: {e}")

    return None


# =============================================================================
# Identity / Profile
# =============================================================================


@reddit_bp.route("/me", methods=["GET"])
@require_auth
def get_me(user_id: int):
    """Get the authenticated user's profile."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/api/v1/me",
            headers=get_reddit_headers(creds["access_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            return api_response({
                "id": data["id"],
                "name": data["name"],
                "icon_img": data.get("icon_img"),
                "total_karma": data.get("total_karma", 0),
                "link_karma": data.get("link_karma", 0),
                "comment_karma": data.get("comment_karma", 0),
                "created_utc": data.get("created_utc"),
                "is_gold": data.get("is_gold", False),
                "is_mod": data.get("is_mod", False),
            })
        elif response.status_code == 401:
            return api_error("UNAUTHORIZED", "Invalid or expired token", status=401)
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to connect to Reddit", status=502)


@reddit_bp.route("/user/<username>", methods=["GET"])
@require_auth
def get_user(user_id: int, username: str):
    """Get a user's public profile."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/user/{username}/about",
            headers=get_reddit_headers(creds["access_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json().get("data", {})
            return api_response({
                "id": data.get("id"),
                "name": data.get("name"),
                "icon_img": data.get("icon_img"),
                "total_karma": data.get("total_karma", 0),
                "link_karma": data.get("link_karma", 0),
                "comment_karma": data.get("comment_karma", 0),
                "created_utc": data.get("created_utc"),
            })
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "User not found", status=404)
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch user", status=502)


# =============================================================================
# Subreddits
# =============================================================================


@reddit_bp.route("/subreddits/mine", methods=["GET"])
@require_auth
def get_my_subreddits(user_id: int):
    """Get subreddits the user is subscribed to."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    limit = request.args.get("limit", 25, type=int)
    limit = min(limit, 100)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/subreddits/mine/subscriber",
            headers=get_reddit_headers(creds["access_token"]),
            params={"limit": limit},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            subreddits = [
                {
                    "id": sub["data"]["id"],
                    "name": sub["data"]["display_name"],
                    "title": sub["data"]["title"],
                    "description": sub["data"].get("public_description", "")[:200],
                    "subscribers": sub["data"].get("subscribers", 0),
                    "icon_img": sub["data"].get("icon_img"),
                    "nsfw": sub["data"].get("over18", False),
                }
                for sub in data.get("data", {}).get("children", [])
            ]
            return api_response({
                "subreddits": subreddits,
                "count": len(subreddits),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch subreddits", status=502)


@reddit_bp.route("/r/<subreddit>", methods=["GET"])
@require_auth
def get_subreddit(user_id: int, subreddit: str):
    """Get subreddit info."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/r/{subreddit}/about",
            headers=get_reddit_headers(creds["access_token"]),
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json().get("data", {})
            return api_response({
                "id": data.get("id"),
                "name": data.get("display_name"),
                "title": data.get("title"),
                "description": data.get("public_description"),
                "subscribers": data.get("subscribers", 0),
                "active_users": data.get("accounts_active", 0),
                "icon_img": data.get("icon_img"),
                "banner_img": data.get("banner_img"),
                "nsfw": data.get("over18", False),
                "submission_type": data.get("submission_type"),
                "allow_images": data.get("allow_images", True),
                "allow_videos": data.get("allow_videos", True),
            })
        elif response.status_code == 404:
            return api_error("NOT_FOUND", "Subreddit not found", status=404)
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Subreddit is private", status=403)
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch subreddit", status=502)


@reddit_bp.route("/r/<subreddit>/posts", methods=["GET"])
@require_auth
def get_subreddit_posts(user_id: int, subreddit: str):
    """Get posts from a subreddit."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    sort = request.args.get("sort", "hot")  # hot, new, top, rising
    limit = request.args.get("limit", 25, type=int)
    limit = min(limit, 100)
    time_filter = request.args.get("t", "day")  # hour, day, week, month, year, all

    import requests

    try:
        params = {"limit": limit}
        if sort == "top":
            params["t"] = time_filter

        response = requests.get(
            f"{REDDIT_API_BASE}/r/{subreddit}/{sort}",
            headers=get_reddit_headers(creds["access_token"]),
            params=params,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            posts = [
                {
                    "id": post["data"]["id"],
                    "name": post["data"]["name"],  # fullname (t3_xxx)
                    "title": post["data"]["title"],
                    "selftext": post["data"].get("selftext", "")[:500],
                    "author": post["data"]["author"],
                    "subreddit": post["data"]["subreddit"],
                    "score": post["data"]["score"],
                    "upvote_ratio": post["data"].get("upvote_ratio", 0),
                    "num_comments": post["data"]["num_comments"],
                    "created_utc": post["data"]["created_utc"],
                    "url": post["data"]["url"],
                    "permalink": f"https://reddit.com{post['data']['permalink']}",
                    "is_self": post["data"]["is_self"],
                    "nsfw": post["data"].get("over_18", False),
                    "thumbnail": post["data"].get("thumbnail"),
                }
                for post in data.get("data", {}).get("children", [])
            ]
            return api_response({
                "posts": posts,
                "count": len(posts),
                "after": data.get("data", {}).get("after"),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch posts", status=502)


# =============================================================================
# Posts (Submissions)
# =============================================================================


@reddit_bp.route("/post", methods=["POST"])
@require_auth
def create_post(user_id: int):
    """
    Create a new post (submission).

    Body:
        subreddit: Target subreddit (without r/)
        title: Post title
        kind: "self" for text post, "link" for URL
        text: Text content (for self posts)
        url: URL (for link posts)
        nsfw: Mark as NSFW
        spoiler: Mark as spoiler
        flair_id: Optional flair ID
    """
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    data = request.get_json() or {}

    subreddit = data.get("subreddit")
    title = data.get("title")
    kind = data.get("kind", "self")

    if not subreddit:
        return api_error("MISSING_SUBREDDIT", "Subreddit required", status=400)
    if not title:
        return api_error("MISSING_TITLE", "Title required", status=400)
    if len(title) > 300:
        return api_error("TITLE_TOO_LONG", "Title exceeds 300 characters", status=400)

    import requests

    post_data = {
        "sr": subreddit,
        "title": title,
        "kind": kind,
        "api_type": "json",
    }

    if kind == "self":
        post_data["text"] = data.get("text", "")
    elif kind == "link":
        if not data.get("url"):
            return api_error("MISSING_URL", "URL required for link posts", status=400)
        post_data["url"] = data["url"]

    if data.get("nsfw"):
        post_data["nsfw"] = True
    if data.get("spoiler"):
        post_data["spoiler"] = True
    if data.get("flair_id"):
        post_data["flair_id"] = data["flair_id"]

    try:
        response = requests.post(
            f"{REDDIT_API_BASE}/api/submit",
            headers=get_reddit_headers(creds["access_token"]),
            data=post_data,
            timeout=15,
        )

        if response.status_code == 200:
            result = response.json()

            # Check for errors in response
            if result.get("json", {}).get("errors"):
                errors = result["json"]["errors"]
                error_msg = errors[0][1] if errors else "Unknown error"
                return api_error("SUBMISSION_FAILED", error_msg, status=400)

            post_data_resp = result.get("json", {}).get("data", {})
            return api_response({
                "id": post_data_resp.get("id"),
                "name": post_data_resp.get("name"),
                "url": post_data_resp.get("url"),
            })
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Not allowed to post in this subreddit", status=403)
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to create post", status=502)


@reddit_bp.route("/post/<post_id>", methods=["GET"])
@require_auth
def get_post(user_id: int, post_id: str):
    """Get a specific post with comments."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    import requests

    try:
        # Handle both formats: just ID or t3_ID
        if not post_id.startswith("t3_"):
            post_id = f"t3_{post_id}"

        response = requests.get(
            f"{REDDIT_API_BASE}/api/info",
            headers=get_reddit_headers(creds["access_token"]),
            params={"id": post_id},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            children = data.get("data", {}).get("children", [])

            if not children:
                return api_error("NOT_FOUND", "Post not found", status=404)

            post = children[0]["data"]
            return api_response({
                "id": post["id"],
                "name": post["name"],
                "title": post["title"],
                "selftext": post.get("selftext", ""),
                "author": post["author"],
                "subreddit": post["subreddit"],
                "score": post["score"],
                "upvote_ratio": post.get("upvote_ratio", 0),
                "num_comments": post["num_comments"],
                "created_utc": post["created_utc"],
                "url": post["url"],
                "permalink": f"https://reddit.com{post['permalink']}",
                "is_self": post["is_self"],
                "nsfw": post.get("over_18", False),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch post", status=502)


@reddit_bp.route("/post/<post_id>", methods=["DELETE"])
@require_auth
def delete_post(user_id: int, post_id: str):
    """Delete a post."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    import requests

    if not post_id.startswith("t3_"):
        post_id = f"t3_{post_id}"

    try:
        response = requests.post(
            f"{REDDIT_API_BASE}/api/del",
            headers=get_reddit_headers(creds["access_token"]),
            data={"id": post_id},
            timeout=10,
        )

        if response.status_code == 200:
            return api_response({"deleted": True})
        elif response.status_code == 403:
            return api_error("FORBIDDEN", "Not allowed to delete this post", status=403)
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to delete post", status=502)


# =============================================================================
# Comments
# =============================================================================


@reddit_bp.route("/post/<post_id>/comments", methods=["GET"])
@require_auth
def get_comments(user_id: int, post_id: str):
    """Get comments on a post."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    sort = request.args.get("sort", "best")  # best, top, new, controversial, old, qa
    limit = request.args.get("limit", 50, type=int)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/comments/{post_id}",
            headers=get_reddit_headers(creds["access_token"]),
            params={"sort": sort, "limit": limit},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()

            # data[0] is the post, data[1] is the comments
            comments_data = data[1].get("data", {}).get("children", []) if len(data) > 1 else []

            def parse_comment(c):
                if c["kind"] != "t1":
                    return None
                d = c["data"]
                return {
                    "id": d["id"],
                    "name": d["name"],
                    "body": d.get("body", ""),
                    "author": d["author"],
                    "score": d["score"],
                    "created_utc": d["created_utc"],
                    "parent_id": d["parent_id"],
                    "depth": d.get("depth", 0),
                }

            comments = [parse_comment(c) for c in comments_data if c["kind"] == "t1"]
            comments = [c for c in comments if c is not None]

            return api_response({
                "comments": comments,
                "count": len(comments),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch comments", status=502)


@reddit_bp.route("/comment", methods=["POST"])
@require_auth
def create_comment(user_id: int):
    """
    Create a comment.

    Body:
        parent: Parent fullname (t3_xxx for post, t1_xxx for comment)
        text: Comment text
    """
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    data = request.get_json() or {}
    parent = data.get("parent")
    text = data.get("text")

    if not parent:
        return api_error("MISSING_PARENT", "Parent ID required", status=400)
    if not text:
        return api_error("MISSING_TEXT", "Comment text required", status=400)

    import requests

    try:
        response = requests.post(
            f"{REDDIT_API_BASE}/api/comment",
            headers=get_reddit_headers(creds["access_token"]),
            data={
                "thing_id": parent,
                "text": text,
                "api_type": "json",
            },
            timeout=10,
        )

        if response.status_code == 200:
            result = response.json()

            if result.get("json", {}).get("errors"):
                errors = result["json"]["errors"]
                error_msg = errors[0][1] if errors else "Unknown error"
                return api_error("COMMENT_FAILED", error_msg, status=400)

            comment_data = result.get("json", {}).get("data", {}).get("things", [{}])[0].get("data", {})
            return api_response({
                "id": comment_data.get("id"),
                "name": comment_data.get("name"),
                "body": comment_data.get("body"),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to create comment", status=502)


# =============================================================================
# Voting
# =============================================================================


@reddit_bp.route("/vote", methods=["POST"])
@require_auth
def vote(user_id: int):
    """
    Vote on a post or comment.

    Body:
        id: Thing fullname (t3_xxx or t1_xxx)
        dir: 1 (upvote), 0 (remove vote), -1 (downvote)
    """
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    data = request.get_json() or {}
    thing_id = data.get("id")
    direction = data.get("dir", 1)

    if not thing_id:
        return api_error("MISSING_ID", "Thing ID required", status=400)
    if direction not in [-1, 0, 1]:
        return api_error("INVALID_DIRECTION", "Direction must be -1, 0, or 1", status=400)

    import requests

    try:
        response = requests.post(
            f"{REDDIT_API_BASE}/api/vote",
            headers=get_reddit_headers(creds["access_token"]),
            data={"id": thing_id, "dir": direction},
            timeout=10,
        )

        if response.status_code == 200:
            return api_response({"voted": True, "direction": direction})
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to vote", status=502)


# =============================================================================
# Search
# =============================================================================


@reddit_bp.route("/search", methods=["GET"])
@require_auth
def search(user_id: int):
    """Search Reddit."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    query = request.args.get("q")
    if not query:
        return api_error("MISSING_QUERY", "Search query required", status=400)

    subreddit = request.args.get("subreddit")
    sort = request.args.get("sort", "relevance")
    time_filter = request.args.get("t", "all")
    limit = request.args.get("limit", 25, type=int)
    limit = min(limit, 100)

    import requests

    try:
        url = f"{REDDIT_API_BASE}/r/{subreddit}/search" if subreddit else f"{REDDIT_API_BASE}/search"

        params = {
            "q": query,
            "sort": sort,
            "t": time_filter,
            "limit": limit,
            "restrict_sr": "on" if subreddit else "off",
        }

        response = requests.get(
            url,
            headers=get_reddit_headers(creds["access_token"]),
            params=params,
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            posts = [
                {
                    "id": post["data"]["id"],
                    "title": post["data"]["title"],
                    "author": post["data"]["author"],
                    "subreddit": post["data"]["subreddit"],
                    "score": post["data"]["score"],
                    "num_comments": post["data"]["num_comments"],
                    "created_utc": post["data"]["created_utc"],
                    "permalink": f"https://reddit.com{post['data']['permalink']}",
                }
                for post in data.get("data", {}).get("children", [])
            ]
            return api_response({
                "posts": posts,
                "count": len(posts),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to search", status=502)


# =============================================================================
# Feed (Home)
# =============================================================================


@reddit_bp.route("/feed", methods=["GET"])
@require_auth
def get_feed(user_id: int):
    """Get the user's home feed."""
    creds = get_reddit_credentials(user_id)
    if not creds:
        return api_error("NOT_CONFIGURED", "Reddit not configured", status=401)

    creds = refresh_token_if_needed(user_id, creds)
    if not creds:
        return api_error("TOKEN_EXPIRED", "Failed to refresh token", status=401)

    sort = request.args.get("sort", "best")  # best, hot, new, top, rising
    limit = request.args.get("limit", 25, type=int)
    limit = min(limit, 100)

    import requests

    try:
        response = requests.get(
            f"{REDDIT_API_BASE}/{sort}",
            headers=get_reddit_headers(creds["access_token"]),
            params={"limit": limit},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            posts = [
                {
                    "id": post["data"]["id"],
                    "title": post["data"]["title"],
                    "selftext": post["data"].get("selftext", "")[:300],
                    "author": post["data"]["author"],
                    "subreddit": post["data"]["subreddit"],
                    "score": post["data"]["score"],
                    "num_comments": post["data"]["num_comments"],
                    "created_utc": post["data"]["created_utc"],
                    "permalink": f"https://reddit.com{post['data']['permalink']}",
                    "thumbnail": post["data"].get("thumbnail"),
                }
                for post in data.get("data", {}).get("children", [])
            ]
            return api_response({
                "posts": posts,
                "count": len(posts),
                "after": data.get("data", {}).get("after"),
            })
        else:
            return api_error("API_ERROR", f"Reddit API error: {response.status_code}", status=502)

    except requests.RequestException as e:
        logger.error(f"Reddit API error: {e}")
        return api_error("API_FAILED", "Failed to fetch feed", status=502)
