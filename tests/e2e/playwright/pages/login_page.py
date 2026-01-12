"""
Login Page Object Model

Provides a high-level interface for interacting with the login page.
Encapsulates all locators and actions related to the login functionality.
"""


class LoginPage:
    """Page Object Model for the Login page."""

    # Locators
    USERNAME_INPUT = 'input[name="username"]'
    PASSWORD_INPUT = 'input[name="password"]'
    LOGIN_BUTTON = 'button[type="submit"]'
    ERROR_MESSAGE = ".alert-danger"
    SUCCESS_MESSAGE = ".alert-success"
    REGISTER_LINK = 'a[href="/register"]'
    PAGE_TITLE = "h1, h2"

    def __init__(self, page):
        """
        Initialize LoginPage with a Playwright page object.

        Args:
            page: Playwright page object
        """
        self.page = page

    def goto(self):
        """Navigate to the login page."""
        self.page.goto("/login")
        self.page.wait_for_load_state("networkidle")

    def fill_username(self, username):
        """
        Fill the username field.

        Args:
            username: Username to enter
        """
        self.page.fill(self.USERNAME_INPUT, username)

    def fill_password(self, password):
        """
        Fill the password field.

        Args:
            password: Password to enter
        """
        self.page.fill(self.PASSWORD_INPUT, password)

    def click_login(self):
        """
        Click the login button and wait for navigation.

        Returns:
            Response from the login submission
        """
        self.page.click(self.LOGIN_BUTTON)
        self.page.wait_for_load_state("networkidle")

    def get_error_message(self):
        """
        Get the error message displayed on the page.

        Returns:
            str: Error message text, or None if not found
        """
        try:
            error_element = self.page.query_selector(self.ERROR_MESSAGE)
            if error_element:
                return error_element.text_content().strip()
            return None
        except Exception:
            return None

    def get_success_message(self):
        """
        Get the success message displayed on the page.

        Returns:
            str: Success message text, or None if not found
        """
        try:
            success_element = self.page.query_selector(self.SUCCESS_MESSAGE)
            if success_element:
                return success_element.text_content().strip()
            return None
        except Exception:
            return None

    def is_logged_in(self):
        """
        Check if user is logged in by verifying redirect to dashboard.

        Returns:
            bool: True if redirected to dashboard, False otherwise
        """
        try:
            # Wait for navigation away from login page
            self.page.wait_for_url("/dashboard", timeout=5000)
            return True
        except Exception:
            return False

    def is_on_login_page(self):
        """
        Check if currently on the login page.

        Returns:
            bool: True if on login page, False otherwise
        """
        try:
            self.page.wait_for_selector(self.LOGIN_BUTTON, timeout=3000)
            return True
        except Exception:
            return False

    def login_user(self, username, password):
        """
        Perform complete login flow.

        Args:
            username: Username to login with
            password: Password to login with

        Returns:
            bool: True if login successful, False otherwise
        """
        self.fill_username(username)
        self.fill_password(password)
        self.click_login()
        return self.is_logged_in()
