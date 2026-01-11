"""
Tests for Dashboard Multi-User Routes (Sprint 6 - DASH-002)

Tests authentication, user management, and credential management routes.
Minimum 15 tests covering:
- Authentication routes
- User management routes (admin access control)
- Credential management routes
- Session handling
- Access control enforcement
"""
import pytest
import json
import os
from flask import Flask
from app.user_manager import UserManager
from app.credential_manager import CredentialManager


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database"""
    return str(tmp_path / 'test_dashboard.db')


@pytest.fixture
def master_key():
    """Create test master key for encryption"""
    return os.urandom(32)


@pytest.fixture
def user_manager(db_path):
    """Create UserManager with test database"""
    um = UserManager(db_path)
    um.init_db()
    return um


@pytest.fixture
def credential_manager(db_path, master_key):
    """Create CredentialManager with test database"""
    cm = CredentialManager(master_key, db_path)
    cm.init_db()
    return cm


@pytest.fixture
def test_app(db_path, master_key):
    """Create test Flask app with dashboard routes"""
    from app.dashboard import create_app
    app = create_app(db_path=db_path, master_key=master_key)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing
    return app


@pytest.fixture
def client(test_app):
    """Create test client"""
    return test_app.test_client()


@pytest.fixture
def regular_user(user_manager):
    """Create regular test user"""
    user_id = user_manager.create_user('testuser', 'test@example.com', 'Test123!@#', is_admin=False)
    return user_manager.get_user_by_id(user_id)


@pytest.fixture
def admin_user(user_manager):
    """Create admin test user"""
    user_id = user_manager.create_user('admin', 'admin@example.com', 'Admin123!@#', is_admin=True)
    return user_manager.get_user_by_id(user_id)


# ============================================================================
# AUTHENTICATION ROUTES TESTS
# ============================================================================

# Test 1: GET /login displays login page
def test_login_get(client):
    """Test GET /login displays login page"""
    response = client.get('/login')
    assert response.status_code == 200
    assert b'login' in response.data.lower() or b'username' in response.data.lower()


# Test 2: POST /login with valid credentials
def test_login_post_success(client, regular_user):
    """Test POST /login with valid credentials creates session"""
    response = client.post('/login', data={
        'username': 'testuser',
        'password': 'Test123!@#'
    }, follow_redirects=True)

    assert response.status_code == 200
    # Check session was created
    with client.session_transaction() as sess:
        assert 'user_id' in sess
        assert sess['user_id'] == regular_user.id


# Test 3: POST /login with invalid credentials
def test_login_post_invalid(client, regular_user):
    """Test POST /login with invalid credentials fails"""
    response = client.post('/login', data={
        'username': 'testuser',
        'password': 'WrongPassword123!@#'
    }, follow_redirects=True)

    # Should not create session
    with client.session_transaction() as sess:
        assert 'user_id' not in sess


# Test 4: POST /logout clears session
def test_logout(client, regular_user):
    """Test POST /logout clears session"""
    # Login first
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    # Logout
    response = client.post('/logout', follow_redirects=True)
    assert response.status_code == 200

    # Session should be cleared
    with client.session_transaction() as sess:
        assert 'user_id' not in sess


# Test 5: GET /register displays registration page
def test_register_get(client):
    """Test GET /register displays registration page"""
    response = client.get('/register')
    assert response.status_code == 200
    assert b'register' in response.data.lower() or b'sign up' in response.data.lower()


# Test 6: POST /register creates new user
def test_register_post_success(client, user_manager):
    """Test POST /register creates new user"""
    response = client.post('/register', data={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'NewPass123!@#',
        'confirm_password': 'NewPass123!@#'
    }, follow_redirects=True)

    # Check user was created
    user = user_manager.get_user_by_username('newuser')
    assert user is not None
    assert user.email == 'new@example.com'
    assert user.is_admin is False


# Test 7: /api/auth/check returns user status
def test_auth_check_authenticated(client, regular_user):
    """Test /api/auth/check returns user info when authenticated"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/api/auth/check')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['authenticated'] is True
    assert data['user_id'] == regular_user.id


# Test 8: /api/auth/check returns not authenticated
def test_auth_check_unauthenticated(client):
    """Test /api/auth/check returns not authenticated"""
    response = client.get('/api/auth/check')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['authenticated'] is False


# ============================================================================
# USER MANAGEMENT ROUTES TESTS
# ============================================================================

# Test 9: GET /users requires admin
def test_users_list_requires_admin(client, regular_user):
    """Test GET /users requires admin permission"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/users')
    assert response.status_code == 403  # Forbidden


# Test 10: GET /users shows user list for admin
def test_users_list_admin(client, admin_user, regular_user):
    """Test GET /users shows user list for admin"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.get('/users')
    assert response.status_code == 200
    # Should show both admin and regular user
    assert admin_user.username.encode() in response.data
    assert regular_user.username.encode() in response.data


# Test 11: GET /users/<id> allows self access
def test_user_detail_self(client, regular_user):
    """Test GET /users/<id> allows user to view own profile"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get(f'/users/{regular_user.id}')
    assert response.status_code == 200
    assert regular_user.username.encode() in response.data


# Test 12: POST /users/<id>/edit allows user to edit own profile
def test_user_edit_self(client, regular_user, user_manager):
    """Test POST /users/<id>/edit allows user to edit own profile"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/users/{regular_user.id}/edit', data={
        'email': 'newemail@example.com'
    }, follow_redirects=True)

    # Check email was updated
    updated_user = user_manager.get_user_by_id(regular_user.id)
    assert updated_user.email == 'newemail@example.com'


# Test 13: POST /users/<id>/delete requires admin
def test_user_delete_requires_admin(client, regular_user):
    """Test POST /users/<id>/delete requires admin permission"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/users/{regular_user.id}/delete')
    assert response.status_code == 403  # Forbidden


# Test 14: POST /users/<id>/delete allows admin to delete user
def test_user_delete_admin(client, admin_user, regular_user, user_manager):
    """Test POST /users/<id>/delete allows admin to delete user"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.post(f'/users/{regular_user.id}/delete', follow_redirects=True)

    # Check user was deleted
    deleted_user = user_manager.get_user_by_id(regular_user.id)
    assert deleted_user is None


# ============================================================================
# CREDENTIAL MANAGEMENT ROUTES TESTS
# ============================================================================

# Test 15: GET /credentials requires authentication
def test_credentials_requires_auth(client):
    """Test GET /credentials requires authentication"""
    response = client.get('/credentials')
    assert response.status_code == 302  # Redirect to login
    assert '/login' in response.location


# Test 16: GET /credentials shows user's credentials
def test_credentials_list(client, regular_user, credential_manager):
    """Test GET /credentials shows user's credentials"""
    # Create some credentials
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'scraping',
        {'username': 'twitteruser', 'password': 'pass'}
    )

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/credentials')
    assert response.status_code == 200
    # Template uses uppercase for display
    assert b'TWITTER' in response.data or b'twitter' in response.data


# Test 17: POST /credentials/add creates new credentials
def test_credentials_add(client, regular_user, credential_manager):
    """Test POST /credentials/add creates new credentials"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/add', data={
        'platform': 'bluesky',
        'credential_type': 'api',
        'username': 'user.bsky.social',
        'password': 'app-password'
    }, follow_redirects=True)

    # Check credentials were created
    creds = credential_manager.get_credentials(regular_user.id, 'bluesky', 'api')
    assert creds is not None
    assert creds['username'] == 'user.bsky.social'


# Test 18: POST /credentials/<id>/edit updates credentials
def test_credentials_edit(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/edit updates credentials"""
    # Create credentials first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'scraping',
        {'username': 'olduser', 'password': 'oldpass'}
    )

    # Get credential ID
    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/credentials/{cred_id}/edit', data={
        'username': 'newuser',
        'password': 'newpass'
    }, follow_redirects=True)

    # Check credentials were updated
    updated_creds = credential_manager.get_credentials(regular_user.id, 'twitter', 'scraping')
    assert updated_creds['username'] == 'newuser'


# Test 19: POST /credentials/<id>/delete removes credentials
def test_credentials_delete(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/delete removes credentials"""
    # Create credentials first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'scraping',
        {'username': 'user', 'password': 'pass'}
    )

    # Get credential ID
    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/credentials/{cred_id}/delete', follow_redirects=True)

    # Check credentials were deleted
    deleted_creds = credential_manager.get_credentials(regular_user.id, 'twitter', 'scraping')
    assert deleted_creds is None


# Test 20: POST /credentials/<id>/test validates credentials
def test_credentials_test(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/test validates credentials"""
    # Create credentials first
    credential_manager.save_credentials(
        regular_user.id, 'bluesky', 'api',
        {'username': 'user.bsky.social', 'password': 'app-pass'}
    )

    # Get credential ID
    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/credentials/{cred_id}/test')
    assert response.status_code == 200
    # Should return JSON with test result
    data = json.loads(response.data)
    assert 'success' in data


# Test 21: POST /credentials/share shares credentials with other users
def test_credentials_share(client, admin_user, regular_user, credential_manager):
    """Test POST /credentials/share shares credentials with other users"""
    # Create credentials as admin
    credential_manager.save_credentials(
        admin_user.id, 'twitter', 'api',
        {'api_key': 'key', 'api_secret': 'secret'}
    )

    # Get credential ID
    creds_list = credential_manager.list_user_credentials(admin_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.post('/credentials/share', data={
        'credential_id': cred_id,
        'user_ids': str(regular_user.id)
    }, follow_redirects=True)

    # Check credentials were shared
    shared = credential_manager.get_shared_credentials(regular_user.id)
    assert len(shared) > 0
    assert shared[0]['platform'] == 'twitter'
