# APP BACKEND

## OVERVIEW
Backend for sync engine, API, and core services (Flask + Celery + SQLite).

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Sync orchestration | app/services/sync_runner.py | Legacy runner
| Core utilities | app/core/ | DB, cache, events, logging
| Features | app/features/ | Scheduler, analytics, cleanup, search
| Protocol connectors | app/protocols/ | CanonicalPost + registry
| Integrations | app/integrations/ | Raw platform adapters
| Auth | app/auth/ | JWT + session auth
| Web UI + API | app/web/ | Flask dashboard and API v1

## CONVENTIONS
- Most business functions take user_id for isolation.
- API endpoints return api_response/api_error from app/web/api/v1/responses.py.
- Background work uses Celery configured in app/core/celery_app.py.

## ANTI-PATTERNS
- Avoid adding new sync logic directly in app/main.py; route through services/protocols.

## UNIQUE STYLES
- Legacy sync path in services alongside protocol-based connectors in app/protocols.
