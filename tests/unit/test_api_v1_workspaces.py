import sqlite3
import time

from app.auth.credential_manager import CredentialManager
from app.auth.user_manager import UserManager
from app.models.workspace import init_workspace_db


def _init_db(app):
    init_workspace_db(app.config["DB_PATH"])
    manager = CredentialManager(app.config["MASTER_KEY"], app.config["DB_PATH"])
    manager.init_db()


def _create_workspace(client, auth_headers, name="Team Space", workspace_type="team"):
    response = client.post(
        "/api/v1/workspaces",
        headers=auth_headers,
        json={"name": name, "type": workspace_type},
    )
    assert response.status_code == 201
    return response.json["data"]["workspace"]["id"]


def _insert_credential(db_path, user_id):
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(
            """
            INSERT INTO user_credentials
                (user_id, platform, credential_type, encrypted_data, encryption_iv, encryption_tag,
                 created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                "twitter",
                "api",
                b"secret",
                b"iv",
                b"tag",
                now,
                now,
            ),
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def test_current_workspace_bootstraps(client, auth_headers):
    response = client.get("/api/v1/workspaces/current", headers=auth_headers)
    assert response.status_code == 200
    data = response.json["data"]
    assert data["workspace"]["type"] == "personal"
    assert len(data["workspaces"]) >= 1


def test_create_workspace_validation(client, auth_headers):
    response = client.post("/api/v1/workspaces", headers=auth_headers, json={})
    assert response.status_code == 400


def test_create_and_switch_workspace(client, auth_headers):
    workspace_id = _create_workspace(client, auth_headers)
    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/switch",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json["data"]["success"] is True


def test_members_and_invites(client, auth_headers, app, test_user):
    manager = UserManager(app.config["DB_PATH"])
    manager.init_db()
    invited_id = manager.create_user(
        "invited",
        "invited@example.com",
        "TestPassword123!",
        is_admin=False,
    )
    workspace_id = _create_workspace(client, auth_headers)

    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/members/invite",
        headers=auth_headers,
        json={"email": "invited@example.com", "role": "editor"},
    )
    assert response.status_code == 200
    assert response.json["data"]["success"] is True

    response = client.get(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=auth_headers,
    )
    assert response.status_code == 200
    members = response.json["data"]["members"]
    assert len(members) == 2
    assert any(member["userId"] == str(invited_id) for member in members)

    invalid_role = client.post(
        f"/api/v1/workspaces/{workspace_id}/members/invite",
        headers=auth_headers,
        json={"email": "invited@example.com", "role": "owner"},
    )
    assert invalid_role.status_code == 400


def test_remove_member_and_role_update(client, auth_headers, app):
    manager = UserManager(app.config["DB_PATH"])
    manager.init_db()
    manager.create_user(
        "member",
        "member@example.com",
        "TestPassword123!",
        is_admin=False,
    )
    workspace_id = _create_workspace(client, auth_headers)
    client.post(
        f"/api/v1/workspaces/{workspace_id}/members/invite",
        headers=auth_headers,
        json={"email": "member@example.com", "role": "viewer"},
    )

    members = client.get(
        f"/api/v1/workspaces/{workspace_id}/members",
        headers=auth_headers,
    ).json["data"]["members"]
    invited = next(member for member in members if member["email"] == "member@example.com")

    invalid_role = client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{invited['id']}/role",
        headers=auth_headers,
        json={"role": "owner"},
    )
    assert invalid_role.status_code == 400

    response = client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{invited['id']}/role",
        headers=auth_headers,
        json={"role": "editor"},
    )
    assert response.status_code == 200

    response = client.delete(
        f"/api/v1/workspaces/{workspace_id}/members/{invited['id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200


def test_activity_and_shared_credentials(client, auth_headers, app, test_user):
    _init_db(app)
    workspace_id = _create_workspace(client, auth_headers)
    manager = UserManager(app.config["DB_PATH"])
    manager.init_db()
    manager.create_user(
        "activity",
        "activity@example.com",
        "TestPassword123!",
        is_admin=False,
    )
    client.post(
        f"/api/v1/workspaces/{workspace_id}/members/invite",
        headers=auth_headers,
        json={"email": "activity@example.com", "role": "viewer"},
    )

    response = client.get(
        f"/api/v1/workspaces/{workspace_id}/activity",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json["data"]["hasMore"] is False
    assert len(response.json["data"]["activities"]) >= 1

    credentials = client.get(
        f"/api/v1/workspaces/{workspace_id}/shared-credentials",
        headers=auth_headers,
    )
    assert credentials.status_code == 200
    assert credentials.json["data"]["credentials"] == []

    invalid_share = client.post(
        f"/api/v1/workspaces/{workspace_id}/shared-credentials",
        headers=auth_headers,
        json={"credential_id": 1, "access_level": "owner"},
    )
    assert invalid_share.status_code == 400

    credential_id = _insert_credential(app.config["DB_PATH"], test_user["id"])
    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/shared-credentials",
        headers=auth_headers,
        json={"credential_id": credential_id, "access_level": "read_only"},
    )
    assert response.status_code == 200

    invalid_update = client.patch(
        f"/api/v1/workspaces/{workspace_id}/shared-credentials/{credential_id}",
        headers=auth_headers,
        json={"access_level": "owner"},
    )
    assert invalid_update.status_code == 400
