"""
API endpoints for Content Recycling Engine.

Provides REST API for managing content library and recycle suggestions.
"""

import sqlite3
from flask import Blueprint, current_app, request, g

from app.auth.api_auth import require_auth
from app.web.api.v1.responses import api_response, api_error
from app.features.recycling.models import ContentLibrary, RecycleSuggestion
from app.features.recycling.scorer import ContentScorer
from app.features.recycling.suggester import RecycleSuggester

recycling_bp = Blueprint("recycling", __name__, url_prefix="/library")


def _get_db_path():
    """Get database path from app config."""
    return current_app.config.get("DB_PATH", "chirpsyncer.db")


@recycling_bp.route("", methods=["GET"])
@require_auth
def get_library():
    """
    Get content library for current user.

    Query params:
        platform: Optional platform filter (twitter, bluesky, etc.)
        limit: Results per page (default 50, max 100)
        offset: Pagination offset
        min_score: Minimum recycle score filter

    Returns:
        List of content items with scores and metadata.
    """
    platform = request.args.get("platform")
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = int(request.args.get("offset", 0))
    min_score = request.args.get("min_score", type=float)

    db_path = _get_db_path()
    library = ContentLibrary(db_path=db_path)

    items = library.get_user_content(
        user_id=g.user.id,
        platform=platform,
        limit=limit,
        offset=offset,
    )

    # Filter by min_score if provided
    if min_score is not None:
        items = [i for i in items if i["recycle_score"] >= min_score]

    return api_response({
        "items": items,
        "count": len(items),
        "offset": offset,
        "limit": limit,
    })


@recycling_bp.route("/sync", methods=["POST"])
@require_auth
def sync_library():
    """
    Import content from connected platforms into library.

    Request body:
        platform: Platform to import from (optional, imports all if not specified)
        since_days: Import posts from last N days (default 90)

    This endpoint triggers an async import of user's posts
    from connected platforms, calculating engagement and evergreen scores.
    """
    data = request.get_json(silent=True) or {}
    platform = data.get("platform")
    since_days = data.get("since_days", 90)

    db_path = _get_db_path()
    library = ContentLibrary(db_path=db_path)
    library.init_db()

    scorer = ContentScorer()

    # Get user's synced posts
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Check if synced_posts table exists
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='synced_posts'
        """)
        if not cursor.fetchone():
            return api_response({
                "imported": 0,
                "message": "No synced posts found. Run a sync first."
            })

        # Build query for user's posts
        import time
        cutoff = int(time.time()) - (since_days * 24 * 60 * 60)

        if platform:
            cursor.execute("""
                SELECT * FROM synced_posts
                WHERE user_id = ? AND platform = ? AND created_at >= ?
            """, (g.user.id, platform, cutoff))
        else:
            cursor.execute("""
                SELECT * FROM synced_posts
                WHERE user_id = ? AND created_at >= ?
            """, (g.user.id, cutoff))

        posts = cursor.fetchall()
        imported = 0

        for post in posts:
            # Calculate scores
            post_data = {
                "content": post["content"],
                "likes_count": post.get("likes_count", 0),
                "reposts_count": post.get("retweets_count", 0),
                "replies_count": post.get("replies_count", 0),
                "views_count": post.get("views_count", 0) or 1000,  # Estimate if not available
            }

            scores = scorer.score_post(post_data)

            # Add to library (will skip duplicates)
            content_id = library.add_content(
                user_id=g.user.id,
                platform=post["platform"],
                original_post_id=post["platform_id"],
                content=post["content"],
                media_urls=[],
                engagement_score=scores["engagement_score"],
                evergreen_score=scores["evergreen_score"],
            )

            if content_id:
                imported += 1

    except sqlite3.OperationalError as e:
        current_app.logger.warning(f"Error syncing library: {e}")
        return api_response({
            "imported": 0,
            "message": "No synced posts available."
        })
    finally:
        conn.close()

    # Refresh recycle scores
    suggester = RecycleSuggester(db_path=db_path)
    suggester.refresh_scores(g.user.id)

    return api_response({
        "imported": imported,
        "message": f"Imported {imported} posts to library."
    })


@recycling_bp.route("/suggestions", methods=["GET"])
@require_auth
def get_suggestions():
    """
    Get recycle suggestions for current user.

    Query params:
        limit: Maximum suggestions (default 5, max 20)

    Returns:
        List of content items ranked by recycle potential
        with suggested platforms for cross-posting.
    """
    limit = min(int(request.args.get("limit", 5)), 20)

    db_path = _get_db_path()
    suggester = RecycleSuggester(db_path=db_path)

    # Refresh scores first
    suggester.refresh_scores(g.user.id)

    # Get suggestions with platforms
    suggestions = suggester.get_suggestions_with_platforms(
        user_id=g.user.id,
        limit=limit,
    )

    return api_response({
        "suggestions": suggestions,
        "count": len(suggestions),
    })


@recycling_bp.route("/<int:content_id>/recycle", methods=["POST"])
@require_auth
def recycle_content(content_id: int):
    """
    Schedule a content item for recycling.

    Path params:
        content_id: Content library ID

    Request body:
        platforms: List of platforms to post to
        scheduled_for: Unix timestamp for scheduled time (optional, immediate if not set)

    Returns:
        Created suggestion with schedule details.
    """
    data = request.get_json(silent=True) or {}
    platforms = data.get("platforms", [])
    scheduled_for = data.get("scheduled_for")

    if not platforms:
        return api_error(
            "MISSING_PLATFORMS",
            "At least one platform is required",
            status=400
        )

    db_path = _get_db_path()
    library = ContentLibrary(db_path=db_path)

    # Verify content belongs to user
    content = library.get_content(content_id)
    if not content:
        return api_error("NOT_FOUND", "Content not found", status=404)

    if content["user_id"] != g.user.id:
        return api_error("FORBIDDEN", "Access denied", status=403)

    # Create suggestion
    suggestion_model = RecycleSuggestion(db_path=db_path)
    suggestion_model.init_db()

    suggestion_id = suggestion_model.create_suggestion(
        content_id=content_id,
        suggested_platforms=platforms,
    )

    if not suggestion_id:
        return api_error(
            "CREATE_FAILED",
            "Failed to create recycle suggestion",
            status=500
        )

    # Schedule if timestamp provided
    if scheduled_for:
        suggestion_model.schedule_suggestion(suggestion_id, scheduled_for)

    # Mark content as recycled
    library.mark_as_recycled(content_id)

    suggestion = suggestion_model.get_suggestion(suggestion_id)

    return api_response({
        "suggestion": suggestion,
        "content": content,
        "message": "Content scheduled for recycling"
    }, status=201)


@recycling_bp.route("/<int:content_id>/tags", methods=["PUT"])
@require_auth
def update_tags(content_id: int):
    """
    Update tags for a content item.

    Path params:
        content_id: Content library ID

    Request body:
        tags: List of tag strings

    Returns:
        Updated content item.
    """
    data = request.get_json(silent=True) or {}
    tags = data.get("tags")

    if tags is None:
        return api_error("MISSING_TAGS", "Tags list is required", status=400)

    if not isinstance(tags, list):
        return api_error("INVALID_TAGS", "Tags must be a list", status=400)

    db_path = _get_db_path()
    library = ContentLibrary(db_path=db_path)

    # Verify content belongs to user
    content = library.get_content(content_id)
    if not content:
        return api_error("NOT_FOUND", "Content not found", status=404)

    if content["user_id"] != g.user.id:
        return api_error("FORBIDDEN", "Access denied", status=403)

    # Update tags
    success = library.update_tags(content_id, tags)
    if not success:
        return api_error("UPDATE_FAILED", "Failed to update tags", status=500)

    # Return updated content
    updated = library.get_content(content_id)

    return api_response(updated)


@recycling_bp.route("/<int:content_id>", methods=["GET"])
@require_auth
def get_content_item(content_id: int):
    """
    Get a specific content item.

    Path params:
        content_id: Content library ID

    Returns:
        Content item with all metadata and scores.
    """
    db_path = _get_db_path()
    library = ContentLibrary(db_path=db_path)

    content = library.get_content(content_id)
    if not content:
        return api_error("NOT_FOUND", "Content not found", status=404)

    if content["user_id"] != g.user.id:
        return api_error("FORBIDDEN", "Access denied", status=403)

    return api_response(content)


@recycling_bp.route("/stats", methods=["GET"])
@require_auth
def get_library_stats():
    """
    Get library statistics for current user.

    Returns:
        Total content count, average scores, and recycling stats.
    """
    db_path = _get_db_path()

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get stats
        cursor.execute("""
            SELECT
                COUNT(*) as total,
                AVG(engagement_score) as avg_engagement,
                AVG(evergreen_score) as avg_evergreen,
                AVG(recycle_score) as avg_recycle,
                SUM(recycle_count) as total_recycled,
                COUNT(CASE WHEN recycle_score >= 0.5 THEN 1 END) as recyclable_count
            FROM content_library
            WHERE user_id = ?
        """, (g.user.id,))

        row = cursor.fetchone()
        conn.close()

        return api_response({
            "total_content": row[0] or 0,
            "avg_engagement_score": round(row[1] or 0, 3),
            "avg_evergreen_score": round(row[2] or 0, 3),
            "avg_recycle_score": round(row[3] or 0, 3),
            "total_recycled": row[4] or 0,
            "recyclable_count": row[5] or 0,
        })

    except sqlite3.OperationalError:
        return api_response({
            "total_content": 0,
            "avg_engagement_score": 0,
            "avg_evergreen_score": 0,
            "avg_recycle_score": 0,
            "total_recycled": 0,
            "recyclable_count": 0,
        })
