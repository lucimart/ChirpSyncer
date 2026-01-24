# APP SERVICES

## OVERVIEW
Service-level orchestration for sync and background work.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Legacy sync runner | app/services/sync_runner.py | Main orchestrator
| Task glue | app/tasks/ | Celery task wrappers

## CONVENTIONS
- Service functions typically accept user_id and db_path.
- Use log_audit for user-visible events.

## ANTI-PATTERNS
- Avoid mixing API request handling logic into services.
