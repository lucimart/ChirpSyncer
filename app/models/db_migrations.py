"""
Database Migration Utilities (Sprint 6)

Provides functions for updating database schema to support multi-user functionality.
"""
import sqlite3
from typing import List


def add_user_id_columns(db_path: str = 'chirpsyncer.db') -> List[str]:
    """
    Add user_id columns to existing tables for multi-user support.

    Args:
        db_path: Path to SQLite database

    Returns:
        List of operations performed
    """
    operations = []
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add user_id to synced_posts
        try:
            cursor.execute('ALTER TABLE synced_posts ADD COLUMN user_id INTEGER REFERENCES users(id)')
            operations.append('Added user_id to synced_posts')
        except sqlite3.OperationalError as e:
            if 'duplicate column' not in str(e).lower():
                raise
            operations.append('user_id already exists in synced_posts')

        # Add user_id to sync_stats
        try:
            cursor.execute('ALTER TABLE sync_stats ADD COLUMN user_id INTEGER REFERENCES users(id)')
            operations.append('Added user_id to sync_stats')
        except sqlite3.OperationalError as e:
            if 'duplicate column' not in str(e).lower():
                raise
            operations.append('user_id already exists in sync_stats')

        # Add user_id to hourly_stats if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='hourly_stats'")
        if cursor.fetchone():
            try:
                cursor.execute('ALTER TABLE hourly_stats ADD COLUMN user_id INTEGER REFERENCES users(id)')
                operations.append('Added user_id to hourly_stats')
            except sqlite3.OperationalError as e:
                if 'duplicate column' not in str(e).lower():
                    raise
                operations.append('user_id already exists in hourly_stats')

        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_synced_posts_user ON synced_posts(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_hourly_stats_user ON hourly_stats(user_id)')
        operations.append('Created indexes on user_id columns')

        conn.commit()

    except Exception as e:
        conn.rollback()
        raise Exception(f"Failed to add user_id columns: {e}")
    finally:
        conn.close()

    return operations


def check_multi_user_schema(db_path: str = 'chirpsyncer.db') -> bool:
    """
    Check if database has multi-user schema.

    Args:
        db_path: Path to SQLite database

    Returns:
        True if multi-user schema exists, False otherwise
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check for users table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            return False

        # Check for user_credentials table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_credentials'")
        if not cursor.fetchone():
            return False

        # Check for user_id column in synced_posts
        cursor.execute("PRAGMA table_info(synced_posts)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'user_id' not in columns:
            return False

        return True

    finally:
        conn.close()


def init_all_tables(db_path: str = 'chirpsyncer.db'):
    """
    Initialize all Sprint 6 tables.

    Args:
        db_path: Path to SQLite database
    """
    from app.auth.user_manager import UserManager
    from app.auth.credential_manager import CredentialManager
    from app.services.user_settings import UserSettings
    import os

    # Get master key
    master_key = os.getenv('SECRET_KEY', 'default-secret-key-change-me').encode('utf-8')
    if len(master_key) < 32:
        master_key = master_key.ljust(32, b'0')[:32]

    # Initialize all managers
    user_manager = UserManager(db_path)
    user_manager.init_db()

    cred_manager = CredentialManager(master_key, db_path)
    cred_manager.init_db()

    settings_manager = UserSettings(db_path)
    settings_manager.init_db()

    # Add user_id columns to existing tables
    add_user_id_columns(db_path)
