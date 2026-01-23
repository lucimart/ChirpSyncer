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
        assert "refresh_token" in body["data"]
        assert "user" in body["data"]

    def test_login_returns_refresh_token(self, client, test_user):
        """Test that login returns a refresh token."""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )
        assert response.status_code == 200
        body = response.get_json()
        refresh_token = body["data"].get("refresh_token")
        assert refresh_token is not None
        assert len(refresh_token) > 20

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


class TestRefreshTokenAPI:
    """Tests for refresh token endpoints."""

    def test_refresh_token_success(self, client, test_user):
        """Test refreshing access token with valid refresh token."""
        # First login to get refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )
        assert login_response.status_code == 200
        refresh_token = login_response.get_json()["data"]["refresh_token"]

        # Use refresh token to get new access token
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200
        body = refresh_response.get_json()
        assert body["success"] is True
        assert "token" in body["data"]
        assert "refresh_token" in body["data"]
        # New refresh token should be different (rotation)
        assert body["data"]["refresh_token"] != refresh_token

    def test_refresh_token_missing(self, client):
        """Test refresh without token returns error."""
        response = client.post("/api/v1/auth/refresh", json={})
        assert response.status_code == 400
        body = response.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_REQUEST"

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token returns error."""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        assert response.status_code == 401
        body = response.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "INVALID_TOKEN"

    def test_refresh_token_reuse_blocked(self, client, test_user):
        """Test that reusing a rotated refresh token is blocked."""
        # Login to get initial refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )
        old_refresh = login_response.get_json()["data"]["refresh_token"]

        # Rotate the token
        rotate_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert rotate_response.status_code == 200

        # Try to reuse old refresh token - should fail
        reuse_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": old_refresh},
        )
        assert reuse_response.status_code == 401
        body = reuse_response.get_json()
        assert body["error"]["code"] == "TOKEN_REUSED"

    def test_logout_revokes_refresh_tokens(self, client, test_user, auth_headers):
        """Test that logout revokes all refresh tokens."""
        # Login to create refresh token
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )
        refresh_token = login_response.get_json()["data"]["refresh_token"]

        # Logout
        logout_response = client.post("/api/v1/auth/logout", headers=auth_headers)
        assert logout_response.status_code == 200

        # Try to use the refresh token - should fail
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        # Token should be revoked
        assert refresh_response.status_code == 401

    def test_register_returns_refresh_token(self, client):
        """Test that register returns a refresh token."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "refreshuser",
                "email": "refresh@example.com",
                "password": "TestPassword123!",
            },
        )
        assert response.status_code == 201
        body = response.get_json()
        assert "refresh_token" in body["data"]
        assert len(body["data"]["refresh_token"]) > 20
