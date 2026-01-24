"""
Integration Tests for Scheduling API v1 Endpoints

Tests the JSON API layer for tweet scheduling that the Next.js frontend consumes.
Follows TDD methodology - tests written first.
"""

import json
from datetime import datetime, timedelta


class TestSchedulingPostsAPI:
    """Tests for /api/v1/scheduling/posts/* endpoints."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_list_scheduled_posts_requires_auth(self, test_client, test_db):
        """GET /api/v1/scheduling/posts requires auth."""
        response = test_client.get("/api/v1/scheduling/posts")
        assert response.status_code == 401

    def test_list_scheduled_posts_empty(self, test_client, test_db, test_user):
        """GET /api/v1/scheduling/posts returns empty list for new user."""
        token = self._get_auth_token(test_client, test_user)
        response = test_client.get(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) == 0

    def test_create_scheduled_post(self, test_client, test_db, test_user):
        """POST /api/v1/scheduling/posts creates a scheduled post."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        response = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Test scheduled tweet",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert "id" in data["data"]
        assert data["data"]["content"] == "Test scheduled tweet"
        assert data["data"]["status"] == "pending"

    def test_create_scheduled_post_missing_content(self, test_client, test_db, test_user):
        """POST /api/v1/scheduling/posts requires content."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        response = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_REQUEST"

    def test_create_scheduled_post_past_time(self, test_client, test_db, test_user):
        """POST /api/v1/scheduling/posts rejects past scheduled time."""
        token = self._get_auth_token(test_client, test_user)
        past_time = (datetime.now() - timedelta(hours=1)).isoformat()

        response = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Past tweet",
                "scheduled_at": past_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    def test_get_scheduled_post(self, test_client, test_db, test_user):
        """GET /api/v1/scheduling/posts/:id returns specific post."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        # Create a post first
        create_resp = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Get test tweet",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        post_id = create_resp.get_json()["data"]["id"]

        # Get the post
        response = test_client.get(
            f"/api/v1/scheduling/posts/{post_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["id"] == post_id
        assert data["data"]["content"] == "Get test tweet"

    def test_get_scheduled_post_not_found(self, test_client, test_db, test_user):
        """GET /api/v1/scheduling/posts/:id returns 404 for non-existent post."""
        token = self._get_auth_token(test_client, test_user)

        response = test_client.get(
            "/api/v1/scheduling/posts/99999",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404

    def test_update_scheduled_post(self, test_client, test_db, test_user):
        """PUT /api/v1/scheduling/posts/:id updates a scheduled post."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()
        new_time = (datetime.now() + timedelta(hours=4)).isoformat()

        # Create a post first
        create_resp = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Original content",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        post_id = create_resp.get_json()["data"]["id"]

        # Update the post
        response = test_client.put(
            f"/api/v1/scheduling/posts/{post_id}",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Updated content",
                "scheduled_at": new_time,
            }),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["content"] == "Updated content"

    def test_delete_scheduled_post(self, test_client, test_db, test_user):
        """DELETE /api/v1/scheduling/posts/:id cancels a scheduled post."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        # Create a post first
        create_resp = test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "To be deleted",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        post_id = create_resp.get_json()["data"]["id"]

        # Delete the post
        response = test_client.delete(
            f"/api/v1/scheduling/posts/{post_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        # Verify it's gone or marked as cancelled
        get_resp = test_client.get(
            f"/api/v1/scheduling/posts/{post_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        # Either returns 404 or status is 'cancelled'
        if get_resp.status_code == 200:
            assert get_resp.get_json()["data"]["status"] == "cancelled"
        else:
            assert get_resp.status_code == 404

    def test_list_scheduled_posts_with_status_filter(self, test_client, test_db, test_user):
        """GET /api/v1/scheduling/posts?status=pending returns filtered list."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        # Create two posts
        test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Post 1",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
            content_type="application/json",
        )
        test_client.post(
            "/api/v1/scheduling/posts",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "Post 2",
                "scheduled_at": scheduled_time,
                "platform": "bluesky",
            }),
            content_type="application/json",
        )

        # List pending posts
        response = test_client.get(
            "/api/v1/scheduling/posts?status=pending",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert len(data["data"]) == 2
        for post in data["data"]:
            assert post["status"] == "pending"


class TestSchedulingOptimalTimesAPI:
    """Tests for /api/v1/scheduling/optimal-times endpoint."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_optimal_times_requires_auth(self, test_client, test_db):
        """GET /api/v1/scheduling/optimal-times requires auth."""
        response = test_client.get("/api/v1/scheduling/optimal-times")
        assert response.status_code == 401

    def test_optimal_times_returns_data(self, test_client, test_db, test_user):
        """GET /api/v1/scheduling/optimal-times returns optimal posting times."""
        token = self._get_auth_token(test_client, test_user)

        response = test_client.get(
            "/api/v1/scheduling/optimal-times",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "best_times" in data["data"]
        assert "timezone" in data["data"]
        assert isinstance(data["data"]["best_times"], list)


class TestSchedulingPredictAPI:
    """Tests for /api/v1/scheduling/predict endpoint."""

    def _get_auth_token(self, test_client, test_user):
        """Helper to get auth token."""
        login_resp = test_client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": test_user["username"], "password": test_user["password"]}),
            content_type="application/json",
        )
        return login_resp.get_json()["data"]["token"]

    def test_predict_requires_auth(self, test_client, test_db):
        """POST /api/v1/scheduling/predict requires auth."""
        response = test_client.post(
            "/api/v1/scheduling/predict",
            data=json.dumps({"content": "Test"}),
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_predict_returns_engagement_prediction(self, test_client, test_db, test_user):
        """POST /api/v1/scheduling/predict returns engagement prediction."""
        token = self._get_auth_token(test_client, test_user)
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()

        response = test_client.post(
            "/api/v1/scheduling/predict",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({
                "content": "This is a test tweet for prediction",
                "scheduled_at": scheduled_time,
            }),
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "score" in data["data"]
        assert "confidence" in data["data"]
        assert 0 <= data["data"]["score"] <= 100
        assert 0 <= data["data"]["confidence"] <= 1

    def test_predict_requires_content(self, test_client, test_db, test_user):
        """POST /api/v1/scheduling/predict requires content."""
        token = self._get_auth_token(test_client, test_user)

        response = test_client.post(
            "/api/v1/scheduling/predict",
            headers={"Authorization": f"Bearer {token}"},
            data=json.dumps({}),
            content_type="application/json",
        )
        assert response.status_code == 400
