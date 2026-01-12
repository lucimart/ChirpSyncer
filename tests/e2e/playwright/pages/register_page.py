"""
Register Page Object Model

Provides a high-level interface for interacting with the registration page.
Encapsulates all locators and actions related to user registration.
"""


class RegisterPage:
    """Page Object Model for the Registration page."""

    # Locators
    USERNAME_INPUT = 'input[name="username"]'
    EMAIL_INPUT = 'input[name="email"]'
    PASSWORD_INPUT = 'input[name="password"]'
    CONFIRM_PASSWORD_INPUT = 'input[name="confirm_password"]'
    REGISTER_BUTTON = 'button[type="submit"]'
    ERROR_MESSAGE = ".alert-danger"
    SUCCESS_MESSAGE = ".alert-success"
    LOGIN_LINK = 'a[href="/login"]'
    PAGE_TITLE = "h1, h2"

    # Validation error selectors
    USERNAME_ERROR = '[name="username"] + .error, .error-username'
    EMAIL_ERROR = '[name="email"] + .error, .error-email'
    PASSWORD_ERROR = '[name="password"] + .error, .error-password'
    CONFIRM_PASSWORD_ERROR = '[name="confirm_password"] + .error, .error-confirm'

    def __init__(self, page):
        """
        Initialize RegisterPage with a Playwright page object.

        Args:
            page: Playwright page object
        """
        self.page = page

    def goto(self):
        """Navigate to the registration page."""
        self.page.goto("/register")
        self.page.wait_for_load_state("networkidle")

    def fill_username(self, username):
        """
        Fill the username field.

        Args:
            username: Username to enter
        """
        self.page.fill(self.USERNAME_INPUT, username)

    def fill_email(self, email):
        """
        Fill the email field.

        Args:
            email: Email to enter
        """
        self.page.fill(self.EMAIL_INPUT, email)

    def fill_password(self, password):
        """
        Fill the password field.

        Args:
            password: Password to enter
        """
        self.page.fill(self.PASSWORD_INPUT, password)

    def fill_confirm_password(self, confirm_password):
        """
        Fill the confirm password field.

        Args:
            confirm_password: Password confirmation to enter
        """
        self.page.fill(self.CONFIRM_PASSWORD_INPUT, confirm_password)

    def fill_form(self, username, email, password, confirm_password):
        """
        Fill all registration form fields.

        Args:
            username: Username
            email: Email address
            password: Password
            confirm_password: Password confirmation
        """
        self.fill_username(username)
        self.fill_email(email)
        self.fill_password(password)
        self.fill_confirm_password(confirm_password)

    def click_register(self):
        """
        Click the register button.

        Returns:
            None
        """
        self.page.click(self.REGISTER_BUTTON)
        self.page.wait_for_load_state("networkidle")

    def submit(self):
        """
        Submit the registration form.

        Alias for click_register for consistency.
        """
        self.click_register()

    def get_error_message(self):
        """
        Get the flash error message displayed on the page.

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

    def get_validation_errors(self):
        """
        Get all field-level validation errors.

        Returns:
            dict: Dictionary with field names as keys and error messages as values
        """
        errors = {}

        # Check for field-specific error messages
        try:
            username_error = self.page.query_selector(self.USERNAME_ERROR)
            if username_error:
                errors["username"] = username_error.text_content().strip()
        except Exception:
            pass

        try:
            email_error = self.page.query_selector(self.EMAIL_ERROR)
            if email_error:
                errors["email"] = email_error.text_content().strip()
        except Exception:
            pass

        try:
            password_error = self.page.query_selector(self.PASSWORD_ERROR)
            if password_error:
                errors["password"] = password_error.text_content().strip()
        except Exception:
            pass

        try:
            confirm_error = self.page.query_selector(self.CONFIRM_PASSWORD_ERROR)
            if confirm_error:
                errors["confirm_password"] = confirm_error.text_content().strip()
        except Exception:
            pass

        return errors

    def is_redirected_to_login(self):
        """
        Check if successfully redirected to login page after registration.

        Returns:
            bool: True if on login page, False otherwise
        """
        try:
            self.page.wait_for_url("/login", timeout=5000)
            return True
        except Exception:
            return False

    def is_on_register_page(self):
        """
        Check if currently on the registration page.

        Returns:
            bool: True if on register page, False otherwise
        """
        try:
            self.page.wait_for_selector(self.REGISTER_BUTTON, timeout=3000)
            return True
        except Exception:
            return False

    def register_user(self, username, email, password, confirm_password):
        """
        Perform complete registration flow.

        Args:
            username: Username
            email: Email address
            password: Password
            confirm_password: Password confirmation

        Returns:
            bool: True if registration successful and redirected to login
        """
        self.fill_form(username, email, password, confirm_password)
        self.submit()
        return self.is_redirected_to_login()
