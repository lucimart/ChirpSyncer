"""
Integration Tests for Admin API v1 Endpoints

Tests the JSON API layer for admin user management.
Follows TDD methodology - tests written first.
"""

import json


class TestAdminUsersAPI:
    """Tests for /api/v1/admin/users/* endpoints."""

    def _get_auth_token(self, test_client, user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps(
                {"username": user["username"], "password": user["password"]}
            ),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_users_requires_auth(self, test_client, test_db):
        """GET /api/v1/admin/users requires auth."""
        response = test_client.get("/api/v1/admin/users")
        assert response.status_code == 401

    def test_list_users_requires_admin(self, test_client, test_db, test_user):
        """GET /api/v1/admin/users requires admin role."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "FORBIDDEN"

    def test_list_users_as_admin(self, test_client, test_db, test_admin_user):
        """GET /api/v1/admin/users returns user list for admin."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # Response is now an object with users list and pagination metadata
        assert isinstance(data["data"], dict)
        assert "users" in data["data"]
        assert isinstance(data["data"]["users"], list)
        # Should include at least the admin user
        assert len(data["data"]["users"]) >= 1
        # Check user structure
        user = data["data"]["users"][0]
        assert "id" in user
        assert "username" in user
        assert "email" in user
        assert "is_active" in user
        assert "is_admin" in user
        # Password should NOT be included
        assert "password" not in user
        assert "password_hash" not in user

    def test_get_user_requires_admin(self, test_client, test_db, test_user):
        """GET /api/v1/admin/users/:id requires admin role."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    def test_get_user_as_admin(self, test_client, test_db, test_admin_user, test_user):
        """GET /api/v1/admin/users/:id returns user details for admin."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.get(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["id"] == str(test_user["id"])
        assert data["data"]["username"] == test_user["username"]

    def test_get_user_not_found(self, test_client, test_db, test_admin_user):
        """GET /api/v1/admin/users/:id returns 404 for non-existent user."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.get(
            "/api/v1/admin/users/99999",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_update_user_as_admin(
        self, test_client, test_db, test_admin_user, test_user
    ):
        """PUT /api/v1/admin/users/:id updates user."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.put(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({"email": "updated@example.com"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["email"] == "updated@example.com"

    def test_update_user_requires_admin(self, test_client, test_db, test_user):
        """PUT /api/v1/admin/users/:id requires admin."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.put(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({"email": "hacker@example.com"}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_delete_user_as_admin(
        self, test_client, test_db, test_admin_user, test_user
    ):
        """DELETE /api/v1/admin/users/:id deletes user."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.delete(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True

        # Verify user is deleted
        get_response = test_client.get(
            f"/api/v1/admin/users/{test_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404

    def test_delete_self_forbidden(self, test_client, test_db, test_admin_user):
        """DELETE /api/v1/admin/users/:id cannot delete self."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.delete(
            f"/api/v1/admin/users/{test_admin_user['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    def test_toggle_user_active(self, test_client, test_db, test_admin_user, test_user):
        """POST /api/v1/admin/users/:id/toggle-active toggles user status."""
        token = self._get_auth_token(test_client, test_admin_user)

        # Deactivate user
        response = test_client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-active",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["is_active"] is False

        # Reactivate user
        response = test_client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-active",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["is_active"] is True

    def test_toggle_user_admin(self, test_client, test_db, test_admin_user, test_user):
        """POST /api/v1/admin/users/:id/toggle-admin toggles admin status."""
        token = self._get_auth_token(test_client, test_admin_user)

        # Make user admin
        response = test_client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-admin",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["is_admin"] is True

        # Remove admin
        response = test_client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-admin",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["is_admin"] is False

    def test_toggle_self_admin_forbidden(self, test_client, test_db, test_admin_user):
        """POST /api/v1/admin/users/:id/toggle-admin cannot toggle own admin."""
        token = self._get_auth_token(test_client, test_admin_user)
        response = test_client.post(
            f"/api/v1/admin/users/{test_admin_user['id']}/toggle-admin",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    def test_list_users_with_search(
        self, test_client, test_db, test_admin_user, test_user
    ):
        """GET /api/v1/admin/users?search=term filters users."""
        token = self._get_auth_token(test_client, test_admin_user)

        # Search by username
        response = test_client.get(
            f"/api/v1/admin/users?search={test_user['username']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # Should find at least the test user
        found = any(
            u["username"] == test_user["username"] for u in data["data"]["users"]
        )
        assert found is True

    def test_list_users_pagination(self, test_client, test_db, test_admin_user):
        """GET /api/v1/admin/users supports pagination."""
        token = self._get_auth_token(test_client, test_admin_user)

        response = test_client.get(
            "/api/v1/admin/users?page=1&limit=10",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], dict)
        assert "users" in data["data"]
        assert isinstance(data["data"]["users"], list)
        # Verify pagination metadata
        assert "total" in data["data"]
        assert "page" in data["data"]
        assert "limit" in data["data"]
