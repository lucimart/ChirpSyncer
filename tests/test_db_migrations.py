"""
Unit tests for db_migrations module.
Tests database migration utilities for multi-user support.
"""
import os
import sqlite3
import tempfile
import unittest

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from db_migrations import add_user_id_columns, check_multi_user_schema, init_all_tables


class TestAddUserIdColumns(unittest.TestCase):
    """Tests for add_user_id_columns function"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        # Create base tables without user_id
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE synced_posts (
                id INTEGER PRIMARY KEY,
                post_id TEXT NOT NULL,
                source TEXT NOT NULL,
                synced_at INTEGER
            )
        ''')
        cursor.execute('''
            CREATE TABLE sync_stats (
                id INTEGER PRIMARY KEY,
                sync_type TEXT,
                success INTEGER,
                created_at INTEGER
            )
        ''')
        conn.commit()
        conn.close()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_add_user_id_to_synced_posts(self):
        """Test that user_id column is added to synced_posts"""
        operations = add_user_id_columns(self.db_path)
        
        self.assertIn('Added user_id to synced_posts', operations)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(synced_posts)")
        columns = [row[1] for row in cursor.fetchall()]
        conn.close()
        
        self.assertIn('user_id', columns)

    def test_add_user_id_to_sync_stats(self):
        """Test that user_id column is added to sync_stats"""
        operations = add_user_id_columns(self.db_path)
        
        self.assertIn('Added user_id to sync_stats', operations)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(sync_stats)")
        columns = [row[1] for row in cursor.fetchall()]
        conn.close()
        
        self.assertIn('user_id', columns)

    def test_idempotent_column_addition(self):
        """Test that running twice doesn't fail"""
        add_user_id_columns(self.db_path)
        operations = add_user_id_columns(self.db_path)
        
        self.assertIn('user_id already exists in synced_posts', operations)
        self.assertIn('user_id already exists in sync_stats', operations)

    def test_creates_indexes(self):
        """Test that indexes are created"""
        operations = add_user_id_columns(self.db_path)
        
        self.assertIn('Created indexes on user_id columns', operations)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_synced_posts_user'")
        self.assertIsNotNone(cursor.fetchone())
        conn.close()

    def test_handles_hourly_stats_table(self):
        """Test migration with hourly_stats table present"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE hourly_stats (
                id INTEGER PRIMARY KEY,
                hour TEXT,
                count INTEGER
            )
        ''')
        conn.commit()
        conn.close()
        
        operations = add_user_id_columns(self.db_path)
        
        self.assertIn('Added user_id to hourly_stats', operations)


class TestCheckMultiUserSchema(unittest.TestCase):
    """Tests for check_multi_user_schema function"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_returns_false_without_users_table(self):
        """Test returns False when users table is missing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE synced_posts (id INTEGER PRIMARY KEY)')
        conn.commit()
        conn.close()
        
        self.assertFalse(check_multi_user_schema(self.db_path))

    def test_returns_false_without_user_credentials_table(self):
        """Test returns False when user_credentials table is missing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
        cursor.execute('CREATE TABLE synced_posts (id INTEGER PRIMARY KEY, user_id INTEGER)')
        conn.commit()
        conn.close()
        
        self.assertFalse(check_multi_user_schema(self.db_path))

    def test_returns_false_without_user_id_column(self):
        """Test returns False when user_id column is missing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
        cursor.execute('CREATE TABLE user_credentials (id INTEGER PRIMARY KEY)')
        cursor.execute('CREATE TABLE synced_posts (id INTEGER PRIMARY KEY)')
        conn.commit()
        conn.close()
        
        self.assertFalse(check_multi_user_schema(self.db_path))

    def test_returns_true_with_complete_schema(self):
        """Test returns True with complete multi-user schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('CREATE TABLE users (id INTEGER PRIMARY KEY)')
        cursor.execute('CREATE TABLE user_credentials (id INTEGER PRIMARY KEY)')
        cursor.execute('CREATE TABLE synced_posts (id INTEGER PRIMARY KEY, user_id INTEGER)')
        conn.commit()
        conn.close()
        
        self.assertTrue(check_multi_user_schema(self.db_path))


class TestInitAllTables(unittest.TestCase):
    """Tests for init_all_tables function"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        # Create base tables
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE synced_posts (
                id INTEGER PRIMARY KEY,
                post_id TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE sync_stats (
                id INTEGER PRIMARY KEY
            )
        ''')
        conn.commit()
        conn.close()

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_init_all_tables_creates_schema(self):
        """Test that init_all_tables creates multi-user schema"""
        os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-1234'
        
        init_all_tables(self.db_path)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        self.assertIsNotNone(cursor.fetchone())
        
        # Check user_credentials table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_credentials'")
        self.assertIsNotNone(cursor.fetchone())
        
        conn.close()


if __name__ == '__main__':
    unittest.main()
