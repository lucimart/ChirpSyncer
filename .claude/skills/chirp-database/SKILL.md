---
name: ChirpSyncer Database
description: Database schema design, migrations, and query optimization
---

# Skill: ChirpSyncer Database Design

Use this skill when designing database schema changes, migrations, or optimizing queries.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Engine | SQLite 3 |
| Search | FTS5 virtual tables |
| Location | `chirpsyncer.db` (DATABASE_PATH) |
| Migrations | Versioned in db_handler.py |

## Key Tables

### Auth & Users
```sql
users (id, username, email, password_hash, created_at, is_active, is_admin)
user_sessions (id, user_id, session_token, created_at, expires_at, ip_address)
user_credentials (id, user_id, platform, credential_type, encrypted_data, encryption_iv, encryption_tag)
user_settings (id, user_id, setting_key, setting_value, updated_at)
audit_log (id, user_id, action, resource_type, resource_id, ip_address, details, correlation_id, created_at)
```

### Sync Data
```sql
synced_posts (id, user_id, twitter_id, bluesky_id, content, synced_at, direction)
sync_stats (id, user_id, date, tweets_synced, posts_synced, errors)
media_synced (id, user_id, post_id, media_type, source_url, target_url)
```

### Features
```sql
tweet_metrics (id, tweet_id, user_id, timestamp, impressions, likes, retweets, engagement_rate)
analytics_snapshots (id, user_id, period, period_start, total_tweets, avg_engagement_rate)
scheduled_tweets (id, user_id, content, scheduled_time, status, posted_at, error)
cleanup_rules (id, user_id, name, enabled, rule_type, rule_config, last_run)
cleanup_history (id, rule_id, executed_at, executed_by, tweets_deleted, dry_run, reason, correlation_id)
saved_tweets (id, user_id, tweet_id, collection_id, notes, saved_at)
collections (id, user_id, name, description, created_at)
```

### Full-Text Search (FTS5)
```sql
CREATE VIRTUAL TABLE tweet_search_index USING fts5(
    tweet_id UNINDEXED,
    user_id UNINDEXED,
    content,
    hashtags,
    author,
    tokenize='porter unicode61'
);
```

## Multi-Tenant Pattern

All user-scoped tables MUST include:
```sql
user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
```

Always create index:
```sql
CREATE INDEX idx_tablename_user_id ON tablename(user_id);
```

## Migration Pattern

```python
# In app/core/db_handler.py
def migrate_database():
    """Run all migrations in order."""
    migrations = [
        ("v1_initial", _migrate_v1),
        ("v2_multi_user", _migrate_v2),
        ("v7_features", _migrate_v7),
        ("v8_nextjs_prep", _migrate_v8),  # Add new migrations
    ]
    for name, func in migrations:
        if not _migration_applied(name):
            func()
            _mark_migration_applied(name)
```

## Schema Design Checklist

- [ ] Include `user_id` for multi-tenant isolation
- [ ] Add `created_at`/`updated_at` timestamps (INTEGER Unix)
- [ ] Use `ON DELETE CASCADE` for foreign keys
- [ ] Create indexes for frequently queried columns
- [ ] Use `TEXT` for JSON (SQLite limitation)
- [ ] Use `BLOB` for encrypted data
- [ ] Add `correlation_id` for audit-related tables

## Index Strategy

```sql
-- Always index foreign keys
CREATE INDEX idx_tablename_user_id ON tablename(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_metrics_user_time ON tweet_metrics(user_id, timestamp);

-- Covering indexes for read-heavy queries
CREATE INDEX idx_cleanup_history_lookup
    ON cleanup_history(rule_id, executed_at DESC);
```

## FTS5 Queries

```sql
-- Basic search
SELECT * FROM tweet_search_index
WHERE tweet_search_index MATCH 'query';

-- Highlighted results
SELECT highlight(tweet_search_index, 2, '<mark>', '</mark>') as content
FROM tweet_search_index
WHERE tweet_search_index MATCH 'query';

-- With ranking
SELECT *, rank FROM tweet_search_index
WHERE tweet_search_index MATCH 'query'
ORDER BY rank;
```

## Output Format

```markdown
## Table: [name]

### Purpose
[What this table stores]

### Schema
```sql
CREATE TABLE name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ...
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

### Indexes
```sql
CREATE INDEX idx_name_user_id ON name(user_id);
```

### Migration
```python
def _migrate_vX_add_name():
    conn.execute('''CREATE TABLE IF NOT EXISTS...''')
```

### Common Queries
```sql
-- Get by user
SELECT * FROM name WHERE user_id = ?;
```
```

## Related Skills

- `chirp-architecture.md` - System design
- `chirp-api-design.md` - API layer
