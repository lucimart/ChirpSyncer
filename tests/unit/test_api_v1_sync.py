class TestSyncAPI:
    def test_get_sync_stats(self, client, auth_headers):
        response = client.get("/api/v1/sync/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "today" in data
        assert "week" in data
        assert "total" in data

    def test_get_sync_history(self, client, auth_headers):
        response = client.get("/api/v1/sync/history", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "items" in data
        assert "total" in data
        assert "page" in data

    def test_start_sync(self, client, auth_headers):
        response = client.post("/api/v1/sync/start", headers=auth_headers)
        assert response.status_code == 202
        data = response.get_json()["data"]
        assert "job_id" in data
