/**
 * Playwright Configuration for End-to-End Testing
 *
 * Configures Playwright for testing a Python Flask application with:
 * - Multiple browser support (Chromium, Firefox)
 * - Screenshots and video recording on failure
 * - Custom timeouts and retry configuration
 * - Local development and CI/CD environments
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Number of test workers (parallel execution)
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,

  // Fail on console errors/warnings
  forbidOnly: !!process.env.CI,

  // Retry configuration
  retries: process.env.CI ? 2 : 0,

  // Test execution timeout
  timeout: 30000, // 30 seconds per test

  // Expect timeout
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL for all requests
    baseURL: process.env.BASE_URL || 'http://localhost:5000',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'retain-on-failure',

    // Trace on failure for debugging
    trace: 'on-first-retry',

    // Other common settings
    acceptDownloads: true,
    javaScriptEnabled: true,
  },

  // Browser configuration
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Web server configuration for running app
  // Skip if USE_EXISTING_SERVER is set (e.g. when testing against Docker)
  webServer: process.env.USE_EXISTING_SERVER ? undefined : {
    command: process.env.CI
      ? 'python app/web/dashboard.py'
      : 'python -m flask --app app.web.dashboard run --port 5000',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
  },

  // Global setup/teardown (optional - only if using pure Playwright test runner)
  // Commented out as we're using pytest + Playwright
  // globalSetup: require.resolve('./tests/e2e/playwright/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/e2e/playwright/global-teardown.ts'),
});
