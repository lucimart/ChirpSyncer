"""
Scheduling API v1 Blueprint

Provides endpoints for scheduled posts management with ML-powered optimal timing.
"""

import sqlite3
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.analytics_tracker import AnalyticsTracker
from app.features.tweet_scheduler import TweetScheduler
from app.web.api.v1.responses import api_error, api_response

scheduling_bp = Blueprint("scheduling", __name__, url_prefix="/scheduling")


# Day name mapping
DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


def _get_analytics_tracker() -> AnalyticsTracker:
    """Get analytics tracker instance."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return AnalyticsTracker(db_path=db_path)


def _analyze_historical_engagement(user_id: int, db_path: str) -> Dict[str, Any]:
    """
    Analyze user's historical engagement data to find optimal posting times.

    Returns engagement patterns by hour and day of week.
    """
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Get posts with their engagement metrics and posting times
        # Join synced_posts with tweet_metrics to get engagement data
        cursor.execute(
            """
            SELECT 
                sp.posted_at,
                COALESCE(tm.engagement_rate, 0) as engagement_rate,
                COALESCE(tm.likes, 0) as likes,
                COALESCE(tm.retweets, 0) as retweets,
                COALESCE(tm.impressions, 0) as impressions
            FROM synced_posts sp
            LEFT JOIN tweet_metrics tm ON (
                sp.twitter_id = tm.tweet_id OR sp.bluesky_uri = tm.tweet_id
            )
            WHERE sp.user_id = ?
            AND sp.posted_at IS NOT NULL
            ORDER BY sp.posted_at DESC
            LIMIT 500
        """,
            (user_id,),
        )

        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return {"posts_analyzed": 0, "hourly": {}, "daily": {}}

        # Aggregate engagement by hour and day
        hourly_engagement: Dict[int, List[float]] = defaultdict(list)
        daily_engagement: Dict[int, List[float]] = defaultdict(list)
        hourly_daily_engagement: Dict[Tuple[int, int], List[float]] = defaultdict(list)

        for row in rows:
            posted_at = row["posted_at"]
            engagement = row["engagement_rate"] or 0

            # Handle different timestamp formats
            if isinstance(posted_at, int):
                dt = datetime.fromtimestamp(posted_at, timezone.utc)
            elif isinstance(posted_at, str):
                try:
                    dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                except ValueError:
                    continue
            else:
                continue

            hour = dt.hour
            day = dt.weekday()  # 0=Monday, 6=Sunday
            # Convert to JS day format (0=Sunday, 6=Saturday)
            js_day = (day + 1) % 7

            # If no engagement rate, calculate from likes/retweets
            if engagement == 0 and row["impressions"] > 0:
                engagement = (
                    (row["likes"] + row["retweets"]) / row["impressions"]
                ) * 100
            elif engagement == 0:
                # Use likes + retweets as proxy score
                engagement = row["likes"] + row["retweets"] * 2

            hourly_engagement[hour].append(engagement)
            daily_engagement[js_day].append(engagement)
            hourly_daily_engagement[(js_day, hour)].append(engagement)

        # Calculate averages
        hourly_avg = {h: sum(v) / len(v) for h, v in hourly_engagement.items() if v}
        daily_avg = {d: sum(v) / len(v) for d, v in daily_engagement.items() if v}
        hourly_daily_avg = {
            k: sum(v) / len(v) for k, v in hourly_daily_engagement.items() if v
        }

        return {
            "posts_analyzed": len(rows),
            "hourly": hourly_avg,
            "daily": daily_avg,
            "hourly_daily": hourly_daily_avg,
        }

    except Exception as e:
        current_app.logger.error(f"Error analyzing historical engagement: {e}")
        return {"posts_analyzed": 0, "hourly": {}, "daily": {}}


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
        "posted_at": datetime.fromtimestamp(row["posted_at"]).isoformat()
        if row.get("posted_at")
        else None,
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
        return api_error(
            "INVALID_REQUEST", "scheduled_at must be in the future", status=400
        )

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
            return api_error(
                "INVALID_REQUEST", "invalid scheduled_at format", status=400
            )
        if scheduled_at <= datetime.now():
            return api_error(
                "INVALID_REQUEST", "scheduled_at must be in the future", status=400
            )
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
    """Get optimal posting times based on user's historical engagement data."""
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")

    # Analyze user's historical engagement patterns
    analysis = _analyze_historical_engagement(g.user.id, db_path)

    best_times = []

    if analysis["posts_analyzed"] > 0 and analysis.get("hourly_daily"):
        # Use real data to find best times
        hourly_daily = analysis["hourly_daily"]

        # Sort by engagement and get top slots
        sorted_slots = sorted(hourly_daily.items(), key=lambda x: x[1], reverse=True)[
            :10
        ]

        # Normalize scores to 0-100 range
        if sorted_slots:
            max_engagement = sorted_slots[0][1] if sorted_slots[0][1] > 0 else 1

            seen_days: set = set()
            for (day, hour), engagement in sorted_slots:
                # Limit to one slot per day for variety
                if day in seen_days and len(best_times) >= 3:
                    continue
                seen_days.add(day)

                # Normalize score to 60-95 range
                normalized_score = min(
                    95, max(60, int(60 + (engagement / max_engagement) * 35))
                )

                # Format hour for display
                hour_12 = hour % 12 or 12
                am_pm = "AM" if hour < 12 else "PM"
                label = f"{DAY_NAMES[day]} {hour_12}:00 {am_pm}"

                best_times.append(
                    {
                        "hour": hour,
                        "day": day,
                        "score": normalized_score,
                        "label": label,
                    }
                )

                if len(best_times) >= 5:
                    break

    # If not enough data, supplement with industry best practices
    if len(best_times) < 5:
        default_times = [
            {"hour": 9, "day": 1, "score": 75, "label": "Monday 9:00 AM"},
            {"hour": 12, "day": 2, "score": 72, "label": "Tuesday 12:00 PM"},
            {"hour": 18, "day": 3, "score": 70, "label": "Wednesday 6:00 PM"},
            {"hour": 10, "day": 4, "score": 68, "label": "Thursday 10:00 AM"},
            {"hour": 14, "day": 5, "score": 65, "label": "Friday 2:00 PM"},
        ]

        # Add defaults that don't conflict with existing times
        existing_slots = {(t["day"], t["hour"]) for t in best_times}
        for default in default_times:
            if (default["day"], default["hour"]) not in existing_slots:
                default["estimated"] = True
                best_times.append(default)
                if len(best_times) >= 5:
                    break

    # Sort by score descending
    best_times.sort(key=lambda x: x["score"], reverse=True)

    return api_response(
        {
            "best_times": best_times[:5],
            "timezone": "UTC",
            "based_on_posts": analysis["posts_analyzed"],
            "data_quality": "high"
            if analysis["posts_analyzed"] >= 50
            else ("medium" if analysis["posts_analyzed"] >= 10 else "low"),
        }
    )


@scheduling_bp.route("/predict", methods=["POST"])
@require_auth
def predict_engagement():
    """Predict engagement for a potential post using historical data and heuristics."""
    data = request.get_json(silent=True) or {}

    content = data.get("content", "").strip()
    if not content:
        return api_error("INVALID_REQUEST", "content is required", status=400)

    scheduled_at_str = data.get("scheduled_at")
    has_media = data.get("has_media", False)

    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")

    # Get user's historical engagement patterns
    analysis = _analyze_historical_engagement(g.user.id, db_path)
    has_historical_data = analysis["posts_analyzed"] >= 10

    # Base score starts at 50
    base_score = 50

    # === Content Analysis Factors ===
    content_length_factor = 0
    if len(content) > 200:
        content_length_factor = -5  # Too long
    elif len(content) < 50:
        content_length_factor = -3  # Too short
    else:
        content_length_factor = 5  # Good length (50-200 chars)

    # Media boost (historically proven to increase engagement)
    media_factor = 10 if has_media else 0

    # Hashtag analysis
    hashtag_count = content.count("#")
    hashtag_factor = 0
    if 1 <= hashtag_count <= 3:
        hashtag_factor = 5
    elif hashtag_count > 5:
        hashtag_factor = -5  # Too many hashtags

    # Question/engagement hooks
    engagement_hook_factor = 0
    if "?" in content:
        engagement_hook_factor += 3  # Questions drive replies
    if any(word in content.lower() for word in ["thread", "🧵", "1/"]):
        engagement_hook_factor += 5  # Threads get more engagement

    # === Time-based Factors ===
    time_factor = 0
    day_factor = 0
    historical_time_bonus = 0

    if scheduled_at_str:
        scheduled_at = _parse_scheduled_time(scheduled_at_str)
        if scheduled_at:
            hour = scheduled_at.hour
            # Convert to JS day format
            py_day = scheduled_at.weekday()
            js_day = (py_day + 1) % 7

            # Check if this time slot has good historical performance
            if has_historical_data and analysis.get("hourly_daily"):
                hourly_daily = analysis["hourly_daily"]
                slot_key = (js_day, hour)

                if slot_key in hourly_daily:
                    # Compare to average
                    all_values = list(hourly_daily.values())
                    avg_engagement = (
                        sum(all_values) / len(all_values) if all_values else 0
                    )
                    slot_engagement = hourly_daily[slot_key]

                    if avg_engagement > 0:
                        ratio = slot_engagement / avg_engagement
                        if ratio > 1.5:
                            historical_time_bonus = 15
                        elif ratio > 1.2:
                            historical_time_bonus = 10
                        elif ratio > 1.0:
                            historical_time_bonus = 5
                        elif ratio < 0.5:
                            historical_time_bonus = -10

            # Default time-of-day heuristics (used if no historical data)
            if not has_historical_data:
                if 9 <= hour <= 11 or 18 <= hour <= 20:
                    time_factor = 10  # Peak hours
                elif 12 <= hour <= 14:
                    time_factor = 5  # Lunch time
                elif 0 <= hour <= 6:
                    time_factor = -10  # Late night

            # Day of week factor
            if has_historical_data and analysis.get("daily"):
                daily = analysis["daily"]
                if js_day in daily:
                    all_daily = list(daily.values())
                    avg_daily = sum(all_daily) / len(all_daily) if all_daily else 0
                    if avg_daily > 0:
                        ratio = daily[js_day] / avg_daily
                        if ratio > 1.2:
                            day_factor = 5
                        elif ratio < 0.8:
                            day_factor = -5

    # === Historical Performance Factor ===
    historical_factor = 0
    if has_historical_data:
        # Get user's average engagement rate
        tracker = _get_analytics_tracker()
        user_analytics = tracker.get_user_analytics(g.user.id, "monthly")
        avg_rate = user_analytics.get("avg_engagement_rate", 0)

        # Boost if user has good historical engagement
        if avg_rate > 5:
            historical_factor = 10
        elif avg_rate > 2:
            historical_factor = 5

    # === Calculate Final Score ===
    total_adjustment = (
        content_length_factor
        + media_factor
        + hashtag_factor
        + engagement_hook_factor
        + time_factor
        + day_factor
        + historical_time_bonus
        + historical_factor
    )

    final_score = max(0, min(100, base_score + total_adjustment))

    # Calculate confidence based on data quality
    if analysis["posts_analyzed"] >= 100:
        confidence = 0.85
    elif analysis["posts_analyzed"] >= 50:
        confidence = 0.75
    elif analysis["posts_analyzed"] >= 10:
        confidence = 0.65
    else:
        confidence = 0.5  # Low confidence without historical data

    # Normalize factors to 0-1 scale for display
    def normalize_factor(value: float, max_val: float = 15) -> float:
        return round(0.5 + (value / max_val) * 0.5, 2)

    return api_response(
        {
            "score": final_score,
            "confidence": confidence,
            "based_on_posts": analysis["posts_analyzed"],
            "factors": {
                "time_of_day": normalize_factor(time_factor + historical_time_bonus),
                "day_of_week": normalize_factor(day_factor, 10),
                "content_length": normalize_factor(content_length_factor, 10),
                "has_media": 0.8 if has_media else 0.3,
                "hashtags": normalize_factor(hashtag_factor, 10),
                "historical_performance": normalize_factor(historical_factor),
            },
            "suggested_improvements": _get_suggestions(
                content, has_media, final_score, analysis, scheduled_at_str
            ),
        }
    )


def _get_suggestions(
    content: str,
    has_media: bool,
    score: int,
    analysis: Optional[Dict[str, Any]] = None,
    scheduled_at_str: Optional[str] = None,
) -> List[str]:
    """Generate improvement suggestions based on content and historical data."""
    suggestions = []

    # Content length suggestions
    if len(content) > 200:
        suggestions.append("Consider shortening your post for better engagement")
    elif len(content) < 50:
        suggestions.append("Adding more context could improve engagement")

    # Media suggestions
    if not has_media:
        suggestions.append("Posts with images tend to get 2x more engagement")

    # Hashtag suggestions
    hashtag_count = content.count("#")
    if hashtag_count == 0:
        suggestions.append("Adding 1-2 relevant hashtags can increase reach")
    elif hashtag_count > 5:
        suggestions.append("Using fewer hashtags (2-3) typically performs better")

    # Engagement hook suggestions
    if "?" not in content and len(content) > 100:
        suggestions.append("Questions in posts often drive more replies")

    # Time-based suggestions using historical data
    if analysis and analysis.get("posts_analyzed", 0) >= 10:
        hourly_daily = analysis.get("hourly_daily", {})

        if hourly_daily and scheduled_at_str:
            scheduled_at = _parse_scheduled_time(scheduled_at_str)
            if scheduled_at:
                hour = scheduled_at.hour
                py_day = scheduled_at.weekday()
                js_day = (py_day + 1) % 7

                # Find the best time slot
                if hourly_daily:
                    best_slot = max(hourly_daily.items(), key=lambda x: x[1])
                    best_day, best_hour = best_slot[0]
                    current_slot = (js_day, hour)

                    if current_slot in hourly_daily:
                        current_engagement = hourly_daily[current_slot]
                        best_engagement = best_slot[1]

                        # Suggest better time if current is significantly worse
                        if (
                            best_engagement > 0
                            and current_engagement / best_engagement < 0.7
                        ):
                            hour_12 = best_hour % 12 or 12
                            am_pm = "AM" if best_hour < 12 else "PM"
                            suggestions.append(
                                f"Your posts perform better on {DAY_NAMES[best_day]} at {hour_12}:00 {am_pm}"
                            )
    elif score < 60:
        # Fallback to generic time suggestion
        suggestions.append("Try posting during peak hours (9-11 AM or 6-8 PM)")

    return suggestions[:3]  # Return at most 3 suggestions
