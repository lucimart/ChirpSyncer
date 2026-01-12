# Running Playwright E2E Tests

This guide explains how to set up and run the Playwright end-to-end tests for ChirpSyncer.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements-dev.txt
python -m playwright install chromium firefox
```

### 2. Run All E2E Tests

```bash
pytest tests/e2e/playwright/ -v
```

### 3. View Test Reports

```bash
# HTML Report
open playwright-report/index.html

# Or using Playwright's report viewer
npx playwright show-report playwright-report
```

## Detailed Setup

### Prerequisites

- Python 3.11+
- pip and virtualenv (optional but recommended)
- Linux, macOS, or Windows

### Step 1: Install Python Dependencies

The following packages are required:
- playwright (1.40.0+)
- pytest-playwright (0.4.3+)
- pytest (9.0.2+)
- bcrypt (for password hashing in test fixtures)

Install via requirements-dev.txt:

```bash
pip install -r requirements-dev.txt
```

Or manually:

```bash
pip install playwright==1.40.0 pytest-playwright==0.4.3
```

### Step 2: Install Playwright Browsers

```bash
python -m playwright install chromium firefox
```

This downloads the browser binaries needed for testing.

### Step 3: Verify Installation

```bash
# Check Playwright is installed
python -c "import playwright; print(playwright.__version__)"

# Check Chromium is available
python -m playwright install-deps chromium
```

## Running Tests

### Basic Command

```bash
pytest tests/e2e/playwright/ -v
```

Options:
- `-v` or `--verbose`: Show detailed test output
- `-s`: Show print statements
- `--tb=short`: Short traceback format
- `--tb=no`: No traceback (just pass/fail)

### Run Specific Test File

```bash
# Authentication tests
pytest tests/e2e/playwright/test_auth_flows.py -v

# Credential management tests
pytest tests/e2e/playwright/test_credential_management.py -v
```

### Run Specific Test

```bash
pytest tests/e2e/playwright/test_auth_flows.py::TestAuthenticationFlows::test_login_logout_flow -v
```

### Run Tests with Specific Browser

```bash
# Chromium only
pytest tests/e2e/playwright/ -v --browser chromium

# Firefox only
pytest tests/e2e/playwright/ -v --browser firefox

# Chromium and Firefox
pytest tests/e2e/playwright/ -v
```

### Run in Headed Mode (See Browser)

By default, tests run headless (invisible browser). To see the browser:

```bash
pytest tests/e2e/playwright/ -v --headed
```

### Run in Debug Mode

Step through tests with the Playwright Inspector:

```bash
pytest tests/e2e/playwright/ -v --debug
```

The Playwright Inspector will pause execution at each step, allowing you to:
- Step through code line by line
- Inspect element selectors
- See what's happening in the browser
- Execute commands in the console

### Run with Slowing Down

Slow down test execution to observe what's happening:

```bash
pytest tests/e2e/playwright/ -v --headed --slowmo 1000
```

The `1000` is milliseconds to pause between actions.

### Parallel Execution

Run tests in parallel (useful for CI/CD):

```bash
pip install pytest-xdist
pytest tests/e2e/playwright/ -v -n auto
```

The `-n auto` flag uses all available CPU cores.

### Run with Specific Markers

Our tests use the `e2e` marker:

```bash
# Only E2E tests
pytest -m e2e -v

# All tests except E2E
pytest -m "not e2e" -v
```

## Test Reports

### HTML Report

After tests complete, view the interactive HTML report:

```bash
# Method 1: Open directly
open playwright-report/index.html

# Method 2: Use Playwright's viewer
npx playwright show-report playwright-report

# Method 3: Python HTTP server
cd playwright-report && python -m http.server 8000
# Then open http://localhost:8000
```

The HTML report includes:
- Test status (pass/fail)
- Execution time
- Screenshots of failures
- Video recordings of failures (if enabled)
- Trace recordings for detailed debugging

### XML Report

Generated at `test-results/playwright-results.json` and `test-results/playwright-junit.xml`

These are useful for CI/CD integration:

```bash
# View JSON results
cat test-results/playwright-results.json | python -m json.tool

# Parse JUnit XML
python -c "import xml.etree.ElementTree as ET; tree = ET.parse('test-results/playwright-junit.xml'); print(ET.tostring(tree.getroot()))"
```

## Environment Variables

You can configure tests via environment variables:

```bash
# Flask app configuration
export FLASK_ENV=test
export DB_PATH=/tmp/test.db
export MASTER_KEY=$(python -c "import os; print(os.urandom(32).hex())")

# Base URL (default: http://localhost:5000)
export BASE_URL=http://localhost:5000

# Headless mode (default: true)
export HEADLESS=false

# Run tests
pytest tests/e2e/playwright/ -v
```

## Troubleshooting

### Port Already in Use

If port 5000 is already in use:

```bash
# Find what's using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or configure a different port in conftest.py
```

### Playwright Not Found

```bash
# Reinstall Playwright
pip uninstall playwright -y
pip install playwright==1.40.0
python -m playwright install chromium firefox
```

### Browser Download Failed

```bash
# Try with verbose output
python -m playwright install -v

# Set proxy if behind corporate firewall
HTTPS_PROXY=http://proxy:8080 python -m playwright install

# Or download manually
python -m playwright install-deps
```

### Tests Timing Out

Increase timeout in conftest.py:

```python
# Default is 30 seconds
pytest.fixture(scope="function", timeout=60)
```

Or pass on command line:

```bash
pytest tests/e2e/playwright/ --timeout=60 -v
```

### Database Locked

SQLite database locking errors:

```bash
# Remove stale test databases
rm -f /tmp/tmp*.db

# Ensure previous tests are fully cleaned up
ps aux | grep python | grep playwright
kill -9 <PID>
```

### Flask Server Not Starting

Debug the Flask app:

```bash
# Test if Flask app works
python -c "from app.web.dashboard import create_app; app = create_app(); print('App created successfully')"

# Run Flask manually
export PYTHONPATH=$(pwd)
python -m flask --app app.web.dashboard run --port 5000
```

### Selector Not Found

Some tests may fail if HTML selectors change. Update selectors in page objects:

```python
# In tests/e2e/playwright/pages/login_page.py
LOGIN_BUTTON = 'button[type="submit"]'  # Update this if HTML changes
```

## CI/CD Integration

Tests run automatically on:
- Push to main or develop branches
- Pull requests to main or develop

Configuration in `.github/workflows/e2e-tests.yml`:

```bash
# Manual trigger
gh workflow run e2e-tests.yml

# View workflow runs
gh run list --workflow=e2e-tests.yml
```

## Performance Tips

1. **Parallel Execution**: Use pytest-xdist for faster execution
2. **Selective Running**: Run only changed tests during development
3. **Headed Mode**: Use `--headed` only when debugging, not for routine testing
4. **Video Recording**: Disabled by default (only on failure), saves time
5. **Browser Reuse**: Reuse browser context between tests when possible

## Best Practices

1. **Always use page objects**: Don't use raw Playwright selectors in tests
2. **Wait for navigation**: Tests auto-wait with `wait_for_load_state()`
3. **Verify both UI and database**: Check that state changes persist to DB
4. **Use descriptive names**: Test names should clearly describe what they test
5. **Keep tests isolated**: Each test should work independently
6. **Clean up after yourself**: Fixtures auto-cleanup, but verify in logs

## Example Test Run

```bash
# Run auth tests in headed mode with slowdown
pytest tests/e2e/playwright/test_auth_flows.py::TestAuthenticationFlows::test_login_logout_flow -v --headed --slowmo 1000 -s

# Explanation:
# -v: verbose output
# --headed: see the browser
# --slowmo 1000: pause 1 second between actions
# -s: show print statements
```

## Next Steps

1. Review test coverage in `tests/e2e/playwright/README.md`
2. Explore page objects in `tests/e2e/playwright/pages/`
3. Read test implementations for examples
4. Add new tests following the existing patterns
5. Report bugs found during E2E testing

## Additional Resources

- Playwright Documentation: https://playwright.dev/python/
- pytest Documentation: https://docs.pytest.org/
- Page Object Model Pattern: https://playwright.dev/python/docs/pom
