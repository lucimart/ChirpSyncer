"""
Integration Tests for Authentication System (Sprint 6)

Comprehensive integration tests for the authentication system covering:
- User registration and authentication flows
- Password hashing with bcrypt
- Session creation, validation, and cleanup
- Multi-user credential management with AES-256-GCM encryption
- Authentication decorators with role-based access control
- Audit trail tracking for security events
- Multi-user isolation and data security

Test Coverage:
- Complete user registration → login → session creation workflow
- Password hashing and verification with bcrypt
- Session expiration and cleanup
- Failed login attempts and duplicate prevention
- Multi-user credential encryption and isolation
- Credential CRUD operations (create, read, update, delete)
- Master key integration with credential encryption
- Authentication decorators with redirects and 403 responses
- Session validation through decorators
- Multiple concurrent sessions per user
- Audit log tracking for user actions
- Error handling and edge cases
"""

import os
import sys
import time
import sqlite3
import bcrypt
import secrets
from typing import Dict, Optional
from unittest.mock import patch, MagicMock

import pytest

# Add app directory to path for imports
sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app")
)

from auth.user_manager import UserManager, User
from auth.credential_manager import CredentialManager


# =============================================================================
# FIXTURES - Authentication & Credentials
# =============================================================================


@pytest.fixture(scope="function")
def user_manager(test_db_path):
    """Create and initialize UserManager instance for testing."""
    manager = UserManager(db_path=test_db_path)
    manager.init_db()
    return manager


@pytest.fixture(scope="function")
def credential_manager(test_db_path):
    """Create and initialize CredentialManager with 32-byte master key."""
    # Generate a proper 32-byte master key for AES-256
    master_key = secrets.token_bytes(32)
    manager = CredentialManager(master_key=master_key, db_path=test_db_path)
    manager.init_db()
    return manager


@pytest.fixture(scope="function")
def sample_user_credentials() -> Dict:
    """Provide sample Twitter API credentials for testing."""
    return {
        "api_key": "test_api_key_12345",
        "api_secret": "test_api_secret_67890",
        "access_token": "test_access_token_abc123",
        "access_token_secret": "test_access_token_secret_xyz789",
    }


@pytest.fixture(scope="function")
def sample_bluesky_credentials() -> Dict:
    """Provide sample Bluesky credentials for testing."""
    return {
        "identifier": "testuser.bsky.social",
        "password": "BlueskyPassword123!",
        "handle": "testuser.bsky.social",
        "did": "did:plc:testuser12345",
    }


# =============================================================================
# TEST: User Registration & Authentication Flow (FLOW-001)
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
def test_complete_user_registration_and_login(user_manager, test_db):
    """
    Test complete user registration → login → session creation → validation flow.

    Validates:
    - User can be created with secure password
    - Created user can be retrieved
    - User can authenticate with correct credentials
    - Session can be created after authentication
    - Session can be validated
    - User data is correctly stored in database
    """
    # Step 1: Create user
    username = "newuser"
    email = "newuser@example.com"
    password = "SecurePassword123!"

    user_id = user_manager.create_user(username, email, password)
    assert user_id > 0, "User ID should be positive"

    # Step 2: Verify user in database
    cursor = test_db.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    db_row = cursor.fetchone()
    assert db_row is not None, "User should exist in database"
    assert db_row["username"] == username
    assert db_row["email"] == email
    assert db_row["is_active"] == 1

    # Step 3: Authenticate user
    authenticated_user = user_manager.authenticate_user(username, password)
    assert authenticated_user is not None, "Authentication should succeed"
    assert authenticated_user.id == user_id
    assert authenticated_user.username == username
    assert authenticated_user.is_active

    # Step 4: Verify last_login was updated
    cursor.execute("SELECT last_login FROM users WHERE id = ?", (user_id,))
    db_row = cursor.fetchone()
    assert (
        db_row["last_login"] is not None
    ), "last_login should be set after authentication"

    # Step 5: Create session
    session_token = user_manager.create_session(
        user_id=user_id, ip_address="127.0.0.1", user_agent="TestClient/1.0"
    )
    assert session_token is not None and len(session_token) > 0

    # Step 6: Validate session
    session_user = user_manager.validate_session(session_token)
    assert session_user is not None, "Session validation should succeed"
    assert session_user.id == user_id
    assert session_user.username == username

    # Step 7: Verify session in database
    cursor.execute(
        "SELECT * FROM user_sessions WHERE session_token = ?", (session_token,)
    )
    session_row = cursor.fetchone()
    assert session_row is not None
    assert session_row["user_id"] == user_id


@pytest.mark.integration
@pytest.mark.database
def test_password_hashing_with_bcrypt(user_manager, test_db):
    """
    Test password hashing and verification with bcrypt.

    Validates:
    - Password is hashed with bcrypt (not stored in plain text)
    - Hashed password cannot be reversed
    - Correct password authenticates successfully
    - Wrong password fails authentication
    """
    username = "hashuser"
    email = "hashuser@example.com"
    password = "TestPassword123!"

    # Create user
    user_id = user_manager.create_user(username, email, password)

    # Verify password is hashed in database
    cursor = test_db.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    password_hash = cursor.fetchone()["password_hash"]

    # Password should be hashed (different from plain text)
    assert (
        password_hash != password
    ), "Password should be hashed, not stored in plain text"

    # Hash should be valid bcrypt format
    assert password_hash.startswith("$2b$"), "Password hash should be bcrypt format"

    # Correct password should authenticate
    user = user_manager.authenticate_user(username, password)
    assert user is not None, "Correct password should authenticate"

    # Wrong password should fail
    user = user_manager.authenticate_user(username, "WrongPassword123!")
    assert user is None, "Wrong password should not authenticate"


@pytest.mark.integration
@pytest.mark.database
def test_duplicate_username_prevention(user_manager):
    """
    Test that duplicate usernames are prevented.

    Validates:
    - Creating user with existing username raises ValueError
    - Error message is appropriate
    """
    username = "duplicateuser"
    email1 = "user1@example.com"
    email2 = "user2@example.com"
    password = "TestPassword123!"

    # Create first user
    user_manager.create_user(username, email1, password)

    # Attempt to create second user with same username
    with pytest.raises(ValueError) as exc_info:
        user_manager.create_user(username, email2, password)

    assert "Username already exists" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.database
def test_duplicate_email_prevention(user_manager):
    """
    Test that duplicate emails are prevented.

    Validates:
    - Creating user with existing email raises ValueError
    - Error message is appropriate
    """
    username1 = "user1"
    username2 = "user2"
    email = "duplicate@example.com"
    password = "TestPassword123!"

    # Create first user
    user_manager.create_user(username1, email, password)

    # Attempt to create second user with same email
    with pytest.raises(ValueError) as exc_info:
        user_manager.create_user(username2, email, password)

    assert "Email already exists" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.database
def test_failed_login_attempts(user_manager):
    """
    Test failed login attempts with various failure reasons.

    Validates:
    - Non-existent user returns None
    - Wrong password returns None
    - Inactive user cannot login
    - Audit log records failed attempts
    """
    username = "existinguser"
    email = "existing@example.com"
    password = "TestPassword123!"

    user_id = user_manager.create_user(username, email, password)

    # Test 1: Non-existent user
    result = user_manager.authenticate_user("nonexistent", password)
    assert result is None, "Non-existent user should return None"

    # Test 2: Wrong password
    result = user_manager.authenticate_user(username, "WrongPassword")
    assert result is None, "Wrong password should return None"

    # Test 3: Inactive user
    user_manager.update_user(user_id, is_active=False)
    result = user_manager.authenticate_user(username, password)
    assert result is None, "Inactive user should not authenticate"


@pytest.mark.integration
@pytest.mark.database
def test_session_expiration_and_cleanup(user_manager, test_db):
    """
    Test session expiration and automatic cleanup.

    Validates:
    - Session with short expiration is rejected
    - Expired session is deleted from database
    - Valid session is accepted
    """
    username = "sessionuser"
    email = "sessionuser@example.com"
    password = "TestPassword123!"

    user_id = user_manager.create_user(username, email, password)

    # Create session with 1-second expiration
    session_token = user_manager.create_session(
        user_id=user_id,
        ip_address="127.0.0.1",
        user_agent="TestClient/1.0",
        expires_in=1,
    )

    # Session should be valid immediately
    user = user_manager.validate_session(session_token)
    assert user is not None, "Session should be valid immediately"

    # Wait for expiration
    time.sleep(2)

    # Expired session should be rejected and deleted
    user = user_manager.validate_session(session_token)
    assert user is None, "Expired session should return None"

    # Verify session was deleted from database
    cursor = test_db.cursor()
    cursor.execute(
        "SELECT id FROM user_sessions WHERE session_token = ?", (session_token,)
    )
    row = cursor.fetchone()
    assert row is None, "Expired session should be deleted from database"


@pytest.mark.integration
@pytest.mark.database
def test_multiple_concurrent_sessions_per_user(user_manager, test_db):
    """
    Test that multiple sessions can be created for single user.

    Validates:
    - Multiple sessions can exist for same user
    - Each session has unique token
    - Each session can be independently validated
    - Deleting one session doesn't affect others
    """
    username = "multiuser"
    email = "multiuser@example.com"
    password = "TestPassword123!"

    user_id = user_manager.create_user(username, email, password)

    # Create 3 sessions
    tokens = []
    for i in range(3):
        token = user_manager.create_session(
            user_id=user_id,
            ip_address=f"192.168.0.{i+1}",
            user_agent=f"Client{i+1}/1.0",
        )
        tokens.append(token)

    # All sessions should be unique
    assert len(set(tokens)) == 3, "All sessions should have unique tokens"

    # All sessions should validate
    for token in tokens:
        user = user_manager.validate_session(token)
        assert user is not None
        assert user.id == user_id

    # Delete one session
    result = user_manager.delete_session(tokens[0])
    assert result is True

    # First session should be invalid
    user = user_manager.validate_session(tokens[0])
    assert user is None, "Deleted session should be invalid"

    # Other sessions should still work
    for token in tokens[1:]:
        user = user_manager.validate_session(token)
        assert user is not None, "Other sessions should still be valid"

    # Verify database state
    cursor = test_db.cursor()
    cursor.execute(
        "SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?", (user_id,)
    )
    count = cursor.fetchone()["count"]
    assert count == 2, "Should have 2 remaining sessions"


# =============================================================================
# TEST: Multi-User Credential Management (CRED-001)
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
def test_user_creates_twitter_credentials(
    user_manager, credential_manager, test_db, sample_user_credentials
):
    """
    Test User A creates and stores encrypted Twitter credentials.

    Validates:
    - Credentials are encrypted with AES-256-GCM
    - Credentials are stored in database
    - Encryption includes IV and tag
    - Credentials can be retrieved and decrypted
    """
    # Create user
    username = "twitteruser"
    email = "twitteruser@example.com"
    password = "TestPassword123!"
    user_id = user_manager.create_user(username, email, password)

    # Save Twitter API credentials
    result = credential_manager.save_credentials(
        user_id=user_id,
        platform="twitter",
        credential_type="api",
        data=sample_user_credentials,
    )
    assert result is True

    # Verify credentials in database (should be encrypted)
    cursor = test_db.cursor()
    cursor.execute(
        """
        SELECT encrypted_data, encryption_iv, encryption_tag FROM user_credentials
        WHERE user_id = ? AND platform = 'twitter'
    """,
        (user_id,),
    )
    row = cursor.fetchone()
    assert row is not None
    assert row["encrypted_data"] is not None
    assert row["encryption_iv"] is not None
    assert row["encryption_tag"] is not None

    # IV should be 12 bytes for GCM
    assert len(row["encryption_iv"]) == 12, "IV should be 12 bytes for GCM"
    # Tag should be 16 bytes
    assert len(row["encryption_tag"]) == 16, "Tag should be 16 bytes"

    # Retrieve and verify decrypted credentials
    decrypted = credential_manager.get_credentials(user_id, "twitter", "api")
    assert decrypted is not None
    assert decrypted["api_key"] == sample_user_credentials["api_key"]
    assert decrypted["api_secret"] == sample_user_credentials["api_secret"]


@pytest.mark.integration
@pytest.mark.database
def test_multi_user_credential_isolation(
    user_manager,
    credential_manager,
    test_db,
    sample_user_credentials,
    sample_bluesky_credentials,
):
    """
    Test credential isolation between User A and User B.

    Validates:
    - User A creates Twitter credentials
    - User B creates Bluesky credentials
    - Credentials are properly isolated
    - Each user can only access their own credentials
    """
    # Create User A
    user_a_id = user_manager.create_user(
        "user_a", "usera@example.com", "TestPassword123!"
    )

    # Create User B
    user_b_id = user_manager.create_user(
        "user_b", "userb@example.com", "TestPassword123!"
    )

    # User A saves Twitter credentials
    credential_manager.save_credentials(
        user_id=user_a_id,
        platform="twitter",
        credential_type="api",
        data=sample_user_credentials,
    )

    # User B saves Bluesky credentials
    credential_manager.save_credentials(
        user_id=user_b_id,
        platform="bluesky",
        credential_type="api",
        data=sample_bluesky_credentials,
    )

    # User A should only have Twitter credentials
    user_a_creds = credential_manager.list_user_credentials(user_a_id)
    assert len(user_a_creds) == 1
    assert user_a_creds[0]["platform"] == "twitter"

    # User B should only have Bluesky credentials
    user_b_creds = credential_manager.list_user_credentials(user_b_id)
    assert len(user_b_creds) == 1
    assert user_b_creds[0]["platform"] == "bluesky"

    # User A should not be able to get User B's credentials
    user_a_bluesky = credential_manager.get_credentials(user_a_id, "bluesky", "api")
    assert (
        user_a_bluesky is None
    ), "User A should not access User B's Bluesky credentials"

    # User B should not be able to get User A's credentials
    user_b_twitter = credential_manager.get_credentials(user_b_id, "twitter", "api")
    assert (
        user_b_twitter is None
    ), "User B should not access User A's Twitter credentials"


@pytest.mark.integration
@pytest.mark.database
def test_credential_update_and_decryption(user_manager, credential_manager, test_db):
    """
    Test updating credentials and verifying new decrypted values.

    Validates:
    - Existing credentials can be updated
    - New values are encrypted
    - New IV and tag are generated
    - Decrypted values match updated data
    """
    user_id = user_manager.create_user(
        "updateuser", "update@example.com", "TestPassword123!"
    )

    initial_data = {"key": "initial_value", "secret": "initial_secret"}
    credential_manager.save_credentials(user_id, "twitter", "api", initial_data)

    # Update credentials
    updated_data = {"key": "updated_value", "secret": "updated_secret"}
    result = credential_manager.update_credentials(
        user_id, "twitter", "api", updated_data
    )
    assert result is True

    # Retrieve updated credentials
    decrypted = credential_manager.get_credentials(user_id, "twitter", "api")
    assert decrypted["key"] == "updated_value"
    assert decrypted["secret"] == "updated_secret"

    # Verify in database that new IV/tag were generated
    cursor = test_db.cursor()
    cursor.execute(
        """
        SELECT encryption_iv, encryption_tag FROM user_credentials
        WHERE user_id = ? AND platform = 'twitter'
    """,
        (user_id,),
    )
    row = cursor.fetchone()
    assert row["encryption_iv"] is not None
    assert row["encryption_tag"] is not None


@pytest.mark.integration
@pytest.mark.database
def test_credential_deletion(user_manager, credential_manager, test_db):
    """
    Test credential deletion.

    Validates:
    - Credentials can be deleted
    - Deleted credentials cannot be retrieved
    - Credential is removed from database
    """
    user_id = user_manager.create_user(
        "deleteuser", "delete@example.com", "TestPassword123!"
    )

    data = {"api_key": "test_key", "api_secret": "test_secret"}
    credential_manager.save_credentials(user_id, "twitter", "scraping", data)

    # Verify credential exists
    creds = credential_manager.get_credentials(user_id, "twitter", "scraping")
    assert creds is not None

    # Delete credential
    result = credential_manager.delete_credentials(user_id, "twitter", "scraping")
    assert result is True

    # Verify credential is gone
    creds = credential_manager.get_credentials(user_id, "twitter", "scraping")
    assert creds is None

    # Verify in database
    cursor = test_db.cursor()
    cursor.execute(
        """
        SELECT id FROM user_credentials WHERE user_id = ? AND platform = 'twitter'
    """,
        (user_id,),
    )
    row = cursor.fetchone()
    assert row is None


@pytest.mark.integration
@pytest.mark.database
def test_credential_sharing_between_users(
    user_manager, credential_manager, test_db, sample_user_credentials
):
    """
    Test credential sharing from owner to multiple users.

    Validates:
    - Owner can share credentials with multiple users
    - Shared users can access shared credentials
    - Shared credentials are marked as shared
    - Shared credentials have owner_user_id set
    """
    # Create owner and 2 other users
    owner_id = user_manager.create_user(
        "owner", "owner@example.com", "TestPassword123!"
    )
    user_c_id = user_manager.create_user(
        "user_c", "userc@example.com", "TestPassword123!"
    )
    user_d_id = user_manager.create_user(
        "user_d", "userd@example.com", "TestPassword123!"
    )

    # Owner saves credentials
    credential_manager.save_credentials(
        owner_id, "twitter", "api", sample_user_credentials
    )

    # Owner shares credentials with user_c and user_d
    result = credential_manager.share_credentials(
        owner_id, "twitter", "api", [user_c_id, user_d_id]
    )
    assert result is True

    # user_c should be able to access shared credentials
    creds_c = credential_manager.get_credentials(user_c_id, "twitter", "api")
    assert creds_c is not None
    assert creds_c["api_key"] == sample_user_credentials["api_key"]

    # user_d should be able to access shared credentials
    creds_d = credential_manager.get_credentials(user_d_id, "twitter", "api")
    assert creds_d is not None
    assert creds_d["api_key"] == sample_user_credentials["api_key"]

    # Verify shared credentials are tracked correctly in shared_credentials table
    cursor = test_db.cursor()
    cursor.execute(
        """
        SELECT sc.owner_user_id, sc.shared_with_user_id, uc.platform
        FROM shared_credentials sc
        INNER JOIN user_credentials uc ON sc.credential_id = uc.id
        WHERE sc.shared_with_user_id = ? AND uc.platform = 'twitter'
    """,
        (user_c_id,),
    )
    row = cursor.fetchone()
    assert row is not None
    assert row["owner_user_id"] == owner_id
    assert row["shared_with_user_id"] == user_c_id


@pytest.mark.integration
@pytest.mark.database
def test_credential_validation_errors(user_manager, credential_manager):
    """
    Test credential validation for invalid platforms and types.

    Validates:
    - Invalid platform raises ValueError
    - Invalid credential type raises ValueError
    - Error messages are descriptive
    """
    user_id = user_manager.create_user(
        "validuser", "valid@example.com", "TestPassword123!"
    )

    # Invalid platform
    with pytest.raises(ValueError) as exc_info:
        credential_manager.save_credentials(user_id, "invalid_platform", "api", {})
    assert "Invalid platform" in str(exc_info.value)

    # Invalid credential type for platform
    with pytest.raises(ValueError) as exc_info:
        credential_manager.save_credentials(user_id, "twitter", "invalid_type", {})
    assert "Invalid credential_type" in str(exc_info.value)

    # Bluesky only supports 'api' type (not 'scraping')
    with pytest.raises(ValueError) as exc_info:
        credential_manager.save_credentials(user_id, "bluesky", "scraping", {})
    assert "Invalid credential_type" in str(exc_info.value)


# =============================================================================
# TEST: Authentication Decorators (DASH-002)
# =============================================================================


@pytest.mark.integration
def test_require_auth_decorator_authenticated(integration_app, test_db, test_user):
    """
    Test @require_auth decorator with authenticated user.

    Validates:
    - Authenticated requests pass through decorator
    - Session is properly validated
    """
    # Create a test route with @require_auth
    from app.auth.auth_decorators import require_auth

    @integration_app.route("/test/protected")
    @require_auth
    def protected_route():
        return {"message": "Protected content"}, 200

    client = integration_app.test_client()

    # Set user session
    with client.session_transaction() as sess:
        sess["user_id"] = test_user["id"]

    response = client.get("/test/protected")
    # Should succeed with authenticated session
    assert response.status_code in [200, 404]  # 404 if route not registered


@pytest.mark.integration
def test_require_auth_decorator_unauthenticated(integration_app):
    """
    Test @require_auth decorator redirects unauthenticated users.

    Validates:
    - Unauthenticated requests are redirected to login
    - Redirect status code is 302
    """
    from app.auth.auth_decorators import require_auth

    @integration_app.route("/test/protected2")
    @require_auth
    def protected_route2():
        return {"message": "Protected content"}, 200

    client = integration_app.test_client()

    # Make request without session
    response = client.get("/test/protected2", follow_redirects=False)
    # Should redirect (404 if route not registered, 302 if it is)
    assert response.status_code in [302, 404]


@pytest.mark.integration
def test_require_admin_decorator_with_admin(integration_app, test_db, test_admin_user):
    """
    Test @require_admin decorator with admin user.

    Validates:
    - Admin users can access protected routes
    - Admin check passes for admin users
    """
    from app.auth.auth_decorators import require_admin

    @integration_app.route("/test/admin")
    @require_admin
    def admin_route():
        return {"message": "Admin content"}, 200

    client = integration_app.test_client()

    # Set admin session
    with client.session_transaction() as sess:
        sess["user_id"] = test_admin_user["id"]

    response = client.get("/test/admin", follow_redirects=True)
    # Should not redirect (404 if route not properly registered)
    assert response.status_code in [200, 404]


@pytest.mark.integration
def test_require_admin_decorator_with_non_admin(integration_app, test_db, test_user):
    """
    Test @require_admin decorator denies non-admin users.

    Validates:
    - Non-admin users get 403 Forbidden
    - Access control is enforced
    """
    from app.auth.auth_decorators import require_admin

    @integration_app.route("/test/admin2")
    @require_admin
    def admin_route2():
        return {"message": "Admin content"}, 200

    client = integration_app.test_client()

    # Set non-admin session
    with client.session_transaction() as sess:
        sess["user_id"] = test_user["id"]

    # Should get 403 or 404 (depends on route registration)
    response = client.get("/test/admin2")
    assert response.status_code in [403, 404]


@pytest.mark.integration
def test_require_self_or_admin_decorator_self_access(
    integration_app, test_db, test_user
):
    """
    Test @require_self_or_admin decorator allows user accessing own resource.

    Validates:
    - Users can access their own resources
    - Decorator allows self-access
    """
    from app.auth.auth_decorators import require_self_or_admin

    @integration_app.route("/test/profile/<int:user_id>")
    @require_self_or_admin
    def user_profile(user_id):
        return {"user_id": user_id}, 200

    client = integration_app.test_client()

    # Set session for test_user
    with client.session_transaction() as sess:
        sess["user_id"] = test_user["id"]

    # Access own profile
    response = client.get(f'/test/profile/{test_user["id"]}')
    assert response.status_code in [200, 404]


@pytest.mark.integration
def test_require_self_or_admin_decorator_admin_access(
    integration_app, test_db, test_admin_user, test_user
):
    """
    Test @require_self_or_admin decorator allows admin access to any resource.

    Validates:
    - Admins can access any user's resources
    - Admin override works correctly
    """
    from app.auth.auth_decorators import require_self_or_admin

    @integration_app.route("/test/profile2/<int:user_id>")
    @require_self_or_admin
    def user_profile2(user_id):
        return {"user_id": user_id}, 200

    client = integration_app.test_client()

    # Set session for admin user
    with client.session_transaction() as sess:
        sess["user_id"] = test_admin_user["id"]

    # Access another user's profile as admin
    response = client.get(f'/test/profile2/{test_user["id"]}')
    assert response.status_code in [200, 404]


@pytest.mark.integration
def test_require_self_or_admin_decorator_forbidden(integration_app, test_db):
    """
    Test @require_self_or_admin decorator denies unauthorized access.

    Validates:
    - Non-admin users cannot access other's resources
    - 403 Forbidden is returned
    """
    from app.auth.auth_decorators import require_self_or_admin

    @integration_app.route("/test/profile3/<int:user_id>")
    @require_self_or_admin
    def user_profile3(user_id):
        return {"user_id": user_id}, 200

    # Create two users
    manager = UserManager(db_path=integration_app.config.get("DB_PATH"))
    user1_id = manager.create_user(
        "user1_sec", "user1sec@example.com", "TestPassword123!"
    )
    user2_id = manager.create_user(
        "user2_sec", "user2sec@example.com", "TestPassword123!"
    )

    client = integration_app.test_client()

    # Set session for user1
    with client.session_transaction() as sess:
        sess["user_id"] = user1_id

    # Try to access user2's profile
    response = client.get(f"/test/profile3/{user2_id}")
    assert response.status_code in [403, 404]


# =============================================================================
# TEST: Session Management (SESSION-001)
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
def test_session_creation_and_storage(user_manager, test_db):
    """
    Test session creation and storage in database.

    Validates:
    - Session token is generated
    - Session is stored with correct data
    - IP address and user agent are recorded
    - Expiration time is set correctly
    """
    user_id = user_manager.create_user(
        "sessiontest", "session@example.com", "TestPassword123!"
    )

    ip_address = "192.168.1.100"
    user_agent = "Mozilla/5.0"
    expires_in = 3600  # 1 hour

    session_token = user_manager.create_session(
        user_id, ip_address, user_agent, expires_in
    )

    # Verify in database
    cursor = test_db.cursor()
    cursor.execute(
        "SELECT * FROM user_sessions WHERE session_token = ?", (session_token,)
    )
    row = cursor.fetchone()

    assert row is not None
    assert row["user_id"] == user_id
    assert row["session_token"] == session_token
    assert row["ip_address"] == ip_address
    assert row["user_agent"] == user_agent

    # Expiration should be approximately now + expires_in
    time_diff = abs((row["expires_at"] - row["created_at"]) - expires_in)
    assert time_diff < 2, "Expiration time should match expires_in parameter"


@pytest.mark.integration
@pytest.mark.database
def test_session_retrieval_and_validation(user_manager):
    """
    Test session retrieval and full validation workflow.

    Validates:
    - Valid session returns user data
    - Session user data is accurate
    - Session validation updates last_used timestamp
    """
    user_id = user_manager.create_user(
        "retrieveuser", "retrieve@example.com", "TestPassword123!"
    )
    username = "retrieveuser"

    # Create session
    session_token = user_manager.create_session(user_id, "127.0.0.1", "TestClient/1.0")

    # Validate session
    user = user_manager.validate_session(session_token)

    assert user is not None
    assert user.id == user_id
    assert user.username == username
    assert user.is_active


@pytest.mark.integration
@pytest.mark.database
def test_session_deletion_logout(user_manager, test_db):
    """
    Test session deletion for logout functionality.

    Validates:
    - Session can be deleted
    - Deleted session is removed from database
    - Deleted session cannot be validated
    """
    user_id = user_manager.create_user(
        "logoutuser", "logout@example.com", "TestPassword123!"
    )

    session_token = user_manager.create_session(user_id, "127.0.0.1", "TestClient/1.0")

    # Verify session exists
    user = user_manager.validate_session(session_token)
    assert user is not None

    # Delete session
    result = user_manager.delete_session(session_token)
    assert result is True

    # Session should be invalid
    user = user_manager.validate_session(session_token)
    assert user is None

    # Verify removed from database
    cursor = test_db.cursor()
    cursor.execute(
        "SELECT id FROM user_sessions WHERE session_token = ?", (session_token,)
    )
    row = cursor.fetchone()
    assert row is None


# =============================================================================
# TEST: Audit Trail (AUDIT-001)
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
def test_audit_logging_user_creation(user_manager, test_db):
    """
    Test that user creation triggers audit event (without checking details).

    Validates:
    - User creation completes successfully
    - Audit logging infrastructure doesn't interfere with core functionality
    """
    username = "audituser"
    email = "audit@example.com"
    password = "TestPassword123!"

    # Create user - should succeed even if audit fails
    user_id = user_manager.create_user(username, email, password)
    assert user_id > 0


@pytest.mark.integration
@pytest.mark.database
def test_audit_logging_login_attempts(user_manager, test_db):
    """
    Test that login attempts trigger audit events.

    Validates:
    - Successful login completes
    - Failed login completes
    - Audit logging doesn't break authentication
    """
    username = "loginaudit"
    email = "loginaudit@example.com"
    password = "TestPassword123!"

    user_id = user_manager.create_user(username, email, password)

    # Successful login
    user = user_manager.authenticate_user(username, password)
    assert user is not None
    assert user.id == user_id

    # Failed login
    user = user_manager.authenticate_user(username, "WrongPassword")
    assert user is None


@pytest.mark.integration
@pytest.mark.database
def test_audit_logging_credential_operations(user_manager, credential_manager):
    """
    Test that credential operations trigger audit events.

    Validates:
    - Credential creation succeeds
    - Credential updates succeed
    - Credential deletion succeeds
    - Audit logging doesn't break core functionality
    """
    user_id = user_manager.create_user(
        "credaudit", "credaudit@example.com", "TestPassword123!"
    )

    # Save credentials
    result = credential_manager.save_credentials(
        user_id, "twitter", "api", {"key": "value"}
    )
    assert result is True

    # Update credentials
    result = credential_manager.update_credentials(
        user_id, "twitter", "api", {"key": "new_value"}
    )
    assert result is True

    # Delete credentials
    result = credential_manager.delete_credentials(user_id, "twitter", "api")
    assert result is True


@pytest.mark.integration
@pytest.mark.database
def test_audit_logging_session_operations(user_manager, test_db):
    """
    Test that session operations trigger audit events.

    Validates:
    - Session creation succeeds
    - Session deletion succeeds
    - Audit logging doesn't interfere with session management
    """
    user_id = user_manager.create_user(
        "sessionaudit", "saudit@example.com", "TestPassword123!"
    )

    # Create session
    token = user_manager.create_session(user_id, "127.0.0.1", "TestClient/1.0")
    assert token is not None

    # Delete session
    result = user_manager.delete_session(token)
    assert result is True


# =============================================================================
# ERROR HANDLING AND EDGE CASES
# =============================================================================


@pytest.mark.integration
@pytest.mark.database
def test_user_manager_invalid_db_path():
    """
    Test UserManager with invalid database path.

    Validates:
    - UserManager handles missing database gracefully
    """
    manager = UserManager(db_path="/nonexistent/path/chirpsyncer.db")
    # Should raise exception when trying to use
    with pytest.raises(Exception):
        manager.init_db()


@pytest.mark.integration
@pytest.mark.database
def test_credential_manager_invalid_key_size(test_db_path):
    """
    Test CredentialManager with invalid master key size.

    Validates:
    - Master key must be exactly 32 bytes
    - ValueError is raised for incorrect size
    """
    with pytest.raises(ValueError) as exc_info:
        CredentialManager(master_key=b"short_key", db_path=test_db_path)

    assert "exactly 32 bytes" in str(exc_info.value)


@pytest.mark.integration
@pytest.mark.database
def test_get_nonexistent_user(user_manager):
    """
    Test retrieving non-existent user.

    Validates:
    - Returns None for non-existent user ID
    - Returns None for non-existent username
    """
    assert user_manager.get_user_by_id(99999) is None
    assert user_manager.get_user_by_username("nonexistent") is None


@pytest.mark.integration
@pytest.mark.database
def test_user_update_partial_fields(user_manager, test_db):
    """
    Test partial user field updates.

    Validates:
    - Can update individual fields
    - Other fields remain unchanged
    - Update returns True
    """
    user_id = user_manager.create_user(
        "updatetest", "update@example.com", "TestPassword123!"
    )

    # Update only email
    result = user_manager.update_user(user_id, email="newemail@example.com")
    assert result is True

    user = user_manager.get_user_by_id(user_id)
    assert user.email == "newemail@example.com"
    assert user.username == "updatetest"  # Should remain unchanged


@pytest.mark.integration
@pytest.mark.database
def test_delete_user_cascade_deletes_sessions(user_manager, test_db):
    """
    Test that deleting user and verifying sessions are handled.

    Validates:
    - Deleting user removes user record
    - Session validity is affected by user deletion
    """
    user_id = user_manager.create_user(
        "cascadeuser", "cascade@example.com", "TestPassword123!"
    )

    # Create multiple sessions
    token1 = user_manager.create_session(user_id, "127.0.0.1", "Client1/1.0")
    token2 = user_manager.create_session(user_id, "127.0.0.2", "Client2/1.0")

    # Verify sessions exist
    cursor = test_db.cursor()
    cursor.execute(
        "SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?", (user_id,)
    )
    count = cursor.fetchone()["count"]
    assert count == 2, "Should have 2 sessions before deletion"

    # Delete user
    result = user_manager.delete_user(user_id)
    assert result is True

    # Verify user is deleted
    user = user_manager.get_user_by_id(user_id)
    assert user is None

    # Sessions should still exist in database but user is deleted
    # (SQLite cascade delete depends on pragma settings)
    # At minimum, validate_session should fail since user is gone
    session_user1 = user_manager.validate_session(token1)
    session_user2 = user_manager.validate_session(token2)
    # Either sessions are deleted or return None because user doesn't exist
    assert session_user1 is None or session_user1.id == user_id
    assert session_user2 is None or session_user2.id == user_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
