"""
TaskScheduler - APScheduler-based Task Scheduling (TASK-001)

Provides cron-style and interval-based task scheduling with persistence,
execution tracking, and management capabilities.
"""
import sqlite3
import time
import traceback
from datetime import datetime
from typing import Optional, List, Dict, Callable
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger


class TaskScheduler:
    """
    Task Scheduler with APScheduler backend and SQLite persistence.

    Supports cron expressions, interval scheduling, and one-time date tasks.
    Tracks all executions with success/failure status and timing.
    """

    def __init__(self, db_path: str = 'chirpsyncer.db'):
        """
        Initialize TaskScheduler.

        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.scheduler = BackgroundScheduler()
        self._task_funcs = {}  # Store task functions by name
        self.init_db()

    def init_db(self):
        """Initialize database tables for task scheduling"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create scheduled_tasks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_name TEXT UNIQUE NOT NULL,
                task_type TEXT NOT NULL,
                schedule TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                last_run INTEGER,
                next_run INTEGER,
                run_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        ''')

        # Create task_executions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_name TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                completed_at INTEGER,
                status TEXT,
                output TEXT,
                error TEXT,
                duration_ms INTEGER
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_task_executions_name ON task_executions(task_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_task_executions_started ON task_executions(started_at)')

        conn.commit()
        conn.close()

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()

    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def is_running(self) -> bool:
        """Check if scheduler is running"""
        return self.scheduler.running

    def add_cron_task(self, name: str, func: Callable, cron_expr: str) -> bool:
        """
        Add a cron-style scheduled task.

        Args:
            name: Unique task name
            func: Callable to execute
            cron_expr: Cron expression (e.g., "0 * * * *")

        Returns:
            True if added successfully, False otherwise
        """
        try:
            # Check if task already exists
            if self._task_exists(name):
                return False

            # Parse cron expression (format: minute hour day month day_of_week)
            parts = cron_expr.split()
            if len(parts) != 5:
                return False

            # Create cron trigger
            trigger = CronTrigger(
                minute=parts[0],
                hour=parts[1],
                day=parts[2],
                month=parts[3],
                day_of_week=parts[4]
            )

            # Add job to scheduler
            wrapped_func = self._wrap_task(name, func)
            self.scheduler.add_job(
                wrapped_func,
                trigger=trigger,
                id=name,
                name=name,
                replace_existing=True
            )

            # Store task in database
            self._save_task(name, 'cron', cron_expr)
            self._task_funcs[name] = func

            return True

        except Exception as e:
            print(f"Failed to add cron task {name}: {e}")
            return False

    def add_interval_task(self, name: str, func: Callable, seconds: int) -> bool:
        """
        Add an interval-based task.

        Args:
            name: Unique task name
            func: Callable to execute
            seconds: Interval in seconds

        Returns:
            True if added successfully, False otherwise
        """
        try:
            if seconds <= 0:
                return False

            if self._task_exists(name):
                return False

            # Create interval trigger
            trigger = IntervalTrigger(seconds=seconds)

            # Add job to scheduler
            wrapped_func = self._wrap_task(name, func)
            self.scheduler.add_job(
                wrapped_func,
                trigger=trigger,
                id=name,
                name=name,
                replace_existing=True
            )

            # Store task in database
            self._save_task(name, 'interval', f'{seconds} seconds')
            self._task_funcs[name] = func

            return True

        except Exception as e:
            print(f"Failed to add interval task {name}: {e}")
            return False

    def add_date_task(self, name: str, func: Callable, run_date: datetime) -> bool:
        """
        Add a one-time date task.

        Args:
            name: Unique task name
            func: Callable to execute
            run_date: When to run the task

        Returns:
            True if added successfully, False otherwise
        """
        try:
            # Check if date is in the future
            if run_date < datetime.now():
                return False

            if self._task_exists(name):
                return False

            # Create date trigger
            trigger = DateTrigger(run_date=run_date)

            # Add job to scheduler
            wrapped_func = self._wrap_task(name, func)
            self.scheduler.add_job(
                wrapped_func,
                trigger=trigger,
                id=name,
                name=name,
                replace_existing=True
            )

            # Store task in database
            self._save_task(name, 'date', run_date.isoformat())
            self._task_funcs[name] = func

            return True

        except Exception as e:
            print(f"Failed to add date task {name}: {e}")
            return False

    def remove_task(self, name: str) -> bool:
        """
        Remove a task.

        Args:
            name: Task name

        Returns:
            True if removed, False otherwise
        """
        try:
            # Remove from scheduler
            self.scheduler.remove_job(name)

            # Remove from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM scheduled_tasks WHERE task_name = ?', (name,))
            affected = cursor.rowcount
            conn.commit()
            conn.close()

            # Remove from task functions
            if name in self._task_funcs:
                del self._task_funcs[name]

            return affected > 0

        except Exception as e:
            print(f"Failed to remove task {name}: {e}")
            return False

    def pause_task(self, name: str) -> bool:
        """
        Pause a task (disable it).

        Args:
            name: Task name

        Returns:
            True if paused, False otherwise
        """
        try:
            # Pause job in scheduler
            self.scheduler.pause_job(name)

            # Update database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE scheduled_tasks SET enabled = 0, updated_at = ? WHERE task_name = ?',
                (int(time.time()), name)
            )
            affected = cursor.rowcount
            conn.commit()
            conn.close()

            return affected > 0

        except Exception as e:
            print(f"Failed to pause task {name}: {e}")
            return False

    def resume_task(self, name: str) -> bool:
        """
        Resume a paused task.

        Args:
            name: Task name

        Returns:
            True if resumed, False otherwise
        """
        try:
            # Resume job in scheduler
            self.scheduler.resume_job(name)

            # Update database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE scheduled_tasks SET enabled = 1, updated_at = ? WHERE task_name = ?',
                (int(time.time()), name)
            )
            affected = cursor.rowcount
            conn.commit()
            conn.close()

            return affected > 0

        except Exception as e:
            print(f"Failed to resume task {name}: {e}")
            return False

    def trigger_task_now(self, name: str) -> bool:
        """
        Manually trigger a task to run now.

        Args:
            name: Task name

        Returns:
            True if triggered, False otherwise
        """
        try:
            # Get the task function
            if name not in self._task_funcs:
                return False

            # Execute task in background
            func = self._task_funcs[name]
            wrapped_func = self._wrap_task(name, func)

            # Run in separate thread
            import threading
            thread = threading.Thread(target=wrapped_func)
            thread.start()

            return True

        except Exception as e:
            print(f"Failed to trigger task {name}: {e}")
            return False

    def get_task_status(self, name: str) -> Optional[Dict]:
        """
        Get status of a task.

        Args:
            name: Task name

        Returns:
            Task status dict or None if not found
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM scheduled_tasks WHERE task_name = ?', (name,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        status = dict(row)

        # Get next run time from scheduler
        try:
            job = self.scheduler.get_job(name)
            if job and job.next_run_time:
                status['next_run'] = int(job.next_run_time.timestamp())
        except Exception:
            # Catch all exceptions from scheduler (JobLookupError, etc.)
            status['next_run'] = None

        conn.close()
        return status

    def get_all_tasks(self) -> List[Dict]:
        """
        Get all tasks.

        Returns:
            List of task dicts
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM scheduled_tasks ORDER BY task_name')
        rows = cursor.fetchall()

        tasks = [dict(row) for row in rows]

        # Add next run times
        for task in tasks:
            try:
                job = self.scheduler.get_job(task['task_name'])
                if job and job.next_run_time:
                    task['next_run'] = int(job.next_run_time.timestamp())
            except Exception:
                # Catch all exceptions from scheduler (JobLookupError, etc.)
                task['next_run'] = None

        conn.close()
        return tasks

    def get_task_history(self, name: str, limit: int = 50) -> List[Dict]:
        """
        Get execution history for a task.

        Args:
            name: Task name
            limit: Maximum number of executions to return

        Returns:
            List of execution dicts
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM task_executions
            WHERE task_name = ?
            ORDER BY started_at DESC
            LIMIT ?
        ''', (name, limit))

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    def _task_exists(self, name: str) -> bool:
        """Check if task already exists in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT 1 FROM scheduled_tasks WHERE task_name = ?', (name,))
        exists = cursor.fetchone() is not None
        conn.close()
        return exists

    def _save_task(self, name: str, task_type: str, schedule: str):
        """Save task to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        now = int(time.time())
        cursor.execute('''
            INSERT INTO scheduled_tasks (task_name, task_type, schedule, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, task_type, schedule, now, now))

        conn.commit()
        conn.close()

    def _wrap_task(self, name: str, func: Callable) -> Callable:
        """Wrap task function to track execution"""
        def wrapped():
            started_at = int(time.time())
            start_ms = time.time()
            output = None
            error = None
            status = 'running'

            try:
                # Execute task
                result = func()
                output = str(result) if result else None
                status = 'success'

                # Update success count
                self._update_task_stats(name, success=True)

            except Exception as e:
                error = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
                status = 'failed'

                # Update failure count
                self._update_task_stats(name, success=False)

            finally:
                # Record execution
                completed_at = int(time.time())
                duration_ms = int((time.time() - start_ms) * 1000)

                self._record_execution(name, started_at, completed_at, status, output, error, duration_ms)

        return wrapped

    def _update_task_stats(self, name: str, success: bool):
        """Update task run counts"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if success:
            cursor.execute('''
                UPDATE scheduled_tasks
                SET run_count = run_count + 1,
                    success_count = success_count + 1,
                    last_run = ?,
                    updated_at = ?
                WHERE task_name = ?
            ''', (int(time.time()), int(time.time()), name))
        else:
            cursor.execute('''
                UPDATE scheduled_tasks
                SET run_count = run_count + 1,
                    failure_count = failure_count + 1,
                    last_run = ?,
                    updated_at = ?
                WHERE task_name = ?
            ''', (int(time.time()), int(time.time()), name))

        conn.commit()
        conn.close()

    def _record_execution(self, name: str, started_at: int, completed_at: int,
                         status: str, output: str, error: str, duration_ms: int):
        """Record task execution to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO task_executions (task_name, started_at, completed_at, status, output, error, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, started_at, completed_at, status, output, error, duration_ms))

        conn.commit()
        conn.close()
