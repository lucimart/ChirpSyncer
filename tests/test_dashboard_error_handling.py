"""
Tests for Dashboard Error Handling Routes (Sprint 6 - DASH-002)

Comprehensive error path testing covering:
- Database initialization errors
- Invalid form data
- Database operation failures
- Unauthorized access attempts
- Missing parameters
- Exception handling in API endpoints

Increases coverage from 83.42% to 95%+ by testing error paths.
"""
import pytest
import json
import os
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from app.auth.user_manager import UserManager
from app.auth.credential_manager import CredentialManager


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database"""
    return str(tmp_path / 'test_dashboard_error.db')


@pytest.fixture
def master_key():
    """Create test master key for encryption"""
    return os.urandom(32)


@pytest.fixture
def user_manager(db_path):
    """Create UserManager with test database"""
    um = UserManager(db_path)
    um.init_db()
    return um


@pytest.fixture
def credential_manager(db_path, master_key):
    """Create CredentialManager with test database"""
    cm = CredentialManager(master_key, db_path)
    cm.init_db()
    return cm


@pytest.fixture
def test_app(db_path, master_key):
    """Create test Flask app with dashboard routes"""
    from app.web.dashboard import create_app
    app = create_app(db_path=db_path, master_key=master_key)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    return app


@pytest.fixture
def client(test_app):
    """Create test client"""
    return test_app.test_client()


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


# ============================================================================
# DATABASE INITIALIZATION TESTS (Lines 47-51)
# ============================================================================

def test_create_app_with_master_key_from_env(db_path):
    """Test create_app with MASTER_KEY from environment variable"""
    master_key_hex = os.urandom(32).hex()
    with patch.dict(os.environ, {'MASTER_KEY': master_key_hex}):
        from app.web.dashboard import create_app
        app = create_app(db_path=db_path)
        assert app.config['MASTER_KEY'] is not None
        assert len(app.config['MASTER_KEY']) == 32


def test_create_app_without_master_key_env(db_path):
    """Test create_app generates master_key when no env var"""
    with patch.dict(os.environ, {}, clear=False):
        # Remove MASTER_KEY if it exists
        os.environ.pop('MASTER_KEY', None)
        from app.web.dashboard import create_app
        app = create_app(db_path=db_path)
        assert app.config['MASTER_KEY'] is not None
        assert len(app.config['MASTER_KEY']) == 32


def test_create_app_with_explicit_master_key(db_path):
    """Test create_app respects explicit master_key parameter"""
    explicit_key = os.urandom(32)
    from app.web.dashboard import create_app
    app = create_app(db_path=db_path, master_key=explicit_key)
    assert app.config['MASTER_KEY'] == explicit_key


# ============================================================================
# AUTHENTICATION ROUTE ERROR TESTS
# ============================================================================

def test_login_post_missing_username(client):
    """Test POST /login with missing username"""
    response = client.post('/login', data={
        'password': 'Test123!@#'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'required' in response.data.lower()


def test_login_post_missing_password(client, regular_user):
    """Test POST /login with missing password"""
    response = client.post('/login', data={
        'username': 'testuser'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'required' in response.data.lower()


def test_register_post_missing_email(client):
    """Test POST /register with missing email"""
    response = client.post('/register', data={
        'username': 'newuser',
        'password': 'NewPass123!@#',
        'confirm_password': 'NewPass123!@#'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'required' in response.data.lower()


def test_register_post_password_mismatch(client):
    """Test POST /register with mismatched passwords"""
    response = client.post('/register', data={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'NewPass123!@#',
        'confirm_password': 'Different123!@#'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'do not match' in response.data.lower() or b'mismatch' in response.data.lower()


def test_register_post_weak_password(client):
    """Test POST /register with weak password"""
    response = client.post('/register', data={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'weak',  # Too weak
        'confirm_password': 'weak'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'security' in response.data.lower() or b'requirement' in response.data.lower()


def test_register_post_duplicate_user(client, regular_user):
    """Test POST /register with duplicate username"""
    response = client.post('/register', data={
        'username': 'testuser',  # Already exists
        'email': 'another@example.com',
        'password': 'NewPass123!@#',
        'confirm_password': 'NewPass123!@#'
    }, follow_redirects=True)
    assert response.status_code == 200
    # Should show error about user already existing
    assert b'already exists' in response.data.lower() or b'error' in response.data.lower()


# ============================================================================
# USER MANAGEMENT ERROR TESTS
# ============================================================================

def test_user_edit_invalid_password(client, regular_user):
    """Test user edit with invalid password format (Line 208-211)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/users/{regular_user.id}/edit', data={
        'password': 'weak'  # Too weak
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'security' in response.data.lower() or b'requirement' in response.data.lower()


def test_user_edit_failed_update(client, regular_user, user_manager):
    """Test user edit when database update fails (Line 223)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(UserManager, 'update_user', return_value=False):
        response = client.post(f'/users/{regular_user.id}/edit', data={
            'email': 'newemail@example.com'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


def test_user_delete_self(client, admin_user, regular_user):
    """Test admin cannot delete their own account"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id
        sess['is_admin'] = True

    response = client.post(f'/users/{admin_user.id}/delete', follow_redirects=True)
    assert response.status_code == 200
    assert b'cannot delete' in response.data.lower() or b'own account' in response.data.lower()


def test_user_delete_failed(client, admin_user, regular_user):
    """Test user delete when database delete fails (Line 241)"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    with patch.object(UserManager, 'delete_user', return_value=False):
        response = client.post(f'/users/{regular_user.id}/delete', follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


def test_user_detail_not_found(client, admin_user):
    """Test user detail page returns 404 for non-existent user"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id
        sess['is_admin'] = True

    response = client.get('/users/9999')
    assert response.status_code == 404


# ============================================================================
# CREDENTIAL MANAGEMENT ERROR TESTS
# ============================================================================

def test_credentials_add_get_returns_form(client, regular_user):
    """Test GET /credentials/add returns form (Line 266)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/credentials/add')
    assert response.status_code == 200
    assert b'form' in response.data.lower() or b'add' in response.data.lower()


def test_credentials_add_exception_handling(client, regular_user):
    """Test POST /credentials/add handles exceptions"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'save_credentials',
                     side_effect=Exception("DB error")):
        response = client.post('/credentials/add', data={
            'platform': 'twitter',
            'credential_type': 'api',
            'api_key': 'key',
            'api_secret': 'secret',
            'access_token': 'token',
            'access_secret': 'token_secret'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


def test_credentials_edit_get_not_found(client, regular_user, credential_manager):
    """Test GET /credentials/<id>/edit returns 404 for non-existent credential"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/credentials/9999/edit')
    assert response.status_code == 404


def test_credentials_edit_get_decryption_error(client, regular_user, credential_manager):
    """Test GET /credentials/<id>/edit handles decryption error (Lines 322-325)"""
    # Create a credential first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'scraping',
        {'username': 'user', 'password': 'pass'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'get_credentials', return_value=None):
        response = client.get(f'/credentials/{cred_id}/edit')
        assert response.status_code == 200


def test_credentials_edit_post_bluesky_platform(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/edit with bluesky platform (Lines 351-352)"""
    # Create bluesky credential first
    credential_manager.save_credentials(
        regular_user.id, 'bluesky', 'api',
        {'username': 'user.bsky.social', 'password': 'apppass'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/credentials/{cred_id}/edit', data={
        'username': 'newuser.bsky.social',
        'password': 'newpass'
    }, follow_redirects=True)

    assert response.status_code == 200


def test_credentials_edit_post_failed_update(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/edit when update fails (Line 360)"""
    # Create a credential first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'api',
        {'api_key': 'key', 'api_secret': 'secret'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'update_credentials', return_value=False):
        response = client.post(f'/credentials/{cred_id}/edit', data={
            'api_key': 'newkey',
            'api_secret': 'newsecret',
            'access_token': 'token',
            'access_secret': 'tokensecret'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


def test_credentials_delete_not_found(client, regular_user):
    """Test POST /credentials/<id>/delete returns 404 for non-existent credential (Line 375)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/9999/delete')
    assert response.status_code == 404


def test_credentials_delete_failed(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/delete when delete fails (Line 380)"""
    # Create a credential first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'scraping',
        {'username': 'user', 'password': 'pass'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'delete_credentials', return_value=False):
        response = client.post(f'/credentials/{cred_id}/delete', follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


def test_credentials_test_not_found(client, regular_user):
    """Test POST /credentials/<id>/test returns 404 for non-existent credential (Line 395)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/9999/test')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['success'] is False


def test_credentials_test_failed_load(client, regular_user, credential_manager):
    """Test POST /credentials/<id>/test when credentials can't be loaded (Line 412)"""
    # Create a credential first
    credential_manager.save_credentials(
        regular_user.id, 'bluesky', 'api',
        {'username': 'user.bsky.social', 'password': 'pass'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'get_credentials', return_value=None):
        response = client.post(f'/credentials/{cred_id}/test')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is False


def test_credentials_share_invalid_user_ids(client, regular_user, credential_manager):
    """Test POST /credentials/share with invalid user ID format (Lines 427-429)"""
    # Create credentials first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'api',
        {'api_key': 'key', 'api_secret': 'secret'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/share', data={
        'credential_id': cred_id,
        'user_ids': 'invalid,not,numbers'  # Invalid user IDs
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'invalid' in response.data.lower() or b'error' in response.data.lower()


def test_credentials_share_not_found(client, regular_user):
    """Test POST /credentials/share with non-existent credential (Lines 438-439)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/share', data={
        'credential_id': '9999',
        'user_ids': '1,2,3'
    }, follow_redirects=True)

    assert response.status_code == 200
    assert b'not found' in response.data.lower()


def test_credentials_share_failed(client, regular_user, credential_manager):
    """Test POST /credentials/share when share operation fails (Line 446)"""
    # Create credentials first
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'api',
        {'api_key': 'key', 'api_secret': 'secret'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch.object(CredentialManager, 'share_credentials', return_value=False):
        response = client.post('/credentials/share', data={
            'credential_id': cred_id,
            'user_ids': '999'
        }, follow_redirects=True)

        assert response.status_code == 200
        assert b'failed' in response.data.lower()


# ============================================================================
# TASK MANAGEMENT ERROR TESTS
# ============================================================================

@pytest.fixture
def mock_scheduler():
    """Mock TaskScheduler for testing"""
    scheduler = Mock()
    scheduler.get_all_tasks.return_value = []
    scheduler.get_task_status.return_value = None
    return scheduler


@pytest.fixture
def test_app_with_scheduler(db_path, master_key, mock_scheduler):
    """Create test Flask app with mock scheduler"""
    from app.web.dashboard import create_app
    app = create_app(db_path=db_path, master_key=master_key)
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['TASK_SCHEDULER'] = mock_scheduler
    return app


@pytest.fixture
def client_with_scheduler(test_app_with_scheduler):
    """Create test client with scheduler"""
    return test_app_with_scheduler.test_client()


def test_tasks_list_no_scheduler(client, regular_user):
    """Test /tasks when scheduler is not available (Lines 468-469)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/tasks')
    assert response.status_code == 200
    # Should show empty tasks list with error message
    assert b'not available' in response.data.lower() or b'error' in response.data.lower()


def test_tasks_list_scheduler_error(client_with_scheduler, regular_user, mock_scheduler):
    """Test /tasks when scheduler throws exception (Lines 480-482)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    mock_scheduler.get_all_tasks.side_effect = Exception("Scheduler error")

    response = client_with_scheduler.get('/tasks')
    assert response.status_code == 200
    assert b'error' in response.data.lower()


def test_task_detail_no_scheduler(client, regular_user):
    """Test /tasks/<name> when scheduler is not available (Line 494)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/tasks/some_task')
    assert response.status_code == 404


def test_task_detail_scheduler_error(client_with_scheduler, regular_user, mock_scheduler):
    """Test /tasks/<name> when scheduler throws exception"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    # First call to get_task_status fails
    mock_scheduler.get_task_status.side_effect = Exception("Scheduler error")

    response = client_with_scheduler.get('/tasks/some_task')
    assert response.status_code == 404


def test_task_trigger_no_scheduler(client_with_scheduler, admin_user):
    """Test /tasks/<name>/trigger when scheduler not available (Line 519-520)"""
    # Create a client without scheduler
    from app.web.dashboard import create_app
    app = create_app(db_path=client_with_scheduler.application.config['DB_PATH'])
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    client_no_scheduler = app.test_client()

    with client_no_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client_no_scheduler.post('/tasks/some_task/trigger', follow_redirects=True)
    assert response.status_code == 200
    assert b'not available' in response.data.lower()



def test_task_toggle_no_scheduler(client_with_scheduler, admin_user):
    """Test /tasks/<name>/toggle when scheduler not available (Line 540)"""
    from app.web.dashboard import create_app
    app = create_app(db_path=client_with_scheduler.application.config['DB_PATH'])
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    client_no_scheduler = app.test_client()

    with client_no_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client_no_scheduler.post('/tasks/some_task/toggle')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['success'] is False


def test_task_toggle_not_found(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle when task not found (Line 545)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.return_value = None

    response = client_with_scheduler.post('/tasks/nonexistent/toggle')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['success'] is False


def test_task_toggle_pause_success(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle successfully pauses enabled task (Line 552-553)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.return_value = {'enabled': True}
    mock_scheduler.pause_task.return_value = True

    response = client_with_scheduler.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['action'] == 'paused'


def test_task_toggle_pause_failed(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle when pause fails (Line 558)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.return_value = {'enabled': True}
    mock_scheduler.pause_task.return_value = False

    response = client_with_scheduler.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['success'] is False


def test_task_toggle_exception(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle exception handling (Line 560)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.side_effect = Exception("Error toggling")

    response = client_with_scheduler.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['success'] is False


def test_task_configure_no_scheduler(client_with_scheduler, admin_user):
    """Test /tasks/<name>/configure when scheduler not available (Line 569-570)"""
    from app.web.dashboard import create_app
    app = create_app(db_path=client_with_scheduler.application.config['DB_PATH'])
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    client_no_scheduler = app.test_client()

    with client_no_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client_no_scheduler.post('/tasks/cleanup_sessions/configure', data={
        'schedule': '0 * * * *'
    }, follow_redirects=True)
    assert response.status_code == 200
    assert b'not available' in response.data.lower()



def test_api_tasks_status_no_scheduler(client, regular_user):
    """Test /api/tasks/status when scheduler not available (Line 600)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.get('/api/tasks/status')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'error' in data
    assert 'not available' in data['error'].lower()


def test_api_tasks_status_exception(client_with_scheduler, regular_user, mock_scheduler):
    """Test /api/tasks/status exception handling (Line 608-609)"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    mock_scheduler.get_all_tasks.side_effect = Exception("Status error")

    response = client_with_scheduler.get('/api/tasks/status')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'error' in data


# ============================================================================
# ANALYTICS ROUTE ERROR TESTS
# ============================================================================

def test_analytics_overview_exception(client, regular_user):
    """Test /api/analytics/overview exception handling (Line 648-649)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch('app.web.dashboard.AnalyticsTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker_class.return_value = mock_tracker
        mock_tracker.get_user_analytics.side_effect = Exception("DB error")

        response = client.get('/api/analytics/overview')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False


def test_analytics_top_tweets_exception(client, regular_user):
    """Test /api/analytics/top-tweets exception handling (Line 672-673)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch('app.web.dashboard.AnalyticsTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker_class.return_value = mock_tracker
        mock_tracker.get_top_tweets.side_effect = Exception("DB error")

        response = client.get('/api/analytics/top-tweets?metric=engagement_rate&limit=10')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False


def test_analytics_record_metrics_missing_tweet_id(client, regular_user):
    """Test /api/analytics/record-metrics with missing tweet_id (Line 688)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/api/analytics/record-metrics',
                          data=json.dumps({'metrics': {}}),
                          content_type='application/json')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] is False


def test_analytics_record_metrics_exception(client, regular_user):
    """Test /api/analytics/record-metrics exception handling"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch('app.web.dashboard.AnalyticsTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker_class.return_value = mock_tracker
        mock_tracker.record_metrics.side_effect = Exception("DB error")

        response = client.post('/api/analytics/record-metrics',
                              data=json.dumps({'tweet_id': '123', 'metrics': {}}),
                              content_type='application/json')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False


def test_analytics_create_snapshot_exception(client, regular_user):
    """Test /api/analytics/create-snapshot exception handling (Line 718-719)"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch('app.web.dashboard.AnalyticsTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker_class.return_value = mock_tracker
        mock_tracker.create_snapshot.side_effect = Exception("Snapshot error")

        response = client.post('/api/analytics/create-snapshot',
                              data=json.dumps({'period': 'daily'}),
                              content_type='application/json')
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False


# ============================================================================
# MAIN DASHBOARD ROUTE TESTS
# ============================================================================

def test_dashboard_requires_auth(client):
    """Test / dashboard requires authentication"""
    response = client.get('/')
    assert response.status_code == 302
    assert '/login' in response.location


def test_dashboard_authenticated(client, regular_user):
    """Test / dashboard with authenticated user"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id
        sess['username'] = regular_user.username
        sess['is_admin'] = regular_user.is_admin

    response = client.get('/')
    assert response.status_code == 200


# ============================================================================
# ANALYTICS DASHBOARD TESTS
# ============================================================================

def test_analytics_dashboard_requires_auth(client):
    """Test /analytics requires authentication"""
    response = client.get('/analytics')
    assert response.status_code == 302
    assert '/login' in response.location


def test_analytics_dashboard_authenticated(client, regular_user):
    """Test /analytics with authenticated user"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id
        sess['username'] = regular_user.username
        sess['is_admin'] = regular_user.is_admin

    response = client.get('/analytics')
    assert response.status_code == 200


# ============================================================================
# EDGE CASE TESTS
# ============================================================================

def test_user_edit_admin_toggle_flags(client, admin_user, user_manager, regular_user):
    """Test admin can toggle user flags"""
    with client.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    response = client.post(f'/users/{regular_user.id}/edit', data={
        'is_active': '0',
        'is_admin': '1'
    }, follow_redirects=True)

    assert response.status_code == 200


def test_credentials_add_twitter_scraping(client, regular_user):
    """Test adding Twitter scraping credentials"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/add', data={
        'platform': 'twitter',
        'credential_type': 'scraping',
        'username': 'twitteruser',
        'password': 'password',
        'email': 'email@example.com',
        'email_password': 'emailpass'
    }, follow_redirects=True)

    assert response.status_code == 200


def test_credentials_add_twitter_api(client, regular_user):
    """Test adding Twitter API credentials"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post('/credentials/add', data={
        'platform': 'twitter',
        'credential_type': 'api',
        'api_key': 'key',
        'api_secret': 'secret',
        'access_token': 'token',
        'access_secret': 'token_secret'
    }, follow_redirects=True)

    assert response.status_code == 200


def test_credentials_edit_twitter_api(client, regular_user, credential_manager):
    """Test editing Twitter API credentials"""
    credential_manager.save_credentials(
        regular_user.id, 'twitter', 'api',
        {'api_key': 'key', 'api_secret': 'secret', 'access_token': 'token', 'access_secret': 'secret'}
    )

    creds_list = credential_manager.list_user_credentials(regular_user.id)
    cred_id = creds_list[0]['id']

    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    response = client.post(f'/credentials/{cred_id}/edit', data={
        'api_key': 'newkey',
        'api_secret': 'newsecret',
        'access_token': 'newtoken',
        'access_secret': 'newtoken_secret'
    }, follow_redirects=True)

    assert response.status_code == 200


def test_task_resume_success(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle successfully resumes disabled task"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.return_value = {'enabled': False}
    mock_scheduler.resume_task.return_value = True

    response = client_with_scheduler.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['action'] == 'resumed'


def test_task_resume_failed(client_with_scheduler, admin_user, mock_scheduler):
    """Test /tasks/<name>/toggle when resume fails"""
    with client_with_scheduler.session_transaction() as sess:
        sess['user_id'] = admin_user.id

    mock_scheduler.get_task_status.return_value = {'enabled': False}
    mock_scheduler.resume_task.return_value = False

    response = client_with_scheduler.post('/tasks/cleanup_sessions/toggle')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['success'] is False


def test_analytics_overview_success(client, regular_user):
    """Test /api/analytics/overview success case"""
    with client.session_transaction() as sess:
        sess['user_id'] = regular_user.id

    with patch('app.web.dashboard.AnalyticsTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker_class.return_value = mock_tracker
        mock_tracker.get_user_analytics.return_value = {'tweets': 0, 'engagement': 0}
        mock_tracker.get_top_tweets.return_value = []

        response = client.get('/api/analytics/overview')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True


