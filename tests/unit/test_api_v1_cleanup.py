class TestCleanupAPI:
    def test_list_rules(self, client, auth_headers):
        response = client.get("/api/v1/cleanup/rules", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.get_json()["data"], list)

    def test_create_rule(self, client, auth_headers):
        response = client.post(
            "/api/v1/cleanup/rules",
            headers=auth_headers,
            json={
                "name": "Old tweets",
                "type": "age",
                "config": {"max_age_days": 365},
                "enabled": True,
            },
        )
        assert response.status_code == 201

    def test_preview_requires_auth(self, client):
        response = client.post("/api/v1/cleanup/rules/1/preview")
        assert response.status_code == 401

    def test_execute_requires_danger_token(self, client, auth_headers):
        response = client.post(
            "/api/v1/cleanup/rules/1/execute", headers=auth_headers
        )
        assert response.status_code == 403
        assert "danger_token" in response.get_json()["error"]["message"].lower()
