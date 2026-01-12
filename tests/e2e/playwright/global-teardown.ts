/**
 * Global Teardown for Playwright Tests
 *
 * Runs once after all tests to:
 * - Clean up resources
 * - Close connections
 * - Generate reports
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting global teardown for Playwright E2E tests...');

  // Optional: Perform any global cleanup here
  // Flask app cleanup is handled by the test runner

  console.log('✓ Global teardown completed');
}

export default globalTeardown;
