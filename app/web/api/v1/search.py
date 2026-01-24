"""
Search API v1 Blueprint

Provides full-text search endpoints for synced tweets/posts.
"""

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.search_engine import SearchEngine
from app.web.api.v1.responses import api_error, api_response

search_bp = Blueprint("search", __name__, url_prefix="/search")


def _get_search_engine():
    """Get SearchEngine instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return SearchEngine(db_path)


def _parse_date(date_str: str) -> int | None:
    """Parse ISO date string to Unix timestamp."""
    if not date_str:
        return None
    try:
        from datetime import datetime

        # Support both ISO format and simple date
        if "T" in date_str:
            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        return int(dt.timestamp())
    except (ValueError, TypeError):
        return None


@search_bp.route("", methods=["GET"])
@require_auth
def search_posts():
    """
    Search synced posts with full-text search and filters.

    Query params:
        q: Search query (supports FTS5 syntax)
        limit: Max results (default 50, max 100)
        has_media: Filter by media presence (true/false)
        min_likes: Minimum likes count
        min_retweets: Minimum retweets count
        date_from: Start date (ISO format or YYYY-MM-DD)
        date_to: End date (ISO format or YYYY-MM-DD)
        platform: Filter by platform (twitter/bluesky)
        hashtag: Filter by hashtag (without #)
        author: Filter by author username
    """
    query = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 50)), 100)

    # Parse optional filters
    has_media_param = request.args.get("has_media")
    has_media = None
    if has_media_param is not None:
        has_media = has_media_param.lower() in ("true", "1", "yes")

    min_likes = request.args.get("min_likes", type=int)
    min_retweets = request.args.get("min_retweets", type=int)
    date_from = _parse_date(request.args.get("date_from", ""))
    date_to = _parse_date(request.args.get("date_to", ""))
    platform = request.args.get("platform")
    hashtag = request.args.get("hashtag")
    author = request.args.get("author")

    search_engine = _get_search_engine()

    try:
        # Build filters dict for search_with_filters
        filters = {}

        if date_from is not None:
            filters["date_from"] = date_from
        if date_to is not None:
            filters["date_to"] = date_to
        if has_media is not None:
            filters["has_media"] = has_media
        if min_likes is not None:
            filters["min_likes"] = min_likes
        if min_retweets is not None:
            filters["min_retweets"] = min_retweets
        if hashtag:
            filters["hashtags"] = [hashtag]
        if author:
            filters["author"] = author

        # Use search_with_filters for full filter support
        results = search_engine.search_with_filters(
            query=query, user_id=g.user.id, filters=filters if filters else None
        )

        # Format results
        formatted = []
        for result in results[:limit]:
            tweet_id = result["tweet_id"]
            is_bluesky = tweet_id and tweet_id.startswith("at://")
            result_platform = "bluesky" if is_bluesky else "twitter"

            # Skip if platform filter doesn't match
            if platform and result_platform != platform:
                continue

            formatted.append(
                {
                    "id": tweet_id,
                    "content": result["content"],
                    "created_at": result["posted_at"],
                    "platform": result_platform,
                    "author": result["author"],
                    "hashtags": result["hashtags"].split()
                    if result["hashtags"]
                    else [],
                    "rank": result["rank"],
                    "has_media": result.get("has_media", False),
                    "likes": result.get("likes", 0),
                    "retweets": result.get("retweets", 0),
                }
            )

            if len(formatted) >= limit:
                break

        return api_response(
            {
                "results": formatted,
                "total": len(formatted),
                "query": query,
                "filters_applied": list(filters.keys()) if filters else [],
            }
        )

    except Exception:
        return api_error("SEARCH_ERROR", "Search operation failed", status=500)


@search_bp.route("/suggestions", methods=["GET"])
@require_auth
def search_suggestions():
    """
    Get search suggestions based on query prefix.

    Query params:
        q: Partial query for suggestions
        limit: Max suggestions (default 10)
    """
    query = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 10)), 20)

    if not query or len(query) < 2:
        return api_response({"suggestions": []})

    search_engine = _get_search_engine()

    try:
        # Simple suggestion: search for matching content and extract unique terms
        results = search_engine.search(f"{query}*", user_id=g.user.id, limit=50)

        # Extract unique hashtags and authors as suggestions
        suggestions = set()
        for result in results:
            if result["hashtags"]:
                for tag in result["hashtags"].split():
                    if tag.lower().startswith(query.lower()):
                        suggestions.add(tag)
            if result["author"] and result["author"].lower().startswith(query.lower()):
                suggestions.add(f"@{result['author']}")

        return api_response({"suggestions": list(suggestions)[:limit]})

    except Exception:
        return api_error("SUGGESTION_ERROR", "Failed to get suggestions", status=500)
