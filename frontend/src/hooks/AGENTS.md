# FRONTEND HOOKS

## OVERVIEW
Custom hooks for data fetching, caching, and realtime updates.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Workspace | frontend/src/hooks/useWorkspace.ts | Manual fetch + cache
| Admin users | frontend/src/hooks/useAdminUsers.ts | React Query pattern
| Realtime | frontend/src/hooks/useRealtimeNotifications.ts | Socket events
| Sync progress | frontend/src/hooks/useSyncProgress.ts | Progress updates

## CONVENTIONS
- Manual hooks use mountedRef and module-level Map caches.
- Newer hooks use @tanstack/react-query with ApiClient.

## ANTI-PATTERNS
- Do not mix manual cache and react-query for the same data.
