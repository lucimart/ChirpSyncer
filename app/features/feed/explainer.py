import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


def _sample_posts() -> List[Dict[str, Any]]:
    """Fallback sample posts when no real data available."""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "post-1",
            "content": "Exploring AI trends in social feeds.",
            "author": "tech_user",
            "timestamp": (now - timedelta(hours=2)).isoformat() + "Z",
            "likes": 0,
            "retweets": 0,
            "has_media": False,
        },
        {
            "id": "post-2",
            "content": "Regular update about my day.",
            "author": "daily_user",
            "timestamp": (now - timedelta(hours=5)).isoformat() + "Z",
            "likes": 0,
            "retweets": 0,
            "has_media": False,
        },
    ]


def _fetch_real_posts(
    db_path: str, user_id: int, limit: int = 50
) -> List[Dict[str, Any]]:
    """Fetch real posts from synced_posts table."""
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT 
                COALESCE(twitter_id, bluesky_uri) as id,
                original_text as content,
                COALESCE(twitter_username, '') as author,
                posted_at as timestamp,
                COALESCE(likes_count, 0) as likes,
                COALESCE(retweets_count, 0) as retweets,
                COALESCE(has_media, 0) as has_media,
                hashtags
            FROM synced_posts
            WHERE user_id = ?
            ORDER BY posted_at DESC
            LIMIT ?
        """,
            (user_id, limit),
        )

        posts = []
        for row in cursor.fetchall():
            # Convert timestamp to ISO format
            timestamp = row["timestamp"]
            if isinstance(timestamp, int):
                timestamp = (
                    datetime.fromtimestamp(timestamp, timezone.utc)
                    .isoformat()
                    .replace("+00:00", "Z")
                )
            elif timestamp:
                timestamp = str(timestamp)
            else:
                timestamp = (
                    datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                )

            posts.append(
                {
                    "id": row["id"],
                    "content": row["content"] or "",
                    "author": row["author"],
                    "timestamp": timestamp,
                    "likes": row["likes"],
                    "retweets": row["retweets"],
                    "has_media": bool(row["has_media"]),
                    "hashtags": (row["hashtags"] or "").split()
                    if row["hashtags"]
                    else [],
                }
            )

        conn.close()
        return posts if posts else _sample_posts()

    except Exception:
        return _sample_posts()


def _get_post_by_id(
    db_path: str, user_id: int, post_id: str
) -> Optional[Dict[str, Any]]:
    """Fetch a specific post by ID."""
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT 
                COALESCE(twitter_id, bluesky_uri) as id,
                original_text as content,
                COALESCE(twitter_username, '') as author,
                posted_at as timestamp,
                COALESCE(likes_count, 0) as likes,
                COALESCE(retweets_count, 0) as retweets,
                COALESCE(has_media, 0) as has_media,
                hashtags
            FROM synced_posts
            WHERE user_id = ? AND (twitter_id = ? OR bluesky_uri = ?)
        """,
            (user_id, post_id, post_id),
        )

        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        timestamp = row["timestamp"]
        if isinstance(timestamp, int):
            timestamp = (
                datetime.fromtimestamp(timestamp, timezone.utc)
                .isoformat()
                .replace("+00:00", "Z")
            )
        elif timestamp:
            timestamp = str(timestamp)
        else:
            timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        return {
            "id": row["id"],
            "content": row["content"] or "",
            "author": row["author"],
            "timestamp": timestamp,
            "likes": row["likes"],
            "retweets": row["retweets"],
            "has_media": bool(row["has_media"]),
            "hashtags": (row["hashtags"] or "").split() if row["hashtags"] else [],
        }

    except Exception:
        return None


def _evaluate_condition(condition: Dict[str, Any], post: Dict[str, Any]) -> bool:
    """Evaluate a single condition against a post."""
    field = condition.get("field", "")
    operator = condition.get("operator", "")
    value = condition.get("value")

    # Get the post field value
    if field == "content":
        post_value = post.get("content", "")
    elif field == "author":
        post_value = post.get("author", "")
    elif field == "likes":
        post_value = post.get("likes", 0)
    elif field == "retweets":
        post_value = post.get("retweets", 0)
    elif field == "has_media":
        post_value = post.get("has_media", False)
    elif field == "hashtags":
        post_value = post.get("hashtags", [])
    else:
        return False

    # Evaluate based on operator
    if operator == "contains":
        if isinstance(post_value, str):
            return str(value).lower() in post_value.lower()
        elif isinstance(post_value, list):
            return str(value).lower() in [str(v).lower() for v in post_value]
        return False
    elif operator == "equals":
        return str(post_value).lower() == str(value).lower()
    elif operator == "greater_than":
        try:
            return float(post_value if post_value is not None else 0) > float(
                value if value is not None else 0
            )
        except (ValueError, TypeError):
            return False
    elif operator == "less_than":
        try:
            return float(post_value if post_value is not None else 0) < float(
                value if value is not None else 0
            )
        except (ValueError, TypeError):
            return False
    elif operator == "is_true":
        return bool(post_value) is True
    elif operator == "is_false":
        return bool(post_value) is False

    return False


def _build_rule_contributions(
    rules: List[Dict[str, Any]], post: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Build rule contributions, optionally evaluating against a specific post."""
    contributions = []
    for rule in rules:
        if not rule.get("enabled", True):
            contribution = 0
            matched = False
        else:
            conditions = rule.get("conditions") or []

            # If we have a post, evaluate conditions against it
            if post and conditions:
                matched = all(_evaluate_condition(cond, post) for cond in conditions)
                contribution = rule.get("weight", 0) if matched else 0
            else:
                # No post or no conditions - use weight directly
                matched = True
                contribution = rule.get("weight", 0)

        matched_condition = (rule.get("conditions") or [None])[0]
        contributions.append(
            {
                "rule_id": rule.get("id"),
                "rule_name": rule.get("name"),
                "rule_type": rule.get("type"),
                "contribution": contribution,
                "matched_condition": matched_condition,
                "matched": matched if post else None,
            }
        )
    return contributions


def preview_feed(
    rules: List[Dict[str, Any]],
    db_path: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Preview feed with rules applied to real or sample posts."""
    # Fetch real posts if db_path and user_id provided
    if db_path and user_id:
        posts = _fetch_real_posts(db_path, user_id, limit=20)
    else:
        posts = _sample_posts()

    # Score each post individually
    scored_posts = []
    for post in posts:
        contributions = _build_rule_contributions(rules, post)
        total_score = sum(item["contribution"] for item in contributions)

        applied_rules = [
            {
                "rule_id": item["rule_id"],
                "rule_name": item["rule_name"],
                "contribution": item["contribution"],
                "matched": item["matched"],
            }
            for item in contributions
            if item["matched"]  # Only include rules that matched
        ]

        scored_post = {**post, "score": total_score, "applied_rules": applied_rules}
        scored_posts.append(scored_post)

    # Sort by score descending
    scored_posts.sort(key=lambda p: p["score"], reverse=True)

    # Build overall rule summary
    all_contributions = _build_rule_contributions(rules)

    return {"posts": scored_posts, "rules_applied": all_contributions}


def explain_post(
    post_id: str,
    rules: List[Dict[str, Any]],
    db_path: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Explain how rules affect a specific post's score."""
    # Try to fetch the real post
    post = None
    if db_path and user_id:
        post = _get_post_by_id(db_path, user_id, post_id)

    # Calculate contributions with the actual post data
    contributions = _build_rule_contributions(rules, post)
    total_adjustment = sum(item["contribution"] for item in contributions)
    base_score = 0

    rules_applied = []
    for item in contributions:
        percentage = 0
        if total_adjustment != 0:
            percentage = round((item["contribution"] / total_adjustment) * 100, 1)
        rules_applied.append(
            {
                "rule_id": item["rule_id"],
                "rule_name": item["rule_name"],
                "rule_type": item["rule_type"],
                "contribution": item["contribution"],
                "percentage": percentage,
                "matched_condition": item["matched_condition"],
                "matched": item["matched"],
            }
        )

    result = {
        "post_id": post_id,
        "base_score": base_score,
        "rules_applied": rules_applied,
        "final_score": base_score + total_adjustment,
    }

    # Include post data if found
    if post:
        result["post"] = post

    return result
