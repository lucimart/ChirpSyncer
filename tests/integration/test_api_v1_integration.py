"""
Integration Tests for API v1 Endpoints (Sprint I1-I2)

Tests the JSON API layer that the Next.js frontend consumes.
Follows TDD methodology from docs/sprints/INTEGRATION_SPRINTS.md.
"""

import json


class TestAuthAPI:
    """Tests for /api/v1/auth/* endpoints."""

    def test_login_success(self, test_client, test_db, test_user):
        """US-I1-001: POST /api/v1/auth/login returns token and user."""
        response = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "token" in data["data"]
        assert "user" in data["data"]
        assert data["data"]["user"]["username"] == test_user["username"]

    def test_login_invalid_credentials(self, test_client, test_db, test_user):
        """US-I1-001: Invalid credentials return 401."""
        response = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": "wrongpassword"}),
            content_type="application/json",
        )
        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_login_missing_fields(self, test_client, test_db):
        """US-I1-001: Missing username/password returns 400."""
        response = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": "user"}),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_REQUEST"

    def test_login_with_cookie(self, test_client, test_db, test_user):
        """US-I1-001: Login with use_cookie sets HttpOnly cookie."""
        response = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({
                "username": test_user["username"],
                "password": test_user["password"],
                "use_cookie": True,
            }),
            content_type="application/json",
        )
        assert response.status_code == 200
        assert "auth_token" in response.headers.get("Set-Cookie", "")

    def test_register_success(self, test_client, test_db):
        """US-I1-001: POST /api/v1/auth/register creates user."""
        response = test_client.post(
            "/api/v1/auth/register",
            data=json.dumps({
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "SecurePass123!",
            }),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert "token" in data["data"]
        assert data["data"]["user"]["username"] == "newuser"

    def test_register_duplicate_username(self, test_client, test_db, test_user):
        """US-I1-001: Duplicate username returns error."""
        response = test_client.post(
            "/api/v1/auth/register",
            data=json.dumps({
                "username": test_user["username"],
                "email": "different@example.com",
                "password": "SecurePass123!",
            }),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "REGISTRATION_FAILED"

    def test_register_missing_fields(self, test_client, test_db):
        """US-I1-001: Missing fields returns 400."""
        response = test_client.post(
            "/api/v1/auth/register",
            data=json.dumps({"username": "user"}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_me_requires_auth(self, test_client, test_db):
        """US-I1-001: GET /api/v1/auth/me requires valid token."""
        response = test_client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_returns_user(self, test_client, test_db, test_user):
        """US-I1-001: GET /api/v1/auth/me returns current user."""
        # First login to get token
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        token = login_resp.get_json()["data"]["token"]

        # Then call /me with token
        response = test_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["username"] == test_user["username"]

    def test_logout_clears_cookie(self, test_client, test_db, test_user):
        """US-I1-001: POST /api/v1/auth/logout clears cookie."""
        # Login first
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        token = login_resp.get_json()["data"]["token"]

        # Logout
        response = test_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert "auth_token=" in response.headers.get("Set-Cookie", "")


class TestDashboardAPI:
    """Tests for /api/v1/dashboard/* endpoints."""

    def test_stats_requires_auth(self, test_client, test_db):
        """US-I1-002: GET /api/v1/dashboard/stats requires auth."""
        response = test_client.get("/api/v1/dashboard/stats")
        assert response.status_code == 401

    def test_stats_returns_expected_fields(self, test_client, test_db, test_user):
        """US-I1-002: GET /api/v1/dashboard/stats returns aggregated stats."""
        # Login first
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        token = login_resp.get_json()["data"]["token"]

        response = test_client.get(
            "/api/v1/dashboard/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        stats = data["data"]
        assert "synced_today" in stats
        assert "synced_week" in stats
        assert "total_synced" in stats
        assert "platforms_connected" in stats


class TestCredentialsAPI:
    """Tests for /api/v1/credentials/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_credentials_requires_auth(self, test_client, test_db):
        """US-I2-001: GET /api/v1/credentials requires auth."""
        response = test_client.get("/api/v1/credentials")
        assert response.status_code == 401

    def test_list_credentials_empty(self, test_client, test_db, test_user):
        """US-I2-001: GET /api/v1/credentials returns empty list."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/credentials",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    def test_create_credential_missing_fields(self, test_client, test_db, test_user):
        """US-I2-001: POST /api/v1/credentials requires platform and type."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.post(
            "/api/v1/credentials",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({"platform": "twitter"}),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False


class TestSyncAPI:
    """Tests for /api/v1/sync/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_sync_stats_requires_auth(self, test_client, test_db):
        """US-I2-002: GET /api/v1/sync/stats requires auth."""
        response = test_client.get("/api/v1/sync/stats")
        assert response.status_code == 401

    def test_sync_stats_returns_data(self, test_client, test_db, test_user):
        """US-I2-002: GET /api/v1/sync/stats returns sync statistics."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/sync/stats",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        stats = data["data"]
        assert "today" in stats
        assert "week" in stats
        assert "total" in stats

    def test_sync_history_requires_auth(self, test_client, test_db):
        """US-I2-002: GET /api/v1/sync/history requires auth."""
        response = test_client.get("/api/v1/sync/history")
        assert response.status_code == 401

    def test_sync_history_returns_paginated(self, test_client, test_db, test_user):
        """US-I2-002: GET /api/v1/sync/history returns paginated history."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/sync/history",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        history = data["data"]
        assert "items" in history
        assert "total" in history
        assert "page" in history


class TestCleanupAPI:
    """Tests for /api/v1/cleanup/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_rules_requires_auth(self, test_client, test_db):
        """US-I2-003: GET /api/v1/cleanup/rules requires auth."""
        response = test_client.get("/api/v1/cleanup/rules")
        assert response.status_code == 401

    def test_list_rules_empty(self, test_client, test_db, test_user):
        """US-I2-003: GET /api/v1/cleanup/rules returns empty list."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/cleanup/rules",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    def test_create_rule(self, test_client, test_db, test_user):
        """US-I2-003: POST /api/v1/cleanup/rules creates rule."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.post(
            "/api/v1/cleanup/rules",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "name": "Old tweets",
                "type": "age",
                "config": {"days": 365},
                "enabled": True,
            }),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["name"] == "Old tweets"


class TestBookmarksAPI:
    """Tests for /api/v1/bookmarks/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_bookmarks_requires_auth(self, test_client, test_db):
        """US-I2-004: GET /api/v1/bookmarks requires auth."""
        response = test_client.get("/api/v1/bookmarks")
        assert response.status_code == 401

    def test_list_bookmarks_empty(self, test_client, test_db, test_user):
        """US-I2-004: GET /api/v1/bookmarks returns list."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/bookmarks",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True


class TestAnalyticsAPI:
    """Tests for /api/v1/analytics/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_overview_requires_auth(self, test_client, test_db):
        """US-I2-005: GET /api/v1/analytics/overview requires auth."""
        response = test_client.get("/api/v1/analytics/overview")
        assert response.status_code == 401

    def test_overview_returns_data(self, test_client, test_db, test_user):
        """US-I2-005: GET /api/v1/analytics/overview returns metrics."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/analytics/overview",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True


class TestFeedAPI:
    """Tests for /api/v1/feed/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_rules_requires_auth(self, test_client, test_db):
        """US-I3-002: GET /api/v1/feed-rules requires auth."""
        response = test_client.get("/api/v1/feed-rules")
        assert response.status_code == 401

    def test_list_rules_empty(self, test_client, test_db, test_user):
        """US-I3-002: GET /api/v1/feed-rules returns list."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/feed-rules",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    def test_create_rule(self, test_client, test_db, test_user):
        """US-I3-002: POST /api/v1/feed-rules creates rule."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.post(
            "/api/v1/feed-rules",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "name": "Boost verified",
                "type": "boost",
                "conditions": [{"field": "author.verified", "operator": "equals", "value": True}],
                "weight": 15,
            }),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["name"] == "Boost verified"


class TestWorkspacesAPI:
    """Tests for /api/v1/workspaces/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_current_workspace_requires_auth(self, test_client, test_db):
        """US-I4-001: GET /api/v1/workspaces/current requires auth."""
        response = test_client.get("/api/v1/workspaces/current")
        assert response.status_code == 401

    def test_current_workspace_returns_data(self, test_client, test_db, test_user):
        """US-I4-001: GET /api/v1/workspaces/current returns workspace info."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/workspaces/current",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # API returns workspace and workspaces keys
        assert "workspace" in data["data"]
        assert "workspaces" in data["data"]

    def test_create_workspace(self, test_client, test_db, test_user):
        """US-I4-001: POST /api/v1/workspaces creates team workspace."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.post(
            "/api/v1/workspaces",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "name": "My Team Workspace",
                "type": "team",
            }),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["workspace"]["name"] == "My Team Workspace"


class TestAPIErrorHandling:
    """Tests for US-I1-003: API Error Standardization."""

    def test_error_response_format(self, test_client, test_db):
        """US-I1-003: All errors return {success: false, error: {code, message}}."""
        response = test_client.get("/api/v1/nonexistent")
        assert response.status_code == 404
        data = response.get_json()
        assert data["success"] is False
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]

    def test_correlation_id_in_response(self, test_client, test_db, test_user):
        """US-I1-003: Correlation ID in all responses."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        data = login_resp.get_json()
        # correlation_id should be present (may be None if not set by middleware)
        assert "correlation_id" in data
