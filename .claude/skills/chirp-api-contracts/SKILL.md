---
name: chirp-api-contracts
description: Complete API endpoint specifications with request/response schemas
---

# Skill: ChirpSyncer API Contracts v1.1

Use this skill when integrating with API endpoints, understanding request/response formats, or implementing API calls.

## Quick Reference

| Aspect | Standard |
|--------|----------|
| Base URL | `http://localhost:5000/api/v1` |
| Auth | JWT in `chirp_token` HttpOnly cookie |
| Step-Up Auth | `X-Danger-Token` header for destructive ops |
| Content-Type | `application/json` |
| Credentials | `include` (for cookies) |

## Standard Formats

### Success Response

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    correlationId?: string;
  };
}
```

### Error Response

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    correlationId: string;
  };
}
```

### Error Taxonomy

Standardized error codes by category:

| Category | Code Pattern | HTTP Status | Examples |
|----------|-------------|-------------|----------|
| **Authentication** | `AUTH_*` | 401 | `AUTH_INVALID_CREDENTIALS`, `AUTH_SESSION_EXPIRED`, `AUTH_TOKEN_INVALID` |
| **Authorization** | `AUTHZ_*` | 403 | `AUTHZ_PERMISSION_DENIED`, `AUTHZ_ROLE_REQUIRED` |
| **Validation** | `VALIDATION_*` | 400 | `VALIDATION_REQUIRED_FIELD`, `VALIDATION_INVALID_FORMAT`, `VALIDATION_OUT_OF_RANGE` |
| **Rate Limiting** | `RATE_LIMIT_*` | 429 | `RATE_LIMIT_EXCEEDED`, `RATE_LIMIT_PLATFORM_QUOTA` |
| **Platform** | `PLATFORM_*` | 502/503 | `PLATFORM_UNAVAILABLE`, `PLATFORM_AUTH_FAILED`, `PLATFORM_RATE_LIMITED` |
| **Resource** | `RESOURCE_*` | 404/409 | `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`, `RESOURCE_DELETED` |
| **Step-Up** | `DANGER_*` | 401/400 | `DANGER_TOKEN_REQUIRED`, `DANGER_TOKEN_EXPIRED`, `DANGER_PHRASE_MISMATCH` |
| **Internal** | `INTERNAL_*` | 500 | `INTERNAL_ERROR`, `INTERNAL_DB_ERROR` |

```typescript
// Error handling pattern
try {
  await apiClient('/api/v1/cleanup/execute/123', { method: 'POST' });
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'DANGER_TOKEN_REQUIRED':
        // Show step-up auth modal
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Show retry message with backoff
        break;
      case 'PLATFORM_UNAVAILABLE':
        // Show platform status message
        break;
      default:
        // Generic error handling
    }
  }
}
```

## Authentication

### POST /api/v1/auth/login

```typescript
// Request
interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

// Response 200
interface LoginResponse {
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      roles: string[];
    };
    expiresAt: string;
  };
}
// Sets: chirp_token cookie
```

### GET /api/v1/auth/me

```typescript
// Response 200
interface MeResponse {
  data: {
    id: number;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];  // Derived from roles
    createdAt: string;
    lastLoginAt: string;
  };
}

// Permissions (RBAC)
type Permission =
  | 'canViewDashboard'
  | 'canManageCredentials'
  | 'canTriggerSync'
  | 'canViewCleanupRules'
  | 'canEditCleanupRules'
  | 'canExecuteCleanup'      // Requires step-up
  | 'canSchedulePosts'
  | 'canViewAnalytics'
  | 'canExportData'
  | 'canViewAuditLog'
  | 'canManageUsers';
```

## Credentials

### GET /api/v1/credentials

```typescript
interface Credential {
  id: number;
  platform: 'twitter' | 'bluesky';
  credentialType: 'scraping' | 'api' | 'oauth';
  identifier: string;
  displayName: string;
  status: 'active' | 'inactive' | 'error';
  statusMessage?: string;
  lastUsedAt?: string;
  createdAt: string;
}

// Response 200
interface CredentialsResponse {
  data: Credential[];
  meta: { total: number };
}
```

### POST /api/v1/credentials

```typescript
// Request
interface CreateCredentialRequest {
  platform: 'twitter' | 'bluesky';
  credentialType: 'scraping' | 'api';
  identifier: string;
  secret: string;
  displayName?: string;
}

// Response 201
{ data: Credential }
```

### POST /api/v1/credentials/:id/test

```typescript
// Response 200
interface TestResult {
  data: {
    success: boolean;
    message: string;
    testedAt: string;
  };
}
```

## Platforms

### GET /api/v1/platforms

```typescript
interface Platform {
  name: string;
  displayName: string;
  enabled: boolean;
  capabilities: {
    canPost: boolean;
    canReadTimeline: boolean;
    canDeleteOwnPosts: boolean;
    supportsImages: boolean;
    supportsVideos: boolean;
    maxTextLength: number;
    authMethod: string;
  };
}

// Response 200
{ data: Platform[] }
```

## Sync

### GET /api/v1/sync/stats

```typescript
// Response 200
interface SyncStats {
  data: {
    today: { synced: number; failed: number };
    week: { synced: number; failed: number };
    total: { synced: number; failed: number };
    lastSync: {
      at: string;
      status: string;
      itemsSynced: number;
    };
    nextSync: {
      at: string;
      scheduledBy: 'automatic' | 'manual';
    };
  };
}
```

### GET /api/v1/sync/history

```typescript
// Query: ?page=1&pageSize=20&status=success|error|partial

interface SyncRecord {
  id: number;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'error' | 'partial';
  itemsSynced: number;
  itemsFailed: number;
  errorMessage?: string;
  correlationId: string;
}

// Response 200
{
  data: SyncRecord[];
  meta: { page, pageSize, total }
}
```

### POST /api/v1/sync/trigger

```typescript
// Request
{ credentialId?: number }

// Response 202
{
  data: {
    syncId: number;
    status: 'queued';
    correlationId: string;
  }
}
```

## Cleanup

### GET /api/v1/cleanup/rules

```typescript
interface CleanupRule {
  id: number;
  name: string;
  description?: string;
  type: 'age' | 'engagement' | 'pattern';
  config: AgeConfig | EngagementConfig | PatternConfig;
  enabled: boolean;
  lastRunAt?: string;
  lastRunCount?: number;
  createdAt: string;
}

interface AgeConfig {
  olderThanDays: number;
  excludeWithMedia?: boolean;
}

interface EngagementConfig {
  maxLikes: number;
  maxRetweets: number;
  olderThanDays?: number;
}

interface PatternConfig {
  pattern: string;
  matchType: 'contains' | 'startsWith' | 'regex';
}

// Response 200
{ data: CleanupRule[] }
```

### GET /api/v1/cleanup/preview/:id

```typescript
interface PreviewTweet {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  hasMedia: boolean;
}

// Response 200
{
  data: {
    ruleId: number;
    ruleName: string;
    matchingTweets: PreviewTweet[];
    totalCount: number;
    previewLimit: number;
  }
}
```

### POST /api/v1/cleanup/execute/:id (Step-Up Required)

Requires `X-Danger-Token` header. See Step-Up Authentication section.

```typescript
// Request Headers
// X-Danger-Token: {danger_token from /api/v1/danger/confirm}

// Request Body
interface ExecuteRequest {
  dryRun?: boolean;
}

// Response 202
{
  data: {
    executionId: number;
    status: 'queued' | 'running';
    dryRun: boolean;
    estimatedCount: number;
    correlationId: string;
  }
}

// Response 401 (missing or invalid danger_token)
{
  error: {
    code: 'DANGER_TOKEN_REQUIRED',
    message: 'This action requires step-up authentication',
    correlationId: string
  }
}
```

## Step-Up Authentication (Danger Token)

For destructive operations (cleanup execution, bulk deletes, credential deletion), the UI must first obtain a `danger_token`.

### POST /api/v1/danger/confirm

```typescript
// Request
interface DangerConfirmRequest {
  action: 'cleanup.execute' | 'credential.delete' | 'bulk.delete';
  targetId?: string;
  confirmPhrase: string;  // User must type exact phrase
  reason: string;         // Required for audit
}

// Response 200
interface DangerConfirmResponse {
  data: {
    danger_token: string;   // Single-use JWT
    expiresIn: 300;         // 5 minutes
    correlationId: string;
  };
}

// Response 400 (phrase mismatch)
{
  error: {
    code: 'STEP_UP_FAILED',
    message: 'Confirmation phrase does not match',
    correlationId: string
  }
}
```

### Usage Flow

```typescript
// 1. User clicks "Execute Cleanup"
// 2. Show DangerConfirm modal with phrase "DELETE 47 TWEETS"
// 3. User types phrase + reason
// 4. Call POST /api/v1/danger/confirm
// 5. Use returned danger_token in X-Danger-Token header
// 6. Call POST /api/v1/cleanup/execute/:id

const { data } = await apiClient('/api/v1/danger/confirm', {
  method: 'POST',
  body: JSON.stringify({
    action: 'cleanup.execute',
    targetId: ruleId,
    confirmPhrase: 'DELETE 47 TWEETS',
    reason: 'Monthly cleanup per policy'
  })
});

await apiClient(`/api/v1/cleanup/execute/${ruleId}`, {
  method: 'POST',
  headers: {
    'X-Danger-Token': data.danger_token
  }
});
```

## Scheduler

### GET /api/v1/scheduler/tweets

```typescript
// Query: ?status=pending|published|failed|cancelled

interface ScheduledTweet {
  id: number;
  content: string;
  scheduledFor: string;
  platform: 'twitter' | 'bluesky';
  credentialId: number;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  publishedAt?: string;
  errorMessage?: string;
}

// Response 200
{
  data: ScheduledTweet[];
  meta: { page, pageSize, total }
}
```

### POST /api/v1/scheduler/tweets

```typescript
// Request
{
  content: string;
  scheduledFor: string;  // ISO datetime, must be future
  platform: 'twitter' | 'bluesky';
  credentialId: number;
}

// Response 201
{ data: ScheduledTweet }
```

## Analytics

### GET /api/v1/analytics/overview

```typescript
// Query: ?period=24h|7d|30d|90d

// Response 200
{
  data: {
    period: string;
    tweets: { total, synced, deleted };
    engagement: { likes, retweets, replies };
    chart: {
      labels: string[];
      datasets: {
        synced: number[];
        deleted: number[];
      };
    };
  }
}
```

### GET /api/v1/analytics/top-tweets

```typescript
// Query: ?period=7d&metric=likes|retweets|engagement&limit=10

interface TopTweet {
  id: string;
  text: string;
  platform: string;
  createdAt: string;
  likes: number;
  retweets: number;
  engagementRate: number;
  url: string;
}

// Response 200
{ data: TopTweet[] }
```

## Search

### GET /api/v1/search

```typescript
// Query: ?q=term&platform=twitter&dateFrom=&dateTo=&minLikes=&page=&pageSize=

interface SearchResult {
  id: string;
  text: string;
  textHighlight: string;  // With <mark> tags
  platform: string;
  createdAt: string;
  likes: number;
  url: string;
}

// Response 200
{
  data: SearchResult[];
  meta: {
    query: string;
    total: number;
    took: number;  // ms
  }
}
```

## Audit

### GET /api/v1/audit

```typescript
// Query: ?action=&userId=&correlationId=&dateFrom=&dateTo=

interface AuditEntry {
  id: number;
  action: string;
  userId: number;
  username: string;
  details: Record<string, any>;
  reason?: string;
  correlationId: string;
  ipAddress: string;
  createdAt: string;
}

// Response 200
{
  data: AuditEntry[];
  meta: { page, pageSize, total }
}
```

## API Client Pattern

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.error.code, error.error.message);
  }

  return response.json();
}

// Usage
const { data: credentials } = await apiClient<Credential[]>('/api/v1/credentials');
```

## Related Skills

- `chirp-api-design.md` - API design patterns
- `chirp-nextjs-migration.md` - Frontend integration
