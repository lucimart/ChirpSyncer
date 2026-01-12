# Playwright E2E Tests

End-to-end testing for ChirpSyncer Flask application using Playwright.

## Overview

This test suite covers critical dashboard flows including:
- User authentication (login, register, logout)
- Credential management (add, delete, encryption)
- Database verification (encrypted storage)

## Test Structure

```
tests/e2e/playwright/
├── conftest.py                      # Pytest fixtures for E2E testing
├── test_auth_flows.py              # Authentication E2E tests
├── test_credential_management.py   # Credential management E2E tests
├── pages/                          # Page Object Model classes
│   ├── login_page.py
│   ├── register_page.py
│   ├── dashboard_page.py
│   └── credentials_page.py
└── fixtures/                       # Shared test data (if needed)
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements-dev.txt
python -m playwright install chromium firefox
```

### 2. Configuration

The Playwright configuration is defined in `/playwright.config.js` at the project root:
- Base URL: `http://localhost:5000`
- Timeout: 30 seconds per test
- Browsers: Chromium and Firefox
- Screenshots: Captured on failure
- Video: Recorded on failure
- Reports: HTML, JSON, and JUnit XML formats

### 3. Environment Setup

Tests use temporary databases and a background Flask server. Fixtures handle:
- Creating temporary test database with full schema
- Spinning up Flask server on port 5000
- Creating test users (regular + admin)
- Generating encryption keys for credential testing

## Running Tests

### Run All E2E Tests

```bash
pytest tests/e2e/playwright/ -v
```

### Run Specific Test File

```bash
pytest tests/e2e/playwright/test_auth_flows.py -v
pytest tests/e2e/playwright/test_credential_management.py -v
```

### Run Specific Test

```bash
pytest tests/e2e/playwright/test_auth_flows.py::TestAuthenticationFlows::test_login_logout_flow -v
```

### Run with Specific Browser

```bash
pytest tests/e2e/playwright/ -v --headed --browser chromium
pytest tests/e2e/playwright/ -v --headed --browser firefox
```

### Run in Headed Mode (See Browser)

```bash
pytest tests/e2e/playwright/ -v --headed
```

### Run in Debug Mode

```bash
pytest tests/e2e/playwright/ -v --debug
```

## Test Reports

After running tests, reports are generated in:
- HTML Report: `playwright-report/index.html`
- JSON Report: `test-results/playwright-results.json`
- JUnit Report: `test-results/playwright-junit.xml`

View HTML report:
```bash
npx playwright show-report playwright-report
```

Or simply open the HTML file in a browser.

## Test Coverage

### Authentication Tests (test_auth_flows.py)

1. **test_user_registration_complete_flow**: Complete registration flow with login
   - Register new user
   - Verify redirect to login
   - Login with new credentials
   - Verify dashboard loads

2. **test_login_logout_flow**: Login and logout flow
   - Login with valid credentials
   - Verify username displayed
   - Logout
   - Verify redirect to login
   - Verify protected routes redirect

3. **test_login_with_invalid_credentials**: Invalid credential handling
   - Login with wrong password
   - Verify error message
   - Verify stays on login page

4. **test_password_validation**: Password strength validation
   - Attempt weak password (fails)
   - Attempt strong password (succeeds)
   - Verify validation messages

5. **test_username_uniqueness**: Duplicate username prevention
   - Attempt registration with existing username
   - Verify error message

6. **test_email_uniqueness**: Duplicate email prevention
   - Attempt registration with existing email
   - Verify error message

### Credential Management Tests (test_credential_management.py)

1. **test_add_twitter_credential**: Add Twitter API credentials
   - Navigate to credentials
   - Fill credential form
   - Submit
   - Verify appears in list
   - Verify encrypted in database

2. **test_credential_encryption**: Verify encryption
   - Add credential via UI
   - Query database
   - Verify data is encrypted (not plaintext)

3. **test_delete_credential**: Delete credential
   - Add credential
   - Delete via UI
   - Verify removed from database

4. **test_add_multiple_credentials**: Multiple platforms
   - Add Twitter credential
   - Add Bluesky credential
   - Verify both in database with correct metadata

## Page Object Model

All page interactions use the Page Object Model pattern for maintainability:

### LoginPage
- `goto()` - Navigate to /login
- `fill_username(username)` - Fill username field
- `fill_password(password)` - Fill password field
- `click_login()` - Submit login form
- `login_user(username, password)` - Complete login flow
- `get_error_message()` - Get flash error
- `is_logged_in()` - Verify successful login
- `is_on_login_page()` - Verify current page

### RegisterPage
- `goto()` - Navigate to /register
- `fill_form(username, email, password, confirm)` - Fill all fields
- `submit()` - Submit registration
- `get_validation_errors()` - Get field errors
- `is_redirected_to_login()` - Verify success redirect
- `register_user(...)` - Complete registration flow

### DashboardPage
- `goto()` - Navigate to /dashboard
- `is_authenticated()` - Check if authenticated
- `click_logout()` - Logout and verify redirect
- `get_username_display()` - Get displayed username
- `navigate_to_credentials()` - Click credentials link
- `navigate_to_users()` - Click users link (admin)

### CredentialsPage
- `goto()` - Navigate to /credentials
- `click_add_credential()` - Navigate to add form
- `fill_credential_form(platform, type, data)` - Fill form
- `submit_credential()` - Submit form
- `get_credentials_list()` - Get list of credentials
- `delete_credential(cred_id)` - Delete credential
- `test_credential(cred_id)` - Test credential

## Fixtures

### Database Fixtures
- `test_db_path` - Temporary database file path
- `test_db` - SQLite connection with schema
- `test_user` - Regular test user
- `test_admin_user` - Admin test user
- `master_encryption_key` - Encryption key for credentials

### Flask Fixtures
- `flask_app` - Flask application instance
- `app_server` - Running Flask server on port 5000

### Playwright Fixtures
- `browser_context` - Browser context
- `page` - Playwright page (main fixture for tests)

## Best Practices

1. **Use Page Objects**: Always interact with pages through page objects, not directly with Playwright selectors
2. **Wait for Navigation**: Tests automatically wait for page loads using `wait_for_load_state()`
3. **Verify Both UI and DB**: Credential tests verify both UI state and database encryption
4. **Clean Up**: Fixtures automatically clean up temporary databases and stop servers
5. **Parallel Safe**: Tests use unique database files and ports, so they can run in parallel

## Troubleshooting

### Server Not Starting
If Flask server fails to start:
1. Check port 5000 is not in use: `lsof -i :5000`
2. Check Python path: `echo $PYTHONPATH`
3. Check app module: `python -c "from app.web.dashboard import create_app; create_app()"`

### Database Issues
- Temporary databases are cleaned up after each test
- If test fails, check `/tmp/` for leftover database files
- Database schema is automatically created by fixtures

### Playwright Issues
- Ensure browsers are installed: `python -m playwright install`
- Check for stale processes: `ps aux | grep playwright`
- Run with `--debug` flag for detailed logging

### Timeout Issues
- Default timeout is 30 seconds per test (configurable in playwright.config.js)
- For slow systems, increase timeout in conftest.py
- Use `--headed` mode to observe what's happening

## CI/CD Integration

The tests are configured for GitHub Actions:
- Single worker in CI to avoid port conflicts
- 2 workers locally for faster execution
- Retries enabled in CI
- JUnit XML report for GitHub integration

Example GitHub Actions workflow:
```yaml
- name: Run E2E Tests
  run: pytest tests/e2e/playwright/ -v --junit-xml=test-results.xml
```

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Add performance benchmarking
- [ ] Add accessibility testing
- [ ] Expand to more complex workflows
- [ ] Add API testing alongside UI testing
- [ ] Implement test data seeding utilities
