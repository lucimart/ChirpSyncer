import json
import sqlite3
import time

from flask import Blueprint, current_app, g, request

from app.auth.api_auth import require_auth
from app.auth.user_manager import UserManager
from app.models.workspace import ensure_personal_workspace, init_workspace_db
from app.web.api.v1.responses import api_error, api_response

workspaces_bp = Blueprint("workspaces", __name__, url_prefix="/workspaces")


def _get_conn():
    conn = sqlite3.connect(current_app.config["DB_PATH"])
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_tables():
    init_workspace_db(current_app.config["DB_PATH"])


def _format_workspace(row, member_count):
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "type": row["type"],
        "ownerId": str(row["owner_user_id"]),
        "memberCount": member_count,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["created_at"])),
    }


def _format_member(row):
    return {
        "id": str(row["id"]),
        "userId": str(row["user_id"]),
        "email": row["email"],
        "name": row["username"],
        "role": row["role"],
        "joinedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["joined_at"])),
        "lastActive": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["last_active"] or row["joined_at"])
        ),
    }


def _format_activity(row):
    return {
        "id": str(row["id"]),
        "type": row["type"],
        "userId": str(row["user_id"]),
        "userName": row["username"],
        "description": row["description"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["created_at"])),
        "metadata": json.loads(row["metadata"] or "{}"),
    }


def _format_shared_credential(row, name: str):
    return {
        "id": str(row["id"]),
        "name": name,
        "platform": row["platform"],
        "sharedBy": str(row["shared_by"]),
        "sharedByName": row["shared_by_name"],
        "sharedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["shared_at"])),
        "accessLevel": row["access_level"],
        "lastUsed": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(row["last_used"] or row["shared_at"])
        ),
    }


def _create_activity(workspace_id: int, user_id: int, activity_type: str, description: str, metadata=None):
    metadata = metadata or {}
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO workspace_activity (workspace_id, type, user_id, description, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (workspace_id, activity_type, user_id, description, json.dumps(metadata), int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()


def _get_or_init_workspace_state(user_id: int, username: str | None) -> int:
    _ensure_tables()
    personal_workspace_id = ensure_personal_workspace(
        current_app.config["DB_PATH"], user_id, username
    )

    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT current_workspace_id FROM user_workspace_state WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["current_workspace_id"]

        cursor.execute(
            """
            INSERT INTO user_workspace_state (user_id, current_workspace_id, updated_at)
            VALUES (?, ?, ?)
            """,
            (user_id, personal_workspace_id, int(time.time())),
        )
        conn.commit()
        return personal_workspace_id
    finally:
        conn.close()


@workspaces_bp.route("/current", methods=["GET"])
@require_auth
def get_current_workspace():
    _ensure_tables()
    current_workspace_id = _get_or_init_workspace_state(g.user.id, g.user.username)

    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT w.*, COUNT(m.id) as member_count
            FROM workspaces w
            INNER JOIN workspace_members m ON m.workspace_id = w.id
            WHERE w.id = ?
            GROUP BY w.id
            """,
            (current_workspace_id,),
        )
        current_row = cursor.fetchone()
        if not current_row:
            return api_error("NOT_FOUND", "Workspace not found", status=404)

        cursor.execute(
            """
            SELECT w.*, COUNT(m2.id) as member_count
            FROM workspaces w
            INNER JOIN workspace_members m2 ON m2.workspace_id = w.id
            WHERE w.id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = ?
            )
            GROUP BY w.id
            ORDER BY w.created_at ASC
            """,
            (g.user.id,),
        )
        workspaces = [
            _format_workspace(row, row["member_count"]) for row in cursor.fetchall()
        ]
    finally:
        conn.close()

    return api_response(
        {
            "workspace": _format_workspace(current_row, current_row["member_count"]),
            "workspaces": workspaces,
        }
    )


@workspaces_bp.route("", methods=["POST"])
@require_auth
def create_workspace():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    workspace_type = data.get("type")

    if not name or workspace_type not in {"personal", "team"}:
        return api_error("INVALID_REQUEST", "name and type are required", status=400)

    _ensure_tables()
    now = int(time.time())
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO workspaces (name, type, owner_user_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, workspace_type, g.user.id, now, now),
        )
        workspace_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO workspace_members (workspace_id, user_id, role, joined_at, last_active)
            VALUES (?, ?, 'admin', ?, ?)
            """,
            (workspace_id, g.user.id, now, now),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        workspace_id,
        g.user.id,
        "member_invited",
        f"Created workspace {name}",
        {"workspaceName": name},
    )

    return api_response(
        {
            "workspace": {
                "id": str(workspace_id),
                "name": name,
                "type": workspace_type,
                "ownerId": str(g.user.id),
                "memberCount": 1,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
            }
        },
        status=201,
    )


@workspaces_bp.route("/<workspace_id>/switch", methods=["POST"])
@require_auth
def switch_workspace(workspace_id: str):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT w.id
            FROM workspaces w
            INNER JOIN workspace_members m ON m.workspace_id = w.id
            WHERE w.id = ? AND m.user_id = ?
            """,
            (workspace_id, g.user.id),
        )
        if not cursor.fetchone():
            return api_error("NOT_FOUND", "Workspace not found", status=404)

        cursor.execute(
            """
            INSERT OR REPLACE INTO user_workspace_state (user_id, current_workspace_id, updated_at)
            VALUES (?, ?, ?)
            """,
            (g.user.id, workspace_id, int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/members", methods=["GET"])
@require_auth
def list_members(workspace_id: str):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT m.id, m.user_id, m.role, m.joined_at, m.last_active, u.email, u.username
            FROM workspace_members m
            INNER JOIN users u ON u.id = m.user_id
            WHERE m.workspace_id = ?
            ORDER BY m.joined_at ASC
            """,
            (workspace_id,),
        )
        members = [_format_member(row) for row in cursor.fetchall()]
    finally:
        conn.close()
    return api_response({"members": members})


@workspaces_bp.route("/<workspace_id>/members/invite", methods=["POST"])
@require_auth
def invite_member(workspace_id: str):
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    role = data.get("role", "viewer")
    if not email:
        return api_error("INVALID_REQUEST", "email is required", status=400)
    if role not in {"admin", "editor", "viewer"}:
        return api_error("INVALID_REQUEST", "invalid role", status=400)

    manager = UserManager(current_app.config["DB_PATH"])
    user = manager.get_user_by_username(email.split("@")[0])
    if not user:
        conn = _get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if row:
                user = manager.get_user_by_id(row["id"])
        finally:
            conn.close()

    if not user:
        return api_error("NOT_FOUND", "User not found", status=404)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, joined_at, last_active)
            VALUES (?, ?, ?, ?, ?)
            """,
            (workspace_id, user.id, role, int(time.time()), int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        int(workspace_id),
        g.user.id,
        "member_invited",
        f"Invited {user.email} as {role}",
        {"invitedEmail": user.email, "role": role},
    )

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/members/<member_id>", methods=["DELETE"])
@require_auth
def remove_member(workspace_id: str, member_id: str):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM workspace_members WHERE workspace_id = ? AND id = ?",
            (workspace_id, member_id),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        int(workspace_id),
        g.user.id,
        "member_removed",
        "Removed a workspace member",
        {"memberId": member_id},
    )

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/members/<member_id>/role", methods=["PATCH"])
@require_auth
def update_member_role(workspace_id: str, member_id: str):
    data = request.get_json(silent=True) or {}
    role = data.get("role")
    if role not in {"admin", "editor", "viewer"}:
        return api_error("INVALID_REQUEST", "invalid role", status=400)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND id = ?",
            (role, workspace_id, member_id),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        int(workspace_id),
        g.user.id,
        "member_role_changed",
        f"Updated member role to {role}",
        {"memberId": member_id, "role": role},
    )

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/activity", methods=["GET"])
@require_auth
def list_activity(workspace_id: str):
    _ensure_tables()
    cursor_param = request.args.get("cursor")
    activity_type = request.args.get("type")
    limit = int(request.args.get("limit", 20))

    query = """
        SELECT a.*, u.username
        FROM workspace_activity a
        INNER JOIN users u ON u.id = a.user_id
        WHERE a.workspace_id = ?
    """
    params = [workspace_id]
    if activity_type:
        query += " AND a.type = ?"
        params.append(activity_type)
    if cursor_param:
        query += " AND a.id < ?"
        params.append(cursor_param)
    query += " ORDER BY a.id DESC LIMIT ?"
    params.append(limit + 1)

    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
    finally:
        conn.close()

    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = str(rows[-1]["id"]) if rows else None

    return api_response(
        {
            "activities": [_format_activity(row) for row in rows],
            "hasMore": has_more,
            "nextCursor": next_cursor,
        }
    )


@workspaces_bp.route("/<workspace_id>/shared-credentials", methods=["GET"])
@require_auth
def list_shared_credentials(workspace_id: str):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT sc.id,
                   sc.access_level,
                   sc.shared_by,
                   sc.shared_at,
                   sc.last_used,
                   uc.platform,
                   uc.credential_type,
                   u.username as shared_by_name
            FROM workspace_shared_credentials sc
            INNER JOIN user_credentials uc ON uc.id = sc.credential_id
            INNER JOIN users u ON u.id = sc.shared_by
            WHERE sc.workspace_id = ?
            ORDER BY sc.shared_at DESC
            """,
            (workspace_id,),
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    credentials = []
    for row in rows:
        name = f"{row['platform']} ({row['credential_type']})"
        credentials.append(_format_shared_credential(row, name))

    return api_response({"credentials": credentials})


@workspaces_bp.route("/<workspace_id>/shared-credentials", methods=["POST"])
@require_auth
def share_credential(workspace_id: str):
    data = request.get_json(silent=True) or {}
    credential_id = data.get("credential_id")
    access_level = data.get("access_level", "read_only")
    if not credential_id:
        return api_error("INVALID_REQUEST", "credential_id is required", status=400)
    if access_level not in {"full", "read_only"}:
        return api_error("INVALID_REQUEST", "invalid access level", status=400)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO workspace_shared_credentials
            (workspace_id, credential_id, shared_by, access_level, shared_at, last_used)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                workspace_id,
                credential_id,
                g.user.id,
                access_level,
                int(time.time()),
                int(time.time()),
            ),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        int(workspace_id),
        g.user.id,
        "credential_added",
        "Shared a credential",
        {"credentialId": credential_id, "accessLevel": access_level},
    )

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/shared-credentials/<credential_id>", methods=["DELETE"])
@require_auth
def revoke_credential(workspace_id: str, credential_id: str):
    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM workspace_shared_credentials
            WHERE workspace_id = ? AND id = ?
            """,
            (workspace_id, credential_id),
        )
        conn.commit()
    finally:
        conn.close()

    _create_activity(
        int(workspace_id),
        g.user.id,
        "credential_removed",
        "Revoked a shared credential",
        {"credentialId": credential_id},
    )

    return api_response({"success": True})


@workspaces_bp.route("/<workspace_id>/shared-credentials/<credential_id>", methods=["PATCH"])
@require_auth
def update_access_level(workspace_id: str, credential_id: str):
    data = request.get_json(silent=True) or {}
    access_level = data.get("access_level")
    if access_level not in {"full", "read_only"}:
        return api_error("INVALID_REQUEST", "invalid access level", status=400)

    _ensure_tables()
    conn = _get_conn()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE workspace_shared_credentials
            SET access_level = ?
            WHERE workspace_id = ? AND id = ?
            """,
            (access_level, workspace_id, credential_id),
        )
        conn.commit()
    finally:
        conn.close()

    return api_response({"success": True})
