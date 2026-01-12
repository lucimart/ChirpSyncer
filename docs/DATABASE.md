# ChirpSyncer Database Documentation

**Version:** 1.0
**Last Updated:** 2026-01-12
**Database:** SQLite 3
**Default Path:** `chirpsyncer.db`

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Core Tables](#core-tables)
4. [Authentication & User Management Tables](#authentication--user-management-tables)
5. [Analytics & Metrics Tables](#analytics--metrics-tables)
6. [Feature Tables](#feature-tables)
7. [Search & Content Management](#search--content-management)
8. [Maintenance & Audit Tables](#maintenance--audit-tables)
9. [Database Migrations](#database-migrations)
10. [Indexes](#indexes)
11. [Triggers](#triggers)
12. [Encryption & Security](#encryption--security)
13. [Backup & Maintenance](#backup--maintenance)
14. [Troubleshooting](#troubleshooting)
15. [Related APIs](#related-apis)

---

## Overview

ChirpSyncer uses SQLite as its primary database for storing synchronized posts, user data, credentials, analytics, scheduled content, and system logs. The database supports:

- **Multi-user architecture** with user isolation
- **AES-256-GCM encryption** for sensitive credentials
- **FTS5 full-text search** for tweet content
- **Comprehensive audit logging** for security
- **Automatic schema migrations** for version upgrades
- **WAL mode** for better concurrency (recommended)

### Database Location

- **Default:** `chirpsyncer.db` in the project root
- **Configurable via:** DB_PATH environment variable
- **Backup location:** `backups/` directory

---

## Database Architecture

### Entity Relationships

```
┌─────────────────┐
│     users       │
│  (Core User)    │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌──────────────────┐                          ┌──────────────────┐
│ user_sessions    │                          │ user_credentials │
│ (Authentication) │                          │  (Encrypted)     │
└──────────────────┘                          └──────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                  synced_posts                        │
│            (Central Sync Data)                       │
└────────┬──────────────────────────┬──────────────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  sync_stats      │      │ tweet_metrics    │
│  (Sync Metrics)  │      │  (Analytics)     │
└──────────────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐
│  hourly_stats    │
│ (Aggregated)     │
└──────────────────┘

┌─────────────────────────────────────────┐
│           Feature Tables                │
├──────────────────┬──────────────────────┤
│ scheduled_tweets │  cleanup_rules       │
│ saved_tweets     │  cleanup_history     │
│ collections      │  tweet_search_index  │
└──────────────────┴──────────────────────┘

┌─────────────────────────────────────────┐
│         Maintenance & Audit             │
├──────────────────┬──────────────────────┤
│ audit_log        │ daily_stats          │
│ archived_audit_  │                      │
│ logs             │                      │
└──────────────────┴──────────────────────┘
```

### Data Flow

```
Twitter/Bluesky API
        │
        ▼
┌──────────────────┐
│  Sync Engine     │
│  (app/sync/)     │
└────────┬─────────┘
         │
         ├──► should_sync_post() ──► Check duplicates via content_hash
         │
         ├──► save_synced_post() ──► Insert into synced_posts
         │                            └──► Triggers FTS5 index update
         │
         └──► record_sync_stats() ──► Insert into sync_stats
                                      └──► Aggregate into hourly_stats
```

---

## Core Tables

### synced_posts

**Purpose:** Primary table for tracking bidirectionally synced posts between Twitter and Bluesky.

**Module:** `app/core/db_handler.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS synced_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identifiers
    twitter_id TEXT,
    bluesky_uri TEXT,

    -- User association (multi-user support)
    user_id INTEGER,

    -- Metadata of origin
    source TEXT NOT NULL,
    content_hash TEXT NOT NULL UNIQUE,

    -- Sync metadata
    synced_to TEXT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Original content
    original_text TEXT NOT NULL,

    -- Additional metadata (added via migrations)
    twitter_username TEXT,
    hashtags TEXT,
    posted_at INTEGER,

    -- Constraints
    CHECK (source IN ('twitter', 'bluesky')),
    CHECK (synced_to IN ('bluesky', 'twitter', 'both')),

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique post ID |
| `twitter_id` | TEXT | NULL | Twitter tweet ID (if synced from/to Twitter) |
| `bluesky_uri` | TEXT | NULL | Bluesky post URI (if synced from/to Bluesky) |
| `user_id` | INTEGER | FOREIGN KEY | User who owns this sync |
| `source` | TEXT | NOT NULL, CHECK | Platform where post originated ('twitter' or 'bluesky') |
| `content_hash` | TEXT | NOT NULL, UNIQUE | SHA-256 hash of content for duplicate detection |
| `synced_to` | TEXT | CHECK | Where the post was synced to ('bluesky', 'twitter', 'both') |
| `synced_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | When the sync occurred |
| `original_text` | TEXT | NOT NULL | Full text content of the post |
| `twitter_username` | TEXT | NULL | Twitter username of the author |
| `hashtags` | TEXT | NULL | Extracted hashtags from the post |
| `posted_at` | INTEGER | NULL | Unix timestamp of when post was originally created |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id);
CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri);
CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash);
CREATE INDEX IF NOT EXISTS idx_source ON synced_posts(source);
CREATE INDEX IF NOT EXISTS idx_synced_posts_user ON synced_posts(user_id);
```

**Example Queries:**

```sql
-- Check if post was already synced (duplicate detection)
SELECT id FROM synced_posts WHERE content_hash = ?;

-- Get all posts synced by a user
SELECT * FROM synced_posts WHERE user_id = ? ORDER BY synced_at DESC;

-- Find posts from Twitter that were synced to Bluesky
SELECT * FROM synced_posts
WHERE source = 'twitter' AND synced_to IN ('bluesky', 'both')
AND user_id = ?;

-- Get posts with specific hashtag
SELECT * FROM synced_posts WHERE hashtags LIKE '%#python%' AND user_id = ?;
```

**Used By:**
- `app/core/db_handler.py` - Core sync operations
- `app/features/search_engine.py` - FTS5 triggers
- `app/sync/sync_engine.py` - Bidirectional sync logic

---

### seen_tweets (Legacy)

**Purpose:** Legacy table for tracking seen tweets (replaced by synced_posts in newer versions).

**Module:** `app/core/db_handler.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS seen_tweets (
    id INTEGER PRIMARY KEY,
    tweet_id TEXT NOT NULL UNIQUE
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing ID |
| `tweet_id` | TEXT | NOT NULL, UNIQUE | Twitter tweet ID |

**Migration Note:** This table is maintained for backward compatibility but new installations should use `synced_posts` instead.

**Example Queries:**

```sql
-- Check if tweet was seen
SELECT 1 FROM seen_tweets WHERE tweet_id = ?;

-- Mark tweet as seen
INSERT OR IGNORE INTO seen_tweets (tweet_id) VALUES (?);
```

**Used By:**
- `app/core/db_handler.py` - Legacy sync checking

---

### api_usage

**Purpose:** Track API rate limit information for Twitter/Bluesky APIs.

**Module:** `app/core/db_handler.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY,
    remaining_reads INTEGER,
    reset_time INTEGER
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Always 1 (single row table) |
| `remaining_reads` | INTEGER | NULL | Number of API calls remaining |
| `reset_time` | INTEGER | NULL | Unix timestamp when rate limit resets |

**Example Queries:**

```sql
-- Get current rate limit info
SELECT remaining_reads, reset_time FROM api_usage WHERE id = 1;

-- Update rate limit info
INSERT OR REPLACE INTO api_usage (id, remaining_reads, reset_time)
VALUES (1, ?, ?);
```

**Used By:**
- `app/core/db_handler.py` - Rate limit tracking
- `app/scrapers/` - API clients

---

## Authentication & User Management Tables

### users

**Purpose:** Core user accounts with authentication and profile information.

**Module:** `app/auth/user_manager.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login INTEGER,
    is_active INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    settings_json TEXT
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user ID |
| `username` | TEXT | UNIQUE NOT NULL | Username for login |
| `email` | TEXT | UNIQUE NOT NULL | Email address |
| `password_hash` | TEXT | NOT NULL | bcrypt hashed password (cost factor 12) |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of account creation |
| `last_login` | INTEGER | NULL | Unix timestamp of last successful login |
| `is_active` | INTEGER | DEFAULT 1 | 1 = active, 0 = deactivated |
| `is_admin` | INTEGER | DEFAULT 0 | 1 = admin user, 0 = regular user |
| `settings_json` | TEXT | NULL | JSON-encoded user preferences |

**Security Features:**
- Passwords hashed with bcrypt (12 rounds)
- Email and username must be unique
- Support for account deactivation
- Admin role separation

**Example Queries:**

```sql
-- Create new user
INSERT INTO users (username, email, password_hash, created_at, is_active, is_admin)
VALUES (?, ?, ?, ?, 1, 0);

-- Authenticate user
SELECT * FROM users WHERE username = ? AND is_active = 1;

-- Update last login
UPDATE users SET last_login = ? WHERE id = ?;

-- Get all admin users
SELECT * FROM users WHERE is_admin = 1 AND is_active = 1;

-- Deactivate user account
UPDATE users SET is_active = 0 WHERE id = ?;
```

**Used By:**
- `app/auth/user_manager.py` - User CRUD operations
- `app/auth/security_utils.py` - Authentication
- All feature modules (user_id foreign key)

---

### user_sessions

**Purpose:** Session management for authenticated users.

**Module:** `app/auth/user_manager.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique session ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | User who owns this session |
| `session_token` | TEXT | UNIQUE NOT NULL | Cryptographically secure random token (32 bytes) |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of session creation |
| `expires_at` | INTEGER | NOT NULL | Unix timestamp when session expires |
| `ip_address` | TEXT | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Client user agent string |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
```

**Session Lifecycle:**
- Default expiration: 7 days (604800 seconds)
- Tokens generated using `secrets.token_urlsafe(32)`
- Expired sessions automatically cleaned by maintenance task

**Example Queries:**

```sql
-- Create new session
INSERT INTO user_sessions
(user_id, session_token, created_at, expires_at, ip_address, user_agent)
VALUES (?, ?, ?, ?, ?, ?);

-- Validate session
SELECT user_id, expires_at FROM user_sessions
WHERE session_token = ? AND expires_at > ?;

-- Delete session (logout)
DELETE FROM user_sessions WHERE session_token = ?;

-- Cleanup expired sessions
DELETE FROM user_sessions WHERE expires_at < ?;

-- Get all sessions for user
SELECT * FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC;
```

**Used By:**
- `app/auth/user_manager.py` - Session management
- `app/features/maintenance_tasks.py` - Expired session cleanup
- Web interface authentication middleware

---

### user_credentials

**Purpose:** Encrypted storage of platform credentials (Twitter, Bluesky).

**Module:** `app/auth/credential_manager.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS user_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    credential_type TEXT NOT NULL,

    -- Encrypted data (AES-256-GCM)
    encrypted_data BLOB NOT NULL,
    encryption_iv BLOB NOT NULL,
    encryption_tag BLOB NOT NULL,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_used INTEGER,
    is_active INTEGER DEFAULT 1,

    -- Sharing support
    is_shared INTEGER DEFAULT 0,
    owner_user_id INTEGER,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, platform, credential_type)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique credential ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | User who owns these credentials |
| `platform` | TEXT | NOT NULL | Platform name ('twitter' or 'bluesky') |
| `credential_type` | TEXT | NOT NULL | Type ('scraping' or 'api') |
| `encrypted_data` | BLOB | NOT NULL | AES-256-GCM encrypted credential data |
| `encryption_iv` | BLOB | NOT NULL | Initialization vector (12 bytes for GCM) |
| `encryption_tag` | BLOB | NOT NULL | Authentication tag (16 bytes for GCM) |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of credential creation |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp of last update |
| `last_used` | INTEGER | NULL | Unix timestamp of last usage |
| `is_active` | INTEGER | DEFAULT 1 | 1 = active, 0 = inactive |
| `is_shared` | INTEGER | DEFAULT 0 | 1 = shared from another user, 0 = owned |
| `owner_user_id` | INTEGER | NULL | Original owner if credential is shared |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_credentials_user ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_platform ON user_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_credentials_owner ON user_credentials(owner_user_id);
```

**Encryption Details:**

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Size:** 32 bytes (256 bits)
- **IV Size:** 12 bytes (96 bits) - randomly generated per credential
- **Tag Size:** 16 bytes (128 bits) - provides authentication
- **Data Format:** JSON-encoded dictionary with credential fields

**Valid Platforms & Types:**

```python
VALID_PLATFORMS = ['twitter', 'bluesky']
VALID_CREDENTIAL_TYPES = {
    'twitter': ['scraping', 'api'],
    'bluesky': ['api']
}
```

**Encrypted Data Structure (Twitter Scraping):**

```json
{
    "username": "twitter_username",
    "password": "twitter_password",
    "email": "twitter_email",
    "email_password": "email_password"
}
```

**Encrypted Data Structure (Bluesky API):**

```json
{
    "username": "bluesky.social",
    "password": "app_password"
}
```

**Example Queries:**

```sql
-- Save new credentials
INSERT INTO user_credentials
(user_id, platform, credential_type, encrypted_data, encryption_iv,
 encryption_tag, created_at, updated_at, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);

-- Get credentials for user
SELECT encrypted_data, encryption_iv, encryption_tag
FROM user_credentials
WHERE user_id = ? AND platform = ? AND credential_type = ?;

-- Update credentials
UPDATE user_credentials
SET encrypted_data = ?, encryption_iv = ?, encryption_tag = ?, updated_at = ?
WHERE user_id = ? AND platform = ? AND credential_type = ?;

-- Mark as used
UPDATE user_credentials SET last_used = ?
WHERE user_id = ? AND platform = ? AND credential_type = ?;

-- List user's credentials (metadata only)
SELECT id, platform, credential_type, created_at, updated_at,
       last_used, is_active, is_shared, owner_user_id
FROM user_credentials WHERE user_id = ?;
```

**Credential Sharing:**

Credentials can be shared between users using the `share_credentials()` method. When shared:
1. Encrypted data is copied to target user's credentials
2. `is_shared` flag is set to 1
3. `owner_user_id` references the original owner

```sql
-- Share credentials
INSERT INTO user_credentials
(user_id, platform, credential_type, encrypted_data, encryption_iv,
 encryption_tag, created_at, updated_at, is_active, is_shared, owner_user_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?);

-- Get shared credentials
SELECT * FROM user_credentials
WHERE user_id = ? AND is_shared = 1;
```

**Used By:**
- `app/auth/credential_manager.py` - Credential CRUD operations
- `app/scrapers/` - Twitter/Bluesky authentication
- `app/sync/sync_engine.py` - Sync operations
- `app/features/maintenance_tasks.py` - Cleanup inactive credentials

---

## Analytics & Metrics Tables

### sync_stats

**Purpose:** Detailed tracking of individual sync operations with error information.

**Module:** `app/core/db_handler.py` (created by `add_stats_tables()`)

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS sync_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    success INTEGER NOT NULL,
    media_count INTEGER DEFAULT 0,
    is_thread INTEGER DEFAULT 0,
    error_type TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    user_id INTEGER
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique sync event ID |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp of sync operation |
| `source` | TEXT | NOT NULL | Source platform ('twitter' or 'bluesky') |
| `target` | TEXT | NOT NULL | Target platform ('twitter' or 'bluesky') |
| `success` | INTEGER | NOT NULL | 1 = successful, 0 = failed |
| `media_count` | INTEGER | DEFAULT 0 | Number of media attachments synced |
| `is_thread` | INTEGER | DEFAULT 0 | 1 = thread sync, 0 = single post |
| `error_type` | TEXT | NULL | Type of error if failed (e.g., 'RateLimitError') |
| `error_message` | TEXT | NULL | Detailed error message |
| `duration_ms` | INTEGER | NULL | Sync operation duration in milliseconds |
| `user_id` | INTEGER | NULL | User who initiated the sync |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_sync_stats_timestamp ON sync_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_stats_success ON sync_stats(success);
CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id);
```

**Example Queries:**

```sql
-- Record sync success
INSERT INTO sync_stats
(timestamp, source, target, success, media_count, is_thread, duration_ms, user_id)
VALUES (?, ?, ?, 1, ?, ?, ?, ?);

-- Record sync failure
INSERT INTO sync_stats
(timestamp, source, target, success, error_type, error_message, user_id)
VALUES (?, ?, ?, 0, ?, ?, ?);

-- Get sync success rate for user
SELECT
    COUNT(*) as total,
    SUM(success) as successful,
    ROUND(SUM(success) * 100.0 / COUNT(*), 2) as success_rate
FROM sync_stats
WHERE user_id = ? AND timestamp >= ?;

-- Get recent failures
SELECT * FROM sync_stats
WHERE success = 0 AND user_id = ?
ORDER BY timestamp DESC LIMIT 10;

-- Get average sync duration
SELECT AVG(duration_ms) as avg_duration
FROM sync_stats
WHERE success = 1 AND user_id = ? AND timestamp >= ?;
```

**Used By:**
- `app/sync/sync_engine.py` - Record sync operations
- `app/services/stats_handler.py` - Statistics aggregation
- `app/features/analytics_tracker.py` - Analytics dashboard

---

### hourly_stats

**Purpose:** Aggregated hourly statistics for sync operations.

**Module:** `app/core/db_handler.py` (created by `add_stats_tables()`)

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS hourly_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_timestamp INTEGER NOT NULL UNIQUE,
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    twitter_to_bluesky INTEGER DEFAULT 0,
    bluesky_to_twitter INTEGER DEFAULT 0,
    total_media INTEGER DEFAULT 0,
    total_threads INTEGER DEFAULT 0,
    avg_duration_ms REAL DEFAULT 0,
    user_id INTEGER
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique stat record ID |
| `hour_timestamp` | INTEGER | NOT NULL, UNIQUE | Start of hour (Unix timestamp) |
| `total_syncs` | INTEGER | DEFAULT 0 | Total sync operations in this hour |
| `successful_syncs` | INTEGER | DEFAULT 0 | Number of successful syncs |
| `failed_syncs` | INTEGER | DEFAULT 0 | Number of failed syncs |
| `twitter_to_bluesky` | INTEGER | DEFAULT 0 | Syncs from Twitter to Bluesky |
| `bluesky_to_twitter` | INTEGER | DEFAULT 0 | Syncs from Bluesky to Twitter |
| `total_media` | INTEGER | DEFAULT 0 | Total media items synced |
| `total_threads` | INTEGER | DEFAULT 0 | Total thread syncs |
| `avg_duration_ms` | REAL | DEFAULT 0 | Average sync duration in milliseconds |
| `user_id` | INTEGER | NULL | User filter for multi-user stats |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_hourly_stats_timestamp ON hourly_stats(hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_user ON hourly_stats(user_id);
```

**Aggregation Process:**

Stats are aggregated from `sync_stats` table hourly:

```sql
-- Aggregate hourly stats
INSERT OR REPLACE INTO hourly_stats
(hour_timestamp, total_syncs, successful_syncs, failed_syncs, ...)
SELECT
    strftime('%s', timestamp, 'unixepoch', 'start of hour') as hour_timestamp,
    COUNT(*) as total_syncs,
    SUM(success) as successful_syncs,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_syncs,
    ...
FROM sync_stats
WHERE user_id = ?
GROUP BY hour_timestamp;
```

**Example Queries:**

```sql
-- Get hourly stats for last 24 hours
SELECT * FROM hourly_stats
WHERE hour_timestamp >= ? AND user_id = ?
ORDER BY hour_timestamp DESC;

-- Get total syncs in last week
SELECT SUM(total_syncs) FROM hourly_stats
WHERE hour_timestamp >= ? AND user_id = ?;

-- Get sync direction breakdown
SELECT
    SUM(twitter_to_bluesky) as t2b,
    SUM(bluesky_to_twitter) as b2t
FROM hourly_stats
WHERE user_id = ?;
```

**Used By:**
- `app/services/stats_handler.py` - Statistics aggregation
- `app/features/report_generator.py` - Report generation
- Dashboard/monitoring tools

---

### tweet_metrics

**Purpose:** Time-series storage of tweet engagement metrics (likes, retweets, impressions).

**Module:** `app/features/analytics_tracker.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS tweet_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0.0,
    UNIQUE(tweet_id, user_id, timestamp)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique metric record ID |
| `tweet_id` | TEXT | NOT NULL | Twitter/Bluesky tweet ID |
| `user_id` | INTEGER | NOT NULL | User who owns the tweet |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp of metric snapshot |
| `impressions` | INTEGER | DEFAULT 0 | Number of times tweet was viewed |
| `likes` | INTEGER | DEFAULT 0 | Number of likes |
| `retweets` | INTEGER | DEFAULT 0 | Number of retweets/reposts |
| `replies` | INTEGER | DEFAULT 0 | Number of replies |
| `engagements` | INTEGER | DEFAULT 0 | Total engagements (likes + retweets + replies) |
| `engagement_rate` | REAL | DEFAULT 0.0 | Engagement rate as percentage (engagements/impressions * 100) |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_user ON tweet_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_tweet ON tweet_metrics(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_timestamp ON tweet_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_engagement ON tweet_metrics(engagement_rate DESC);
```

**Engagement Rate Calculation:**

```python
engagement_rate = (engagements / impressions) * 100.0 if impressions > 0 else 0.0
```

**Example Queries:**

```sql
-- Record tweet metrics
INSERT INTO tweet_metrics
(tweet_id, user_id, timestamp, impressions, likes, retweets,
 replies, engagements, engagement_rate)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Get latest metrics for tweet
SELECT * FROM tweet_metrics
WHERE tweet_id = ?
ORDER BY timestamp DESC LIMIT 1;

-- Get top tweets by engagement rate
SELECT
    tweet_id,
    MAX(engagement_rate) as max_engagement_rate,
    MAX(likes) as total_likes
FROM tweet_metrics
WHERE user_id = ?
GROUP BY tweet_id
ORDER BY max_engagement_rate DESC
LIMIT 10;

-- Get metrics over time for specific tweet
SELECT timestamp, impressions, likes, retweets, engagement_rate
FROM tweet_metrics
WHERE tweet_id = ? AND user_id = ?
ORDER BY timestamp ASC;

-- Get aggregate analytics for user
SELECT
    COUNT(DISTINCT tweet_id) as total_tweets,
    SUM(impressions) as total_impressions,
    SUM(engagements) as total_engagements,
    AVG(engagement_rate) as avg_engagement_rate
FROM tweet_metrics
WHERE user_id = ? AND timestamp >= ?;
```

**Used By:**
- `app/features/analytics_tracker.py` - Metrics tracking
- `app/features/report_generator.py` - Analytics reports
- Dashboard visualization

---

### analytics_snapshots

**Purpose:** Period-based analytics snapshots (hourly, daily, weekly, monthly).

**Module:** `app/features/analytics_tracker.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    period TEXT NOT NULL,
    period_start INTEGER NOT NULL,
    total_tweets INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    avg_engagement_rate REAL DEFAULT 0.0,
    top_tweet_id TEXT,
    UNIQUE(user_id, period, period_start)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique snapshot ID |
| `user_id` | INTEGER | NOT NULL | User who owns this snapshot |
| `period` | TEXT | NOT NULL | Period type ('hourly', 'daily', 'weekly', 'monthly') |
| `period_start` | INTEGER | NOT NULL | Start of period (Unix timestamp) |
| `total_tweets` | INTEGER | DEFAULT 0 | Total tweets in this period |
| `total_impressions` | INTEGER | DEFAULT 0 | Total impressions in this period |
| `total_engagements` | INTEGER | DEFAULT 0 | Total engagements in this period |
| `avg_engagement_rate` | REAL | DEFAULT 0.0 | Average engagement rate for period |
| `top_tweet_id` | TEXT | NULL | Tweet ID with highest engagement in period |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON analytics_snapshots(period, period_start);
```

**Period Calculation:**

```python
# Hourly: Round to start of hour
period_start = (now // 3600) * 3600

# Daily: Round to start of day
period_start = (now // 86400) * 86400

# Weekly: Round to start of week
period_start = (now // 604800) * 604800

# Monthly: Start of month
from datetime import datetime
dt = datetime.fromtimestamp(now)
period_start = int(datetime(dt.year, dt.month, 1).timestamp())
```

**Example Queries:**

```sql
-- Create snapshot
INSERT OR REPLACE INTO analytics_snapshots
(user_id, period, period_start, total_tweets, total_impressions,
 total_engagements, avg_engagement_rate, top_tweet_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Get snapshot for specific period
SELECT * FROM analytics_snapshots
WHERE user_id = ? AND period = ? AND period_start = ?;

-- Get all snapshots for user
SELECT * FROM analytics_snapshots
WHERE user_id = ? AND period = ?
ORDER BY period_start DESC;
```

**Used By:**
- `app/features/analytics_tracker.py` - Snapshot creation
- `app/features/report_generator.py` - Historical analytics

---

### daily_stats

**Purpose:** Aggregated daily sync statistics.

**Module:** `app/features/maintenance_tasks.py` (created by `aggregate_daily_stats()`)

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_id INTEGER,
    total_syncs INTEGER DEFAULT 0,
    successful_syncs INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    UNIQUE(date, user_id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique daily stat ID |
| `date` | TEXT | NOT NULL | Date in YYYY-MM-DD format |
| `user_id` | INTEGER | NULL | User filter for stats |
| `total_syncs` | INTEGER | DEFAULT 0 | Total sync operations on this date |
| `successful_syncs` | INTEGER | DEFAULT 0 | Successful sync operations |
| `failed_syncs` | INTEGER | DEFAULT 0 | Failed sync operations |
| `total_duration_ms` | INTEGER | DEFAULT 0 | Total duration of all syncs |

**Example Queries:**

```sql
-- Aggregate yesterday's stats
INSERT OR REPLACE INTO daily_stats (date, user_id, total_syncs, successful_syncs, failed_syncs)
SELECT
    date(timestamp, 'unixepoch') as date,
    user_id,
    COUNT(*),
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END)
FROM sync_stats
WHERE date(timestamp, 'unixepoch') = ?
GROUP BY user_id;

-- Get stats for date range
SELECT * FROM daily_stats
WHERE date BETWEEN ? AND ? AND user_id = ?;
```

**Used By:**
- `app/features/maintenance_tasks.py` - Daily aggregation (runs at 1 AM)
- Reporting and analytics

---

## Feature Tables

### scheduled_tweets

**Purpose:** Queue for scheduled tweets to be posted at specified times.

**Module:** `app/features/tweet_scheduler.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS scheduled_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_paths TEXT,
    scheduled_time INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    posted_at INTEGER,
    tweet_id TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique scheduled tweet ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | User who scheduled the tweet |
| `content` | TEXT | NOT NULL | Tweet text content |
| `media_paths` | TEXT | NULL | JSON array of media file paths |
| `scheduled_time` | INTEGER | NOT NULL | Unix timestamp when to post |
| `status` | TEXT | DEFAULT 'pending' | Status: 'pending', 'posted', 'failed', 'cancelled' |
| `posted_at` | INTEGER | NULL | Unix timestamp when actually posted |
| `tweet_id` | TEXT | NULL | Twitter tweet ID after posting |
| `error` | TEXT | NULL | Error message if posting failed |
| `created_at` | INTEGER | NOT NULL | Unix timestamp when scheduled |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_tweets(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_tweets(scheduled_time);
```

**Status Flow:**

```
pending -> posted (success)
pending -> failed (error occurred)
pending -> cancelled (user cancelled)
```

**Example Queries:**

```sql
-- Schedule a tweet
INSERT INTO scheduled_tweets
(user_id, content, media_paths, scheduled_time, status, created_at)
VALUES (?, ?, ?, ?, 'pending', ?);

-- Get pending tweets due for posting
SELECT * FROM scheduled_tweets
WHERE status = 'pending' AND scheduled_time <= ?
ORDER BY scheduled_time ASC;

-- Update status to posted
UPDATE scheduled_tweets
SET status = 'posted', posted_at = ?, tweet_id = ?
WHERE id = ?;

-- Update status to failed
UPDATE scheduled_tweets
SET status = 'failed', error = ?
WHERE id = ?;

-- Cancel scheduled tweet
UPDATE scheduled_tweets
SET status = 'cancelled'
WHERE id = ? AND user_id = ? AND status = 'pending';

-- Get user's scheduled tweets
SELECT * FROM scheduled_tweets
WHERE user_id = ? AND status = ?
ORDER BY scheduled_time ASC;
```

**Used By:**
- `app/features/tweet_scheduler.py` - Schedule management
- `app/services/task_scheduler.py` - Cron processing (every minute)

---

### cleanup_rules

**Purpose:** Rule-based tweet cleanup configurations.

**Module:** `app/features/cleanup_engine.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS cleanup_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    rule_type TEXT NOT NULL,
    rule_config TEXT NOT NULL,
    last_run INTEGER,
    deleted_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique rule ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | User who owns this rule |
| `name` | TEXT | NOT NULL | Human-readable rule name |
| `enabled` | INTEGER | DEFAULT 1 | 1 = enabled, 0 = disabled |
| `rule_type` | TEXT | NOT NULL | Type: 'age', 'engagement', 'pattern' |
| `rule_config` | TEXT | NOT NULL | JSON configuration for the rule |
| `last_run` | INTEGER | NULL | Unix timestamp of last execution |
| `deleted_count` | INTEGER | DEFAULT 0 | Total tweets deleted by this rule |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of rule creation |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_cleanup_rules_user ON cleanup_rules(user_id);
```

**Rule Types & Configurations:**

**Age-based rule:**
```json
{
    "max_age_days": 30,
    "exclude_with_replies": false
}
```

**Engagement-based rule:**
```json
{
    "min_likes": 10,
    "delete_if_below": true
}
```

**Pattern-based rule:**
```json
{
    "regex": "#old|deprecated"
}
```

**Example Queries:**

```sql
-- Create cleanup rule
INSERT INTO cleanup_rules
(user_id, name, enabled, rule_type, rule_config, created_at, deleted_count)
VALUES (?, ?, 1, ?, ?, ?, 0);

-- Get user's enabled rules
SELECT * FROM cleanup_rules
WHERE user_id = ? AND enabled = 1;

-- Update rule stats after execution
UPDATE cleanup_rules
SET last_run = ?, deleted_count = deleted_count + ?
WHERE id = ?;

-- Disable rule
UPDATE cleanup_rules SET enabled = 0 WHERE id = ? AND user_id = ?;

-- Delete rule
DELETE FROM cleanup_rules WHERE id = ? AND user_id = ?;
```

**Used By:**
- `app/features/cleanup_engine.py` - Rule evaluation and execution

---

### cleanup_history

**Purpose:** Track cleanup rule execution history.

**Module:** `app/features/cleanup_engine.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS cleanup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    tweets_deleted INTEGER DEFAULT 0,
    executed_at INTEGER NOT NULL,
    dry_run INTEGER DEFAULT 1,
    FOREIGN KEY (rule_id) REFERENCES cleanup_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique history record ID |
| `rule_id` | INTEGER | NOT NULL, FOREIGN KEY | Rule that was executed |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | User who executed the rule |
| `tweets_deleted` | INTEGER | DEFAULT 0 | Number of tweets deleted |
| `executed_at` | INTEGER | NOT NULL | Unix timestamp of execution |
| `dry_run` | INTEGER | DEFAULT 1 | 1 = dry run, 0 = actual deletion |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_cleanup_history_user ON cleanup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_history_rule ON cleanup_history(rule_id);
```

**Example Queries:**

```sql
-- Record cleanup execution
INSERT INTO cleanup_history
(rule_id, user_id, tweets_deleted, executed_at, dry_run)
VALUES (?, ?, ?, ?, ?);

-- Get cleanup history for user
SELECT h.*, r.name as rule_name
FROM cleanup_history h
LEFT JOIN cleanup_rules r ON h.rule_id = r.id
WHERE h.user_id = ?
ORDER BY h.executed_at DESC
LIMIT 50;

-- Get stats for specific rule
SELECT
    COUNT(*) as executions,
    SUM(tweets_deleted) as total_deleted,
    AVG(tweets_deleted) as avg_per_run
FROM cleanup_history
WHERE rule_id = ? AND dry_run = 0;
```

**Used By:**
- `app/features/cleanup_engine.py` - Execution tracking

---

## Search & Content Management

### tweet_search_index (FTS5)

**Purpose:** Full-text search index for synced tweets using SQLite FTS5.

**Module:** `app/features/search_engine.py`

**Schema:**

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS tweet_search_index USING fts5(
    tweet_id UNINDEXED,
    user_id UNINDEXED,
    content,
    hashtags,
    author,
    posted_at UNINDEXED,
    tokenize='porter unicode61'
);
```

**Columns:**

| Column | Type | Indexed | Description |
|--------|------|---------|-------------|
| `tweet_id` | TEXT | UNINDEXED | Tweet ID (not searchable, for result retrieval) |
| `user_id` | INTEGER | UNINDEXED | User ID (not searchable, for filtering) |
| `content` | TEXT | FTS5 | Full tweet text content (searchable) |
| `hashtags` | TEXT | FTS5 | Space/comma-separated hashtags (searchable) |
| `author` | TEXT | FTS5 | Tweet author username (searchable) |
| `posted_at` | INTEGER | UNINDEXED | Unix timestamp (not searchable, for sorting) |

**FTS5 Features:**

- **Tokenizer:** Porter stemming + Unicode61 normalization
- **Ranking:** BM25 algorithm (via `rank` column in results)
- **Query Syntax:**
  - Phrase search: `"exact phrase"`
  - Boolean: `term1 AND term2`, `term1 OR term2`
  - Proximity: `NEAR(term1 term2, N)` - terms within N positions
  - Column filter: `content:python` - search only in content column

**Automatic Sync Triggers:**

The FTS index is automatically kept in sync with `synced_posts` table using triggers:

```sql
-- INSERT trigger
CREATE TRIGGER IF NOT EXISTS sync_search_index_insert
AFTER INSERT ON synced_posts
WHEN NEW.user_id IS NOT NULL
BEGIN
    INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
    VALUES (
        COALESCE(NEW.twitter_id, NEW.bluesky_uri),
        NEW.user_id,
        NEW.original_text,
        COALESCE(NEW.hashtags, ''),
        COALESCE(NEW.twitter_username, ''),
        COALESCE(NEW.posted_at, strftime('%s', 'now'))
    );
END;

-- UPDATE trigger
CREATE TRIGGER IF NOT EXISTS sync_search_index_update
AFTER UPDATE ON synced_posts
WHEN NEW.user_id IS NOT NULL
BEGIN
    DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
    INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
    VALUES (
        COALESCE(NEW.twitter_id, NEW.bluesky_uri),
        NEW.user_id,
        NEW.original_text,
        COALESCE(NEW.hashtags, ''),
        COALESCE(NEW.twitter_username, ''),
        COALESCE(NEW.posted_at, strftime('%s', 'now'))
    );
END;

-- DELETE trigger
CREATE TRIGGER IF NOT EXISTS sync_search_index_delete
AFTER DELETE ON synced_posts
BEGIN
    DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
END;
```

**Example Queries:**

```sql
-- Full-text search with ranking
SELECT tweet_id, user_id, content, hashtags, author, posted_at, rank
FROM tweet_search_index
WHERE tweet_search_index MATCH 'python AND machine learning'
  AND user_id = ?
ORDER BY rank
LIMIT 50;

-- Phrase search
SELECT tweet_id, content FROM tweet_search_index
WHERE tweet_search_index MATCH '"artificial intelligence"'
  AND user_id = ?;

-- Proximity search (words within 5 positions)
SELECT tweet_id, content FROM tweet_search_index
WHERE tweet_search_index MATCH 'NEAR(data science, 5)'
  AND user_id = ?;

-- Search in specific column
SELECT tweet_id, content FROM tweet_search_index
WHERE tweet_search_index MATCH 'hashtags:#python'
  AND user_id = ?;

-- Search with date filter
SELECT tweet_id, user_id, content, posted_at
FROM tweet_search_index
WHERE tweet_search_index MATCH 'ChatGPT'
  AND user_id = ?
  AND posted_at >= ?
ORDER BY rank;

-- Rebuild index from synced_posts
DELETE FROM tweet_search_index WHERE user_id = ?;
INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
SELECT
    COALESCE(twitter_id, bluesky_uri),
    user_id,
    original_text,
    COALESCE(hashtags, ''),
    COALESCE(twitter_username, ''),
    COALESCE(posted_at, strftime('%s', 'now'))
FROM synced_posts
WHERE user_id = ? AND user_id IS NOT NULL;
```

**Index Statistics:**

```sql
-- Get search stats
SELECT COUNT(*), MAX(posted_at)
FROM tweet_search_index
WHERE user_id = ?;
```

**Used By:**
- `app/features/search_engine.py` - Search operations
- Web interface search functionality

---

### saved_tweets

**Purpose:** Saved/bookmarked tweets with optional collection organization.

**Module:** `app/features/saved_content.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS saved_tweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    collection_id INTEGER,
    notes TEXT,
    saved_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL,
    UNIQUE(user_id, tweet_id)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique saved tweet ID |
| `user_id` | INTEGER | NOT NULL | User who saved the tweet |
| `tweet_id` | TEXT | NOT NULL | Twitter/Bluesky tweet ID |
| `collection_id` | INTEGER | NULL, FOREIGN KEY | Collection (NULL = uncategorized) |
| `notes` | TEXT | NULL | User's personal notes about the tweet |
| `saved_at` | INTEGER | NOT NULL | Unix timestamp when saved |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_saved_tweets_user ON saved_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tweets_collection ON saved_tweets(collection_id);
```

**Example Queries:**

```sql
-- Save a tweet
INSERT INTO saved_tweets (user_id, tweet_id, collection_id, notes, saved_at)
VALUES (?, ?, ?, ?, ?);

-- Unsave a tweet
DELETE FROM saved_tweets WHERE user_id = ? AND tweet_id = ?;

-- Get all saved tweets for user
SELECT * FROM saved_tweets
WHERE user_id = ?
ORDER BY saved_at DESC;

-- Get saved tweets in specific collection
SELECT * FROM saved_tweets
WHERE user_id = ? AND collection_id = ?
ORDER BY saved_at DESC;

-- Get uncategorized saved tweets
SELECT * FROM saved_tweets
WHERE user_id = ? AND collection_id IS NULL
ORDER BY saved_at DESC;

-- Move tweet to collection
UPDATE saved_tweets
SET collection_id = ?
WHERE user_id = ? AND tweet_id = ?;

-- Search saved tweets
SELECT st.*, c.name as collection_name
FROM saved_tweets st
LEFT JOIN collections c ON st.collection_id = c.id
WHERE st.user_id = ?
  AND (st.notes LIKE ? OR st.tweet_id LIKE ?)
ORDER BY st.saved_at DESC;
```

**Used By:**
- `app/features/saved_content.py` - Bookmark management
- Web interface bookmarks feature

---

### collections

**Purpose:** Organize saved tweets into named collections.

**Module:** `app/features/saved_content.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, name)
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique collection ID |
| `user_id` | INTEGER | NOT NULL | User who owns the collection |
| `name` | TEXT | NOT NULL | Collection name (unique per user) |
| `description` | TEXT | NULL | Optional description |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of creation |

**Indexes:**

```sql
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
```

**Example Queries:**

```sql
-- Create collection
INSERT INTO collections (user_id, name, description, created_at)
VALUES (?, ?, ?, ?);

-- Get user's collections
SELECT * FROM collections
WHERE user_id = ?
ORDER BY created_at DESC;

-- Delete collection (saved_tweets.collection_id will be SET NULL)
DELETE FROM collections WHERE id = ? AND user_id = ?;

-- Rename collection
UPDATE collections SET name = ? WHERE id = ? AND user_id = ?;

-- Get collection with tweet count
SELECT c.*, COUNT(st.id) as tweet_count
FROM collections c
LEFT JOIN saved_tweets st ON c.id = st.collection_id
WHERE c.user_id = ?
GROUP BY c.id;
```

**Used By:**
- `app/features/saved_content.py` - Collection management

---

## Maintenance & Audit Tables

### audit_log

**Purpose:** Comprehensive audit trail for security and compliance.

**Module:** `app/auth/security_utils.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER,
    details TEXT,
    created_at INTEGER NOT NULL
);
```

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique log entry ID |
| `user_id` | INTEGER | NULL | User who performed action (NULL for failed logins) |
| `action` | TEXT | NOT NULL | Action type (e.g., 'login', 'logout', 'user_created') |
| `resource_type` | TEXT | NULL | Type of resource ('user', 'credential', etc.) |
| `resource_id` | INTEGER | NULL | ID of affected resource |
| `ip_address` | TEXT | NULL | Client IP address |
| `user_agent` | TEXT | NULL | Client user agent string |
| `success` | INTEGER | NULL | 1 = success, 0 = failure |
| `details` | TEXT | NULL | JSON-encoded additional details |
| `created_at` | INTEGER | NOT NULL | Unix timestamp of event |

**Common Actions:**

- `user_created`, `user_updated`, `user_deleted`
- `login_success`, `login_failed`
- `session_created`, `session_deleted`
- `credential_created`, `credential_updated`, `credential_deleted`, `credentials_shared`
- `sync_started`, `sync_completed`, `sync_failed`

**Example Queries:**

```sql
-- Log audit event
INSERT INTO audit_log
(user_id, action, resource_type, resource_id, ip_address, user_agent, success, details, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Get audit log for user
SELECT * FROM audit_log
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 100;

-- Get failed login attempts
SELECT * FROM audit_log
WHERE action = 'login_failed' AND created_at >= ?
ORDER BY created_at DESC;

-- Get audit log for specific resource
SELECT * FROM audit_log
WHERE resource_type = ? AND resource_id = ?
ORDER BY created_at DESC;

-- Get recent security events
SELECT * FROM audit_log
WHERE action IN ('login_failed', 'login_success', 'user_created', 'user_deleted')
ORDER BY created_at DESC
LIMIT 50;
```

**Used By:**
- `app/auth/security_utils.py` - `log_audit()` function
- `app/auth/user_manager.py` - User operations
- `app/auth/credential_manager.py` - Credential operations
- Security monitoring tools

---

### archived_audit_logs

**Purpose:** Long-term storage for old audit logs (archival).

**Module:** `app/features/maintenance_tasks.py`

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS archived_audit_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    action TEXT,
    resource_type TEXT,
    resource_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER,
    details TEXT,
    created_at INTEGER,
    archived_at INTEGER
);
```

**Columns:** Same as `audit_log` plus:

| Column | Type | Description |
|--------|------|-------------|
| `archived_at` | INTEGER | Unix timestamp when archived |

**Archive Process:**

Logs older than 90 days are automatically moved to archive:

```sql
-- Archive old logs
INSERT INTO archived_audit_logs
SELECT *, ? as archived_at FROM audit_log
WHERE created_at < ?;

DELETE FROM audit_log WHERE created_at < ?;
```

**Example Queries:**

```sql
-- Search archived logs
SELECT * FROM archived_audit_logs
WHERE user_id = ? AND created_at BETWEEN ? AND ?
ORDER BY created_at DESC;

-- Get archive statistics
SELECT
    COUNT(*) as total_archived,
    MIN(created_at) as oldest_log,
    MAX(created_at) as newest_log
FROM archived_audit_logs;
```

**Used By:**
- `app/features/maintenance_tasks.py` - `archive_audit_logs()` (runs daily at 2 AM)

---

## Database Migrations

ChirpSyncer uses a progressive migration system to upgrade the database schema across versions.

### Migration Functions

**Module:** `app/core/db_handler.py`

#### 1. initialize_db()

Creates initial legacy tables (for backward compatibility):
- `seen_tweets` - Legacy tweet tracking
- `api_usage` - API rate limit storage

```python
def initialize_db(db_path=None):
    """Initialize database with legacy tables"""
    conn = sqlite3.connect(db_path or DB_PATH)
    cursor = conn.cursor()

    # Create legacy tables...
    conn.commit()
    conn.close()
```

#### 2. migrate_database()

**Purpose:** Migrate from legacy `seen_tweets` to modern `synced_posts` schema.

**Migration:** BIDIR-003 - Bidirectional Sync Support

```python
def migrate_database(db_path=None):
    """
    Migrate from seen_tweets to synced_posts schema.
    Creates new synced_posts table with full metadata tracking.
    """
    conn = sqlite3.connect(db_path or DB_PATH)
    cursor = conn.cursor()

    # Check if old table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='seen_tweets'")
    old_table_exists = cursor.fetchone() is not None

    # Create synced_posts with full schema
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS synced_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twitter_id TEXT,
        bluesky_uri TEXT,
        source TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE,
        synced_to TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_text TEXT NOT NULL,
        CHECK (source IN ('twitter', 'bluesky')),
        CHECK (synced_to IN ('bluesky', 'twitter', 'both'))
    )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON synced_posts(source)")

    conn.commit()
    conn.close()
```

#### 3. add_stats_tables()

**Purpose:** Add statistics tracking tables.

```python
def add_stats_tables(db_path=None):
    """Create sync_stats and hourly_stats tables"""
    conn = sqlite3.connect(db_path or DB_PATH)
    cursor = conn.cursor()

    # Create sync_stats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        success INTEGER NOT NULL,
        media_count INTEGER DEFAULT 0,
        is_thread INTEGER DEFAULT 0,
        error_type TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        user_id INTEGER
    )
    """)

    # Create hourly_stats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hourly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_timestamp INTEGER NOT NULL UNIQUE,
        total_syncs INTEGER DEFAULT 0,
        successful_syncs INTEGER DEFAULT 0,
        failed_syncs INTEGER DEFAULT 0,
        twitter_to_bluesky INTEGER DEFAULT 0,
        bluesky_to_twitter INTEGER DEFAULT 0,
        total_media INTEGER DEFAULT 0,
        total_threads INTEGER DEFAULT 0,
        avg_duration_ms REAL DEFAULT 0
    )
    """)

    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_stats_timestamp ON sync_stats(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_stats_success ON sync_stats(success)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hourly_stats_timestamp ON hourly_stats(hour_timestamp)")

    conn.commit()
    conn.close()
```

#### 4. Multi-User Migration

**Script:** `scripts/migrate_to_multi_user.py`

**Purpose:** Migrate from single-user to multi-user architecture.

**Steps:**
1. Create `users` table
2. Create `user_sessions` table
3. Create `user_credentials` table (encrypted)
4. Add `user_id` columns to existing tables
5. Create admin user from .env
6. Migrate .env credentials to encrypted storage
7. Assign all existing data to admin user

```bash
# Run migration
python scripts/migrate_to_multi_user.py
```

**Migration adds user_id to:**
- `synced_posts`
- `sync_stats`
- `hourly_stats`

```sql
ALTER TABLE synced_posts ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE sync_stats ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE hourly_stats ADD COLUMN user_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_synced_posts_user ON synced_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_user ON hourly_stats(user_id);
```

### Migration Best Practices

1. **Always backup before migration:**
   ```bash
   cp chirpsyncer.db chirpsyncer_backup_$(date +%Y%m%d).db
   ```

2. **Use IF NOT EXISTS for idempotency:**
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   ```

3. **Check for existing columns before ALTER:**
   ```python
   cursor.execute("PRAGMA table_info(synced_posts)")
   columns = {row[1] for row in cursor.fetchall()}
   if 'user_id' not in columns:
       cursor.execute('ALTER TABLE synced_posts ADD COLUMN user_id INTEGER')
   ```

4. **Test migrations on copy of production database**

5. **Log migration progress and errors**

---

## Indexes

Comprehensive index documentation for query optimization.

### Index Strategy

ChirpSyncer uses indexes for:
- **Foreign key columns** - Fast JOINs and CASCADE operations
- **Filter columns** - WHERE clause optimization
- **Sort columns** - ORDER BY optimization
- **Unique constraints** - Data integrity

### Index Listing by Table

#### synced_posts
```sql
CREATE INDEX IF NOT EXISTS idx_twitter_id ON synced_posts(twitter_id);
CREATE INDEX IF NOT EXISTS idx_bluesky_uri ON synced_posts(bluesky_uri);
CREATE INDEX IF NOT EXISTS idx_content_hash ON synced_posts(content_hash);
CREATE INDEX IF NOT EXISTS idx_source ON synced_posts(source);
CREATE INDEX IF NOT EXISTS idx_synced_posts_user ON synced_posts(user_id);
```

#### user_sessions
```sql
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
```

#### user_credentials
```sql
CREATE INDEX IF NOT EXISTS idx_credentials_user ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_platform ON user_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_credentials_owner ON user_credentials(owner_user_id);
```

#### sync_stats
```sql
CREATE INDEX IF NOT EXISTS idx_sync_stats_timestamp ON sync_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_stats_success ON sync_stats(success);
CREATE INDEX IF NOT EXISTS idx_sync_stats_user ON sync_stats(user_id);
```

#### hourly_stats
```sql
CREATE INDEX IF NOT EXISTS idx_hourly_stats_timestamp ON hourly_stats(hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_user ON hourly_stats(user_id);
```

#### tweet_metrics
```sql
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_user ON tweet_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_tweet ON tweet_metrics(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_timestamp ON tweet_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tweet_metrics_engagement ON tweet_metrics(engagement_rate DESC);
```

#### analytics_snapshots
```sql
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON analytics_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_period ON analytics_snapshots(period, period_start);
```

#### scheduled_tweets
```sql
CREATE INDEX IF NOT EXISTS idx_scheduled_user ON scheduled_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_tweets(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_tweets(scheduled_time);
```

#### cleanup_rules
```sql
CREATE INDEX IF NOT EXISTS idx_cleanup_rules_user ON cleanup_rules(user_id);
```

#### cleanup_history
```sql
CREATE INDEX IF NOT EXISTS idx_cleanup_history_user ON cleanup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_history_rule ON cleanup_history(rule_id);
```

#### saved_tweets
```sql
CREATE INDEX IF NOT EXISTS idx_saved_tweets_user ON saved_tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tweets_collection ON saved_tweets(collection_id);
```

#### collections
```sql
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
```

### Index Maintenance

Check index usage:
```sql
-- SQLite doesn't have built-in index usage stats
-- Use EXPLAIN QUERY PLAN to verify index usage
EXPLAIN QUERY PLAN
SELECT * FROM synced_posts WHERE user_id = 1;
```

Rebuild indexes (if corrupted):
```sql
REINDEX;
```

---

## Triggers

### FTS5 Sync Triggers

Keep `tweet_search_index` in sync with `synced_posts`:

#### sync_search_index_insert
```sql
CREATE TRIGGER IF NOT EXISTS sync_search_index_insert
AFTER INSERT ON synced_posts
WHEN NEW.user_id IS NOT NULL
BEGIN
    INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
    VALUES (
        COALESCE(NEW.twitter_id, NEW.bluesky_uri),
        NEW.user_id,
        NEW.original_text,
        COALESCE(NEW.hashtags, ''),
        COALESCE(NEW.twitter_username, ''),
        COALESCE(NEW.posted_at, strftime('%s', 'now'))
    );
END;
```

#### sync_search_index_update
```sql
CREATE TRIGGER IF NOT EXISTS sync_search_index_update
AFTER UPDATE ON synced_posts
WHEN NEW.user_id IS NOT NULL
BEGIN
    DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
    INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
    VALUES (
        COALESCE(NEW.twitter_id, NEW.bluesky_uri),
        NEW.user_id,
        NEW.original_text,
        COALESCE(NEW.hashtags, ''),
        COALESCE(NEW.twitter_username, ''),
        COALESCE(NEW.posted_at, strftime('%s', 'now'))
    );
END;
```

#### sync_search_index_delete
```sql
CREATE TRIGGER IF NOT EXISTS sync_search_index_delete
AFTER DELETE ON synced_posts
BEGIN
    DELETE FROM tweet_search_index WHERE tweet_id = COALESCE(OLD.twitter_id, OLD.bluesky_uri);
END;
```

### Trigger Management

List all triggers:
```sql
SELECT name, sql FROM sqlite_master WHERE type = 'trigger';
```

Drop trigger:
```sql
DROP TRIGGER IF EXISTS trigger_name;
```

---

## Encryption & Security

### Credential Encryption (AES-256-GCM)

**Algorithm:** AES-256-GCM (Galois/Counter Mode)

**Key Management:**
- Master key stored in environment variable: `ENCRYPTION_KEY`
- Must be exactly 32 bytes (256 bits)
- Generate with: `python -c "import os; print(os.urandom(32).hex())"`

**Encryption Process:**

1. **Generate IV:** 12 random bytes per credential
2. **Encrypt:** AES-256-GCM with master key
3. **Store:** `encrypted_data`, `encryption_iv`, `encryption_tag`

**Security Features:**
- **Authenticated encryption** - Prevents tampering
- **Unique IV per credential** - Prevents pattern analysis
- **16-byte authentication tag** - Detects modifications

**Example Implementation:**

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import json

# Initialize cipher
master_key = os.urandom(32)  # 256 bits
aesgcm = AESGCM(master_key)

# Encrypt credentials
data = {"username": "user", "password": "pass"}
json_data = json.dumps(data).encode('utf-8')
iv = os.urandom(12)  # 96 bits
ciphertext_and_tag = aesgcm.encrypt(iv, json_data, None)
ciphertext = ciphertext_and_tag[:-16]
tag = ciphertext_and_tag[-16:]

# Decrypt credentials
ciphertext_and_tag = ciphertext + tag
plaintext = aesgcm.decrypt(iv, ciphertext_and_tag, None)
data = json.loads(plaintext.decode('utf-8'))
```

### Password Security

**Hashing:** bcrypt with cost factor 12

```python
import bcrypt

# Hash password
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))

# Verify password
is_valid = bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*(),.?":{}|<>)

### Session Security

- **Token generation:** `secrets.token_urlsafe(32)` - cryptographically secure
- **Token storage:** Plain text in database (use HTTPS for transmission)
- **Expiration:** 7 days default
- **Automatic cleanup:** Expired sessions deleted hourly

### Audit Logging

All security-relevant actions are logged to `audit_log`:
- User authentication (success/failure)
- Credential operations (create/update/delete)
- User management (create/update/delete)
- Session management

**PII in Logs:**
- IP addresses stored (for security analysis)
- Passwords NEVER logged
- Detailed error messages in `details` JSON field

---

## Backup & Maintenance

### Automated Backups

**Frequency:** Daily at 3 AM

**Location:** `backups/chirpsyncer_backup_<timestamp>.db`

**Backup Function:**

```python
def backup_database(backup_dir='backups', db_path='chirpsyncer.db'):
    """Create timestamped database backup"""
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = int(time.time())
    backup_name = f'chirpsyncer_backup_{timestamp}.db'
    backup_path = os.path.join(backup_dir, backup_name)
    shutil.copy2(db_path, backup_path)
    return {'backup_path': backup_path, 'size_bytes': os.path.getsize(backup_path)}
```

**Manual Backup:**

```bash
# Copy database file
cp chirpsyncer.db backups/chirpsyncer_$(date +%Y%m%d_%H%M%S).db

# Or use SQLite command
sqlite3 chirpsyncer.db ".backup backups/chirpsyncer_$(date +%Y%m%d_%H%M%S).db"
```

### Maintenance Tasks

Scheduled maintenance tasks (see `app/features/maintenance_tasks.py`):

#### 1. Cleanup Expired Sessions
**Schedule:** Every hour (0 * * * *)
```python
def cleanup_expired_sessions():
    """Delete sessions with expires_at < current time"""
    DELETE FROM user_sessions WHERE expires_at < ?
```

#### 2. Archive Audit Logs
**Schedule:** Daily at 2 AM (0 2 * * *)
```python
def archive_audit_logs(days_old=90):
    """Archive audit logs older than 90 days"""
    # Move to archived_audit_logs
    # Delete from audit_log
```

#### 3. Aggregate Daily Stats
**Schedule:** Daily at 1 AM (0 1 * * *)
```python
def aggregate_daily_stats():
    """Aggregate sync_stats into daily_stats"""
    # Summarize yesterday's sync_stats by date and user_id
```

#### 4. Cleanup Error Logs
**Schedule:** Weekly on Sunday at 4 AM (0 4 * * 0)
```python
def cleanup_error_logs(days_old=30):
    """Delete audit log errors older than 30 days"""
    DELETE FROM audit_log WHERE success = 0 AND created_at < ?
```

#### 5. Cleanup Inactive Credentials
**Schedule:** Monthly on 1st at 5 AM (0 5 1 * *)
```python
def cleanup_inactive_credentials(months=6):
    """Mark credentials as inactive if last_used > 6 months ago"""
    UPDATE user_credentials SET is_active = 0
    WHERE is_active = 1 AND (last_used IS NULL OR last_used < ?)
```

#### 6. Database Backup
**Schedule:** Daily at 3 AM (0 3 * * *)

### Database Optimization

#### VACUUM

Reclaim space and optimize database:
```sql
-- Full vacuum (rebuilds entire database)
VACUUM;

-- Auto-vacuum mode (gradual cleanup)
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA incremental_vacuum;
```

#### ANALYZE

Update query planner statistics:
```sql
ANALYZE;
```

#### WAL Checkpoint

Checkpoint WAL file to main database:
```sql
PRAGMA wal_checkpoint(TRUNCATE);
```

### Database Integrity Check

```sql
-- Quick integrity check
PRAGMA integrity_check;

-- Quick check (faster)
PRAGMA quick_check;

-- Foreign key check
PRAGMA foreign_key_check;
```

### Database Statistics

```sql
-- Database size
SELECT page_count * page_size as size
FROM pragma_page_count(), pragma_page_size();

-- Table sizes
SELECT
    name,
    SUM(pgsize) as size
FROM dbstat
GROUP BY name
ORDER BY size DESC;

-- Index usage (estimate)
SELECT * FROM sqlite_stat1;
```

---

## Troubleshooting

### Common Issues

#### 1. Database Locked Error

**Error:** `sqlite3.OperationalError: database is locked`

**Causes:**
- Multiple processes accessing database
- Long-running transaction
- WAL mode not enabled

**Solutions:**

```python
# Set timeout for lock acquisition
conn = sqlite3.connect('chirpsyncer.db', timeout=30)

# Enable WAL mode for better concurrency
conn.execute('PRAGMA journal_mode=WAL')

# Use context manager for automatic transaction handling
with sqlite3.connect('chirpsyncer.db') as conn:
    cursor = conn.cursor()
    # Operations auto-commit on exit
```

```sql
-- Check for locks
PRAGMA database_list;

-- Enable WAL mode
PRAGMA journal_mode=WAL;
```

#### 2. Disk I/O Error

**Error:** `sqlite3.DatabaseError: disk I/O error`

**Causes:**
- Disk full
- File permissions
- Corrupted database

**Solutions:**

```bash
# Check disk space
df -h

# Check file permissions
ls -la chirpsyncer.db

# Test database integrity
sqlite3 chirpsyncer.db "PRAGMA integrity_check"

# Recover from backup
cp backups/latest_backup.db chirpsyncer.db
```

#### 3. Foreign Key Constraint Failed

**Error:** `FOREIGN KEY constraint failed`

**Causes:**
- Referenced parent record doesn't exist
- Foreign keys not enabled

**Solutions:**

```python
# Enable foreign key constraints
conn = sqlite3.connect('chirpsyncer.db')
conn.execute('PRAGMA foreign_keys = ON')

# Check constraint violations
cursor.execute('PRAGMA foreign_key_check')
violations = cursor.fetchall()
```

#### 4. Unique Constraint Violation

**Error:** `UNIQUE constraint failed: table.column`

**Causes:**
- Duplicate data insertion
- Race condition in multi-threaded environment

**Solutions:**

```sql
-- Use INSERT OR IGNORE
INSERT OR IGNORE INTO table (...) VALUES (...);

-- Use INSERT OR REPLACE
INSERT OR REPLACE INTO table (...) VALUES (...);

-- Use ON CONFLICT clause
INSERT INTO table (...) VALUES (...)
ON CONFLICT(column) DO NOTHING;
```

#### 5. FTS5 Index Out of Sync

**Symptoms:**
- Search results incomplete
- Triggers not firing

**Solutions:**

```python
from app.features.search_engine import SearchEngine

engine = SearchEngine('chirpsyncer.db')

# Rebuild FTS5 index
count = engine.rebuild_index(user_id=1)
print(f"Rebuilt index with {count} tweets")
```

```sql
-- Manual rebuild
DELETE FROM tweet_search_index WHERE user_id = 1;
INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author, posted_at)
SELECT
    COALESCE(twitter_id, bluesky_uri),
    user_id,
    original_text,
    COALESCE(hashtags, ''),
    COALESCE(twitter_username, ''),
    COALESCE(posted_at, strftime('%s', 'now'))
FROM synced_posts
WHERE user_id = 1 AND user_id IS NOT NULL;
```

#### 6. Encryption/Decryption Errors

**Error:** `cryptography.exceptions.InvalidTag`

**Causes:**
- Wrong encryption key
- Corrupted encrypted data
- Data tampering

**Solutions:**

```bash
# Verify encryption key in .env
echo $ENCRYPTION_KEY

# Check key length (should be 64 hex characters = 32 bytes)
python -c "import os; print(len(os.getenv('ENCRYPTION_KEY')))"

# Regenerate key if lost (WARNING: old credentials unrecoverable)
python -c "import os; print(os.urandom(32).hex())"
```

#### 7. WAL Mode Issues

**Symptoms:**
- Multiple database files (-shm, -wal)
- Performance degradation
- Backup issues

**Solutions:**

```sql
-- Check current mode
PRAGMA journal_mode;

-- Checkpoint WAL
PRAGMA wal_checkpoint(TRUNCATE);

-- Switch to WAL mode
PRAGMA journal_mode=WAL;

-- Disable WAL (not recommended)
PRAGMA journal_mode=DELETE;
```

### Performance Tuning

#### Slow Queries

```sql
-- Enable query profiling
EXPLAIN QUERY PLAN
SELECT * FROM synced_posts WHERE user_id = 1;

-- Check if indexes are used
-- Output should show "SEARCH TABLE ... USING INDEX idx_..."
```

#### Optimize Configuration

```python
conn = sqlite3.connect('chirpsyncer.db')

# Enable WAL mode
conn.execute('PRAGMA journal_mode=WAL')

# Increase cache size (default is 2000 pages, ~2MB)
conn.execute('PRAGMA cache_size=-10000')  # 10MB cache

# Set synchronous mode
conn.execute('PRAGMA synchronous=NORMAL')  # Balance between safety and speed

# Enable memory-mapped I/O
conn.execute('PRAGMA mmap_size=268435456')  # 256MB

# Optimize page size for SSD (must be set before any tables)
conn.execute('PRAGMA page_size=4096')
```

### Diagnostic Queries

```sql
-- Database info
PRAGMA database_list;

-- Table list
SELECT name FROM sqlite_master WHERE type='table';

-- Index list
SELECT name, tbl_name FROM sqlite_master WHERE type='index';

-- Table schema
PRAGMA table_info(synced_posts);

-- Foreign keys
PRAGMA foreign_key_list(user_credentials);

-- Index usage analysis
SELECT * FROM sqlite_stat1;

-- Database integrity
PRAGMA integrity_check;

-- Record counts
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'synced_posts', COUNT(*) FROM synced_posts
UNION ALL
SELECT 'sync_stats', COUNT(*) FROM sync_stats;
```

---

## Related APIs

### Python Modules

| Module | Description | Tables Used |
|--------|-------------|-------------|
| `app/core/db_handler.py` | Core database operations | `synced_posts`, `seen_tweets`, `api_usage`, `sync_stats`, `hourly_stats` |
| `app/auth/user_manager.py` | User management | `users`, `user_sessions` |
| `app/auth/credential_manager.py` | Encrypted credentials | `user_credentials` |
| `app/auth/security_utils.py` | Security & audit | `audit_log` |
| `app/features/analytics_tracker.py` | Analytics tracking | `tweet_metrics`, `analytics_snapshots` |
| `app/features/tweet_scheduler.py` | Tweet scheduling | `scheduled_tweets` |
| `app/features/cleanup_engine.py` | Tweet cleanup | `cleanup_rules`, `cleanup_history` |
| `app/features/search_engine.py` | Full-text search | `tweet_search_index` (FTS5) |
| `app/features/saved_content.py` | Bookmarks & collections | `saved_tweets`, `collections` |
| `app/features/maintenance_tasks.py` | Maintenance jobs | `daily_stats`, `archived_audit_logs` |

### Key Functions

#### Database Operations
- `initialize_db()` - Initialize legacy tables
- `migrate_database()` - Migrate to synced_posts schema
- `add_stats_tables()` - Add statistics tables
- `should_sync_post()` - Check for duplicates
- `save_synced_post()` - Save synced post
- `get_post_by_hash()` - Retrieve by content hash

#### User Management
- `UserManager.create_user()` - Create user account
- `UserManager.authenticate_user()` - Login authentication
- `UserManager.create_session()` - Create session token
- `UserManager.validate_session()` - Validate session

#### Credentials
- `CredentialManager.save_credentials()` - Encrypt and save
- `CredentialManager.get_credentials()` - Decrypt and retrieve
- `CredentialManager.share_credentials()` - Share with other users

#### Analytics
- `AnalyticsTracker.record_metrics()` - Record tweet metrics
- `AnalyticsTracker.get_user_analytics()` - Get aggregated stats
- `AnalyticsTracker.get_top_tweets()` - Get top performing tweets
- `AnalyticsTracker.create_snapshot()` - Create period snapshot

#### Search
- `SearchEngine.init_fts_index()` - Initialize FTS5 index
- `SearchEngine.search()` - Full-text search
- `SearchEngine.search_with_filters()` - Filtered search
- `SearchEngine.rebuild_index()` - Rebuild search index

### Configuration

**Database Path:**
```python
from app.core.db_handler import DB_PATH
# Default: os.path.join(os.getcwd(), "data.db")
# Or: "chirpsyncer.db" in newer modules
```

**Encryption Key:**
```bash
# .env file
ENCRYPTION_KEY=<64-character-hex-string>

# Generate new key
python -c "import os; print(os.urandom(32).hex())"
```

**WAL Mode (Recommended):**
```python
conn = sqlite3.connect('chirpsyncer.db')
conn.execute('PRAGMA journal_mode=WAL')
```

---

## Summary

The ChirpSyncer database is a comprehensive SQLite-based system supporting:

- ✅ **Multi-user architecture** with full user isolation
- ✅ **AES-256-GCM encryption** for sensitive credentials
- ✅ **FTS5 full-text search** with phrase, boolean, and proximity queries
- ✅ **Comprehensive analytics** with time-series metrics
- ✅ **Scheduled content** with queue management
- ✅ **Rule-based cleanup** with dry-run support
- ✅ **Complete audit trail** for security and compliance
- ✅ **Automatic maintenance** with backups and archival
- ✅ **Migration system** for schema upgrades

**Total Tables:** 20+ (including FTS5 virtual table)
**Total Indexes:** 40+
**Total Triggers:** 3 (FTS5 sync)

For questions or issues, refer to:
- GitHub Issues: [ChirpSyncer Repository]
- Documentation: `docs/` directory
- Code: `app/` modules

**Last Updated:** 2026-01-12
