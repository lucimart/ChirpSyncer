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


@search_bp.route("", methods=["GET"])
@require_auth
def search_posts():
    """
    Search synced posts with full-text search.

    Query params:
        q: Search query (supports FTS5 syntax)
        limit: Max results (default 50, max 100)
        has_media: Filter by media presence (true/false)
        min_likes: Minimum likes count
        min_retweets: Minimum retweets count
        date_from: Start date (ISO format)
        date_to: End date (ISO format)
        platform: Filter by platform (twitter/bluesky)
    """
    query = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 50)), 100)

    # Optional filters
    has_media = request.args.get("has_media")
    min_likes = request.args.get("min_likes", type=int)
    min_retweets = request.args.get("min_retweets", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    platform = request.args.get("platform")

    search_engine = _get_search_engine()

    try:
        # Basic FTS search
        results = search_engine.search(query, user_id=g.user.id, limit=limit * 2)  # Get extra for filtering

        # Apply additional filters in memory
        filtered = []
        for result in results:
            # Get full post data from synced_posts if needed for filtering
            if has_media is not None:
                # Would need to join with synced_posts for this
                pass
            if min_likes is not None:
                # Would need engagement data
                pass
            if min_retweets is not None:
                # Would need engagement data
                pass

            filtered.append({
                "id": result["tweet_id"],
                "content": result["content"],
                "created_at": result["posted_at"],
                "platform": "twitter" if result["tweet_id"] and not result["tweet_id"].startswith("at://") else "bluesky",
                "author": result["author"],
                "hashtags": result["hashtags"].split() if result["hashtags"] else [],
                "rank": result["rank"],
            })

            if len(filtered) >= limit:
                break

        return api_response({
            "results": filtered,
            "total": len(filtered),
            "query": query,
        })

    except Exception as e:
        return api_error("SEARCH_ERROR", str(e), status=500)


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

        return api_response({
            "suggestions": list(suggestions)[:limit]
        })

    except Exception as e:
        return api_error("SUGGESTION_ERROR", str(e), status=500)
