"""
Credentials Page Object Model

Provides a high-level interface for interacting with the credentials management page.
Encapsulates all locators and actions related to credential management functionality.
"""


class CredentialsPage:
    """Page Object Model for the Credentials management page."""

    # Locators
    PAGE_TITLE = "h1, h2"
    ADD_CREDENTIAL_BUTTON = (
        'a[href="/credentials/add"], button:has-text("Add Credential")'
    )
    CREDENTIALS_TABLE = 'table, [data-testid="credentials-list"]'
    CREDENTIAL_ROW = "tr[data-credential-id], .credential-row"
    PLATFORM_SELECT = 'select[name="platform"]'
    CREDENTIAL_TYPE_SELECT = 'select[name="credential_type"]'
    SUBMIT_BUTTON = (
        'button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")'
    )
    ERROR_MESSAGE = ".alert-danger"
    SUCCESS_MESSAGE = ".alert-success"
    DELETE_BUTTON = 'button:has-text("Delete")'
    TEST_BUTTON = 'button:has-text("Test")'

    # Form fields
    TWITTER_USERNAME = 'input[name="username"]'
    TWITTER_PASSWORD = 'input[name="password"]'
    TWITTER_API_KEY = 'input[name="api_key"]'
    TWITTER_API_SECRET = 'input[name="api_secret"]'
    TWITTER_ACCESS_TOKEN = 'input[name="access_token"]'
    TWITTER_ACCESS_SECRET = 'input[name="access_secret"]'

    def __init__(self, page):
        """
        Initialize CredentialsPage with a Playwright page object.

        Args:
            page: Playwright page object
        """
        self.page = page

    def goto(self):
        """Navigate to the credentials page."""
        self.page.goto("/credentials")
        self.page.wait_for_load_state("networkidle")

    def is_on_credentials_page(self):
        """
        Check if currently on the credentials page.

        Returns:
            bool: True if on credentials page, False otherwise
        """
        try:
            current_url = self.page.url
            return (
                "/credentials" in current_url
                and "/add" not in current_url
                and "/edit" not in current_url
            )
        except Exception:
            return False

    def click_add_credential(self):
        """
        Click the 'Add Credential' button to navigate to add credentials form.

        Returns:
            bool: True if navigation successful
        """
        try:
            self.page.click(self.ADD_CREDENTIAL_BUTTON)
            self.page.wait_for_url("/credentials/add", timeout=5000)
            return True
        except Exception:
            return False

    def select_platform(self, platform):
        """
        Select a platform from the platform dropdown.

        Args:
            platform: Platform to select (e.g., 'twitter', 'bluesky')

        Returns:
            None
        """
        self.page.select_option(self.PLATFORM_SELECT, platform)

    def select_credential_type(self, credential_type):
        """
        Select a credential type from the dropdown.

        Args:
            credential_type: Credential type to select (e.g., 'api', 'scraping')

        Returns:
            None
        """
        self.page.select_option(self.CREDENTIAL_TYPE_SELECT, credential_type)

    def fill_twitter_api_credential(
        self, api_key, api_secret, access_token, access_secret
    ):
        """
        Fill Twitter API credential form.

        Args:
            api_key: Twitter API key
            api_secret: Twitter API secret
            access_token: Twitter access token
            access_secret: Twitter access token secret

        Returns:
            None
        """
        self.page.fill(self.TWITTER_API_KEY, api_key)
        self.page.fill(self.TWITTER_API_SECRET, api_secret)
        self.page.fill(self.TWITTER_ACCESS_TOKEN, access_token)
        self.page.fill(self.TWITTER_ACCESS_SECRET, access_secret)

    def fill_twitter_scraping_credential(self, username, password):
        """
        Fill Twitter scraping credential form.

        Args:
            username: Twitter username
            password: Twitter password

        Returns:
            None
        """
        self.page.fill(self.TWITTER_USERNAME, username)
        self.page.fill(self.TWITTER_PASSWORD, password)

    def fill_bluesky_credential(self, username, password):
        """
        Fill Bluesky credential form.

        Args:
            username: Bluesky username
            password: Bluesky password

        Returns:
            None
        """
        self.page.fill(self.TWITTER_USERNAME, username)
        self.page.fill(self.TWITTER_PASSWORD, password)

    def fill_credential_form(self, platform, cred_type, data):
        """
        Fill credential form based on platform and type.

        Args:
            platform: Platform name ('twitter', 'bluesky')
            cred_type: Credential type ('api', 'scraping')
            data: Dictionary with credential data

        Returns:
            None
        """
        self.select_platform(platform)
        self.page.wait_for_timeout(500)  # Wait for form to update
        self.select_credential_type(cred_type)
        self.page.wait_for_timeout(500)  # Wait for form to update

        if platform == "twitter" and cred_type == "api":
            self.fill_twitter_api_credential(
                data.get("api_key", ""),
                data.get("api_secret", ""),
                data.get("access_token", ""),
                data.get("access_secret", ""),
            )
        elif platform == "twitter" and cred_type == "scraping":
            self.fill_twitter_scraping_credential(
                data.get("username", ""),
                data.get("password", ""),
            )
        elif platform == "bluesky":
            self.fill_bluesky_credential(
                data.get("username", ""),
                data.get("password", ""),
            )

    def submit_credential(self):
        """
        Submit the credential form.

        Returns:
            bool: True if form submitted successfully
        """
        try:
            self.page.click(self.SUBMIT_BUTTON)
            self.page.wait_for_load_state("networkidle")
            return True
        except Exception:
            return False

    def get_credentials_list(self):
        """
        Get all credentials currently displayed on the page.

        Returns:
            list: List of credential dictionaries with platform, type, and id
        """
        try:
            credentials = []
            rows = self.page.query_selector_all(self.CREDENTIAL_ROW)
            for row in rows:
                # Extract credential info from row
                # This depends on HTML structure, example implementation
                credential = {
                    "element": row,
                }
                credentials.append(credential)
            return credentials
        except Exception:
            return []

    def click_test_credential(self, cred_id):
        """
        Click the test button for a specific credential.

        Args:
            cred_id: ID of the credential to test

        Returns:
            bool: True if test request sent successfully
        """
        try:
            test_btn = self.page.query_selector(
                f'[data-credential-id="{cred_id}"] {self.TEST_BUTTON}, '
                f'button[data-credential-id="{cred_id}"]:has-text("Test")'
            )
            if test_btn:
                test_btn.click()
                self.page.wait_for_timeout(2000)
                return True
            return False
        except Exception:
            return False

    def delete_credential(self, cred_id):
        """
        Delete a credential by ID.

        Args:
            cred_id: ID of the credential to delete

        Returns:
            bool: True if credential deleted successfully
        """
        try:
            # Find and click delete button for specific credential
            delete_btn = self.page.query_selector(
                f'[data-credential-id="{cred_id}"] {self.DELETE_BUTTON}, '
                f'button[data-credential-id="{cred_id}"]:has-text("Delete")'
            )
            if delete_btn:
                delete_btn.click()
                # Handle confirmation dialog if present
                try:
                    self.page.click('button:has-text("Confirm")')
                except Exception:
                    pass  # Confirmation dialog may not be present in UI
                self.page.wait_for_load_state("networkidle")
                return True
            return False
        except Exception:
            return False

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
