"""
Tests for TaskScheduler (TASK-001)

Comprehensive tests for APScheduler-based task scheduling system.
Tests cover task registration, execution, persistence, and management.
"""
import pytest
import time
import os
import tempfile
import sqlite3
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.task_scheduler import TaskScheduler


@pytest.fixture
def temp_db():
    """Create temporary test database"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    yield path
    if os.path.exists(path):
        os.unlink(path)


@pytest.fixture
def scheduler(temp_db):
    """Create TaskScheduler instance"""
    sched = TaskScheduler(db_path=temp_db)
    yield sched
    sched.stop()


def dummy_task():
    """Dummy task for testing"""
    return {'status': 'success', 'message': 'Task completed'}


def failing_task():
    """Task that always fails"""
    raise ValueError("Task failed intentionally")


class TestSchedulerInitialization:
    """Tests for scheduler initialization"""

    def test_scheduler_creates_tables(self, temp_db):
        """Test that scheduler creates required database tables"""
        scheduler = TaskScheduler(db_path=temp_db)

        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()

        # Check scheduled_tasks table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_tasks'")
        assert cursor.fetchone() is not None

        # Check task_executions table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='task_executions'")
        assert cursor.fetchone() is not None

        conn.close()
        scheduler.stop()

    def test_scheduler_starts_and_stops(self, scheduler):
        """Test scheduler can start and stop"""
        scheduler.start()
        assert scheduler.is_running()

        scheduler.stop()
        assert not scheduler.is_running()


class TestAddCronTask:
    """Tests for adding cron tasks"""

    def test_add_cron_task_success(self, scheduler):
        """Test adding a cron task successfully"""
        result = scheduler.add_cron_task(
            name='test_hourly',
            func=dummy_task,
            cron_expr='0 * * * *'  # Every hour
        )
        assert result is True

        # Verify task is in database
        tasks = scheduler.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0]['task_name'] == 'test_hourly'
        assert tasks[0]['task_type'] == 'cron'
        assert tasks[0]['schedule'] == '0 * * * *'

    def test_add_duplicate_cron_task_fails(self, scheduler):
        """Test adding duplicate task name fails"""
        scheduler.add_cron_task('test_task', dummy_task, '0 * * * *')

        # Try to add again with same name
        result = scheduler.add_cron_task('test_task', dummy_task, '0 0 * * *')
        assert result is False

    def test_add_cron_task_invalid_expression(self, scheduler):
        """Test adding task with invalid cron expression fails"""
        result = scheduler.add_cron_task(
            name='invalid_task',
            func=dummy_task,
            cron_expr='invalid cron'
        )
        assert result is False


class TestAddIntervalTask:
    """Tests for adding interval tasks"""

    def test_add_interval_task_success(self, scheduler):
        """Test adding interval task successfully"""
        result = scheduler.add_interval_task(
            name='test_interval',
            func=dummy_task,
            seconds=60
        )
        assert result is True

        tasks = scheduler.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0]['task_type'] == 'interval'
        assert '60' in tasks[0]['schedule']

    def test_add_interval_task_zero_seconds_fails(self, scheduler):
        """Test adding interval task with 0 seconds fails"""
        result = scheduler.add_interval_task('test', dummy_task, 0)
        assert result is False


class TestAddDateTask:
    """Tests for adding one-time date tasks"""

    def test_add_date_task_success(self, scheduler):
        """Test adding date task successfully"""
        run_date = datetime.now() + timedelta(seconds=5)

        result = scheduler.add_date_task(
            name='test_once',
            func=dummy_task,
            run_date=run_date
        )
        assert result is True

        tasks = scheduler.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0]['task_type'] == 'date'

    def test_add_date_task_past_date_fails(self, scheduler):
        """Test adding task with past date fails"""
        past_date = datetime.now() - timedelta(hours=1)

        result = scheduler.add_date_task('test', dummy_task, past_date)
        assert result is False


class TestTaskExecution:
    """Tests for task execution and tracking"""

    def test_task_execution_tracked(self, scheduler):
        """Test that task execution is recorded"""
        scheduler.add_interval_task('quick_task', dummy_task, seconds=1)
        scheduler.start()

        # Wait for task to execute
        time.sleep(2.5)

        # Check execution was recorded
        history = scheduler.get_task_history('quick_task', limit=10)
        assert len(history) >= 1
        assert history[0]['status'] == 'success'

    def test_failed_task_execution_tracked(self, scheduler):
        """Test that failed task execution is recorded"""
        scheduler.add_interval_task('failing_task', failing_task, seconds=1)
        scheduler.start()

        # Wait for task to execute
        time.sleep(2.5)

        history = scheduler.get_task_history('failing_task', limit=10)
        assert len(history) >= 1
        assert history[0]['status'] == 'failed'
        assert 'Task failed intentionally' in (history[0]['error'] or '')


class TestTaskManagement:
    """Tests for task management operations"""

    def test_remove_task(self, scheduler):
        """Test removing a task"""
        scheduler.add_cron_task('removable', dummy_task, '0 * * * *')
        assert len(scheduler.get_all_tasks()) == 1

        result = scheduler.remove_task('removable')
        assert result is True
        assert len(scheduler.get_all_tasks()) == 0

    def test_remove_nonexistent_task(self, scheduler):
        """Test removing non-existent task"""
        result = scheduler.remove_task('nonexistent')
        assert result is False

    def test_pause_task(self, scheduler):
        """Test pausing a task"""
        scheduler.add_cron_task('pausable', dummy_task, '0 * * * *')

        result = scheduler.pause_task('pausable')
        assert result is True

        # Verify task is disabled
        tasks = scheduler.get_all_tasks()
        assert tasks[0]['enabled'] == 0

    def test_resume_task(self, scheduler):
        """Test resuming a paused task"""
        scheduler.add_cron_task('resumable', dummy_task, '0 * * * *')
        scheduler.pause_task('resumable')

        result = scheduler.resume_task('resumable')
        assert result is True

        # Verify task is enabled
        tasks = scheduler.get_all_tasks()
        assert tasks[0]['enabled'] == 1

    def test_trigger_task_now(self, scheduler):
        """Test manually triggering a task"""
        scheduler.add_cron_task('manual_task', dummy_task, '0 0 * * *')  # Daily

        result = scheduler.trigger_task_now('manual_task')
        assert result is True

        # Wait for execution
        time.sleep(1)

        # Check execution was recorded
        history = scheduler.get_task_history('manual_task')
        assert len(history) >= 1


class TestTaskStatus:
    """Tests for task status and information retrieval"""

    def test_get_task_status(self, scheduler):
        """Test getting task status"""
        scheduler.add_cron_task('status_task', dummy_task, '0 * * * *')

        status = scheduler.get_task_status('status_task')
        assert status is not None
        assert status['task_name'] == 'status_task'
        assert status['task_type'] == 'cron'
        assert 'next_run' in status

    def test_get_task_status_nonexistent(self, scheduler):
        """Test getting status of non-existent task"""
        status = scheduler.get_task_status('nonexistent')
        assert status is None

    def test_get_all_tasks(self, scheduler):
        """Test getting all tasks"""
        scheduler.add_cron_task('task1', dummy_task, '0 * * * *')
        scheduler.add_interval_task('task2', dummy_task, 60)

        tasks = scheduler.get_all_tasks()
        assert len(tasks) == 2
        assert {t['task_name'] for t in tasks} == {'task1', 'task2'}

    def test_get_task_history(self, scheduler):
        """Test getting task execution history"""
        scheduler.add_interval_task('history_task', dummy_task, seconds=1)
        scheduler.start()

        time.sleep(3.5)

        history = scheduler.get_task_history('history_task', limit=5)
        assert len(history) >= 2
        assert all('started_at' in h for h in history)
        assert all('status' in h for h in history)


class TestPersistence:
    """Tests for task persistence across restarts"""

    def test_task_persists_across_restart(self, temp_db):
        """Test that tasks persist when scheduler restarts"""
        # Create first scheduler and add task
        scheduler1 = TaskScheduler(db_path=temp_db)
        scheduler1.add_cron_task('persistent', dummy_task, '0 * * * *')
        scheduler1.stop()

        # Create new scheduler with same database
        scheduler2 = TaskScheduler(db_path=temp_db)
        tasks = scheduler2.get_all_tasks()

        assert len(tasks) == 1
        assert tasks[0]['task_name'] == 'persistent'
        scheduler2.stop()


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
