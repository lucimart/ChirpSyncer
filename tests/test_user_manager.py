"""
Tests for UserManager (Sprint 6 - USER-001)

Comprehensive tests for user management system with bcrypt authentication.
Tests cover user creation, authentication, sessions, permissions, and rate limiting.
"""
import pytest
import time
import os
import tempfile
from unittest.mock import patch, MagicMock
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.auth.user_manager import UserManager, User
from app.auth.security_utils import RateLimiter


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def user_manager(temp_db):
    """Create UserManager instance with test database"""
    manager = UserManager(db_path=temp_db)
    manager.init_db()
    return manager


class TestUserCreation:
    """Tests for user creation"""

    def test_create_user_success(self, user_manager):
        """Test creating a new user successfully"""
        user_id = user_manager.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!'
        )

        assert user_id is not None
        assert user_id > 0

        # Verify user exists
        user = user_manager.get_user_by_id(user_id)
        assert user is not None
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.is_active is True
        assert user.is_admin is False

    def test_create_user_duplicate_username(self, user_manager):
        """Test creating user with duplicate username fails"""
        user_manager.create_user('testuser', 'test1@example.com', 'Pass123!')

        # Attempt to create with same username
        with pytest.raises(ValueError, match='Username already exists'):
            user_manager.create_user('testuser', 'test2@example.com', 'Pass456!')

    def test_create_user_duplicate_email(self, user_manager):
        """Test creating user with duplicate email fails"""
        user_manager.create_user('user1', 'test@example.com', 'Pass123!')

        # Attempt to create with same email
        with pytest.raises(ValueError, match='Email already exists'):
            user_manager.create_user('user2', 'test@example.com', 'Pass456!')

    def test_create_user_weak_password(self, user_manager):
        """Test creating user with weak password fails"""
        with pytest.raises(ValueError, match='Password does not meet security requirements'):
            user_manager.create_user('testuser', 'test@example.com', 'weak')

    def test_create_admin_user(self, user_manager):
        """Test creating admin user"""
        user_id = user_manager.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            is_admin=True
        )

        user = user_manager.get_user_by_id(user_id)
        assert user.is_admin is True


class TestUserAuthentication:
    """Tests for user authentication"""

    def test_authenticate_user_success(self, user_manager):
        """Test successful authentication"""
        user_manager.create_user('testuser', 'test@example.com', 'SecurePass123!')

        user = user_manager.authenticate_user('testuser', 'SecurePass123!')
        assert user is not None
        assert user.username == 'testuser'

    def test_authenticate_user_wrong_password(self, user_manager):
        """Test authentication with wrong password"""
        user_manager.create_user('testuser', 'test@example.com', 'SecurePass123!')

        user = user_manager.authenticate_user('testuser', 'WrongPassword!')
        assert user is None

    def test_authenticate_user_nonexistent(self, user_manager):
        """Test authentication with non-existent username"""
        user = user_manager.authenticate_user('nonexistent', 'SomePass123!')
        assert user is None

    def test_authenticate_inactive_user(self, user_manager):
        """Test authentication with inactive user"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'SecurePass123!')
        user_manager.update_user(user_id, is_active=False)

        user = user_manager.authenticate_user('testuser', 'SecurePass123!')
        assert user is None

    def test_authenticate_updates_last_login(self, user_manager):
        """Test that successful authentication updates last_login"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'SecurePass123!')

        user_before = user_manager.get_user_by_id(user_id)
        assert user_before.last_login is None

        time.sleep(1.1)  # Ensure different timestamp
        user_manager.authenticate_user('testuser', 'SecurePass123!')

        user_after = user_manager.get_user_by_id(user_id)
        assert user_after.last_login is not None
        assert user_after.last_login > user_before.created_at


class TestUserRetrieval:
    """Tests for user retrieval methods"""

    def test_get_user_by_id(self, user_manager):
        """Test retrieving user by ID"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        user = user_manager.get_user_by_id(user_id)
        assert user is not None
        assert user.id == user_id
        assert user.username == 'testuser'

    def test_get_user_by_id_nonexistent(self, user_manager):
        """Test retrieving non-existent user by ID"""
        user = user_manager.get_user_by_id(9999)
        assert user is None

    def test_get_user_by_username(self, user_manager):
        """Test retrieving user by username"""
        user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        user = user_manager.get_user_by_username('testuser')
        assert user is not None
        assert user.username == 'testuser'

    def test_get_user_by_username_nonexistent(self, user_manager):
        """Test retrieving non-existent user by username"""
        user = user_manager.get_user_by_username('nonexistent')
        assert user is None


class TestUserUpdate:
    """Tests for user updates"""

    def test_update_user_email(self, user_manager):
        """Test updating user email"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        result = user_manager.update_user(user_id, email='newemail@example.com')
        assert result is True

        user = user_manager.get_user_by_id(user_id)
        assert user.email == 'newemail@example.com'

    def test_update_user_password(self, user_manager):
        """Test updating user password"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'OldPass123!')

        # Update password
        result = user_manager.update_user(user_id, password='NewPass456!')
        assert result is True

        # Verify old password doesn't work
        user = user_manager.authenticate_user('testuser', 'OldPass123!')
        assert user is None

        # Verify new password works
        user = user_manager.authenticate_user('testuser', 'NewPass456!')
        assert user is not None

    def test_update_user_is_active(self, user_manager):
        """Test updating user active status"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        result = user_manager.update_user(user_id, is_active=False)
        assert result is True

        user = user_manager.get_user_by_id(user_id)
        assert user.is_active is False

    def test_update_nonexistent_user(self, user_manager):
        """Test updating non-existent user"""
        result = user_manager.update_user(9999, email='test@example.com')
        assert result is False


class TestUserDeletion:
    """Tests for user deletion"""

    def test_delete_user(self, user_manager):
        """Test deleting a user"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        result = user_manager.delete_user(user_id)
        assert result is True

        # Verify user no longer exists
        user = user_manager.get_user_by_id(user_id)
        assert user is None

    def test_delete_nonexistent_user(self, user_manager):
        """Test deleting non-existent user"""
        result = user_manager.delete_user(9999)
        assert result is False


class TestUserListing:
    """Tests for listing users"""

    def test_list_users(self, user_manager):
        """Test listing all users"""
        user_manager.create_user('user1', 'user1@example.com', 'Pass123!')
        user_manager.create_user('user2', 'user2@example.com', 'Pass123!')
        user_manager.create_user('admin', 'admin@example.com', 'Pass123!', is_admin=True)

        users = user_manager.list_users()
        assert len(users) == 3
        assert all(isinstance(u, User) for u in users)

    def test_list_users_admin_only(self, user_manager):
        """Test listing only admin users"""
        user_manager.create_user('user1', 'user1@example.com', 'Pass123!')
        user_manager.create_user('admin1', 'admin1@example.com', 'Pass123!', is_admin=True)
        user_manager.create_user('admin2', 'admin2@example.com', 'Pass123!', is_admin=True)

        admins = user_manager.list_users(admin_only=True)
        assert len(admins) == 2
        assert all(u.is_admin for u in admins)

    def test_list_users_active_only(self, user_manager):
        """Test listing only active users"""
        user_id1 = user_manager.create_user('user1', 'user1@example.com', 'Pass123!')
        user_manager.create_user('user2', 'user2@example.com', 'Pass123!')

        # Deactivate one user
        user_manager.update_user(user_id1, is_active=False)

        active_users = user_manager.list_users(active_only=True)
        assert len(active_users) == 1
        assert active_users[0].username == 'user2'


class TestSessionManagement:
    """Tests for session management"""

    def test_create_session(self, user_manager):
        """Test creating a new session"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        token = user_manager.create_session(
            user_id=user_id,
            ip_address='127.0.0.1',
            user_agent='TestAgent/1.0'
        )

        assert token is not None
        assert len(token) > 20  # Should be a reasonably long token

    def test_validate_session_success(self, user_manager):
        """Test validating a valid session"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')
        token = user_manager.create_session(user_id, '127.0.0.1', 'TestAgent/1.0')

        user = user_manager.validate_session(token)
        assert user is not None
        assert user.id == user_id
        assert user.username == 'testuser'

    def test_validate_session_invalid_token(self, user_manager):
        """Test validating an invalid session token"""
        user = user_manager.validate_session('invalid_token_12345')
        assert user is None

    def test_validate_session_expired(self, user_manager):
        """Test validating an expired session"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        # Create session with very short expiry (1 second)
        token = user_manager.create_session(
            user_id=user_id,
            ip_address='127.0.0.1',
            user_agent='TestAgent/1.0',
            expires_in=1
        )

        # Wait for expiration
        time.sleep(2)

        user = user_manager.validate_session(token)
        assert user is None

    def test_delete_session(self, user_manager):
        """Test deleting a session (logout)"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')
        token = user_manager.create_session(user_id, '127.0.0.1', 'TestAgent/1.0')

        # Verify session is valid
        assert user_manager.validate_session(token) is not None

        # Delete session
        result = user_manager.delete_session(token)
        assert result is True

        # Verify session is no longer valid
        assert user_manager.validate_session(token) is None

    def test_delete_nonexistent_session(self, user_manager):
        """Test deleting a non-existent session"""
        result = user_manager.delete_session('nonexistent_token')
        assert result is False


class TestPasswordHashing:
    """Tests for password hashing with bcrypt"""

    def test_password_is_hashed(self, user_manager):
        """Test that passwords are stored hashed, not in plain text"""
        password = 'SecurePass123!'
        user_id = user_manager.create_user('testuser', 'test@example.com', password)

        # Get the user directly from DB
        user = user_manager.get_user_by_id(user_id)

        # Password hash should not equal plain password
        assert user.password_hash != password

        # Password hash should start with bcrypt prefix
        assert user.password_hash.startswith('$2b$')

    def test_bcrypt_verification(self, user_manager):
        """Test that bcrypt verification works correctly"""
        import bcrypt

        password = 'SecurePass123!'
        user_id = user_manager.create_user('testuser', 'test@example.com', password)
        user = user_manager.get_user_by_id(user_id)

        # Verify password using bcrypt
        assert bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])


class TestUpdateUserExceptionHandling:
    """Tests for exception handling during user update"""

    def test_update_user_no_updates_provided(self, user_manager):
        """Test update_user returns False when no valid fields provided"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'Pass123!')

        result = user_manager.update_user(user_id)
        assert result is False

    def test_update_user_bcrypt_error(self, user_manager, monkeypatch):
        """Test exception handling when bcrypt.hashpw fails during password update"""
        user_id = user_manager.create_user('testuser', 'test@example.com', 'OldPass123!')

        def mock_hashpw(password, salt):
            raise ValueError('bcrypt error: invalid input')

        monkeypatch.setattr('bcrypt.hashpw', mock_hashpw)

        result = user_manager.update_user(user_id, password='NewPass456!')
        assert result is False
