"""
Tests for Atomization API endpoints.

Tests for /api/v1/atomize endpoints.
"""

import pytest


class TestAtomizationAPICreate:
    """Test POST /api/v1/atomize endpoint."""

    def test_create_job_blog(self, client, auth_headers):
        """Test creating atomization job for blog content."""
        response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test Blog\n\nContent here.",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert "id" in data["data"]
        assert data["data"]["source_type"] == "blog"
        assert data["data"]["status"] == "pending"

    def test_create_job_youtube(self, client, auth_headers):
        """Test creating atomization job for YouTube URL."""
        response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "youtube",
                "source_url": "https://youtube.com/watch?v=test123",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["source_type"] == "youtube"

    def test_create_job_thread(self, client, auth_headers):
        """Test creating atomization job for thread content."""
        response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "thread",
                "source_content": "1/ Here's a thread\n\n2/ Second tweet",
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data["data"]["source_type"] == "thread"

    def test_create_job_missing_source_type(self, client, auth_headers):
        """Test error when source_type is missing."""
        response = client.post(
            "/api/v1/atomize",
            json={"source_content": "Test content"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data["success"] is False
        assert "source_type is required" in data["error"]["message"]

    def test_create_job_invalid_source_type(self, client, auth_headers):
        """Test error for invalid source_type."""
        response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "invalid",
                "source_content": "Test",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        data = response.get_json()
        assert "Invalid source_type" in data["error"]["message"]

    def test_create_job_missing_content(self, client, auth_headers):
        """Test error when both url and content are missing."""
        response = client.post(
            "/api/v1/atomize",
            json={"source_type": "blog"},
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestAtomizationAPIGetJob:
    """Test GET /api/v1/atomize/:id endpoint."""

    def test_get_job(self, client, auth_headers):
        """Test getting a job by ID."""
        # Create job first
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        # Get job
        get_response = client.get(
            f"/api/v1/atomize/{job_id}",
            headers=auth_headers,
        )

        assert get_response.status_code == 200
        data = get_response.get_json()
        assert data["data"]["id"] == job_id
        assert data["data"]["status"] == "pending"

    def test_get_job_not_found(self, client, auth_headers):
        """Test 404 for non-existent job."""
        response = client.get(
            "/api/v1/atomize/nonexistent-id",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAtomizationAPIProcess:
    """Test POST /api/v1/atomize/:id/process endpoint."""

    def test_process_job(self, client, auth_headers):
        """Test processing an atomization job."""
        # Create job first
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test Blog Post\n\n- Point 1\n- Point 2\n- Point 3",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        # Process job
        process_response = client.post(
            f"/api/v1/atomize/{job_id}/process",
            headers=auth_headers,
        )

        assert process_response.status_code == 200
        data = process_response.get_json()
        assert data["success"] is True
        assert "job" in data["data"]
        assert "outputs" in data["data"]
        assert data["data"]["job"]["status"] == "completed"
        assert len(data["data"]["outputs"]) > 0

    def test_process_job_generates_multiple_platforms(self, client, auth_headers):
        """Test that processing generates content for multiple platforms."""
        # Create job
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# My Article\n\n## Section 1\nContent 1\n\n## Section 2\nContent 2",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        # Process job
        process_response = client.post(
            f"/api/v1/atomize/{job_id}/process",
            headers=auth_headers,
        )

        data = process_response.get_json()
        outputs = data["data"]["outputs"]
        platforms = {o["platform"] for o in outputs}

        # Should have outputs for multiple platforms
        assert "twitter" in platforms
        assert "linkedin" in platforms

    def test_process_job_not_found(self, client, auth_headers):
        """Test 404 when processing non-existent job."""
        response = client.post(
            "/api/v1/atomize/nonexistent-id/process",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAtomizationAPIOutputs:
    """Test GET /api/v1/atomize/:id/outputs endpoint."""

    def test_get_outputs(self, client, auth_headers):
        """Test getting outputs for a job."""
        # Create and process job
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent here.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        client.post(f"/api/v1/atomize/{job_id}/process", headers=auth_headers)

        # Get outputs
        outputs_response = client.get(
            f"/api/v1/atomize/{job_id}/outputs",
            headers=auth_headers,
        )

        assert outputs_response.status_code == 200
        data = outputs_response.get_json()
        assert "outputs" in data["data"]

        # Check output structure
        if data["data"]["outputs"]:
            output = data["data"]["outputs"][0]
            assert "id" in output
            assert "platform" in output
            assert "content" in output
            assert "format" in output
            assert "is_published" in output

    def test_get_outputs_empty_for_pending_job(self, client, auth_headers):
        """Test outputs are empty for unprocessed job."""
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        outputs_response = client.get(
            f"/api/v1/atomize/{job_id}/outputs",
            headers=auth_headers,
        )

        assert outputs_response.status_code == 200
        data = outputs_response.get_json()
        assert data["data"]["outputs"] == []


class TestAtomizationAPIPublish:
    """Test POST /api/v1/atomize/:id/publish endpoint."""

    def test_publish_outputs(self, client, auth_headers):
        """Test publishing outputs."""
        # Create and process job
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        client.post(f"/api/v1/atomize/{job_id}/process", headers=auth_headers)

        # Publish outputs
        publish_response = client.post(
            f"/api/v1/atomize/{job_id}/publish",
            headers=auth_headers,
        )

        assert publish_response.status_code == 200
        data = publish_response.get_json()
        assert "published" in data["data"]
        assert "failed" in data["data"]


class TestAtomizationAPISchedule:
    """Test POST /api/v1/atomize/:id/schedule endpoint."""

    def test_schedule_outputs(self, client, auth_headers):
        """Test scheduling outputs."""
        import time

        # Create and process job
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        client.post(f"/api/v1/atomize/{job_id}/process", headers=auth_headers)

        # Get an output ID
        outputs_response = client.get(
            f"/api/v1/atomize/{job_id}/outputs",
            headers=auth_headers,
        )
        output_id = outputs_response.get_json()["data"]["outputs"][0]["id"]

        # Schedule output
        scheduled_time = int(time.time()) + 3600  # 1 hour from now
        schedule_response = client.post(
            f"/api/v1/atomize/{job_id}/schedule",
            json={
                "schedules": [
                    {"output_id": output_id, "scheduled_for": scheduled_time}
                ]
            },
            headers=auth_headers,
        )

        assert schedule_response.status_code == 200
        data = schedule_response.get_json()
        assert output_id in data["data"]["scheduled"]

    def test_schedule_missing_schedules(self, client, auth_headers):
        """Test error when schedules array is missing."""
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        response = client.post(
            f"/api/v1/atomize/{job_id}/schedule",
            json={},
            headers=auth_headers,
        )

        assert response.status_code == 400


class TestAtomizationAPIList:
    """Test GET /api/v1/atomize endpoint."""

    def test_list_jobs(self, client, auth_headers):
        """Test listing atomization jobs."""
        # Create a few jobs
        for i in range(3):
            client.post(
                "/api/v1/atomize",
                json={
                    "source_type": "blog",
                    "source_content": f"# Test {i}\n\nContent.",
                },
                headers=auth_headers,
            )

        # List jobs
        list_response = client.get("/api/v1/atomize", headers=auth_headers)

        assert list_response.status_code == 200
        data = list_response.get_json()
        assert "jobs" in data["data"]
        assert len(data["data"]["jobs"]) >= 3

    def test_list_jobs_with_status_filter(self, client, auth_headers):
        """Test listing jobs filtered by status."""
        # Create a job
        create_response = client.post(
            "/api/v1/atomize",
            json={
                "source_type": "blog",
                "source_content": "# Test\n\nContent.",
            },
            headers=auth_headers,
        )
        job_id = create_response.get_json()["data"]["id"]

        # Process it
        client.post(f"/api/v1/atomize/{job_id}/process", headers=auth_headers)

        # List completed jobs
        list_response = client.get(
            "/api/v1/atomize?status=completed",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        data = list_response.get_json()
        for job in data["data"]["jobs"]:
            assert job["status"] == "completed"

    def test_list_jobs_with_limit(self, client, auth_headers):
        """Test listing jobs with limit."""
        # Create a few jobs
        for i in range(5):
            client.post(
                "/api/v1/atomize",
                json={
                    "source_type": "blog",
                    "source_content": f"# Test {i}\n\nContent.",
                },
                headers=auth_headers,
            )

        # List with limit
        list_response = client.get(
            "/api/v1/atomize?limit=2",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        data = list_response.get_json()
        assert len(data["data"]["jobs"]) <= 2
