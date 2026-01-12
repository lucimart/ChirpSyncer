"""
Credential Management E2E Tests

Tests critical credential management flows including:
- Adding Twitter credentials
- Credential encryption
- Deleting credentials
- Testing credentials
"""

import pytest

# Import page objects
from tests.e2e.playwright.pages.login_page import LoginPage
from tests.e2e.playwright.pages.dashboard_page import DashboardPage
from tests.e2e.playwright.pages.credentials_page import CredentialsPage


class TestCredentialManagement:
    """Test suite for credential management flows."""

    @pytest.fixture(autouse=True)
    def _login_user(self, page, app_server, test_user):
        """
        Auto-login before each test in this class.

        Args:
            page: Playwright page
            app_server: Running Flask app server
            test_user: Test user fixture
        """
        login_page = LoginPage(page)
        login_page.goto()
        login_page.login_user(test_user["username"], test_user["password"])

    @pytest.mark.e2e
    @pytest.mark.skip(reason="Requires pytest-playwright: pip install pytest-playwright && playwright install")
    def test_add_twitter_credential(self, page, app_server, test_user, test_db):
        """
        Test adding a Twitter API credential.

        Scenario:
        1. Login as test user
        2. Navigate to credentials
        3. Click "Add Credential"
        4. Select Twitter platform
        5. Select API credential type
        6. Fill API keys
        7. Submit
        8. Verify credential appears in list
        9. Verify database has encrypted credential
        """
        # Initialize page objects
        dashboard_page = DashboardPage(page)
        credentials_page = CredentialsPage(page)

        # Navigate to credentials page
        assert (
            dashboard_page.navigate_to_credentials()
        ), "Should navigate to credentials page"
        assert (
            credentials_page.is_on_credentials_page()
        ), "Should be on credentials page"

        # Click add credential button
        assert (
            credentials_page.click_add_credential()
        ), "Should navigate to add credential form"

        # Fill credential form for Twitter API
        twitter_cred_data = {
            "api_key": "test_api_key_123456",
            "api_secret": "test_api_secret_789012",
            "access_token": "test_access_token_345678",
            "access_secret": "test_access_secret_901234",
        }

        credentials_page.fill_credential_form("twitter", "api", twitter_cred_data)

        # Submit the form
        assert (
            credentials_page.submit_credential()
        ), "Should submit credential successfully"

        # Verify success message
        success_msg = credentials_page.get_success_message()
        assert success_msg is not None, "Should display success message"
        assert (
            "success" in success_msg.lower() or "added" in success_msg.lower()
        ), "Success message should confirm credential added"

        # Verify redirect back to credentials list
        assert (
            credentials_page.is_on_credentials_page()
        ), "Should return to credentials list"

        # Verify credential appears in the UI
        # Note: This depends on HTML structure; may need adjustment

        # Verify credential is encrypted in database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT encrypted_data FROM user_credentials WHERE user_id = ? AND platform = ? AND credential_type = ?",
            (test_user["id"], "twitter", "api"),
        )
        row = cursor.fetchone()
        assert row is not None, "Credential should be saved in database"

        # Verify data is encrypted (not plaintext)
        encrypted_data = row[0]
        assert (
            "api_key" not in encrypted_data
        ), "Credential data should be encrypted, not plaintext"
        assert (
            "test_api_key" not in encrypted_data
        ), "Credential data should be encrypted, not plaintext"

    @pytest.mark.e2e
    @pytest.mark.skip(reason="Requires pytest-playwright: pip install pytest-playwright && playwright install")
    def test_credential_encryption(
        self, page, app_server, test_user, test_db, master_encryption_key
    ):
        """
        Test that credentials are encrypted in the database.

        Scenario:
        1. Add credential via UI
        2. Query database directly
        3. Verify credential data is encrypted
        4. Verify NOT plaintext in database
        """
        # Initialize page objects
        dashboard_page = DashboardPage(page)
        credentials_page = CredentialsPage(page)

        # Navigate to credentials and add credential
        assert (
            dashboard_page.navigate_to_credentials()
        ), "Should navigate to credentials page"
        assert (
            credentials_page.click_add_credential()
        ), "Should navigate to add credential form"

        # Fill credential form
        twitter_cred_data = {
            "api_key": "encryption_test_key_xyz",
            "api_secret": "encryption_test_secret_abc",
            "access_token": "encryption_test_token_def",
            "access_secret": "encryption_test_token_secret_ghi",
        }

        credentials_page.fill_credential_form("twitter", "api", twitter_cred_data)
        assert (
            credentials_page.submit_credential()
        ), "Should submit credential successfully"

        # Query database to verify encryption
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT encrypted_data FROM user_credentials WHERE user_id = ? AND platform = ? AND credential_type = ?",
            (test_user["id"], "twitter", "api"),
        )
        row = cursor.fetchone()
        assert row is not None, "Credential should exist in database"

        encrypted_data = row[0]

        # Verify data is NOT plaintext
        plaintext_checks = [
            "encryption_test_key_xyz",
            "encryption_test_secret_abc",
            "encryption_test_token_def",
            "api_key",
            "api_secret",
            "access_token",
        ]

        for plaintext in plaintext_checks:
            assert (
                plaintext not in encrypted_data
            ), f"Database should not contain plaintext: {plaintext}"

        # Verify it looks like encrypted data (should be base64 or similar)
        assert len(encrypted_data) > 20, "Encrypted data should be substantial"

    @pytest.mark.e2e
    @pytest.mark.skip(reason="Requires pytest-playwright: pip install pytest-playwright && playwright install")
    def test_delete_credential(self, page, app_server, test_user, test_db):
        """
        Test deleting a credential.

        Scenario:
        1. Add credential
        2. Click delete button
        3. Confirm deletion
        4. Verify credential removed from UI
        5. Verify removed from database
        """
        # Initialize page objects
        dashboard_page = DashboardPage(page)
        credentials_page = CredentialsPage(page)

        # Navigate to credentials and add credential
        assert (
            dashboard_page.navigate_to_credentials()
        ), "Should navigate to credentials page"
        assert (
            credentials_page.click_add_credential()
        ), "Should navigate to add credential form"

        # Add Twitter credential
        twitter_cred_data = {
            "api_key": "delete_test_key",
            "api_secret": "delete_test_secret",
            "access_token": "delete_test_token",
            "access_secret": "delete_test_token_secret",
        }

        credentials_page.fill_credential_form("twitter", "api", twitter_cred_data)
        assert (
            credentials_page.submit_credential()
        ), "Should submit credential successfully"

        # Get credential ID from database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT id FROM user_credentials WHERE user_id = ? AND platform = ? AND credential_type = ?",
            (test_user["id"], "twitter", "api"),
        )
        row = cursor.fetchone()
        assert row is not None, "Credential should exist in database"
        cred_id = row[0]

        # Should be back on credentials list page
        assert (
            credentials_page.is_on_credentials_page()
        ), "Should be on credentials list"

        # Delete the credential
        assert credentials_page.delete_credential(
            cred_id
        ), "Should delete credential successfully"

        # Verify success message (if implemented in UI)
        # Note: May need adjustment based on actual success message

        # Verify removed from database
        cursor.execute("SELECT id FROM user_credentials WHERE id = ?", (cred_id,))
        row = cursor.fetchone()
        assert row is None, "Credential should be removed from database"

    @pytest.mark.e2e
    @pytest.mark.skip(reason="Requires pytest-playwright: pip install pytest-playwright && playwright install")
    def test_add_multiple_credentials(self, page, app_server, test_user, test_db):
        """
        Test adding multiple credentials for different platforms.

        Scenario:
        1. Add Twitter API credential
        2. Return to credentials list
        3. Add Bluesky credential
        4. Verify both appear in list
        5. Verify both in database with correct platform/type
        """
        # Initialize page objects
        dashboard_page = DashboardPage(page)
        credentials_page = CredentialsPage(page)

        # Navigate to credentials
        assert (
            dashboard_page.navigate_to_credentials()
        ), "Should navigate to credentials page"

        # Add Twitter API credential
        assert (
            credentials_page.click_add_credential()
        ), "Should navigate to add credential form"
        twitter_data = {
            "api_key": "twitter_api_key",
            "api_secret": "twitter_api_secret",
            "access_token": "twitter_access_token",
            "access_secret": "twitter_access_secret",
        }
        credentials_page.fill_credential_form("twitter", "api", twitter_data)
        assert credentials_page.submit_credential(), "Should add Twitter credential"

        # Back on credentials list, add Bluesky credential
        assert (
            credentials_page.is_on_credentials_page()
        ), "Should be on credentials list"
        assert (
            credentials_page.click_add_credential()
        ), "Should navigate to add credential form"

        bluesky_data = {
            "username": "testuser.bsky.social",
            "password": "bluesky_password_123",
        }
        credentials_page.fill_credential_form("bluesky", None, bluesky_data)
        # Note: adjust credential_type as needed
        assert credentials_page.submit_credential(), "Should add Bluesky credential"

        # Verify both credentials in database
        cursor = test_db.cursor()
        cursor.execute(
            "SELECT platform, credential_type FROM user_credentials WHERE user_id = ? ORDER BY platform",
            (test_user["id"],),
        )
        rows = cursor.fetchall()
        assert len(rows) >= 2, "Should have at least 2 credentials in database"

        platforms = [row[0] for row in rows]
        assert "twitter" in platforms, "Twitter credential should be in database"
        assert "bluesky" in platforms, "Bluesky credential should be in database"
