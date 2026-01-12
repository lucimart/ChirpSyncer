# Sprint 5 Plan: Media Support, Statistics & Web Dashboard

## Objectives
Implement advanced features including bidirectional media sync, comprehensive statistics tracking, and a web monitoring dashboard.

## Current State
- ✅ Sprint 1: Critical bugs fixed (14 tests)
- ✅ Sprint 2: twscrape migration + logging + retry logic (59 tests)
- ✅ Sprint 3: Thread support (Twitter → Bluesky) + production readiness
- ✅ Sprint 4: Optimizations and refinements
- 🎯 Sprint 5: Media, Stats, and Monitoring Dashboard

## Sprint 5 Tasks

### 1. MEDIA-001: Bidirectional Media Support (Images/Videos)
**Priority**: High (Effort: 4-6 hours)
**Description**: Support synchronization of images and videos between Twitter and Bluesky in both directions.

**Current Limitations**:
- Only text content is synchronized
- Media attachments are ignored
- No support for alt text on images

**Criteria de Aceptación**:
1. Detect media attachments in tweets (images, videos)
2. Download media from Twitter
3. Upload media to Bluesky with proper format
4. Sync media from Bluesky posts to Twitter
5. Handle multiple images (up to 4)
6. Preserve alt text when available
7. Handle video constraints (size, duration)
8. Comprehensive test coverage

**Changes Required**:

#### 1.1 `app/media_handler.py` (NEW):
```python
# Media download, upload, and conversion utilities
async def download_media(url: str, media_type: str) -> bytes
async def upload_media_to_bluesky(media_data: bytes, mime_type: str) -> dict
def upload_media_to_twitter(media_data: bytes, mime_type: str) -> str
def get_mime_type(url: str) -> str
def validate_media_size(data: bytes, platform: str) -> bool
```

#### 1.2 `app/twitter_scraper.py`:
- Update `TweetAdapter` to include media URLs
- Add `has_media()` method
- Add `get_media_urls()` method

#### 1.3 `app/bluesky_handler.py`:
- Update `post_to_bluesky()` to accept media
- Update `post_thread_to_bluesky()` for media in threads
- Add `fetch_media_from_post()` method

#### 1.4 `app/twitter_handler.py`:
- Update `post_to_twitter()` to accept media
- Add media upload functionality

#### 1.5 `app/db_handler.py`:
- Add `media_synced` table for tracking media files
- Schema: `(id, post_id, media_url, media_type, synced_at)`

**Tests**:
- `tests/test_media_handler.py` (15+ tests)
  - Test media download
  - Test media upload to each platform
  - Test MIME type detection
  - Test size validation
  - Test error handling

---

### 2. THREAD-001: Bidirectional Thread Support Enhancement
**Priority**: Medium (Effort: 2-3 hours)
**Description**: Complete bidirectional thread support by adding Bluesky → Twitter thread synchronization.

**Current State**:
- ✅ Twitter → Bluesky threads working (Sprint 3)
- ❌ Bluesky → Twitter threads NOT implemented

**Criteria de Aceptación**:
1. Detect when Bluesky post is part of a thread
2. Fetch complete thread from Bluesky
3. Post thread to Twitter maintaining reply chain
4. Handle threading constraints on Twitter
5. Test coverage for bidirectional threads

**Changes Required**:

#### 2.1 `app/bluesky_handler.py`:
```python
def is_bluesky_thread(post) -> bool
    """Check if Bluesky post is part of a thread"""

def fetch_bluesky_thread(post_uri: str) -> list
    """Fetch complete thread from Bluesky"""
```

#### 2.2 `app/twitter_handler.py`:
```python
def post_thread_to_twitter(tweets: list) -> list
    """Post a thread to Twitter with reply chain"""
```

#### 2.3 `app/main.py`:
- Update `sync_bluesky_to_twitter()` to handle threads

**Tests**:
- Update `tests/test_thread_support.py`
- Add tests for Bluesky → Twitter threads
- Integration tests for bidirectional threading

---

### 3. STATS-001: Synchronization Statistics Tracking
**Priority**: High (Effort: 3-4 hours)
**Description**: Implement comprehensive statistics tracking for monitoring sync performance and health.

**Criteria de Aceptación**:
1. Track sync counts per direction (Twitter→Bluesky, Bluesky→Twitter)
2. Track error counts and types
3. Track media sync statistics
4. Track thread sync statistics
5. Calculate sync success rate
6. Store hourly/daily aggregates
7. API endpoints to retrieve stats

**Changes Required**:

#### 3.1 `app/stats_handler.py` (NEW):
```python
class StatsTracker:
    def record_sync(source: str, target: str, success: bool, media_count: int, is_thread: bool)
    def record_error(source: str, target: str, error_type: str, error_message: str)
    def get_stats(period: str = '24h') -> dict
    def get_error_log(limit: int = 100) -> list
    def get_success_rate(period: str = '24h') -> float
```

#### 3.2 `app/db_handler.py`:
- Add `sync_stats` table
  ```sql
  CREATE TABLE sync_stats (
      id INTEGER PRIMARY KEY,
      timestamp INTEGER,
      source TEXT,
      target TEXT,
      success INTEGER,
      media_count INTEGER,
      is_thread INTEGER,
      error_type TEXT,
      error_message TEXT
  )
  ```
- Add `hourly_stats` aggregation table

#### 3.3 `app/main.py`:
- Integrate stats tracking in sync functions
- Log stats after each cycle

**Tests**:
- `tests/test_stats_handler.py` (10+ tests)
  - Test recording syncs
  - Test recording errors
  - Test stat retrieval
  - Test success rate calculation
  - Test aggregations

---

### 4. MONITORING-001: Web Dashboard
**Priority**: High (Effort: 5-7 hours)
**Description**: Create a web dashboard for monitoring sync status, viewing logs, and displaying statistics.

**Tech Stack**:
- **Backend**: Flask (lightweight, easy to integrate)
- **Frontend**: HTML + TailwindCSS + Alpine.js (no build step)
- **Data**: SQLite (existing DB)
- **Charts**: Chart.js for visualizations

**Criteria de Aceptación**:
1. Real-time sync status display
2. Statistics dashboard with charts
3. Recent posts view (last 50 synced)
4. Error log viewer
5. Configuration viewer (sanitized credentials)
6. Responsive design
7. Auto-refresh capability

**Changes Required**:

#### 4.1 `app/dashboard.py` (NEW):
```python
# Flask application for web dashboard
from flask import Flask, render_template, jsonify
from app.stats_handler import StatsTracker
from app.db_handler import get_recent_syncs, get_error_log

app = Flask(__name__)

@app.route('/')
def index():
    """Main dashboard page"""

@app.route('/api/stats')
def api_stats():
    """API endpoint for statistics"""

@app.route('/api/recent')
def api_recent():
    """API endpoint for recent syncs"""

@app.route('/api/errors')
def api_errors():
    """API endpoint for error log"""

@app.route('/api/status')
def api_status():
    """API endpoint for system status"""
```

#### 4.2 `app/templates/dashboard.html` (NEW):
- Main dashboard template
- Statistics cards (total syncs, success rate, errors)
- Charts (sync trends, success/failure, media stats)
- Recent posts table
- Error log table

#### 4.3 `app/static/` directory:
- CSS (TailwindCSS CDN)
- JavaScript (Alpine.js, Chart.js)

#### 4.4 `docker-compose.yml`:
- Add dashboard service
- Expose port 5000 for web access

#### 4.5 `requirements.txt`:
- Add Flask
- Add Flask-CORS (if needed)

**Dashboard Features**:

1. **Overview Section**:
   - Total posts synced (all time)
   - Posts synced today
   - Current success rate
   - Active errors count

2. **Charts**:
   - Line chart: Syncs over time (hourly)
   - Pie chart: Success vs. Failures
   - Bar chart: Twitter→Bluesky vs. Bluesky→Twitter

3. **Recent Activity**:
   - Table of last 50 synced posts
   - Columns: Timestamp, Source, Content (truncated), Status, Media

4. **Error Log**:
   - Table of recent errors
   - Columns: Timestamp, Source, Target, Error Type, Message
   - Filter by error type

5. **System Status**:
   - Last sync time
   - Next sync time
   - Database size
   - Uptime

**Tests**:
- `tests/test_dashboard.py` (10+ tests)
  - Test Flask routes
  - Test API endpoints
  - Test data serialization
  - Test error handling

---

## Implementation Strategy

### Phase 1: Database & Stats (2 hours)
1. Implement `stats_handler.py` with TDD
2. Update `db_handler.py` with new tables
3. Create tests for stats tracking
4. Integrate stats in `main.py`

### Phase 2: Media Support (4 hours)
1. Implement `media_handler.py` with TDD
2. Update `twitter_scraper.py` for media
3. Update `bluesky_handler.py` for media
4. Update `twitter_handler.py` for media
5. Create comprehensive tests
6. Integrate in sync flow

### Phase 3: Bidirectional Threads (2 hours)
1. Implement Bluesky thread detection
2. Implement Bluesky → Twitter thread posting
3. Update tests
4. Integrate in sync flow

### Phase 4: Web Dashboard (5 hours)
1. Create Flask application
2. Implement API endpoints
3. Create HTML template
4. Add charts and visualizations
5. Test dashboard
6. Update Docker setup

### Phase 5: Integration & Testing (2 hours)
1. Run full test suite
2. Manual testing of all features
3. Update documentation
4. Docker build and test

**Total Estimated Time**: 15-18 hours

---

## Database Schema Updates

### New Tables:

```sql
-- Media tracking
CREATE TABLE IF NOT EXISTS media_synced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,  -- 'image' or 'video'
    platform TEXT NOT NULL,     -- 'twitter' or 'bluesky'
    synced_at INTEGER NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    UNIQUE(post_id, media_url)
);

-- Sync statistics
CREATE TABLE IF NOT EXISTS sync_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL,       -- 'twitter' or 'bluesky'
    target TEXT NOT NULL,       -- 'bluesky' or 'twitter'
    success INTEGER NOT NULL,   -- 1 for success, 0 for failure
    media_count INTEGER DEFAULT 0,
    is_thread INTEGER DEFAULT 0,
    error_type TEXT,
    error_message TEXT,
    duration_ms INTEGER         -- How long the sync took
);

-- Hourly aggregations (for dashboard performance)
CREATE TABLE IF NOT EXISTS hourly_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_timestamp INTEGER NOT NULL UNIQUE,  -- Unix timestamp rounded to hour
    twitter_to_bluesky_count INTEGER DEFAULT 0,
    bluesky_to_twitter_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    media_synced INTEGER DEFAULT 0,
    threads_synced INTEGER DEFAULT 0
);
```

---

## Dependencies to Add

```txt
# requirements.txt
Flask==3.0.0
requests==2.31.0
Pillow==10.1.0  # For image processing
aiohttp==3.9.1  # For async media downloads
```

```txt
# requirements-dev.txt
pytest-flask==1.3.0
pytest-asyncio==0.23.0
```

---

## Testing Strategy

### Unit Tests:
- Each new module has comprehensive unit tests
- Mock all external dependencies
- Test edge cases and error paths

### Integration Tests:
- Test full sync flow with media
- Test dashboard API endpoints
- Test database operations

### Manual Tests:
- Sync tweets with images
- Sync tweets with videos
- View dashboard in browser
- Test auto-refresh
- Test on mobile devices

---

## Success Metrics

1. **Test Coverage**: >90% for new code
2. **All Tests Pass**: Zero failures
3. **Media Sync**: Successfully sync images and videos
4. **Dashboard**: Accessible and functional
5. **Performance**: Dashboard loads in <2 seconds
6. **Documentation**: All features documented

---

## Rollback Plan

If any feature causes issues:
1. Feature flags in `config.py` to disable:
   - `ENABLE_MEDIA_SYNC = os.getenv('ENABLE_MEDIA_SYNC', 'true') == 'true'`
   - `ENABLE_DASHBOARD = os.getenv('ENABLE_DASHBOARD', 'true') == 'true'`
2. Database migrations are additive (safe to run)
3. Dashboard runs on separate port (doesn't affect main sync)

---

## Next Steps After Sprint 5

**Sprint 6 Ideas**:
- Mobile app for monitoring
- Webhook notifications
- Advanced filtering rules
- AI-powered content transformation
- Multi-account support

---

**Sprint 5 Start Date**: 2026-01-09
**Estimated Completion**: 2026-01-10
**Methodology**: TDD with parallel subagents
