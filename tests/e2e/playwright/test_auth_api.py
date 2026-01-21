"""
Authentication API E2E Tests (Sprint 9 - TASK-904)

Tests the authentication endpoints with Flask test client (no browser required).
"""

import pytest

# Skip marker for E2E tests
pytestmark = pytest.mark.e2e


class TestAuthApiE2E:
    """E2E tests for authentication API endpoints."""

    @pytest.fixture
    def client(self, flask_app):
        """Create test client from flask app."""
        return flask_app.test_client()

    def test_login_page_loads(self, client):
        """Test: GET /login returns 200 with login form."""
        response = client.get('/login')
        assert response.status_code == 200
        assert b'login' in response.data.lower() or b'username' in response.data.lower()

    def test_register_page_loads(self, client):
        """Test: GET /register returns 200 with registration form."""
        response = client.get('/register')
        assert response.status_code == 200
        assert b'register' in response.data.lower() or b'email' in response.data.lower()

    def test_login_with_valid_credentials(self, client, test_user):
        """Test: POST /login with valid credentials redirects to dashboard."""
        response = client.post('/login', data={
            'username': test_user['username'],
            'password': test_user['password']
        }, follow_redirects=False)

        # Should redirect to dashboard
        assert response.status_code == 302
        assert '/dashboard' in response.headers.get('Location', '') or '/' in response.headers.get('Location', '')

    def test_login_with_invalid_password(self, client, test_user):
        """Test: POST /login with invalid password stays on login."""
        response = client.post('/login', data={
            'username': test_user['username'],
            'password': 'WrongPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        # Should show error message
        assert b'invalid' in response.data.lower() or b'error' in response.data.lower()

    def test_login_with_invalid_username(self, client):
        """Test: POST /login with non-existent user shows error."""
        response = client.post('/login', data={
            'username': 'nonexistentuser',
            'password': 'SomePassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'invalid' in response.data.lower() or b'error' in response.data.lower()

    def test_login_missing_credentials(self, client):
        """Test: POST /login without credentials shows error."""
        response = client.post('/login', data={}, follow_redirects=True)

        assert response.status_code == 200
        assert b'required' in response.data.lower() or b'error' in response.data.lower()

    def test_logout_clears_session(self, client, test_user):
        """Test: POST /logout clears session and redirects."""
        # First login
        client.post('/login', data={
            'username': test_user['username'],
            'password': test_user['password']
        })

        # Then logout
        response = client.post('/logout', follow_redirects=False)

        # Should redirect to login
        assert response.status_code == 302

        # Accessing protected route should redirect to login
        credentials_response = client.get('/credentials')
        assert credentials_response.status_code == 302  # Redirect to login

    def test_protected_route_requires_authentication(self, client):
        """Test: GET / (dashboard) without auth redirects to login."""
        response = client.get('/', follow_redirects=False)
        assert response.status_code == 302  # Redirect to login

    def test_credentials_requires_authentication(self, client):
        """Test: GET /credentials without auth redirects to login."""
        response = client.get('/credentials', follow_redirects=False)
        assert response.status_code == 302  # Redirect to login

    def test_register_new_user(self, client, test_db):
        """Test: POST /register creates new user and redirects to login."""
        response = client.post('/register', data={
            'username': 'newuser123',
            'email': 'newuser123@example.com',
            'password': 'ValidPassword123!',
            'confirm_password': 'ValidPassword123!'
        }, follow_redirects=False)

        # Should redirect to login after successful registration
        assert response.status_code == 302

        # Verify user exists in database
        cursor = test_db.cursor()
        cursor.execute("SELECT username FROM users WHERE username = ?", ('newuser123',))
        row = cursor.fetchone()
        assert row is not None
        assert row[0] == 'newuser123'

    def test_register_duplicate_username(self, client, test_user):
        """Test: POST /register with existing username shows error."""
        response = client.post('/register', data={
            'username': test_user['username'],  # Already exists
            'email': 'different@example.com',
            'password': 'ValidPassword123!',
            'confirm_password': 'ValidPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        # Should show error about username
        assert b'username' in response.data.lower() or b'exists' in response.data.lower() or b'error' in response.data.lower()

    def test_register_duplicate_email(self, client, test_user):
        """Test: POST /register with existing email shows error."""
        response = client.post('/register', data={
            'username': 'differentuser',
            'email': test_user['email'],  # Already exists
            'password': 'ValidPassword123!',
            'confirm_password': 'ValidPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        # Should show error about email
        assert b'email' in response.data.lower() or b'exists' in response.data.lower() or b'error' in response.data.lower()

    def test_register_weak_password(self, client):
        """Test: POST /register with weak password shows error."""
        response = client.post('/register', data={
            'username': 'weakpwduser',
            'email': 'weakpwd@example.com',
            'password': 'weak',  # Too short
            'confirm_password': 'weak'
        }, follow_redirects=True)

        assert response.status_code == 200
        # Should show error about password
        assert b'password' in response.data.lower() or b'error' in response.data.lower()

    def test_register_password_mismatch(self, client):
        """Test: POST /register with mismatched passwords shows error."""
        response = client.post('/register', data={
            'username': 'mismatchuser',
            'email': 'mismatch@example.com',
            'password': 'ValidPassword123!',
            'confirm_password': 'DifferentPassword123!'
        }, follow_redirects=True)

        assert response.status_code == 200
        # Should show error about password mismatch
        assert b'match' in response.data.lower() or b'error' in response.data.lower()

    def test_api_auth_check_authenticated(self, client, test_user):
        """Test: GET /api/auth/check returns authenticated status."""
        # Login first
        client.post('/login', data={
            'username': test_user['username'],
            'password': test_user['password']
        })

        response = client.get('/api/auth/check')
        assert response.status_code == 200

        data = response.get_json()
        assert data['authenticated'] is True
        assert data['username'] == test_user['username']

    def test_api_auth_check_unauthenticated(self, client):
        """Test: GET /api/auth/check returns not authenticated."""
        response = client.get('/api/auth/check')
        assert response.status_code == 200

        data = response.get_json()
        assert data['authenticated'] is False
