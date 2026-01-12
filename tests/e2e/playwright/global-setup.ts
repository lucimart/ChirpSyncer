/**
 * Global Setup for Playwright Tests
 *
 * Runs once before all tests to:
 * - Start Flask application
 * - Initialize test database
 * - Perform any pre-test setup
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup for Playwright E2E tests...');

  // Optional: Perform any global setup here
  // For Flask app, we rely on webServer config in playwright.config.js

  // Wait for application to be ready
  const context = await chromium.launchPersistentContext('');
  const page = await context.newPage();

  let retries = 30;
  let appReady = false;

  while (retries > 0) {
    try {
      const response = await page.goto('http://localhost:5000/login', {
        waitUntil: 'networkidle',
        timeout: 5000,
      });

      if (response?.ok() || response?.status() === 200) {
        console.log('✓ Application is ready');
        appReady = true;
        break;
      }
    } catch (e) {
      console.log(`Application not ready yet... (${retries} retries left)`);
      await page.waitForTimeout(1000);
      retries--;
    }
  }

  await context.close();

  if (!appReady) {
    throw new Error('Application failed to start within timeout');
  }

  console.log('✓ Global setup completed');
}

export default globalSetup;
