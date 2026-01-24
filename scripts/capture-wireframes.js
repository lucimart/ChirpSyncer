/**
 * ChirpSyncer Wireframe Capture Script
 *
 * Captures screenshots of all dashboard pages for Figma wireframing.
 * Run with: npx playwright test scripts/capture-wireframes.js --headed
 * Or: node scripts/capture-wireframes.js (requires playwright installed)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'wireframes');

// Test credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'AdminPass123!';

// Pages to capture (with auth)
const DASHBOARD_PAGES = [
  { name: '03-dashboard', path: '/dashboard', description: 'Main Dashboard' },
  { name: '04-dashboard-sync', path: '/dashboard/sync', description: 'Sync Status' },
  { name: '05-dashboard-connectors', path: '/dashboard/connectors', description: 'Platform Connectors' },
  { name: '06-dashboard-credentials', path: '/dashboard/credentials', description: 'Credentials Management' },
  { name: '07-dashboard-scheduler', path: '/dashboard/scheduler', description: 'Post Scheduler' },
  { name: '08-dashboard-search', path: '/dashboard/search', description: 'Search Posts' },
  { name: '09-dashboard-analytics', path: '/dashboard/analytics', description: 'Analytics' },
  { name: '10-dashboard-algorithm', path: '/dashboard/algorithm', description: 'Algorithm Dashboard' },
  { name: '11-dashboard-feed-lab', path: '/dashboard/feed-lab', description: 'Feed Lab' },
  { name: '12-dashboard-workspaces', path: '/dashboard/workspaces', description: 'Workspaces' },
  { name: '13-dashboard-webhooks', path: '/dashboard/webhooks', description: 'Webhooks' },
  { name: '14-dashboard-settings', path: '/dashboard/settings', description: 'Settings' },
];

// Public pages (no auth needed)
const PUBLIC_PAGES = [
  { name: '01-login', path: '/login', description: 'Login Page' },
  { name: '02-register', path: '/register', description: 'Register Page' },
];

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function captureScreenshot(page, name, description) {
  const filename = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`  [OK] ${description} -> ${name}.png`);
  return filename;
}

async function login(page) {
  console.log('\n  Logging in as admin...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[placeholder*="username" i], input[name="username"]', ADMIN_USER);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"], button:has-text("Sign In")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {
    console.log('  [WARN] Login redirect timeout - may need manual verification');
  });

  await page.waitForLoadState('networkidle');
  console.log('  [OK] Logged in successfully\n');
}

async function main() {
  console.log('\n========================================');
  console.log('ChirpSyncer Wireframe Capture');
  console.log('========================================\n');

  await ensureOutputDir();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina quality
  });

  const page = await context.newPage();

  try {
    // Capture public pages first
    console.log('Capturing Public Pages:');
    console.log('------------------------');

    for (const pageInfo of PUBLIC_PAGES) {
      await page.goto(`${BASE_URL}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500); // Allow animations to settle
      await captureScreenshot(page, pageInfo.name, pageInfo.description);
    }

    // Login and capture dashboard pages
    console.log('\nCapturing Dashboard Pages:');
    console.log('---------------------------');

    await login(page);

    for (const pageInfo of DASHBOARD_PAGES) {
      try {
        await page.goto(`${BASE_URL}${pageInfo.path}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Allow data to load
        await captureScreenshot(page, pageInfo.name, pageInfo.description);
      } catch (err) {
        console.log(`  [ERR] ${pageInfo.description} - ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
