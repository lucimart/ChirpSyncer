"""
Tests for Dashboard Tasks UI Routes (Sprint 6 - TASK-003)

Tests task management routes with authentication and authorization.
Minimum 10 tests covering:
- /tasks route (auth required)
- /tasks/<name> detail view
- Task trigger (admin only)
- Task toggle (admin only)
- Task configure (admin only)
- API endpoint for task status
- Access control (regular user vs admin)
"""
import pytest
import json
import os
from unittest.mock import Mock, patch


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database"""
    return str(tmp_path / 'test_dashboard.db')


@pytest.fixture
def master_key():
    """Create test master key for encryption"""
    return os.urandom(32)


@pytest.fixture
def mock_scheduler():
    """Mock TaskScheduler for testing"""
    scheduler = Mock()

    # Mock get_all_tasks
    scheduler.get_all_tasks.return_value = [
        {
            'task_name': 'cleanup_sessions',
            'task_type': 'cron',
            'schedule': '0 * * * *',
            'enabled': True,
            'last_run': 1704000000,
            'next_run': 1704003600,
            'run_count': 100,
            'success_count': 98,
            'failure_count': 2
        },
        {
            'task_name': 'backup_database',
            'task_type': 'cron',
            'schedule': '0 3 * * *',
            'enabled': True,
            'last_run': 1703980800,
            'next_run': 1704067200,
            'run_count': 30,
            'success_count': 30,
            'failure_count': 0
        }
    ]

    # Mock get_task_status
    scheduler.get_task_status.return_value = {
        'task_name': 'cleanup_sessions',
        'task_type': 'cron',
        'schedule': '0 * * * *',
        'enabled': True,
        'last_run': 1704000000,
        'next_run': 1704003600,
        'run_count': 100,
        'success_count': 98,
        'failure_count': 2
    }

    # Mock get_task_history
    scheduler.get_task_history.return_value = [
        {
            'id': 1,
            'task_name': 'cleanup_sessions',
            'started_at': 1704000000,
            'completed_at': 1704000005,
            'status': 'success',
            'output': 'Cleaned 5 sessions',
            'error': None,
            'duration_ms': 5000
        },
        {
            'id': 2,
            'task_name': 'cleanup_sessions',
            'started_at': 1703996400,
            'completed_at': 1703996408,
            'status': 'failed',
            'output': None,
            'error': 'Database locked',
            'duration_ms': 8000
        }
    ]

    # Mock other methods
    scheduler.trigger_task_now.return_value = True
    scheduler.pause_task.return_value = True
    scheduler.resume_task.return_value = True

    return scheduler


@pytest.fixture
def test_app(db_path, master_key, mock_scheduler):
    """Create test Flask app with dashboard routes"""
    # First, create the app without scheduler
    from app.web.dashboard import create_app
    app = create_app(db_path=db_path, master_key=master_key)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing

    # Inject mock scheduler
    app.config['TASK_SCHEDULER'] = mock_scheduler

    return app


@pytest.fixture
def client(test_app):
    """Create test client"""
    return test_app.test_client()


@pytest.fixture
def user_manager(db_path):
    """Create UserManager with test database"""
    from app.auth.user_manager import UserManager
    um = UserManager(db_path)
    um.init_db()
    return um


@pytest.fixture
def regular_user(user_manager):
    """Create regular test user"""
    user_id = user_manager.create_user('testuser', 'test@example.com', 'Test123!@#', is_admin=False)
    return user_manager.get_user_by_id(user_id)


@pytest.fixture
def admin_user(user_manager):
    """Create admin test user"""
    user_id = user_manager.create_user('admin', 'admin@example.com', 'Admin123!@#', is_admin=True)
    return user_manager.get_user_by_id(user_id)


def login_as_user(client, username, password):
    """Helper to login as a user"""
    return client.post('/login', data={
        'username': username,
        'password': password
    }, follow_redirects=False)


# ============================================================================
# TEST 1: GET /tasks - Requires authentication
# ============================================================================
def test_tasks_list_requires_auth(client):
    """Test GET /tasks redirects to login if not authenticated"""
    response = client.get('/tasks')
    assert response.status_code == 302  # Redirect
    assert '/login' in response.location


# ============================================================================
# TEST 2: GET /tasks - Returns tasks list for authenticated user
# ============================================================================
def test_tasks_list_authenticated(client, regular_user):
    """Test GET /tasks displays tasks list for authenticated user"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.get('/tasks')
    assert response.status_code == 200
    assert b'cleanup_sessions' in response.data
    assert b'backup_database' in response.data


# ============================================================================
# TEST 3: GET /tasks/<task_name> - Detail view requires auth
# ============================================================================
def test_task_detail_requires_auth(client):
    """Test GET /tasks/<task_name> redirects to login if not authenticated"""
    response = client.get('/tasks/cleanup_sessions')
    assert response.status_code == 302  # Redirect
    assert '/login' in response.location


# ============================================================================
# TEST 4: GET /tasks/<task_name> - Returns task detail for authenticated user
# ============================================================================
def test_task_detail_authenticated(client, regular_user, mock_scheduler):
    """Test GET /tasks/<task_name> displays task detail for authenticated user"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.get('/tasks/cleanup_sessions')
    assert response.status_code == 200
    assert b'cleanup_sessions' in response.data
    # Check that history is displayed
    assert b'Cleaned 5 sessions' in response.data or b'success' in response.data


# ============================================================================
# TEST 5: GET /tasks/<task_name> - Returns 404 for non-existent task
# ============================================================================
def test_task_detail_not_found(client, regular_user, mock_scheduler):
    """Test GET /tasks/<task_name> returns 404 for non-existent task"""
    login_as_user(client, 'testuser', 'Test123!@#')

    # Mock get_task_status to return None
    mock_scheduler.get_task_status.return_value = None

    response = client.get('/tasks/nonexistent_task')
    assert response.status_code == 404


# ============================================================================
# TEST 6: POST /tasks/<task_name>/trigger - Requires admin
# ============================================================================
def test_task_trigger_requires_admin(client, regular_user):
    """Test POST /tasks/<task_name>/trigger requires admin privileges"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.post('/tasks/cleanup_sessions/trigger')
    assert response.status_code == 403  # Forbidden


# ============================================================================
# TEST 7: POST /tasks/<task_name>/trigger - Admin can trigger task
# ============================================================================
def test_task_trigger_admin_success(client, admin_user, mock_scheduler):
    """Test POST /tasks/<task_name>/trigger allows admin to manually trigger task"""
    login_as_user(client, 'admin', 'Admin123!@#')

    response = client.post('/tasks/cleanup_sessions/trigger', follow_redirects=False)
    assert response.status_code in [200, 302]  # Success or redirect

    # Verify trigger_task_now was called
    mock_scheduler.trigger_task_now.assert_called_once_with('cleanup_sessions')


# ============================================================================
# TEST 8: POST /tasks/<task_name>/toggle - Requires admin
# ============================================================================
def test_task_toggle_requires_admin(client, regular_user):
    """Test POST /tasks/<task_name>/toggle requires admin privileges"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 403  # Forbidden


# ============================================================================
# TEST 9: POST /tasks/<task_name>/toggle - Admin can enable/disable task
# ============================================================================
def test_task_toggle_admin_success(client, admin_user, mock_scheduler):
    """Test POST /tasks/<task_name>/toggle allows admin to enable/disable task"""
    login_as_user(client, 'admin', 'Admin123!@#')

    # Test disabling (pausing) a task
    mock_scheduler.get_task_status.return_value = {'enabled': True}
    response = client.post('/tasks/cleanup_sessions/toggle', follow_redirects=False)
    assert response.status_code in [200, 302]  # Success or redirect

    # Verify pause_task was called
    mock_scheduler.pause_task.assert_called_once_with('cleanup_sessions')


# ============================================================================
# TEST 10: POST /tasks/<task_name>/configure - Requires admin
# ============================================================================
def test_task_configure_requires_admin(client, regular_user):
    """Test POST /tasks/<task_name>/configure requires admin privileges"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.post('/tasks/cleanup_sessions/configure', data={
        'schedule': '0 */2 * * *'
    })
    assert response.status_code == 403  # Forbidden


# ============================================================================
# TEST 11: POST /tasks/<task_name>/configure - Admin can update schedule
# ============================================================================
def test_task_configure_admin_success(client, admin_user, mock_scheduler):
    """Test POST /tasks/<task_name>/configure allows admin to update schedule"""
    login_as_user(client, 'admin', 'Admin123!@#')

    response = client.post('/tasks/cleanup_sessions/configure',
                          data={'schedule': '0 */2 * * *'},
                          follow_redirects=False)
    assert response.status_code in [200, 302]  # Success or redirect


# ============================================================================
# TEST 12: GET /api/tasks/status - Requires authentication
# ============================================================================
def test_api_tasks_status_requires_auth(client):
    """Test GET /api/tasks/status requires authentication"""
    response = client.get('/api/tasks/status')
    assert response.status_code == 302  # Redirect
    assert '/login' in response.location


# ============================================================================
# TEST 13: GET /api/tasks/status - Returns JSON for authenticated user
# ============================================================================
def test_api_tasks_status_authenticated(client, regular_user, mock_scheduler):
    """Test GET /api/tasks/status returns JSON with task statuses"""
    login_as_user(client, 'testuser', 'Test123!@#')

    response = client.get('/api/tasks/status')
    assert response.status_code == 200
    assert response.content_type == 'application/json'

    data = json.loads(response.data)
    assert 'tasks' in data
    assert len(data['tasks']) == 2
    assert data['tasks'][0]['task_name'] == 'cleanup_sessions'


# ============================================================================
# TEST 14: POST /tasks/<task_name>/trigger - Handles scheduler errors
# ============================================================================
def test_task_trigger_scheduler_error(client, admin_user, mock_scheduler):
    """Test POST /tasks/<task_name>/trigger handles scheduler errors gracefully"""
    login_as_user(client, 'admin', 'Admin123!@#')

    # Make trigger_task_now raise an exception
    mock_scheduler.trigger_task_now.side_effect = Exception("Scheduler error")

    response = client.post('/tasks/cleanup_sessions/trigger', follow_redirects=True)
    # Should handle error gracefully, not crash
    assert response.status_code == 200
    assert b'error' in response.data.lower() or b'failed' in response.data.lower()


# ============================================================================
# TEST 15: Task list shows correct status indicators
# ============================================================================
def test_tasks_list_shows_status_indicators(client, admin_user, mock_scheduler):
    """Test that tasks list shows proper status indicators and stats"""
    login_as_user(client, 'admin', 'Admin123!@#')

    response = client.get('/tasks')
    assert response.status_code == 200

    # Check for status-related content
    data = response.data
    assert b'cleanup_sessions' in data
    assert b'backup_database' in data
    # Should show run counts or success rates
    assert b'100' in data or b'98' in data or b'success' in data.lower()
