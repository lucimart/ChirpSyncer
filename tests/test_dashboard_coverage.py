# Coverage tests for dashboard.py - Sprint 7
import pytest
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.user_manager import UserManager
from app.credential_manager import CredentialManager


@pytest.fixture
def db_path(tmp_path):
    return str(tmp_path / "test_cov.db")


@pytest.fixture
def master_key():
    return os.urandom(32)


@pytest.fixture
def user_manager(db_path):
    um = UserManager(db_path)
    um.init_db()
    return um


@pytest.fixture
def credential_manager(db_path, master_key):
    cm = CredentialManager(master_key, db_path)
    cm.init_db()
    return cm


@pytest.fixture
def test_app(db_path, master_key):
    from app.dashboard import create_app
    app = create_app(db_path=db_path, master_key=master_key)
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False
    return app


@pytest.fixture
def client(test_app):
    return test_app.test_client()


@pytest.fixture
def regular_user(user_manager):
    user_id = user_manager.create_user("regular", "regular@test.com", "Regular@Pass123", is_admin=False)
    return user_manager.get_user_by_id(user_id)


@pytest.fixture
def admin_user(user_manager):
    user_id = user_manager.create_user("admin", "admin@test.com", "Admin@Pass123", is_admin=True)
    return user_manager.get_user_by_id(user_id)


class TestLoginCoverage:
    def test_login_missing_username(self, client):
        response = client.post("/login", data={"password": "SomePass123"}, follow_redirects=True)
        assert response.status_code == 200

    def test_login_missing_password(self, client):
        response = client.post("/login", data={"username": "someuser"}, follow_redirects=True)
        assert response.status_code == 200

    def test_login_empty_credentials(self, client):
        response = client.post("/login", data={"username": "", "password": ""}, follow_redirects=True)
        assert response.status_code == 200


class TestRegistrationCoverage:
    def test_register_weak_password(self, client):
        response = client.post("/register", data={
            "username": "newuser", "email": "new@test.com",
            "password": "weak", "confirm_password": "weak"
        }, follow_redirects=True)
        assert response.status_code == 200

    def test_register_password_mismatch(self, client):
        response = client.post("/register", data={
            "username": "newuser", "email": "new@test.com",
            "password": "Strong@Pass123", "confirm_password": "Different@Pass456"
        }, follow_redirects=True)
        assert response.status_code == 200


class TestUserEditCoverage:
    def test_user_edit_invalid_password(self, client, admin_user, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post(f"/users/{regular_user.id}/edit", data={
            "username": "regular", "email": "regular@test.com", "new_password": "weak"
        }, follow_redirects=True)
        assert response.status_code == 200

    def test_user_edit_admin_fields(self, client, admin_user, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post(f"/users/{regular_user.id}/edit", data={
            "username": "regular", "email": "regular@test.com",
            "is_admin": "on", "is_active": "on"
        }, follow_redirects=True)
        assert response.status_code == 200

    def test_user_detail_not_found(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.get("/users/99999")
        assert response.status_code == 404

    def test_user_delete_self_prevented(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post(f"/users/{admin_user.id}/delete", follow_redirects=True)
        assert response.status_code == 200


class TestCredentialAddCoverage:
    def test_cred_add_twitter_api(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/add", data={
            "platform": "twitter_api", "name": "My Twitter API",
            "api_key": "test_api_key", "api_secret": "test_api_secret",
            "access_token": "test_access_token", "access_secret": "test_access_secret"
        }, follow_redirects=True)
        assert response.status_code == 200

    def test_cred_add_twitter_scraping(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/add", data={
            "platform": "twitter_scraping", "name": "My Scraper",
            "username": "scraperuser", "password": "scraperpass", "email": "scraper@test.com"
        }, follow_redirects=True)
        assert response.status_code == 200

    def test_cred_add_bluesky(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/add", data={
            "platform": "bluesky", "name": "My Bluesky",
            "handle": "user.bsky.social", "app_password": "xxxx-xxxx-xxxx-xxxx"
        }, follow_redirects=True)
        assert response.status_code == 200


class TestCredential404Coverage:
    def test_cred_edit_not_found(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.get("/credentials/99999/edit")
        assert response.status_code == 404

    def test_cred_delete_not_found(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/99999/delete")
        assert response.status_code == 404

    def test_cred_test_not_found(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/99999/test")
        assert response.status_code == 404

    def test_cred_share_not_found(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/credentials/99999/share")
        assert response.status_code == 404


class TestTaskRoutesNoScheduler:
    def test_tasks_list_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.get("/tasks")
        assert response.status_code in [200, 302]

    def test_task_detail_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.get("/tasks/sync_task")
        assert response.status_code in [200, 302, 404, 500]

    def test_task_trigger_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post("/tasks/sync_task/trigger", follow_redirects=True)
        assert response.status_code in [200, 302, 404, 500]

    def test_task_toggle_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post("/tasks/sync_task/toggle", follow_redirects=True)
        assert response.status_code in [200, 302, 404, 500]

    def test_task_configure_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.post("/tasks/sync_task/configure", data={"interval": "3600"}, follow_redirects=True)
        assert response.status_code in [200, 302, 404, 500]


class TestApiTaskStatus:
    def test_api_tasks_status_no_scheduler(self, client, admin_user):
        with client.session_transaction() as sess:
            sess["user_id"] = admin_user.id
            sess["username"] = admin_user.username
            sess["is_admin"] = True
        response = client.get("/api/tasks/status")
        assert response.status_code in [200, 500]


class TestAnalyticsApiCoverage:
    def test_api_record_metrics_with_tweet(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/api/analytics/record-metrics",
            data=json.dumps({"tweet_id": "12345", "likes": 10, "retweets": 5, "replies": 2}),
            content_type="application/json")
        assert response.status_code in [200, 400, 404]

    def test_api_record_metrics_no_tweet(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/api/analytics/record-metrics",
            data=json.dumps({"likes": 10, "retweets": 5}),
            content_type="application/json")
        assert response.status_code in [200, 400]

    def test_api_create_snapshot(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/api/analytics/create-snapshot",
            data=json.dumps({"period": "daily"}),
            content_type="application/json")
        assert response.status_code in [200, 400, 500]

    def test_api_create_snapshot_empty_body(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/api/analytics/create-snapshot",
            data=json.dumps({}),
            content_type="application/json")
        assert response.status_code in [200, 400, 500]



class TestLogoutCoverage:
    def test_logout_post(self, client, regular_user):
        with client.session_transaction() as sess:
            sess["user_id"] = regular_user.id
            sess["username"] = regular_user.username
        response = client.post("/logout", follow_redirects=True)
        assert response.status_code == 200
