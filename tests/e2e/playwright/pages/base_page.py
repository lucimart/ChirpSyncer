"""
Base Page Object Model for Playwright E2E tests

Provides common functionality for all page objects including:
- Navigation and waiting
- Element interactions (click, fill, select)
- Assertion helpers
- Flash message handling
"""

from typing import Optional, List
from playwright.sync_api import Page, expect


class BasePage:
    """Base class for all page objects"""

    def __init__(self, page: Page):
        """
        Initialize page object

        Args:
            page: Playwright page instance
        """
        self.page = page
        self.page.set_default_timeout(30000)  # 30 seconds

    def goto(self, url: str) -> None:
        """Navigate to URL"""
        self.page.goto(url)
        self.page.wait_for_load_state("networkidle")

    def goto_path(self, path: str) -> None:
        """Navigate to app path (relative to base URL)"""
        self.page.goto(
            self.page.context.browser.contexts[0]
            if hasattr(self.page, "context")
            else ""
        )
        self.page.goto(path)
        self.page.wait_for_load_state("networkidle")

    def click(self, selector: str) -> None:
        """Click element"""
        self.page.click(selector)

    def fill(self, selector: str, text: str) -> None:
        """Fill input field"""
        self.page.fill(selector, text)

    def select_option(self, selector: str, value: str) -> None:
        """Select option from dropdown"""
        self.page.select_option(selector, value)

    def check(self, selector: str) -> None:
        """Check checkbox"""
        self.page.check(selector)

    def uncheck(self, selector: str) -> None:
        """Uncheck checkbox"""
        self.page.uncheck(selector)

    def text_content(self, selector: str) -> Optional[str]:
        """Get text content of element"""
        return self.page.text_content(selector)

    def get_element_count(self, selector: str) -> int:
        """Get count of elements matching selector"""
        return self.page.locator(selector).count()

    def is_visible(self, selector: str) -> bool:
        """Check if element is visible"""
        return self.page.locator(selector).is_visible()

    def is_enabled(self, selector: str) -> bool:
        """Check if element is enabled"""
        return self.page.locator(selector).is_enabled()

    def is_checked(self, selector: str) -> bool:
        """Check if checkbox is checked"""
        return self.page.locator(selector).is_checked()

    def wait_for_selector(self, selector: str, timeout: int = 5000) -> None:
        """Wait for element to appear"""
        self.page.wait_for_selector(selector, timeout=timeout)

    def wait_for_url(self, url: str, timeout: int = 5000) -> None:
        """Wait for page to navigate to URL"""
        self.page.wait_for_url(url, timeout=timeout)

    def wait_for_navigation(self, callback, timeout: int = 5000) -> None:
        """Wait for navigation after performing action"""
        with self.page.expect_navigation(timeout=timeout):
            callback()

    def get_flash_message(self, message_type: str = "error") -> Optional[str]:
        """
        Get flash message from page

        Args:
            message_type: Type of message ('error', 'success', 'warning')

        Returns:
            Flash message text or None
        """
        selector = f'.alert-{message_type}, [role="alert"].{message_type}'
        if self.page.locator(selector).is_visible():
            return self.page.locator(selector).text_content()
        return None

    def get_all_flash_messages(self) -> dict:
        """Get all flash messages by type"""
        messages = {
            "error": self.get_flash_message("error"),
            "success": self.get_flash_message("success"),
            "warning": self.get_flash_message("warning"),
        }
        return {k: v for k, v in messages.items() if v}

    def submit_form(self, selector: str = "form") -> None:
        """Submit form"""
        self.page.locator(f'{selector} button[type="submit"]').click()

    def get_page_title(self) -> str:
        """Get page title"""
        return self.page.title()

    def get_current_url(self) -> str:
        """Get current page URL"""
        return self.page.url

    def is_on_page(self, path: str) -> bool:
        """Check if current URL matches path"""
        return path in self.page.url

    def take_screenshot(self, name: str) -> None:
        """Take screenshot of page"""
        self.page.screenshot(path=f"screenshots/{name}.png")

    def close(self) -> None:
        """Close page"""
        self.page.close()
