from datetime import datetime, timedelta
from typing import Any, Dict, List


def _sample_posts() -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    return [
        {
            "id": "post-1",
            "content": "Exploring AI trends in social feeds.",
            "author": "tech_user",
            "timestamp": (now - timedelta(hours=2)).isoformat() + "Z",
        },
        {
            "id": "post-2",
            "content": "Regular update about my day.",
            "author": "daily_user",
            "timestamp": (now - timedelta(hours=5)).isoformat() + "Z",
        },
    ]


def _build_rule_contributions(rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    contributions = []
    for rule in rules:
        if not rule.get("enabled", True):
            contribution = 0
        else:
            contribution = rule.get("weight", 0)
        conditions = rule.get("conditions") or []
        matched_condition = conditions[0] if conditions else None
        contributions.append(
            {
                "rule_id": rule.get("id"),
                "rule_name": rule.get("name"),
                "rule_type": rule.get("type"),
                "contribution": contribution,
                "matched_condition": matched_condition,
            }
        )
    return contributions


def preview_feed(rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    posts = _sample_posts()
    contributions = _build_rule_contributions(rules)
    total_adjustment = sum(item["contribution"] for item in contributions)

    applied_rules = [
        {
            "rule_id": item["rule_id"],
            "rule_name": item["rule_name"],
            "contribution": item["contribution"],
        }
        for item in contributions
    ]

    for post in posts:
        post["score"] = total_adjustment
        post["applied_rules"] = applied_rules

    return {"posts": posts, "rules_applied": contributions}


def explain_post(post_id: str, rules: List[Dict[str, Any]]) -> Dict[str, Any]:
    contributions = _build_rule_contributions(rules)
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
            }
        )

    return {
        "post_id": post_id,
        "base_score": base_score,
        "rules_applied": rules_applied,
        "final_score": base_score + total_adjustment,
    }
