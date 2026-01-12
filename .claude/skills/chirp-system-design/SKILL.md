---
name: chirp-system-design
description: Complete system architecture, component mapping, configuration, and improvement suggestions
---

# Skill: ChirpSyncer System Design

Use this skill for architectural analysis, component understanding, and system improvement planning.

## System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                           │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐   │
│  │   main.py        │  │          web/dashboard.py            │   │
│  │  (Sync Engine)   │  │            (Flask UI)                │   │
│  └────────┬─────────┘  └──────────────────┬───────────────────┘   │
│           │                               │                        │
├───────────┼───────────────────────────────┼────────────────────────┤
│           ▼           FEATURES LAYER      ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  cleanup_engine  │ analytics_tracker │ tweet_scheduler      │  │
│  │  search_engine   │ saved_content     │ report_generator     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
├───────────────────────────────┼────────────────────────────────────┤
│                               ▼       SERVICES LAYER               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  task_scheduler    │ user_settings   │ notification_service │  │
│  │  stats_handler     │                 │                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
├───────────────────────────────┼────────────────────────────────────┤
│                               ▼     INTEGRATIONS LAYER             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  twitter_scraper   │ bluesky_handler │ media_handler        │  │
│  │  (twscrape)        │ (atproto)       │ credential_validator │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
├───────────────────────────────┼────────────────────────────────────┤
│                               ▼         AUTH LAYER                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  user_manager      │ credential_manager │ security_utils    │  │
│  │  (bcrypt)          │ (AES-256-GCM)      │ (audit)           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                               │                                    │
├───────────────────────────────┼────────────────────────────────────┤
│                               ▼         CORE LAYER                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  db_handler        │ config           │ logger    │ utils   │  │
│  │  (SQLite + FTS5)   │ (env vars)       │           │         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

## Component Configuration Map

### Core Layer

| Component | File | Configuration | Database Tables |
|-----------|------|---------------|-----------------|
| db_handler | `app/core/db_handler.py` | DATABASE_PATH env | synced_posts, sync_stats, hourly_stats, api_usage |
| config | `app/core/config.py` | All env vars | None |
| logger | `app/core/logger.py` | LOG_LEVEL, log rotation | None (file: logs/chirpsyncer.log) |
| utils | `app/core/utils.py` | None | None |

### Auth Layer

| Component | File | Configuration | Database Tables |
|-----------|------|---------------|-----------------|
| user_manager | `app/auth/user_manager.py` | DB_PATH | users, user_sessions |
| credential_manager | `app/auth/credential_manager.py` | MASTER_KEY (32 bytes) | user_credentials, shared_credentials |
| security_utils | `app/auth/security_utils.py` | Password policy | audit_log |

### Services Layer

| Component | File | Configuration | Database Tables |
|-----------|------|---------------|-----------------|
| task_scheduler | `app/services/task_scheduler.py` | APScheduler settings | scheduled_tasks, task_executions |
| user_settings | `app/services/user_settings.py` | Default settings dict | user_settings |

### Features Layer

| Component | File | Configuration | Database Tables |
|-----------|------|---------------|-----------------|
| cleanup_engine | `app/features/cleanup/cleanup_engine.py` | Rate limits | cleanup_rules, cleanup_history |
| analytics_tracker | `app/features/analytics/analytics_tracker.py` | Retention period | tweet_metrics, analytics_snapshots |
| tweet_scheduler | `app/features/scheduler/tweet_scheduler.py` | Queue interval | scheduled_tweets |

### Integrations Layer

| Component | File | Configuration | External APIs |
|-----------|------|---------------|---------------|
| twitter_scraper | `app/integrations/twitter_scraper.py` | TWITTER_* env vars | Twitter (twscrape) |
| bluesky_handler | `app/integrations/bluesky_handler.py` | BSKY_* env vars | Bluesky (atproto) |
| media_handler | `app/integrations/media_handler.py` | Size limits | Twitter, Bluesky media |

## Database Schema Summary

```sql
-- 20+ Tables organized by domain

-- CORE
synced_posts (id, twitter_id, bluesky_uri, content_hash, source, synced_to, synced_at)
sync_stats (id, timestamp, source, target, success, error_type, duration_ms)
hourly_stats (id, hour, total_syncs, successful, failed, media, threads, avg_duration)
api_usage (id, platform, operation, timestamp, count)

-- AUTH
users (id, username, email, password_hash, created_at, is_active, is_admin)
user_sessions (id, user_id, session_token, expires_at, ip_address, user_agent)
user_credentials (id, user_id, platform, credential_type, encrypted_data, iv, tag)
shared_credentials (id, credential_id, owner_user_id, shared_with_user_id)
audit_log (id, user_id, action, resource_type, resource_id, success, details)

-- FEATURES
cleanup_rules (id, user_id, name, enabled, rule_type, rule_config, last_run, deleted_count)
cleanup_history (id, rule_id, user_id, tweets_deleted, executed_at, dry_run)
tweet_metrics (id, tweet_id, user_id, timestamp, impressions, likes, retweets, engagement_rate)
analytics_snapshots (id, user_id, period, period_start, total_tweets, avg_engagement_rate)
scheduled_tweets (id, user_id, content, media_paths, scheduled_time, status, posted_at)

-- SERVICES
scheduled_tasks (id, task_name, task_type, schedule, enabled, last_run, next_run)
task_executions (id, task_name, started_at, completed_at, status, output, error)
user_settings (id, user_id, setting_key, setting_value, updated_at)
```

## Security Model

### Encryption
```
Credentials: AES-256-GCM
  - Master Key: 32 bytes (ENCRYPTION_KEY env)
  - IV: 12 random bytes per credential
  - Tag: 16 bytes authentication

Passwords: bcrypt
  - Cost factor: 12
  - Salt: Built-in
```

### Authentication Flow
```
1. POST /api/v1/auth/login
   └─> bcrypt.verify(password, hash)
   └─> Create session token (secrets.token_urlsafe)
   └─> Set chirp_token HttpOnly cookie
   └─> Return user + permissions

2. Protected Route Access
   └─> Middleware reads chirp_token cookie
   └─> Validate session in user_sessions table
   └─> Check expiration
   └─> Return 401 or proceed

3. Step-Up Auth (Destructive Ops)
   └─> User types confirmation phrase
   └─> POST /api/v1/danger/confirm
   └─> Return single-use danger_token (5 min TTL)
   └─> Include X-Danger-Token header
```

## Improvement Suggestions

### P0: Critical Fixes

| Issue | Current State | Suggested Fix |
|-------|---------------|---------------|
| Cleanup stubs | `_fetch_user_tweets()` returns [] | Implement with twscrape |
| Cleanup stubs | `_delete_tweet()` returns True | Implement real deletion |
| 10 failing tests | Schema mismatches | Fix test fixtures |

### P1: Architecture Improvements

| Area | Current | Suggested |
|------|---------|-----------|
| Connectors | Hard-coded Twitter/Bluesky | Abstract connector interface |
| Rate limiting | Per-component | Centralized RateLimiter service |
| Queue | SQLite-backed | Redis for better concurrency |
| Cache | None | Redis cache for API responses |

### P2: Future Enhancements

| Enhancement | Benefit |
|-------------|---------|
| Event sourcing | Better audit trail, replay capability |
| CQRS | Separate read/write models for analytics |
| GraphQL | Flexible queries for frontend |
| WebSocket | Real-time sync progress |

## Dependency Graph

```
main.py
├── user_manager
│   └── security_utils
│       └── db_handler
├── credential_manager
│   ├── security_utils
│   └── db_handler
├── user_settings
│   └── db_handler
├── twitter_scraper
│   ├── config
│   └── db_handler
└── bluesky_handler
    └── config

cleanup_engine
├── credential_manager
├── db_handler
└── twitter_scraper (future)

tweet_scheduler
├── credential_manager
├── twitter_api_handler
└── task_scheduler
    └── db_handler
```

## Configuration Checklist

For new deployments, verify:

- [ ] `ENCRYPTION_KEY` - 32 bytes, secure random
- [ ] `DATABASE_PATH` - Writable location
- [ ] `TWITTER_USERNAME`, `TWITTER_PASSWORD` - twscrape credentials
- [ ] `BSKY_USERNAME`, `BSKY_PASSWORD` - Bluesky credentials
- [ ] `LOG_LEVEL` - INFO or DEBUG
- [ ] `POLL_INTERVAL` - 25920 (7.2 hours default)

## Rate Limiting Strategy

### Platform Rate Limits (Sprint 8 Critical)

| Platform | Operation | Limit | Window |
|----------|-----------|-------|--------|
| Twitter (twscrape) | Read tweets | 900 | 15 min |
| Twitter (twscrape) | Delete tweet | 50 | 15 min |
| Bluesky (AT Proto) | Read timeline | 3000 | 5 min |
| Bluesky (AT Proto) | Create/Delete | 1500 | hour |

### Implementation Pattern

```python
from functools import wraps
from time import time, sleep
from collections import defaultdict

class RateLimiter:
    """Centralized rate limiter for all platform operations."""

    def __init__(self):
        self.windows: Dict[str, List[float]] = defaultdict(list)
        self.limits = {
            'twitter.read': (900, 900),      # 900 req / 900 sec
            'twitter.delete': (50, 900),     # 50 req / 900 sec
            'bluesky.read': (3000, 300),     # 3000 req / 300 sec
            'bluesky.write': (1500, 3600),   # 1500 req / hour
        }

    def acquire(self, operation: str) -> bool:
        """Returns True if operation allowed, False if rate limited."""
        limit, window = self.limits.get(operation, (100, 60))
        now = time()

        # Clean old entries
        self.windows[operation] = [
            t for t in self.windows[operation] if now - t < window
        ]

        if len(self.windows[operation]) >= limit:
            return False

        self.windows[operation].append(now)
        return True

    def wait_time(self, operation: str) -> float:
        """Returns seconds to wait before operation is allowed."""
        limit, window = self.limits.get(operation, (100, 60))
        if not self.windows[operation]:
            return 0
        oldest = min(self.windows[operation])
        return max(0, window - (time() - oldest))

# Usage in cleanup_engine.py
rate_limiter = RateLimiter()

async def _delete_tweet(self, tweet_id: str) -> bool:
    if not rate_limiter.acquire('twitter.delete'):
        wait = rate_limiter.wait_time('twitter.delete')
        await asyncio.sleep(wait)
    return await self._twitter_client.delete(tweet_id)
```

### Backoff Strategy

```python
BACKOFF_CONFIG = {
    'initial_delay': 1.0,
    'max_delay': 300.0,       # 5 minutes max
    'multiplier': 2.0,
    'jitter': 0.1,            # 10% randomness
}

async def with_retry(operation, max_attempts=5):
    delay = BACKOFF_CONFIG['initial_delay']
    for attempt in range(max_attempts):
        try:
            return await operation()
        except RateLimitError:
            if attempt == max_attempts - 1:
                raise
            jitter = delay * BACKOFF_CONFIG['jitter'] * random.random()
            await asyncio.sleep(delay + jitter)
            delay = min(delay * BACKOFF_CONFIG['multiplier'],
                       BACKOFF_CONFIG['max_delay'])
```

## Future Architecture Considerations

| Area | Current | Future (Sprint 14+) | Trigger |
|------|---------|---------------------|---------|
| Job Queue | APScheduler + SQLite | Redis + Celery | >100 users |
| Real-time | Polling | WebSocket + SSE fallback | Sprint 14 |
| Conflict Resolution | N/A (single platform) | Last-write-wins + manual merge | Sprint 16 |
| Data Archival | All in SQLite | Cold storage for >1yr tweets | >1M tweets |
| Caching | None | Redis cache (5min TTL) | API p95 >200ms |

## Anti-Patterns to Avoid

1. **Direct DB access from features**: Use db_handler methods
2. **Hardcoded credentials**: Use config.py or env vars
3. **Missing user_id scoping**: Always filter by user_id
4. **Sync API calls**: Use async where available
5. **Missing audit logging**: Log all sensitive operations

## Performance Considerations

| Operation | Current | Target | Optimization |
|-----------|---------|--------|--------------|
| Tweet fetch | ~2s | <1s | Batch requests |
| Search | ~500ms | <100ms | FTS5 indexes |
| Cleanup preview | ~3s | <1s | Paginated queries |
| Dashboard load | ~1.5s | <500ms | Server components |

## Related Skills

- `chirp-architecture.md` - High-level overview
- `chirp-database.md` - Schema details
- `chirp-connector-framework.md` - Platform abstraction
- `chirp-open-social-hub.md` - Future vision
