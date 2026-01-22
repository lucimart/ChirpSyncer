import json
import sqlite3
import time

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.models.feed_rule import init_feed_rules_db
from app.services.user_settings import UserSettings
from app.web.api.v1.responses import api_response

algorithm_bp = Blueprint("algorithm", __name__, url_prefix="/algorithm")


def _get_conn():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _load_rules(user_id: int):
    init_feed_rules_db(current_app.config["DB_PATH"])
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM feed_rules WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = cursor.fetchall()
        rules = []
        for row in rows:
            raw_conditions = row["conditions"]
            try:
                parsed_conditions = json.loads(raw_conditions or "[]")
            except (TypeError, json.JSONDecodeError):
                parsed_conditions = []
            rules.append(
                {
                    "id": str(row["id"]),
                    "name": row["name"],
                    "type": row["type"],
                    "weight": row["weight"],
                    "enabled": bool(row["enabled"]),
                    "conditions": parsed_conditions,
                }
            )
        return rules
    finally:
        conn.close()


def _calculate_composition(active_rules):
    if not active_rules:
        return {"boosted": 0, "demoted": 0, "filtered": 0, "unaffected": 100}

    counts = {"boost": 0, "demote": 0, "filter": 0}
    for rule in active_rules:
        if rule["type"] in counts:
            counts[rule["type"]] += 1

    total = max(1, sum(counts.values()))
    boosted = round((counts["boost"] / total) * 100)
    demoted = round((counts["demote"] / total) * 100)
    filtered = round((counts["filter"] / total) * 100)
    unaffected = max(0, 100 - boosted - demoted - filtered)

    return {
        "boosted": boosted,
        "demoted": demoted,
        "filtered": filtered,
        "unaffected": unaffected,
    }


def _build_top_rules(active_rules):
    ordered = sorted(active_rules, key=lambda r: abs(r.get("weight", 0)), reverse=True)
    top = []
    for rule in ordered[:5]:
        weight = rule.get("weight", 0)
        posts_affected = max(1, abs(weight) * 10)
        average_impact = weight if rule["type"] != "filter" else 0
        top.append(
            {
                "id": rule["id"],
                "name": rule["name"],
                "type": rule["type"],
                "postsAffected": posts_affected,
                "averageImpact": average_impact,
            }
        )
    return top


@algorithm_bp.route("/stats", methods=["GET"])
@require_auth
def get_stats():
    rules = _load_rules(g.user.id)
    active_rules = [rule for rule in rules if rule["enabled"]]
    total_rules = len(rules)
    active_count = len(active_rules)

    transparency_score = max(40, 100 - total_rules * 4)
    feed_composition = _calculate_composition(active_rules)
    top_rules = _build_top_rules(active_rules)

    stats = {
        "transparencyScore": transparency_score,
        "totalRules": total_rules,
        "activeRules": active_count,
        "feedComposition": feed_composition,
        "topRules": top_rules,
        "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    return api_response(stats)


@algorithm_bp.route("/settings", methods=["GET"])
@require_auth
def get_settings():
    settings = UserSettings(current_app.config["DB_PATH"])
    enabled = settings.get(g.user.id, "algorithm_enabled", True)
    return api_response({"algorithm_enabled": bool(enabled)})


@algorithm_bp.route("/settings", methods=["POST"])
@require_auth
def update_settings():
    data = request.get_json(silent=True) or {}
    enabled = data.get("algorithm_enabled")
    if enabled is None:
        return api_response({"algorithm_enabled": True})
    settings = UserSettings(current_app.config["DB_PATH"])
    settings.set(g.user.id, "algorithm_enabled", bool(enabled))
    return api_response({"algorithm_enabled": bool(enabled)})
