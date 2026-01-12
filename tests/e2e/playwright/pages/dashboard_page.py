"""
Dashboard Page Object Model

Provides a high-level interface for interacting with the dashboard page.
Encapsulates all locators and actions related to the main dashboard functionality.
"""


class DashboardPage:
    """Page Object Model for the Dashboard page."""

    # Locators
    PAGE_TITLE = "h1, h2"
    LOGOUT_BUTTON = 'button[type="submit"]:has-text("Logout"), a:has-text("Logout")'
    USERNAME_DISPLAY = '.username, [data-testid="username"]'
    CREDENTIALS_LINK = 'a[href="/credentials"]'
    USERS_LINK = 'a[href="/users"]'
    NAV_BAR = "nav, .navbar"
    WELCOME_MESSAGE = "h1, .welcome"
    LOGOUT_FORM = 'form[action="/logout"]'

    def __init__(self, page):
        """
        Initialize DashboardPage with a Playwright page object.

        Args:
            page: Playwright page object
        """
        self.page = page

    def goto(self):
        """Navigate to the dashboard page."""
        self.page.goto("/dashboard")
        self.page.wait_for_load_state("networkidle")

    def goto_root(self):
        """Navigate to the root (/) which redirects to dashboard."""
        self.page.goto("/")
        self.page.wait_for_load_state("networkidle")

    def is_authenticated(self):
        """
        Check if page loads without redirect to login (authenticated).

        Returns:
            bool: True if authenticated and on dashboard, False if redirected to login
        """
        try:
            # Try to navigate to dashboard
            self.goto()
            # Wait a bit for potential redirects
            self.page.wait_for_timeout(1000)
            # Check if still on dashboard
            current_url = self.page.url
            if "/login" in current_url:
                return False
            return True
        except Exception:
            return False

    def click_logout(self):
        """
        Click the logout button and wait for redirect to login.

        Returns:
            bool: True if successfully logged out and redirected to login
        """
        try:
            # Find and click logout form or button
            logout_form = self.page.query_selector(self.LOGOUT_FORM)
            if logout_form:
                logout_form.evaluate("form => form.submit()")
            else:
                self.page.click(self.LOGOUT_BUTTON)

            # Wait for redirect to login
            self.page.wait_for_url("/login", timeout=5000)
            return True
        except Exception:
            return False

    def get_username_display(self):
        """
        Get the displayed username on the dashboard.

        Returns:
            str: Username displayed on page, or None if not found
        """
        try:
            username_element = self.page.query_selector(self.USERNAME_DISPLAY)
            if username_element:
                text = username_element.text_content().strip()
                # Extract username from common patterns like "Welcome, testuser!" or just "testuser"
                if "," in text:
                    text = text.split(",")[1].strip()
                return text
            return None
        except Exception:
            return None

    def navigate_to_credentials(self):
        """
        Click the credentials menu link to navigate to credentials page.

        Returns:
            bool: True if navigation successful
        """
        try:
            self.page.click(self.CREDENTIALS_LINK)
            self.page.wait_for_url("/credentials", timeout=5000)
            return True
        except Exception:
            return False

    def navigate_to_users(self):
        """
        Click the users menu link to navigate to users page (admin only).

        Returns:
            bool: True if navigation successful
        """
        try:
            self.page.click(self.USERS_LINK)
            self.page.wait_for_url("/users", timeout=5000)
            return True
        except Exception:
            return False

    def is_on_dashboard(self):
        """
        Check if currently on the dashboard page.

        Returns:
            bool: True if on dashboard, False otherwise
        """
        try:
            current_url = self.page.url
            return "/dashboard" in current_url or current_url.endswith("/")
        except Exception:
            return False

    def wait_for_page_load(self):
        """
        Wait for the dashboard page to fully load.

        Returns:
            None
        """
        self.page.wait_for_load_state("networkidle")
