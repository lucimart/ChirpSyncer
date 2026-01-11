import sqlite3
import os
import tempfile
import time
from app.stats_handler import StatsTracker
from app.db_handler import add_stats_tables


def test_record_successful_sync():
    """Test recording a successful sync operation"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record a successful sync
        tracker.record_sync(
            source='twitter',
            target='bluesky',
            success=True,
            media_count=2,
            is_thread=False,
            duration_ms=150
        )

        # Verify it was recorded
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sync_stats")
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Sync should be recorded"
        # Row format: (id, timestamp, source, target, success, media_count, is_thread, error_type, error_message, duration_ms)
        assert row[2] == 'twitter', "Source should be twitter"
        assert row[3] == 'bluesky', "Target should be bluesky"
        assert row[4] == 1, "Success should be 1"
        assert row[5] == 2, "Media count should be 2"
        assert row[6] == 0, "is_thread should be 0"
        assert row[9] == 150, "Duration should be 150ms"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_record_failed_sync():
    """Test recording a failed sync operation"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record a failed sync
        tracker.record_sync(
            source='bluesky',
            target='twitter',
            success=False,
            media_count=0,
            is_thread=False,
            duration_ms=50
        )

        # Verify it was recorded
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sync_stats WHERE success = 0")
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Failed sync should be recorded"
        assert row[2] == 'bluesky', "Source should be bluesky"
        assert row[3] == 'twitter', "Target should be twitter"
        assert row[4] == 0, "Success should be 0"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_record_thread_sync():
    """Test recording a thread synchronization"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record a thread sync
        tracker.record_sync(
            source='twitter',
            target='bluesky',
            success=True,
            media_count=0,
            is_thread=True,
            duration_ms=300
        )

        # Verify it was recorded
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sync_stats WHERE is_thread = 1")
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Thread sync should be recorded"
        assert row[6] == 1, "is_thread should be 1"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_record_error():
    """Test recording an error"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record an error
        tracker.record_error(
            source='twitter',
            target='bluesky',
            error_type='APIError',
            error_message='Rate limit exceeded'
        )

        # Verify it was recorded
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sync_stats WHERE error_type IS NOT NULL")
        row = cursor.fetchone()
        conn.close()

        assert row is not None, "Error should be recorded"
        assert row[4] == 0, "Success should be 0 for errors"
        assert row[7] == 'APIError', "Error type should match"
        assert row[8] == 'Rate limit exceeded', "Error message should match"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_stats_24h():
    """Test retrieving statistics for 24 hour period"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record multiple syncs
        tracker.record_sync('twitter', 'bluesky', True, media_count=1)
        tracker.record_sync('twitter', 'bluesky', True, media_count=0, is_thread=True)
        tracker.record_sync('bluesky', 'twitter', True, media_count=2)
        tracker.record_sync('twitter', 'bluesky', False)

        # Get stats
        stats = tracker.get_stats(period='24h')

        assert stats is not None, "Stats should be returned"
        assert stats['total_syncs'] == 4, "Total syncs should be 4"
        assert stats['successful_syncs'] == 3, "Successful syncs should be 3"
        assert stats['failed_syncs'] == 1, "Failed syncs should be 1"
        assert stats['twitter_to_bluesky'] == 3, "Twitter to Bluesky syncs should be 3"
        assert stats['bluesky_to_twitter'] == 1, "Bluesky to Twitter syncs should be 1"
        assert stats['total_media'] == 3, "Total media should be 3"
        assert stats['total_threads'] == 1, "Total threads should be 1"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_stats_1h():
    """Test retrieving statistics for 1 hour period"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record syncs
        tracker.record_sync('twitter', 'bluesky', True)
        tracker.record_sync('bluesky', 'twitter', True)

        # Get stats for 1 hour
        stats = tracker.get_stats(period='1h')

        assert stats is not None, "Stats should be returned"
        assert stats['total_syncs'] == 2, "Total syncs should be 2"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_stats_7d():
    """Test retrieving statistics for 7 day period"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record syncs
        tracker.record_sync('twitter', 'bluesky', True)

        # Get stats for 7 days
        stats = tracker.get_stats(period='7d')

        assert stats is not None, "Stats should be returned"
        assert stats['total_syncs'] == 1, "Total syncs should be 1"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_stats_no_data():
    """Test retrieving statistics when no data exists"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Get stats with no data
        stats = tracker.get_stats(period='24h')

        assert stats is not None, "Stats should be returned even with no data"
        assert stats['total_syncs'] == 0, "Total syncs should be 0"
        assert stats['successful_syncs'] == 0, "Successful syncs should be 0"
        assert stats['failed_syncs'] == 0, "Failed syncs should be 0"
        assert stats['twitter_to_bluesky'] == 0, "Twitter to Bluesky syncs should be 0"
        assert stats['bluesky_to_twitter'] == 0, "Bluesky to Twitter syncs should be 0"
        assert stats['total_media'] == 0, "Total media should be 0"
        assert stats['total_threads'] == 0, "Total threads should be 0"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_error_log():
    """Test retrieving error log"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record errors
        tracker.record_error('twitter', 'bluesky', 'APIError', 'Error 1')
        tracker.record_error('bluesky', 'twitter', 'NetworkError', 'Error 2')
        tracker.record_error('twitter', 'bluesky', 'ValidationError', 'Error 3')

        # Get error log
        errors = tracker.get_error_log(limit=100)

        assert errors is not None, "Errors should be returned"
        assert len(errors) == 3, "Should have 3 errors"

        # Check first error (most recent)
        assert errors[0]['error_type'] == 'ValidationError', "First error should be ValidationError"
        assert errors[0]['error_message'] == 'Error 3', "Error message should match"
        assert errors[0]['source'] == 'twitter', "Source should be twitter"
        assert errors[0]['target'] == 'bluesky', "Target should be bluesky"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_error_log_with_limit():
    """Test retrieving error log with limit"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record multiple errors
        for i in range(10):
            tracker.record_error('twitter', 'bluesky', f'ErrorType{i}', f'Error {i}')

        # Get error log with limit
        errors = tracker.get_error_log(limit=5)

        assert len(errors) == 5, "Should respect limit of 5"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_error_log_no_errors():
    """Test retrieving error log when no errors exist"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Get error log with no errors
        errors = tracker.get_error_log(limit=100)

        assert errors is not None, "Errors list should be returned"
        assert len(errors) == 0, "Should have no errors"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_success_rate():
    """Test calculating success rate"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record syncs: 7 successful, 3 failed = 70% success rate
        for i in range(7):
            tracker.record_sync('twitter', 'bluesky', True)
        for i in range(3):
            tracker.record_sync('twitter', 'bluesky', False)

        # Get success rate
        success_rate = tracker.get_success_rate(period='24h')

        assert success_rate == 70.0, "Success rate should be 70%"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_success_rate_no_data():
    """Test calculating success rate with no data"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Get success rate with no data
        success_rate = tracker.get_success_rate(period='24h')

        assert success_rate == 0.0, "Success rate should be 0 with no data"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_get_success_rate_all_successful():
    """Test calculating success rate with all successful syncs"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record all successful syncs
        for i in range(10):
            tracker.record_sync('twitter', 'bluesky', True)

        # Get success rate
        success_rate = tracker.get_success_rate(period='24h')

        assert success_rate == 100.0, "Success rate should be 100%"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_stats_timestamp_filtering():
    """Test that old stats are filtered out based on period"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Insert an old record (2 days ago) directly into database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        old_timestamp = int(time.time()) - (2 * 24 * 3600)  # 2 days ago
        cursor.execute("""
        INSERT INTO sync_stats (timestamp, source, target, success, media_count, is_thread, duration_ms)
        VALUES (?, 'twitter', 'bluesky', 1, 0, 0, 100)
        """, (old_timestamp,))
        conn.commit()
        conn.close()

        # Record a recent sync
        tracker.record_sync('twitter', 'bluesky', True)

        # Get stats for 24h - should only include recent sync
        stats = tracker.get_stats(period='24h')
        assert stats['total_syncs'] == 1, "Should only count syncs within 24h"

        # Get stats for 7d - should include both
        stats = tracker.get_stats(period='7d')
        assert stats['total_syncs'] == 2, "Should count syncs within 7d"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_invalid_period():
    """Test handling of invalid period parameter"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_file:
        db_path = tmp_file.name

    try:
        add_stats_tables(db_path=db_path)
        tracker = StatsTracker(db_path=db_path)

        # Record a sync
        tracker.record_sync('twitter', 'bluesky', True)

        # Get stats with invalid period (should default to 24h)
        stats = tracker.get_stats(period='invalid')

        assert stats is not None, "Stats should be returned even with invalid period"
        assert stats['total_syncs'] == 1, "Should default to reasonable period"
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)
