def test_api_returns_json_on_error(client):
    response = client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    assert response.content_type == "application/json"
    body = response.get_json()
    assert body["success"] is False
    assert "correlation_id" in body
    assert "error" in body
