# ChirpSyncer - Project Context

## Project Overview
ChirpSyncer is a bidirectional Twitter ↔ Bluesky synchronization platform with:
- Multi-user support with RBAC
- AES-256-GCM encrypted credential storage
- Analytics, scheduling, cleanup, search, bookmarks, reports
- Flask web dashboard (migrating to Next.js)

## Tech Stack
- **Language**: Python 3.11
- **Web Framework**: Flask (dashboard) → Next.js (target)
- **Database**: SQLite + FTS5
- **Twitter**: twscrape (scraping, no API keys)
- **Bluesky**: atproto library
- **Scheduler**: APScheduler
- **Security**: bcrypt, AES-256-GCM (cryptography lib)

## Project Structure
```
app/
├── auth/           # user_manager, credential_manager, decorators
├── core/           # config, db_handler, logger, utils
├── features/       # analytics, cleanup, search, scheduler, saved, reports
├── integrations/   # twitter_scraper, bluesky_handler, media_handler
├── services/       # task_scheduler, notifications, stats, user_settings
├── web/            # Flask dashboard routes
└── main.py         # Entry point

tests/
├── unit/
├── integration/
└── e2e/
```

## Key Design Principles
1. **Capabilities-first**: Never assume platform features; use explicit capabilities
2. **User-in-control**: No automatic actions without explicit confirmation
3. **Explainability**: ML only recommends and explains, never auto-publishes
4. **Step-up auth**: Dangerous actions require typed phrase + reason + audit
5. **UI honesty**: If something can't be done, don't show it or explain why
6. **Backend enforcement**: Validate permissions in API, not just UI
7. **Observability**: All runs and actions are auditable

## Current Status
- Sprint 7 complete (97.8% tests passing - 399/408)
- Sprint 8-9 pending: Cleanup API integration, Search filters, E2E tests

## Database Key Tables
- `users`, `user_sessions`, `user_credentials` (encrypted)
- `synced_posts`, `sync_stats`, `media_synced`
- `tweet_metrics`, `analytics_snapshots`
- `scheduled_tweets`, `cleanup_rules`, `cleanup_history`
- `tweet_search_index` (FTS5), `saved_tweets`, `collections`

## Testing
```bash
pytest tests/                    # All tests
pytest tests/unit/ -v            # Unit only
pytest --cov=app tests/          # With coverage
```

## Common Tasks
```bash
# Run dashboard
python -m app.web.dashboard

# Run sync
python -m app.main

# Database migrations
python -c "from app.core.db_handler import migrate_database; migrate_database()"
```

## Security Notes
- Never commit `.env` files
- Credentials encrypted with AES-256-GCM
- Passwords hashed with bcrypt (cost=12)
- CSRF protection on all forms
- Rate limiting on auth endpoints

## API Patterns
All API responses follow:
```python
{
    "success": bool,
    "data": {...} | [...],
    "error": "message" | None,
    "correlation_id": "uuid"  # for audit trail
}
```

## Skills Available
- `chirp-architecture`: Analyze and plan architectural changes
- `chirp-api-design`: Design REST/WebSocket APIs
- `chirp-database`: Database schema design and migrations
- `chirp-testing`: Test strategy and implementation
