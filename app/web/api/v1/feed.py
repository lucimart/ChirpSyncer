import json
import json
import sqlite3
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.features.feed.explainer import explain_post, preview_feed
from app.models.feed_rule import init_feed_rules_db
from app.web.api.v1.responses import api_error, api_response

feed_bp = Blueprint("feed", __name__)

VALID_RULE_TYPES = {"boost", "demote", "filter"}


def _get_conn():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_tables():
    init_feed_rules_db(current_app.config["DB_PATH"])


def _parse_conditions(raw):
    if isinstance(raw, list):
        return raw
    return None


def _format_timestamp(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).isoformat()
        except ValueError:
            return value
    return value


def _normalize_rule(row):
    position = None
    if hasattr(row, "keys") and "position" in row.keys():
        position = row["position"]
    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "conditions": json.loads(row["conditions"] or "[]"),
        "weight": row["weight"],
        "enabled": bool(row["enabled"]),
        "position": position,
        "created_at": _format_timestamp(row["created_at"]),
        "updated_at": _format_timestamp(row["updated_at"]),
    }


def _validate_rule_payload(data, require_all=True):
    errors = []
    name = data.get("name")
    rule_type = data.get("type")
    conditions = data.get("conditions")
    weight = data.get("weight", 0)

    if require_all and not name:
        errors.append("name is required")
    if require_all and not rule_type:
        errors.append("type is required")
    if rule_type and rule_type not in VALID_RULE_TYPES:
        errors.append("type must be boost, demote, or filter")
    if require_all and conditions is None:
        errors.append("conditions is required")
    if conditions is not None and _parse_conditions(conditions) is None:
        errors.append("conditions must be a list")
    if conditions is not None and isinstance(conditions, list) and len(conditions) == 0:
        errors.append("conditions must include at least one item")

    try:
        weight_value = float(weight)
    except (TypeError, ValueError):
        errors.append("weight must be numeric")
        weight_value = None

    if weight_value is not None and (weight_value < -100 or weight_value > 100):
        errors.append("weight must be between -100 and 100")

    return errors


def _load_rules(user_id: int):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM feed_rules WHERE user_id = ? ORDER BY position ASC, id ASC",
            (user_id,),
        )
        return [_normalize_rule(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@feed_bp.route("/feed-rules", methods=["GET"])
@feed_bp.route("/feed/rules", methods=["GET"])
@require_auth
def list_rules():
    rules = _load_rules(g.user.id)
    return api_response(rules)


@feed_bp.route("/feed-rules", methods=["POST"])
@feed_bp.route("/feed/rules", methods=["POST"])
@require_auth
def create_rule():
    data = request.get_json(silent=True) or {}
    errors = _validate_rule_payload(data, require_all=True)
    if errors:
        return api_error("INVALID_REQUEST", ", ".join(errors), status=400)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COALESCE(MAX(position), 0) FROM feed_rules WHERE user_id = ?",
            (g.user.id,),
        )
        next_position = cursor.fetchone()[0] + 1
        cursor.execute(
            """
            INSERT INTO feed_rules (user_id, name, type, conditions, weight, enabled, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                g.user.id,
                data["name"],
                data["type"],
                json.dumps(data.get("conditions") or []),
                data.get("weight", 0),
                1 if data.get("enabled", True) else 0,
                next_position,
            ),
        )
        rule_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()

    rule = next((r for r in _load_rules(g.user.id) if r["id"] == rule_id), None)
    return api_response(rule, status=201)


@feed_bp.route("/feed-rules/<int:rule_id>", methods=["PUT"])
@feed_bp.route("/feed/rules/<int:rule_id>", methods=["PUT"])
@require_auth
def update_rule(rule_id: int):
    data = request.get_json(silent=True) or {}
    if not data:
        return api_error("INVALID_REQUEST", "No updates provided", status=400)
    errors = _validate_rule_payload(data, require_all=False)
    if errors:
        return api_error("INVALID_REQUEST", ", ".join(errors), status=400)

    fields = []
    params = []
    if "name" in data:
        fields.append("name = ?")
        params.append(data["name"])
    if "type" in data:
        fields.append("type = ?")
        params.append(data["type"])
    if "conditions" in data:
        fields.append("conditions = ?")
        params.append(json.dumps(data.get("conditions") or []))
    if "weight" in data:
        fields.append("weight = ?")
        params.append(data["weight"])
    if "enabled" in data:
        fields.append("enabled = ?")
        params.append(1 if data["enabled"] else 0)
    if "position" in data:
        try:
            position = int(data["position"])
        except (TypeError, ValueError):
            return api_error("INVALID_REQUEST", "position must be numeric", status=400)
        fields.append("position = ?")
        params.append(position)

    if not fields:
        return api_error("INVALID_REQUEST", "No valid updates provided", status=400)

    fields.append("updated_at = CURRENT_TIMESTAMP")

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        params.extend([rule_id, g.user.id])
        cursor.execute(
            f"UPDATE feed_rules SET {', '.join(fields)} WHERE id = ? AND user_id = ?",  # nosec B608 - columns are whitelisted above
            params,
        )
        conn.commit()
    finally:
        conn.close()

    rules = _load_rules(g.user.id)
    rule = next((r for r in rules if r["id"] == rule_id), None)
    if not rule:
        return api_error("NOT_FOUND", "Rule not found", status=404)
    return api_response(rule)


@feed_bp.route("/feed-rules/<int:rule_id>", methods=["DELETE"])
@feed_bp.route("/feed/rules/<int:rule_id>", methods=["DELETE"])
@require_auth
def delete_rule(rule_id: int):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM feed_rules WHERE id = ? AND user_id = ?",
            (rule_id, g.user.id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return api_error("NOT_FOUND", "Rule not found", status=404)
    finally:
        conn.close()
    return api_response({"deleted": True})


@feed_bp.route("/feed-rules/<int:rule_id>/toggle", methods=["PATCH"])
@feed_bp.route("/feed/rules/<int:rule_id>/toggle", methods=["PATCH"])
@require_auth
def toggle_rule(rule_id: int):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT enabled FROM feed_rules WHERE id = ? AND user_id = ?",
            (rule_id, g.user.id),
        )
        row = cursor.fetchone()
        if not row:
            return api_error("NOT_FOUND", "Rule not found", status=404)
        new_value = 0 if row["enabled"] else 1
        cursor.execute(
            "UPDATE feed_rules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (new_value, rule_id, g.user.id),
        )
        conn.commit()
    finally:
        conn.close()

    rules = _load_rules(g.user.id)
    rule = next((r for r in rules if r["id"] == rule_id), None)
    return api_response(rule)


@feed_bp.route("/feed-rules/reorder", methods=["POST"])
@feed_bp.route("/feed/rules/reorder", methods=["POST"])
@require_auth
def reorder_rules():
    data = request.get_json(silent=True) or {}
    order = data.get("order")
    if not isinstance(order, list) or not order:
        return api_error(
            "INVALID_REQUEST", "order must be a non-empty list", status=400
        )

    try:
        order_ids = [int(rule_id) for rule_id in order]
    except (TypeError, ValueError):
        return api_error("INVALID_REQUEST", "order must be a list of ids", status=400)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM feed_rules WHERE user_id = ?", (g.user.id,))
        existing = {row["id"] for row in cursor.fetchall()}
        if set(order_ids) != existing:
            return api_error(
                "INVALID_REQUEST", "order must include all rule ids", status=400
            )

        for position, rule_id in enumerate(order_ids):
            cursor.execute(
                "UPDATE feed_rules SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                (position, rule_id, g.user.id),
            )
        conn.commit()
    finally:
        conn.close()

    return api_response(_load_rules(g.user.id))


@feed_bp.route("/feed/preview", methods=["POST"])
@require_auth
def preview():
    data = request.get_json(silent=True) or {}
    rules = data.get("rules")
    if rules is None:
        rules = _load_rules(g.user.id)
    if not isinstance(rules, list):
        return api_error("INVALID_REQUEST", "rules must be a list", status=400)

    # Pass db_path and user_id for real data
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return api_response(preview_feed(rules, db_path=db_path, user_id=g.user.id))


@feed_bp.route("/feed/explain/<post_id>", methods=["GET"])
@require_auth
def explain(post_id: str):
    rules = _load_rules(g.user.id)
    db_path = current_app.config.get("DB_PATH", "chirpsyncer.db")
    return api_response(
        explain_post(post_id, rules, db_path=db_path, user_id=g.user.id)
    )
