"""
UserManager - User Management System (Sprint 6 - USER-001)

Implements complete user management with bcrypt authentication, sessions,
and database persistence. Provides secure user creation, authentication,
session management, and CRUD operations.
"""
import sqlite3
import bcrypt
import secrets
import time
from typing import Optional, List
from dataclasses import dataclass
from app.security_utils import validate_password, log_audit


@dataclass
class User:
    """User data class"""
    id: int
    username: str
    email: str
    password_hash: str
    created_at: int
    last_login: Optional[int]
    is_active: bool
    is_admin: bool
    settings_json: Optional[str] = None


class UserManager:
    """
    User Management System with bcrypt authentication.

    Handles user creation, authentication, sessions, and CRUD operations.
    All passwords are hashed with bcrypt (cost factor 12).
    """

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize UserManager.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database tables for users and sessions"""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_login INTEGER,
                is_active INTEGER DEFAULT 1,
                is_admin INTEGER DEFAULT 0,
                settings_json TEXT
            )
        ''')

        # Create user_sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)')

        conn.commit()
        conn.close()

    def create_user(self, username: str, email: str, password: str, is_admin: bool = False) -> int:
        """
        Create a new user with hashed password.

        Args:
            username: Unique username
            email: Unique email address
            password: Plain text password (will be hashed)
            is_admin: Whether user should be admin

        Returns:
            User ID of created user

        Raises:
            ValueError: If username/email already exists or password is weak
        """
        # Validate password strength
        if not validate_password(password):
            raise ValueError('Password does not meet security requirements')

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check for duplicate username
            cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
            if cursor.fetchone():
                raise ValueError('Username already exists')

            # Check for duplicate email
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                raise ValueError('Email already exists')

            # Hash password with bcrypt
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))

            # Create user
            created_at = int(time.time())
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
                VALUES (?, ?, ?, ?, 1, ?)
            ''', (username, email, password_hash.decode('utf-8'), created_at, int(is_admin)))

            user_id = cursor.lastrowid
            conn.commit()

            # Log audit event
            log_audit(user_id, 'user_created', success=True, details={'username': username, 'is_admin': is_admin})

            return user_id

        except ValueError:
            raise
        except Exception as e:
            conn.rollback()
            raise Exception(f'Failed to create user: {e}')
        finally:
            conn.close()

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        Authenticate user with username and password.

        Args:
            username: Username
            password: Plain text password

        Returns:
            User object if authentication successful, None otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Get user by username
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()

            if not row:
                log_audit(None, 'login_failed', success=False, details={'username': username, 'reason': 'user_not_found'})
                return None

            user = self._row_to_user(row)

            # Check if user is active
            if not user.is_active:
                log_audit(user.id, 'login_failed', success=False, details={'username': username, 'reason': 'user_inactive'})
                return None

            # Verify password with bcrypt
            if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                log_audit(user.id, 'login_failed', success=False, details={'username': username, 'reason': 'wrong_password'})
                return None

            # Update last_login
            cursor.execute('UPDATE users SET last_login = ? WHERE id = ?', (int(time.time()), user.id))
            conn.commit()

            log_audit(user.id, 'login_success', success=True, details={'username': username})

            # Return updated user
            return self.get_user_by_id(user.id)

        finally:
            conn.close()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User object or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()

            if row:
                return self._row_to_user(row)
            return None

        finally:
            conn.close()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username.

        Args:
            username: Username

        Returns:
            User object or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()

            if row:
                return self._row_to_user(row)
            return None

        finally:
            conn.close()

    def update_user(self, user_id: int, **kwargs) -> bool:
        """
        Update user fields.

        Args:
            user_id: User ID
            **kwargs: Fields to update (email, password, is_active, is_admin, settings_json)

        Returns:
            True if updated successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check user exists
            cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
            if not cursor.fetchone():
                return False

            # Build update query
            updates = []
            values = []

            if 'email' in kwargs:
                updates.append('email = ?')
                values.append(kwargs['email'])

            if 'password' in kwargs:
                # Hash new password
                password_hash = bcrypt.hashpw(kwargs['password'].encode('utf-8'), bcrypt.gensalt(rounds=12))
                updates.append('password_hash = ?')
                values.append(password_hash.decode('utf-8'))

            if 'is_active' in kwargs:
                updates.append('is_active = ?')
                values.append(int(kwargs['is_active']))

            if 'is_admin' in kwargs:
                updates.append('is_admin = ?')
                values.append(int(kwargs['is_admin']))

            if 'settings_json' in kwargs:
                updates.append('settings_json = ?')
                values.append(kwargs['settings_json'])

            if not updates:
                return False

            # Execute update
            values.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, values)
            conn.commit()

            log_audit(user_id, 'user_updated', success=True, details={'fields': list(kwargs.keys())})

            return True

        except Exception as e:
            conn.rollback()
            log_audit(user_id, 'user_updated', success=False, details={'error': str(e)})
            return False
        finally:
            conn.close()

    def delete_user(self, user_id: int) -> bool:
        """
        Delete user.

        Args:
            user_id: User ID

        Returns:
            True if deleted successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check user exists
            cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
            if not cursor.fetchone():
                return False

            # Delete user (cascade will delete sessions)
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()

            log_audit(user_id, 'user_deleted', success=True)

            return True

        except Exception as e:
            conn.rollback()
            log_audit(user_id, 'user_deleted', success=False, details={'error': str(e)})
            return False
        finally:
            conn.close()

    def list_users(self, admin_only: bool = False, active_only: bool = False) -> List[User]:
        """
        List users.

        Args:
            admin_only: Only return admin users
            active_only: Only return active users

        Returns:
            List of User objects
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            query = 'SELECT * FROM users WHERE 1=1'
            params = []

            if admin_only:
                query += ' AND is_admin = 1'

            if active_only:
                query += ' AND is_active = 1'

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [self._row_to_user(row) for row in rows]

        finally:
            conn.close()

    def create_session(self, user_id: int, ip_address: str, user_agent: str, expires_in: int = 604800) -> str:
        """
        Create a new session for user.

        Args:
            user_id: User ID
            ip_address: Client IP address
            user_agent: Client user agent
            expires_in: Session duration in seconds (default: 7 days)

        Returns:
            Session token
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Generate secure random token
            session_token = secrets.token_urlsafe(32)

            created_at = int(time.time())
            expires_at = created_at + expires_in

            cursor.execute('''
                INSERT INTO user_sessions (user_id, session_token, created_at, expires_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, session_token, created_at, expires_at, ip_address, user_agent))

            conn.commit()

            log_audit(user_id, 'session_created', success=True, details={'ip': ip_address})

            return session_token

        except Exception as e:
            conn.rollback()
            log_audit(user_id, 'session_created', success=False, details={'error': str(e)})
            raise Exception(f'Failed to create session: {e}')
        finally:
            conn.close()

    def validate_session(self, session_token: str) -> Optional[User]:
        """
        Validate session token and return user.

        Args:
            session_token: Session token

        Returns:
            User object if session is valid, None otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Get session
            cursor.execute('''
                SELECT user_id, expires_at FROM user_sessions
                WHERE session_token = ?
            ''', (session_token,))

            row = cursor.fetchone()
            if not row:
                return None

            user_id = row['user_id']
            expires_at = row['expires_at']

            # Check expiration
            if int(time.time()) > expires_at:
                # Session expired, delete it
                cursor.execute('DELETE FROM user_sessions WHERE session_token = ?', (session_token,))
                conn.commit()
                return None

            # Return user
            return self.get_user_by_id(user_id)

        finally:
            conn.close()

    def delete_session(self, session_token: str) -> bool:
        """
        Delete session (logout).

        Args:
            session_token: Session token

        Returns:
            True if deleted successfully, False otherwise
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # Check session exists and get user_id for audit
            cursor.execute('SELECT user_id FROM user_sessions WHERE session_token = ?', (session_token,))
            row = cursor.fetchone()

            if not row:
                return False

            user_id = row['user_id']

            # Delete session
            cursor.execute('DELETE FROM user_sessions WHERE session_token = ?', (session_token,))
            conn.commit()

            log_audit(user_id, 'session_deleted', success=True)

            return True

        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()

    def _row_to_user(self, row: sqlite3.Row) -> User:
        """Convert database row to User object"""
        return User(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            password_hash=row['password_hash'],
            created_at=row['created_at'],
            last_login=row['last_login'],
            is_active=bool(row['is_active']),
            is_admin=bool(row['is_admin']),
            settings_json=row['settings_json']
        )
