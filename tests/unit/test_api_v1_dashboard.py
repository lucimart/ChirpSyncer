def test_stats_requires_auth(client):
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 401


def test_stats_returns_expected_fields(client, auth_headers):
    response = client.get("/api/v1/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert "synced_today" in data
    assert "synced_week" in data
    assert "total_synced" in data
    assert "platforms_connected" in data
