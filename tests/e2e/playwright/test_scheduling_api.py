"""
Scheduling API E2E Tests

Tests the scheduling endpoints with Flask test client.
Covers scheduled posts CRUD, optimal times, and engagement prediction.
"""

import json
from datetime import datetime, timedelta

import pytest

pytestmark = pytest.mark.e2e


class TestSchedulingApiE2E:
    """E2E tests for scheduling API endpoints."""

    @pytest.fixture
    def client(self, flask_app):
        """Create test client from flask app."""
        return flask_app.test_client()

    def _login(self, client, user):
        """Helper to login and get auth token."""
        response = client.post(
            "/api/v1/auth/login",
            data=json.dumps({"username": user["username"], "password": user["password"]}),
            content_type="application/json",
        )
        data = response.get_json()
        return data["data"]["token"]

    def _auth_headers(self, token):
        """Helper to create auth headers."""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # =========================================================================
    # Scheduled Posts CRUD
    # =========================================================================

    def test_list_scheduled_posts_requires_auth(self, client, test_db):
        """GET /api/v1/scheduling/posts requires authentication."""
        response = client.get("/api/v1/scheduling/posts")
        assert response.status_code == 401

    def test_list_scheduled_posts_empty(self, client, test_db, test_user):
        """GET /api/v1/scheduling/posts returns empty list for new user."""
        token = self._login(client, test_user)
        response = client.get(
            "/api/v1/scheduling/posts",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["data"] == []

    def test_create_scheduled_post(self, client, test_db, test_user):
        """POST /api/v1/scheduling/posts creates a new scheduled post."""
        token = self._login(client, test_user)
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"

        response = client.post(
            "/api/v1/scheduling/posts",
            headers=self._auth_headers(token),
            data=json.dumps({
                "content": "Test scheduled tweet #testing",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["content"] == "Test scheduled tweet #testing"
        assert data["data"]["platform"] == "twitter"
        assert data["data"]["status"] == "pending"

    def test_create_scheduled_post_past_time_rejected(self, client, test_db, test_user):
        """POST /api/v1/scheduling/posts rejects past scheduled times."""
        token = self._login(client, test_user)
        past_time = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"

        response = client.post(
            "/api/v1/scheduling/posts",
            headers=self._auth_headers(token),
            data=json.dumps({
                "content": "Test tweet",
                "scheduled_at": past_time,
                "platform": "twitter",
            }),
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False

    def test_create_and_list_scheduled_posts(self, client, test_db, test_user):
        """Create multiple posts then list them."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        # Create two posts (start from +2h to avoid timing issues)
        for i in range(2):
            scheduled_time = (datetime.utcnow() + timedelta(hours=i + 2)).isoformat() + "Z"
            response = client.post(
                "/api/v1/scheduling/posts",
                headers=headers,
                data=json.dumps({
                    "content": f"Test post {i + 1}",
                    "scheduled_at": scheduled_time,
                    "platform": "twitter",
                }),
            )
            assert response.status_code == 201, f"Failed to create post {i+1}: {response.get_json()}"

        # List posts
        response = client.get("/api/v1/scheduling/posts", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]) == 2

    def test_get_scheduled_post_by_id(self, client, test_db, test_user):
        """GET /api/v1/scheduling/posts/:id returns specific post."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        # Create post
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        create_response = client.post(
            "/api/v1/scheduling/posts",
            headers=headers,
            data=json.dumps({
                "content": "Test tweet",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )
        post_id = create_response.get_json()["data"]["id"]

        # Get post
        response = client.get(f"/api/v1/scheduling/posts/{post_id}", headers=headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["id"] == post_id
        assert data["data"]["content"] == "Test tweet"

    def test_update_scheduled_post(self, client, test_db, test_user):
        """PUT /api/v1/scheduling/posts/:id updates post content."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        # Create post
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        create_response = client.post(
            "/api/v1/scheduling/posts",
            headers=headers,
            data=json.dumps({
                "content": "Original content",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )
        post_id = create_response.get_json()["data"]["id"]

        # Update post
        response = client.put(
            f"/api/v1/scheduling/posts/{post_id}",
            headers=headers,
            data=json.dumps({"content": "Updated content"}),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["content"] == "Updated content"

    def test_delete_scheduled_post(self, client, test_db, test_user):
        """DELETE /api/v1/scheduling/posts/:id cancels the post."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        # Create post
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        create_response = client.post(
            "/api/v1/scheduling/posts",
            headers=headers,
            data=json.dumps({
                "content": "To be deleted",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )
        post_id = create_response.get_json()["data"]["id"]

        # Delete post
        response = client.delete(f"/api/v1/scheduling/posts/{post_id}", headers=headers)
        assert response.status_code == 200

        # Verify status changed to cancelled
        get_response = client.get(f"/api/v1/scheduling/posts/{post_id}", headers=headers)
        assert get_response.get_json()["data"]["status"] == "cancelled"

    # =========================================================================
    # Optimal Times
    # =========================================================================

    def test_get_optimal_times(self, client, test_db, test_user):
        """GET /api/v1/scheduling/optimal-times returns time recommendations."""
        token = self._login(client, test_user)
        response = client.get(
            "/api/v1/scheduling/optimal-times",
            headers=self._auth_headers(token),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "best_times" in data["data"]
        assert "timezone" in data["data"]
        assert isinstance(data["data"]["best_times"], list)

    # =========================================================================
    # Engagement Prediction
    # =========================================================================

    def test_predict_engagement(self, client, test_db, test_user):
        """POST /api/v1/scheduling/predict returns engagement score."""
        token = self._login(client, test_user)
        response = client.post(
            "/api/v1/scheduling/predict",
            headers=self._auth_headers(token),
            data=json.dumps({
                "content": "This is a great test tweet with good length! #testing",
            }),
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "score" in data["data"]
        assert "confidence" in data["data"]
        assert "factors" in data["data"]
        assert "suggested_improvements" in data["data"]

    def test_predict_engagement_with_media(self, client, test_db, test_user):
        """POST /api/v1/scheduling/predict with media flag increases score."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)
        content = "Same content for comparison"

        # Without media
        response_no_media = client.post(
            "/api/v1/scheduling/predict",
            headers=headers,
            data=json.dumps({"content": content, "has_media": False}),
        )
        score_no_media = response_no_media.get_json()["data"]["score"]

        # With media
        response_with_media = client.post(
            "/api/v1/scheduling/predict",
            headers=headers,
            data=json.dumps({"content": content, "has_media": True}),
        )
        score_with_media = response_with_media.get_json()["data"]["score"]

        assert score_with_media > score_no_media

    # =========================================================================
    # Filter by Status
    # =========================================================================

    def test_list_posts_filter_by_status(self, client, test_db, test_user):
        """GET /api/v1/scheduling/posts?status=pending filters results."""
        token = self._login(client, test_user)
        headers = self._auth_headers(token)

        # Create and cancel one post
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        create_response = client.post(
            "/api/v1/scheduling/posts",
            headers=headers,
            data=json.dumps({
                "content": "Will be cancelled",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )
        post_id = create_response.get_json()["data"]["id"]
        client.delete(f"/api/v1/scheduling/posts/{post_id}", headers=headers)

        # Create a pending post
        client.post(
            "/api/v1/scheduling/posts",
            headers=headers,
            data=json.dumps({
                "content": "Still pending",
                "scheduled_at": scheduled_time,
                "platform": "twitter",
            }),
        )

        # Filter by pending
        response = client.get("/api/v1/scheduling/posts?status=pending", headers=headers)
        data = response.get_json()
        assert all(post["status"] == "pending" for post in data["data"])

        # Filter by cancelled
        response = client.get("/api/v1/scheduling/posts?status=cancelled", headers=headers)
        data = response.get_json()
        assert all(post["status"] == "cancelled" for post in data["data"])
