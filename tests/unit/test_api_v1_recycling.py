"""
Tests for Content Recycling API endpoints.

TDD tests for app/web/api/v1/recycling.py
"""

import json
import os
import sqlite3
import tempfile
import time

import pytest


@pytest.fixture
def setup_recycling_db(test_db_path):
    """Set up recycling tables with test data."""
    conn = sqlite3.connect(test_db_path)
    cursor = conn.cursor()

    # Create content_library table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS content_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            original_post_id TEXT NOT NULL,
            content TEXT NOT NULL,
            media_urls TEXT DEFAULT '[]',
            engagement_score REAL DEFAULT 0.0,
            evergreen_score REAL DEFAULT 0.0,
            recycle_score REAL DEFAULT 0.0,
            tags TEXT DEFAULT '[]',
            last_recycled_at INTEGER,
            recycle_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            UNIQUE(user_id, platform, original_post_id)
        )
    """)

    # Create recycle_suggestions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recycle_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_id INTEGER NOT NULL,
            suggested_platforms TEXT DEFAULT '[]',
            suggested_at INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            scheduled_for INTEGER,
            FOREIGN KEY (content_id) REFERENCES content_library(id)
        )
    """)

    # Add test content
    now = int(time.time())
    six_months_ago = now - (180 * 24 * 60 * 60)

    cursor.execute("""
        INSERT INTO content_library
        (user_id, platform, original_post_id, content, engagement_score,
         evergreen_score, recycle_score, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        1, "twitter", "tw_001", "10 tips for better productivity",
        0.8, 0.9, 0.75, '["productivity"]', six_months_ago
    ))

    cursor.execute("""
        INSERT INTO content_library
        (user_id, platform, original_post_id, content, engagement_score,
         evergreen_score, recycle_score, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        1, "bluesky", "bs_001", "How to learn programming fast",
        0.7, 0.85, 0.7, '["programming"]', six_months_ago
    ))

    # Add content for different user
    cursor.execute("""
        INSERT INTO content_library
        (user_id, platform, original_post_id, content, engagement_score,
         evergreen_score, recycle_score, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        999, "twitter", "tw_other", "Other user content",
        0.9, 0.9, 0.8, '[]', six_months_ago
    ))

    conn.commit()
    conn.close()

    return test_db_path


class TestGetLibrary:
    """Tests for GET /api/v1/library."""

    def test_get_library_success(self, client, auth_headers, setup_recycling_db):
        """Test getting content library."""
        response = client.get("/api/v1/library", headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "items" in data["data"]
        assert data["data"]["count"] >= 0

    def test_get_library_filters_by_user(self, client, auth_headers, setup_recycling_db):
        """Test that library only returns current user's content."""
        response = client.get("/api/v1/library", headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()

        # Should not include user 999's content
        for item in data["data"]["items"]:
            assert item["user_id"] != 999

    def test_get_library_filter_by_platform(self, client, auth_headers, setup_recycling_db):
        """Test filtering library by platform."""
        response = client.get(
            "/api/v1/library?platform=twitter",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()

        for item in data["data"]["items"]:
            assert item["platform"] == "twitter"

    def test_get_library_requires_auth(self, client):
        """Test that library endpoint requires authentication."""
        response = client.get("/api/v1/library")
        assert response.status_code == 401


class TestGetSuggestions:
    """Tests for GET /api/v1/library/suggestions."""

    def test_get_suggestions_success(self, client, auth_headers, setup_recycling_db):
        """Test getting recycle suggestions."""
        response = client.get("/api/v1/library/suggestions", headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "suggestions" in data["data"]

    def test_get_suggestions_with_limit(self, client, auth_headers, setup_recycling_db):
        """Test suggestions respects limit param."""
        response = client.get(
            "/api/v1/library/suggestions?limit=1",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["suggestions"]) <= 1


class TestRecycleContent:
    """Tests for POST /api/v1/library/:id/recycle."""

    def test_recycle_content_success(self, client, auth_headers, setup_recycling_db):
        """Test scheduling content for recycling."""
        response = client.post(
            "/api/v1/library/1/recycle",
            headers=auth_headers,
            json={"platforms": ["twitter", "bluesky"]}
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert "suggestion" in data["data"]
        assert data["data"]["message"] == "Content scheduled for recycling"

    def test_recycle_content_with_schedule(self, client, auth_headers, setup_recycling_db):
        """Test scheduling content for future recycling."""
        scheduled_time = int(time.time()) + 3600  # 1 hour from now

        response = client.post(
            "/api/v1/library/1/recycle",
            headers=auth_headers,
            json={
                "platforms": ["twitter"],
                "scheduled_for": scheduled_time
            }
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["suggestion"]["scheduled_for"] == scheduled_time

    def test_recycle_content_missing_platforms(self, client, auth_headers, setup_recycling_db):
        """Test recycle fails without platforms."""
        response = client.post(
            "/api/v1/library/1/recycle",
            headers=auth_headers,
            json={}
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["error"]["code"] == "MISSING_PLATFORMS"

    def test_recycle_content_not_found(self, client, auth_headers, setup_recycling_db):
        """Test recycle fails for non-existent content."""
        response = client.post(
            "/api/v1/library/9999/recycle",
            headers=auth_headers,
            json={"platforms": ["twitter"]}
        )

        assert response.status_code == 404

    def test_recycle_content_forbidden(self, client, auth_headers, setup_recycling_db):
        """Test recycle fails for other user's content."""
        # Content ID 3 belongs to user 999
        response = client.post(
            "/api/v1/library/3/recycle",
            headers=auth_headers,
            json={"platforms": ["twitter"]}
        )

        assert response.status_code == 403


class TestUpdateTags:
    """Tests for PUT /api/v1/library/:id/tags."""

    def test_update_tags_success(self, client, auth_headers, setup_recycling_db):
        """Test updating content tags."""
        response = client.put(
            "/api/v1/library/1/tags",
            headers=auth_headers,
            json={"tags": ["updated", "new_tag"]}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert "updated" in data["data"]["tags"]
        assert "new_tag" in data["data"]["tags"]

    def test_update_tags_empty_list(self, client, auth_headers, setup_recycling_db):
        """Test clearing tags."""
        response = client.put(
            "/api/v1/library/1/tags",
            headers=auth_headers,
            json={"tags": []}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["tags"] == []

    def test_update_tags_missing_body(self, client, auth_headers, setup_recycling_db):
        """Test update fails without tags."""
        response = client.put(
            "/api/v1/library/1/tags",
            headers=auth_headers,
            json={}
        )

        assert response.status_code == 400

    def test_update_tags_not_found(self, client, auth_headers, setup_recycling_db):
        """Test update fails for non-existent content."""
        response = client.put(
            "/api/v1/library/9999/tags",
            headers=auth_headers,
            json={"tags": ["test"]}
        )

        assert response.status_code == 404


class TestSyncLibrary:
    """Tests for POST /api/v1/library/sync."""

    def test_sync_library_no_posts(self, client, auth_headers, setup_recycling_db):
        """Test sync when no synced_posts exist."""
        response = client.post(
            "/api/v1/library/sync",
            headers=auth_headers,
            json={}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # May return 0 if no synced_posts table exists
        assert "imported" in data["data"]


class TestGetLibraryStats:
    """Tests for GET /api/v1/library/stats."""

    def test_get_stats_success(self, client, auth_headers, setup_recycling_db):
        """Test getting library statistics."""
        response = client.get("/api/v1/library/stats", headers=auth_headers)

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "total_content" in data["data"]
        assert "avg_engagement_score" in data["data"]
        assert "avg_evergreen_score" in data["data"]
        assert "recyclable_count" in data["data"]
