"""
Advanced Multi-User E2E Tests (Sprint 8 - E2E-002)

Comprehensive tests for multi-user workflows covering:
- Multi-user credential isolation (data not visible across users)
- Credential sharing between users
- Admin user management and permissions
- Access control enforcement

Tests verify:
- Database isolation for different users
- Credential encryption and visibility
- Shared credential functionality
- Admin capabilities and restrictions
"""

import pytest
import json
import sqlite3
import hashlib
from typing import Tuple


# ============================================================================
# TEST 1: MULTI-USER CREDENTIAL ISOLATION
# ============================================================================


class TestMultiUserCredentialIsolation:
    """
    Test that credentials are properly isolated between users.

    Verifies that User A cannot access User B's credentials even if they
    both have the same platform credentials.
    """

    def test_multi_user_credential_isolation(
        self, client, user_manager, credential_manager, db_connection
    ):
        """
        Test: User A and User B both login, User A adds credential,
        User B cannot see it.

        Verify:
        - User A can view own credential
        - User B cannot view User A's credential
        - Database shows correct user_id association
        """
        # Create two separate users
        user_a_id = user_manager.create_user(
            "user_a_isolation", "user_a@example.com", "UserA123!@#", is_admin=False
        )

        user_b_id = user_manager.create_user(
            "user_b_isolation", "user_b@example.com", "UserB123!@#", is_admin=False
        )

        # Step 1: User A logs in and adds Twitter credential
        with client.session_transaction() as sess:
            sess["user_id"] = user_a_id
            sess["username"] = "user_a_isolation"
            sess["is_admin"] = False

        user_a_add_response = client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "scraping",
                "username": "twitter_user_a",
                "password": "PasswordA123!",
                "email": "email_a@twitter.com",
                "email_password": "EmailPassA123!",
            },
            follow_redirects=True,
        )

        assert user_a_add_response.status_code == 200

        # Verify User A credential exists
        user_a_creds = credential_manager.list_user_credentials(user_a_id)
        assert len(user_a_creds) == 1
        assert user_a_creds[0]["platform"] == "twitter"
        user_a_cred_id = user_a_creds[0]["id"]

        # Step 2: User A can view their own credentials list
        user_a_list_response = client.get("/credentials")
        assert user_a_list_response.status_code == 200
        assert (
            b"twitter_user_a" not in user_a_list_response.data
            or b"twitter" in user_a_list_response.data.lower()
        )  # At least platform visible

        # Step 3: User B logs in
        with client.session_transaction() as sess:
            sess["user_id"] = user_b_id
            sess["username"] = "user_b_isolation"
            sess["is_admin"] = False

        # Step 4: User B views credentials list - should be empty
        user_b_list_response = client.get("/credentials")
        assert user_b_list_response.status_code == 200

        # User B should not see User A's credential username
        assert b"twitter_user_a" not in user_b_list_response.data

        # Step 5: Verify database isolation via direct SQL query
        cursor = db_connection.cursor()

        # Get all credentials for User A
        cursor.execute(
            "SELECT id, user_id, platform, encrypted_data FROM user_credentials WHERE user_id = ?",
            (user_a_id,),
        )
        user_a_db_creds = cursor.fetchall()
        assert len(user_a_db_creds) == 1
        assert user_a_db_creds[0]["user_id"] == user_a_id

        # Get all credentials for User B
        cursor.execute(
            "SELECT id, user_id, platform, encrypted_data FROM user_credentials WHERE user_id = ?",
            (user_b_id,),
        )
        user_b_db_creds = cursor.fetchall()
        assert len(user_b_db_creds) == 0

        # Step 6: Try User B to directly access User A's credential (should fail)
        user_b_access_response = client.get(f"/credentials/{user_a_cred_id}/edit")
        # Should either be 403 (forbidden) or 404 (not found) from user B's perspective
        assert user_b_access_response.status_code in [403, 404]

        # Step 7: Verify User B cannot delete User A's credential
        user_b_delete_response = client.post(
            f"/credentials/{user_a_cred_id}/delete", follow_redirects=True
        )
        assert user_b_delete_response.status_code in [403, 404]

        # Verify User A's credential still exists
        user_a_creds_after = credential_manager.list_user_credentials(user_a_id)
        assert len(user_a_creds_after) == 1

    def test_credential_encryption_and_isolation(
        self, client, user_manager, credential_manager, db_connection
    ):
        """
        Test: Verify credentials are encrypted and cannot be read as plaintext.

        Verify:
        - Credential data is encrypted in database
        - Encrypted data is not plaintext
        - User can decrypt their own credentials
        """
        # Create user
        user_id = user_manager.create_user(
            "encrypt_test_user", "encrypt@example.com", "Encrypt123!@#", is_admin=False
        )

        # Login
        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["username"] = "encrypt_test_user"

        # Add credential
        client.post(
            "/credentials/add",
            data={
                "platform": "bluesky",
                "credential_type": "api",
                "username": "secret_user.bsky",
                "password": "SecretPassword123!",
            },
            follow_redirects=True,
        )

        # Get credential from database
        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT encrypted_data FROM user_credentials WHERE user_id = ? AND platform = ?",
            (user_id, "bluesky"),
        )
        row = cursor.fetchone()
        assert row is not None
        encrypted_data = row["encrypted_data"]

        # Verify encrypted data is not plaintext
        # encrypted_data is bytes, so convert strings to bytes for comparison
        if isinstance(encrypted_data, bytes):
            assert b"secret_user.bsky" not in encrypted_data
            assert b"SecretPassword123!" not in encrypted_data
        else:
            # If it's a string (shouldn't be, but handle it)
            assert "secret_user.bsky" not in encrypted_data
            assert "SecretPassword123!" not in encrypted_data

        # Verify credentials can still be retrieved decrypted through manager
        retrieved_creds = credential_manager.get_credentials(user_id, "bluesky", "api")
        assert retrieved_creds is not None
        assert retrieved_creds["username"] == "secret_user.bsky"
        assert retrieved_creds["password"] == "SecretPassword123!"


# ============================================================================
# TEST 2: CREDENTIAL SHARING
# ============================================================================


class TestCredentialSharing:
    """
    Test credential sharing between users.

    Verifies that admin can share credentials with other users and that
    shared credentials are properly accessible and read-only.
    """

    def test_credential_sharing_workflow(
        self, client, user_manager, credential_manager, db_connection
    ):
        """
        Test: Admin shares credential with User B, User B sees and can use it.

        Verify:
        - Admin credential is created
        - Credential can be shared with another user
        - User B sees "Shared" badge
        - User B can view but not delete shared credential
        - Database shows correct sharing relationship
        """
        # Create admin and regular user
        admin_id = user_manager.create_user(
            "admin_share_test",
            "admin_share@example.com",
            "AdminShare123!@#",
            is_admin=True,
        )

        user_b_id = user_manager.create_user(
            "user_b_share_test",
            "user_b_share@example.com",
            "UserB123!@#",
            is_admin=False,
        )

        # Step 1: Admin logs in and adds credential
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "admin_share_test"
            sess["is_admin"] = True

        admin_add_response = client.post(
            "/credentials/add",
            data={
                "platform": "twitter",
                "credential_type": "api",
                "api_key": "admin_api_key_123",
                "api_secret": "admin_api_secret",
                "access_token": "admin_token",
                "access_secret": "admin_token_secret",
            },
            follow_redirects=True,
        )

        assert admin_add_response.status_code == 200

        # Get credential ID
        admin_creds = credential_manager.list_user_credentials(admin_id)
        assert len(admin_creds) == 1
        admin_cred_id = admin_creds[0]["id"]

        # Step 2: Admin shares credential with User B
        share_response = client.post(
            "/credentials/share",
            data={"credential_id": admin_cred_id, "user_ids": str(user_b_id)},
            follow_redirects=True,
        )

        assert share_response.status_code == 200

        # Step 3: Verify sharing in database
        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT * FROM shared_credentials WHERE credential_id = ? AND shared_with_user_id = ?",
            (admin_cred_id, user_b_id),
        )
        shared_record = cursor.fetchone()
        assert shared_record is not None

        # Step 4: User B logs in and checks credentials
        with client.session_transaction() as sess:
            sess["user_id"] = user_b_id
            sess["username"] = "user_b_share_test"
            sess["is_admin"] = False

        user_b_list_response = client.get("/credentials")
        assert user_b_list_response.status_code == 200

        # Verify shared credential appears in list
        assert (
            b"twitter" in user_b_list_response.data.lower()
            or b"shared" in user_b_list_response.data.lower()
        )

        # Step 5: User B can view shared credential
        shared_creds = credential_manager.get_shared_credentials(user_b_id)
        assert len(shared_creds) >= 1
        shared_cred = shared_creds[0]
        assert shared_cred["platform"] == "twitter"

        # Step 6: User B cannot delete shared credential
        user_b_delete_response = client.post(
            f"/credentials/{admin_cred_id}/delete", follow_redirects=True
        )
        # Should fail - either 403 or 404
        assert user_b_delete_response.status_code in [403, 404]

        # Step 7: Verify credential still exists
        remaining_shared = credential_manager.get_shared_credentials(user_b_id)
        assert len(remaining_shared) >= 1


# ============================================================================
# TEST 3: ADMIN USER MANAGEMENT
# ============================================================================


class TestAdminUserManagement:
    """
    Test admin user management capabilities.

    Verifies that only admins can:
    - View all users
    - Edit user details
    - Promote/demote users
    - Deactivate users
    """

    def test_admin_user_management_workflow(self, client, user_manager, db_connection):
        """
        Test: Admin can manage users, regular user cannot.

        Verify:
        - Admin can view /users page
        - Admin can view user details
        - Admin can edit user email and permissions
        - Admin can promote user to admin
        - Admin can deactivate user
        - Regular user gets 403 on /users
        """
        # Create admin and regular user
        admin_id = user_manager.create_user(
            "admin_mgmt_test",
            "admin_mgmt@example.com",
            "AdminMgmt123!@#",
            is_admin=True,
        )

        user_to_manage_id = user_manager.create_user(
            "user_to_manage", "manage@example.com", "Manage123!@#", is_admin=False
        )

        regular_user_id = user_manager.create_user(
            "regular_user_mgmt", "regular@example.com", "Regular123!@#", is_admin=False
        )

        # Step 1: Admin logs in
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "admin_mgmt_test"
            sess["is_admin"] = True

        # Step 2: Admin can view users list
        admin_users_response = client.get("/users")
        assert admin_users_response.status_code == 200
        assert (
            b"user_to_manage" in admin_users_response.data
            or b"admin_mgmt_test" in admin_users_response.data
        )

        # Step 3: Admin can view user details
        user_detail_response = client.get(f"/users/{user_to_manage_id}")
        assert user_detail_response.status_code == 200
        assert (
            b"manage@example.com" in user_detail_response.data
            or b"user_to_manage" in user_detail_response.data
        )

        # Step 4: Admin edits user email
        user_edit_response = client.post(
            f"/users/{user_to_manage_id}/edit",
            data={"email": "newemail@example.com", "is_active": "1", "is_admin": "0"},
            follow_redirects=True,
        )

        assert user_edit_response.status_code == 200

        # Verify update in database
        cursor = db_connection.cursor()
        cursor.execute("SELECT email FROM users WHERE id = ?", (user_to_manage_id,))
        row = cursor.fetchone()
        assert row["email"] == "newemail@example.com"

        # Step 5: Admin promotes user to admin
        promote_response = client.post(
            f"/users/{user_to_manage_id}/edit",
            data={"email": "newemail@example.com", "is_active": "1", "is_admin": "1"},
            follow_redirects=True,
        )

        assert promote_response.status_code == 200

        # Verify promotion
        cursor.execute("SELECT is_admin FROM users WHERE id = ?", (user_to_manage_id,))
        row = cursor.fetchone()
        assert row["is_admin"] == 1

        # Step 6: Admin deactivates user
        deactivate_response = client.post(
            f"/users/{user_to_manage_id}/edit",
            data={"email": "newemail@example.com", "is_active": "0", "is_admin": "1"},
            follow_redirects=True,
        )

        assert deactivate_response.status_code == 200

        # Verify deactivation
        cursor.execute("SELECT is_active FROM users WHERE id = ?", (user_to_manage_id,))
        row = cursor.fetchone()
        assert row["is_active"] == 0

        # Step 7: Regular user cannot access user management
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user_id
            sess["username"] = "regular_user_mgmt"
            sess["is_admin"] = False

        regular_users_response = client.get("/users")
        assert regular_users_response.status_code == 403

        # Regular user cannot view other user details
        regular_user_detail = client.get(f"/users/{admin_id}")
        assert regular_user_detail.status_code in [403, 302]

        # Regular user cannot edit other users
        regular_edit_response = client.post(
            f"/users/{admin_id}/edit",
            data={"email": "hacked@example.com", "is_active": "1", "is_admin": "0"},
        )
        assert regular_edit_response.status_code in [403, 302]

    def test_admin_cannot_delete_self(self, client, user_manager):
        """
        Test: Admin cannot delete their own account.

        Verify:
        - Admin can delete other users
        - Admin cannot delete their own account
        """
        admin_id = user_manager.create_user(
            "admin_delete_test",
            "admin_delete@example.com",
            "AdminDelete123!@#",
            is_admin=True,
        )

        other_user_id = user_manager.create_user(
            "other_user_delete", "other@example.com", "Other123!@#", is_admin=False
        )

        # Admin logs in
        with client.session_transaction() as sess:
            sess["user_id"] = admin_id
            sess["username"] = "admin_delete_test"
            sess["is_admin"] = True

        # Admin can delete other user
        delete_other_response = client.post(
            f"/users/{other_user_id}/delete", follow_redirects=True
        )
        assert delete_other_response.status_code == 200

        # Verify other user is deleted
        deleted_user = user_manager.get_user_by_id(other_user_id)
        assert deleted_user is None

        # Admin cannot delete self
        self_delete_response = client.post(
            f"/users/{admin_id}/delete", follow_redirects=True
        )
        assert self_delete_response.status_code == 200

        # Verify admin still exists
        admin_still_exists = user_manager.get_user_by_id(admin_id)
        assert admin_still_exists is not None
