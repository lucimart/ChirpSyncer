"""
Scheduling API v1 Blueprint

Provides endpoints for scheduled posts management.
"""

import time
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.tweet_scheduler import TweetScheduler
from app.web.api.v1.responses import api_error, api_response

scheduling_bp = Blueprint("scheduling", __name__, url_prefix="/scheduling")


def _get_scheduler():
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    master_key = current_app.config.get("MASTER_KEY")
    return TweetScheduler(db_path=db_path, master_key=master_key)


def _format_post(row):
    """Format a scheduled post row for API response."""
    return {
        "id": str(row["id"]),
        "content": row["content"],
        "scheduled_at": datetime.fromtimestamp(row["scheduled_time"]).isoformat(),
        "platform": row.get("platform", "twitter"),
        "status": row["status"],
        "predicted_engagement": row.get("predicted_engagement", 50),
        "created_at": datetime.fromtimestamp(row["created_at"]).isoformat(),
        "posted_at": datetime.fromtimestamp(row["posted_at"]).isoformat() if row.get("posted_at") else None,
        "tweet_id": row.get("tweet_id"),
        "error": row.get("error"),
    }


def _parse_scheduled_time(time_str):
    """Parse ISO format time string to naive UTC datetime."""
    if not time_str:
        return None
    # Handle ISO format with or without timezone
    time_str = time_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(time_str)
        # Convert to naive UTC for comparison with datetime.utcnow()
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
        return dt
    except ValueError:
        return None


@scheduling_bp.route("/posts", methods=["GET"])
@require_auth
def list_posts():
    """List scheduled posts for the current user."""
    scheduler = _get_scheduler()
    status_filter = request.args.get("status")

    posts = scheduler.get_all_scheduled_tweets(g.user.id, status=status_filter)
    return api_response([_format_post(post) for post in posts])


@scheduling_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    """Create a new scheduled post."""
    data = request.get_json(silent=True) or {}

    content = data.get("content", "").strip()
    scheduled_at_str = data.get("scheduled_at")
    platform = data.get("platform", "twitter")
    media = data.get("media", [])

    if not content:
        return api_error("INVALID_REQUEST", "content is required", status=400)

    if not scheduled_at_str:
        return api_error("INVALID_REQUEST", "scheduled_at is required", status=400)

    scheduled_at = _parse_scheduled_time(scheduled_at_str)
    if not scheduled_at:
        return api_error("INVALID_REQUEST", "invalid scheduled_at format", status=400)

    if scheduled_at <= datetime.utcnow():
        return api_error("INVALID_REQUEST", "scheduled_at must be in the future", status=400)

    scheduler = _get_scheduler()
    try:
        post_id = scheduler.schedule_tweet(
            user_id=g.user.id,
            content=content,
            scheduled_time=scheduled_at,
            media=media if isinstance(media, list) else [],
        )
    except ValueError as e:
        return api_error("INVALID_REQUEST", str(e), status=400)

    # Fetch the created post
    post = scheduler.get_scheduled_tweet(post_id)
    if not post:
        return api_error("INTERNAL_ERROR", "Failed to create post", status=500)

    # Add platform info (stored separately or inferred)
    post_data = dict(post)
    post_data["platform"] = platform

    return api_response(_format_post(post_data), status=201)


@scheduling_bp.route("/posts/<int:post_id>", methods=["GET"])
@require_auth
def get_post(post_id):
    """Get a specific scheduled post."""
    scheduler = _get_scheduler()
    post = scheduler.get_scheduled_tweet(post_id)

    if not post:
        return api_error("NOT_FOUND", "Post not found", status=404)

    # Verify ownership
    if post["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Post not found", status=404)

    return api_response(_format_post(post))


@scheduling_bp.route("/posts/<int:post_id>", methods=["PUT"])
@require_auth
def update_post(post_id):
    """Update a scheduled post."""
    scheduler = _get_scheduler()
    post = scheduler.get_scheduled_tweet(post_id)

    if not post:
        return api_error("NOT_FOUND", "Post not found", status=404)

    if post["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Post not found", status=404)

    if post["status"] != "pending":
        return api_error("INVALID_REQUEST", "Can only update pending posts", status=400)

    data = request.get_json(silent=True) or {}
    updates = {}

    if "content" in data:
        content = data["content"].strip()
        if not content:
            return api_error("INVALID_REQUEST", "content cannot be empty", status=400)
        updates["content"] = content

    if "scheduled_at" in data:
        scheduled_at = _parse_scheduled_time(data["scheduled_at"])
        if not scheduled_at:
            return api_error("INVALID_REQUEST", "invalid scheduled_at format", status=400)
        if scheduled_at <= datetime.now():
            return api_error("INVALID_REQUEST", "scheduled_at must be in the future", status=400)
        updates["scheduled_time"] = int(scheduled_at.timestamp())

    if updates:
        scheduler.update_scheduled_tweet(post_id, **updates)

    updated_post = scheduler.get_scheduled_tweet(post_id)
    return api_response(_format_post(updated_post))


@scheduling_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id):
    """Cancel/delete a scheduled post."""
    scheduler = _get_scheduler()
    post = scheduler.get_scheduled_tweet(post_id)

    if not post:
        return api_error("NOT_FOUND", "Post not found", status=404)

    if post["user_id"] != g.user.id:
        return api_error("NOT_FOUND", "Post not found", status=404)

    # Mark as cancelled instead of deleting
    scheduler.update_status(post_id, "cancelled")
    return api_response({"success": True})


@scheduling_bp.route("/optimal-times", methods=["GET"])
@require_auth
def get_optimal_times():
    """Get optimal posting times based on user's historical data."""
    # In a real implementation, this would analyze historical engagement data
    # For now, return sensible defaults
    best_times = [
        {"hour": 9, "day": 1, "score": 92, "label": "Monday 9:00 AM"},
        {"hour": 12, "day": 2, "score": 88, "label": "Tuesday 12:00 PM"},
        {"hour": 18, "day": 3, "score": 85, "label": "Wednesday 6:00 PM"},
        {"hour": 10, "day": 4, "score": 82, "label": "Thursday 10:00 AM"},
        {"hour": 14, "day": 5, "score": 78, "label": "Friday 2:00 PM"},
    ]

    return api_response({
        "best_times": best_times,
        "timezone": "UTC",
        "based_on_posts": 0,  # Would be actual count in real implementation
    })


@scheduling_bp.route("/predict", methods=["POST"])
@require_auth
def predict_engagement():
    """Predict engagement for a potential post."""
    data = request.get_json(silent=True) or {}

    content = data.get("content", "").strip()
    if not content:
        return api_error("INVALID_REQUEST", "content is required", status=400)

    scheduled_at_str = data.get("scheduled_at")
    has_media = data.get("has_media", False)

    # Simple engagement prediction algorithm
    # In a real implementation, this would use ML models
    base_score = 50

    # Content length factors
    if len(content) > 200:
        base_score -= 5  # Too long
    elif len(content) < 50:
        base_score -= 3  # Too short
    else:
        base_score += 5  # Good length

    # Media boost
    if has_media:
        base_score += 10

    # Hashtag presence
    hashtag_count = content.count("#")
    if 1 <= hashtag_count <= 3:
        base_score += 5
    elif hashtag_count > 5:
        base_score -= 5  # Too many hashtags

    # Time of day factor (if provided)
    time_factor = 0
    if scheduled_at_str:
        scheduled_at = _parse_scheduled_time(scheduled_at_str)
        if scheduled_at:
            hour = scheduled_at.hour
            # Peak hours: 9-11 AM and 6-8 PM
            if 9 <= hour <= 11 or 18 <= hour <= 20:
                time_factor = 10
            elif 12 <= hour <= 14:
                time_factor = 5
            elif 0 <= hour <= 6:
                time_factor = -10

    final_score = max(0, min(100, base_score + time_factor))

    return api_response({
        "score": final_score,
        "confidence": 0.7,  # Moderate confidence
        "factors": {
            "time_of_day": time_factor / 10 if time_factor else 0.5,
            "day_of_week": 0.5,
            "content_length": 0.6 if 50 <= len(content) <= 200 else 0.4,
            "has_media": 0.8 if has_media else 0.3,
            "historical_performance": 0.5,
        },
        "suggested_improvements": _get_suggestions(content, has_media, final_score),
    })


def _get_suggestions(content, has_media, score):
    """Generate improvement suggestions for the post."""
    suggestions = []

    if len(content) > 200:
        suggestions.append("Consider shortening your post for better engagement")
    elif len(content) < 50:
        suggestions.append("Adding more context could improve engagement")

    if not has_media:
        suggestions.append("Posts with images tend to get 2x more engagement")

    hashtag_count = content.count("#")
    if hashtag_count == 0:
        suggestions.append("Adding 1-2 relevant hashtags can increase reach")
    elif hashtag_count > 5:
        suggestions.append("Using fewer hashtags (2-3) typically performs better")

    if score < 60:
        suggestions.append("Try posting during peak hours (9-11 AM or 6-8 PM)")

    return suggestions[:3]  # Return at most 3 suggestions
