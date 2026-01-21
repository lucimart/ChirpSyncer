"""
Maintenance Tasks (TASK-002)

Scheduled maintenance tasks for ChirpSyncer including session cleanup,
audit log archiving, database backups, and statistics aggregation.
"""
import os
import shutil
import sqlite3
import time
from typing import Dict


DB_PATH = 'chirpsyncer.db'


def cleanup_expired_sessions(db_path: str = DB_PATH) -> Dict:
    """Delete sessions with expires_at < current time"""
    start = time.time()

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        now = int(time.time())
        cursor.execute('DELETE FROM user_sessions WHERE expires_at < ?', (now,))
        deleted = cursor.rowcount
        conn.commit()
        conn.close()

        return {
            'deleted': deleted,
            'duration_ms': int((time.time() - start) * 1000)
        }
    except Exception as e:
        return {
            'deleted': 0,
            'error': str(e),
            'duration_ms': int((time.time() - start) * 1000)
        }
    finally:
        if 'conn' in locals():
            conn.close()


def archive_audit_logs(days_old: int = 90, db_path: str = DB_PATH) -> Dict:
    """Archive audit logs older than X days"""
    start = time.time()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Create archive table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS archived_audit_logs (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                action TEXT,
                resource_type TEXT,
                resource_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                success INTEGER,
                details TEXT,
                created_at INTEGER,
                archived_at INTEGER
            )
        ''')

        # Calculate cutoff timestamp
        cutoff = int(time.time()) - (days_old * 24 * 60 * 60)

        # Move old logs to archive
        cursor.execute('''
            INSERT INTO archived_audit_logs
            SELECT *, ? as archived_at FROM audit_log
            WHERE created_at < ?
        ''', (int(time.time()), cutoff))

        archived = cursor.rowcount

        # Delete from main table
        cursor.execute('DELETE FROM audit_log WHERE created_at < ?', (cutoff,))

        conn.commit()

        return {
            'archived': archived,
            'duration_ms': int((time.time() - start) * 1000)
        }
    finally:
        conn.close()


def backup_database(backup_dir: str = 'backups', db_path: str = DB_PATH) -> Dict:
    """Create timestamped database backup"""
    start = time.time()

    try:
        # Create backup directory
        os.makedirs(backup_dir, exist_ok=True)

        # Generate backup filename
        timestamp = int(time.time())
        backup_name = f'chirpsyncer_backup_{timestamp}.db'
        backup_path = os.path.join(backup_dir, backup_name)

        # Copy database
        shutil.copy2(db_path, backup_path)

        # Get file size
        size_bytes = os.path.getsize(backup_path)

        return {
            'backup_path': backup_path,
            'size_bytes': size_bytes,
            'duration_ms': int((time.time() - start) * 1000)
        }
    except Exception as e:
        return {
            'error': str(e),
            'duration_ms': int((time.time() - start) * 1000)
        }


def cleanup_inactive_credentials(months: int = 6, db_path: str = DB_PATH) -> Dict:
    """Mark credentials as inactive if last_used > X months ago"""
    start = time.time()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Calculate cutoff timestamp
        cutoff = int(time.time()) - (months * 30 * 24 * 60 * 60)

        # Mark inactive (last_used is NULL or old)
        cursor.execute('''
            UPDATE user_credentials
            SET is_active = 0
            WHERE is_active = 1
            AND (last_used IS NULL OR last_used < ?)
        ''', (cutoff,))

        marked_inactive = cursor.rowcount
        conn.commit()

        return {
            'marked_inactive': marked_inactive,
            'duration_ms': int((time.time() - start) * 1000)
        }
    finally:
        conn.close()


def aggregate_daily_stats(db_path: str = DB_PATH) -> Dict:
    """Aggregate sync_stats into daily summary"""
    start = time.time()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Create daily_stats table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                total_syncs INTEGER DEFAULT 0,
                successful_syncs INTEGER DEFAULT 0,
                failed_syncs INTEGER DEFAULT 0,
                total_posts INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, date)
            )
        ''')

        # Check if sync_stats table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sync_stats'")
        if not cursor.fetchone():
            return {'aggregated': 0, 'duration_ms': int((time.time() - start) * 1000)}

        # Aggregate all dates with data (not just yesterday)
        now = int(time.time())
        cursor.execute('''
            INSERT OR REPLACE INTO daily_stats (date, user_id, total_syncs, successful_syncs, failed_syncs, total_posts, created_at)
            SELECT date(timestamp, 'unixepoch'), COALESCE(user_id, 1), COUNT(*),
                   SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END),
                   SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END),
                   COUNT(*),
                   ?
            FROM sync_stats
            GROUP BY date(timestamp, 'unixepoch'), COALESCE(user_id, 1)
        ''', (now,))

        aggregated = cursor.rowcount
        conn.commit()

        return {
            'aggregated': aggregated,
            'duration_ms': int((time.time() - start) * 1000)
        }
    finally:
        conn.close()


def cleanup_error_logs(days_old: int = 30, db_path: str = DB_PATH) -> Dict:
    """Delete audit log errors older than X days"""
    start = time.time()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cutoff = int(time.time()) - (days_old * 24 * 60 * 60)

        # Delete old error logs
        cursor.execute('''
            DELETE FROM audit_log
            WHERE success = 0 AND created_at < ?
        ''', (cutoff,))

        deleted = cursor.rowcount
        conn.commit()

        return {
            'deleted': deleted,
            'duration_ms': int((time.time() - start) * 1000)
        }
    finally:
        conn.close()


def setup_default_tasks(scheduler):
    """Register all default maintenance tasks with scheduler"""
    # Cleanup sessions - every hour
    scheduler.add_cron_task(
        name='cleanup_sessions',
        func=cleanup_expired_sessions,
        cron_expr='0 * * * *'
    )

    # Backup database - daily at 3 AM
    scheduler.add_cron_task(
        name='backup_database',
        func=backup_database,
        cron_expr='0 3 * * *'
    )

    # Archive audit logs - daily at 2 AM
    scheduler.add_cron_task(
        name='archive_audit_logs',
        func=lambda: archive_audit_logs(90),
        cron_expr='0 2 * * *'
    )

    # Aggregate stats - daily at 1 AM
    scheduler.add_cron_task(
        name='aggregate_daily_stats',
        func=aggregate_daily_stats,
        cron_expr='0 1 * * *'
    )

    # Cleanup error logs - weekly on Sunday at 4 AM
    scheduler.add_cron_task(
        name='cleanup_error_logs',
        func=lambda: cleanup_error_logs(30),
        cron_expr='0 4 * * 0'
    )

    # Cleanup inactive credentials - monthly on 1st at 5 AM
    scheduler.add_cron_task(
        name='cleanup_inactive_credentials',
        func=lambda: cleanup_inactive_credentials(6),
        cron_expr='0 5 1 * *'
    )

    print("✓ All default maintenance tasks registered")
