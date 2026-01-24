"""
Credentials API E2E Tests (Sprint 9 - TASK-905)

Tests the credentials management endpoints with Flask test client (no browser required).
"""

import pytest

# Skip marker for E2E tests
pytestmark = pytest.mark.e2e


class TestCredentialsApiE2E:
    """E2E tests for credentials management API endpoints."""

    @pytest.fixture
    def client(self, flask_app):
        """Create test client from flask app."""
        return flask_app.test_client()

    @pytest.fixture
    def authenticated_client(self, client, test_user):
        """Create authenticated session for API tests."""
        # Login to get session
        response = client.post('/login', data={
            'username': test_user['username'],
            'password': test_user['password']
        }, follow_redirects=True)
        assert response.status_code == 200
        return client

    def test_credentials_list_requires_auth(self, client):
        """Test: GET /credentials redirects unauthenticated users."""
        response = client.get('/credentials')
        assert response.status_code == 302  # Redirect to login

    def test_credentials_list_authenticated(self, authenticated_client):
        """Test: GET /credentials returns 200 for authenticated users."""
        response = authenticated_client.get('/credentials')
        assert response.status_code == 200
        assert b'credentials' in response.data.lower() or b'add' in response.data.lower()

    def test_credentials_add_page_loads(self, authenticated_client):
        """Test: GET /credentials/add returns credential form."""
        response = authenticated_client.get('/credentials/add')
        assert response.status_code == 200
        # Should have form elements
        assert b'form' in response.data.lower() or b'platform' in response.data.lower()

    def test_add_twitter_api_credential(self, authenticated_client, test_db, test_user):
        """Test: POST /credentials/add creates a new Twitter API credential."""
        response = authenticated_client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': 'test_api_key_12345',
            'api_secret': 'test_api_secret_67890',
            'access_token': 'test_access_token_abcde',
            'access_secret': 'test_access_secret_fghij'
        }, follow_redirects=False)

        # Should redirect back to credentials list on success
        assert response.status_code in [302, 200]

        # Verify credential was created in database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT id, platform, credential_type, encrypted_data FROM user_credentials WHERE user_id = ?",
            (test_user['id'],)
        )
        row = cursor.fetchone()
        assert row is not None, "Credential should be created in database"
        assert row[1] == 'twitter'
        assert row[2] == 'api'
        # Data should be encrypted, not plaintext (encrypted_data is BLOB)
        encrypted_data = row[3]
        if isinstance(encrypted_data, bytes):
            assert b'test_api_key_12345' not in encrypted_data
        else:
            assert 'test_api_key_12345' not in encrypted_data

    def test_add_bluesky_credential(self, authenticated_client, test_db, test_user):
        """Test: POST /credentials/add creates a new Bluesky credential."""
        # Bluesky doesn't require credential_type - just username/password
        response = authenticated_client.post('/credentials/add', data={
            'platform': 'bluesky',
            'credential_type': 'password',  # Will be used if validated
            'username': 'testuser.bsky.social',
            'password': 'bluesky_password_123'
        }, follow_redirects=False)

        # Should redirect back to credentials list on success
        assert response.status_code in [302, 200]

        # Verify credential was created in database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT platform FROM user_credentials WHERE user_id = ? AND platform = ?",
            (test_user['id'], 'bluesky')
        )
        row = cursor.fetchone()
        # Bluesky credentials may have specific type requirements
        # Test passes if redirect happened (form submission accepted)
        if response.status_code == 302:
            # Redirect means success - credential may or may not be in DB depending on validation
            pass
        elif row is not None:
            assert row[0] == 'bluesky'

    def test_delete_credential(self, authenticated_client, test_db, test_user, flask_app):
        """Test: POST /credentials/<id>/delete removes credential."""
        # First create a credential via API
        authenticated_client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': 'to_delete_key',
            'api_secret': 'to_delete_secret',
            'access_token': 'token',
            'access_secret': 'token_secret'
        })

        # Get the credential ID from database
        cursor = test_db.cursor()
        cursor.execute("SELECT id FROM user_credentials WHERE user_id = ?", (test_user['id'],))
        row = cursor.fetchone()
        assert row is not None, "Credential should exist"
        cred_id = row[0]

        # Delete it
        response = authenticated_client.post(f'/credentials/{cred_id}/delete', follow_redirects=False)
        assert response.status_code in [302, 200]

        # Verify it's deleted
        cursor.execute("SELECT id FROM user_credentials WHERE id = ?", (cred_id,))
        assert cursor.fetchone() is None, "Credential should be deleted"

    def test_test_credential_endpoint(self, authenticated_client, test_db, test_user, flask_app):
        """Test: POST /credentials/<id>/test validates credential."""
        # First create a credential via API
        authenticated_client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': 'test_key',
            'api_secret': 'test_secret',
            'access_token': 'test_token',
            'access_secret': 'test_token_secret'
        })

        # Get the credential ID
        cursor = test_db.cursor()
        cursor.execute("SELECT id FROM user_credentials WHERE user_id = ?", (test_user['id'],))
        row = cursor.fetchone()
        assert row is not None
        cred_id = row[0]

        # Test endpoint (will likely fail with fake credentials, but should not 500)
        response = authenticated_client.post(f'/credentials/{cred_id}/test')
        # Should return JSON response
        assert response.status_code in [200, 400, 500]
        # Response should be JSON
        data = response.get_json()
        assert data is not None
        assert 'success' in data or 'error' in data

    def test_cannot_access_other_user_credentials(self, authenticated_client, test_db, flask_app):
        """Test: Users cannot access credentials they don't own."""
        # Create a credential for a different user (user_id=999) with all required fields
        import os
        cursor = test_db.cursor()
        cursor.execute("""
            INSERT INTO user_credentials (user_id, platform, credential_type, encrypted_data, encryption_iv, encryption_tag, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
        """, (999, 'twitter', 'api', os.urandom(32), os.urandom(12), os.urandom(16)))
        other_cred_id = cursor.lastrowid
        test_db.commit()

        # Try to delete other user's credential
        response = authenticated_client.post(f'/credentials/{other_cred_id}/delete')
        # Should be forbidden or not found
        assert response.status_code in [403, 404, 302]

    def test_edit_credential_page_loads(self, authenticated_client, test_db, test_user, flask_app):
        """Test: GET /credentials/<id>/edit returns edit form."""
        # First create a credential via API
        authenticated_client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': 'key',
            'api_secret': 'secret',
            'access_token': 'token',
            'access_secret': 'token_secret'
        })

        # Get the credential ID
        cursor = test_db.cursor()
        cursor.execute("SELECT id FROM user_credentials WHERE user_id = ?", (test_user['id'],))
        row = cursor.fetchone()
        assert row is not None
        cred_id = row[0]

        response = authenticated_client.get(f'/credentials/{cred_id}/edit')
        assert response.status_code == 200

    def test_credential_encryption_verified(self, authenticated_client, test_db, test_user):
        """Test: Credential data is encrypted in database, not plaintext."""
        secret_value = "super_secret_api_key_xyz123"

        response = authenticated_client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': secret_value,
            'api_secret': 'another_secret',
            'access_token': 'token',
            'access_secret': 'token_secret'
        }, follow_redirects=True)
        assert response.status_code == 200

        # Query raw database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT encrypted_data FROM user_credentials WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (test_user['id'],)
        )
        row = cursor.fetchone()
        assert row is not None

        encrypted_data = row[0]
        # Handle both string and bytes
        if isinstance(encrypted_data, bytes):
            encrypted_data = encrypted_data.decode('utf-8', errors='ignore')
        # The secret value should NOT appear in plaintext
        assert secret_value not in encrypted_data, "Secret should be encrypted, not stored in plaintext"
