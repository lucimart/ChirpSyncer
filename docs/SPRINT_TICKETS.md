# Sprint Tickets - Technical Tasks
> Detailed implementation tasks organized by sprint

## Ticket Format

```
TASK-XXX: [Title]
Story: US-XXX
Priority: P0/P1/P2
Estimate: S/M/L/XL

Description:
[What needs to be done]

Files:
- file1.py
- file2.py

Acceptance:
- [ ] Criteria 1
- [ ] Criteria 2

Status: TODO/IN_PROGRESS/DONE
```

---

## Sprint 8: Cleanup Engine Completion

### TASK-801: Implement _fetch_user_tweets
**Story:** US-001 | **Priority:** P0 | **Estimate:** M

**Description:**
Replace stub `_fetch_user_tweets()` with real implementation using twscrape.

**Files:**
- `app/features/cleanup/cleanup_engine.py:187`
- `app/integrations/twitter_scraper.py`

**Implementation:**
```python
async def _fetch_user_tweets(self, user_id: int, credential_id: int) -> List[Dict]:
    """Fetch user tweets for cleanup evaluation."""
    credential = self.credential_manager.get_credential(credential_id)
    scraper = TwitterScraper(credential)

    tweets = await scraper.fetch_user_tweets(
        user_id=user_id,
        limit=1000,
        include_replies=True
    )

    return [
        {
            'id': str(t.id),
            'text': t.rawContent,
            'created_at': t.date,
            'likes': t.likeCount,
            'retweets': t.retweetCount,
            'has_media': len(t.media) > 0 if t.media else False
        }
        for t in tweets
    ]
```

**Acceptance:**
- [ ] Returns real tweets from Twitter
- [ ] Normalized format with required fields
- [ ] Rate limiting applied
- [ ] Tests pass

**Status:** TODO

---

### TASK-802: Implement _delete_tweet
**Story:** US-002 | **Priority:** P0 | **Estimate:** M

**Description:**
Replace stub `_delete_tweet()` with real implementation.

**Files:**
- `app/features/cleanup/cleanup_engine.py:201`
- `app/integrations/twitter_scraper.py`

**Implementation:**
```python
async def _delete_tweet(
    self,
    tweet_id: str,
    platform: str,
    credential_id: int,
    correlation_id: str
) -> bool:
    """Delete tweet via API."""
    credential = self.credential_manager.get_credential(credential_id)

    try:
        scraper = TwitterScraper(credential)
        success = await scraper.delete_tweet(tweet_id)

        if success:
            self.audit_log.log(
                action='tweet.deleted',
                resource_type='tweet',
                resource_id=tweet_id,
                correlation_id=correlation_id
            )

        return success
    except Exception as e:
        logger.error(f"Failed to delete tweet {tweet_id}: {e}")
        return False
```

**Acceptance:**
- [ ] Actually deletes tweet from Twitter
- [ ] Audit log entry created
- [ ] Correlation ID tracked
- [ ] Error handling for API failures

**Status:** TODO

---

### TASK-803: Add Retry Logic with Backoff
**Story:** US-001, US-002 | **Priority:** P1 | **Estimate:** S

**Description:**
Add exponential backoff retry for API calls.

**Files:**
- `app/core/utils/retry.py` (new)
- `app/features/cleanup/cleanup_engine.py`

**Implementation:**
```python
# app/core/utils/retry.py
import asyncio
from functools import wraps

def with_retry(max_retries=3, base_delay=1.0, max_delay=60.0):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except RateLimitError:
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, max_delay)
            raise MaxRetriesExceeded()
        return wrapper
    return decorator
```

**Acceptance:**
- [ ] Retries on rate limit errors
- [ ] Exponential backoff applied
- [ ] Max retries respected
- [ ] Logging for retries

**Status:** TODO

---

### TASK-804: Fix Failing Tests
**Story:** - | **Priority:** P0 | **Estimate:** M

**Description:**
Fix the 10 failing tests identified in the test suite.

**Files:**
- Various test files
- Schema-related files

**Known Issues:**
1. Schema mismatch in analytics tests
2. Missing mock for twscrape in cleanup tests
3. Async test fixtures not awaited

**Acceptance:**
- [ ] All 408 tests passing
- [ ] No skipped tests
- [ ] Coverage maintained

**Status:** TODO

---

### TASK-805: Cleanup Preview API Update
**Story:** US-003 | **Priority:** P1 | **Estimate:** S

**Description:**
Update preview endpoint to return real data.

**Files:**
- `app/web/dashboard.py`
- `app/features/cleanup/cleanup_engine.py`

**Acceptance:**
- [ ] Preview shows real matching tweets
- [ ] Pagination support
- [ ] Total count accurate

**Status:** TODO

---

## Sprint 9: Search & E2E Testing

### TASK-901: Add has_media Search Filter
**Story:** US-004 | **Priority:** P0 | **Estimate:** S

**Description:**
Add media filter to FTS5 search.

**Files:**
- `app/features/search/search_engine.py`
- `app/web/dashboard.py`

**Implementation:**
```python
def search(self, query: str, has_media: bool = None) -> List[Dict]:
    base_query = "SELECT * FROM tweet_search_index WHERE tweet_search_index MATCH ?"
    params = [query]

    if has_media is not None:
        # Join with synced_posts for media filter
        base_query = """
            SELECT tsi.* FROM tweet_search_index tsi
            JOIN synced_posts sp ON tsi.tweet_id = sp.twitter_id
            WHERE tsi MATCH ?
            AND sp.has_media = ?
        """
        params.append(has_media)

    return self.db.execute(base_query, params).fetchall()
```

**Acceptance:**
- [ ] Filter by has_media=true
- [ ] Filter by has_media=false
- [ ] Combinable with text search

**Status:** TODO

---

### TASK-902: Add Engagement Filters
**Story:** US-005 | **Priority:** P0 | **Estimate:** S

**Description:**
Add min_likes and min_retweets filters.

**Files:**
- `app/features/search/search_engine.py`
- `app/web/dashboard.py`

**Acceptance:**
- [ ] min_likes filter works
- [ ] min_retweets filter works
- [ ] Filters combine correctly

**Status:** TODO

---

### TASK-903: Setup Playwright Config
**Story:** US-006 | **Priority:** P0 | **Estimate:** M

**Description:**
Configure Playwright for E2E testing.

**Files:**
- `playwright.config.ts` (new)
- `tests/e2e/playwright/` (new directory)
- `.github/workflows/test.yml`

**Implementation:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/playwright',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Acceptance:**
- [ ] Playwright configured
- [ ] Can run locally
- [ ] CI workflow updated

**Status:** TODO

---

### TASK-904: E2E Login Tests
**Story:** US-006 | **Priority:** P0 | **Estimate:** S

**Description:**
Write E2E tests for login flow.

**Files:**
- `tests/e2e/playwright/login.spec.ts`

**Test Cases:**
1. Successful login redirects to dashboard
2. Invalid credentials show error
3. Protected route redirects to login
4. Logout clears session

**Status:** TODO

---

### TASK-905: E2E Credentials Tests
**Story:** US-006 | **Priority:** P1 | **Estimate:** M

**Description:**
Write E2E tests for credentials CRUD.

**Files:**
- `tests/e2e/playwright/credentials.spec.ts`

**Test Cases:**
1. List credentials page loads
2. Add credential flow
3. Test connection
4. Delete with confirmation

**Status:** TODO

---

### TASK-906: E2E Cleanup Tests
**Story:** US-006 | **Priority:** P1 | **Estimate:** M

**Description:**
Write E2E tests for cleanup flow.

**Files:**
- `tests/e2e/playwright/cleanup.spec.ts`

**Test Cases:**
1. Rules list page loads
2. Create rule flow
3. Preview shows results
4. Execute requires step-up auth

**Status:** TODO

---

## Sprint 10: Next.js Foundation

### TASK-1001: Next.js Project Scaffold
**Story:** US-010 | **Priority:** P0 | **Estimate:** M

**Description:**
Create Next.js 14+ project with App Router.

**Files:**
- `dashboard/` (new directory)
- `dashboard/package.json`
- `dashboard/tsconfig.json`
- `dashboard/next.config.js`

**Commands:**
```bash
npx create-next-app@latest dashboard --typescript --app --src-dir=false
cd dashboard
npm install styled-components
npm install -D @types/styled-components
```

**Acceptance:**
- [ ] Next.js 14+ with App Router
- [ ] TypeScript strict mode
- [ ] Build succeeds
- [ ] Dev server runs

**Status:** TODO

---

### TASK-1002: styled-components SSR Setup
**Story:** US-010 | **Priority:** P0 | **Estimate:** S

**Description:**
Configure styled-components for SSR.

**Files:**
- `dashboard/lib/registry.tsx`
- `dashboard/app/layout.tsx`

**Implementation:**
```typescript
// lib/registry.tsx
'use client';
import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
```

**Acceptance:**
- [ ] No flash of unstyled content
- [ ] Styles hydrate correctly
- [ ] Works in production build

**Status:** TODO

---

### TASK-1003: Design Tokens Implementation
**Story:** US-011 | **Priority:** P0 | **Estimate:** S

**Description:**
Implement design tokens from Design System v1.

**Files:**
- `dashboard/lib/theme/tokens.ts`
- `dashboard/lib/theme/index.ts`

**Acceptance:**
- [ ] All tokens from chirp-design-system.md
- [ ] TypeScript types exported
- [ ] Dark mode tokens included

**Status:** TODO

---

### TASK-1004: Button Component
**Story:** US-011 | **Priority:** P0 | **Estimate:** S

**Description:**
Create Button component with all variants.

**Files:**
- `dashboard/components/ui/Button.tsx`

**Variants:** primary, secondary, danger, ghost, outline
**Sizes:** sm, md, lg
**States:** default, hover, active, disabled, loading

**Status:** TODO

---

### TASK-1005: Input Component
**Story:** US-011 | **Priority:** P0 | **Estimate:** S

**Description:**
Create Input component.

**Files:**
- `dashboard/components/ui/Input.tsx`

**Types:** text, password, email, number, search
**States:** default, focus, error, disabled

**Status:** TODO

---

### TASK-1006: Card Component
**Story:** US-011 | **Priority:** P0 | **Estimate:** S

**Description:**
Create Card component.

**Files:**
- `dashboard/components/ui/Card.tsx`

**Variants:** default, outlined, elevated
**Padding:** none, sm, md, lg

**Status:** TODO

---

### TASK-1007: Modal Component
**Story:** US-011 | **Priority:** P0 | **Estimate:** M

**Description:**
Create Modal component with portal.

**Files:**
- `dashboard/components/ui/Modal.tsx`

**Features:**
- Portal rendering
- Focus trap
- Close on overlay click
- Close on Escape key
- Sizes: sm, md, lg, xl

**Status:** TODO

---

### TASK-1008: AuthProvider Implementation
**Story:** US-012 | **Priority:** P0 | **Estimate:** M

**Description:**
Create AuthProvider with JWT handling.

**Files:**
- `dashboard/providers/AuthProvider.tsx`
- `dashboard/lib/auth.ts`

**Features:**
- Login/logout methods
- Current user state
- Permissions array
- Auto-refresh token

**Status:** TODO

---

### TASK-1009: Login Page
**Story:** US-012 | **Priority:** P0 | **Estimate:** M

**Description:**
Create login page.

**Files:**
- `dashboard/app/(auth)/login/page.tsx`

**Features:**
- Username/password form
- Remember me checkbox
- Error display
- Redirect on success

**Status:** TODO

---

### TASK-1010: Middleware for Protected Routes
**Story:** US-012 | **Priority:** P0 | **Estimate:** S

**Description:**
Create Next.js middleware for auth.

**Files:**
- `dashboard/middleware.ts`

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('chirp_token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*']
};
```

**Status:** TODO

---

## Summary by Priority

### P0 Tasks (Must Have)
| Sprint | Tasks | Count |
|--------|-------|-------|
| 8 | TASK-801, 802, 804 | 3 |
| 9 | TASK-901, 902, 903, 904 | 4 |
| 10 | TASK-1001 to 1010 | 10 |

### P1 Tasks (Should Have)
| Sprint | Tasks | Count |
|--------|-------|-------|
| 8 | TASK-803, 805 | 2 |
| 9 | TASK-905, 906 | 2 |

---

---

## Architecture Evolution Tasks (Trigger-Based)

> These tasks are activated by usage/performance thresholds.

### TASK-7001: Redis Infrastructure Setup
**Story:** US-070 | **Priority:** P1 | **Estimate:** M
**Trigger:** >100 active users

**Description:**
Deploy Redis alongside existing SQLite for job queue and caching.

**Files:**
- `docker-compose.yml` (add redis service)
- `app/core/config.py` (add Redis config)
- `app/core/redis_client.py` (new)
- `requirements.txt` (add redis, celery)

**Implementation:**
```python
# app/core/redis_client.py
import redis
from app.core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=0,
    decode_responses=True
)

def get_redis():
    return redis_client
```

**Acceptance:**
- [ ] Redis container in docker-compose
- [ ] Connection pool configured
- [ ] Health check endpoint
- [ ] Graceful fallback if unavailable

**Status:** TODO

---

### TASK-7002: Celery Worker Migration
**Story:** US-070 | **Priority:** P1 | **Estimate:** L
**Trigger:** >100 active users

**Description:**
Migrate APScheduler jobs to Celery tasks.

**Files:**
- `app/core/celery_app.py` (new)
- `app/tasks/` (new directory)
- `app/tasks/sync_tasks.py`
- `app/tasks/cleanup_tasks.py`
- `app/features/scheduler/job_manager.py`

**Implementation:**
```python
# app/core/celery_app.py
from celery import Celery

celery_app = Celery(
    'chirpsyncer',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
)

# app/tasks/sync_tasks.py
from app.core.celery_app import celery_app

@celery_app.task(bind=True)
def sync_user_posts(self, user_id: int, credential_id: int):
    """Background task for syncing posts."""
    ...
```

**Acceptance:**
- [ ] Celery app configured
- [ ] Sync task migrated
- [ ] Cleanup task migrated
- [ ] APScheduler still works (fallback)
- [ ] Task status visible in dashboard

**Status:** TODO

---

### TASK-7003: WebSocket Server Implementation
**Story:** US-071 | **Priority:** P1 | **Estimate:** L
**Sprint:** 14

**Description:**
Implement WebSocket server for real-time updates.

**Files:**
- `app/web/websocket.py` (new)
- `app/core/events.py` (new)
- `dashboard/providers/RealtimeProvider.tsx`

**Implementation:**
```python
# app/web/websocket.py
from flask_socketio import SocketIO, emit

socketio = SocketIO(cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    emit('connected', {'status': 'ok'})

def emit_sync_progress(user_id: int, progress: dict):
    socketio.emit(
        'sync.progress',
        progress,
        room=f'user_{user_id}'
    )

def emit_cleanup_progress(user_id: int, progress: dict):
    socketio.emit(
        'cleanup.progress',
        progress,
        room=f'user_{user_id}'
    )
```

**Acceptance:**
- [ ] WebSocket connection works
- [ ] SSE fallback implemented
- [ ] Room-based messaging (per user)
- [ ] Auto-reconnection
- [ ] Event types documented

**Status:** TODO

---

### TASK-7004: Conflict Resolution System
**Story:** US-072 | **Priority:** P1 | **Estimate:** L
**Sprint:** 16+

**Description:**
Implement conflict resolution for multi-platform sync.

**Files:**
- `app/features/sync/conflict_resolver.py` (new)
- `app/core/db_handler.py` (add conflicts table)
- `app/web/dashboard.py` (conflict endpoints)

**Implementation:**
```python
# app/features/sync/conflict_resolver.py
from enum import Enum
from dataclasses import dataclass

class ConflictStrategy(Enum):
    LAST_WRITE_WINS = "last_write_wins"
    MANUAL_MERGE = "manual_merge"
    SOURCE_PRIORITY = "source_priority"

@dataclass
class Conflict:
    id: str
    post_id: str
    source_platform: str
    target_platform: str
    source_content: str
    target_content: str
    detected_at: datetime
    resolved: bool = False
    resolution: Optional[str] = None

class ConflictResolver:
    def __init__(self, strategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS):
        self.strategy = strategy

    def detect_conflict(self, source: CanonicalPost, target: CanonicalPost) -> Optional[Conflict]:
        if source.content != target.content and source.updated_at != target.updated_at:
            return Conflict(...)
        return None

    def resolve(self, conflict: Conflict) -> CanonicalPost:
        if self.strategy == ConflictStrategy.LAST_WRITE_WINS:
            return self._resolve_lww(conflict)
        elif self.strategy == ConflictStrategy.MANUAL_MERGE:
            return self._flag_for_manual(conflict)
```

**Acceptance:**
- [ ] Conflict detection works
- [ ] Last-write-wins strategy
- [ ] Manual merge UI
- [ ] Conflict history
- [ ] Tests cover edge cases

**Status:** TODO

---

### TASK-7005: Data Archival System
**Story:** US-073 | **Priority:** P2 | **Estimate:** L
**Trigger:** >1M tweets

**Description:**
Implement cold storage for old tweets.

**Files:**
- `app/features/archival/archival_manager.py` (new)
- `app/core/storage/cold_storage.py` (new)
- `app/tasks/archival_tasks.py` (new)

**Implementation:**
```python
# app/features/archival/archival_manager.py
from datetime import datetime, timedelta

class ArchivalManager:
    def __init__(self, cold_storage, db, threshold_days=365):
        self.cold_storage = cold_storage
        self.db = db
        self.threshold = timedelta(days=threshold_days)

    def archive_old_posts(self) -> int:
        """Move posts older than threshold to cold storage."""
        cutoff = datetime.utcnow() - self.threshold
        old_posts = self.db.query(SyncedPost).filter(
            SyncedPost.created_at < cutoff,
            SyncedPost.archived == False
        ).all()

        for post in old_posts:
            self.cold_storage.store(post)
            post.archived = True
            post.archive_location = self.cold_storage.get_location(post.id)

        self.db.commit()
        return len(old_posts)

    def restore_from_archive(self, post_id: str) -> Optional[SyncedPost]:
        """Restore a post from cold storage."""
        ...
```

**Acceptance:**
- [ ] Automatic nightly archival
- [ ] Cold storage (file/S3)
- [ ] Restore capability
- [ ] Search includes archived
- [ ] Storage metrics

**Status:** TODO

---

### TASK-7006: Redis Caching Layer
**Story:** US-074 | **Priority:** P2 | **Estimate:** M
**Trigger:** API p95 >200ms

**Description:**
Add Redis caching for read-heavy endpoints.

**Files:**
- `app/core/cache.py` (new)
- `app/web/dashboard.py` (add caching)

**Implementation:**
```python
# app/core/cache.py
from functools import wraps
from app.core.redis_client import redis_client
import json

def cached(ttl_seconds=300, key_prefix=""):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"

            cached_value = redis_client.get(cache_key)
            if cached_value:
                return json.loads(cached_value)

            result = func(*args, **kwargs)
            redis_client.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

# Usage
@cached(ttl_seconds=300, key_prefix="api")
def get_credentials_list(user_id: int):
    ...
```

**Acceptance:**
- [ ] Cache decorator works
- [ ] 5min TTL for lists
- [ ] 1min TTL for stats
- [ ] Cache invalidation
- [ ] Hit/miss metrics

**Status:** TODO

---

### TASK-7007: Horizontal Scaling Preparation
**Story:** US-075 | **Priority:** P2 | **Estimate:** XL
**Trigger:** 80% server capacity

**Description:**
Prepare architecture for horizontal scaling.

**Files:**
- Multiple infrastructure files
- Session management
- File storage abstraction

**Subtasks:**
1. Stateless API servers (session in Redis)
2. Shared file storage (S3-compatible)
3. Database connection pooling
4. Health check endpoints
5. Load balancer config

**Acceptance:**
- [ ] Sessions stored in Redis
- [ ] Media stored in S3
- [ ] Connection pooling
- [ ] Health endpoints
- [ ] Documentation updated

**Status:** TODO

---

## Progress Tracking

Update this section as tasks complete:

```markdown
Sprint 8: [ ] [ ] [ ] [ ] [ ] (0/5)
Sprint 9: [ ] [ ] [ ] [ ] [ ] [ ] (0/6)
Sprint 10: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] (0/10)
Architecture: [ ] [ ] [ ] [ ] [ ] [ ] [ ] (0/7 trigger-based)
```
