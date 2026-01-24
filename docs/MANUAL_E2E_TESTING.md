# Manual E2E Testing Checklist

This document provides a comprehensive checklist for manually testing ChirpSyncer's features to identify UX gaps and issues.

## Prerequisites

1. Start the development environment:
   ```bash
   # Linux/macOS
   ./scripts/dev-start.sh --seed
   
   # Windows PowerShell
   .\scripts\dev-start.ps1 -Seed
   ```

2. Access the application:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:5000

3. Test credentials (created by seed script):
   | Username | Password | Role |
   |----------|----------|------|
   | admin | AdminPass123! | Admin |
   | testuser | TestPass123! | User |
   | alice | AlicePass123! | User |
   | bob | BobPass123! | User |

---

## 1. Authentication Flows

### 1.1 Login
- [ ] Navigate to `/login`
- [ ] Enter valid credentials → Should redirect to dashboard
- [ ] Enter invalid credentials → Should show error message
- [ ] Check "Remember me" functionality (if exists)
- [ ] Verify session persists after page refresh

### 1.2 Registration
- [ ] Navigate to `/register`
- [ ] Register with valid data → Should create account
- [ ] Try duplicate username → Should show error
- [ ] Try weak password → Should show validation error
- [ ] Verify email format validation

### 1.3 Logout
- [ ] Click logout → Should redirect to login
- [ ] Try accessing protected route after logout → Should redirect to login
- [ ] Verify session is cleared (check localStorage/cookies)

---

## 2. Dashboard

### 2.1 Main Dashboard
- [ ] Dashboard loads without errors
- [ ] Stats cards show correct data
- [ ] Recent activity displays properly
- [ ] Navigation menu works correctly
- [ ] Responsive design on mobile viewport

### 2.2 Real-time Updates
- [ ] WebSocket connection indicator shows status
- [ ] Toast notifications appear for events
- [ ] Data updates without page refresh

---

## 3. Sync Features

### 3.1 Sync Page (`/dashboard/sync`)
- [ ] Page loads with sync history
- [ ] "Start Sync" button is visible
- [ ] Sync direction selector works
- [ ] Sync history table displays correctly

### 3.2 Start Sync
- [ ] Click "Start Sync" → Job should be created
- [ ] Progress indicator shows during sync
- [ ] Completion notification appears
- [ ] Sync history updates after completion

### 3.3 Sync Status
- [ ] View individual sync job status
- [ ] Error messages display correctly for failed syncs
- [ ] Retry functionality works (if available)

---

## 4. Credentials Management

### 4.1 Credentials Page (`/dashboard/credentials`)
- [ ] List of credentials displays
- [ ] Platform icons/badges show correctly
- [ ] "Add Credential" button works

### 4.2 Add Credentials
- [ ] Add Twitter scraping credentials
- [ ] Add Twitter API credentials
- [ ] Add Bluesky credentials
- [ ] Validation errors show for invalid input
- [ ] Success message after adding

### 4.3 Edit/Delete Credentials
- [ ] Edit existing credentials
- [ ] Delete credentials with confirmation
- [ ] Test credential connection (if available)

---

## 5. Search (`/dashboard/search`)

### 5.1 Basic Search
- [ ] Search input accepts text
- [ ] Results display correctly
- [ ] Empty state shows when no results
- [ ] Loading indicator during search

### 5.2 Filters
- [ ] Date range filter works
- [ ] Platform filter works
- [ ] Hashtag filter works
- [ ] Engagement filters (min likes, min retweets)
- [ ] Media filter (has_media)
- [ ] Filters combine correctly

### 5.3 Search Results
- [ ] Post content displays correctly
- [ ] Engagement metrics show
- [ ] Archived indicator shows (if applicable)
- [ ] Click on result shows detail (if available)

---

## 6. Analytics (`/dashboard/analytics`)

### 6.1 Overview
- [ ] Analytics dashboard loads
- [ ] Daily/Weekly/Monthly stats display
- [ ] Charts render correctly
- [ ] Top tweets section shows

### 6.2 Export
- [ ] Export to CSV works
- [ ] Date range selection for export
- [ ] Downloaded file contains correct data

---

## 7. Scheduler (`/dashboard/scheduler`)

### 7.1 View Scheduled Posts
- [ ] List of scheduled posts displays
- [ ] Status indicators (pending, posted, failed)
- [ ] Scheduled time shows correctly

### 7.2 Create Scheduled Post
- [ ] Create new scheduled post
- [ ] Select platforms (Twitter, Bluesky)
- [ ] Date/time picker works
- [ ] Validation for past dates

### 7.3 Edit/Delete
- [ ] Edit scheduled post
- [ ] Delete with confirmation
- [ ] Cancel scheduled post

---

## 8. Feed Lab (`/dashboard/feed-lab`)

### 8.1 Feed Rules
- [ ] List of rules displays
- [ ] Enable/disable toggle works
- [ ] Rule conditions show correctly

### 8.2 Create Rule
- [ ] Create new feed rule
- [ ] Add conditions (field, operator, value)
- [ ] Select action (boost, demote, hide)
- [ ] Save rule successfully

### 8.3 Preview Feed
- [ ] Preview shows posts with rules applied
- [ ] Explain why post was boosted/demoted
- [ ] Score adjustments visible

---

## 9. Cleanup (`/dashboard/cleanup`)

### 9.1 Cleanup Rules
- [ ] List cleanup rules
- [ ] Create new cleanup rule
- [ ] Preview cleanup (dry run)
- [ ] Execute cleanup with confirmation

### 9.2 Cleanup History
- [ ] View past cleanup operations
- [ ] See deleted posts count
- [ ] Error handling for failed cleanups

---

## 10. Webhooks (`/dashboard/webhooks`)

### 10.1 Webhook Management
- [ ] List webhooks
- [ ] Create new webhook
- [ ] Edit webhook URL/events
- [ ] Delete webhook

### 10.2 Webhook Testing
- [ ] Test webhook delivery
- [ ] View delivery history
- [ ] See retry attempts for failed deliveries

---

## 11. Connectors (`/dashboard/connectors`)

### 11.1 Platform Connectors
- [ ] List available connectors
- [ ] Show connection status
- [ ] Display platform capabilities
- [ ] Connect/disconnect platforms

---

## 12. Workspaces (`/dashboard/workspaces`)

### 12.1 Workspace Management
- [ ] List workspaces
- [ ] Create new workspace
- [ ] Invite members
- [ ] Manage member roles

### 12.2 Workspace Switching
- [ ] Switch between workspaces
- [ ] Data isolation between workspaces
- [ ] Shared credentials work

---

## 13. Settings (`/dashboard/settings`)

### 13.1 User Settings
- [ ] Update profile information
- [ ] Change password
- [ ] Notification preferences

### 13.2 Sync Settings
- [ ] Configure sync direction
- [ ] Set sync frequency
- [ ] Platform-specific settings

---

## 14. Admin Features (Admin Only)

### 14.1 User Management (`/dashboard/admin/users`)
- [ ] List all users
- [ ] View user details
- [ ] Edit user (activate/deactivate)
- [ ] Delete user

### 14.2 System Health
- [ ] Redis connection status
- [ ] Celery worker status
- [ ] Database health

---

## 15. Error Handling

### 15.1 API Errors
- [ ] 401 Unauthorized → Redirect to login
- [ ] 403 Forbidden → Show access denied
- [ ] 404 Not Found → Show not found page
- [ ] 500 Server Error → Show error message

### 15.2 Network Errors
- [ ] Offline indicator shows
- [ ] Retry mechanism works
- [ ] Graceful degradation

---

## 16. Performance

### 16.1 Page Load
- [ ] Dashboard loads < 3s
- [ ] Search results < 2s
- [ ] No visible layout shifts

### 16.2 Interactions
- [ ] Button clicks respond immediately
- [ ] Forms submit without delay
- [ ] Modals open/close smoothly

---

## UX Gaps Found

Document any UX issues discovered during testing:

| Issue | Page | Severity | Description |
|-------|------|----------|-------------|
| | | | |
| | | | |
| | | | |

### Severity Levels
- **Critical**: Blocks core functionality
- **High**: Major usability issue
- **Medium**: Inconvenient but workaround exists
- **Low**: Minor polish issue

---

## Notes

- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile viewport (responsive design)
- Check console for JavaScript errors
- Monitor network tab for failed requests
- Test with slow network (Chrome DevTools throttling)
