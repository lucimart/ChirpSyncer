class TestAuthAPI:
    def test_login_success(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )
        assert response.status_code == 200
        body = response.get_json()
        assert body["success"] is True
        assert "token" in body["data"]
        assert "user" in body["data"]

    def test_login_invalid_credentials(self, client):
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "wrong", "password": "wrong"},
        )
        assert response.status_code == 401
        body = response.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_CREDENTIALS"

    def test_register_success(self, client):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 201
        body = response.get_json()
        assert body["success"] is True
        assert "token" in body["data"]
        assert body["data"]["user"]["username"] == "newuser"

    def test_logout_success(self, client, auth_headers):
        response = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        body = response.get_json()
        assert body["success"] is True

    def test_me_requires_auth(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_returns_user(self, client, auth_headers):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        body = response.get_json()
        assert "username" in body["data"]
