# Sprint 7: Architecture Decision Records (ADR)

## Context
Sprint 7 implements advanced Twitter analytics, tweet scheduling, automated cleanup, search capabilities, and saved content management. This document records key architectural decisions and their rationale.

---

## ADR-001: Analytics Data Storage Strategy

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Need to store and query tweet analytics data (impressions, likes, retweets, replies) efficiently for:
- Historical trend analysis
- Performance dashboards
- User engagement metrics
- Reporting

### Decision
Use **time-series optimized schema** with separate tables for metrics snapshots and aggregated summaries.

```sql
-- Real-time metrics (high write frequency)
CREATE TABLE tweet_metrics (
    id INTEGER PRIMARY KEY,
    tweet_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    impressions INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    retweets INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    engagement_rate REAL DEFAULT 0.0
);

-- Aggregated snapshots (lower write frequency, faster reads)
CREATE TABLE analytics_snapshots (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    period TEXT NOT NULL,  -- 'hourly', 'daily', 'weekly', 'monthly'
    period_start INTEGER NOT NULL,
    total_tweets INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    avg_engagement_rate REAL DEFAULT 0.0,
    top_tweet_id TEXT,
    UNIQUE(user_id, period, period_start)
);
```

### Rationale
- **Separate concerns:** Raw metrics vs aggregated data
- **Query performance:** Pre-computed aggregations for dashboards
- **Storage efficiency:** Snapshots reduce query complexity
- **Scalability:** Can archive old raw metrics, keep aggregations

### Consequences
- **Positive:** Fast dashboard loads, efficient queries
- **Negative:** Need scheduled task to create snapshots
- **Mitigation:** Use existing cron system from Sprint 6

---

## ADR-002: Tweet Scheduling Queue Architecture

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Users need to schedule tweets for future publication with:
- Specific publish times
- Draft management
- Edit before publish
- Automatic posting via queue

### Decision
Use **database-backed queue** with APScheduler integration.

```python
# Queue table
CREATE TABLE scheduled_tweets (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_paths TEXT,  -- JSON array
    scheduled_time INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'posted', 'failed', 'cancelled'
    posted_at INTEGER,
    tweet_id TEXT,
    error TEXT
);

# Scheduler integration
def check_queue_and_post():
    """Runs every minute via APScheduler"""
    # Get tweets scheduled for now or past
    # Post to Twitter
    # Update status
```

### Rationale
- **Reliability:** Database persistence survives restarts
- **Existing infra:** Leverages Sprint 6 APScheduler
- **Atomic operations:** SQLite transactions ensure consistency
- **Audit trail:** Full history of scheduled posts

### Alternatives Considered
1. **In-memory queue:** Rejected - data loss on restart
2. **Redis queue:** Rejected - adds dependency
3. **Celery:** Rejected - over-engineered for our scale

### Consequences
- **Positive:** Simple, reliable, integrated with existing system
- **Negative:** Not suitable for massive scale (1M+ scheduled tweets)
- **Acceptable trade-off:** Current user scale (100s of users)

---

## ADR-003: Full-Text Search Implementation

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Users need to search tweets by:
- Content (full-text)
- Author
- Date range
- Hashtags
- Engagement metrics

### Decision
Use **SQLite FTS5 (Full-Text Search)** with custom tokenizer.

```sql
-- FTS5 virtual table
CREATE VIRTUAL TABLE tweet_search_index USING fts5(
    tweet_id UNINDEXED,
    user_id UNINDEXED,
    content,
    hashtags,
    author,
    tokenize='porter unicode61'
);

-- Trigger to keep in sync
CREATE TRIGGER sync_search_index AFTER INSERT ON synced_posts
BEGIN
    INSERT INTO tweet_search_index (tweet_id, user_id, content, hashtags, author)
    VALUES (NEW.twitter_id, NEW.user_id, NEW.content, NEW.hashtags, NEW.twitter_username);
END;
```

### Rationale
- **Built-in:** No external dependencies
- **Performance:** FTS5 is fast for our data size
- **Features:** Supports phrase queries, NEAR, ranking
- **Integration:** Seamless with existing SQLite schema

### Alternatives Considered
1. **Elasticsearch:** Rejected - overkill, complex deployment
2. **Meilisearch:** Rejected - extra service to manage
3. **LIKE queries:** Rejected - too slow, no ranking

### Query Examples
```sql
-- Search content
SELECT * FROM tweet_search_index WHERE content MATCH 'python programming';

-- Search with ranking
SELECT tweet_id, rank FROM tweet_search_index 
WHERE content MATCH 'AI OR machine learning' 
ORDER BY rank;

-- Phrase search
SELECT * FROM tweet_search_index WHERE content MATCH '"climate change"';
```

### Consequences
- **Positive:** Fast, zero dependencies, good-enough ranking
- **Negative:** Limited to SQLite scalability (~1M tweets fine)
- **Mitigation:** Can migrate to dedicated search engine if needed

---

## ADR-004: Auto-Cleanup Rules Engine

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Users want to automatically delete old tweets based on:
- Age (delete tweets older than X days)
- Engagement (keep high-performing tweets)
- Content patterns (delete tweets matching regex)
- Scheduled cleanup runs

### Decision
Use **rule-based engine** with configurable rules stored in database.

```sql
CREATE TABLE cleanup_rules (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    rule_type TEXT NOT NULL,  -- 'age', 'engagement', 'pattern'
    rule_config TEXT NOT NULL,  -- JSON with rule parameters
    last_run INTEGER,
    deleted_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

# Example rules:
{
    "type": "age",
    "max_age_days": 30,
    "exclude_with_replies": true
}

{
    "type": "engagement",
    "min_likes": 10,
    "delete_if_below": true
}

{
    "type": "pattern",
    "regex": "^RT @",
    "action": "delete"
}
```

### Rationale
- **Flexibility:** Users define their own rules
- **Safety:** Preview mode before actual deletion
- **Audit:** Track what was deleted and when
- **Reversibility:** Soft delete with archive option

### Implementation Strategy
```python
class CleanupEngine:
    def evaluate_rule(self, rule: Rule, tweets: List[Tweet]) -> List[Tweet]:
        """Return tweets matching rule for deletion"""
    
    def preview_cleanup(self, user_id: int) -> Dict:
        """Show what would be deleted"""
    
    def execute_cleanup(self, user_id: int, dry_run: bool = True):
        """Actually delete (or archive) tweets"""
```

### Consequences
- **Positive:** Powerful, user-controlled, safe
- **Negative:** Complex rule evaluation logic
- **Mitigation:** Start with simple rules, add complexity gradually

---

## ADR-005: Saved Content Architecture

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Users want to:
- Bookmark tweets for later
- Organize saved tweets into collections
- Search saved content
- Export saved tweets

### Decision
Use **simple bookmarks table** with collections support.

```sql
CREATE TABLE saved_tweets (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tweet_id TEXT NOT NULL,
    collection_id INTEGER,  -- NULL = "uncategorized"
    notes TEXT,
    saved_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id),
    UNIQUE(user_id, tweet_id)
);

CREATE TABLE collections (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, name)
);
```

### Rationale
- **Simplicity:** Straightforward schema
- **Flexibility:** Collections are optional
- **Performance:** Indexed lookups
- **Integration:** Works with existing tweet data

### Features
- **Add to collection:** Organize bookmarks
- **Search:** Full-text search within saved tweets
- **Export:** JSON/CSV export of saved content
- **Sync:** Can sync saved tweets to both platforms

### Consequences
- **Positive:** Easy to implement, intuitive UX
- **Negative:** Not as feature-rich as dedicated read-later app
- **Acceptable:** Good starting point, can enhance later

---

## ADR-006: Report Generation Strategy

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Users need analytics reports:
- Weekly/monthly engagement summaries
- PDF export
- CSV export for Excel
- Automated email delivery

### Decision
Use **template-based report generation** with multiple output formats.

```python
class ReportGenerator:
    def generate_engagement_report(
        self, 
        user_id: int, 
        period: str,  # 'week', 'month'
        format: str   # 'pdf', 'csv', 'json'
    ) -> bytes:
        """Generate report in specified format"""
        
    # Templates
    templates = {
        'engagement_summary': 'reports/engagement.html',
        'growth_analysis': 'reports/growth.html',
        'top_tweets': 'reports/top_tweets.html'
    }
```

### Output Formats
1. **PDF:** Using ReportLab or WeasyPrint
2. **CSV:** For spreadsheet analysis
3. **JSON:** For API consumers
4. **HTML:** For email/web viewing

### Rationale
- **Flexibility:** Multiple formats for different use cases
- **Automation:** Can schedule via cron
- **Professional:** PDF reports look polished
- **Data export:** CSV for advanced analysis

### Consequences
- **Positive:** Professional deliverable, multiple formats
- **Negative:** PDF generation adds dependencies
- **Mitigation:** Make PDF optional, start with CSV/JSON

---

## ADR-007: Context Persistence System

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Need to maintain persistent state across:
- Agent conversations
- Long-running tasks
- Multi-step workflows
- Session recovery

### Decision
Implement **JSON-based context store** with file and database backends.

```python
class PersistentContext:
    def __init__(self, context_id: str, backend: str = 'file'):
        self.context_id = context_id
        self.backend = backend
    
    def save_state(self, key: str, value: Any):
        """Save state with key"""
    
    def load_state(self, key: str) -> Any:
        """Load state by key"""
    
    def checkpoint(self, label: str):
        """Create named checkpoint"""
    
    def restore_checkpoint(self, label: str):
        """Restore from checkpoint"""
```

### Storage Backends
1. **File:** `~/.chirpsyncer/context/{context_id}.json`
2. **Database:** `context_store` table in SQLite
3. **Hybrid:** Recent in memory, persist to disk/DB

### Use Cases
- **Agent workflows:** Save progress between steps
- **Long operations:** Recover from crashes
- **Multi-session:** Resume where left off
- **Debugging:** Replay exact state

### Consequences
- **Positive:** Robust, recoverable, debuggable
- **Negative:** Extra I/O overhead
- **Mitigation:** Async writes, batch updates

---

## ADR-008: Parallel Agent Coordination

**Status:** Accepted  
**Date:** 2026-01-11

### Context
Sprint 7 has 6 major components that can be developed in parallel:
1. Analytics dashboard
2. Tweet scheduler
3. Cleanup engine
4. Search system
5. Saved content
6. Report generator

### Decision
Use **task-based parallelization** with independent agents per component.

### Coordination Strategy
```python
# Master agent coordinates sub-agents
agents = [
    Task(name="ANALYTICS", component="Analytics Dashboard"),
    Task(name="SCHEDULER", component="Tweet Scheduler"),
    Task(name="CLEANUP", component="Cleanup Engine"),
    Task(name="SEARCH", component="Search System"),
    Task(name="SAVED", component="Saved Content"),
    Task(name="REPORTS", component="Report Generator")
]

# Launch in parallel (single message, multiple Task calls)
for agent in agents:
    Task(description=agent.name, prompt=agent.component, subagent_type="general-purpose")

# Integration after all complete
integrate_components(agents)
```

### Integration Points
- **Shared database:** All use same SQLite DB
- **Common APIs:** Consistent interface patterns
- **Dashboard:** Single UI integrates all features
- **Testing:** Integration tests after unit tests

### Consequences
- **Positive:** Fast development, clear ownership
- **Negative:** Need careful integration, potential conflicts
- **Mitigation:** Clear API contracts, integration tests

---

## Summary

### Key Decisions
1. ✅ Time-series analytics storage
2. ✅ Database-backed tweet queue
3. ✅ SQLite FTS5 for search
4. ✅ Rule-based cleanup engine
5. ✅ Simple bookmarks + collections
6. ✅ Multi-format report generation
7. ✅ JSON context persistence
8. ✅ Parallel agent development

### Technology Stack
- **Database:** SQLite with FTS5
- **Scheduling:** APScheduler (existing)
- **Search:** FTS5 built-in
- **Reports:** ReportLab/WeasyPrint (PDF), CSV
- **Context:** JSON file + DB storage
- **Testing:** Pytest with TDD

### Risk Mitigation
- **Scalability:** Designed for 100s of users, can migrate if needed
- **Complexity:** Start simple, add features incrementally  
- **Integration:** Clear APIs, comprehensive tests
- **Recovery:** Persistent context, checkpoints

---

**Next:** Implement Sprint 7 components in parallel with TDD
