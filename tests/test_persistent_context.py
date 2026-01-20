"""
Unit tests for persistent_context module.
Tests persistent state management across sessions.
"""
import json
import os
import sqlite3
import tempfile
import time
import unittest
import shutil
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from persistent_context import PersistentContext


class TestPersistentContextFile(unittest.TestCase):
    """Tests for PersistentContext with file backend"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.home_patcher = patch.object(
            __import__('pathlib').Path, 'home',
            return_value=__import__('pathlib').Path(self.temp_dir)
        )
        self.home_patcher.start()
        self.ctx = PersistentContext('test-context', backend='file')

    def tearDown(self):
        self.home_patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_save_and_load_state(self):
        """Test saving and loading state"""
        self.ctx.save_state('key1', 'value1')
        self.ctx.save_state('key2', {'nested': 'data'})

        self.assertEqual(self.ctx.load_state('key1'), 'value1')
        self.assertEqual(self.ctx.load_state('key2'), {'nested': 'data'})

    def test_load_state_default(self):
        """Test load_state returns default for missing key"""
        result = self.ctx.load_state('nonexistent', default='fallback')
        self.assertEqual(result, 'fallback')

    def test_get_all_state(self):
        """Test get_all_state returns copy"""
        self.ctx.save_state('a', 1)
        self.ctx.save_state('b', 2)

        all_state = self.ctx.get_all_state()
        self.assertEqual(all_state, {'a': 1, 'b': 2})

    def test_clear_specific_key(self):
        """Test clearing specific key"""
        self.ctx.save_state('keep', 'value1')
        self.ctx.save_state('remove', 'value2')

        self.ctx.clear_state('remove')

        self.assertEqual(self.ctx.load_state('keep'), 'value1')
        self.assertIsNone(self.ctx.load_state('remove'))

    def test_clear_all_state(self):
        """Test clearing all state"""
        self.ctx.save_state('key1', 'value1')
        self.ctx.save_state('key2', 'value2')

        self.ctx.clear_state()

        self.assertEqual(self.ctx.get_all_state(), {})


class TestPersistentContextCheckpoints(unittest.TestCase):
    """Tests for checkpoint functionality"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.home_patcher = patch.object(
            __import__('pathlib').Path, 'home',
            return_value=__import__('pathlib').Path(self.temp_dir)
        )
        self.home_patcher.start()
        self.ctx = PersistentContext('test-checkpoint', backend='file')

    def tearDown(self):
        self.home_patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_create_checkpoint(self):
        """Test creating checkpoint"""
        self.ctx.save_state('counter', 1)
        self.ctx.checkpoint('step1')

        self.assertIn('step1', self.ctx.list_checkpoints())

    def test_restore_checkpoint(self):
        """Test restoring from checkpoint"""
        self.ctx.save_state('counter', 1)
        self.ctx.checkpoint('step1')

        self.ctx.save_state('counter', 5)
        self.assertEqual(self.ctx.load_state('counter'), 5)

        result = self.ctx.restore_checkpoint('step1')
        self.assertTrue(result)
        self.assertEqual(self.ctx.load_state('counter'), 1)

    def test_restore_nonexistent_checkpoint(self):
        """Test restoring from nonexistent checkpoint"""
        result = self.ctx.restore_checkpoint('nonexistent')
        self.assertFalse(result)


class TestPersistentContextDatabase(unittest.TestCase):
    """Tests for PersistentContext with database backend"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.ctx = PersistentContext('test-db', backend='database', db_path=self.db_path)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_init_creates_tables(self):
        """Test that database tables are created"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='context_store'")
        self.assertIsNotNone(cursor.fetchone())

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='context_checkpoints'")
        self.assertIsNotNone(cursor.fetchone())

        conn.close()

    def test_save_and_load_db(self):
        """Test saving and loading state from database"""
        self.ctx.save_state('db_key', 'db_value')

        # Create new context instance to verify persistence
        ctx2 = PersistentContext('test-db', backend='database', db_path=self.db_path)
        self.assertEqual(ctx2.load_state('db_key'), 'db_value')

    def test_checkpoint_db(self):
        """Test checkpoint with database backend"""
        self.ctx.save_state('value', 10)
        self.ctx.checkpoint('checkpoint1')

        self.ctx.save_state('value', 20)

        self.ctx.restore_checkpoint('checkpoint1')
        self.assertEqual(self.ctx.load_state('value'), 10)


class TestPersistentContextHybrid(unittest.TestCase):
    """Tests for PersistentContext with hybrid backend"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.home_patcher = patch.object(
            __import__('pathlib').Path, 'home',
            return_value=__import__('pathlib').Path(self.temp_dir)
        )
        self.home_patcher.start()
        self.ctx = PersistentContext('test-hybrid', backend='hybrid', db_path=self.db_path)

    def tearDown(self):
        self.home_patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_hybrid_saves_both(self):
        """Test that hybrid backend saves to both file and database"""
        self.ctx.save_state('hybrid_key', 'hybrid_value')

        # Check file
        self.assertTrue(self.ctx.file_path.exists())

        # Check database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM context_store WHERE context_id='test-hybrid' AND key='hybrid_key'")
        row = cursor.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        self.assertEqual(json.loads(row[0]), 'hybrid_value')


if __name__ == '__main__':
    unittest.main()


class TestPersistentContextDBCheckpointRestore(unittest.TestCase):
    """Tests for restoring checkpoints from database"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        self.ctx = PersistentContext('test-restore', backend='database', db_path=self.db_path)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_restore_checkpoint_from_db_only(self):
        """Test restoring checkpoint that exists only in database"""
        self.ctx.save_state('value', 100)
        self.ctx.checkpoint('db_checkpoint')
        self.ctx.save_state('value', 200)
        self.ctx._checkpoints.clear()
        result = self.ctx.restore_checkpoint('db_checkpoint')
        self.assertTrue(result)
        self.assertEqual(self.ctx.load_state('value'), 100)

    def test_list_checkpoints_from_db(self):
        """Test list_checkpoints includes database checkpoints"""
        self.ctx.save_state('v', 1)
        self.ctx.checkpoint('cp1')
        self.ctx.checkpoint('cp2')
        self.ctx._checkpoints.clear()
        checkpoints = self.ctx.list_checkpoints()
        self.assertIn('cp1', checkpoints)
        self.assertIn('cp2', checkpoints)


class TestPersistentContextFileLoad(unittest.TestCase):
    """Tests for file loading functionality"""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.home_patcher = patch.object(
            __import__('pathlib').Path, 'home',
            return_value=__import__('pathlib').Path(self.temp_dir)
        )
        self.home_patcher.start()

    def tearDown(self):
        self.home_patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_load_existing_file(self):
        """Test loading state from existing JSON file"""
        ctx1 = PersistentContext('test-file-load', backend='file')
        ctx1.save_state('key1', 'value1')
        ctx1.save_state('key2', {'nested': 'data'})
        ctx2 = PersistentContext('test-file-load', backend='file')
        self.assertEqual(ctx2.load_state('key1'), 'value1')
        self.assertEqual(ctx2.load_state('key2'), {'nested': 'data'})

    def test_load_corrupted_file_gracefully(self):
        """Test graceful handling of corrupted JSON file"""
        ctx1 = PersistentContext('test-corrupt', backend='file')
        with open(ctx1.file_path, 'w') as f:
            f.write('not valid json {{{')
        ctx2 = PersistentContext('test-corrupt', backend='file')
        self.assertEqual(ctx2.get_all_state(), {})


class TestPersistentContextDBEdgeCases(unittest.TestCase):
    """Tests for database edge cases"""

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_load_invalid_json_from_db(self):
        """Test handling invalid JSON values in database"""
        ctx = PersistentContext('test-invalid', backend='database', db_path=self.db_path)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(
            "INSERT INTO context_store (context_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            ('test-invalid', 'bad_key', 'not valid json', now, now))
        conn.commit()
        conn.close()
        ctx2 = PersistentContext('test-invalid', backend='database', db_path=self.db_path)
        self.assertEqual(ctx2.load_state('bad_key'), 'not valid json')

    def test_load_checkpoint_invalid_json(self):
        """Test loading checkpoint with invalid JSON snapshot"""
        ctx = PersistentContext('test-cp-invalid', backend='database', db_path=self.db_path)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute(
            "INSERT INTO context_checkpoints (context_id, label, state_snapshot, created_at) VALUES (?, ?, ?, ?)",
            ('test-cp-invalid', 'bad_checkpoint', 'invalid json {{{', now))
        conn.commit()
        conn.close()
        ctx._checkpoints.clear()
        result = ctx.restore_checkpoint('bad_checkpoint')
        self.assertFalse(result)

    def test_load_checkpoint_not_found_in_db(self):
        """Test loading checkpoint that does not exist in database"""
        ctx = PersistentContext('test-no-cp', backend='database', db_path=self.db_path)
        ctx._checkpoints.clear()
        result = ctx.restore_checkpoint('nonexistent')
        self.assertFalse(result)
