"""
Page Object Models for Playwright E2E tests

Provides page object classes for testing the Flask application UI:
- LoginPage: Login and authentication
- RegisterPage: User registration
- DashboardPage: Main dashboard
- CredentialsPage: Credential management
"""

from .login_page import LoginPage
from .register_page import RegisterPage
from .dashboard_page import DashboardPage
from .credentials_page import CredentialsPage

__all__ = [
    "LoginPage",
    "RegisterPage",
    "DashboardPage",
    "CredentialsPage",
]
