"""
Tests for Auth Decorators (Sprint 6 - DASH-002)

Tests authentication decorators:
- @require_auth - requires authenticated user
- @require_admin - requires admin user
- @require_self_or_admin - requires user is self or admin
"""
import pytest
from flask import Flask, session
from app.auth.auth_decorators import require_auth, require_admin, require_self_or_admin
from app.auth.user_manager import UserManager


@pytest.fixture
def test_app(db_path):
    """Create test Flask app with session support"""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'test-secret-key-for-testing'
    app.config['TESTING'] = True
    app.config['DB_PATH'] = db_path

    # Register test routes
    @app.route('/protected')
    @require_auth
    def protected_route():
        return 'Protected content', 200

    @app.route('/admin-only')
    @require_admin
    def admin_only_route():
        return 'Admin content', 200

    @app.route('/user/<int:user_id>/profile')
    @require_self_or_admin
    def user_profile(user_id):
        return f'User {user_id} profile', 200

    @app.route('/login')
    def login():
        return 'Login page', 200

    return app


@pytest.fixture
def client(test_app):
    """Create test client"""
    return test_app.test_client()


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database"""
    return str(tmp_path / 'test_auth.db')


@pytest.fixture
def user_manager(db_path):
    """Create UserManager with test database"""
    um = UserManager(db_path)
    um.init_db()
    return um


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


# Test 1: require_auth allows authenticated users
def test_require_auth_allows_authenticated_user(client, regular_user):
    """Test @require_auth allows authenticated users to access protected routes"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/protected')
    assert response.status_code == 200
    assert b'Protected content' in response.data


# Test 2: require_auth redirects unauthenticated users
def test_require_auth_redirects_unauthenticated(client):
    """Test @require_auth redirects unauthenticated users to login"""
    response = client.get('/protected')
    assert response.status_code == 302
    assert '/login' in response.location


# Test 3: require_admin allows admin users
def test_require_admin_allows_admin(client, admin_user):
    """Test @require_admin allows admin users to access admin routes"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.get('/admin-only')
    assert response.status_code == 200
    assert b'Admin content' in response.data


# Test 4: require_admin blocks regular users
def test_require_admin_blocks_regular_user(client, regular_user):
    """Test @require_admin blocks non-admin users with 403 Forbidden"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/admin-only')
    assert response.status_code == 403


# Test 5: require_admin redirects unauthenticated users
def test_require_admin_redirects_unauthenticated(client):
    """Test @require_admin redirects unauthenticated users to login"""
    response = client.get('/admin-only')
    assert response.status_code == 302
    assert '/login' in response.location


# Test 6: require_self_or_admin allows user to access own profile
def test_require_self_or_admin_allows_self(client, regular_user):
    """Test @require_self_or_admin allows users to access their own profile"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get(f'/user/{regular_user.id}/profile')
    assert response.status_code == 200
    assert f'User {regular_user.id} profile'.encode() in response.data


# Test 7: require_self_or_admin blocks user from accessing other profiles
def test_require_self_or_admin_blocks_other_user(client, regular_user, user_manager):
    """Test @require_self_or_admin blocks users from accessing other user profiles"""
    # Create another user
    other_user_id = user_manager.create_user('other', 'other@example.com', 'Other123!@#', is_admin=False)

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get(f'/user/{other_user_id}/profile')
    assert response.status_code == 403


# Test 8: require_self_or_admin allows admin to access any profile
def test_require_self_or_admin_allows_admin_any_profile(client, admin_user, regular_user):
    """Test @require_self_or_admin allows admins to access any user profile"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.get(f'/user/{regular_user.id}/profile')
    assert response.status_code == 200
    assert f'User {regular_user.id} profile'.encode() in response.data


# Test 9: require_self_or_admin redirects unauthenticated users
def test_require_self_or_admin_redirects_unauthenticated(client):
    """Test @require_self_or_admin redirects unauthenticated users to login"""
    response = client.get('/user/1/profile')
    assert response.status_code == 302
    assert '/login' in response.location
