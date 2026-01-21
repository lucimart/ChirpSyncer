from unittest.mock import MagicMock

import pytest

from app.auth.credential_manager import CredentialManager


@pytest.fixture
def credential_manager(app):
    return CredentialManager(app.config["MASTER_KEY"], app.config["DB_PATH"])


@pytest.fixture
def test_credential(credential_manager, test_user):
    credential_manager.save_credentials(
        test_user["id"],
        "twitter",
        "scraping",
        {"username": "testuser", "password": "secret"},
    )
    creds = credential_manager.list_user_credentials(test_user["id"])
    return creds[0]


class TestCredentialsAPI:
    def test_list_credentials(self, client, auth_headers, test_credential):
        response = client.get("/api/v1/credentials", headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert len(data) >= 1
        for cred in data:
            assert "password" not in cred
            assert "api_secret" not in cred

    def test_create_credential(self, client, auth_headers):
        response = client.post(
            "/api/v1/credentials",
            headers=auth_headers,
            json={
                "platform": "twitter",
                "credential_type": "scraping",
                "credentials": {"username": "test", "password": "secret"},
            },
        )
        assert response.status_code == 201
        data = response.get_json()["data"]
        assert data["platform"] == "twitter"
        assert data["credential_type"] == "scraping"

    def test_delete_credential(self, client, auth_headers, test_credential):
        response = client.delete(
            f"/api/v1/credentials/{test_credential['id']}", headers=auth_headers
        )
        assert response.status_code == 200

    def test_test_credential(self, client, auth_headers, test_credential, monkeypatch):
        mock_validate = MagicMock(return_value=(True, "ok"))
        monkeypatch.setattr(
            "app.integrations.credential_validator.validate_credentials",
            mock_validate,
        )
        response = client.post(
            f"/api/v1/credentials/{test_credential['id']}/test", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["valid"] is True
