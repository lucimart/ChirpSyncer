import sqlite3
from datetime import datetime

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.auth.credential_manager import CredentialManager
from app.web.api.v1.responses import api_error, api_response

credentials_bp = Blueprint("credentials", __name__, url_prefix="/credentials")


def _get_credential_manager():
    return CredentialManager(current_app.config["MASTER_KEY"], current_app.config["DB_PATH"])


def _get_credential_by_id(user_id: int, credential_id: int):
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, platform, credential_type, owner_user_id, user_id, is_shared
            FROM user_credentials
            WHERE id = ? AND user_id = ?
        """,
            (credential_id, user_id),
        )
        row = cursor.fetchone()
        if row:
            return dict(row)
        cursor.execute(
            """
            SELECT uc.id, uc.platform, uc.credential_type, uc.user_id as owner_user_id,
                   sc.shared_with_user_id as user_id, 1 as is_shared
            FROM user_credentials uc
            INNER JOIN shared_credentials sc ON uc.id = sc.credential_id
            WHERE uc.id = ? AND sc.shared_with_user_id = ?
        """,
            (credential_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


@credentials_bp.route("", methods=["GET"])
@require_auth
def list_credentials():
    credential_manager = _get_credential_manager()
    credentials = credential_manager.list_user_credentials(g.user.id)
    return api_response([_format_credential(c) for c in credentials])


@credentials_bp.route("", methods=["POST"])
@require_auth
def create_credential():
    data = request.get_json(silent=True) or {}
    platform = data.get("platform")
    credential_type = data.get("credential_type")
    credentials = data.get("credentials") or {}

    if not platform or not credential_type:
        return api_error("INVALID_REQUEST", "platform and credential_type are required", status=400)

    credential_manager = _get_credential_manager()
    try:
        credential_manager.save_credentials(g.user.id, platform, credential_type, credentials)
    except ValueError as exc:
        return api_error("INVALID_REQUEST", str(exc), status=400)
    except Exception as exc:
        return api_error("CREDENTIAL_SAVE_FAILED", str(exc), status=500)

    cred_list = credential_manager.list_user_credentials(g.user.id)
    created = next(
        (cred for cred in cred_list if cred["platform"] == platform and cred["credential_type"] == credential_type),
        None,
    )
    return api_response(_format_credential(created), status=201)


@credentials_bp.route("/<int:cred_id>", methods=["DELETE"])
@require_auth
def delete_credential(cred_id: int):
    credential = _get_credential_by_id(g.user.id, cred_id)
    if not credential:
        return api_error("NOT_FOUND", "Credential not found", status=404)

    if credential.get("owner_user_id") and credential["owner_user_id"] != g.user.id:
        return api_error("FORBIDDEN", "Cannot delete shared credentials", status=403)

    credential_manager = _get_credential_manager()
    deleted = credential_manager.delete_credentials(
        g.user.id, credential["platform"], credential["credential_type"]
    )
    if not deleted:
        return api_error("NOT_FOUND", "Credential not found", status=404)
    return api_response({"deleted": True})


@credentials_bp.route("/<int:cred_id>/test", methods=["POST"])
@require_auth
def test_credential(cred_id: int):
    credential = _get_credential_by_id(g.user.id, cred_id)
    if not credential:
        return api_error("NOT_FOUND", "Credential not found", status=404)

    credential_manager = _get_credential_manager()
    creds = credential_manager.get_credentials(
        g.user.id, credential["platform"], credential["credential_type"]
    )
    if not creds:
        return api_error("NOT_FOUND", "Credentials not available", status=404)

    from app.integrations.credential_validator import validate_credentials

    valid, message = validate_credentials(
        credential["platform"], credential["credential_type"], creds
    )
    return api_response({"valid": bool(valid), "message": message})


def _format_timestamp(value):
    if not value:
        return None
    return datetime.utcfromtimestamp(value).isoformat()


def _format_credential(cred: dict):
    if not cred:
        return None
    return {
        "id": cred["id"],
        "platform": cred["platform"],
        "credential_type": cred["credential_type"],
        "created_at": _format_timestamp(cred["created_at"]),
        "updated_at": _format_timestamp(cred["updated_at"]),
        "last_used": _format_timestamp(cred["last_used"]),
        "is_active": bool(cred["is_active"]),
        "is_shared": bool(cred.get("is_shared")),
        "owner_user_id": cred.get("owner_user_id"),
    }
