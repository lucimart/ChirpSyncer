"""
Authentication E2E Tests

Tests critical authentication flows including:
- User registration complete flow
- Login and logout flow
- Invalid credential handling
- Password validation
"""

import pytest
import sqlite3
from pathlib import Path

# Import page objects
from tests.e2e.playwright.pages.login_page import LoginPage
from tests.e2e.playwright.pages.register_page import RegisterPage
from tests.e2e.playwright.pages.dashboard_page import DashboardPage


class TestAuthenticationFlows:
    """Test suite for authentication flows."""

    @pytest.mark.e2e
    def test_user_registration_complete_flow(self, page, app_server, test_db_path):
        """
        Test complete user registration flow.

        Scenario:
        1. Navigate to register page
        2. Fill valid registration form
        3. Submit
        4. Verify redirect to login
        5. Login with new credentials
        6. Verify dashboard loads
        """
        # Initialize page objects
        register_page = RegisterPage(page)
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)

        # Navigate to registration page
        register_page.goto()
        assert register_page.is_on_register_page(), "Should be on registration page"

        # Fill registration form with valid data
        username = "newuser"
        email = "newuser@example.com"
        password = "NewPassword123!"
        confirm_password = "NewPassword123!"

        register_page.fill_form(username, email, password, confirm_password)

        # Submit registration
        register_page.submit()

        # Verify redirect to login page
        assert (
            register_page.is_redirected_to_login()
        ), "Should redirect to login after registration"
        assert login_page.is_on_login_page(), "Should be on login page"

        # Get success message
        success_msg = register_page.get_success_message()
        assert success_msg is not None, "Should display success message"
        assert (
            "successful" in success_msg.lower()
        ), "Success message should confirm registration"

        # Now login with the new credentials
        login_page.fill_username(username)
        login_page.fill_password(password)
        login_page.click_login()

        # Verify successful login and redirect to dashboard
        assert login_page.is_logged_in(), "Should be logged in after successful login"
        assert dashboard_page.is_on_dashboard(), "Should be on dashboard"

    @pytest.mark.e2e
    def test_login_logout_flow(self, page, app_server, test_user):
        """
        Test complete login and logout flow.

        Scenario:
        1. Navigate to login
        2. Login with valid credentials
        3. Verify dashboard loads with username
        4. Click logout
        5. Verify redirect to login
        6. Try to access /credentials -> verify redirect to login
        """
        # Initialize page objects
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)

        # Navigate to login page
        login_page.goto()
        assert login_page.is_on_login_page(), "Should be on login page"

        # Login with test user
        username = test_user["username"]
        password = test_user["password"]
        login_page.fill_username(username)
        login_page.fill_password(password)
        login_page.click_login()

        # Verify successful login
        assert login_page.is_logged_in(), "Should be logged in"
        assert dashboard_page.is_on_dashboard(), "Should be on dashboard"

        # Verify username is displayed
        displayed_username = dashboard_page.get_username_display()
        assert displayed_username is not None, "Username should be displayed"
        assert (
            username.lower() in displayed_username.lower()
        ), f"Username {username} should be displayed"

        # Logout
        success = dashboard_page.click_logout()
        assert success, "Logout should be successful"

        # Verify redirect to login
        assert login_page.is_on_login_page(), "Should be on login page after logout"

        # Try to access /credentials, should redirect to login
        page.goto("/credentials")
        assert (
            login_page.is_on_login_page()
        ), "Should be redirected to login when accessing protected route"

    @pytest.mark.e2e
    def test_login_with_invalid_credentials(self, page, app_server, test_user):
        """
        Test login with invalid credentials.

        Scenario:
        1. Navigate to login
        2. Enter invalid password
        3. Submit
        4. Verify error message displayed
        5. Verify stays on login page
        """
        # Initialize page objects
        login_page = LoginPage(page)
        dashboard_page = DashboardPage(page)

        # Navigate to login page
        login_page.goto()
        assert login_page.is_on_login_page(), "Should be on login page"

        # Try login with wrong password
        login_page.fill_username(test_user["username"])
        login_page.fill_password("WrongPassword123!")
        login_page.click_login()

        # Verify error message
        error_msg = login_page.get_error_message()
        assert error_msg is not None, "Should display error message"
        assert (
            "invalid" in error_msg.lower() or "incorrect" in error_msg.lower()
        ), "Error should indicate invalid credentials"

        # Verify still on login page
        assert login_page.is_on_login_page(), "Should still be on login page"

        # Verify NOT logged in (not on dashboard)
        assert not dashboard_page.is_authenticated(), "Should not be authenticated"

    @pytest.mark.e2e
    def test_password_validation(self, page, app_server):
        """
        Test password validation on registration.

        Scenario:
        1. Navigate to register
        2. Enter weak password
        3. Verify validation error message
        4. Enter strong password
        5. Verify no validation error
        """
        # Initialize page objects
        register_page = RegisterPage(page)

        # Navigate to registration page
        register_page.goto()
        assert register_page.is_on_register_page(), "Should be on registration page"

        # Try with weak password (less than 8 characters)
        weak_password = "weak"
        register_page.fill_form(
            "testuser", "test@example.com", weak_password, weak_password
        )
        register_page.submit()

        # Wait a bit for validation
        page.wait_for_timeout(1000)

        # Check for validation error
        error_msg = register_page.get_error_message()
        validation_errors = register_page.get_validation_errors()

        # Should either have flash error or field validation error
        assert (
            error_msg is not None or validation_errors
        ), "Should display validation error for weak password"

        if error_msg:
            assert "password" in error_msg.lower(), "Error should mention password"

        # Verify still on registration page
        assert (
            register_page.is_on_register_page()
        ), "Should still be on registration page"

        # Now try with strong password
        strong_password = "StrongPassword123!"
        register_page.fill_form(
            "testuser2", "test2@example.com", strong_password, strong_password
        )
        register_page.submit()

        # Verify no error this time and redirect to login
        assert (
            register_page.is_redirected_to_login()
        ), "Should redirect to login with valid password"

    @pytest.mark.e2e
    def test_username_uniqueness(self, page, app_server, test_user):
        """
        Test that duplicate usernames are rejected.

        Scenario:
        1. Navigate to register
        2. Try to register with existing username
        3. Verify error message
        4. Verify stays on registration page
        """
        # Initialize page objects
        register_page = RegisterPage(page)

        # Navigate to registration page
        register_page.goto()
        assert register_page.is_on_register_page(), "Should be on registration page"

        # Try to register with existing username
        register_page.fill_form(
            test_user["username"],  # Use existing username
            "newemail@example.com",
            "ValidPassword123!",
            "ValidPassword123!",
        )
        register_page.submit()

        # Wait for response
        page.wait_for_timeout(1000)

        # Verify error message
        error_msg = register_page.get_error_message()
        assert error_msg is not None, "Should display error for duplicate username"
        assert (
            "username" in error_msg.lower() or "already" in error_msg.lower()
        ), "Error should indicate username already exists"

        # Verify still on registration page
        assert (
            register_page.is_on_register_page()
        ), "Should still be on registration page"

    @pytest.mark.e2e
    def test_email_uniqueness(self, page, app_server, test_user):
        """
        Test that duplicate emails are rejected.

        Scenario:
        1. Navigate to register
        2. Try to register with existing email
        3. Verify error message
        4. Verify stays on registration page
        """
        # Initialize page objects
        register_page = RegisterPage(page)

        # Navigate to registration page
        register_page.goto()
        assert register_page.is_on_register_page(), "Should be on registration page"

        # Try to register with existing email
        register_page.fill_form(
            "differentuser",
            test_user["email"],  # Use existing email
            "ValidPassword123!",
            "ValidPassword123!",
        )
        register_page.submit()

        # Wait for response
        page.wait_for_timeout(1000)

        # Verify error message
        error_msg = register_page.get_error_message()
        assert error_msg is not None, "Should display error for duplicate email"
        assert (
            "email" in error_msg.lower() or "already" in error_msg.lower()
        ), "Error should indicate email already exists"

        # Verify still on registration page
        assert (
            register_page.is_on_register_page()
        ), "Should still be on registration page"
