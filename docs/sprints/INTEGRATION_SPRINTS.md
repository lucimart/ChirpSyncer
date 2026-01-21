# Integration Sprints - Frontend ? Backend Connectivity

> **Purpose**: Bridge the gap between Next.js frontend (Sprints 14-21) and Flask backend (Sprints 1-7)
> **Context**: Analysis revealed 30+ missing API endpoints and 15+ orphaned components
> **Methodology**: TDD-first with multi-agent implementation

---

## Executive Summary

### The Problem
The frontend expects modern JSON APIs (`/api/v1/*`), but the backend serves HTML templates.
This creates a **non-functional application** where:
- Login fails (no JSON auth endpoint)
- Dashboard shows infinite loading (no stats endpoint)
- Credentials page crashes (HTML instead of JSON)
- Feed Lab components exist but no page displays them
- Workspace feature has zero backend support

### The Solution
4 Integration Sprints to connect everything:

| Sprint | Focus | Priority | Dependencies |
|--------|-------|----------|--------------|
| **I1** | Core API Layer (Auth + Base) | P0 - Blocking | None |
| **I2** | Dashboard Integration | P0 - Blocking | I1 |
| **I3** | Feed Lab Integration | P1 - High | I1, I2 |
| **I4** | Cleanup & Decision | P2 - Medium | I1-I3 |

---

## Sprint I1: Core API Layer

### Objective
Create the foundational JSON API layer that the frontend expects.

### Duration
1-2 sessions (focused)

### User Stories

#### US-I1-001: JSON Authentication API
**As a** frontend user, **I want** to authenticate via JSON API **so that** I can login without page reloads.

**Acceptance Criteria:**
- [ ] `POST /api/v1/auth/login` accepts `{username, password}`, returns `{token, user}`
- [ ] `POST /api/v1/auth/logout` invalidates session, returns `{success: true}`
- [ ] `POST /api/v1/auth/register` creates user, returns `{user, token}`
- [ ] `GET /api/v1/auth/me` returns current user or 401
- [ ] JWT tokens with 24h expiry
- [ ] HttpOnly cookie option for token storage

**Sprint:** I1 | **Priority:** P0 | **Status:** TODO

---

#### US-I1-002: Dashboard Stats API
**As a** user, **I want** to see my dashboard statistics **so that** I understand my sync status at a glance.

**Acceptance Criteria:**
- [ ] `GET /api/v1/dashboard/stats` returns aggregated stats
- [ ] Response includes: `synced_today`, `synced_week`, `total_synced`, `platforms_connected`
- [ ] Response includes: `last_sync_at`, `next_sync_at`
- [ ] Response includes: `storage_used_mb`, `tweets_archived`
- [ ] Cached for 1 minute (performance)

**Sprint:** I1 | **Priority:** P0 | **Status:** TODO

---

#### US-I1-003: API Error Standardization
**As a** frontend developer, **I want** consistent API error responses **so that** I can handle errors uniformly.

**Acceptance Criteria:**
- [ ] All errors return `{success: false, error: {code, message, details?}}`
- [ ] HTTP status codes used correctly (400, 401, 403, 404, 500)
- [ ] Correlation ID in all responses for debugging
- [ ] Error codes documented in `docs/API.md`

**Sprint:** I1 | **Priority:** P0 | **Status:** TODO

---

### Technical Tasks

#### TASK-I1-01: Create API Blueprint
**Story:** US-I1-001, US-I1-003 | **Priority:** P0 | **Estimate:** M

**Description:**
Create Flask Blueprint for `/api/v1/` with JSON-only responses.

**Files:**
- `app/web/api/__init__.py` (new)
- `app/web/api/v1/__init__.py` (new)
- `app/web/api/v1/auth.py` (new)
- `app/web/api/v1/dashboard.py` (new)

**Implementation:**
```python
# app/web/api/v1/__init__.py
from flask import Blueprint

api_v1 = Blueprint('api_v1', __name__, url_prefix='/api/v1')

# Register sub-blueprints
from .auth import auth_bp
from .dashboard import dashboard_bp

api_v1.register_blueprint(auth_bp)
api_v1.register_blueprint(dashboard_bp)

# JSON error handler
@api_v1.errorhandler(Exception)
def handle_error(error):
    return {
        'success': False,
        'error': {
            'code': getattr(error, 'code', 'INTERNAL_ERROR'),
            'message': str(error)
        },
        'correlation_id': g.get('correlation_id')
    }, getattr(error, 'status_code', 500)
```

**Tests (TDD):**
```python
# tests/unit/test_api_v1_base.py
def test_api_returns_json_on_error():
    response = client.get('/api/v1/nonexistent')
    assert response.content_type == 'application/json'
    assert response.json['success'] == False
    assert 'correlation_id' in response.json
```

**Acceptance:**
- [ ] Blueprint registered at `/api/v1/`
- [ ] All responses are JSON
- [ ] Error handler catches all exceptions
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I1-02: Implement Auth Endpoints
**Story:** US-I1-001 | **Priority:** P0 | **Estimate:** L

**Description:**
Implement JSON authentication endpoints.

**Files:**
- `app/web/api/v1/auth.py`
- `app/auth/jwt_handler.py` (new)

**Implementation:**
```python
# app/web/api/v1/auth.py
from flask import Blueprint, request, jsonify
from app.auth.user_manager import UserManager
from app.auth.jwt_handler import create_token, verify_token

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = UserManager().authenticate(username, password)
    if not user:
        return {'success': False, 'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Invalid username or password'}}, 401

    token = create_token(user.id, user.username, user.is_admin)

    return {
        'success': True,
        'data': {
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'is_admin': user.is_admin,
                'created_at': user.created_at.isoformat()
            }
        }
    }

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    return {
        'success': True,
        'data': {
            'id': g.user.id,
            'username': g.user.username,
            'is_admin': g.user.is_admin
        }
    }
```

**Tests (TDD):**
```python
# tests/unit/test_api_v1_auth.py
class TestAuthAPI:
    def test_login_success(self, client, test_user):
        response = client.post('/api/v1/auth/login', json={
            'username': 'testuser',
            'password': 'testpass'
        })
        assert response.status_code == 200
        assert response.json['success'] == True
        assert 'token' in response.json['data']
        assert 'user' in response.json['data']

    def test_login_invalid_credentials(self, client):
        response = client.post('/api/v1/auth/login', json={
            'username': 'wrong',
            'password': 'wrong'
        })
        assert response.status_code == 401
        assert response.json['success'] == False
        assert response.json['error']['code'] == 'INVALID_CREDENTIALS'

    def test_me_requires_auth(self, client):
        response = client.get('/api/v1/auth/me')
        assert response.status_code == 401

    def test_me_returns_user(self, client, auth_headers):
        response = client.get('/api/v1/auth/me', headers=auth_headers)
        assert response.status_code == 200
        assert 'username' in response.json['data']
```

**Acceptance:**
- [ ] Login returns token and user
- [ ] Logout invalidates session
- [ ] Register creates user
- [ ] /me requires valid token
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I1-03: Implement JWT Handler
**Story:** US-I1-001 | **Priority:** P0 | **Estimate:** S

**Description:**
Create JWT token creation and verification.

**Files:**
- `app/auth/jwt_handler.py` (new)

**Implementation:**
```python
# app/auth/jwt_handler.py
import jwt
from datetime import datetime, timedelta
from app.core.config import settings

def create_token(user_id: int, username: str, is_admin: bool = False) -> str:
    payload = {
        'sub': user_id,
        'username': username,
        'is_admin': is_admin,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')

def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise AuthError('TOKEN_EXPIRED', 'Token has expired')
    except jwt.InvalidTokenError:
        raise AuthError('INVALID_TOKEN', 'Invalid token')
```

**Tests (TDD):**
```python
# tests/unit/test_jwt_handler.py
def test_create_token():
    token = create_token(1, 'testuser', False)
    assert isinstance(token, str)
    assert len(token) > 0

def test_verify_valid_token():
    token = create_token(1, 'testuser', True)
    payload = verify_token(token)
    assert payload['sub'] == 1
    assert payload['username'] == 'testuser'
    assert payload['is_admin'] == True

def test_verify_expired_token():
    # Create token with negative expiry
    with pytest.raises(AuthError) as exc:
        verify_token('expired.token.here')
    assert exc.value.code == 'INVALID_TOKEN'
```

**Acceptance:**
- [ ] Token creation works
- [ ] Token verification works
- [ ] Expiry enforced
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I1-04: Implement Dashboard Stats Endpoint
**Story:** US-I1-002 | **Priority:** P0 | **Estimate:** M

**Description:**
Create endpoint for dashboard statistics.

**Files:**
- `app/web/api/v1/dashboard.py` (new)
- `app/services/stats_service.py`

**Implementation:**
```python
# app/web/api/v1/dashboard.py
from flask import Blueprint
from app.services.stats_service import StatsService

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@require_auth
def get_stats():
    stats = StatsService().get_user_stats(g.user.id)
    return {
        'success': True,
        'data': {
            'synced_today': stats.synced_today,
            'synced_week': stats.synced_week,
            'total_synced': stats.total_synced,
            'platforms_connected': stats.platforms_connected,
            'last_sync_at': stats.last_sync_at.isoformat() if stats.last_sync_at else None,
            'next_sync_at': stats.next_sync_at.isoformat() if stats.next_sync_at else None,
            'storage_used_mb': stats.storage_used_mb,
            'tweets_archived': stats.tweets_archived
        }
    }
```

**Tests (TDD):**
```python
# tests/unit/test_api_v1_dashboard.py
def test_stats_requires_auth(client):
    response = client.get('/api/v1/dashboard/stats')
    assert response.status_code == 401

def test_stats_returns_expected_fields(client, auth_headers):
    response = client.get('/api/v1/dashboard/stats', headers=auth_headers)
    assert response.status_code == 200
    data = response.json['data']
    assert 'synced_today' in data
    assert 'synced_week' in data
    assert 'total_synced' in data
    assert 'platforms_connected' in data
```

**Acceptance:**
- [ ] Returns all expected fields
- [ ] Requires authentication
- [ ] Performance < 100ms
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I1-05: Update Frontend API Client
**Story:** US-I1-001, US-I1-002 | **Priority:** P0 | **Estimate:** S

**Description:**
Update frontend API client to use new `/api/v1/` endpoints.

**Files:**
- `frontend/src/lib/api.ts`

**Changes:**
```typescript
// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiClient {
  // Update all endpoint paths
  async login(username: string, password: string): Promise<ApiResponse<Session>> {
    return this.request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }
}
```

**Tests (TDD):**
```typescript
// frontend/src/__tests__/unit/api-client.test.ts
describe('ApiClient', () => {
  it('calls /api/v1/auth/login', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ success: true, data: { token: 'abc', user: {} } }));
    await api.login('user', 'pass');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.any(Object));
  });
});
```

**Acceptance:**
- [ ] All endpoints use `/api/v1/`
- [ ] Types match backend response
- [ ] Tests pass

**Status:** TODO

---

## Sprint I2: Dashboard Integration

### Objective
Connect all existing dashboard pages to real backend APIs.

### Duration
2-3 sessions

### Dependencies
- Sprint I1 completed (auth working)

### User Stories

#### US-I2-001: Credentials JSON API
**As a** user, **I want** to manage credentials via API **so that** I can add/edit/delete without page reloads.

**Acceptance Criteria:**
- [ ] `GET /api/v1/credentials` returns list of user's credentials
- [ ] `POST /api/v1/credentials` creates new credential
- [ ] `DELETE /api/v1/credentials/:id` deletes credential
- [ ] `POST /api/v1/credentials/:id/test` tests credential connectivity
- [ ] Sensitive data (passwords, tokens) never returned in responses

**Sprint:** I2 | **Priority:** P0 | **Status:** TODO

---

#### US-I2-002: Sync Status API
**As a** user, **I want** to see sync status via API **so that** the dashboard shows real data.

**Acceptance Criteria:**
- [ ] `GET /api/v1/sync/stats` returns sync statistics
- [ ] `GET /api/v1/sync/history` returns paginated sync history
- [ ] `POST /api/v1/sync/start` triggers manual sync
- [ ] `GET /api/v1/sync/:id/status` returns specific sync job status

**Sprint:** I2 | **Priority:** P0 | **Status:** TODO

---

#### US-I2-003: Cleanup Rules API
**As a** user, **I want** to manage cleanup rules via API **so that** I can create/edit rules in the frontend.

**Acceptance Criteria:**
- [ ] `GET /api/v1/cleanup/rules` returns user's cleanup rules
- [ ] `POST /api/v1/cleanup/rules` creates new rule
- [ ] `PUT /api/v1/cleanup/rules/:id` updates rule
- [ ] `DELETE /api/v1/cleanup/rules/:id` deletes rule
- [ ] `POST /api/v1/cleanup/rules/:id/preview` returns matching tweets
- [ ] `POST /api/v1/cleanup/rules/:id/execute` runs cleanup (requires step-up)

**Sprint:** I2 | **Priority:** P0 | **Status:** TODO

---

#### US-I2-004: Bookmarks API
**As a** user, **I want** to manage bookmarks via API **so that** I can save/organize tweets.

**Acceptance Criteria:**
- [ ] `GET /api/v1/bookmarks` returns user's bookmarks
- [ ] `POST /api/v1/bookmarks` saves new bookmark
- [ ] `DELETE /api/v1/bookmarks/:id` removes bookmark
- [ ] `GET /api/v1/collections` returns user's collections
- [ ] `POST /api/v1/collections` creates collection
- [ ] `PUT /api/v1/bookmarks/:id/collection` moves bookmark to collection

**Sprint:** I2 | **Priority:** P1 | **Status:** TODO

---

#### US-I2-005: Analytics Real Data
**As a** user, **I want** analytics to show real data **so that** I see accurate engagement metrics.

**Acceptance Criteria:**
- [ ] Remove hardcoded mock data from analytics page
- [ ] Call `GET /api/v1/analytics/overview` instead
- [ ] Call `GET /api/v1/analytics/top-tweets` for top performers
- [ ] Period selector (24h, 7d, 30d) filters API call

**Sprint:** I2 | **Priority:** P1 | **Status:** TODO

---

### Technical Tasks

#### TASK-I2-01: Credentials API Endpoints
**Story:** US-I2-001 | **Priority:** P0 | **Estimate:** M

**Files:**
- `app/web/api/v1/credentials.py` (new)

**Tests (TDD):**
```python
# tests/unit/test_api_v1_credentials.py
class TestCredentialsAPI:
    def test_list_credentials(self, client, auth_headers, test_credential):
        response = client.get('/api/v1/credentials', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['data']) >= 1
        # Ensure password not exposed
        for cred in response.json['data']:
            assert 'password' not in cred
            assert 'api_secret' not in cred

    def test_create_credential(self, client, auth_headers):
        response = client.post('/api/v1/credentials',
            headers=auth_headers,
            json={'platform': 'twitter', 'username': 'test', 'password': 'secret'})
        assert response.status_code == 201
        assert response.json['data']['platform'] == 'twitter'

    def test_delete_credential(self, client, auth_headers, test_credential):
        response = client.delete(f'/api/v1/credentials/{test_credential.id}',
            headers=auth_headers)
        assert response.status_code == 200

    def test_test_credential(self, client, auth_headers, test_credential, mocker):
        mocker.patch('app.integrations.twitter_scraper.TwitterScraper.test_connection', return_value=True)
        response = client.post(f'/api/v1/credentials/{test_credential.id}/test',
            headers=auth_headers)
        assert response.status_code == 200
        assert response.json['data']['valid'] == True
```

**Acceptance:**
- [ ] CRUD operations work
- [ ] Sensitive data hidden
- [ ] Test connection works
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I2-02: Sync API Endpoints
**Story:** US-I2-002 | **Priority:** P0 | **Estimate:** M

**Files:**
- `app/web/api/v1/sync.py` (new)

**Tests (TDD):**
```python
# tests/unit/test_api_v1_sync.py
class TestSyncAPI:
    def test_get_sync_stats(self, client, auth_headers):
        response = client.get('/api/v1/sync/stats', headers=auth_headers)
        assert response.status_code == 200
        assert 'today' in response.json['data']
        assert 'week' in response.json['data']
        assert 'total' in response.json['data']

    def test_get_sync_history(self, client, auth_headers):
        response = client.get('/api/v1/sync/history', headers=auth_headers)
        assert response.status_code == 200
        assert 'items' in response.json['data']
        assert 'total' in response.json['data']
        assert 'page' in response.json['data']

    def test_start_sync(self, client, auth_headers, mocker):
        mocker.patch('app.services.sync_service.SyncService.start_sync', return_value='job-123')
        response = client.post('/api/v1/sync/start', headers=auth_headers)
        assert response.status_code == 202
        assert 'job_id' in response.json['data']
```

**Acceptance:**
- [ ] Stats endpoint works
- [ ] History with pagination
- [ ] Start sync returns job ID
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I2-03: Cleanup Rules API Endpoints
**Story:** US-I2-003 | **Priority:** P0 | **Estimate:** L

**Files:**
- `app/web/api/v1/cleanup.py` (new)

**Tests (TDD):**
```python
# tests/unit/test_api_v1_cleanup.py
class TestCleanupAPI:
    def test_list_rules(self, client, auth_headers, test_cleanup_rule):
        response = client.get('/api/v1/cleanup/rules', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['data']) >= 1

    def test_create_rule(self, client, auth_headers):
        response = client.post('/api/v1/cleanup/rules',
            headers=auth_headers,
            json={
                'name': 'Old tweets',
                'type': 'age',
                'config': {'days': 365},
                'enabled': True
            })
        assert response.status_code == 201

    def test_preview_requires_auth(self, client, test_cleanup_rule):
        response = client.post(f'/api/v1/cleanup/rules/{test_cleanup_rule.id}/preview')
        assert response.status_code == 401

    def test_execute_requires_danger_token(self, client, auth_headers, test_cleanup_rule):
        response = client.post(f'/api/v1/cleanup/rules/{test_cleanup_rule.id}/execute',
            headers=auth_headers)
        assert response.status_code == 403
        assert 'danger_token' in response.json['error']['message'].lower()
```

**Acceptance:**
- [ ] CRUD operations work
- [ ] Preview returns matching tweets
- [ ] Execute requires step-up auth
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I2-04: Bookmarks API Endpoints
**Story:** US-I2-004 | **Priority:** P1 | **Estimate:** M

**Files:**
- `app/web/api/v1/bookmarks.py` (new)

**Acceptance:**
- [ ] Bookmarks CRUD works
- [ ] Collections CRUD works
- [ ] Move bookmark to collection works
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I2-05: Fix Analytics Mock Data
**Story:** US-I2-005 | **Priority:** P1 | **Estimate:** S

**Files:**
- `frontend/src/app/dashboard/analytics/page.tsx`

**Changes:**
Replace mock data with real API calls using existing backend endpoints.

```typescript
// BEFORE (mock data)
const { data: analytics } = useQuery<AnalyticsData>({
  queryKey: ['analytics', period],
  queryFn: async () => {
    return { followers: { value: 12847, ... } }; // MOCK
  },
});

// AFTER (real API)
const { data: analytics } = useQuery<AnalyticsData>({
  queryKey: ['analytics', period],
  queryFn: async () => {
    const response = await api.getAnalyticsOverview(period);
    return response.data;
  },
});
```

**Acceptance:**
- [ ] No mock data in analytics page
- [ ] Real data from backend
- [ ] Period filter works
- [ ] Loading states work

**Status:** TODO

---

#### TASK-I2-06: Update Frontend Pages to Use Real APIs
**Story:** US-I2-001 to US-I2-004 | **Priority:** P0 | **Estimate:** L

**Files:**
- `frontend/src/app/dashboard/credentials/page.tsx`
- `frontend/src/app/dashboard/sync/page.tsx`
- `frontend/src/app/dashboard/cleanup/page.tsx`
- `frontend/src/app/dashboard/cleanup/[id]/page.tsx`
- `frontend/src/app/dashboard/bookmarks/page.tsx`

**Acceptance:**
- [ ] All pages use `/api/v1/` endpoints
- [ ] Error states handled
- [ ] Loading states shown
- [ ] No 404 errors

**Status:** TODO

---

## Sprint I3: Feed Lab Integration

### Objective
Connect Feed Lab components (Sprint 19-20) to pages and create backend APIs.

### Duration
2 sessions

### Dependencies
- Sprint I1 completed
- Sprint I2 completed

### User Stories

#### US-I3-001: Feed Lab Page
**As a** user, **I want** to access Feed Lab **so that** I can customize my feed algorithm.

**Acceptance Criteria:**
- [ ] New page at `/dashboard/feed-lab`
- [ ] Displays FeedPreview component
- [ ] Displays RuleBuilder component
- [ ] Displays RuleList component
- [ ] Navigation link in sidebar

**Sprint:** I3 | **Priority:** P1 | **Status:** TODO

---

#### US-I3-002: Feed Rules API
**As a** user, **I want** to manage feed rules via API **so that** my rules persist.

**Acceptance Criteria:**
- [ ] `GET /api/v1/feed-rules` returns user's feed rules
- [ ] `POST /api/v1/feed-rules` creates new rule
- [ ] `PUT /api/v1/feed-rules/:id` updates rule
- [ ] `DELETE /api/v1/feed-rules/:id` deletes rule
- [ ] `POST /api/v1/feed/preview` returns scored feed preview

**Sprint:** I3 | **Priority:** P1 | **Status:** TODO

---

#### US-I3-003: Post Explainability API
**As a** user, **I want** to know why a post appears **so that** I understand my algorithm.

**Acceptance Criteria:**
- [ ] `GET /api/v1/feed/explain/:postId` returns score breakdown
- [ ] Response includes: base_score, rules_applied, final_score
- [ ] Each rule shows: contribution, percentage, matched_condition
- [ ] WhyAmISeeingThis component calls this API

**Sprint:** I3 | **Priority:** P1 | **Status:** TODO

---

### Technical Tasks

#### TASK-I3-01: Create Feed Lab Page
**Story:** US-I3-001 | **Priority:** P1 | **Estimate:** M

**Files:**
- `frontend/src/app/dashboard/feed-lab/page.tsx` (new)
- `frontend/src/app/dashboard/feed-lab/layout.tsx` (new)

**Implementation:**
```typescript
// frontend/src/app/dashboard/feed-lab/page.tsx
'use client';

import { FeedPreview } from '@/components/feed-lab/FeedPreview';
import { RuleBuilder } from '@/components/feed-lab/RuleBuilder';
import { RuleList } from '@/components/feed-lab/RuleList';
import { useFeedRules } from '@/lib/feed-rules';

export default function FeedLabPage() {
  const { rules, isLoading } = useFeedRules();

  return (
    <div className="feed-lab-container">
      <h1>Feed Lab</h1>
      <p>Customize your algorithm. You control what you see.</p>

      <section>
        <h2>Your Rules</h2>
        <RuleList rules={rules} />
        <RuleBuilder />
      </section>

      <section>
        <h2>Preview</h2>
        <FeedPreview />
      </section>
    </div>
  );
}
```

**Acceptance:**
- [ ] Page renders at `/dashboard/feed-lab`
- [ ] All components display
- [ ] Navigation link added
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I3-02: Feed Rules Backend Schema
**Story:** US-I3-002 | **Priority:** P1 | **Estimate:** M

**Files:**
- `app/core/db_handler.py` (add table)
- `app/models/feed_rule.py` (new)

**Schema:**
```sql
CREATE TABLE feed_rules (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('boost', 'demote', 'filter')),
    conditions JSON NOT NULL,
    weight INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Acceptance:**
- [ ] Table created
- [ ] Model defined
- [ ] Migration works
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I3-03: Feed Rules API Endpoints
**Story:** US-I3-002 | **Priority:** P1 | **Estimate:** M

**Files:**
- `app/web/api/v1/feed.py` (new)

**Tests (TDD):**
```python
# tests/unit/test_api_v1_feed.py
class TestFeedRulesAPI:
    def test_list_rules(self, client, auth_headers, test_feed_rule):
        response = client.get('/api/v1/feed-rules', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['data']) >= 1

    def test_create_rule(self, client, auth_headers):
        response = client.post('/api/v1/feed-rules',
            headers=auth_headers,
            json={
                'name': 'Boost verified',
                'type': 'boost',
                'conditions': [{'field': 'author.verified', 'operator': 'equals', 'value': True}],
                'weight': 15
            })
        assert response.status_code == 201
        assert response.json['data']['name'] == 'Boost verified'
```

**Acceptance:**
- [ ] CRUD operations work
- [ ] Validation enforced
- [ ] All tests pass

**Status:** TODO

---

#### TASK-I3-04: Feed Explainability API
**Story:** US-I3-003 | **Priority:** P1 | **Estimate:** M

**Files:**
- `app/web/api/v1/feed.py`
- `app/features/feed/explainer.py` (new)

**Tests (TDD):**
```python
# tests/unit/test_api_v1_feed_explain.py
def test_explain_post(client, auth_headers, test_post, test_feed_rule):
    response = client.get(f'/api/v1/feed/explain/{test_post.id}', headers=auth_headers)
    assert response.status_code == 200
    data = response.json['data']
    assert 'base_score' in data
    assert 'rules_applied' in data
    assert 'final_score' in data
```

**Acceptance:**
- [ ] Returns score breakdown
- [ ] Shows rule contributions
- [ ] Tests pass

**Status:** TODO

---

#### TASK-I3-05: Connect WhyAmISeeingThis to API
**Story:** US-I3-003 | **Priority:** P1 | **Estimate:** S

**Files:**
- `frontend/src/components/feed-lab/WhyAmISeeingThis.tsx`
- `frontend/src/hooks/usePostExplanation.ts` (new or update)

**Acceptance:**
- [ ] Component fetches from API
- [ ] Shows real rule contributions
- [ ] Loading state works
- [ ] Error handling works

**Status:** TODO

---

## Sprint I4: Cleanup & Decision

### Objective
Decide fate of orphaned code and clean up technical debt.

### Duration
1 session

### Dependencies
- Sprints I1-I3 completed

### User Stories

#### US-I4-001: Workspace Feature Decision
**As a** product owner, **I want** to decide on workspace feature **so that** we don't maintain orphaned code.

**Options:**
1. **Keep & Implement**: Create backend APIs, integrate into pages
2. **Remove**: Delete all workspace components and hooks
3. **Defer**: Keep code but mark as "future" in docs

**Acceptance Criteria:**
- [x] Decision documented in MASTER_ROADMAP.md
- [x] Workspace API + dashboard integrated
- [ ] If removing: Delete all workspace files
- [ ] If deferring: Add `// TODO: Sprint 21` comments

**Decision:** Keep & implement via Integration Sprint I4

**Sprint:** I4 | **Priority:** P2 | **Status:** DONE

---

#### US-I4-002: Algorithm Dashboard Decision
**As a** product owner, **I want** to decide on algorithm dashboard **so that** unused components are handled.

**Options:**
1. **Integrate**: Create page at `/dashboard/algorithm`
2. **Merge**: Combine with Feed Lab page
3. **Remove**: Delete components

**Acceptance Criteria:**
- [x] Decision documented
- [x] Code updated accordingly

**Decision:** Integrate as dedicated `/dashboard/algorithm` page

**Sprint:** I4 | **Priority:** P2 | **Status:** DONE

---

#### US-I4-003: Remove Dead Code
**As a** developer, **I want** to remove unused exports **so that** the codebase is clean.

**Acceptance Criteria:**
- [ ] Identify all unused exports in `frontend/src/lib/`
- [ ] Remove or integrate unused components
- [ ] Update barrel exports (`index.ts` files)
- [ ] No orphaned test files

**Sprint:** I4 | **Priority:** P2 | **Status:** TODO

---

### Technical Tasks

#### TASK-I4-01: Audit Orphaned Code
**Story:** US-I4-003 | **Priority:** P2 | **Estimate:** S

**Description:**
Generate report of all orphaned code. Report stored in `docs/sprints/I4_AUDIT.md`.

**Commands:**
```bash
# Find unused exports
npx ts-unused-exports tsconfig.json

# Find unreferenced files
npx unimported
```

**Acceptance:**
- [x] Report generated (docs/sprints/I4_AUDIT.md)
- [ ] Each item categorized (keep/remove/defer)

**Status:** DONE

---

#### TASK-I4-02: Execute Cleanup
**Story:** US-I4-001, US-I4-002, US-I4-003 | **Priority:** P2 | **Estimate:** M

**Description:**
Execute decisions from I4-01.

**Acceptance:**
- [x] Workspace and algorithm decisions executed
- [x] Tests still pass
- [x] Build still works

**Status:** DONE

---

## Implementation Order

```
Week 1: Sprint I1 (Core API Layer)
+-- Day 1: TASK-I1-01, TASK-I1-03 (API Blueprint, JWT)
+-- Day 2: TASK-I1-02 (Auth Endpoints)
+-- Day 3: TASK-I1-04, TASK-I1-05 (Dashboard Stats, Frontend Update)
+-- Day 4: Integration testing

Week 2: Sprint I2 (Dashboard Integration)
+-- Day 1: TASK-I2-01 (Credentials API)
+-- Day 2: TASK-I2-02 (Sync API)
+-- Day 3: TASK-I2-03 (Cleanup API)
+-- Day 4: TASK-I2-04, TASK-I2-05 (Bookmarks, Analytics)
+-- Day 5: TASK-I2-06 (Frontend Pages)

Week 3: Sprint I3 (Feed Lab Integration)
+-- Day 1: TASK-I3-01, TASK-I3-02 (Page, Schema)
+-- Day 2: TASK-I3-03 (Feed Rules API)
+-- Day 3: TASK-I3-04, TASK-I3-05 (Explainability)
+-- Day 4: Integration testing

Week 4: Sprint I4 (Cleanup)
+-- Day 1: TASK-I4-01 (Audit)
+-- Day 2: TASK-I4-02 (Execute)
```

---

## Multi-Agent Implementation Strategy

For TDD implementation, use parallel agents:

### Agent Configuration

```yaml
# Sprint I1 Example
agents:
  - name: "backend-api"
    type: Bash
    tasks: ["Create Flask blueprints", "Implement endpoints"]

  - name: "backend-tests"
    type: Explore
    tasks: ["Write TDD tests first", "Verify coverage"]

  - name: "frontend-update"
    type: general-purpose
    tasks: ["Update API client", "Update types"]
```

### Execution Pattern

1. **Agent 1 (Tests)**: Write failing tests for feature
2. **Agent 2 (Backend)**: Implement backend to pass tests
3. **Agent 3 (Frontend)**: Update frontend to use new API
4. **Agent 4 (Integration)**: Verify end-to-end

---

## Success Metrics

After all Integration Sprints:

| Metric | Before | After |
|--------|--------|-------|
| Working Login | ? | ? |
| Dashboard Loads | ? | ? |
| Credentials Page | ? | ? |
| Analytics Real Data | ? | ? |
| Feed Lab Accessible | ? | ? |
| Missing Endpoints | 30+ | 0 |
| Orphaned Components | 15+ | 0 |

---

## References

- [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) - Overall project vision
- [USER_STORIES.md](./USER_STORIES.md) - Original user stories
- [SPRINT_TICKETS.md](./SPRINT_TICKETS.md) - Original sprint tickets
- [API.md](./API.md) - API documentation (to be updated)
