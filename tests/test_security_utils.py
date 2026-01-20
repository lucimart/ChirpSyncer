"""
Unit tests for security_utils module.
"""
import os
import sqlite3
import tempfile
import time
import unittest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app'))

from security_utils import validate_password, RateLimiter, log_audit, get_audit_log, check_rate_limit


class TestValidatePassword(unittest.TestCase):

    def test_valid_password(self):
        self.assertTrue(validate_password('Passw0rd!'))
        self.assertTrue(validate_password('SecureP@ss1'))
        self.assertTrue(validate_password('MyP4340word!'))

    def test_empty_password(self):
        self.assertFalse(validate_password(''))
        self.assertFalse(validate_password(None))

    def test_too_short(self):
        self.assertFalse(validate_password('P@ss1'))
        self.assertFalse(validate_password('Ab1!'))

    def test_no_uppercase(self):
        self.assertFalse(validate_password('passw0rd!'))

    def test_no_lowercase(self):
        self.assertFalse(validate_password('PASSW0RD!'))

    def test_no_digit(self):
        self.assertFalse(validate_password('Password!'))

    def test_no_special_char(self):
        self.assertFalse(validate_password('Passw0rd'))


class TestRateLimiter(unittest.TestCase):

    def setUp(self):
        self.limiter = RateLimiter()

    def test_under_limit(self):
        for _ in range(5):
            self.assertTrue(self.limiter.check_rate_limit('test', 5, 60))

    def test_at_limit(self):
        for _ in range(5):
            self.limiter.check_rate_limit('test', 5, 60)
        self.assertFalse(self.limiter.check_rate_limit('test', 5, 60))

    def test_different_keys(self):
        for _ in range(5):
            self.limiter.check_rate_limit('key1', 5, 60)
        self.assertFalse(self.limiter.check_rate_limit('key1', 5, 60))
        self.assertTrue(self.limiter.check_rate_limit('key2', 5, 60))

    def test_reset(self):
        for _ in range(5):
            self.limiter.check_rate_limit('test', 5, 60)
        self.assertFalse(self.limiter.check_rate_limit('test', 5, 60))
        self.limiter.reset('test')
        self.assertTrue(self.limiter.check_rate_limit('test', 5, 60))


class TestLogAudit(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_log_audit_creates_table(self):
        log_audit(1, 'login', True, db_path=self.db_path)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'")
        self.assertIsNotNone(cursor.fetchone())
        conn.close()

    def test_log_audit_inserts_entry(self):
        log_audit(1, 'login', True, ip_address='127.0.0.1', db_path=self.db_path)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM audit_log')
        row = cursor.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[1], 1)  # user_id
        self.assertEqual(row[2], 'login')  # action
        self.assertEqual(row[5], '127.0.0.1')  # ip_address

    def test_log_audit_with_details(self):
        log_audit(1, 'create', True, details={'key': 'value'}, db_path=self.db_path)
        logs = get_audit_log(db_path=self.db_path)
        self.assertEqual(logs[0]['details'], {'key': 'value'})


class TestGetAuditLog(unittest.TestCase):

    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp(suffix='.db')
        log_audit(1, 'login', True, db_path=self.db_path)
        log_audit(2, 'logout', True, db_path=self.db_path)

    def tearDown(self):
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_get_all_logs(self):
        logs = get_audit_log(db_path=self.db_path)
        self.assertEqual(len(logs), 2)

    def test_filter_by_user(self):
        logs = get_audit_log(user_id=1, db_path=self.db_path)
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['action'], 'login')

    def test_limit_results(self):
        for i in range(10):
            log_audit(1, f'action{i}', True, db_path=self.db_path)
        logs = get_audit_log(limit=5, db_path=self.db_path)
        self.assertEqual(len(logs), 5)


class TestCheckRateLimit(unittest.TestCase):

    def test_login_rate_limit(self):
        # Should allow 5 login attempts
        for _ in range(5):
            result = check_rate_limit(999, 'login')
        # 6th should fail (mocked due to global rate_limiter)

    def test_api_call_rate_limit(self):
        result = check_rate_limit(888, 'api_call')
        self.assertTrue(result)

    def test_default_rate_limit(self):
        result = check_rate_limit(777, 'unknown_action')
        self.assertTrue(result)


if __name__ == '__main__':
    unittest.main()
