# FRONTEND LIB

## OVERVIEW
API client and domain utilities (platform adapters, scheduling, feed rules).

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| API client | frontend/src/lib/api.ts | Central ApiClient
| Auth state | frontend/src/lib/auth.ts | zustand store
| Platform models | frontend/src/lib/connectors.ts | Canonical post + capabilities
| Feed rules | frontend/src/lib/feed-rules.ts | Client rule engine
| Scheduling | frontend/src/lib/scheduling.ts | Hooks for timing

## CONVENTIONS
- ApiClient methods mirror backend /api/v1 routes.
- Prefer lib helpers over ad-hoc fetch.

## ANTI-PATTERNS
- Avoid duplicating API types; keep them in api.ts or types/.
