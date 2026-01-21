# ChirpSyncer E2E Test Plan

Comprehensive end-to-end test plan for live environment testing using Playwright.

## Environment Requirements

- **Backend**: Flask API running on `http://localhost:5000`
- **Frontend**: Next.js running on `http://localhost:3000`
- **Database**: SQLite with seeded test data
- **Redis**: Running for Celery task queue
- **Celery Worker**: Running for background jobs

### Start Environment
```bash
make dev      # Start all services
make seed     # Create test data
```

### Test Credentials
| Username | Password | Role | Use Case |
|----------|----------|------|----------|
| admin | AdminPass123! | Admin | Admin features, full access |
| testuser | TestPass123! | User | Standard user flows |
| alice | AlicePass123! | User | Multi-user scenarios |
| bob | BobPass123! | User | Workspace sharing tests |

---

## Test Suites

### 1. Authentication Suite

#### 1.1 Login Flow
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AUTH-001 | Valid login | Navigate to /login, enter admin/AdminPass123!, click Sign In | Redirect to /dashboard, user info in sidebar |
| AUTH-002 | Invalid password | Enter admin/wrongpassword, click Sign In | Error message "Invalid username or password" |
| AUTH-003 | Invalid username | Enter nonexistent/password, click Sign In | Error message "Invalid username or password" |
| AUTH-004 | Empty fields | Click Sign In with empty fields | Validation error |
| AUTH-005 | Session persistence | Login, refresh page | Stay logged in |
| AUTH-006 | JWT token storage | Login, check localStorage | Token stored correctly |

#### 1.2 Registration Flow
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AUTH-010 | Valid registration | Navigate to /register, fill valid data, submit | Account created, redirect to dashboard |
| AUTH-011 | Duplicate username | Register with existing username | Error "Username already exists" |
| AUTH-012 | Invalid email | Register with invalid email format | Validation error |
| AUTH-013 | Weak password | Register with password < 8 chars | Validation error |
| AUTH-014 | Password mismatch | Confirm password doesn't match | Validation error |

#### 1.3 Logout Flow
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| AUTH-020 | Logout | Click Sign Out button | Redirect to /login |
| AUTH-021 | Protected route after logout | Logout, navigate to /dashboard | Redirect to /login |
| AUTH-022 | Token cleared | Logout, check localStorage | Token removed |

---

### 2. Dashboard Suite

#### 2.1 Main Dashboard
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| DASH-001 | Dashboard loads | Login, navigate to /dashboard | Stats cards visible, no errors |
| DASH-002 | Stats accuracy | Check stats cards | Match database values |
| DASH-003 | Empty state | New user with no data | "No recent activity" message with CTA |
| DASH-004 | Navigation menu | Click each menu item | Navigate to correct page |
| DASH-005 | User info display | Check sidebar | Username and avatar shown |
| DASH-006 | Admin menu | Login as admin | "User Management" link visible |
| DASH-007 | Non-admin menu | Login as testuser | "User Management" link hidden |

---

### 3. Credentials Suite

#### 3.1 List Credentials
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CRED-001 | View credentials | Navigate to /dashboard/credentials | List of credentials displayed |
| CRED-002 | Platform badges | Check credential cards | Bluesky/Twitter badges with correct colors |
| CRED-003 | Credential type | Check type display | "API" or "Scraping" capitalized |
| CRED-004 | Status badge | Check active status | Green "Active" badge |
| CRED-005 | Empty state | User with no credentials | Empty state with "Add Credential" CTA |

#### 3.2 Add Credential
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CRED-010 | Add Twitter scraping | Click Add, select Twitter/Scraping, enter creds | Credential added to list |
| CRED-011 | Add Bluesky API | Click Add, select Bluesky/API, enter creds | Credential added to list |
| CRED-012 | Missing fields | Submit with empty fields | Validation error |
| CRED-013 | Modal close | Click Cancel or X | Modal closes, no changes |

#### 3.3 Test Credential
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CRED-020 | Test valid credential | Click Test button | Success message |
| CRED-021 | Test invalid credential | Test with wrong password | Error message |
| CRED-022 | Loading state | Click Test | Spinner shown during test |

#### 3.4 Delete Credential
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CRED-030 | Delete credential | Click delete, confirm | Credential removed from list |
| CRED-031 | Cancel delete | Click delete, cancel | Credential remains |

---

### 4. Sync Suite

#### 4.1 Sync Dashboard
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SYNC-001 | Page loads | Navigate to /dashboard/sync | Stats and sync buttons visible |
| SYNC-002 | Stats display | Check Total Synced, Pending, Last Sync | Correct values |
| SYNC-003 | Direction cards | Check T→B and B→T cards | Both directions shown |
| SYNC-004 | Connection status | Check connection indicator | Shows connected/error status |

#### 4.2 Start Sync
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SYNC-010 | Start Twitter→Bluesky | Click "Sync Twitter → Bluesky" | Job created, progress shown |
| SYNC-011 | Start Bluesky→Twitter | Click "Sync Bluesky → Twitter" | Job created, progress shown |
| SYNC-012 | Start bidirectional | Click "Sync Now" | Both directions synced |
| SYNC-013 | Sync without credentials | Remove credentials, try sync | Error message |

#### 4.3 Sync History
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SYNC-020 | View history | Scroll to Recent Sync History | List of past syncs |
| SYNC-021 | Empty history | New user | "No sync history yet" message |
| SYNC-022 | Pagination | Many sync jobs | Pagination controls work |

---

### 5. Search Suite

#### 5.1 Basic Search
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SRCH-001 | Search by keyword | Enter "test" in search | Matching posts displayed |
| SRCH-002 | Empty search | Search with no results | "No results found" message |
| SRCH-003 | Search loading | Submit search | Loading indicator shown |
| SRCH-004 | Clear search | Clear search input | Results cleared |

#### 5.2 Filters
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SRCH-010 | Platform filter | Select "Twitter" | Only Twitter posts shown |
| SRCH-011 | Date range filter | Set date range | Posts within range shown |
| SRCH-012 | Hashtag filter | Enter hashtag | Posts with hashtag shown |
| SRCH-013 | Min likes filter | Set min_likes=10 | Posts with 10+ likes shown |
| SRCH-014 | Combined filters | Multiple filters | Intersection of results |
| SRCH-015 | Clear filters | Click clear | All filters reset |

---

### 6. Analytics Suite

#### 6.1 Overview
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ANLY-001 | Page loads | Navigate to /dashboard/analytics | Stats cards and charts visible |
| ANLY-002 | Engagement rate | Check engagement rate card | Formatted to 2 decimals (e.g., 4.79%) |
| ANLY-003 | Impressions | Check impressions card | Formatted with K/M suffix |
| ANLY-004 | Time period toggle | Click 24h/7d/30d/90d | Data updates for period |

#### 6.2 Top Posts
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ANLY-010 | Top posts list | Scroll to Top Performing Posts | Posts with engagement metrics |
| ANLY-011 | Post content | Check post display | Content preview shown |
| ANLY-012 | Engagement icons | Check likes/comments | Icons with counts |

#### 6.3 Export
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ANLY-020 | Export CSV | Click Export button | CSV file downloaded |
| ANLY-021 | Export data accuracy | Open CSV | Data matches dashboard |

---

### 7. Scheduler Suite

#### 7.1 View Scheduled Posts
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SCHD-001 | Page loads | Navigate to /dashboard/scheduler | Scheduled posts and optimal times |
| SCHD-002 | Optimal times | Check optimal times section | Times with confidence scores |
| SCHD-003 | Empty state | No scheduled posts | "No scheduled posts" message |

#### 7.2 Create Scheduled Post
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SCHD-010 | Schedule post | Click Schedule Post, fill form, submit | Post added to list |
| SCHD-011 | Past date validation | Select past date | Validation error |
| SCHD-012 | Empty content | Submit without content | Validation error |
| SCHD-013 | Platform selection | Select Twitter/Bluesky | Platform shown in list |

#### 7.3 Manage Scheduled Posts
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SCHD-020 | Edit post | Click edit, modify, save | Changes saved |
| SCHD-021 | Delete post | Click delete, confirm | Post removed |
| SCHD-022 | Cancel post | Click cancel | Status changed to cancelled |

---

### 8. Feed Lab Suite

#### 8.1 Rules Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FEED-001 | Page loads | Navigate to /dashboard/feed-lab | Rules list and preview |
| FEED-002 | View rules | Check Your Rules section | Existing rules displayed |
| FEED-003 | Toggle rule | Click enable/disable switch | Rule state changes |

#### 8.2 Create Rule
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FEED-010 | Create boost rule | Fill form, select Boost, add condition | Rule created |
| FEED-011 | Create demote rule | Fill form, select Demote | Rule created |
| FEED-012 | Create filter rule | Fill form, select Filter | Rule created |
| FEED-013 | Add condition | Click Add Condition | Condition fields appear |
| FEED-014 | Weight slider | Adjust weight | Value updates |

#### 8.3 Preview
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| FEED-020 | Preview posts | Check Preview section | Posts with scores |
| FEED-021 | Explain scoring | Click "Why am I seeing this?" | Explanation shown |
| FEED-022 | Rule application | Enable rule, check preview | Scores updated |

---

### 9. Cleanup Suite

#### 9.1 Cleanup Rules
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CLNP-001 | Page loads | Navigate to /dashboard/cleanup | Cleanup interface visible |
| CLNP-002 | Create rule | Create cleanup rule | Rule saved |
| CLNP-003 | Preview cleanup | Click preview/dry run | Shows posts to be deleted |

#### 9.2 Execute Cleanup
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CLNP-010 | Execute cleanup | Confirm and execute | Posts deleted, count shown |
| CLNP-011 | Cleanup history | Check history | Past cleanups listed |

---

### 10. Connectors Suite

#### 10.1 Platform Connectors
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CONN-001 | Page loads | Navigate to /dashboard/connectors | Platform cards visible |
| CONN-002 | Twitter card | Check Twitter connector | Features and limits shown |
| CONN-003 | Bluesky card | Check Bluesky connector | Features and limits shown |
| CONN-004 | Mastodon card | Check Mastodon connector | Connect button available |
| CONN-005 | Coming soon | Check Instagram | "Coming Soon" badge |

#### 10.2 Sync Configuration
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| CONN-010 | View config | Check Sync Configuration section | Platform configs shown |
| CONN-011 | Change direction | Click direction buttons | Direction updated |
| CONN-012 | Advanced settings | Click Advanced Settings | Settings panel expands |
| CONN-013 | Enable/disable | Click enable/disable | Sync state changes |

---

### 11. Workspaces Suite

#### 11.1 Workspace Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| WORK-001 | Page loads | Navigate to /dashboard/workspaces | Workspaces list visible |
| WORK-002 | Create workspace | Click Create, fill form | Workspace created |
| WORK-003 | View members | Click workspace | Members list shown |

#### 11.2 Member Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| WORK-010 | Invite member | Enter email, click invite | Invitation sent |
| WORK-011 | Change role | Change member role | Role updated |
| WORK-012 | Remove member | Click remove | Member removed |

---

### 12. Admin Suite (Admin Only)

#### 12.1 User Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ADMN-001 | Page loads | Navigate to /dashboard/admin/users | User table visible |
| ADMN-002 | Search users | Enter search term | Filtered results |
| ADMN-003 | View user details | Click user row | User details shown |
| ADMN-004 | Deactivate user | Click deactivate | User status changes |
| ADMN-005 | Make admin | Click make admin | User becomes admin |
| ADMN-006 | Delete user | Click delete, confirm | User removed |

#### 12.2 Access Control
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ADMN-010 | Non-admin access | Login as testuser, go to /dashboard/admin/users | Access denied or redirect |

---

### 13. Settings Suite

#### 13.1 Profile Settings
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| SETT-001 | Page loads | Navigate to /dashboard/settings | Settings form visible |
| SETT-002 | Update email | Change email, save | Email updated |
| SETT-003 | Change password | Enter current/new password | Password changed |
| SETT-004 | Wrong current password | Enter wrong current password | Error message |

---

### 14. Export Suite

#### 14.1 Data Export
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| EXPT-001 | Page loads | Navigate to /dashboard/export | Export options visible |
| EXPT-002 | Export posts | Select posts, click export | CSV downloaded |
| EXPT-003 | Export analytics | Select analytics, click export | CSV downloaded |
| EXPT-004 | Date range | Set date range, export | Filtered data exported |

---

### 15. Bookmarks Suite

#### 15.1 Bookmark Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| BOOK-001 | Page loads | Navigate to /dashboard/bookmarks | Bookmarks list visible |
| BOOK-002 | Add bookmark | Bookmark a post | Post added to bookmarks |
| BOOK-003 | Remove bookmark | Click remove | Bookmark removed |
| BOOK-004 | Empty state | No bookmarks | Empty state message |

---

### 16. Webhooks Suite

#### 16.1 Webhook Management
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| HOOK-001 | Page loads | Navigate to /dashboard/webhooks | Webhooks list visible |
| HOOK-002 | Create webhook | Fill URL, select events, save | Webhook created |
| HOOK-003 | Edit webhook | Click edit, modify, save | Changes saved |
| HOOK-004 | Delete webhook | Click delete, confirm | Webhook removed |

#### 16.2 Webhook Testing
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| HOOK-010 | Test webhook | Click test | Test delivery sent |
| HOOK-011 | View deliveries | Click view deliveries | Delivery history shown |

---

### 17. Error Handling Suite

#### 17.1 API Errors
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ERR-001 | 401 Unauthorized | Access API without token | Redirect to login |
| ERR-002 | 403 Forbidden | Access admin as non-admin | Access denied message |
| ERR-003 | 404 Not Found | Navigate to /nonexistent | 404 page shown |
| ERR-004 | 500 Server Error | Trigger server error | Error message shown |

#### 17.2 Network Errors
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| ERR-010 | Offline mode | Disable network, try action | Offline indicator |
| ERR-011 | Slow network | Throttle to slow 3G | Loading states visible |

---

### 18. Responsive Design Suite

#### 18.1 Mobile Viewport (375px)
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RESP-001 | Login page | View at 375px | Form fits, no overflow |
| RESP-002 | Dashboard | View at 375px | Cards stack vertically |
| RESP-003 | Navigation | View at 375px | Hamburger menu works |
| RESP-004 | Tables | View at 375px | Horizontal scroll or responsive |

#### 18.2 Tablet Viewport (768px)
| Test ID | Test Case | Steps | Expected Result |
|---------|-----------|-------|-----------------|
| RESP-010 | Dashboard | View at 768px | 2-column layout |
| RESP-011 | Sidebar | View at 768px | Collapsible or visible |

---

## Test Execution

### Prerequisites Checklist
- [ ] Docker Desktop running
- [ ] `make dev` executed successfully
- [ ] `make seed` executed (fresh test data)
- [ ] All containers healthy (`docker ps`)
- [ ] Frontend accessible at http://localhost:3000
- [ ] API accessible at http://localhost:5000/health

### Execution Order
1. Authentication Suite (establishes session)
2. Dashboard Suite (verifies basic navigation)
3. Credentials Suite (required for sync tests)
4. Sync Suite (core functionality)
5. Search Suite
6. Analytics Suite
7. Scheduler Suite
8. Feed Lab Suite
9. Cleanup Suite
10. Connectors Suite
11. Workspaces Suite
12. Admin Suite
13. Settings Suite
14. Export Suite
15. Bookmarks Suite
16. Webhooks Suite
17. Error Handling Suite
18. Responsive Design Suite

### Test Data Reset
```bash
make db-reset   # Clear database
make seed       # Recreate test data
```

---

## Playwright Test Structure

```
tests/
  e2e/
    auth.spec.ts
    dashboard.spec.ts
    credentials.spec.ts
    sync.spec.ts
    search.spec.ts
    analytics.spec.ts
    scheduler.spec.ts
    feed-lab.spec.ts
    cleanup.spec.ts
    connectors.spec.ts
    workspaces.spec.ts
    admin.spec.ts
    settings.spec.ts
    export.spec.ts
    bookmarks.spec.ts
    webhooks.spec.ts
    errors.spec.ts
    responsive.spec.ts
    fixtures/
      auth.ts       # Login helpers
      api.ts        # API helpers
      data.ts       # Test data
```

### Example Test (auth.spec.ts)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('AUTH-001: Valid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'AdminPass123!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=admin')).toBeVisible();
  });

  test('AUTH-002: Invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
```

---

## Defect Tracking

| Test ID | Status | Defect | Severity | Notes |
|---------|--------|--------|----------|-------|
| | | | | |

### Severity Levels
- **P0 - Critical**: Blocks core functionality, no workaround
- **P1 - High**: Major feature broken, workaround exists
- **P2 - Medium**: Feature partially working, inconvenient
- **P3 - Low**: Minor issue, cosmetic

---

## Sign-off

| Suite | Tester | Date | Pass/Fail | Notes |
|-------|--------|------|-----------|-------|
| Authentication | | | | |
| Dashboard | | | | |
| Credentials | | | | |
| Sync | | | | |
| Search | | | | |
| Analytics | | | | |
| Scheduler | | | | |
| Feed Lab | | | | |
| Cleanup | | | | |
| Connectors | | | | |
| Workspaces | | | | |
| Admin | | | | |
| Settings | | | | |
| Export | | | | |
| Bookmarks | | | | |
| Webhooks | | | | |
| Error Handling | | | | |
| Responsive | | | | |
