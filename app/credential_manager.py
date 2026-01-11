"""
CredentialManager - Encrypted Credential Storage (Sprint 6 - CRED-001)

Implements secure credential storage with AES-256-GCM encryption.
Supports Twitter (scraping/API) and Bluesky credentials with CRUD operations,
sharing between users, and comprehensive validation.
"""
import sqlite3
import os
import json
import time
from typing import Optional, List, Dict
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.security_utils import log_audit


# Valid platforms and credential types
VALID_PLATFORMS = ['twitter', 'bluesky']
VALID_CREDENTIAL_TYPES = {
    'twitter': ['scraping', 'api'],
    'bluesky': ['api']
}


class CredentialManager:
    """
    Encrypted Credential Storage with AES-256-GCM.

    Provides secure storage and retrieval of user credentials with encryption,
    CRUD operations, and credential sharing capabilities.
    """

    def __init__(self, master_key: bytes, db_path: str = 'chirpsyncer.db'):
        """
        Initialize CredentialManager.

        Args:
            master_key: 32-byte master key for AES-256 encryption
            db_path: Path to SQLite database

        Raises:
            ValueError: If master_key is not 32 bytes
        """
        if len(master_key) != 32:
            raise ValueError('Master key must be exactly 32 bytes for AES-256')

        self.master_key = master_key
        self.db_path = db_path
        self.aesgcm = AESGCM(master_key)

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database table for user credentials"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create user_credentials table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                credential_type TEXT NOT NULL,

                -- Encrypted data (AES-256-GCM)
                encrypted_data BLOB NOT NULL,
                encryption_iv BLOB NOT NULL,
                encryption_tag BLOB NOT NULL,

                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                last_used INTEGER,
                is_active INTEGER DEFAULT 1,

                -- Sharing support
                is_shared INTEGER DEFAULT 0,
                owner_user_id INTEGER,

                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, platform, credential_type)
            )
        ''')

        # Create indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_credentials_user ON user_credentials(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_credentials_platform ON user_credentials(platform)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_credentials_owner ON user_credentials(owner_user_id)')

        conn.commit()
        conn.close()

    def _encrypt_credentials(self, data: dict) -> tuple[bytes, bytes, bytes]:
        """
        Encrypt credential data using AES-256-GCM.

        Args:
            data: Credential data as dictionary

        Returns:
            Tuple of (encrypted_data, iv, tag)
        """
        # Convert data to JSON
        json_data = json.dumps(data).encode('utf-8')

        # Generate random IV (12 bytes for GCM)
        iv = os.urandom(12)

        # Encrypt with AESGCM (automatically generates and appends tag)
        ciphertext_and_tag = self.aesgcm.encrypt(iv, json_data, None)

        # Split ciphertext and tag
        # GCM tag is last 16 bytes
        ciphertext = ciphertext_and_tag[:-16]
        tag = ciphertext_and_tag[-16:]

        return ciphertext, iv, tag

    def _decrypt_credentials(self, encrypted_data: bytes, iv: bytes, tag: bytes) -> dict:
        """
        Decrypt credential data using AES-256-GCM.

        Args:
            encrypted_data: Encrypted ciphertext
            iv: Initialization vector (12 bytes)
            tag: Authentication tag (16 bytes)

        Returns:
            Decrypted credential data as dictionary

        Raises:
            Exception: If decryption fails (tampered data or wrong key)
        """
        # Combine ciphertext and tag for AESGCM
        ciphertext_and_tag = encrypted_data + tag

        # Decrypt (will raise exception if authentication fails)
        plaintext = self.aesgcm.decrypt(iv, ciphertext_and_tag, None)

        # Parse JSON
        data = json.loads(plaintext.decode('utf-8'))
        return data

    def _validate_platform_and_type(self, platform: str, credential_type: str):
        """
        Validate platform and credential type.

        Args:
            platform: Platform name
            credential_type: Credential type

        Raises:
            ValueError: If platform or credential type is invalid
        """
        if platform not in VALID_PLATFORMS:
            raise ValueError(f'Invalid platform: {platform}. Must be one of {VALID_PLATFORMS}')

        if platform not in VALID_CREDENTIAL_TYPES:
            raise ValueError(f'Invalid platform: {platform}')

        if credential_type not in VALID_CREDENTIAL_TYPES[platform]:
            raise ValueError(
                f'Invalid credential_type: {credential_type} for platform {platform}. '
                f'Must be one of {VALID_CREDENTIAL_TYPES[platform]}'
            )

    def save_credentials(self, user_id: int, platform: str, credential_type: str, data: dict) -> bool:
        """
        Save encrypted credentials for a user.

        Args:
            user_id: User ID
            platform: Platform ('twitter' or 'bluesky')
            credential_type: Type ('scraping' or 'api')
            data: Credential data as dictionary

        Returns:
            True if saved successfully

        Raises:
            ValueError: If platform or credential_type is invalid
            Exception: If save fails (e.g., duplicate credentials)
        """
        # Validate platform and credential type
        self._validate_platform_and_type(platform, credential_type)

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Encrypt credentials
            encrypted_data, iv, tag = self._encrypt_credentials(data)

            # Save to database
            created_at = int(time.time())
            cursor.execute('''
                INSERT INTO user_credentials
                (user_id, platform, credential_type, encrypted_data, encryption_iv,
                 encryption_tag, created_at, updated_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (user_id, platform, credential_type, encrypted_data, iv, tag,
                  created_at, created_at))

            conn.commit()

            # Log audit event
            log_audit(
                user_id, 'credential_created', success=True,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type},
                db_path=self.db_path
            )

            return True

        except Exception as e:
            conn.rollback()
            log_audit(
                user_id, 'credential_created', success=False,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type, 'error': str(e)},
                db_path=self.db_path
            )
            raise

        finally:
            conn.close()

    def get_credentials(self, user_id: int, platform: str, credential_type: str) -> Optional[dict]:
        """
        Get decrypted credentials for a user.

        Args:
            user_id: User ID
            platform: Platform ('twitter' or 'bluesky')
            credential_type: Type ('scraping' or 'api')

        Returns:
            Decrypted credential data or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT encrypted_data, encryption_iv, encryption_tag
                FROM user_credentials
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (user_id, platform, credential_type))

            row = cursor.fetchone()
            if not row:
                return None

            # Decrypt credentials
            encrypted_data = row['encrypted_data']
            iv = row['encryption_iv']
            tag = row['encryption_tag']

            decrypted_data = self._decrypt_credentials(encrypted_data, iv, tag)

            # Update last_used timestamp
            cursor.execute('''
                UPDATE user_credentials
                SET last_used = ?
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (int(time.time()), user_id, platform, credential_type))
            conn.commit()

            return decrypted_data

        finally:
            conn.close()

    def update_credentials(self, user_id: int, platform: str, credential_type: str, data: dict) -> bool:
        """
        Update existing credentials.

        Args:
            user_id: User ID
            platform: Platform ('twitter' or 'bluesky')
            credential_type: Type ('scraping' or 'api')
            data: New credential data as dictionary

        Returns:
            True if updated successfully, False if credentials don't exist
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check if credentials exist
            cursor.execute('''
                SELECT id FROM user_credentials
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (user_id, platform, credential_type))

            if not cursor.fetchone():
                return False

            # Encrypt new credentials
            encrypted_data, iv, tag = self._encrypt_credentials(data)

            # Update in database
            updated_at = int(time.time())
            cursor.execute('''
                UPDATE user_credentials
                SET encrypted_data = ?, encryption_iv = ?, encryption_tag = ?, updated_at = ?
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (encrypted_data, iv, tag, updated_at, user_id, platform, credential_type))

            conn.commit()

            # Log audit event
            log_audit(
                user_id, 'credential_updated', success=True,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type},
                db_path=self.db_path
            )

            return True

        except Exception as e:
            conn.rollback()
            log_audit(
                user_id, 'credential_updated', success=False,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type, 'error': str(e)},
                db_path=self.db_path
            )
            return False

        finally:
            conn.close()

    def delete_credentials(self, user_id: int, platform: str, credential_type: str) -> bool:
        """
        Delete credentials.

        Args:
            user_id: User ID
            platform: Platform ('twitter' or 'bluesky')
            credential_type: Type ('scraping' or 'api')

        Returns:
            True if deleted successfully, False if credentials don't exist
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check if credentials exist
            cursor.execute('''
                SELECT id FROM user_credentials
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (user_id, platform, credential_type))

            if not cursor.fetchone():
                return False

            # Delete credentials
            cursor.execute('''
                DELETE FROM user_credentials
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (user_id, platform, credential_type))

            conn.commit()

            # Log audit event
            log_audit(
                user_id, 'credential_deleted', success=True,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type},
                db_path=self.db_path
            )

            return True

        except Exception as e:
            conn.rollback()
            log_audit(
                user_id, 'credential_deleted', success=False,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type, 'error': str(e)},
                db_path=self.db_path
            )
            return False

        finally:
            conn.close()

    def list_user_credentials(self, user_id: int) -> List[dict]:
        """
        List all credentials for a user (without decrypting data).

        Args:
            user_id: User ID

        Returns:
            List of credential metadata dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT id, platform, credential_type, created_at, updated_at,
                       last_used, is_active, is_shared, owner_user_id
                FROM user_credentials
                WHERE user_id = ?
                ORDER BY platform, credential_type
            ''', (user_id,))

            rows = cursor.fetchall()

            credentials = []
            for row in rows:
                credentials.append({
                    'id': row['id'],
                    'platform': row['platform'],
                    'credential_type': row['credential_type'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'last_used': row['last_used'],
                    'is_active': row['is_active'],
                    'is_shared': row['is_shared'],
                    'owner_user_id': row['owner_user_id']
                })

            return credentials

        finally:
            conn.close()

    def share_credentials(self, owner_user_id: int, platform: str, credential_type: str,
                         shared_with_user_ids: List[int]) -> bool:
        """
        Share credentials with other users.

        Creates read-only copies of credentials for specified users.

        Args:
            owner_user_id: Owner user ID
            platform: Platform ('twitter' or 'bluesky')
            credential_type: Type ('scraping' or 'api')
            shared_with_user_ids: List of user IDs to share with

        Returns:
            True if shared successfully, False if owner credentials don't exist
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Get owner's credentials
            cursor.execute('''
                SELECT encrypted_data, encryption_iv, encryption_tag
                FROM user_credentials
                WHERE user_id = ? AND platform = ? AND credential_type = ?
            ''', (owner_user_id, platform, credential_type))

            row = cursor.fetchone()
            if not row:
                return False

            encrypted_data = row['encrypted_data']
            iv = row['encryption_iv']
            tag = row['encryption_tag']

            # Create shared copies for each user
            created_at = int(time.time())
            for shared_user_id in shared_with_user_ids:
                # Check if already exists
                cursor.execute('''
                    SELECT id FROM user_credentials
                    WHERE user_id = ? AND platform = ? AND credential_type = ?
                ''', (shared_user_id, platform, credential_type))

                if cursor.fetchone():
                    # Update existing shared credential
                    cursor.execute('''
                        UPDATE user_credentials
                        SET encrypted_data = ?, encryption_iv = ?, encryption_tag = ?,
                            updated_at = ?, is_shared = 1, owner_user_id = ?
                        WHERE user_id = ? AND platform = ? AND credential_type = ?
                    ''', (encrypted_data, iv, tag, created_at, owner_user_id,
                          shared_user_id, platform, credential_type))
                else:
                    # Insert new shared credential
                    cursor.execute('''
                        INSERT INTO user_credentials
                        (user_id, platform, credential_type, encrypted_data, encryption_iv,
                         encryption_tag, created_at, updated_at, is_active, is_shared, owner_user_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
                    ''', (shared_user_id, platform, credential_type, encrypted_data, iv, tag,
                          created_at, created_at, owner_user_id))

            conn.commit()

            # Log audit event
            log_audit(
                owner_user_id, 'credentials_shared', success=True,
                resource_type='credential',
                details={
                    'platform': platform,
                    'credential_type': credential_type,
                    'shared_with': shared_with_user_ids
                },
                db_path=self.db_path
            )

            return True

        except Exception as e:
            conn.rollback()
            log_audit(
                owner_user_id, 'credentials_shared', success=False,
                resource_type='credential',
                details={'platform': platform, 'credential_type': credential_type, 'error': str(e)},
                db_path=self.db_path
            )
            return False

        finally:
            conn.close()

    def get_shared_credentials(self, user_id: int) -> List[dict]:
        """
        Get all credentials shared with a user.

        Args:
            user_id: User ID

        Returns:
            List of shared credential metadata
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                SELECT id, platform, credential_type, created_at, updated_at,
                       last_used, is_active, owner_user_id
                FROM user_credentials
                WHERE user_id = ? AND is_shared = 1
                ORDER BY platform, credential_type
            ''', (user_id,))

            rows = cursor.fetchall()

            credentials = []
            for row in rows:
                credentials.append({
                    'id': row['id'],
                    'platform': row['platform'],
                    'credential_type': row['credential_type'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'last_used': row['last_used'],
                    'is_active': row['is_active'],
                    'owner_user_id': row['owner_user_id']
                })

            return credentials

        finally:
            conn.close()
