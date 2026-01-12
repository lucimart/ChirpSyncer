"""
Comprehensive tests for app/auth/security_utils.py

This test suite covers:
- Password validation (validate_password)
- Rate limiting (RateLimiter class and check_rate_limit function)
- Audit logging (log_audit and get_audit_log)
- Thread safety
- Edge cases and error handling
"""
import pytest
import sqlite3
import time
import json
import threading
import tempfile
import os
from collections import defaultdict
from unittest.mock import patch, MagicMock

from app.auth.security_utils import (
    validate_password,
    RateLimiter,
    check_rate_limit,
    log_audit,
    get_audit_log,
    rate_limiter,
    PASSWORD_MIN_LENGTH,
    PASSWORD_PATTERNS
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def temp_db():
    """
    Create a temporary database for testing audit logging.

    Yields:
        str: Path to temporary database file

    Cleanup:
        Removes temporary database file after test
    """
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield db_path
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def fresh_rate_limiter():
    """
    Create a fresh RateLimiter instance for testing.

    Ensures each test has an isolated rate limiter instance without
    side effects from previous tests.

    Yields:
        RateLimiter: Fresh rate limiter instance
    """
    limiter = RateLimiter()
    yield limiter
    # No cleanup needed - each instance is independent


@pytest.fixture(autouse=True)
def reset_global_rate_limiter():
    """
    Reset global rate limiter before each test.

    Ensures tests don't interfere with each other through the global
    rate_limiter instance.
    """
    # Reset attempts
    rate_limiter._attempts.clear()
    yield
    # Cleanup after test
    rate_limiter._attempts.clear()


# ============================================================================
# TEST CLASS 1: Password Validation
# ============================================================================

class TestValidatePassword:
    """
    Test password validation functionality.

    Tests the validate_password() function for compliance with password
    security requirements: minimum length, uppercase, lowercase, digits,
    and special characters.
    """

    def test_valid_password_all_requirements(self):
        """Test password meeting all requirements"""
        password = "SecurePass123!"
        assert validate_password(password) is True

    def test_valid_password_complex(self):
        """Test complex valid password with multiple special chars"""
        password = "MyP@ssw0rd!#$"
        assert validate_password(password) is True

    def test_valid_password_exactly_min_length(self):
        """Test password with exactly minimum required length"""
        password = "Abc1!xyz"
        assert validate_password(password) is True
        assert len(password) == PASSWORD_MIN_LENGTH

    def test_invalid_password_empty(self):
        """Test empty password returns False"""
        assert validate_password("") is False

    def test_invalid_password_none(self):
        """Test None password returns False"""
        assert validate_password(None) is False

    def test_invalid_password_too_short(self):
        """Test password shorter than minimum length"""
        password = "Abc1!xy"  # 7 characters
        assert validate_password(password) is False

    def test_invalid_password_no_uppercase(self):
        """Test password without uppercase letter"""
        password = "securepass123!"
        assert validate_password(password) is False

    def test_invalid_password_no_lowercase(self):
        """Test password without lowercase letter"""
        password = "SECUREPASS123!"
        assert validate_password(password) is False

    def test_invalid_password_no_digit(self):
        """Test password without digit"""
        password = "SecurePassword!"
        assert validate_password(password) is False

    def test_invalid_password_no_special_char(self):
        """Test password without special character"""
        password = "SecurePass123"
        assert validate_password(password) is False


# ============================================================================
# TEST CLASS 2: RateLimiter.check_rate_limit()
# ============================================================================

class TestRateLimiterCheckRateLimit:
    """
    Test RateLimiter.check_rate_limit() method.

    Tests the sliding window rate limiting algorithm for various scenarios
    including limit enforcement, window expiration, and edge cases.
    """

    def test_first_attempt_always_allowed(self, fresh_rate_limiter):
        """Test first attempt is always allowed"""
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
        assert result is True

    def test_multiple_attempts_within_limit(self, fresh_rate_limiter):
        """Test multiple attempts within limit are allowed"""
        for i in range(5):
            result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
            assert result is True

    def test_attempt_exceeding_limit_denied(self, fresh_rate_limiter):
        """Test attempt exceeding limit is denied"""
        for i in range(5):
            fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)

        # 6th attempt should be denied
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
        assert result is False

    def test_different_keys_independent(self, fresh_rate_limiter):
        """Test rate limits are independent for different keys"""
        for i in range(5):
            fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)

        # user2 should still have attempts available
        result = fresh_rate_limiter.check_rate_limit("user2", max_attempts=5, window_seconds=60)
        assert result is True

    def test_window_expiration_allows_new_attempts(self, fresh_rate_limiter):
        """Test that attempts are reset after window expires"""
        # Make 5 attempts
        for i in range(5):
            fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=1)

        # Should be denied
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=1)
        assert result is False

        # Wait for window to expire
        time.sleep(1.1)

        # Should be allowed now
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=1)
        assert result is True

    def test_zero_max_attempts(self, fresh_rate_limiter):
        """Test behavior with zero max attempts"""
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=0, window_seconds=60)
        assert result is False

    def test_single_attempt_limit(self, fresh_rate_limiter):
        """Test rate limiter with max_attempts=1"""
        result1 = fresh_rate_limiter.check_rate_limit("user1", max_attempts=1, window_seconds=60)
        assert result1 is True

        result2 = fresh_rate_limiter.check_rate_limit("user1", max_attempts=1, window_seconds=60)
        assert result2 is False


# ============================================================================
# TEST CLASS 3: RateLimiter.reset()
# ============================================================================

class TestRateLimiterReset:
    """
    Test RateLimiter.reset() method.

    Tests the reset functionality to clear rate limit counters for
    specific keys, enabling recovery from rate limit violations.
    """

    def test_reset_clears_attempts(self, fresh_rate_limiter):
        """Test reset clears all attempts for a key"""
        # Add attempts
        for i in range(5):
            fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)

        # Should be at limit
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
        assert result is False

        # Reset
        fresh_rate_limiter.reset("user1")

        # Should allow attempt now
        result = fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
        assert result is True

    def test_reset_nonexistent_key(self, fresh_rate_limiter):
        """Test reset on nonexistent key doesn't raise error"""
        # Should not raise
        fresh_rate_limiter.reset("nonexistent")

    def test_reset_only_affects_specified_key(self, fresh_rate_limiter):
        """Test reset only affects the specified key"""
        # Add attempts for two users
        for i in range(5):
            fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60)
            fresh_rate_limiter.check_rate_limit("user2", max_attempts=5, window_seconds=60)

        # Both should be at limit
        assert fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60) is False
        assert fresh_rate_limiter.check_rate_limit("user2", max_attempts=5, window_seconds=60) is False

        # Reset only user1
        fresh_rate_limiter.reset("user1")

        # user1 should be allowed, user2 should still be denied
        assert fresh_rate_limiter.check_rate_limit("user1", max_attempts=5, window_seconds=60) is True
        assert fresh_rate_limiter.check_rate_limit("user2", max_attempts=5, window_seconds=60) is False


# ============================================================================
# TEST CLASS 4: check_rate_limit() Function
# ============================================================================

class TestCheckRateLimit:
    """
    Test check_rate_limit() wrapper function.

    Tests the high-level rate limit checking function with different
    action types and their corresponding limits.
    """

    def test_login_rate_limit_allows_within_limit(self):
        """Test login action allows 5 attempts within 15 minutes"""
        for i in range(5):
            result = check_rate_limit(user_id=1, action='login')
            assert result is True

    def test_login_rate_limit_denies_exceeding(self):
        """Test login action denies 6th attempt"""
        for i in range(5):
            check_rate_limit(user_id=1, action='login')

        result = check_rate_limit(user_id=1, action='login')
        assert result is False

    def test_api_call_rate_limit_allows_within_limit(self):
        """Test api_call action allows 100 requests within 1 minute"""
        for i in range(100):
            result = check_rate_limit(user_id=2, action='api_call')
            assert result is True

    def test_api_call_rate_limit_denies_exceeding(self):
        """Test api_call action denies 101st request"""
        for i in range(100):
            check_rate_limit(user_id=2, action='api_call')

        result = check_rate_limit(user_id=2, action='api_call')
        assert result is False

    def test_unknown_action_default_limit(self):
        """Test unknown action uses default limit (50/min)"""
        for i in range(50):
            result = check_rate_limit(user_id=3, action='unknown_action')
            assert result is True

        result = check_rate_limit(user_id=3, action='unknown_action')
        assert result is False

    def test_different_users_independent_limits(self):
        """Test rate limits are independent for different users"""
        # User 1 hits login limit
        for i in range(5):
            check_rate_limit(user_id=1, action='login')
        assert check_rate_limit(user_id=1, action='login') is False

        # User 2 should still be able to login
        assert check_rate_limit(user_id=2, action='login') is True

    def test_same_user_different_actions_independent(self):
        """Test different actions are tracked independently"""
        user_id = 10

        # Hit login limit
        for i in range(5):
            check_rate_limit(user_id=user_id, action='login')
        assert check_rate_limit(user_id=user_id, action='login') is False

        # Should still be able to make api_call
        assert check_rate_limit(user_id=user_id, action='api_call') is True


# ============================================================================
# TEST CLASS 5: log_audit()
# ============================================================================

class TestLogAudit:
    """
    Test log_audit() function.

    Tests audit logging with various parameter combinations, database
    operations, and error handling.
    """

    def test_audit_log_basic_fields(self, temp_db):
        """Test audit log with basic required fields"""
        log_audit(user_id=1, action='login', success=True, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_log")
        rows = cursor.fetchall()
        conn.close()

        assert len(rows) == 1
        assert rows[0][1] == 1  # user_id
        assert rows[0][2] == 'login'  # action
        assert rows[0][7] == 1  # success (True -> 1)

    def test_audit_log_with_optional_fields(self, temp_db):
        """Test audit log with optional fields"""
        log_audit(
            user_id=2,
            action='create_cred',
            success=True,
            resource_type='credential',
            resource_id=100,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0',
            details={'extra': 'data'},
            db_path=temp_db
        )

        conn = sqlite3.connect(temp_db)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_log")
        row = cursor.fetchone()
        conn.close()

        assert dict(row)['user_id'] == 2
        assert dict(row)['resource_type'] == 'credential'
        assert dict(row)['resource_id'] == 100
        assert dict(row)['ip_address'] == '192.168.1.1'
        assert dict(row)['user_agent'] == 'Mozilla/5.0'

    def test_audit_log_success_false(self, temp_db):
        """Test audit log with success=False"""
        log_audit(user_id=3, action='login', success=False, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT success FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        assert result[0] == 0

    def test_audit_log_user_id_none(self, temp_db):
        """Test audit log with user_id=None (e.g., failed login)"""
        log_audit(user_id=None, action='login', success=False, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        assert result[0] is None

    def test_audit_log_details_serialization(self, temp_db):
        """Test audit log correctly serializes details as JSON"""
        details = {'key': 'value', 'nested': {'inner': 'data'}}
        log_audit(user_id=4, action='test', success=True, details=details, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT details FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        stored_details = json.loads(result[0])
        assert stored_details == details

    def test_audit_log_details_none(self, temp_db):
        """Test audit log with details=None"""
        log_audit(user_id=5, action='test', success=True, details=None, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT details FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        assert result[0] is None

    def test_audit_log_timestamps_recorded(self, temp_db):
        """Test that audit log timestamps are recorded"""
        before = int(time.time())
        log_audit(user_id=6, action='test', success=True, db_path=temp_db)
        after = int(time.time())

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT created_at FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        timestamp = result[0]
        assert before <= timestamp <= after

    def test_audit_log_creates_table_if_not_exists(self, temp_db):
        """Test that audit log table is created if it doesn't exist"""
        # Log before table exists
        log_audit(user_id=7, action='test', success=True, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'")
        result = cursor.fetchone()
        conn.close()

        assert result is not None

    def test_audit_log_multiple_entries(self, temp_db):
        """Test multiple audit log entries"""
        for i in range(5):
            log_audit(user_id=i, action='action_' + str(i), success=True, db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM audit_log")
        result = cursor.fetchone()
        conn.close()

        assert result[0] == 5

    def test_audit_log_exception_handling(self, temp_db):
        """Test audit log handles exceptions gracefully"""
        # Use invalid path to cause exception
        log_audit(user_id=8, action='test', success=True, db_path='/invalid/path/db.db')
        # Should not raise, but print warning


# ============================================================================
# TEST CLASS 6: get_audit_log()
# ============================================================================

class TestGetAuditLog:
    """
    Test get_audit_log() function.

    Tests retrieval of audit logs with filtering, limiting, and
    proper data deserialization.
    """

    def test_get_audit_log_all_entries(self, temp_db):
        """Test retrieving all audit log entries"""
        for i in range(5):
            log_audit(user_id=i, action='action', success=True, db_path=temp_db)

        logs = get_audit_log(db_path=temp_db)
        assert len(logs) == 5

    def test_get_audit_log_filter_by_user(self, temp_db):
        """Test filtering audit log by user_id"""
        for i in range(5):
            log_audit(user_id=i, action='action', success=True, db_path=temp_db)

        logs = get_audit_log(user_id=2, db_path=temp_db)
        assert len(logs) == 1
        assert logs[0]['user_id'] == 2

    def test_get_audit_log_limit(self, temp_db):
        """Test limit parameter"""
        for i in range(10):
            log_audit(user_id=1, action='action', success=True, db_path=temp_db)

        logs = get_audit_log(limit=5, db_path=temp_db)
        assert len(logs) == 5

    def test_get_audit_log_default_limit(self, temp_db):
        """Test default limit is 100"""
        for i in range(150):
            log_audit(user_id=1, action='action', success=True, db_path=temp_db)

        logs = get_audit_log(db_path=temp_db)
        assert len(logs) == 100

    def test_get_audit_log_ordered_by_timestamp(self, temp_db):
        """Test logs are ordered by timestamp descending"""
        for i in range(3):
            log_audit(user_id=1, action='action_' + str(i), success=True, db_path=temp_db)

        logs = get_audit_log(db_path=temp_db)
        # Verify ordering is descending by created_at
        assert logs[0]['created_at'] >= logs[1]['created_at'] >= logs[2]['created_at']

    def test_get_audit_log_deserializes_details(self, temp_db):
        """Test that details JSON is properly deserialized"""
        details = {'key': 'value', 'number': 42}
        log_audit(user_id=1, action='action', success=True, details=details, db_path=temp_db)

        logs = get_audit_log(db_path=temp_db)
        assert logs[0]['details'] == details
        assert isinstance(logs[0]['details'], dict)

    def test_get_audit_log_handles_invalid_json(self, temp_db):
        """Test handling of invalid JSON in details field"""
        # Manually insert invalid JSON
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER,
                details TEXT,
                created_at INTEGER NOT NULL
            )
        ''')
        cursor.execute('''
            INSERT INTO audit_log (user_id, action, success, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (1, 'action', 1, 'invalid json {', int(time.time())))
        conn.commit()
        conn.close()

        logs = get_audit_log(db_path=temp_db)
        assert len(logs) == 1
        # Details should remain as string due to JSON decode error
        assert logs[0]['details'] == 'invalid json {'

    def test_get_audit_log_nonexistent_table(self, temp_db):
        """Test getting logs when table doesn't exist"""
        logs = get_audit_log(db_path=temp_db)
        assert logs == []


# ============================================================================
# TEST CLASS 7: Audit Log Integration
# ============================================================================

class TestAuditLogIntegration:
    """
    Test integration between log_audit() and get_audit_log().

    Tests end-to-end audit logging workflows with various scenarios
    and data preservation.
    """

    def test_audit_log_roundtrip(self, temp_db):
        """Test audit log data is preserved in roundtrip"""
        original_data = {
            'user_id': 123,
            'action': 'create_cred',
            'success': True,
            'resource_type': 'credential',
            'resource_id': 456,
            'ip_address': '10.0.0.1',
            'user_agent': 'Test Agent',
            'details': {'key': 'value'}
        }

        log_audit(**original_data, db_path=temp_db)
        logs = get_audit_log(db_path=temp_db)

        assert len(logs) == 1
        log_entry = logs[0]
        assert log_entry['user_id'] == original_data['user_id']
        assert log_entry['action'] == original_data['action']
        assert log_entry['success'] == 1
        assert log_entry['resource_type'] == original_data['resource_type']
        assert log_entry['resource_id'] == original_data['resource_id']
        assert log_entry['ip_address'] == original_data['ip_address']
        assert log_entry['user_agent'] == original_data['user_agent']
        assert log_entry['details'] == original_data['details']

    def test_audit_log_multiple_users_filtered(self, temp_db):
        """Test filtering logs from multiple users"""
        # Log actions from different users
        for user_id in range(1, 4):
            for i in range(3):
                log_audit(user_id=user_id, action=f'action_{i}', success=True, db_path=temp_db)

        # Get logs for user 2
        logs = get_audit_log(user_id=2, db_path=temp_db)

        assert len(logs) == 3
        assert all(log['user_id'] == 2 for log in logs)

    def test_audit_log_success_and_failure(self, temp_db):
        """Test logging both successful and failed actions"""
        log_audit(user_id=1, action='login', success=True, db_path=temp_db)
        time.sleep(0.1)  # Ensure different timestamps
        log_audit(user_id=2, action='login', success=False, db_path=temp_db)

        logs = get_audit_log(db_path=temp_db)

        assert len(logs) == 2
        # Check that we have one success and one failure (order may vary)
        success_values = [log['success'] for log in logs]
        assert 0 in success_values  # At least one failure
        assert 1 in success_values  # At least one success


# ============================================================================
# TEST CLASS 8: Thread Safety
# ============================================================================

class TestThreadSafety:
    """
    Test thread safety of rate limiting and audit logging.

    Tests concurrent access to rate limiter and audit logging to ensure
    data integrity and no race conditions.
    """

    def test_rate_limiter_thread_safe_increments(self, fresh_rate_limiter):
        """Test rate limiter handles concurrent increments safely"""
        num_threads = 10
        attempts_per_thread = 10
        results = []

        def make_attempts():
            for _ in range(attempts_per_thread):
                result = fresh_rate_limiter.check_rate_limit("shared_key", max_attempts=100, window_seconds=60)
                results.append(result)

        threads = [threading.Thread(target=make_attempts) for _ in range(num_threads)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Total attempts = 100, all should be allowed
        assert len(results) == num_threads * attempts_per_thread
        assert sum(results) == num_threads * attempts_per_thread

    def test_rate_limiter_thread_safe_limit_enforcement(self, fresh_rate_limiter):
        """Test rate limiter enforces limit correctly under threading"""
        max_attempts = 50
        num_threads = 20
        results = []
        lock = threading.Lock()

        def make_attempts():
            # Each thread tries to exceed the limit
            for _ in range(10):
                result = fresh_rate_limiter.check_rate_limit("key", max_attempts=max_attempts, window_seconds=60)
                with lock:
                    results.append(result)

        threads = [threading.Thread(target=make_attempts) for _ in range(num_threads)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Total attempts = 200, only 50 should succeed
        assert len([r for r in results if r is True]) == max_attempts
        assert len([r for r in results if r is False]) == (num_threads * 10 - max_attempts)

    def test_audit_log_thread_safe_writes(self, temp_db):
        """Test concurrent audit log writes are thread-safe"""
        num_threads = 10
        logs_per_thread = 5

        def log_entries():
            for i in range(logs_per_thread):
                log_audit(user_id=threading.current_thread().ident, action=f'action_{i}', success=True, db_path=temp_db)

        threads = [threading.Thread(target=log_entries) for _ in range(num_threads)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Verify all logs were written
        logs = get_audit_log(limit=1000, db_path=temp_db)
        assert len(logs) == num_threads * logs_per_thread


# ============================================================================
# TEST CLASS 9: Edge Cases and Error Handling
# ============================================================================

class TestEdgeCasesAndErrorHandling:
    """
    Test edge cases and error handling across security utilities.

    Tests boundary conditions, invalid inputs, and graceful error
    handling to ensure robustness.
    """

    def test_rate_limiter_very_short_window(self, fresh_rate_limiter):
        """Test rate limiter with very short time window"""
        # 100ms window
        result = fresh_rate_limiter.check_rate_limit("key", max_attempts=2, window_seconds=0.1)
        assert result is True

        result = fresh_rate_limiter.check_rate_limit("key", max_attempts=2, window_seconds=0.1)
        assert result is True

        result = fresh_rate_limiter.check_rate_limit("key", max_attempts=2, window_seconds=0.1)
        assert result is False

        # Wait for window to expire
        time.sleep(0.15)

        result = fresh_rate_limiter.check_rate_limit("key", max_attempts=2, window_seconds=0.1)
        assert result is True

    def test_rate_limiter_empty_key(self, fresh_rate_limiter):
        """Test rate limiter with empty string key"""
        result = fresh_rate_limiter.check_rate_limit("", max_attempts=5, window_seconds=60)
        assert result is True

    def test_password_validation_boundary_length(self):
        """Test password validation at length boundaries"""
        # 7 chars - too short
        assert validate_password("Abc1!xy") is False

        # 8 chars - minimum
        assert validate_password("Abc1!xyz") is True

        # Very long password
        assert validate_password("Abc1!" + "x" * 1000) is True

    def test_password_validation_special_chars_variety(self):
        """Test various special characters in password"""
        special_chars = "!@#$%^&*(),.?\":{}|<>"
        for char in special_chars:
            password = f"Pass123{char}"
            result = validate_password(password)
            assert result is True, f"Failed for special char: {char}"

    def test_audit_log_with_unicode_characters(self, temp_db):
        """Test audit log with unicode characters"""
        log_audit(
            user_id=1,
            action='test_unicode',
            success=True,
            ip_address='192.168.1.1',
            details={'unicode': '你好世界 🌍'},
            db_path=temp_db
        )

        logs = get_audit_log(db_path=temp_db)
        assert len(logs) == 1
        assert logs[0]['details']['unicode'] == '你好世界 🌍'

    def test_audit_log_with_large_details(self, temp_db):
        """Test audit log with large details dictionary"""
        large_details = {f'key_{i}': f'value_{i}' for i in range(1000)}
        log_audit(
            user_id=1,
            action='test_large',
            success=True,
            details=large_details,
            db_path=temp_db
        )

        logs = get_audit_log(db_path=temp_db)
        assert logs[0]['details'] == large_details

    def test_check_rate_limit_with_large_user_id(self):
        """Test check_rate_limit with very large user_id"""
        large_user_id = 9999999999
        result = check_rate_limit(user_id=large_user_id, action='login')
        assert result is True

    def test_rate_limiter_large_window(self, fresh_rate_limiter):
        """Test rate limiter with very large time window"""
        # 24 hour window
        key = "test_key"
        for i in range(1000):
            result = fresh_rate_limiter.check_rate_limit(key, max_attempts=1000, window_seconds=86400)
            assert result is True

        # 1001st should fail
        result = fresh_rate_limiter.check_rate_limit(key, max_attempts=1000, window_seconds=86400)
        assert result is False


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
