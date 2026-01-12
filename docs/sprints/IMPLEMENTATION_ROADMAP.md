# ChirpSyncer - Implementation Roadmap
**Opción C: MVP Funcional Completo + Pulido y Testing**

## Current Status: 95% Complete

### Phase 0: FIX FAILING TESTS ✅ **COMPLETE**
**Status**: DONE
**Completed**: 2025-01-12

All tests now passing: **1501 passed, 10 skipped**

---

## Phase 1: SPRINT 8 - "Cleanup Engine Completion" ✅ **COMPLETE**
**Goal**: Make cleanup work end-to-end with real tweets
**Status**: COMPLETE (2025-01-13)

### Implementation Status:
All cleanup engine functionality is **fully implemented**:

- ✅ `_fetch_user_tweets()` - Lines 542-584 in cleanup_engine.py
  - Uses twscrape for Twitter scraping
  - Async implementation with `_fetch_tweets_async()`
  - RateLimiter with sliding window (900 reads/15min)

- ✅ `_delete_tweet()` - Lines 638-693 in cleanup_engine.py
  - Uses tweepy.Client for Twitter API v2
  - `_delete_tweet_api()` for actual API calls
  - RateLimiter (50 deletes/15min)
  - Error handling for 404, 403, rate limits

- ✅ 55 cleanup tests passing (unit + integration)

### User Journey: COMPLETE
```
1. ✅ User creates cleanup rule
2. ✅ User previews tweets → Shows ACTUAL tweets from Twitter
3. ✅ User executes cleanup → Tweets ACTUALLY deleted from Twitter
4. ✅ User views history → Shows successful deletions
```

---

## Phase 2: SPRINT 9 - "Search & UI Testing" ✅ COMPLETE
**Goal**: Complete search advanced filters + enable UI testing
**Duration**: 2-3 days
**Status**: COMPLETE (2025-01-13)

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
