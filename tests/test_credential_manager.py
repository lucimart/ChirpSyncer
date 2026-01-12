"""
Tests for CredentialManager (Sprint 6 - CRED-001)

Comprehensive tests for encrypted credential storage with AES-256-GCM.
Tests cover encryption/decryption, CRUD operations, sharing, validation,
and multiple credential types.
"""
import pytest
import os
import tempfile
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.auth.credential_manager import CredentialManager
from app.auth.user_manager import UserManager


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def master_key():
    """Generate test master key (32 bytes for AES-256)"""
    return os.urandom(32)


@pytest.fixture
def credential_manager(temp_db, master_key):
    """Create CredentialManager instance with test database"""
    manager = CredentialManager(master_key=master_key, db_path=temp_db)
    manager.init_db()
    return manager


@pytest.fixture
def user_manager(temp_db):
    """Create UserManager instance with test database"""
    manager = UserManager(db_path=temp_db)
    manager.init_db()
    return manager


@pytest.fixture
def test_user(user_manager):
    """Create a test user"""
    user_id = user_manager.create_user(
        username='testuser',
        email='test@example.com',
        password='TestPass123!'
    )
    return user_id


@pytest.fixture
def test_user2(user_manager):
    """Create a second test user"""
    user_id = user_manager.create_user(
        username='testuser2',
        email='test2@example.com',
        password='TestPass123!'
    )
    return user_id


class TestEncryptionDecryption:
    """Tests for AES-256-GCM encryption/decryption"""

    def test_encrypt_decrypt_simple_data(self, credential_manager):
        """Test encrypting and decrypting simple credential data"""
        data = {'username': 'test', 'password': 'secret123'}

        # Encrypt
        encrypted_data, iv, tag = credential_manager._encrypt_credentials(data)

        # Verify encrypted data is different from original
        assert encrypted_data != str(data).encode()
        assert len(iv) == 12  # AES-GCM standard IV size
        assert len(tag) == 16  # AES-GCM standard tag size

        # Decrypt
        decrypted_data = credential_manager._decrypt_credentials(encrypted_data, iv, tag)

        # Verify decrypted matches original
        assert decrypted_data == data

    def test_encrypt_decrypt_complex_data(self, credential_manager):
        """Test encrypting and decrypting complex credential data"""
        data = {
            'username': 'complex_user',
            'password': 'P@ssw0rd!',
            'email': 'user@example.com',
            'api_key': 'sk_test_1234567890abcdef',
            'nested': {'key': 'value'}
        }

        encrypted_data, iv, tag = credential_manager._encrypt_credentials(data)
        decrypted_data = credential_manager._decrypt_credentials(encrypted_data, iv, tag)

        assert decrypted_data == data

    def test_different_ivs_produce_different_ciphertext(self, credential_manager):
        """Test that same data with different IVs produces different ciphertext"""
        data = {'username': 'test', 'password': 'secret'}

        encrypted1, iv1, tag1 = credential_manager._encrypt_credentials(data)
        encrypted2, iv2, tag2 = credential_manager._encrypt_credentials(data)

        # IVs should be different
        assert iv1 != iv2

        # Ciphertext should be different
        assert encrypted1 != encrypted2

        # But both should decrypt to same data
        decrypted1 = credential_manager._decrypt_credentials(encrypted1, iv1, tag1)
        decrypted2 = credential_manager._decrypt_credentials(encrypted2, iv2, tag2)
        assert decrypted1 == decrypted2 == data

    def test_tampered_ciphertext_fails(self, credential_manager):
        """Test that tampered ciphertext fails authentication"""
        data = {'username': 'test', 'password': 'secret'}

        encrypted_data, iv, tag = credential_manager._encrypt_credentials(data)

        # Tamper with ciphertext
        tampered_data = bytearray(encrypted_data)
        tampered_data[0] ^= 1  # Flip a bit
        tampered_data = bytes(tampered_data)

        # Should raise exception on decryption
        with pytest.raises(Exception):
            credential_manager._decrypt_credentials(tampered_data, iv, tag)

    def test_wrong_tag_fails(self, credential_manager):
        """Test that wrong authentication tag fails"""
        data = {'username': 'test', 'password': 'secret'}

        encrypted_data, iv, tag = credential_manager._encrypt_credentials(data)

        # Use wrong tag
        wrong_tag = os.urandom(16)

        # Should raise exception
        with pytest.raises(Exception):
            credential_manager._decrypt_credentials(encrypted_data, iv, wrong_tag)


class TestSaveCredentials:
    """Tests for saving credentials"""

    def test_save_twitter_scraping_credentials(self, credential_manager, test_user):
        """Test saving Twitter scraping credentials"""
        result = credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={
                'username': 'mytwitter',
                'password': 'twitterpass',
                'email': 'my@email.com',
                'email_password': 'emailpass'
            }
        )

        assert result is True

    def test_save_twitter_api_credentials(self, credential_manager, test_user):
        """Test saving Twitter API credentials"""
        result = credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api',
            data={
                'api_key': 'test_key',
                'api_secret': 'test_secret',
                'access_token': 'test_token',
                'access_secret': 'test_access_secret'
            }
        )

        assert result is True

    def test_save_bluesky_credentials(self, credential_manager, test_user):
        """Test saving Bluesky credentials"""
        result = credential_manager.save_credentials(
            user_id=test_user,
            platform='bluesky',
            credential_type='api',
            data={
                'username': 'user.bsky.social',
                'password': 'app_password'
            }
        )

        assert result is True

    def test_save_duplicate_credentials_fails(self, credential_manager, test_user):
        """Test that saving duplicate credentials fails (unique constraint)"""
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'test', 'password': 'pass'}
        )

        # Attempt to save duplicate
        with pytest.raises(Exception):
            credential_manager.save_credentials(
                user_id=test_user,
                platform='twitter',
                credential_type='scraping',
                data={'username': 'test2', 'password': 'pass2'}
            )

    def test_save_invalid_platform_fails(self, credential_manager, test_user):
        """Test that invalid platform raises error"""
        with pytest.raises(ValueError, match='Invalid platform'):
            credential_manager.save_credentials(
                user_id=test_user,
                platform='invalid_platform',
                credential_type='api',
                data={'key': 'value'}
            )

    def test_save_invalid_credential_type_fails(self, credential_manager, test_user):
        """Test that invalid credential type raises error"""
        with pytest.raises(ValueError, match='Invalid credential_type'):
            credential_manager.save_credentials(
                user_id=test_user,
                platform='twitter',
                credential_type='invalid_type',
                data={'key': 'value'}
            )


class TestGetCredentials:
    """Tests for retrieving credentials"""

    def test_get_credentials_success(self, credential_manager, test_user):
        """Test retrieving saved credentials"""
        original_data = {
            'username': 'testuser',
            'password': 'testpass',
            'email': 'test@email.com',
            'email_password': 'emailpass'
        }

        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data=original_data
        )

        retrieved_data = credential_manager.get_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping'
        )

        assert retrieved_data == original_data

    def test_get_nonexistent_credentials(self, credential_manager, test_user):
        """Test retrieving non-existent credentials returns None"""
        result = credential_manager.get_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api'
        )

        assert result is None

    def test_get_credentials_different_users(self, credential_manager, test_user, test_user2):
        """Test that credentials are isolated per user"""
        # Save credentials for user 1
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'user1', 'password': 'pass1'}
        )

        # Save credentials for user 2
        credential_manager.save_credentials(
            user_id=test_user2,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'user2', 'password': 'pass2'}
        )

        # Verify isolation
        user1_creds = credential_manager.get_credentials(test_user, 'twitter', 'scraping')
        user2_creds = credential_manager.get_credentials(test_user2, 'twitter', 'scraping')

        assert user1_creds['username'] == 'user1'
        assert user2_creds['username'] == 'user2'


class TestUpdateCredentials:
    """Tests for updating credentials"""

    def test_update_credentials_success(self, credential_manager, test_user):
        """Test updating existing credentials"""
        # Save initial credentials
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'old_user', 'password': 'old_pass'}
        )

        # Update credentials
        result = credential_manager.update_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'new_user', 'password': 'new_pass'}
        )

        assert result is True

        # Verify update
        updated_creds = credential_manager.get_credentials(test_user, 'twitter', 'scraping')
        assert updated_creds['username'] == 'new_user'
        assert updated_creds['password'] == 'new_pass'

    def test_update_nonexistent_credentials_fails(self, credential_manager, test_user):
        """Test updating non-existent credentials fails"""
        result = credential_manager.update_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api',
            data={'key': 'value'}
        )

        assert result is False


class TestDeleteCredentials:
    """Tests for deleting credentials"""

    def test_delete_credentials_success(self, credential_manager, test_user):
        """Test deleting credentials"""
        # Save credentials
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping',
            data={'username': 'test', 'password': 'pass'}
        )

        # Delete credentials
        result = credential_manager.delete_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='scraping'
        )

        assert result is True

        # Verify deletion
        creds = credential_manager.get_credentials(test_user, 'twitter', 'scraping')
        assert creds is None

    def test_delete_nonexistent_credentials_fails(self, credential_manager, test_user):
        """Test deleting non-existent credentials fails"""
        result = credential_manager.delete_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api'
        )

        assert result is False


class TestListUserCredentials:
    """Tests for listing user credentials"""

    def test_list_user_credentials(self, credential_manager, test_user):
        """Test listing all credentials for a user"""
        # Save multiple credentials
        credential_manager.save_credentials(
            test_user, 'twitter', 'scraping',
            {'username': 'tw_user', 'password': 'tw_pass'}
        )
        credential_manager.save_credentials(
            test_user, 'twitter', 'api',
            {'api_key': 'key', 'api_secret': 'secret'}
        )
        credential_manager.save_credentials(
            test_user, 'bluesky', 'api',
            {'username': 'bs_user', 'password': 'bs_pass'}
        )

        creds_list = credential_manager.list_user_credentials(test_user)

        assert len(creds_list) == 3
        assert all('platform' in c for c in creds_list)
        assert all('credential_type' in c for c in creds_list)
        assert all('is_active' in c for c in creds_list)

    def test_list_user_credentials_empty(self, credential_manager, test_user):
        """Test listing credentials for user with no credentials"""
        creds_list = credential_manager.list_user_credentials(test_user)

        assert len(creds_list) == 0
        assert isinstance(creds_list, list)


class TestShareCredentials:
    """Tests for sharing credentials between users"""

    def test_share_credentials_success(self, credential_manager, test_user, test_user2):
        """Test sharing credentials with another user"""
        # Save credentials for user 1
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api',
            data={'api_key': 'shared_key', 'api_secret': 'shared_secret'}
        )

        # Share with user 2
        result = credential_manager.share_credentials(
            owner_user_id=test_user,
            platform='twitter',
            credential_type='api',
            shared_with_user_ids=[test_user2]
        )

        assert result is True

    def test_get_shared_credentials(self, credential_manager, test_user, test_user2):
        """Test getting shared credentials"""
        # Save and share credentials
        credential_manager.save_credentials(
            user_id=test_user,
            platform='twitter',
            credential_type='api',
            data={'api_key': 'shared_key', 'api_secret': 'shared_secret'}
        )

        credential_manager.share_credentials(
            owner_user_id=test_user,
            platform='twitter',
            credential_type='api',
            shared_with_user_ids=[test_user2]
        )

        # Get shared credentials for user 2
        shared_creds = credential_manager.get_shared_credentials(test_user2)

        assert len(shared_creds) > 0
        assert any(c['owner_user_id'] == test_user for c in shared_creds)

    def test_share_nonexistent_credentials_fails(self, credential_manager, test_user, test_user2):
        """Test sharing non-existent credentials fails"""
        result = credential_manager.share_credentials(
            owner_user_id=test_user,
            platform='twitter',
            credential_type='api',
            shared_with_user_ids=[test_user2]
        )

        assert result is False


class TestCredentialTypes:
    """Tests for different credential types"""

    def test_twitter_scraping_credential_structure(self, credential_manager, test_user):
        """Test Twitter scraping credential structure"""
        data = {
            'username': 'twitter_user',
            'password': 'twitter_pass',
            'email': 'email@example.com',
            'email_password': 'email_pass'
        }

        credential_manager.save_credentials(test_user, 'twitter', 'scraping', data)
        retrieved = credential_manager.get_credentials(test_user, 'twitter', 'scraping')

        assert retrieved == data
        assert 'username' in retrieved
        assert 'password' in retrieved
        assert 'email' in retrieved
        assert 'email_password' in retrieved

    def test_twitter_api_credential_structure(self, credential_manager, test_user):
        """Test Twitter API credential structure"""
        data = {
            'api_key': 'key123',
            'api_secret': 'secret456',
            'access_token': 'token789',
            'access_secret': 'access012'
        }

        credential_manager.save_credentials(test_user, 'twitter', 'api', data)
        retrieved = credential_manager.get_credentials(test_user, 'twitter', 'api')

        assert retrieved == data
        assert 'api_key' in retrieved
        assert 'api_secret' in retrieved
        assert 'access_token' in retrieved
        assert 'access_secret' in retrieved

    def test_bluesky_api_credential_structure(self, credential_manager, test_user):
        """Test Bluesky API credential structure"""
        data = {
            'username': 'user.bsky.social',
            'password': 'app_password_123'
        }

        credential_manager.save_credentials(test_user, 'bluesky', 'api', data)
        retrieved = credential_manager.get_credentials(test_user, 'bluesky', 'api')

        assert retrieved == data
        assert 'username' in retrieved
        assert 'password' in retrieved


class TestCredentialMetadata:
    """Tests for credential metadata (timestamps, active status)"""

    def test_credentials_have_timestamps(self, credential_manager, test_user):
        """Test that saved credentials have created_at and updated_at timestamps"""
        credential_manager.save_credentials(
            test_user, 'twitter', 'scraping',
            {'username': 'test', 'password': 'pass'}
        )

        creds_list = credential_manager.list_user_credentials(test_user)
        assert len(creds_list) == 1

        cred = creds_list[0]
        assert 'created_at' in cred
        assert 'updated_at' in cred
        assert cred['created_at'] > 0
        assert cred['updated_at'] > 0

    def test_credentials_default_active(self, credential_manager, test_user):
        """Test that credentials are active by default"""
        credential_manager.save_credentials(
            test_user, 'twitter', 'scraping',
            {'username': 'test', 'password': 'pass'}
        )

        creds_list = credential_manager.list_user_credentials(test_user)
        assert creds_list[0]['is_active'] == 1


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])


class TestEncryptionFailures:
    """Tests for encryption/decryption error handling"""

    def test_decrypt_credentials_with_tampered_data(self, credential_manager):
        """Test that decryption fails with tampered ciphertext"""
        data = {'username': 'test', 'password': 'secret'}
        encrypted_data, iv, tag = credential_manager._encrypt_credentials(data)
        
        tampered = bytearray(encrypted_data)
        tampered[0] ^= 0xFF
        
        with pytest.raises(Exception):
            credential_manager._decrypt_credentials(bytes(tampered), iv, tag)

    def test_decrypt_credentials_with_wrong_master_key(self, temp_db):
        """Test that decryption fails when master key is wrong"""
        key1 = os.urandom(32)
        manager1 = CredentialManager(master_key=key1, db_path=temp_db)
        
        data = {'username': 'test', 'password': 'secret'}
        encrypted_data, iv, tag = manager1._encrypt_credentials(data)
        
        key2 = os.urandom(32)
        manager2 = CredentialManager(master_key=key2, db_path=temp_db)
        
        with pytest.raises(Exception):
            manager2._decrypt_credentials(encrypted_data, iv, tag)
