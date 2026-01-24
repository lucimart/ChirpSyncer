# APP FEATURES

## OVERVIEW
Feature modules (scheduler, analytics, cleanup, search) with their own tables.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Scheduler | app/features/tweet_scheduler.py | Scheduled posts
| Analytics | app/features/analytics_tracker.py | Metrics + snapshots
| Cleanup | app/features/cleanup_engine.py | Rules + history
| Search | app/features/search_engine.py | FTS5 index
| Saved content | app/features/saved_content.py | Bookmarks + collections

## CONVENTIONS
- Features are class-based managers with explicit table creation.
- Tables are scoped by user_id.

## ANTI-PATTERNS
- Avoid duplicating table schemas across features when shared tables exist.
