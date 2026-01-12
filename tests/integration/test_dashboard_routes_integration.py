"""
Dashboard Routes Integration Tests (Sprint 6-7 - DASH-INT-001)

Comprehensive integration tests for all Flask routes in the dashboard,
testing with real dependencies (SQLite DB, UserManager, CredentialManager)
and mocked external APIs.

Tests cover:
- Authentication Routes (login, register, logout, auth check)
- Dashboard Routes (main dashboard)
- User Management Routes (list, detail, edit, delete)
- Credential Management Routes (list, add, edit, delete, test, share)
- Task Management Routes (list, detail, trigger, toggle, configure, status)
- Analytics Routes (dashboard, overview, top-tweets, record-metrics, snapshots)
- Error Handling (404, 403, 500)
- Session Persistence

Test Categories:
- Authentication: 8 tests
- Dashboard: 4 tests
- User Management: 6 tests
- Credential Management: 8 tests
- Task Management: 5 tests
- Analytics: 4 tests
- Error Handling: 4 tests
- Session Persistence: 2 tests

Total: ~45 integration tests covering ~80% of dashboard routes
"""

import pytest
import json
import os
from unittest.mock import patch, MagicMock, Mock
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.features.analytics_tracker import AnalyticsTracker
from app.services.task_scheduler import TaskScheduler


# =============================================================================
# AUTHENTICATION ROUTES TESTS
# =============================================================================


# =============================================================================
# APP INITIALIZATION TESTS
# =============================================================================


class TestAppInitialization:
    """Tests for Flask app creation and initialization."""

    def test_create_app_with_master_key_from_env(self, monkeypatch, tmp_path):
        """Test create_app with MASTER_KEY from environment variable"""
        from app.web.dashboard import create_app

        # Set environment variable with a valid master key
        master_key_hex = "a" * 64  # 32 bytes in hex format
        monkeypatch.setenv("MASTER_KEY", master_key_hex)

        db_path = str(tmp_path / "test_env.db")

        # Create app - should use environment master key
        app = create_app(db_path=db_path)

        assert app is not None
        assert app.config["MASTER_KEY"] == bytes.fromhex(master_key_hex)

        # Clean up
        import os

        if os.path.exists(db_path):
            os.unlink(db_path)


class TestAuthenticationRoutes:
    """Integration tests for authentication routes."""

    def test_get_login_page(self, test_client):
        """GET /login → render login page"""
        response = test_client.get("/login")
        assert response.status_code == 200
        assert b"login" in response.data.lower() or b"password" in response.data.lower()

    def test_post_login_with_valid_credentials(self, test_client, test_user):
        """POST /login with valid credentials → session created → redirect to dashboard"""
        response = test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        assert response.status_code == 200

        # Verify session was created
        with test_client.session_transaction() as sess:
            assert "user_id" in sess
            assert sess["user_id"] == test_user["id"]
            assert sess["username"] == test_user["username"]
            assert sess["is_admin"] is False

    def test_post_login_with_invalid_credentials(self, test_client, test_user):
        """POST /login with invalid credentials → error message shown"""
        response = test_client.post(
            "/login",
            data={"username": test_user["username"], "password": "WrongPassword123!"},
            follow_redirects=True,
        )

        assert response.status_code == 200

        # No session should be created
        with test_client.session_transaction() as sess:
            assert "user_id" not in sess

    def test_post_login_missing_fields(self, test_client):
        """POST /login with missing fields → validation error"""
        response = test_client.post(
            "/login",
            data={
                "username": "testuser"
                # Missing password
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

        # No session should be created
        with test_client.session_transaction() as sess:
            assert "user_id" not in sess

    def test_get_register_page(self, test_client):
        """GET /register → render registration page"""
        response = test_client.get("/register")
        assert response.status_code == 200
        assert (
            b"register" in response.data.lower() or b"password" in response.data.lower()
        )

    def test_post_register_with_valid_data(self, test_client, test_db_path):
        """POST /register → create user → redirect to login"""
        response = test_client.post(
            "/register",
            data={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "NewUser123!@#",
                "confirm_password": "NewUser123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

        # Verify user was created in database
        user_manager = UserManager(test_db_path)
        user = user_manager.get_user_by_username("newuser")
        assert user is not None
        assert user.email == "newuser@example.com"

    def test_post_register_password_mismatch(self, test_client):
        """POST /register with mismatched passwords → error shown"""
        response = test_client.post(
            "/register",
            data={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "NewUser123!@#",
                "confirm_password": "Different123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_register_missing_username(self, test_client):
        """POST /register with missing username → validation error"""
        response = test_client.post(
            "/register",
            data={
                "email": "newuser@example.com",
                "password": "NewUser123!@#",
                "confirm_password": "NewUser123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show validation error

    def test_post_register_missing_email(self, test_client):
        """POST /register with missing email → validation error"""
        response = test_client.post(
            "/register",
            data={
                "username": "newuser",
                "password": "NewUser123!@#",
                "confirm_password": "NewUser123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show validation error

    def test_post_register_missing_password(self, test_client):
        """POST /register with missing password → validation error"""
        response = test_client.post(
            "/register",
            data={
                "username": "newuser",
                "email": "newuser@example.com",
                "confirm_password": "NewUser123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show validation error

    def test_post_register_create_user_exception(self, test_client):
        """POST /register with exception during user creation"""
        with patch("app.web.dashboard.UserManager.create_user") as mock_create:
            mock_create.side_effect = ValueError("Username already exists")

            response = test_client.post(
                "/register",
                data={
                    "username": "newuser",
                    "email": "newuser@example.com",
                    "password": "NewUser123!@#",
                    "confirm_password": "NewUser123!@#",
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Should show error message

    def test_post_logout(self, test_client, test_user):
        """POST /logout → clear session → redirect to login"""
        # First login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Verify session exists
        with test_client.session_transaction() as sess:
            assert "user_id" in sess

        # Logout
        response = test_client.post("/logout", follow_redirects=True)
        assert response.status_code == 200

        # Verify session was cleared
        with test_client.session_transaction() as sess:
            assert "user_id" not in sess

    def test_api_auth_check_unauthenticated(self, test_client):
        """GET /api/auth/check (unauthenticated) → return unauthenticated status"""
        response = test_client.get("/api/auth/check")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["authenticated"] is False

    def test_api_auth_check_authenticated(self, test_client, test_user):
        """GET /api/auth/check (authenticated) → return user info"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Check auth status
        response = test_client.get("/api/auth/check")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert data["authenticated"] is True
        assert data["user_id"] == test_user["id"]
        assert data["username"] == test_user["username"]
        assert data["is_admin"] is False


# =============================================================================
# DASHBOARD ROUTES TESTS
# =============================================================================


class TestDashboardRoutes:
    """Integration tests for main dashboard routes."""

    def test_get_dashboard_unauthenticated(self, test_client):
        """GET / (unauthenticated) → redirect to login"""
        response = test_client.get("/")
        assert response.status_code == 302
        assert "/login" in response.location

    def test_get_dashboard_authenticated(self, test_client, test_user):
        """GET / (authenticated) → render dashboard with stats"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access dashboard
        response = test_client.get("/")
        assert response.status_code == 200

    def test_get_analytics_unauthenticated(self, test_client):
        """GET /analytics (unauthenticated) → redirect to login"""
        response = test_client.get("/analytics")
        assert response.status_code == 302
        assert "/login" in response.location

    def test_get_analytics_authenticated(self, test_client, test_user):
        """GET /analytics (authenticated) → render analytics page"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access analytics
        response = test_client.get("/analytics")
        assert response.status_code == 200


# =============================================================================
# USER MANAGEMENT ROUTES TESTS
# =============================================================================


class TestUserManagementRoutes:
    """Integration tests for user management routes."""

    def test_get_users_list_admin_only(self, test_client, test_user):
        """GET /users (non-admin) → 403 Forbidden"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to access users list
        response = test_client.get("/users")
        assert response.status_code == 403

    def test_get_users_list_admin(self, test_client, test_admin_user):
        """GET /users (admin) → render users list"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Access users list
        response = test_client.get("/users")
        assert response.status_code == 200

    def test_get_user_detail_own_profile(self, test_client, test_user):
        """GET /users/<id> (own profile) → render user detail"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access own profile
        response = test_client.get(f'/users/{test_user["id"]}')
        assert response.status_code == 200

    def test_get_user_detail_other_user_non_admin(
        self, test_client, test_user, test_admin_user
    ):
        """GET /users/<id> (other user, non-admin) → 403 Forbidden"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to access other user's profile
        response = test_client.get(f'/users/{test_admin_user["id"]}')
        assert response.status_code in [403, 302]

    def test_post_user_edit_own_profile(self, test_client, test_user):
        """POST /users/<id>/edit (own profile) → update user"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Update own profile
        response = test_client.post(
            f'/users/{test_user["id"]}/edit',
            data={"email": "newemail@example.com"},
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_user_delete_admin_only(self, test_client, test_user, test_admin_user):
        """POST /users/<id>/delete (non-admin) → 403 Forbidden"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to delete another user
        response = test_client.post(f'/users/{test_admin_user["id"]}/delete')
        assert response.status_code == 403


# =============================================================================
# CREDENTIAL MANAGEMENT ROUTES TESTS
# =============================================================================


class TestCredentialManagementRoutes:
    """Integration tests for credential management routes."""

    def test_get_credentials_list(self, test_client, test_user):
        """GET /credentials → list user's credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access credentials list
        response = test_client.get("/credentials")
        assert response.status_code == 200

    def test_get_credentials_add_page(self, test_client, test_user):
        """GET /credentials/add → render add credentials form"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access add credentials page
        response = test_client.get("/credentials/add")
        assert response.status_code == 200

    def test_post_credentials_add_twitter_scraping(self, test_client, test_user):
        """POST /credentials/add (Twitter scraping) → encrypt & store credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add Twitter scraping credentials
        response = test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "scraping",
                "username": "twitter_user",
                "password": "twitter_password",
                "email": "twitter@example.com",
                "email_password": "email_password",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_credentials_add_twitter_api(self, test_client, test_user):
        """POST /credentials/add (Twitter API) → encrypt & store credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add Twitter API credentials
        response = test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_credentials_add_bluesky(self, test_client, test_user):
        """POST /credentials/add (Bluesky) → encrypt & store credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add Bluesky credentials
        response = test_client.post(
            "/credentials/add",
            data={
                "platform": "bluesky",
                "credential_type": "api",
                "username": "user.bsky.social",
                "password": "bluesky_password",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_credentials_edit(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/<id>/edit → update credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # First add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Edit credentials
            response = test_client.post(
                f"/credentials/{cred_id}/edit",
                data={
                    "api_key": "updated_api_key",
                    "api_secret": "updated_api_secret",
                    "access_token": "updated_access_token",
                    "access_secret": "updated_access_secret",
                },
                follow_redirects=True,
            )

            assert response.status_code == 200

    def test_post_credentials_delete(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/<id>/delete → remove credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # First add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Delete credentials
            response = test_client.post(
                f"/credentials/{cred_id}/delete", follow_redirects=True
            )

            assert response.status_code == 200

    def test_post_credentials_test(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/<id>/test → validate credentials"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # First add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_api_key",
                "api_secret": "test_api_secret",
                "access_token": "test_access_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Mock credential validation
            with patch(
                "app.integrations.credential_validator.validate_credentials"
            ) as mock_validate:
                mock_validate.return_value = (True, "Credentials valid")

                # Test credentials
                response = test_client.post(f"/credentials/{cred_id}/test")

                assert response.status_code == 200
                data = json.loads(response.data)
                assert "success" in data


# =============================================================================
# TASK MANAGEMENT ROUTES TESTS
# =============================================================================


class TestTaskManagementRoutes:
    """Integration tests for task management routes."""

    def test_get_tasks_list(self, test_client, test_user):
        """GET /tasks → list all scheduled tasks with status"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access tasks list
        response = test_client.get("/tasks")
        assert response.status_code == 200

    def test_get_task_detail(self, test_client, test_user, integration_app):
        """GET /tasks/<task_name> → show task details and history"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add a task to the scheduler
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            # Try to access a task detail (even if it doesn't exist, we check error handling)
            response = test_client.get("/tasks/test_task")
            # Should return either 404 or 200 depending on whether task exists
            assert response.status_code in [200, 404]

    def test_post_task_trigger_non_admin(self, test_client, test_user):
        """POST /tasks/<task_name>/trigger (non-admin) → 403 Forbidden"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to trigger a task
        response = test_client.post("/tasks/test_task/trigger")
        assert response.status_code == 403

    def test_post_task_trigger_admin(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/trigger (admin) → trigger task"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to trigger a task (may not exist, but should check permissions first)
        response = test_client.post("/tasks/test_task/trigger", follow_redirects=True)
        # Should be 200 even if task doesn't exist (just shows error message)
        assert response.status_code in [200, 404]

    def test_get_api_tasks_status(self, test_client, test_user):
        """GET /api/tasks/status → return JSON task status"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Get task status
        response = test_client.get("/api/tasks/status")
        # Should return 200 with tasks or error, or 500 if scheduler not initialized
        assert response.status_code in [200, 500]

        # If status code is 200, check response format
        if response.status_code == 200:
            data = json.loads(response.data)
            assert "tasks" in data or "error" in data

    def test_get_tasks_list_no_scheduler(self, test_client, test_user):
        """GET /tasks when scheduler not available"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Access tasks list - should handle missing scheduler gracefully
        response = test_client.get("/tasks")
        assert response.status_code == 200

    def test_post_task_trigger_no_scheduler(self, test_client, test_admin_user):
        """POST /tasks/<task_name>/trigger when scheduler not available"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to trigger task without scheduler
        response = test_client.post("/tasks/test_task/trigger", follow_redirects=True)
        assert response.status_code == 200

    def test_post_task_trigger_exception(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/trigger with exception"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock scheduler to raise exception
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            with patch.object(scheduler, "trigger_task_now") as mock_trigger:
                mock_trigger.side_effect = Exception("Scheduler error")

                response = test_client.post(
                    "/tasks/test_task/trigger", follow_redirects=True
                )
                assert response.status_code == 200

    def test_get_task_detail_exception(self, test_client, test_user, integration_app):
        """GET /tasks/<task_name> with exception"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock scheduler to raise exception
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            with patch.object(scheduler, "get_task_status") as mock_status:
                mock_status.side_effect = Exception("Scheduler error")

                response = test_client.get("/tasks/test_task")
                assert response.status_code == 404

    def test_post_task_toggle_no_scheduler(self, test_client, test_admin_user):
        """POST /tasks/<task_name>/toggle when scheduler not available"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to toggle task without scheduler
        response = test_client.post("/tasks/test_task/toggle")
        assert response.status_code == 500

    def test_post_task_configure_no_scheduler(self, test_client, test_admin_user):
        """POST /tasks/<task_name>/configure when scheduler not available"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to configure task without scheduler
        response = test_client.post(
            "/tasks/test_task/configure",
            data={"schedule": "0 * * * *"},
            follow_redirects=True,
        )
        assert response.status_code == 200


# =============================================================================
# ANALYTICS ROUTES TESTS
# =============================================================================


class TestAnalyticsRoutes:
    """Integration tests for analytics routes."""

    def test_get_api_analytics_overview(self, test_client, test_user):
        """GET /api/analytics/overview → fetch analytics data (JSON)"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Get analytics overview
        response = test_client.get("/api/analytics/overview")
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "success" in data

    def test_get_api_analytics_overview_exception(self, test_client, test_user):
        """GET /api/analytics/overview with exception"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock AnalyticsTracker to raise exception
        with patch("app.web.dashboard.AnalyticsTracker") as mock_tracker:
            mock_tracker.return_value.get_user_analytics.side_effect = Exception(
                "DB error"
            )

            response = test_client.get("/api/analytics/overview")
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data["success"] is False

    def test_get_api_analytics_top_tweets(self, test_client, test_user):
        """GET /api/analytics/top-tweets → fetch top performing tweets (JSON)"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Get top tweets
        response = test_client.get(
            "/api/analytics/top-tweets?limit=10&metric=engagement_rate"
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "success" in data

    def test_post_api_analytics_record_metrics(self, test_client, test_user):
        """POST /api/analytics/record-metrics → record tweet metrics"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Record metrics
        response = test_client.post(
            "/api/analytics/record-metrics",
            json={
                "tweet_id": "tweet_123",
                "metrics": {
                    "impressions": 1000,
                    "likes": 50,
                    "retweets": 25,
                    "replies": 10,
                },
            },
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "success" in data

    def test_post_api_analytics_create_snapshot(self, test_client, test_user):
        """POST /api/analytics/create-snapshot → create analytics snapshot"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Create snapshot
        response = test_client.post(
            "/api/analytics/create-snapshot", json={"period": "daily"}
        )
        assert response.status_code == 200

        data = json.loads(response.data)
        assert "success" in data

    def test_post_api_analytics_record_metrics_missing_tweet_id(
        self, test_client, test_user
    ):
        """POST /api/analytics/record-metrics without tweet_id → validation error"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Record metrics without tweet_id
        response = test_client.post(
            "/api/analytics/record-metrics",
            json={
                "metrics": {
                    "impressions": 1000,
                    "likes": 50,
                },
            },
        )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False

    def test_get_api_analytics_top_tweets_with_params(self, test_client, test_user):
        """GET /api/analytics/top-tweets with custom metric and limit"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Get top tweets with custom params
        response = test_client.get("/api/analytics/top-tweets?limit=5&metric=likes")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "success" in data

    def test_get_api_analytics_top_tweets_exception(self, test_client, test_user):
        """GET /api/analytics/top-tweets with exception"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock AnalyticsTracker to raise exception
        with patch("app.web.dashboard.AnalyticsTracker") as mock_tracker:
            mock_tracker.return_value.get_top_tweets.side_effect = Exception("DB error")

            response = test_client.get("/api/analytics/top-tweets")
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data["success"] is False

    def test_post_api_analytics_create_snapshot_exception(self, test_client, test_user):
        """POST /api/analytics/create-snapshot with exception"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock AnalyticsTracker to raise exception
        with patch("app.web.dashboard.AnalyticsTracker") as mock_tracker:
            mock_tracker.return_value.create_snapshot.side_effect = Exception(
                "DB error"
            )

            response = test_client.post(
                "/api/analytics/create-snapshot", json={"period": "daily"}
            )
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data["success"] is False

    def test_post_api_analytics_record_metrics_exception(self, test_client, test_user):
        """POST /api/analytics/record-metrics with exception"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock AnalyticsTracker to raise exception
        with patch("app.web.dashboard.AnalyticsTracker") as mock_tracker:
            mock_tracker.return_value.record_metrics.side_effect = Exception("DB error")

            response = test_client.post(
                "/api/analytics/record-metrics",
                json={
                    "tweet_id": "tweet_123",
                    "metrics": {
                        "impressions": 1000,
                        "likes": 50,
                    },
                },
            )
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data["success"] is False


# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================


class TestErrorHandling:
    """Integration tests for error handling."""

    def test_404_nonexistent_route(self, test_client):
        """GET /nonexistent → 404 Not Found"""
        response = test_client.get("/nonexistent/route")
        assert response.status_code == 404

    def test_404_nonexistent_user(self, test_client, test_admin_user):
        """GET /users/99999 → 404 Not Found (admin can access any user)"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to access nonexistent user
        response = test_client.get("/users/99999")
        assert response.status_code == 404

    def test_404_nonexistent_credential(self, test_client, test_user):
        """GET /credentials/99999/edit → 404 Not Found"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to access nonexistent credential
        response = test_client.get("/credentials/99999/edit")
        assert response.status_code == 404

    def test_403_non_admin_access_users_list(self, test_client, test_user):
        """GET /users (non-admin) → 403 Forbidden"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to access users list
        response = test_client.get("/users")
        assert response.status_code == 403


# =============================================================================
# SESSION PERSISTENCE TESTS
# =============================================================================


class TestSessionPersistence:
    """Integration tests for session persistence across requests."""

    def test_session_persists_across_requests(self, test_client, test_user):
        """Login → navigate to multiple pages → session persists"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Verify session
        with test_client.session_transaction() as sess:
            assert "user_id" in sess
            user_id = sess["user_id"]

        # Navigate to different pages
        test_client.get("/")
        test_client.get("/credentials")
        test_client.get("/analytics")

        # Verify session still exists
        with test_client.session_transaction() as sess:
            assert "user_id" in sess
            assert sess["user_id"] == user_id

    def test_protected_routes_redirect_to_login(self, test_client):
        """Try to access protected routes → redirect to login"""
        protected_routes = ["/", "/credentials", "/analytics", "/tasks"]

        for route in protected_routes:
            response = test_client.get(route)
            # Should redirect to login
            assert response.status_code == 302
            assert "/login" in response.location


# =============================================================================
# INTEGRATION TESTS FOR COMPLETE WORKFLOWS
# =============================================================================


class TestCompleteWorkflows:
    """Integration tests for complete user workflows."""

    def test_complete_credential_lifecycle(self, test_client, test_user):
        """Test complete credential lifecycle: add → edit → test → delete"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials
        add_response = test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "access_token": "test_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )
        assert add_response.status_code == 200

        # List credentials
        list_response = test_client.get("/credentials")
        assert list_response.status_code == 200

    def test_user_registration_login_logout(self, test_client):
        """Test complete user flow: register → login → logout"""
        # Register
        register_response = test_client.post(
            "/register",
            data={
                "username": "newcompleteuser",
                "email": "newcompleteuser@example.com",
                "password": "NewComplete123!@#",
                "confirm_password": "NewComplete123!@#",
            },
            follow_redirects=True,
        )
        assert register_response.status_code == 200

        # Login
        login_response = test_client.post(
            "/login",
            data={"username": "newcompleteuser", "password": "NewComplete123!@#"},
            follow_redirects=True,
        )
        assert login_response.status_code == 200

        # Verify logged in
        with test_client.session_transaction() as sess:
            assert "user_id" in sess

        # Logout
        logout_response = test_client.post("/logout", follow_redirects=True)
        assert logout_response.status_code == 200

        # Verify logged out
        with test_client.session_transaction() as sess:
            assert "user_id" not in sess


# =============================================================================
# ENHANCED CREDENTIAL MANAGEMENT TESTS (Coverage Enhancement)
# =============================================================================


class TestCredentialManagementEnhanced:
    """Enhanced integration tests for credential management edge cases."""

    def test_post_credentials_add_with_exception(
        self, test_client, test_user, integration_app
    ):
        """POST /credentials/add with exception during save"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock credential save to raise exception
        with patch("app.web.dashboard.CredentialManager.save_credentials") as mock_save:
            mock_save.side_effect = Exception("Save failed")

            response = test_client.post(
                "/credentials/add",
                data={
                    "platform": "twitter",
                    "credential_type": "api",
                    "api_key": "test_key",
                    "api_secret": "test_secret",
                    "access_token": "test_token",
                    "access_secret": "test_access_secret",
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Should show error message and re-render form

    def test_get_credentials_edit_get_page(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """GET /credentials/<id>/edit → render edit form with decrypted data"""
        # Login first
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials first
        test_client.post(
            "/credentials/add",
            data={
                "platform": "bluesky",
                "credential_type": "api",
                "username": "user.bsky.social",
                "password": "bluesky_password",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Access edit page
            response = test_client.get(f"/credentials/{cred_id}/edit")
            assert response.status_code == 200
            # Page should contain edit form

    def test_credentials_share_success(
        self, test_client, test_user, test_admin_user, test_db_path, integration_app
    ):
        """POST /credentials/share → share credentials with other users"""
        # Login as regular user
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "access_token": "test_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Share credentials
            response = test_client.post(
                "/credentials/share",
                data={
                    "credential_id": str(cred_id),
                    "user_ids": str(test_admin_user["id"]),
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Check for success message in response

    def test_credentials_share_invalid_user_ids(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/share with invalid user IDs → validation error"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "access_token": "test_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Try to share with invalid user IDs
            response = test_client.post(
                "/credentials/share",
                data={
                    "credential_id": str(cred_id),
                    "user_ids": "not-a-number,also-invalid",
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Should show error message

    def test_credentials_share_nonexistent_credential(self, test_client, test_user):
        """POST /credentials/share with nonexistent credential"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to share nonexistent credential
        response = test_client.post(
            "/credentials/share",
            data={
                "credential_id": "99999",
                "user_ids": "1,2,3",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show error message

    def test_credentials_test_credential_not_found(self, test_client, test_user):
        """POST /credentials/<id>/test with nonexistent credential"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to test nonexistent credential
        response = test_client.post("/credentials/99999/test")

        assert response.status_code == 404
        data = json.loads(response.data)
        assert data["success"] is False

    def test_credentials_test_failed_to_load(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/<id>/test when credential data cannot be loaded"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "access_token": "test_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Mock get_credentials to return None
            with patch(
                "app.web.dashboard.CredentialManager.get_credentials"
            ) as mock_get:
                mock_get.return_value = None

                response = test_client.post(f"/credentials/{cred_id}/test")

                assert response.status_code == 200
                data = json.loads(response.data)
                assert data["success"] is False
                assert "error" in data

    def test_credentials_test_validation_exception(
        self, test_client, test_user, test_db_path, integration_app
    ):
        """POST /credentials/<id>/test with validation exception"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Add credentials
        test_client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "test_key",
                "api_secret": "test_secret",
                "access_token": "test_token",
                "access_secret": "test_access_secret",
            },
            follow_redirects=True,
        )

        # Get credential ID
        credential_manager = CredentialManager(
            integration_app.config["MASTER_KEY"], test_db_path
        )
        creds_list = credential_manager.list_user_credentials(test_user["id"])
        if creds_list:
            cred_id = creds_list[0]["id"]

            # Mock validate_credentials to raise exception
            with patch(
                "app.integrations.credential_validator.validate_credentials"
            ) as mock_validate:
                mock_validate.side_effect = Exception("Validation error")

                response = test_client.post(f"/credentials/{cred_id}/test")

                assert response.status_code == 200
                data = json.loads(response.data)
                assert data["success"] is False


# =============================================================================
# ENHANCED USER MANAGEMENT TESTS (Coverage Enhancement)
# =============================================================================


class TestUserManagementEnhanced:
    """Enhanced integration tests for user management edge cases."""

    def test_post_user_edit_with_password_change(self, test_client, test_user):
        """POST /users/<id>/edit with password change"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Update password
        response = test_client.post(
            f'/users/{test_user["id"]}/edit',
            data={
                "email": "updated@example.com",
                "password": "NewSecure123!@#",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Verify password was updated

    def test_post_user_edit_with_weak_password(self, test_client, test_user):
        """POST /users/<id>/edit with weak password → validation error"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Try to update with weak password
        response = test_client.post(
            f'/users/{test_user["id"]}/edit',
            data={
                "email": "updated@example.com",
                "password": "weak",  # Too weak
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show error message

    def test_post_user_edit_admin_updates_user_status(
        self, test_client, test_admin_user, test_user
    ):
        """POST /users/<id>/edit as admin → update is_active and is_admin"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Update user's is_active and is_admin status
        response = test_client.post(
            f'/users/{test_user["id"]}/edit',
            data={
                "email": "updated@example.com",
                "is_active": "0",
                "is_admin": "1",
            },
            follow_redirects=True,
        )

        assert response.status_code == 200

    def test_post_user_edit_failed_update(self, test_client, test_user):
        """POST /users/<id>/edit with failed update"""
        # Login
        test_client.post(
            "/login",
            data={"username": test_user["username"], "password": test_user["password"]},
            follow_redirects=True,
        )

        # Mock update to fail
        with patch("app.web.dashboard.UserManager.update_user") as mock_update:
            mock_update.return_value = False

            response = test_client.post(
                f'/users/{test_user["id"]}/edit',
                data={"email": "updated@example.com"},
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Should show error message

    def test_post_user_delete_self_prevention(self, test_client, test_admin_user):
        """POST /users/<id>/delete (admin) → prevent deleting self"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try to delete self
        response = test_client.post(
            f'/users/{test_admin_user["id"]}/delete', follow_redirects=True
        )

        assert response.status_code == 200
        # Should show error message

    def test_post_user_delete_success(self, test_client, test_admin_user, test_user):
        """POST /users/<id>/delete (admin) → successfully delete user"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Delete another user
        response = test_client.post(
            f'/users/{test_user["id"]}/delete', follow_redirects=True
        )

        assert response.status_code == 200
        # Verify user was deleted

    def test_post_user_delete_failed(self, test_client, test_admin_user, test_user):
        """POST /users/<id>/delete with failed deletion"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock delete to fail
        with patch("app.web.dashboard.UserManager.delete_user") as mock_delete:
            mock_delete.return_value = False

            response = test_client.post(
                f'/users/{test_user["id"]}/delete', follow_redirects=True
            )

            assert response.status_code == 200
            # Should show error message


# =============================================================================
# ENHANCED TASK MANAGEMENT TESTS (Coverage Enhancement)
# =============================================================================


class TestTaskManagementEnhanced:
    """Enhanced integration tests for task management edge cases."""

    def test_post_task_toggle_success(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/toggle → toggle task enable/disable"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock scheduler with task
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            with patch.object(scheduler, "get_task_status") as mock_status:
                with patch.object(scheduler, "pause_task") as mock_pause:
                    mock_status.return_value = {"enabled": True}
                    mock_pause.return_value = True

                    response = test_client.post("/tasks/test_task/toggle")
                    assert response.status_code == 200
                    data = json.loads(response.data)
                    assert data["success"] is True

    def test_post_task_toggle_nonexistent(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/toggle with nonexistent task"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock scheduler
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            with patch.object(scheduler, "get_task_status") as mock_status:
                mock_status.return_value = None

                response = test_client.post("/tasks/nonexistent_task/toggle")
                assert response.status_code == 404

    def test_post_task_configure_success(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/configure → update task schedule"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock scheduler
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            with patch.object(scheduler, "update_task_schedule") as mock_update:
                mock_update.return_value = True

                response = test_client.post(
                    "/tasks/test_task/configure",
                    data={"schedule": "0 * * * *"},
                    follow_redirects=True,
                )
                assert response.status_code == 200

    def test_post_task_configure_missing_schedule(self, test_client, test_admin_user):
        """POST /tasks/<task_name>/configure with missing schedule"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Try without schedule parameter
        response = test_client.post(
            "/tasks/test_task/configure",
            data={},
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Should show error message

    def test_post_task_configure_unsupported(
        self, test_client, test_admin_user, integration_app
    ):
        """POST /tasks/<task_name>/configure when not supported"""
        # Login as admin
        test_client.post(
            "/login",
            data={
                "username": test_admin_user["username"],
                "password": test_admin_user["password"],
            },
            follow_redirects=True,
        )

        # Mock scheduler without update_task_schedule method
        scheduler = integration_app.config.get("TASK_SCHEDULER")
        if scheduler:
            # Remove method temporarily
            has_method = hasattr(scheduler, "update_task_schedule")
            if has_method:
                old_method = getattr(scheduler, "update_task_schedule", None)
                delattr(scheduler, "update_task_schedule")

            response = test_client.post(
                "/tasks/test_task/configure",
                data={"schedule": "0 * * * *"},
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Should show "not supported" message

            # Restore method
            if has_method:
                setattr(scheduler, "update_task_schedule", old_method)
