# APP CORE

## OVERVIEW
Shared infrastructure utilities (SQLite, caching, logging, events, config).

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| DB access + dedupe | app/core/db_handler.py | should_sync_post, migrations
| Content hashing | app/core/utils.py | compute_content_hash
| Caching | app/core/cache.py | Redis @cached decorator
| Events | app/core/events.py | Sync/Cleanup progress types
| Logging | app/core/logger.py | setup_logger with rotation
| Celery | app/core/celery_app.py | Redis broker/backend

## CONVENTIONS
- Dedupe checks go through should_sync_post before syncing.
- Emit progress updates using types in events.py.

## ANTI-PATTERNS
- Do not bypass db_handler for sync dedupe checks.
