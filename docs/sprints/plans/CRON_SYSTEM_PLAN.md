# Cron/Scheduled Tasks System Plan

## Overview
Implement a comprehensive scheduled tasks system for ChirpSyncer with APScheduler, maintenance tasks, dashboard UI, and email notifications.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Cron System Architecture                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │  APScheduler│───>│  Task Queue  │───>│ Executors  │ │
│  │   Core      │    │              │    │            │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│         │                   │                   │        │
│         v                   v                   v        │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Maintenance Tasks                     │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ • Session Cleanup    • Audit Log Archive        │   │
│  │ • Database Backup    • Inactive Creds Cleanup   │   │
│  │ • Stats Aggregation  • Error Log Cleanup        │   │
│  └─────────────────────────────────────────────────┘   │
│         │                                                │
│         v                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Dashboard UI                           │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ • View Scheduled Tasks  • Task History          │   │
│  │ • Manual Trigger        • Status Monitoring     │   │
│  │ • Configure Schedule    • Logs & Errors         │   │
│  └─────────────────────────────────────────────────┘   │
│         │                                                │
│         v                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Notification System                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ • Email Notifications   • Task Completion       │   │
│  │ • Error Alerts          • Weekly Reports        │   │
│  │ • SMTP Configuration    • Template System       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Component 1: Scheduler Core (TASK-001)

**File:** `app/task_scheduler.py`

### Features:
- APScheduler integration (BackgroundScheduler)
- Task registration and management
- Persistent job store (SQLite)
- Cron-style scheduling
- Interval-based scheduling
- One-time scheduled tasks

### Database Schema:
```sql
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT UNIQUE NOT NULL,
    task_type TEXT NOT NULL,  -- 'cron', 'interval', 'date'
    schedule TEXT NOT NULL,    -- cron expression or interval
    enabled INTEGER DEFAULT 1,
    last_run INTEGER,
    next_run INTEGER,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    status TEXT,  -- 'running', 'success', 'failed'
    output TEXT,
    error TEXT,
    duration_ms INTEGER
);
```

### Classes:
```python
class TaskScheduler:
    def __init__(self, db_path: str)
    def start()
    def stop()
    def add_cron_task(name: str, func: callable, cron_expr: str)
    def add_interval_task(name: str, func: callable, seconds: int)
    def add_date_task(name: str, func: callable, run_date: datetime)
    def remove_task(name: str)
    def pause_task(name: str)
    def resume_task(name: str)
    def trigger_task_now(name: str)
    def get_task_status(name: str) -> dict
    def get_all_tasks() -> List[dict]
    def get_task_history(name: str, limit: int) -> List[dict]
```

### Tests: `tests/test_task_scheduler.py` (minimum 15 tests)

---

## Component 2: Maintenance Tasks (TASK-002)

**File:** `app/maintenance_tasks.py`

### Features:
- Cleanup expired sessions (hourly)
- Archive old audit logs (daily)
- Database backup (daily)
- Cleanup inactive credentials (monthly)
- Aggregate statistics (daily)
- Cleanup old error logs (weekly)

### Task Functions:
```python
def cleanup_expired_sessions() -> dict:
    """Delete sessions older than expiration time"""

def archive_audit_logs(days_old: int = 90) -> dict:
    """Archive audit logs older than X days"""

def backup_database() -> dict:
    """Create database backup with timestamp"""

def cleanup_inactive_credentials(months: int = 6) -> dict:
    """Mark credentials inactive if not used in X months"""

def aggregate_daily_stats() -> dict:
    """Aggregate sync stats into daily summaries"""

def cleanup_error_logs(days_old: int = 30) -> dict:
    """Delete old error log entries"""
```

### Tests: `tests/test_maintenance_tasks.py` (minimum 12 tests)

---

## Component 3: Dashboard Tasks UI (TASK-003)

**File:** `app/dashboard.py` (extend existing)

### New Routes:
```python
@app.route('/tasks')
@require_auth
def tasks_list():
    """List all scheduled tasks with status"""

@app.route('/tasks/<task_name>')
@require_auth
def task_detail(task_name):
    """Task detail with execution history"""

@app.route('/tasks/<task_name>/trigger', methods=['POST'])
@require_admin
def task_trigger(task_name):
    """Manually trigger a task"""

@app.route('/tasks/<task_name>/toggle', methods=['POST'])
@require_admin
def task_toggle(task_name):
    """Enable/disable a task"""

@app.route('/tasks/<task_name>/configure', methods=['POST'])
@require_admin
def task_configure(task_name):
    """Update task schedule"""

@app.route('/api/tasks/status')
@require_auth
def api_tasks_status():
    """Get current status of all tasks (JSON)"""
```

### Templates:
- `templates/tasks_list.html` - List of scheduled tasks
- `templates/task_detail.html` - Task execution history and configuration

### Tests: `tests/test_dashboard_tasks.py` (minimum 10 tests)

---

## Component 4: Notification System (TASK-004)

**File:** `app/notification_service.py`

### Features:
- SMTP email notifications
- Task completion notifications
- Error alerts
- Weekly summary reports
- Email templates

### Configuration (.env):
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@chirpsyncer.local
SMTP_ENABLED=false

# Notification Settings
NOTIFY_ON_TASK_FAILURE=true
NOTIFY_ON_TASK_SUCCESS=false
NOTIFY_ADMINS_ONLY=true
```

### Classes:
```python
class NotificationService:
    def __init__(self, smtp_config: dict)
    def send_email(to: str, subject: str, body: str, html: bool = False)
    def notify_task_completion(task_name: str, result: dict, recipients: List[str])
    def notify_task_failure(task_name: str, error: str, recipients: List[str])
    def send_weekly_report(recipients: List[str])
    def test_connection() -> bool
```

### Email Templates:
- `templates/email/task_completion.html`
- `templates/email/task_failure.html`
- `templates/email/weekly_report.html`

### Tests: `tests/test_notification_service.py` (minimum 8 tests)

---

## Default Task Schedule

```python
DEFAULT_TASKS = [
    {
        'name': 'cleanup_sessions',
        'function': cleanup_expired_sessions,
        'schedule': '0 * * * *',  # Every hour
        'enabled': True
    },
    {
        'name': 'backup_database',
        'function': backup_database,
        'schedule': '0 3 * * *',  # Daily at 3 AM
        'enabled': True
    },
    {
        'name': 'archive_audit_logs',
        'function': archive_audit_logs,
        'schedule': '0 2 * * *',  # Daily at 2 AM
        'enabled': True
    },
    {
        'name': 'aggregate_daily_stats',
        'function': aggregate_daily_stats,
        'schedule': '0 1 * * *',  # Daily at 1 AM
        'enabled': True
    },
    {
        'name': 'cleanup_error_logs',
        'function': cleanup_error_logs,
        'schedule': '0 4 * * 0',  # Weekly on Sunday at 4 AM
        'enabled': True
    },
    {
        'name': 'cleanup_inactive_credentials',
        'function': cleanup_inactive_credentials,
        'schedule': '0 5 1 * *',  # Monthly on 1st at 5 AM
        'enabled': True
    }
]
```

---

## Dependencies

```txt
# requirements.txt additions
APScheduler==3.10.4      # Task scheduling
```

---

## Integration with main.py

```python
# In main.py
from app.task_scheduler import TaskScheduler, setup_default_tasks

def main():
    # ... existing init code ...

    # Initialize task scheduler
    if MULTI_USER_ENABLED:
        scheduler = TaskScheduler(DB_PATH)
        setup_default_tasks(scheduler)
        scheduler.start()
        print("Task scheduler started")

    # ... rest of main loop ...
```

---

## Success Metrics

- **Tests:** Minimum 45 tests (15+12+10+8) with 90%+ pass rate
- **Coverage:** >85% on new code
- **Performance:** Tasks complete in <10 seconds
- **Reliability:** 99%+ task execution success rate

---

## Implementation Order (Parallel with 4 Agents)

**Agent 1:** TASK-001 - Scheduler Core (TDD)
**Agent 2:** TASK-002 - Maintenance Tasks (TDD)
**Agent 3:** TASK-003 - Dashboard UI (TDD)
**Agent 4:** TASK-004 - Notification System (TDD)

All agents work in parallel, then integrate.

---

## Cron Expression Reference

```
┌─────── minute (0 - 59)
│ ┌────── hour (0 - 23)
│ │ ┌───── day of month (1 - 31)
│ │ │ ┌───── month (1 - 12)
│ │ │ │ ┌──── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *

Examples:
0 * * * *     = Every hour
0 3 * * *     = Daily at 3 AM
0 4 * * 0     = Weekly on Sunday at 4 AM
0 5 1 * *     = Monthly on 1st at 5 AM
*/15 * * * *  = Every 15 minutes
```

---

**Total Estimated Implementation Time:** 4-6 hours (parallelized)
**Total New LOC:** ~2,500 lines
**Total Tests:** 45+ tests
