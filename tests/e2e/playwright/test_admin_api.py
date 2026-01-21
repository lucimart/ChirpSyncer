"""
Admin Users API E2E Tests

Tests the admin user management endpoints with Flask test client.
Covers user listing, CRUD operations, and admin/active toggles.
"""

import json

import pytest

pytestmark = pytest.mark.e2e


class TestAdminApiE2E:
    """E2E tests for admin API endpoints."""

    @pytest.fixture
    def client(self, flask_app):
        """Create test client from flask app."""
        return flask_app.test_client()

    def _login(self, client, user):
        """Helper to login and get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": user["username"], "password": user["password"]}),
            content_type="application/json",
        )
        data = response.get_json()
        return data["data"]["token"]

    def _auth_headers(self, token):
        """Helper to create auth headers."""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # =========================================================================
    # Authorization Tests
    # =========================================================================

    def test_admin_endpoints_require_auth(self, client, test_db):
        """Admin endpoints require authentication."""
        endpoints = [
            ("GET", "/api/v1/admin/users"),
            ("GET", "/api/v1/admin/users/1"),
            ("PUT", "/api/v1/admin/users/1"),
            ("DELETE", "/api/v1/admin/users/1"),
            ("POST", "/api/v1/admin/users/1/toggle-active"),
            ("POST", "/api/v1/admin/users/1/toggle-admin"),
        ]
        for method, endpoint in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "PUT":
                response = client.put(endpoint, data=json.dumps({}), content_type="application/json")
            elif method == "DELETE":
                response = client.delete(endpoint)
            elif method == "POST":
                response = client.post(endpoint)
            assert response.status_code == 401, f"{method} {endpoint} should require auth"

    def test_admin_endpoints_require_admin_role(self, client, test_db, test_user):
        """Admin endpoints require admin privileges."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        response = client.get("/api/v1/admin/users", headers=headers)
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"]["code"] == "FORBIDDEN"

    # =========================================================================
    # List Users
    # =========================================================================

    def test_list_users_as_admin(self, client, test_db, test_admin_user, test_user):
        """GET /api/v1/admin/users returns user list for admin."""
        token = self._login(client, test_admin_user)
        response = client.get(
            "/api/v1/admin/users",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        # Should include both admin and regular user
        assert len(data["data"]) >= 2

    def test_list_users_structure(self, client, test_db, test_admin_user):
        """User objects have expected structure."""
        token = self._login(client, test_admin_user)
        response = client.get(
            "/api/v1/admin/users",
            headers=self._auth_headers(token),
        )
        user = response.get_json()["data"][0]

        # Required fields
        assert "id" in user
        assert "username" in user
        assert "email" in user
        assert "is_active" in user
        assert "is_admin" in user
        assert "created_at" in user
        assert "last_login" in user

        # Security: No password fields
        assert "password" not in user
        assert "password_hash" not in user

    def test_list_users_search(self, client, test_db, test_admin_user, test_user):
        """GET /api/v1/admin/users?search=term filters users."""
        token = self._login(client, test_admin_user)

        # Search by username
        response = client.get(
            f"/api/v1/admin/users?search={test_user['username']}",
            headers=self._auth_headers(token),
        )
        data = response.get_json()
        assert any(u["username"] == test_user["username"] for u in data["data"])

        # Search should be case insensitive
        response = client.get(
            f"/api/v1/admin/users?search={test_user['username'].upper()}",
            headers=self._auth_headers(token),
        )
        data = response.get_json()
        assert any(u["username"] == test_user["username"] for u in data["data"])

    def test_list_users_pagination(self, client, test_db, test_admin_user):
        """GET /api/v1/admin/users supports pagination params."""
        token = self._login(client, test_admin_user)

        response = client.get(
            "/api/v1/admin/users?page=1&limit=10",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) <= 10

    # =========================================================================
    # Get Single User
    # =========================================================================

    def test_get_user_by_id(self, client, test_db, test_admin_user, test_user):
        """GET /api/v1/admin/users/:id returns user details."""
        token = self._login(client, test_admin_user)
        response = client.get(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["username"] == test_user["username"]
        assert data["data"]["email"] == test_user["email"]

    def test_get_user_not_found(self, client, test_db, test_admin_user):
        """GET /api/v1/admin/users/:id returns 404 for non-existent user."""
        token = self._login(client, test_admin_user)
        response = client.get(
            "/api/v1/admin/users/99999",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 404

    # =========================================================================
    # Update User
    # =========================================================================

    def test_update_user_email(self, client, test_db, test_admin_user, test_user):
        """PUT /api/v1/admin/users/:id updates user email."""
        token = self._login(client, test_admin_user)
        response = client.put(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
            data=json.dumps({"email": "updated@example.com"}),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["email"] == "updated@example.com"

    def test_update_user_status(self, client, test_db, test_admin_user, test_user):
        """PUT /api/v1/admin/users/:id updates active and admin status."""
        token = self._login(client, test_admin_user)

        # Deactivate user
        response = client.put(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
            data=json.dumps({"is_active": False}),
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_active"] is False

        # Make admin
        response = client.put(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
            data=json.dumps({"is_admin": True}),
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_admin"] is True

    # =========================================================================
    # Delete User
    # =========================================================================

    def test_delete_user(self, client, test_db, test_admin_user, test_user):
        """DELETE /api/v1/admin/users/:id deletes user."""
        token = self._login(client, test_admin_user)
        response = client.delete(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200

        # Verify user is deleted
        get_response = client.get(
            f"/api/v1/admin/users/{test_user['id']}",
            headers=self._auth_headers(token),
        )
        assert get_response.status_code == 404

    def test_delete_self_forbidden(self, client, test_db, test_admin_user):
        """DELETE /api/v1/admin/users/:id cannot delete own account."""
        token = self._login(client, test_admin_user)
        response = client.delete(
            f"/api/v1/admin/users/{test_admin_user['id']}",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    # =========================================================================
    # Toggle Active Status
    # =========================================================================

    def test_toggle_user_active(self, client, test_db, test_admin_user, test_user):
        """POST /api/v1/admin/users/:id/toggle-active toggles status."""
        token = self._login(client, test_admin_user)
        headers = self._auth_headers(token)

        # First toggle - should deactivate (user starts as active)
        response = client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-active",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_active"] is False

        # Second toggle - should reactivate
        response = client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-active",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_active"] is True

    # =========================================================================
    # Toggle Admin Status
    # =========================================================================

    def test_toggle_user_admin(self, client, test_db, test_admin_user, test_user):
        """POST /api/v1/admin/users/:id/toggle-admin toggles admin status."""
        token = self._login(client, test_admin_user)
        headers = self._auth_headers(token)

        # First toggle - should promote (user starts as non-admin)
        response = client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-admin",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_admin"] is True

        # Second toggle - should demote
        response = client.post(
            f"/api/v1/admin/users/{test_user['id']}/toggle-admin",
            headers=headers,
        )
        assert response.status_code == 200
        assert response.get_json()["data"]["is_admin"] is False

    def test_toggle_self_admin_forbidden(self, client, test_db, test_admin_user):
        """POST /api/v1/admin/users/:id/toggle-admin cannot toggle own admin status."""
        token = self._login(client, test_admin_user)
        response = client.post(
            f"/api/v1/admin/users/{test_admin_user['id']}/toggle-admin",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    # =========================================================================
    # User Journey: Complete Admin Workflow
    # =========================================================================

    def test_admin_user_management_workflow(self, client, test_db, test_admin_user, test_user):
        """
        Complete admin workflow:
        1. List users
        2. Get user details
        3. Deactivate user
        4. Promote to admin
        5. Demote from admin
        6. Reactivate user
        7. Delete user
        """
        token = self._login(client, test_admin_user)
        headers = self._auth_headers(token)
        user_id = test_user["id"]

        # 1. List users
        response = client.get("/api/v1/admin/users", headers=headers)
        assert response.status_code == 200
        assert len(response.get_json()["data"]) >= 2

        # 2. Get user details
        response = client.get(f"/api/v1/admin/users/{user_id}", headers=headers)
        assert response.status_code == 200
        user_data = response.get_json()["data"]
        assert user_data["is_active"] is True
        assert user_data["is_admin"] is False

        # 3. Deactivate user
        response = client.post(f"/api/v1/admin/users/{user_id}/toggle-active", headers=headers)
        assert response.get_json()["data"]["is_active"] is False

        # 4. Promote to admin
        response = client.post(f"/api/v1/admin/users/{user_id}/toggle-admin", headers=headers)
        assert response.get_json()["data"]["is_admin"] is True

        # 5. Demote from admin
        response = client.post(f"/api/v1/admin/users/{user_id}/toggle-admin", headers=headers)
        assert response.get_json()["data"]["is_admin"] is False

        # 6. Reactivate user
        response = client.post(f"/api/v1/admin/users/{user_id}/toggle-active", headers=headers)
        assert response.get_json()["data"]["is_active"] is True

        # 7. Delete user
        response = client.delete(f"/api/v1/admin/users/{user_id}", headers=headers)
        assert response.status_code == 200

        # Verify deleted
        response = client.get(f"/api/v1/admin/users/{user_id}", headers=headers)
        assert response.status_code == 404
