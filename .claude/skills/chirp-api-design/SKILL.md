---
name: ChirpSyncer API Design
description: REST API and WebSocket endpoint design patterns
category: api
triggers:
  - new API endpoint
  - endpoint modification
  - WebSocket events
  - API documentation
  - response format design
  - route
  - REST
  - HTTP status
  - step-up auth
auto_trigger: after_api_change
dependencies:
  - app/web/dashboard.py
  - docs/API.md
  - chirp-api-contracts.md
  - chirp-database.md
version: "1.1"
sprint_relevant: all
---

# Skill: ChirpSyncer API Design

Use this skill when designing new API endpoints, WebSocket events, or modifying existing APIs.

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Base Path | `/api/v1/` |
| Auth | JWT in HttpOnly cookie |
| Response | `{ data, meta?, error? }` |
| Errors | Standard codes with correlationId |

## Standard Response Format

```typescript
// Success
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    correlationId?: string;
  };
}

// Error
interface ApiError {
  error: {
    code: string;          // e.g., "VALIDATION_ERROR"
    message: string;       // User-friendly
    details?: Record<string, string>;
    correlationId: string;
  };
}
```

## Authentication

- JWT tokens in HttpOnly cookies
- Decorators: `@require_auth`, `@require_admin`, `@require_self_or_admin`
- CSRF tokens on all forms
- Rate limiting on sensitive endpoints

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async operation) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Business logic error |
| 429 | Rate limited |
| 500 | Server error |

## Current Endpoints

### Auth
```
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/register
GET  /api/v1/auth/me
POST /api/v1/auth/token/refresh
```

### Credentials
```
GET    /api/v1/credentials
POST   /api/v1/credentials
PUT    /api/v1/credentials/:id
DELETE /api/v1/credentials/:id
POST   /api/v1/credentials/:id/test
```

### Sync
```
GET  /api/v1/sync/history
GET  /api/v1/sync/stats
POST /api/v1/sync/trigger
```

### Cleanup (Step-Up Auth)
```
GET  /api/v1/cleanup/rules
POST /api/v1/cleanup/rules
GET  /api/v1/cleanup/preview/:id
POST /api/v1/cleanup/execute/:id  # Requires step-up
GET  /api/v1/cleanup/history
```

### Analytics
```
GET /api/v1/analytics/overview
GET /api/v1/analytics/top-tweets
```

## Step-Up Auth Pattern

For dangerous actions (cleanup execute, bulk delete):

```typescript
interface StepUpRequest {
  stepUp: {
    confirmPhrase: string;  // Must match expected
    reason: string;         // Required, logged to audit
  };
}
```

## WebSocket Events (Future)

```json
{
  "event": "sync:progress" | "task:completed" | "notification",
  "data": {...},
  "timestamp": "ISO8601",
  "correlationId": "uuid"
}
```

## API Design Checklist

When designing new endpoints:

- [ ] Follow RESTful conventions
- [ ] Include correlationId in response
- [ ] Add proper auth decorator
- [ ] Validate input with explicit errors
- [ ] Log to audit_log for sensitive ops
- [ ] Consider rate limiting
- [ ] Document in `docs/API.md`
- [ ] Add to `CHIRP_NEXT_DASHBOARD_SPEC.md`

## Output Format

```markdown
## Endpoint: [METHOD] /api/v1/path

### Purpose
[What this endpoint does]

### Auth
- Required: Yes/No
- Roles: admin, user, or both
- Step-Up: Required for dangerous actions

### Request
```json
{ "field": "type and description" }
```

### Response
```json
{ "data": {...} }
```

### Errors
| Code | Condition |
|------|-----------|
| 400 | ... |

### Audit
- Logged: Yes/No
- Event type: [action name]
```

## Related Skills

- `chirp-architecture.md` - System design
- `chirp-database.md` - Data layer
- `chirp-api-contracts.md` - Full API specification
