import json


def _auth_headers(test_client, test_user):
    response = test_client.post(
        "/api/v1/auth/login",
        data=json.dumps(
            {"username": test_user["username"], "password": test_user["password"]}
        ),
        content_type="application/json",
    )
    token = response.get_json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}


class TestSyncJobs:
    def test_start_sync_creates_job(self, test_client, test_db, test_user):
        headers = _auth_headers(test_client, test_user)
        response = test_client.post(
            "/api/v1/sync/start",
            data=json.dumps({"direction": "twitter_to_bluesky"}),
            content_type="application/json",
            headers=headers,
        )
        assert response.status_code == 202
        job_id = response.get_json()["data"]["job_id"]

        cursor = test_db.cursor()
        cursor.execute(
            "SELECT job_id, status, direction FROM sync_jobs WHERE job_id = ?",
            (job_id,),
        )
        row = cursor.fetchone()
        assert row is not None
        assert row["status"] == "queued"
        assert row["direction"] == "twitter_to_bluesky"

    def test_sync_status_returns_job(self, test_client, test_db, test_user):
        headers = _auth_headers(test_client, test_user)
        start_response = test_client.post(
            "/api/v1/sync/start",
            data=json.dumps({"direction": "both"}),
            content_type="application/json",
            headers=headers,
        )
        job_id = start_response.get_json()["data"]["job_id"]

        response = test_client.get(f"/api/v1/sync/{job_id}/status", headers=headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["status"] == "queued"
        assert data["direction"] == "both"

    def test_sync_status_not_found(self, test_client, test_user):
        headers = _auth_headers(test_client, test_user)
        response = test_client.get(
            "/api/v1/sync/job-does-not-exist/status", headers=headers
        )
        assert response.status_code == 404
