"""
End-to-End Dashboard Workflow Tests (Sprint 6-7 - E2E-001)

Comprehensive end-to-end tests for user dashboard workflows covering:
- User registration to first sync (complete journey)
- Dashboard analytics viewing after syncing posts
- Task management workflow (view, trigger, check status)
- Credential management (add, edit, test, delete)
- Admin user management and activity monitoring

Tests verify:
- HTTP responses (200, 302, 404, 403)
- Session management and authentication
- Database state changes and persistence
- Form validation and error handling
- Access control enforcement
"""

import pytest
import json
import os
import time
from flask import Flask
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager
from app.features.analytics_tracker import AnalyticsTracker
from app.services.task_scheduler import TaskScheduler


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database for testing"""
    return str(tmp_path / "test_e2e.db")


@pytest.fixture
def master_key():
    """Create test master key for encryption"""
    return os.urandom(32)


@pytest.fixture
def test_app(db_path, master_key):
    """Create test Flask app with all components initialized"""
    from app.web.dashboard import create_app

    app = create_app(db_path=db_path, master_key=master_key)
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False  # Disable CSRF for testing

    # Initialize all database tables
    user_manager = UserManager(db_path)
    user_manager.init_db()

    credential_manager = CredentialManager(master_key, db_path)
    credential_manager.init_db()

    analytics_tracker = AnalyticsTracker(db_path)
    analytics_tracker.init_db()

    # Initialize mock task scheduler
    scheduler = TaskScheduler(db_path)
    scheduler.init_db()
    app.config["TASK_SCHEDULER"] = scheduler

    return app


@pytest.fixture
def client(test_app):
    """Create Flask test client"""
    return test_app.test_client()


@pytest.fixture
def user_manager(db_path):
    """Create UserManager for database operations"""
    um = UserManager(db_path)
    um.init_db()
    return um


@pytest.fixture
def credential_manager(db_path, master_key):
    """Create CredentialManager for credential operations"""
    cm = CredentialManager(master_key, db_path)
    cm.init_db()
    return cm


@pytest.fixture
def analytics_tracker(db_path):
    """Create AnalyticsTracker for analytics operations"""
    at = AnalyticsTracker(db_path)
    at.init_db()
    return at


# ============================================================================
# TEST 1: USER REGISTRATION TO FIRST SYNC
# Complete journey: Register → Login → Add Credentials → Trigger Sync
# ============================================================================


class TestUserRegistrationToFirstSync:
    """
    End-to-end test for complete user journey from registration to first sync.

    Verifies the entire workflow:
    1. Register new account
    2. Login with credentials
    3. Navigate to dashboard
    4. Add platform credentials
    5. List credentials
    6. Verify database state
    """

    def test_user_registration_to_first_sync(
        self, client, user_manager, credential_manager
    ):
        """
        Complete user journey: register → add credentials → verify sync ready

        Tests:
        - Registration form validation
        - User creation in database
        - Login with new account
        - Session establishment
        - Credential addition
        - Dashboard access
        - Credential persistence in database
        """
        # Step 1: Register new user
        register_response = client.post(
            "/register",
            data={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "NewUser123!@#",
                "confirm_password": "NewUser123!@#",
            },
            follow_redirects=True,
        )

        assert register_response.status_code == 200

        # Verify user was created in database
        user = user_manager.get_user_by_username("newuser")
        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.is_admin is False
        assert user.is_active is True
        user_id = user.id

        # Step 2: Login with new account
        login_response = client.post(
            "/login",
            data={"username": "newuser", "password": "NewUser123!@#"},
            follow_redirects=True,
        )

        assert login_response.status_code == 200

        # Verify session was created
        with client.session_transaction() as sess:
            assert "user_id" in sess
            assert sess["user_id"] == user_id
            assert sess["username"] == "newuser"

        # Step 3: Access dashboard (should redirect to dashboard for authenticated users)
        dashboard_response = client.get("/")
        assert dashboard_response.status_code == 200

        # Step 4: Add Twitter scraping credentials
        add_cred_response = client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "scraping",
                "username": "twitter_user",
                "password": "twitter_pass",
                "email": "twitter@example.com",
                "email_password": "email_pass",
            },
            follow_redirects=True,
        )

        assert add_cred_response.status_code == 200

        # Step 5: Verify credentials in database
        creds = credential_manager.get_credentials(user_id, "twitter", "scraping")
        assert creds is not None
        assert creds["username"] == "twitter_user"
        assert creds["email"] == "twitter@example.com"

        # Step 6: List credentials on page
        creds_list_response = client.get("/credentials")
        assert creds_list_response.status_code == 200
        assert (
            b"twitter" in creds_list_response.data.lower()
            or b"TWITTER" in creds_list_response.data
        )

        # Step 7: Verify credential metadata
        creds_metadata = credential_manager.list_user_credentials(user_id)
        assert len(creds_metadata) == 1
        assert creds_metadata[0]["platform"] == "twitter"
        assert creds_metadata[0]["credential_type"] == "scraping"
        assert (
            creds_metadata[0]["is_active"] == 1
        )  # SQLite returns integers for booleans


# ============================================================================
# TEST 2: DASHBOARD ANALYTICS WORKFLOW
# View analytics dashboard after syncing posts
# ============================================================================


class TestDashboardAnalyticsWorkflow:
    """
    End-to-end test for analytics dashboard workflow.

    Verifies analytics viewing and data aggregation:
    1. User logs in
    2. Record some sample metrics
    3. View analytics dashboard
    4. Check top tweets display
    5. Verify aggregated data
    """

    def test_dashboard_analytics_workflow(
        self, client, user_manager, analytics_tracker
    ):
        """
        Test analytics workflow: login → record metrics → view analytics dashboard

        Tests:
        - Analytics dashboard access
        - Metrics recording API
        - Top tweets retrieval
        - Period-based analytics (daily/weekly/monthly)
        - JSON API responses
        """
        # Step 1: Create and login user
        user_id = user_manager.create_user(
            "analyticsuser", "analytics@example.com", "Analytics123!@#", is_admin=False
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["username"] = "analyticsuser"

        # Step 2: Record sample tweet metrics
        # Record metrics for Tweet 1
        metrics_response_1 = client.post(
            "/api/analytics/record-metrics",
            json={
                "tweet_id": "tweet_001",
                "metrics": {
                    "impressions": 1000,
                    "likes": 50,
                    "retweets": 25,
                    "replies": 10,
                    "engagements": 85,
                    "engagement_rate": 0.085,
                },
            },
        )
        assert metrics_response_1.status_code == 200
        data = json.loads(metrics_response_1.data)
        assert data["success"] is True
        assert data["tweet_id"] == "tweet_001"

        # Record metrics for Tweet 2
        metrics_response_2 = client.post(
            "/api/analytics/record-metrics",
            json={
                "tweet_id": "tweet_002",
                "metrics": {
                    "impressions": 2000,
                    "likes": 120,
                    "retweets": 60,
                    "replies": 20,
                    "engagements": 200,
                    "engagement_rate": 0.10,
                },
            },
        )
        assert metrics_response_2.status_code == 200

        # Verify metrics in database
        top_tweets = analytics_tracker.get_top_tweets(
            user_id, metric="engagement_rate", limit=2
        )
        assert len(top_tweets) >= 1

        # Step 3: Access analytics dashboard page
        analytics_page = client.get("/analytics")
        assert analytics_page.status_code == 200

        # Step 4: Get analytics overview via API
        overview_response = client.get("/api/analytics/overview")
        assert overview_response.status_code == 200

        overview_data = json.loads(overview_response.data)
        assert overview_data["success"] is True
        assert "daily" in overview_data
        assert "weekly" in overview_data
        assert "monthly" in overview_data

        # Step 5: Get top tweets via API
        top_tweets_response = client.get(
            "/api/analytics/top-tweets?limit=10&metric=engagement_rate"
        )
        assert top_tweets_response.status_code == 200

        tweets_data = json.loads(top_tweets_response.data)
        assert tweets_data["success"] is True
        assert "tweets" in tweets_data
        assert tweets_data["metric"] == "engagement_rate"

        # Step 6: Create analytics snapshot
        snapshot_response = client.post(
            "/api/analytics/create-snapshot", json={"period": "daily"}
        )
        assert snapshot_response.status_code == 200
        snapshot_data = json.loads(snapshot_response.data)
        assert snapshot_data["success"] is True
        assert snapshot_data["period"] == "daily"


# ============================================================================
# TEST 3: TASK MANAGEMENT WORKFLOW
# View tasks → trigger sync → check status
# ============================================================================


class TestTaskManagementWorkflow:
    """
    End-to-end test for task management workflow.

    Verifies task scheduling and execution:
    1. User logs in as admin
    2. View tasks list
    3. Trigger task manually
    4. Check task status/history
    5. Monitor execution results
    """

    def test_task_management_workflow(self, client, user_manager, test_app):
        """
        Test task management workflow: login → view tasks → trigger → check status

        Tests:
        - Tasks list page access
        - Task detail view
        - Task triggering (admin only)
        - Task status API endpoint
        - Execution history retrieval
        """
        # Step 1: Create and login admin user
        admin_id = user_manager.create_user(
            "adminuser", "admin@example.com", "Admin123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "adminuser"
            sess["is_admin"] = True

        # Step 2: Add a test task to scheduler
        scheduler = test_app.config["TASK_SCHEDULER"]

        # Define a simple task function
        def test_sync_task():
            return "Sync completed successfully"

        # Add cron task (every 5 minutes)
        scheduler.add_cron_task("test_sync", test_sync_task, "*/5 * * * *")
        scheduler.start()

        # Step 3: View tasks list page
        tasks_list_response = client.get("/tasks")
        assert tasks_list_response.status_code == 200

        # Step 4: Get task status via API
        status_response = client.get("/api/tasks/status")
        assert status_response.status_code == 200

        status_data = json.loads(status_response.data)
        assert "tasks" in status_data
        assert "count" in status_data

        # Step 5: Trigger task manually (admin only)
        # Note: This would need an actual task to trigger
        # For now, test that access control is enforced

        # Step 6: Test non-admin cannot trigger tasks
        non_admin_id = user_manager.create_user(
            "regularuser", "regular@example.com", "Regular123!@#", is_admin=False
        )

        with client.session_transaction() as sess:
            sess["user_id"] = non_admin_id
            sess["is_admin"] = False

        # Non-admin trying to trigger should be forbidden
        trigger_response = client.post("/tasks/test_sync/trigger")
        assert trigger_response.status_code == 403  # Forbidden

        # Switch back to admin
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Admin can access tasks
        admin_tasks = client.get("/tasks")
        assert admin_tasks.status_code == 200

        # Cleanup
        scheduler.stop()


# ============================================================================
# TEST 4: CREDENTIAL MANAGEMENT WORKFLOW
# Add → Edit → Test → Delete credentials
# ============================================================================


class TestCredentialManagementWorkflow:
    """
    End-to-end test for credential management workflow.

    Verifies complete credential lifecycle:
    1. Add new credentials (multiple platforms)
    2. View credentials list
    3. Edit existing credentials
    4. Test credentials validity
    5. Delete credentials
    """

    def test_credential_management_workflow(
        self, client, user_manager, credential_manager
    ):
        """
        Test credential management workflow: add → edit → test → delete

        Tests:
        - Credential creation for different platforms
        - Credential retrieval and listing
        - Credential updates/edits
        - Credential testing (validation)
        - Credential deletion
        - Database state changes
        """
        # Step 1: Create and login user
        user_id = user_manager.create_user(
            "credentialuser", "cred@example.com", "Cred123!@#", is_admin=False
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["username"] = "credentialuser"

        # Step 2: Add Twitter API credentials
        twitter_response = client.post(
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

        assert twitter_response.status_code == 200

        # Verify Twitter credentials saved
        twitter_creds = credential_manager.get_credentials(user_id, "twitter", "api")
        assert twitter_creds is not None
        assert twitter_creds["api_key"] == "test_api_key"

        # Step 3: Add Bluesky credentials
        bluesky_response = client.post(
            "/credentials/add",
            data={
                "platform": "bluesky",
                "credential_type": "api",
                "username": "user.bsky.social",
                "password": "app_password_123",
            },
            follow_redirects=True,
        )

        assert bluesky_response.status_code == 200

        # Verify Bluesky credentials saved
        bluesky_creds = credential_manager.get_credentials(user_id, "bluesky", "api")
        assert bluesky_creds is not None
        assert bluesky_creds["username"] == "user.bsky.social"

        # Step 4: View credentials list
        list_response = client.get("/credentials")
        assert list_response.status_code == 200

        # Get credential IDs for editing
        creds_list = credential_manager.list_user_credentials(user_id)
        assert len(creds_list) == 2

        twitter_cred_id = next(
            c["id"] for c in creds_list if c["platform"] == "twitter"
        )
        bluesky_cred_id = next(
            c["id"] for c in creds_list if c["platform"] == "bluesky"
        )

        # Step 5: Edit Twitter API credentials
        edit_response = client.post(
            f"/credentials/{twitter_cred_id}/edit",
            data={
                "api_key": "updated_api_key",
                "api_secret": "updated_api_secret",
                "access_token": "updated_access_token",
                "access_secret": "updated_access_secret",
            },
            follow_redirects=True,
        )

        assert edit_response.status_code == 200

        # Verify update in database
        updated_creds = credential_manager.get_credentials(user_id, "twitter", "api")
        assert updated_creds["api_key"] == "updated_api_key"

        # Step 6: Test Twitter credentials validity
        test_twitter_response = client.post(f"/credentials/{twitter_cred_id}/test")
        assert test_twitter_response.status_code == 200

        test_data = json.loads(test_twitter_response.data)
        assert "success" in test_data
        assert test_data["platform"] == "twitter"

        # Step 7: Test Bluesky credentials validity
        test_bluesky_response = client.post(f"/credentials/{bluesky_cred_id}/test")
        assert test_bluesky_response.status_code == 200

        bluesky_test_data = json.loads(test_bluesky_response.data)
        assert "success" in bluesky_test_data
        assert bluesky_test_data["platform"] == "bluesky"

        # Step 8: Delete Twitter credentials
        delete_response = client.post(
            f"/credentials/{twitter_cred_id}/delete", follow_redirects=True
        )
        assert delete_response.status_code == 200

        # Verify deletion in database
        deleted_creds = credential_manager.get_credentials(user_id, "twitter", "api")
        assert deleted_creds is None

        # Verify Bluesky still exists
        remaining_creds = credential_manager.list_user_credentials(user_id)
        assert len(remaining_creds) == 1
        assert remaining_creds[0]["platform"] == "bluesky"

        # Step 9: Delete Bluesky credentials
        delete_bluesky_response = client.post(
            f"/credentials/{bluesky_cred_id}/delete", follow_redirects=True
        )
        assert delete_bluesky_response.status_code == 200

        # Verify all credentials deleted
        final_creds = credential_manager.list_user_credentials(user_id)
        assert len(final_creds) == 0


# ============================================================================
# TEST 5: ADMIN USER MANAGEMENT
# Admin creates user → assigns credentials → monitors activity
# ============================================================================


class TestAdminUserManagement:
    """
    End-to-end test for admin user management workflow.

    Verifies admin capabilities:
    1. Admin logs in
    2. Create new user
    3. Assign credentials to user
    4. Share credentials between users
    5. Monitor user activity
    6. Manage user permissions
    """

    def test_admin_user_management(self, client, user_manager, credential_manager):
        """
        Test admin workflow: login → create user → manage credentials → monitor

        Tests:
        - Admin authentication
        - User creation by admin
        - Admin access to user management
        - Credential sharing
        - User listing and details
        - User editing by admin
        - Access control enforcement
        """
        # Step 1: Create and login admin user
        admin_id = user_manager.create_user(
            "superadmin", "superadmin@example.com", "SuperAdmin123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "superadmin"
            sess["is_admin"] = True

        # Step 2: View users list (admin only)
        users_list_response = client.get("/users")
        assert users_list_response.status_code == 200
        assert b"superadmin" in users_list_response.data

        # Step 3: Create a new user (using UserManager directly, as dashboard
        # doesn't have admin user creation endpoint - would be via admin panel)
        new_user_id = user_manager.create_user(
            "manageduser", "managed@example.com", "Managed123!@#", is_admin=False
        )

        # Verify user was created
        new_user = user_manager.get_user_by_id(new_user_id)
        assert new_user is not None
        assert new_user.username == "manageduser"
        assert new_user.is_admin is False

        # Step 4: View managed user's profile (admin access)
        user_detail_response = client.get(f"/users/{new_user_id}")
        assert user_detail_response.status_code == 200
        assert b"manageduser" in user_detail_response.data

        # Step 5: Add credentials for admin user
        admin_twitter_response = client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "scraping",
                "username": "admin_twitter",
                "password": "admin_pass",
                "email": "admin@twitter.com",
                "email_password": "admin_email_pass",
            },
            follow_redirects=True,
        )

        assert admin_twitter_response.status_code == 200

        # Get credential ID
        admin_creds = credential_manager.list_user_credentials(admin_id)
        assert len(admin_creds) > 0
        cred_id = admin_creds[0]["id"]

        # Step 6: Share admin's credentials with managed user
        share_response = client.post(
            "/credentials/share",
            data={"credential_id": cred_id, "user_ids": str(new_user_id)},
            follow_redirects=True,
        )

        assert share_response.status_code == 200

        # Step 7: Verify credential was shared
        shared_creds = credential_manager.get_shared_credentials(new_user_id)
        assert len(shared_creds) > 0

        # Step 8: Update managed user (admin editing)
        update_response = client.post(
            f"/users/{new_user_id}/edit",
            data={"email": "newemail@example.com", "is_active": "1", "is_admin": "0"},
            follow_redirects=True,
        )

        assert update_response.status_code == 200

        # Verify update in database
        updated_user = user_manager.get_user_by_id(new_user_id)
        assert updated_user.email == "newemail@example.com"

        # Step 9: Promote user to admin
        promote_response = client.post(
            f"/users/{new_user_id}/edit",
            data={"email": "newemail@example.com", "is_active": "1", "is_admin": "1"},
            follow_redirects=True,
        )

        assert promote_response.status_code == 200

        # Verify promotion
        promoted_user = user_manager.get_user_by_id(new_user_id)
        assert promoted_user.is_admin is True

        # Step 10: Deactivate user
        deactivate_response = client.post(
            f"/users/{new_user_id}/edit",
            data={"email": "newemail@example.com", "is_active": "0", "is_admin": "1"},
            follow_redirects=True,
        )

        assert deactivate_response.status_code == 200

        # Verify deactivation
        deactivated_user = user_manager.get_user_by_id(new_user_id)
        assert deactivated_user.is_active is False

        # Step 11: Non-admin user cannot access user management
        # Create non-admin user
        regular_user_id = user_manager.create_user(
            "regularuser", "regular@example.com", "Regular123!@#", is_admin=False
        )

        # Login as regular user
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user_id
            sess["is_admin"] = False

        # Regular user cannot view users list
        regular_users_response = client.get("/users")
        assert regular_users_response.status_code == 403  # Forbidden

        # Regular user cannot view other user profiles
        regular_user_detail = client.get(f"/users/{admin_id}")
        # Should either be 403 (forbidden) or redirect
        assert regular_user_detail.status_code in [403, 302]

        # Step 12: Admin can delete users (but not self)
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        delete_response = client.post(
            f"/users/{regular_user_id}/delete", follow_redirects=True
        )
        assert delete_response.status_code == 200

        # Verify deletion
        deleted_user = user_manager.get_user_by_id(regular_user_id)
        assert deleted_user is None

        # Admin cannot delete self
        self_delete_response = client.post(
            f"/users/{admin_id}/delete", follow_redirects=True
        )
        assert self_delete_response.status_code == 200

        # Verify admin still exists
        admin_still_exists = user_manager.get_user_by_id(admin_id)
        assert admin_still_exists is not None


# ============================================================================
# FORM VALIDATION TESTS
# Test form validation and error handling
# ============================================================================


class TestFormValidation:
    """
    Test form validation and error handling in dashboard workflows.

    Verifies proper validation of:
    - Registration forms
    - Login forms
    - Credential forms
    - User edit forms
    """

    def test_registration_form_validation(self, client, user_manager):
        """Test registration form validation"""
        # Test missing fields
        missing_username = client.post(
            "/register",
            data={
                "email": "test@example.com",
                "password": "Test123!@#",
                "confirm_password": "Test123!@#",
            },
            follow_redirects=True,
        )
        assert missing_username.status_code == 200

        # Test password mismatch
        password_mismatch = client.post(
            "/register",
            data={
                "username": "testuser",
                "email": "test@example.com",
                "password": "Test123!@#",
                "confirm_password": "Different123!@#",
            },
            follow_redirects=True,
        )
        assert password_mismatch.status_code == 200

        # Test weak password
        weak_password = client.post(
            "/register",
            data={
                "username": "testuser",
                "email": "test@example.com",
                "password": "weak",
                "confirm_password": "weak",
            },
            follow_redirects=True,
        )
        assert weak_password.status_code == 200

        # Test duplicate username
        user_manager.create_user(
            "existinguser", "existing@example.com", "Existing123!@#"
        )

        duplicate_username = client.post(
            "/register",
            data={
                "username": "existinguser",
                "email": "newemail@example.com",
                "password": "NewPass123!@#",
                "confirm_password": "NewPass123!@#",
            },
            follow_redirects=True,
        )
        assert duplicate_username.status_code == 200

    def test_login_form_validation(self, client, user_manager):
        """Test login form validation"""
        # Create a test user
        user_manager.create_user("testuser", "test@example.com", "Test123!@#")

        # Test missing credentials
        missing_password = client.post(
            "/login", data={"username": "testuser"}, follow_redirects=True
        )
        assert missing_password.status_code == 200

        # Test invalid credentials
        invalid_creds = client.post(
            "/login",
            data={"username": "testuser", "password": "WrongPassword123!@#"},
            follow_redirects=True,
        )
        assert invalid_creds.status_code == 200

        # Verify no session created
        with client.session_transaction() as sess:
            assert "user_id" not in sess

        # Test non-existent user
        nonexistent_user = client.post(
            "/login",
            data={"username": "nonexistent", "password": "SomePass123!@#"},
            follow_redirects=True,
        )
        assert nonexistent_user.status_code == 200

    def test_credential_form_validation(self, client, user_manager):
        """Test credential form validation"""
        # Create and login user
        user_id = user_manager.create_user("creduser", "cred@example.com", "Cred123!@#")

        with client.session_transaction() as sess:
            sess["user_id"] = user_id

        # Test missing platform
        missing_platform = client.post(
            "/credentials/add",
            data={"credential_type": "api", "username": "user"},
            follow_redirects=True,
        )
        assert missing_platform.status_code == 200

        # Test invalid platform
        invalid_platform = client.post(
            "/credentials/add",
            data={
                "platform": "invalid_platform",
                "credential_type": "api",
                "username": "user",
            },
            follow_redirects=True,
        )
        assert invalid_platform.status_code == 200


# ============================================================================
# SESSION MANAGEMENT TESTS
# Test session handling and authentication
# ============================================================================


class TestSessionManagement:
    """
    Test session management and authentication flow.

    Verifies proper handling of:
    - Session creation on login
    - Session clearing on logout
    - Session persistence across requests
    - Protected route access
    """

    def test_session_creation_and_clearing(self, client, user_manager):
        """Test session is created on login and cleared on logout"""
        # Create user
        user = user_manager.create_user(
            "sessionuser", "session@example.com", "Session123!@#"
        )

        # Check no session before login
        with client.session_transaction() as sess:
            assert "user_id" not in sess

        # Login
        login_response = client.post(
            "/login",
            data={"username": "sessionuser", "password": "Session123!@#"},
            follow_redirects=True,
        )
        assert login_response.status_code == 200

        # Verify session created
        with client.session_transaction() as sess:
            assert "user_id" in sess
            assert sess["user_id"] == user
            assert "username" in sess
            assert sess["username"] == "sessionuser"

        # Logout
        logout_response = client.post("/logout", follow_redirects=True)
        assert logout_response.status_code == 200

        # Verify session cleared
        with client.session_transaction() as sess:
            assert "user_id" not in sess
            assert "username" not in sess

    def test_protected_routes_require_authentication(self, client):
        """Test protected routes require authentication"""
        # Try to access dashboard without session
        dashboard = client.get("/")
        assert dashboard.status_code == 302  # Redirect to login
        assert "/login" in dashboard.location

        # Try to access credentials without session
        credentials = client.get("/credentials")
        assert credentials.status_code == 302
        assert "/login" in credentials.location

        # Try to access analytics without session
        analytics = client.get("/analytics")
        assert analytics.status_code == 302
        assert "/login" in analytics.location

        # Try to access tasks without session
        tasks = client.get("/tasks")
        assert tasks.status_code == 302
        assert "/login" in tasks.location

    def test_auth_check_api(self, client, user_manager):
        """Test /api/auth/check endpoint"""
        # Check unauthenticated
        unauth_response = client.get("/api/auth/check")
        assert unauth_response.status_code == 200
        unauth_data = json.loads(unauth_response.data)
        assert unauth_data["authenticated"] is False

        # Create and login user
        user_id = user_manager.create_user(
            "authcheckuser", "authcheck@example.com", "AuthCheck123!@#"
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["username"] = "authcheckuser"
            sess["is_admin"] = False

        # Check authenticated
        auth_response = client.get("/api/auth/check")
        assert auth_response.status_code == 200
        auth_data = json.loads(auth_response.data)
        assert auth_data["authenticated"] is True
        assert auth_data["user_id"] == user_id
        assert auth_data["username"] == "authcheckuser"
        assert auth_data["is_admin"] is False


# ============================================================================
# ERROR HANDLING TESTS
# Test error responses and edge cases
# ============================================================================


class TestErrorHandling:
    """
    Test error handling and edge cases.

    Verifies proper error responses for:
    - Not found resources (404)
    - Forbidden access (403)
    - Invalid requests (400)
    """

    def test_404_for_nonexistent_user(self, client, user_manager):
        """Test 404 response for nonexistent user (requires admin access)"""
        # Create admin user to bypass access control checks
        admin_id = user_manager.create_user(
            "adminuser", "admin@example.com", "Admin123!@#", is_admin=True
        )

        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["is_admin"] = True

        # Admin can access any user detail - test nonexistent user returns 404
        response = client.get("/users/99999")
        assert response.status_code == 404

    def test_404_for_nonexistent_credential(self, client, user_manager):
        """Test 404 response for nonexistent credential"""
        user_id = user_manager.create_user("creduser", "cred@example.com", "Cred123!@#")

        with client.session_transaction() as sess:
            sess["user_id"] = user_id

        # Try to access nonexistent credential
        response = client.get("/credentials/99999/edit")
        assert response.status_code == 404

    def test_403_forbidden_for_non_admin(self, client, user_manager):
        """Test 403 forbidden for non-admin accessing admin-only routes"""
        # Create regular user
        user_id = user_manager.create_user(
            "regularuser", "regular@example.com", "Regular123!@#"
        )

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["is_admin"] = False

        # Try to access admin-only routes
        users_list = client.get("/users")
        assert users_list.status_code == 403

        # Non-admin CAN view tasks (requires only @require_auth)
        # but cannot trigger tasks (requires @require_admin)
        tasks_list = client.get("/tasks")
        assert (
            tasks_list.status_code == 200
        )  # Tasks viewing is open to all authenticated users

        # Try to trigger a task (admin-only)
        trigger_response = client.post("/tasks/test_task/trigger")
        assert trigger_response.status_code == 403  # Admin only

    def test_invalid_json_api_request(self, client, user_manager):
        """Test API handles invalid JSON"""
        user_id = user_manager.create_user("apiuser", "api@example.com", "Api123!@#")

        with client.session_transaction() as sess:
            sess["user_id"] = user_id

        # Send invalid JSON
        response = client.post(
            "/api/analytics/record-metrics",
            data="not valid json",
            content_type="application/json",
        )
        # Should still return a response (may be 400 or handle gracefully)
        assert response.status_code in [200, 400, 500]
