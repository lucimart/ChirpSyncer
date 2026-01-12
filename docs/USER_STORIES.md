# User Stories - Open Social Hub
> Complete user stories with acceptance criteria

## Story Format

```
US-XXX: [Title]
As a [role], I want [feature] so that [benefit].

Acceptance Criteria:
- [ ] AC1
- [ ] AC2

Sprint: X | Priority: P0/P1/P2 | Status: TODO/IN_PROGRESS/DONE
```

---

## Phase A: Productize Core (Sprint 8-9)

### US-001: Cleanup Real Tweet Fetching
**As a** user with Twitter credentials, **I want** the cleanup engine to fetch my actual tweets **so that** I can preview and delete them.

**Acceptance Criteria:**
- [ ] `_fetch_user_tweets()` returns real tweets via twscrape
- [ ] Tweets include: id, text, created_at, likes, retweets, has_media
- [ ] Rate limiting applied (900 req/15min)
- [ ] Error handling for invalid credentials
- [ ] Retry logic with exponential backoff

**Sprint:** 8 | **Priority:** P0 | **Status:** TODO

---

### US-002: Cleanup Real Tweet Deletion
**As a** user, **I want** the cleanup engine to actually delete my tweets **so that** I can clean my timeline.

**Acceptance Criteria:**
- [ ] `_delete_tweet()` calls real Twitter API
- [ ] Requires step-up auth (danger_token)
- [ ] Deletion logged to audit trail
- [ ] Correlation ID for traceability
- [ ] Dry run mode that doesn't delete

**Sprint:** 8 | **Priority:** P0 | **Status:** TODO

---

### US-003: Cleanup Preview with Real Data
**As a** user, **I want** to preview tweets matching my cleanup rule **so that** I can verify before deletion.

**Acceptance Criteria:**
- [ ] Preview shows up to 50 matching tweets
- [ ] Each tweet shows: content, date, engagement
- [ ] Total count displayed
- [ ] Rule criteria summary shown
- [ ] Preview refreshable

**Sprint:** 8 | **Priority:** P1 | **Status:** TODO

---

### US-004: Search Filter - Has Media
**As a** user, **I want** to filter search results by media presence **so that** I can find tweets with images/videos.

**Acceptance Criteria:**
- [ ] `has_media=true|false` query parameter
- [ ] FTS5 query includes media filter
- [ ] Results correctly filtered
- [ ] UI checkbox for filter

**Sprint:** 9 | **Priority:** P0 | **Status:** TODO

---

### US-005: Search Filter - Engagement
**As a** user, **I want** to filter search by minimum likes/retweets **so that** I can find popular tweets.

**Acceptance Criteria:**
- [ ] `min_likes` query parameter
- [ ] `min_retweets` query parameter
- [ ] Filters combinable with text search
- [ ] UI sliders for thresholds

**Sprint:** 9 | **Priority:** P0 | **Status:** TODO

---

### US-006: Playwright E2E in CI
**As a** developer, **I want** E2E tests running in CI **so that** regressions are caught automatically.

**Acceptance Criteria:**
- [ ] Playwright configured in GitHub Actions
- [ ] Login flow tested
- [ ] Credentials CRUD tested
- [ ] Cleanup preview tested
- [ ] Tests pass on PR merge

**Sprint:** 9 | **Priority:** P0 | **Status:** TODO

---

## Phase B: Next.js Frontend (Sprint 10-13)

### US-010: Next.js Project Setup
**As a** developer, **I want** a Next.js 14+ scaffold **so that** I can build the new dashboard.

**Acceptance Criteria:**
- [ ] Next.js 14+ with App Router
- [ ] TypeScript strict mode
- [ ] styled-components SSR configured
- [ ] ESLint + Prettier configured
- [ ] Builds successfully

**Sprint:** 10 | **Priority:** P0 | **Status:** TODO

---

### US-011: Design System Primitives
**As a** developer, **I want** base UI components **so that** I can build consistent interfaces.

**Acceptance Criteria:**
- [ ] Button (primary, secondary, danger, ghost, outline)
- [ ] Input (text, password, email, search)
- [ ] Card (default, outlined, elevated)
- [ ] Modal (open/close, sizes)
- [ ] All states: default, hover, active, disabled, loading

**Sprint:** 10 | **Priority:** P0 | **Status:** TODO

---

### US-012: Auth Provider & Login Flow
**As a** user, **I want** to log into the Next.js dashboard **so that** I can access my data.

**Acceptance Criteria:**
- [ ] AuthProvider with JWT handling
- [ ] Login page with form validation
- [ ] Error states for invalid credentials
- [ ] Redirect to dashboard on success
- [ ] Protected route middleware

**Sprint:** 10 | **Priority:** P0 | **Status:** TODO

---

### US-013: Credentials List Page
**As a** user, **I want** to view my saved credentials **so that** I can manage platform access.

**Acceptance Criteria:**
- [ ] List all credentials with status badges
- [ ] Platform icon and name
- [ ] Last used timestamp
- [ ] Add new credential button
- [ ] Loading and empty states

**Sprint:** 11 | **Priority:** P0 | **Status:** TODO

---

### US-014: Add Credential Flow
**As a** user, **I want** to add new platform credentials **so that** I can connect accounts.

**Acceptance Criteria:**
- [ ] Modal/drawer for new credential
- [ ] Platform selection (Twitter, Bluesky)
- [ ] Credential type selection
- [ ] Secure password input
- [ ] Test connection button
- [ ] Success/error feedback

**Sprint:** 11 | **Priority:** P0 | **Status:** TODO

---

### US-015: Delete Credential with Step-Up
**As a** user, **I want** to delete credentials with confirmation **so that** accidental deletion is prevented.

**Acceptance Criteria:**
- [ ] DangerConfirm modal
- [ ] User types confirmation phrase
- [ ] Reason required for audit
- [ ] danger_token obtained and used
- [ ] Toast on success/failure

**Sprint:** 11 | **Priority:** P1 | **Status:** TODO

---

### US-016: Sync Dashboard
**As a** user, **I want** to see sync status and history **so that** I know my data is up to date.

**Acceptance Criteria:**
- [ ] Stats cards: today, week, total
- [ ] Last sync info
- [ ] Trigger manual sync button
- [ ] History table with pagination
- [ ] Status badges

**Sprint:** 11 | **Priority:** P1 | **Status:** TODO

---

### US-017: Cleanup Rules Page
**As a** user, **I want** to view and manage cleanup rules **so that** I can automate tweet deletion.

**Acceptance Criteria:**
- [ ] Rules list with enable/disable toggle
- [ ] Rule type badge (age, engagement, pattern)
- [ ] Last run info
- [ ] Add/edit/delete actions
- [ ] Empty state

**Sprint:** 12 | **Priority:** P0 | **Status:** TODO

---

### US-018: Cleanup Rule Creation
**As a** user, **I want** to create cleanup rules **so that** I can define deletion criteria.

**Acceptance Criteria:**
- [ ] Wizard/form for rule creation
- [ ] Rule type selection
- [ ] Dynamic config fields per type
- [ ] Preview button before save
- [ ] Validation feedback

**Sprint:** 12 | **Priority:** P0 | **Status:** TODO

---

### US-019: Cleanup Execution with Preview
**As a** user, **I want** to preview and execute cleanup **so that** I can safely delete tweets.

**Acceptance Criteria:**
- [ ] Preview page with matching tweets
- [ ] DataTable with tweet details
- [ ] Total count prominent
- [ ] Execute button requires step-up
- [ ] Progress feedback during execution

**Sprint:** 12 | **Priority:** P0 | **Status:** TODO

---

### US-020: Search Page
**As a** user, **I want** to search my archived tweets **so that** I can find specific content.

**Acceptance Criteria:**
- [ ] Search input with FTS5
- [ ] Results with highlighting
- [ ] Filters: platform, date range, media, engagement
- [ ] Pagination
- [ ] Export selected

**Sprint:** 13 | **Priority:** P1 | **Status:** TODO

---

### US-021: Analytics Overview
**As a** user, **I want** to see analytics of my social media **so that** I understand my engagement.

**Acceptance Criteria:**
- [ ] Period selector (24h, 7d, 30d, 90d)
- [ ] Stats cards: tweets, engagement
- [ ] Chart: synced vs deleted over time
- [ ] Top tweets by engagement
- [ ] Export data

**Sprint:** 13 | **Priority:** P1 | **Status:** TODO

---

## Phase C: Real-Time & Intelligence (Sprint 14-15)

### US-030: WebSocket Sync Progress
**As a** user, **I want** real-time sync progress **so that** I know when sync completes.

**Acceptance Criteria:**
- [ ] WebSocket connection established
- [ ] Progress updates during sync
- [ ] Items synced counter
- [ ] Completion notification
- [ ] Reconnection handling

**Sprint:** 14 | **Priority:** P1 | **Status:** TODO

---

### US-031: WebSocket Cleanup Progress
**As a** user, **I want** real-time cleanup progress **so that** I see deletions happening.

**Acceptance Criteria:**
- [ ] Deletion count updates live
- [ ] Errors shown immediately
- [ ] Final summary notification
- [ ] Can cancel mid-execution

**Sprint:** 14 | **Priority:** P1 | **Status:** TODO

---

### US-032: Optimal Posting Time Suggestions
**As a** user, **I want** AI-suggested posting times **so that** I maximize engagement.

**Acceptance Criteria:**
- [ ] Historical engagement analysis
- [ ] Top 3 time slots suggested
- [ ] Confidence score shown
- [ ] Based on user's audience
- [ ] Refreshable

**Sprint:** 15 | **Priority:** P2 | **Status:** TODO

---

## Phase D: Multi-Platform (Sprint 16-18)

### US-040: Connector Framework Base
**As a** developer, **I want** a connector framework **so that** adding platforms is standardized.

**Acceptance Criteria:**
- [ ] PlatformConnector abstract base
- [ ] ConnectorRegistry for platform discovery
- [ ] Capabilities model
- [ ] Rate limiter integration
- [ ] Error handling standardized

**Sprint:** 16 | **Priority:** P0 | **Status:** TODO

---

### US-041: Bluesky Connector
**As a** user, **I want** Bluesky integration **so that** I can sync/manage Bluesky posts.

**Acceptance Criteria:**
- [ ] AT Protocol authentication
- [ ] Fetch posts
- [ ] Publish posts
- [ ] Delete posts
- [ ] Metrics retrieval

**Sprint:** 17 | **Priority:** P0 | **Status:** TODO

---

### US-042: Mastodon Connector
**As a** user, **I want** Mastodon integration **so that** I can sync/manage toots.

**Acceptance Criteria:**
- [ ] OAuth2 flow
- [ ] Instance URL configuration
- [ ] Fetch toots
- [ ] Publish toots
- [ ] Delete toots

**Sprint:** 18 | **Priority:** P1 | **Status:** TODO

---

### US-043: Instagram Connector (Read-Only)
**As a** user, **I want** Instagram read access **so that** I can archive my posts.

**Acceptance Criteria:**
- [ ] Graph API authentication
- [ ] Fetch posts (images, captions)
- [ ] Fetch basic metrics
- [ ] Read-only (no publish/delete)

**Sprint:** 18 | **Priority:** P2 | **Status:** TODO

---

### US-044: Multi-Platform Credential Management
**As a** user, **I want** to manage credentials for all platforms **so that** I have unified access.

**Acceptance Criteria:**
- [ ] Platform selection dropdown
- [ ] Platform-specific auth fields
- [ ] Capability badges per credential
- [ ] Test connection for any platform
- [ ] Status sync across platforms

**Sprint:** 18 | **Priority:** P1 | **Status:** TODO

---

## Phase E: Feed Lab & Collaboration (Sprint 19-21)

### US-050: Feed Lab - Rule Creation
**As a** user, **I want** to create feed rules **so that** I control what I see.

**Acceptance Criteria:**
- [ ] Rule builder UI
- [ ] Conditions: author, content, engagement, age
- [ ] Operators: equals, contains, greater than, regex
- [ ] Weight slider (-100 to +100)
- [ ] Enable/disable toggle

**Sprint:** 19 | **Priority:** P1 | **Status:** TODO

---

### US-051: Feed Lab - Post Explainability
**As a** user, **I want** to know why I see a post **so that** I understand my algorithm.

**Acceptance Criteria:**
- [ ] "Why am I seeing this?" button
- [ ] Shows rules that affected score
- [ ] Contribution breakdown
- [ ] Original vs final score

**Sprint:** 20 | **Priority:** P1 | **Status:** TODO

---

### US-052: Team Workspace Creation
**As a** team admin, **I want** to create workspaces **so that** my team can collaborate.

**Acceptance Criteria:**
- [ ] Create workspace with name/description
- [ ] Invite members by email
- [ ] Role assignment (admin, editor, viewer)
- [ ] Workspace switcher in UI

**Sprint:** 21 | **Priority:** P2 | **Status:** TODO

---

### US-053: Shared Credentials
**As a** team member, **I want** shared credentials **so that** we don't duplicate connections.

**Acceptance Criteria:**
- [ ] Credentials scoped to workspace
- [ ] Access based on role
- [ ] Audit log for credential usage
- [ ] Admin can revoke access

**Sprint:** 21 | **Priority:** P2 | **Status:** TODO

---

## Phase F: Decentralized Protocols (Sprint 22-26)

### US-060: ActivityPub Connector
**As a** user, **I want** to connect my Mastodon account **so that** I can manage toots alongside tweets.

**Acceptance Criteria:**
- [ ] OAuth2 flow for any Mastodon instance
- [ ] Fetch toots from timeline
- [ ] Post toots
- [ ] Delete toots
- [ ] Instance discovery via WebFinger

**Sprint:** 22 | **Priority:** P1 | **Status:** TODO

---

### US-061: AT Protocol DID Management
**As a** user, **I want** to manage my Bluesky DID **so that** I own my identity across apps.

**Acceptance Criteria:**
- [ ] DID resolution (plc, web)
- [ ] PDS discovery
- [ ] Account migration support
- [ ] Key rotation

**Sprint:** 23 | **Priority:** P1 | **Status:** TODO

---

### US-062: Custom Feed Generator
**As a** user, **I want** my Feed Lab rules to publish as a Bluesky feed **so that** others can subscribe.

**Acceptance Criteria:**
- [ ] Feed generator endpoint
- [ ] Register feed with Bluesky
- [ ] Apply Feed Lab rules to generate feed
- [ ] Feed discovery

**Sprint:** 23 | **Priority:** P2 | **Status:** TODO

---

### US-063: DSNP Identity
**As a** user, **I want** to create a DSNP identity **so that** I can use decentralized apps.

**Acceptance Criteria:**
- [ ] Frequency chain wallet creation
- [ ] DSNP ID registration
- [ ] Public key management
- [ ] Profile publication

**Sprint:** 24 | **Priority:** P2 | **Status:** TODO

---

### US-064: Cross-Protocol Sync
**As a** user, **I want** to sync posts across protocols **so that** I maintain presence everywhere.

**Acceptance Criteria:**
- [ ] Post once, publish to multiple protocols
- [ ] Protocol-specific formatting
- [ ] Link back to original
- [ ] Unified metrics aggregation

**Sprint:** 25-26 | **Priority:** P2 | **Status:** TODO

---

## Phase G: Architecture Evolution (Trigger-Based)

> These stories are triggered by usage thresholds, not fixed sprints.

### US-070: Redis Job Queue Migration
**As a** platform operator, **I want** to migrate from APScheduler to Redis+Celery **so that** the system scales beyond 100 concurrent users.

**Acceptance Criteria:**
- [ ] Redis deployed alongside SQLite
- [ ] Celery workers handle background jobs
- [ ] APScheduler jobs migrated to Celery tasks
- [ ] Job status visible in dashboard
- [ ] Graceful degradation if Redis unavailable

**Trigger:** >100 active users | **Priority:** P1 | **Status:** TODO

---

### US-071: WebSocket Real-Time Infrastructure
**As a** user, **I want** real-time updates via WebSocket **so that** I see progress without refreshing.

**Acceptance Criteria:**
- [ ] WebSocket server (Socket.IO or native)
- [ ] SSE fallback for restricted environments
- [ ] Connection state management
- [ ] Automatic reconnection with backoff
- [ ] Event types: sync.progress, cleanup.progress, notification

**Sprint:** 14 | **Priority:** P1 | **Status:** TODO

---

### US-072: Multi-Platform Conflict Resolution
**As a** user syncing to multiple platforms, **I want** conflict resolution **so that** edits from different platforms don't cause data loss.

**Acceptance Criteria:**
- [ ] Last-write-wins as default strategy
- [ ] Manual merge option for conflicts
- [ ] Conflict notification in UI
- [ ] Conflict history log
- [ ] Per-platform conflict settings

**Sprint:** 16+ | **Priority:** P1 | **Status:** TODO

---

### US-073: Data Archival Strategy
**As a** platform operator, **I want** automatic archival of old data **so that** the database stays performant.

**Acceptance Criteria:**
- [ ] Cold storage for tweets >1 year old
- [ ] Archive accessible via search (slower)
- [ ] Automatic archival job (nightly)
- [ ] Restore from archive capability
- [ ] Storage metrics dashboard

**Trigger:** >1M tweets in DB | **Priority:** P2 | **Status:** TODO

---

### US-074: API Response Caching
**As a** user, **I want** fast API responses **so that** the dashboard feels snappy.

**Acceptance Criteria:**
- [ ] Redis cache layer for read endpoints
- [ ] 5-minute TTL for list endpoints
- [ ] 1-minute TTL for stats/analytics
- [ ] Cache invalidation on write
- [ ] Cache hit/miss metrics

**Trigger:** API p95 >200ms | **Priority:** P2 | **Status:** TODO

---

### US-075: Horizontal Scaling Preparation
**As a** platform operator, **I want** the architecture ready for horizontal scaling **so that** we can add servers as needed.

**Acceptance Criteria:**
- [ ] Stateless API servers
- [ ] Session storage in Redis
- [ ] Shared file storage (S3-compatible)
- [ ] Database connection pooling
- [ ] Health check endpoints

**Trigger:** Single server at 80% capacity | **Priority:** P2 | **Status:** TODO

---

## Summary by Sprint

| Sprint | Stories | Priority P0 |
|--------|---------|-------------|
| 8 | US-001, US-002, US-003 | 2 |
| 9 | US-004, US-005, US-006 | 3 |
| 10 | US-010, US-011, US-012 | 3 |
| 11 | US-013, US-014, US-015, US-016 | 2 |
| 12 | US-017, US-018, US-019 | 3 |
| 13 | US-020, US-021 | 0 |
| 14 | US-030, US-031, US-071 | 0 |
| 15 | US-032 | 0 |
| 16 | US-040, US-072 | 1 |
| 17 | US-041 | 1 |
| 18 | US-042, US-043, US-044 | 0 |
| 19 | US-050 | 0 |
| 20 | US-051 | 0 |
| 21 | US-052, US-053 | 0 |
| 22 | US-060 | 0 |
| 23 | US-061, US-062 | 0 |
| 24 | US-063 | 0 |
| 25-26 | US-064 | 0 |
| Trigger | US-070, US-073, US-074, US-075 | 0 |
