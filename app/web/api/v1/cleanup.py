import json
from datetime import datetime
import sqlite3

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.auth.credential_manager import CredentialManager
from app.features.cleanup_engine import CleanupEngine
from app.web.api.v1.responses import api_error, api_response

cleanup_bp = Blueprint("cleanup", __name__, url_prefix="/cleanup")


def _get_engine():
    manager = CredentialManager(
        current_app.config["MASTER_KEY"], current_app.config["DB_PATH"]
    )
    engine = CleanupEngine(current_app.config["DB_PATH"], credential_manager=manager)
    engine.init_db()
    return engine


def _get_rule(rule_id: int, user_id: int):
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM cleanup_rules WHERE id = ? AND user_id = ?",
            (rule_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _format_rule(row: dict):
    last_run = None
    if row["last_run"]:
        last_run = datetime.utcfromtimestamp(row["last_run"]).isoformat()
    return {
        "id": row["id"],
        "name": row["name"],
        "rule_type": row["rule_type"],
        "is_enabled": bool(row["enabled"]),
        "total_deleted": row["deleted_count"],
        "last_run": last_run,
        "config": json.loads(row["rule_config"]),
    }


@cleanup_bp.route("/rules", methods=["GET"])
@require_auth
def list_rules():
    engine = _get_engine()
    rules = engine.get_user_rules(g.user.id)
    return api_response([_format_rule(r) for r in rules])


@cleanup_bp.route("/rules", methods=["POST"])
@require_auth
def create_rule():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    rule_type = data.get("type")
    config = data.get("config") or {}
    enabled = data.get("enabled", True)

    if not name or not rule_type:
        return api_error("INVALID_REQUEST", "name and type are required", status=400)

    engine = _get_engine()
    rule_id = engine.create_rule(g.user.id, name, rule_type, config)
    if not enabled:
        engine.disable_rule(rule_id, g.user.id)
    rule = _get_rule(rule_id, g.user.id)
    return api_response(_format_rule(rule), status=201)


@cleanup_bp.route("/rules/<int:rule_id>", methods=["PUT"])
@require_auth
def update_rule(rule_id: int):
    data = request.get_json(silent=True) or {}
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    try:
        cursor = conn.cursor()
        updates = []
        params = []
        if "name" in data:
            updates.append("name = ?")
            params.append(data["name"])
        if "config" in data:
            updates.append("rule_config = ?")
            params.append(json.dumps(data["config"]))
        if "enabled" in data:
            updates.append("enabled = ?")
            params.append(1 if data["enabled"] else 0)
        if "type" in data:
            updates.append("rule_type = ?")
            params.append(data["type"])
        if not updates:
            return api_error("INVALID_REQUEST", "No updates provided", status=400)
        params.extend([rule_id, g.user.id])
        cursor.execute(
            f"UPDATE cleanup_rules SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params,
        )
        conn.commit()
    finally:
        conn.close()
    rule = _get_rule(rule_id, g.user.id)
    if not rule:
        return api_error("NOT_FOUND", "Rule not found", status=404)
    return api_response(_format_rule(rule))


@cleanup_bp.route("/rules/<int:rule_id>", methods=["DELETE"])
@require_auth
def delete_rule(rule_id: int):
    engine = _get_engine()
    if not engine.delete_rule(rule_id, g.user.id):
        return api_error("NOT_FOUND", "Rule not found", status=404)
    return api_response({"deleted": True})


@cleanup_bp.route("/rules/<int:rule_id>/preview", methods=["POST"])
@require_auth
def preview_rule(rule_id: int):
    engine = _get_engine()
    result = engine.preview_cleanup(g.user.id, rule_id)
    return api_response(result)


@cleanup_bp.route("/rules/<int:rule_id>/execute", methods=["POST"])
@require_auth
def execute_rule(rule_id: int):
    data = request.get_json(silent=True) or {}
    danger_token = request.headers.get("X-Danger-Token") or data.get("danger_token")
    if not danger_token:
        return api_error(
            "DANGER_TOKEN_REQUIRED",
            "danger_token required to execute cleanup",
            status=403,
        )
    engine = _get_engine()
    result = engine.execute_cleanup(g.user.id, rule_id, dry_run=False)
    return api_response(result)
