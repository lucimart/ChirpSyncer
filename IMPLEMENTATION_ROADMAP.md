# ChirpSyncer - Implementation Roadmap
**Opción C: MVP Funcional Completo + Pulido y Testing**

## Current Status: 85% Complete

### Phase 0: FIX FAILING TESTS ⚠️ **IN PROGRESS**
**Status**: BLOCKING - Must complete before Sprints 8-9
**Duration**: 2-4 hours

#### Failing Tests Identified (10 total):
```
Integration Tests (7 failures):
├── test_auth_integration.py (5 failures)
│   ├── test_complete_user_registration_and_login - AttributeError: 'int' has no 'id'
│   ├── test_multiple_concurrent_sessions_per_user - AttributeError: 'int' has no 'id'
│   ├── test_credential_sharing_between_users - assert None is not None
│   ├── test_session_retrieval_and_validation - AttributeError: 'int' has no 'id'
│   └── test_delete_user_cascade_deletes_sessions - AttributeError: 'int' has no 'id'
│
└── test_dashboard_routes_integration.py (2 failures)
    ├── test_post_task_trigger_admin - assert 500 in [200, 404]
    └── test_post_task_trigger_no_scheduler - assert 500 == 200

Unit Tests (3 failures):
├── test_dashboard_error_handling.py
│   └── test_task_trigger_no_scheduler - assert 500 == 200
├── test_dashboard_tasks.py
│   └── test_task_trigger_scheduler_error - assert 500 == 200
└── test_user_manager.py
    └── test_validate_session_success - AttributeError: 'int' has no 'id'
```

#### Root Causes:
1. **validate_session() return type change** (7 tests)
   - File: `app/auth/user_manager.py:459`
   - Issue: Changed to return `int` instead of `User` object
   - Fix: Update tests expecting `.id` attribute OR revert change

2. **credential_sharing returns None** (1 test)
   - File: Likely `app/auth/credential_manager.py`
   - Issue: `get_shared_credentials()` or similar returning None
   - Fix: Debug why sharing isn't working in integration tests

3. **Task trigger endpoints 500 error** (2 tests)
   - File: `app/web/dashboard.py` - /tasks/<task_name>/trigger
   - Issue: Endpoint throwing unhandled exception
   - Fix: Add proper error handling or mock scheduler setup

#### Action Items:
- [ ] Fix validate_session() tests (update test expectations)
- [ ] Debug credential sharing None issue
- [ ] Fix task trigger 500 errors (error handling)
- [ ] Verify all 718 tests pass
- [ ] Push fixes to branch

---

## Phase 1: SPRINT 8 - "Cleanup Engine Completion" 🔴 CRITICAL
**Goal**: Make cleanup work end-to-end with real tweets
**Duration**: 2-3 days
**Status**: NOT STARTED

### User Journey to Complete:
```
User Story: "As a user, I want to delete old tweets with low engagement"

Current State:
1. ✅ User creates cleanup rule
2. ❌ User previews tweets → Shows 0 matches (fetch not implemented)
3. ❌ User executes cleanup → Nothing deleted (delete not implemented)
4. ✅ User views history → Shows execution but 0 deletes

Target State:
1. ✅ User creates cleanup rule
2. ✅ User previews tweets → Shows ACTUAL tweets from Twitter
3. ✅ User executes cleanup → Tweets ACTUALLY deleted from Twitter
4. ✅ User views history → Shows successful deletions
```

### Features to Implement:

#### Feature 8.1: Tweet Fetching for Cleanup
**File**: `app/features/cleanup_engine.py` (lines 488-503)
**Current Code**:
```python
def _fetch_user_tweets(self, user_id: int, credential_id: int) -> List[Dict]:
    """Fetch user tweets for cleanup evaluation."""
    # TODO: Implement actual tweet fetching
    return []
```

**Implementation Plan**:
```python
def _fetch_user_tweets(self, user_id: int, credential_id: int) -> List[Dict]:
    """
    Fetch user tweets for cleanup evaluation.

    Integration points:
    1. Get user credentials from credential_manager
    2. Use twitter_scraper.py to fetch user timeline
    3. Convert tweets to standardized format
    4. Handle pagination (fetch up to 3200 tweets - Twitter limit)
    5. Handle rate limiting and errors
    """
    # Steps:
    # - credential_manager.get_credentials(user_id, 'twitter', 'scraping')
    # - Initialize twitter_scraper API instance
    # - Fetch user timeline (GET /user/tweets endpoint)
    # - Parse and return tweets
    pass
```

**Acceptance Criteria**:
- [ ] Fetch at least 200 most recent tweets
- [ ] Return tweets in format: {id, content, created_at, metrics}
- [ ] Handle Twitter API errors gracefully
- [ ] Add rate limit handling (429 errors)
- [ ] Add unit tests for tweet fetching
- [ ] Preview shows real tweets in UI

**Estimated Effort**: 4-6 hours

---

#### Feature 8.2: Tweet Deletion via API
**File**: `app/features/cleanup_engine.py` (lines 505-521)
**Current Code**:
```python
def _delete_tweet(self, tweet_id: str, platform: str,
                  credential_id: int) -> bool:
    """Delete tweet via API."""
    # TODO: Implement actual deletion
    return True
```

**Implementation Plan**:
```python
def _delete_tweet(self, tweet_id: str, platform: str,
                  credential_id: int) -> bool:
    """
    Delete tweet via Twitter/Bluesky API.

    Implementation:
    1. Get credentials for platform
    2. Initialize API client (Twitter v2 or Bluesky)
    3. Call delete endpoint: DELETE /tweets/:id (Twitter)
    4. Handle errors (404 if already deleted, 403 if no permission)
    5. Log deletion in database
    6. Return success/failure
    """
    # Twitter: tweepy.Client.delete_tweet(tweet_id)
    # Bluesky: client.delete_post(post_uri)
    pass
```

**Acceptance Criteria**:
- [ ] Successfully delete tweets via Twitter API v2
- [ ] Successfully delete posts via Bluesky API
- [ ] Handle "tweet already deleted" gracefully (404)
- [ ] Handle permission errors (403)
- [ ] Handle rate limits (429)
- [ ] Log all deletions to cleanup_history table
- [ ] Add unit tests for deletion
- [ ] Integration test: create tweet, delete via cleanup

**Estimated Effort**: 6-8 hours

---

#### Feature 8.3: Error Handling & Rate Limiting
**Files**: `app/features/cleanup_engine.py`

**Implementation**:
- Add exponential backoff for rate limits
- Add retry logic (max 3 retries)
- Add detailed error messages in history
- Add user notifications for failures

**Acceptance Criteria**:
- [ ] Cleanup pauses on rate limit and resumes
- [ ] Errors logged with details in cleanup_history
- [ ] User sees clear error messages in UI
- [ ] Email notification on cleanup failure (optional)

**Estimated Effort**: 2-3 hours

---

#### Feature 8.4: Testing & Validation
**Files**: `tests/integration/test_cleanup_engine.py`

**Tests to Add**:
```python
def test_fetch_user_tweets_integration():
    """Test fetching real tweets from Twitter API"""
    pass

def test_delete_tweet_integration():
    """Test deleting tweet via Twitter API"""
    pass

def test_cleanup_preview_with_real_tweets():
    """Test preview shows actual tweets"""
    pass

def test_cleanup_execution_deletes_tweets():
    """Test cleanup actually deletes from Twitter"""
    pass

def test_cleanup_handles_rate_limits():
    """Test cleanup pauses on 429 error"""
    pass
```

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] Manual testing with real Twitter account
- [ ] Verify tweets actually deleted from Twitter
- [ ] Verify history shows correct delete count

**Estimated Effort**: 3-4 hours

---

### Sprint 8 Deliverables:
- [ ] `_fetch_user_tweets()` fully implemented
- [ ] `_delete_tweet()` fully implemented
- [ ] Rate limiting and error handling added
- [ ] 5+ integration tests added
- [ ] User journey "cleanup old tweets" works end-to-end
- [ ] Documentation updated

**Total Effort**: 15-21 hours (~2-3 days)

---

## Phase 2: SPRINT 9 - "Search & UI Testing" 🟡 MEDIUM PRIORITY
**Goal**: Complete search advanced filters + enable UI testing
**Duration**: 2-3 days
**Status**: NOT STARTED

### Part A: Search Engine Advanced Filters

#### Feature 9.1: Implement has_media Filter
**File**: `app/features/search_engine.py` (line 267)
**Current**: Filter documented but doesn't work

**Implementation Options**:

**Option A: Add to FTS5 Virtual Table (Recommended)**
```python
# Modify FTS5 table creation to include has_media flag
CREATE VIRTUAL TABLE tweet_search_fts USING fts5(
    content,
    hashtags,
    has_media UNINDEXED,  # Add flag to FTS
    content=tweet_search
);

# Update triggers to populate has_media
CREATE TRIGGER tweet_search_after_insert AFTER INSERT ON tweet_search
BEGIN
    INSERT INTO tweet_search_fts(
        rowid, content, hashtags, has_media
    ) VALUES (
        new.rowid,
        new.content,
        new.hashtags,
        CASE WHEN new.media_urls IS NOT NULL AND new.media_urls != ''
             THEN 1 ELSE 0 END
    );
END;
```

**Option B: JOIN with tweet_search Table**
```python
def search_with_filters(self, query: str, filters: Dict) -> List[Dict]:
    # After FTS5 search, filter results with JOIN
    if filters.get('has_media'):
        results = [r for r in results if r.get('media_urls')]
```

**Acceptance Criteria**:
- [ ] search_with_filters(query, {'has_media': True}) works
- [ ] Returns only tweets with images/videos
- [ ] Performance acceptable (< 100ms for 10k tweets)
- [ ] Unit tests added

**Estimated Effort**: 4-5 hours

---

#### Feature 9.2: Implement min_likes Filter
**File**: `app/features/search_engine.py` (line 268)
**Current**: Filter documented but doesn't work

**Implementation**:
Requires JOIN with tweet_metrics table:
```python
def search_with_filters(self, query: str, filters: Dict) -> List[Dict]:
    # Base FTS5 search
    results = self._fts_search(query)

    # Apply min_likes filter with JOIN
    if filters.get('min_likes'):
        min_likes = int(filters['min_likes'])
        # JOIN tweet_search_fts with tweet_metrics on tweet_id
        # WHERE likes >= min_likes
```

**Database Changes Needed**:
```sql
-- Ensure tweet_metrics has index on tweet_id
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_tweet_id
ON tweet_metrics(tweet_id);

-- Ensure likes column exists and is indexed
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_likes
ON tweet_metrics(likes);
```

**Acceptance Criteria**:
- [ ] search_with_filters(query, {'min_likes': 50}) works
- [ ] Returns only tweets with >= 50 likes
- [ ] Performance acceptable (JOIN optimized with indexes)
- [ ] Unit tests added

**Estimated Effort**: 5-6 hours

---

### Part B: Enable Playwright E2E Tests

#### Feature 9.3: Enable Auth Flow Tests
**File**: `tests/e2e/playwright/test_auth_flows.py`
**Current**: 6 tests skipped with reason "UI implementation pending"

**Action Plan**:
1. Remove all `@pytest.mark.skip` decorators
2. Run tests and identify failures
3. Fix any actual UI bugs found
4. Ensure all 6 tests pass

**Tests to Enable**:
- [ ] test_user_registration_complete_flow
- [ ] test_login_logout_flow
- [ ] test_login_with_invalid_credentials
- [ ] test_password_validation
- [ ] test_username_uniqueness
- [ ] test_email_uniqueness

**Estimated Effort**: 2-3 hours (likely just remove skip + minor fixes)

---

#### Feature 9.4: Enable Credential Management Tests
**File**: `tests/e2e/playwright/test_credential_management.py`
**Current**: 4 tests skipped

**Action Plan**:
1. Remove `@pytest.mark.skip` decorators
2. Verify credential forms work in browser
3. Fix any UI rendering issues
4. Ensure all 4 tests pass

**Tests to Enable**:
- [ ] test_add_twitter_credential
- [ ] test_credential_encryption
- [ ] test_delete_credential
- [ ] test_add_multiple_credentials

**Estimated Effort**: 2-3 hours

---

#### Feature 9.5: Add to CI Pipeline
**File**: `.github/workflows/tests.yml`

**Changes**:
```yaml
- name: Run Playwright E2E Tests
  run: |
    playwright install
    pytest tests/e2e/playwright/ -v
```

**Acceptance Criteria**:
- [ ] Playwright tests run in CI
- [ ] All 10 Playwright tests pass
- [ ] CI fails if Playwright tests fail

**Estimated Effort**: 1 hour

---

### Sprint 9 Deliverables:
- [ ] has_media filter implemented and tested
- [ ] min_likes filter implemented and tested
- [ ] 10 Playwright tests enabled and passing
- [ ] Playwright tests running in CI
- [ ] Search documentation updated with filter capabilities

**Total Effort**: 14-18 hours (~2-3 days)

---

## Phase 3: FINAL VALIDATION & DOCUMENTATION
**Duration**: 1 day

### Deliverables:
- [ ] All 718+ tests passing (integration + unit + E2E + Playwright)
- [ ] README.md updated with complete feature list
- [ ] CHANGELOG.md updated with Sprints 8-9
- [ ] User documentation for cleanup feature
- [ ] User documentation for search filters
- [ ] Architecture diagram updated
- [ ] Performance benchmarks documented
- [ ] Security audit (Bandit) passing
- [ ] Code coverage report (aim for >90%)

---

## Success Metrics

### Before (Current State - 85%):
```
✅ Backend Core: 95%
✅ API REST: 90%
✅ Dashboard UI: 90%
❌ Cleanup Engine: 60% (preview/delete broken)
⚠️ Search Engine: 85% (filters missing)
✅ Analytics: 100%
✅ Task Scheduling: 100%
✅ Auth: 100%
❌ Playwright Tests: 0% (all skipped)

Tests Passing: 708/718 (98.6%)
```

### After (Target - 100%):
```
✅ Backend Core: 100%
✅ API REST: 100%
✅ Dashboard UI: 100%
✅ Cleanup Engine: 100% (fully functional)
✅ Search Engine: 100% (all filters work)
✅ Analytics: 100%
✅ Task Scheduling: 100%
✅ Auth: 100%
✅ Playwright Tests: 100% (10 tests enabled)

Tests Passing: 728/728 (100%)
```

---

## Timeline

| Phase | Duration | Completion Date |
|-------|----------|-----------------|
| Phase 0: Fix Failing Tests | 2-4 hours | Today |
| Sprint 8: Cleanup Engine | 2-3 days | +3 days |
| Sprint 9: Search & UI Tests | 2-3 days | +6 days |
| Phase 3: Final Validation | 1 day | +7 days |

**Total Time**: 1 week (7 days)
**Target Completion**: [Date + 7 days]

---

## Risk Mitigation

### Risk 1: Twitter API Rate Limits
- **Mitigation**: Implement exponential backoff, use v2 API endpoints with higher limits
- **Fallback**: Add rate limit dashboard showing remaining quota

### Risk 2: Playwright Tests May Reveal UI Bugs
- **Mitigation**: Budget extra time for UI fixes in Sprint 9
- **Fallback**: Fix critical bugs first, defer cosmetic issues

### Risk 3: FTS5 Performance with Advanced Filters
- **Mitigation**: Add proper indexes, benchmark with 100k tweets
- **Fallback**: Cache search results, add pagination

---

## Notes for Self

**Current Session**: Fixing failing tests (Phase 0)
**Next Session**: Start Sprint 8 - Feature 8.1 (Tweet Fetching)

**Key Files to Modify**:
- `app/features/cleanup_engine.py` (Sprint 8)
- `app/features/search_engine.py` (Sprint 9)
- `tests/e2e/playwright/*.py` (Sprint 9)

**Remember**:
- Run full test suite after each feature: `pytest tests/`
- Update CHANGELOG.md after each sprint
- Commit atomically: one feature = one commit
- Push to branch after each sprint completion
