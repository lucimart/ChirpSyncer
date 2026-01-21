# ChirpSyncer → Open Social Hub: Master Roadmap
> Version 2.0 | Last Updated: 2026-01-13

## Executive Summary

ChirpSyncer evolves into **Open Social Hub**: a user-owned, multi-platform social media management tool with transparent algorithms and privacy-first design.

### Current State (95% Complete)
- ✅ Core architecture: 20+ tables, 40+ indexes
- ✅ Test suite: 408 tests (97.8% passing)
- ✅ Auth: JWT + RBAC + step-up authentication
- ✅ Analytics, scheduler, bookmarks foundations
- ✅ Cleanup engine: API + filters complete
- ✅ Next.js dashboard: Foundation + Core Screens complete
- ❌ Multi-platform: Only Twitter via twscrape

### Vision
```
User-Owned Algorithm + Multi-Platform + Privacy-First = Open Social Hub
```

### MVP Milestones

| MVP | Sprint | Deliverable | User Value |
|-----|--------|-------------|------------|
| **MVP1** | 9 | Working cleanup + search | "I can delete old tweets" |
| **MVP2** | 13 | Full Next.js dashboard | "Modern, fast UI" |
| **MVP3** | 18 | Multi-platform support | "All my social in one place" |
| **MVP4** | 21 | Team collaboration | "My team can use this" |
| **MVP5** | 26 | Protocol federation | "True data ownership" |

### Dependency Graph

```
Sprint 8 (Cleanup Backend) ──┬──► Sprint 12 (Cleanup UI)
                             │
Sprint 9 (Search Backend) ───┼──► Sprint 13 (Search UI)
                             │
Sprint 10 (Next.js Setup) ───┴──► Sprint 11 (Core Screens)
                                        │
Sprint 14 (WebSocket) ◄─────────────────┘
        │
        ▼
Sprint 16 (Connectors) ──► Sprint 17-18 (Platforms)
        │
        ▼
Sprint 19-21 (Feed Lab + Teams)
        │
        ▼
Sprint 22-26 (Protocols)
```

### Critical Path
```
Sprint 8 (P0) → Sprint 10 → Sprint 12 → Sprint 16 → MVP3
```
⚠️ **Sprint 8 is the blocker** - Must complete cleanup stubs first.

---

## Architecture Overview

### Guiding Principles
1. **User-Owned Algorithm**: Transparent feed rules, no hidden manipulation
2. **Capabilities-First**: Platforms declare explicit capabilities
3. **Privacy-First**: Local-first data, user controls export
4. **Interoperable**: Open formats, easy platform switching
5. **Auditable**: Every action logged with correlation IDs

### Core Data Models

```python
# CanonicalPost - Unified post format across platforms
class CanonicalPost:
    id: str                          # Internal UUID
    content: str                     # Text content
    media: List[MediaAttachment]     # Images, videos
    created_at: datetime
    author_id: str
    platform_mappings: List[NetworkPostMapping]
    metrics: PostMetrics

class NetworkPostMapping:
    platform: str                    # 'twitter', 'bluesky', 'mastodon'
    native_id: str                   # Platform-specific ID
    url: str                         # Direct link
    synced_at: datetime

class PlatformCapabilities:
    can_publish: bool
    can_delete: bool
    can_read_timeline: bool
    can_read_metrics: bool
    max_text_length: int
    supports_images: bool
    supports_videos: bool
    auth_method: str                 # 'oauth2', 'api_key', 'session'
```

### Connector Framework

```
┌─────────────────────────────────────────────────────────────┐
│                     Open Social Hub                          │
├─────────────────────────────────────────────────────────────┤
│  Next.js Dashboard  │  Flask API  │  Background Workers     │
├─────────────────────────────────────────────────────────────┤
│                   Connector Framework                        │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ Twitter │ │ Bluesky │ │ Mastodon │ │ Instagram (R/O) │  │
│  │Connector│ │Connector│ │Connector │ │    Connector    │  │
│  └─────────┘ └─────────┘ └──────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  SQLite + FTS5  │  Redis Queue  │  File Storage            │
└─────────────────────────────────────────────────────────────┘
```

---

## Sprint Roadmap

### Phase A: Productize Core (Sprints 8-9) - Current
**Goal**: Ship cleanup + search with real implementations

#### Sprint 8: Cleanup Engine Completion
| Task | Priority | Status |
|------|----------|--------|
| Implement `_fetch_user_tweets()` with twscrape | P0 | TODO |
| Implement `_delete_tweet()` with rate limiting | P0 | TODO |
| Fix 10 failing tests | P0 | TODO |
| Add retry logic with exponential backoff | P1 | TODO |
| Cleanup preview with real data | P1 | TODO |

**Critical Code Locations**:
- `app/features/cleanup/cleanup_engine.py:187` - `_fetch_user_tweets()`
- `app/features/cleanup/cleanup_engine.py:201` - `_delete_tweet()`

#### Sprint 9: Search & E2E Testing
| Task | Priority | Status |
|------|----------|--------|
| Add `has_media` filter to FTS5 search | P0 | TODO |
| Add `min_likes` / `min_retweets` filters | P0 | TODO |
| Setup Playwright in CI | P0 | TODO |
| E2E tests: login, credentials, cleanup | P1 | TODO |
| Search results highlighting | P2 | TODO |

---

### Phase B: Next.js Frontend (Sprints 10-13)
**Goal**: Replace Flask dashboard with Next.js

#### Sprint 10: Foundation ✅ COMPLETE
- ✅ Next.js 14+ scaffold with TypeScript
- ✅ styled-components SSR setup
- ✅ Design System v1 primitives (Button, Input, Card, Modal)
- ✅ Auth flow (login/logout/protected routes)
- ✅ ThemeProvider, QueryProvider, AuthProvider

#### Sprint 11: Core Screens ✅ COMPLETE
- ✅ Credentials management (list, add, test, delete)
- ✅ Sync dashboard (stats, history, trigger)
- ✅ Dashboard home with overview cards
- ✅ Settings page (account, notifications)
- ✅ Cleanup rules management
- ✅ Search with filters
- ✅ Analytics dashboard

#### Sprint 12: Cleanup UI ✅ COMPLETE
- ✅ Cleanup rules list with preview links
- ✅ Rule creation wizard
- ✅ Preview with DataTable (sortable, selectable, paginated)
- ✅ Step-up auth (DangerConfirm modal with typed phrase)
- ✅ Execution with real-time progress

#### Sprint 13: Search & Analytics
- Search page with filters (done in Sprint 11)
- Analytics overview with charts (done in Sprint 11)
- Bookmarks/saved tweets
- Export functionality

---

### Phase C: Real-Time & Intelligence (Sprints 14-15)
**Goal**: WebSocket updates + ML scheduling

#### Sprint 14: WebSocket Real-Time
| Feature | Description |
|---------|-------------|
| Sync progress | Live updates during sync operations |
| Cleanup progress | Real-time deletion count |
| Notifications | Toast notifications for background events |
| Connection status | Reconnection handling |

**Architecture**:
```typescript
// RealtimeProvider.tsx
const socket = new WebSocket(WS_URL);
socket.onmessage = (event) => {
  const { type, payload } = JSON.parse(event.data);
  switch(type) {
    case 'sync.progress': updateSyncProgress(payload); break;
    case 'cleanup.progress': updateCleanupProgress(payload); break;
    case 'notification': showToast(payload); break;
  }
};
```

#### Sprint 15: ML Scheduling
| Feature | Description |
|---------|-------------|
| Engagement prediction | Predict best posting times |
| Optimal time suggestions | Based on historical data |
| A/B testing framework | Compare scheduling strategies |
| Analytics integration | Track prediction accuracy |

---

### Phase D: Multi-Platform (Sprints 16-18)
**Goal**: Add Bluesky, Mastodon, Instagram connectors

#### Sprint 16: Connector Framework
```python
# Base connector interface
class PlatformConnector(ABC):
    @abstractmethod
    def get_capabilities(self) -> PlatformCapabilities: ...

    @abstractmethod
    def authenticate(self, credentials: Dict) -> bool: ...

    @abstractmethod
    def fetch_posts(self, user_id: str, limit: int) -> List[CanonicalPost]: ...

    @abstractmethod
    def publish_post(self, post: CanonicalPost) -> NetworkPostMapping: ...

    @abstractmethod
    def delete_post(self, native_id: str) -> bool: ...
```

#### Sprint 17: Bluesky Integration
- AT Protocol client implementation
- DID resolution and PDS discovery
- Post sync bidirectional
- Capabilities: publish, delete, read, metrics

#### Sprint 18: Mastodon + Instagram
- Mastodon: Full OAuth2 flow, publish, delete, read
- Instagram: Read-only via Graph API (no publish without Business account)
- Unified credential management UI

---

### Phase E: Feed Lab & Collaboration (Sprints 19-21)
**Goal**: User-owned algorithm + team features

#### Sprint 19: Feed Lab Foundation
```typescript
interface FeedRule {
  id: string;
  name: string;
  type: 'boost' | 'demote' | 'filter';
  conditions: FeedCondition[];
  weight: number;  // -100 to +100
  enabled: boolean;
}

interface FeedCondition {
  field: 'author' | 'content' | 'engagement' | 'age' | 'platform';
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex';
  value: string | number;
}
```

#### Sprint 20: Feed Explainability
- "Why am I seeing this?" per post
- Rule contribution visualization
- Algorithm transparency dashboard

#### Sprint 21: Team Collaboration
- Workspace concept (personal → team)
- Role-based access (admin, editor, viewer)
- Shared credentials with audit
- Activity feed per workspace
Status: Implemented workspace management and activity feed via Integration Sprint I4.

---

### Phase F: Decentralized Protocols (Sprints 22-26)
**Goal**: Full protocol support for open social networking

> See `docs/PROTOCOL_ROADMAP.md` for detailed specifications

#### Sprint 22: ActivityPub (Fediverse)
- HTTP Signature implementation
- WebFinger discovery
- Actor/Inbox/Outbox handlers
- Mastodon, Pixelfed, PeerTube support

#### Sprint 23: AT Protocol Advanced
- DID resolution (plc, web)
- PDS migration support
- Custom feed generator for Bluesky
- Labeler integration

#### Sprint 24: DSNP (Decentralized)
- Frequency blockchain integration
- IPFS content storage
- Graph query service
- Identity creation flow

#### Sprint 25-26: SSB & Matrix (Future)
- Secure Scuttlebutt P2P support
- Matrix federated messaging
- Cross-protocol bridges

**Protocol Priority:**
| Protocol | Platform Examples | Priority |
|----------|-------------------|----------|
| AT Protocol | Bluesky | P0 |
| ActivityPub | Mastodon, Pixelfed | P1 |
| DSNP | Project Liberty | P2 |
| SSB | Manyverse | P3 |
| Matrix | Element | P3 |

---

## Future Architecture Evolution

> Architecture changes triggered by usage thresholds rather than fixed sprints.

### Scaling Triggers

| Area | Current | Future | Trigger |
|------|---------|--------|---------|
| **Job Queue** | APScheduler + SQLite | Redis + Celery | >100 users |
| **Real-time** | Polling | WebSocket + SSE fallback | Sprint 14 |
| **Conflict Resolution** | N/A (single platform) | Last-write-wins + manual merge | Sprint 16 |
| **Data Archival** | All in SQLite | Cold storage for >1yr tweets | >1M tweets |
| **Caching** | None | Redis cache (5min TTL) | API p95 >200ms |
| **Scaling** | Single server | Horizontal scaling ready | 80% capacity |

### Migration Paths

```
┌─────────────────────────────────────────────────────────────────┐
│                     Current Architecture                          │
│                                                                   │
│   Next.js ──► Flask API ──► SQLite                               │
│                  │                                                │
│              APScheduler                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger: >100 users
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 1: Redis Integration                    │
│                                                                   │
│   Next.js ──► Flask API ──► SQLite                               │
│                  │              │                                 │
│              Celery ◄──── Redis ────► Cache                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger: >1M tweets
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 2: Data Tiering                         │
│                                                                   │
│   Next.js ──► Flask API ──► SQLite (hot) ──► Cold Storage        │
│                  │              │                                 │
│              Celery ◄──── Redis ────► Cache                      │
│                                  │                                │
│                            Archival Job                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger: 80% capacity
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Phase 3: Horizontal Scaling                   │
│                                                                   │
│   Load Balancer                                                   │
│        │                                                          │
│   ┌────┴────┐                                                    │
│   │         │                                                    │
│   API-1   API-2 ──► PostgreSQL (shared) ──► S3 (media)          │
│   │         │              │                                     │
│   └────┬────┘         Redis Cluster                              │
│        │                   │                                     │
│    Celery Workers ◄────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

### User Stories for Architecture Evolution

| Story | Description | Trigger |
|-------|-------------|---------|
| US-070 | Redis Job Queue Migration | >100 users |
| US-071 | WebSocket Real-Time | Sprint 14 |
| US-072 | Conflict Resolution | Sprint 16 |
| US-073 | Data Archival Strategy | >1M tweets |
| US-074 | API Response Caching | p95 >200ms |
| US-075 | Horizontal Scaling | 80% capacity |

---

## Tech Stack Reference

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14+, TypeScript | Dashboard |
| Styling | styled-components | SSR-compatible |
| State | TanStack Query v5 | Server state |
| API | Flask, SQLAlchemy | Backend |
| Database | SQLite + FTS5 | Data + search |
| Queue | Redis (future) | Background jobs |
| Cache | Redis (future) | API response cache |
| Real-time | WebSocket + SSE (future) | Live updates |
| Testing | pytest, Playwright | Unit + E2E |
| Auth | JWT + HttpOnly cookies | Session |
| Step-Up | danger_token | Destructive ops |

---

## RBAC Permissions Matrix

| Permission | Admin | Editor | Viewer |
|------------|-------|--------|--------|
| canViewDashboard | ✅ | ✅ | ✅ |
| canManageCredentials | ✅ | ✅ | ❌ |
| canTriggerSync | ✅ | ✅ | ❌ |
| canViewCleanupRules | ✅ | ✅ | ✅ |
| canEditCleanupRules | ✅ | ✅ | ❌ |
| canExecuteCleanup | ✅ | ❌ | ❌ |
| canViewAnalytics | ✅ | ✅ | ✅ |
| canExportData | ✅ | ✅ | ❌ |
| canViewAuditLog | ✅ | ❌ | ❌ |
| canManageUsers | ✅ | ❌ | ❌ |

---

## API Endpoints Summary

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Current user + permissions

### Credentials
- `GET /api/v1/credentials` - List credentials
- `POST /api/v1/credentials` - Create credential
- `DELETE /api/v1/credentials/:id` - Delete (step-up)
- `POST /api/v1/credentials/:id/test` - Test connection

### Cleanup
- `GET /api/v1/cleanup/rules` - List rules
- `POST /api/v1/cleanup/rules` - Create rule
- `GET /api/v1/cleanup/preview/:id` - Preview matches
- `POST /api/v1/cleanup/execute/:id` - Execute (step-up)

### Sync
- `GET /api/v1/sync/stats` - Sync statistics
- `GET /api/v1/sync/history` - Sync history
- `POST /api/v1/sync/trigger` - Trigger sync

### Search
- `GET /api/v1/search` - Full-text search with filters

### Algorithm Transparency
- `GET /api/v1/algorithm/stats` - Algorithm transparency stats
- `GET /api/v1/algorithm/settings` - Algorithm settings
- `POST /api/v1/algorithm/settings` - Update algorithm settings

### Workspaces
- `GET /api/v1/workspaces/current` - Current workspace + list
- `POST /api/v1/workspaces` - Create workspace
- `POST /api/v1/workspaces/:id/switch` - Switch workspace
- `GET /api/v1/workspaces/:id/members` - List members
- `POST /api/v1/workspaces/:id/members/invite` - Invite member
- `DELETE /api/v1/workspaces/:id/members/:memberId` - Remove member
- `PATCH /api/v1/workspaces/:id/members/:memberId/role` - Update member role
- `GET /api/v1/workspaces/:id/activity` - Activity feed
- `GET /api/v1/workspaces/:id/shared-credentials` - Shared credentials
- `POST /api/v1/workspaces/:id/shared-credentials` - Share credential
- `PATCH /api/v1/workspaces/:id/shared-credentials/:credentialId` - Update access
- `DELETE /api/v1/workspaces/:id/shared-credentials/:credentialId` - Revoke access

### Step-Up Auth
- `POST /api/v1/danger/confirm` - Get danger_token

---

## File Structure Reference

```
ChirpSyncer/
├── app/
│   ├── core/           # DB, config, utilities
│   ├── auth/           # User management, JWT
│   ├── features/       # Cleanup, scheduler, analytics
│   ├── integrations/   # Twitter scraper, future connectors
│   └── web/            # Flask routes (legacy)
├── dashboard/          # Next.js (to be created)
│   ├── app/            # App Router pages
│   ├── components/     # UI components
│   ├── lib/            # API client, hooks
│   └── providers/      # Context providers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/playwright/
└── docs/
    ├── migration/      # Next.js migration specs
    ├── sprints/        # Sprint documentation
    └── api/            # API documentation
```

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Test coverage | >90% core | ~85% |
| Tests passing | 100% | 97.8% |
| API response time | <200ms p95 | TBD |
| Next.js migration | 100% | 60% (Sprint 10-12 done) |
| Platform connectors | 4 | 1 |
| E2E test coverage | Critical paths | 0% |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `docs/migration/CHIRP_NEXT_DASHBOARD_SPEC.md` | Full Next.js specification |
| `docs/migration/STATUS.md` | Migration progress tracking |
| `docs/sprints/IMPLEMENTATION_ROADMAP.md` | Sprint 8-9 details |
| `docs/SESSION_WORKFLOW.md` | How to continue work |
| `docs/USER_STORIES.md` | All user stories with acceptance criteria |
| `docs/SPRINT_TICKETS.md` | Technical tasks per sprint |
| `docs/PROTOCOL_ROADMAP.md` | Decentralized protocol specifications |
| `.claude/skills/*.md` | Context preservation skills (12 skills) |
| `CLAUDE.md` | Project entry point |
