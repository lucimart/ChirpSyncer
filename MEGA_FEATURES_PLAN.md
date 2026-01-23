# ChirpSyncer Mega Features Plan

## Vision
Transform ChirpSyncer from a "sync tool" into an **Intelligent Social Media Command Center**.

---

## Feature 1: Unified Inbox

### Concept
Single inbox for ALL mentions, replies, DMs, comments across every connected platform.

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     UNIFIED INBOX                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Twitter │  │ Bluesky │  │ Discord │  │ YouTube │  ...   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴─────┬──────┴────────────┘              │
│                          ▼                                  │
│              ┌───────────────────┐                          │
│              │  Message Ingester │                          │
│              │  (Celery Worker)  │                          │
│              └─────────┬─────────┘                          │
│                        ▼                                    │
│              ┌───────────────────┐                          │
│              │  unified_messages │                          │
│              │     (SQLite)      │                          │
│              └─────────┬─────────┘                          │
│                        ▼                                    │
│              ┌───────────────────┐                          │
│              │   Priority AI     │                          │
│              │   (sentiment +    │                          │
│              │    importance)    │                          │
│              └───────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema
```sql
CREATE TABLE unified_messages (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    message_type TEXT NOT NULL,  -- 'mention', 'reply', 'dm', 'comment'
    author_handle TEXT,
    author_name TEXT,
    author_avatar TEXT,
    content TEXT,
    original_url TEXT,
    parent_post_id TEXT,
    sentiment_score REAL,        -- -1 to 1
    priority_score INTEGER,      -- 1-5
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    created_at INTEGER,
    fetched_at INTEGER
);

CREATE INDEX idx_messages_platform ON unified_messages(platform);
CREATE INDEX idx_messages_unread ON unified_messages(is_read, created_at);
CREATE INDEX idx_messages_priority ON unified_messages(priority_score DESC);
```

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inbox` | GET | List messages (filters: platform, type, unread, starred) |
| `/api/v1/inbox/:id/read` | POST | Mark as read |
| `/api/v1/inbox/:id/star` | POST | Toggle star |
| `/api/v1/inbox/:id/archive` | POST | Archive message |
| `/api/v1/inbox/:id/reply` | POST | Reply to message (routes to correct platform) |
| `/api/v1/inbox/stats` | GET | Unread counts per platform |

### Frontend Components
- `UnifiedInbox` - Main inbox page
- `MessageCard` - Individual message display
- `MessageFilters` - Platform/type/status filters
- `QuickReply` - Inline reply composer
- `InboxStats` - Unread badges per platform

---

## Feature 2: Content Atomization Pipeline

### Concept
Take one piece of content → transform into multiple formats for different platforms.

### Pipelines
```
VIDEO PIPELINE:
YouTube Video → Transcript → Blog Post → Twitter Thread → LinkedIn Post → Instagram Carousel

BLOG PIPELINE:
Blog Post → Key Points → Twitter Thread → LinkedIn Summary → Newsletter Teaser

THREAD PIPELINE:
Twitter Thread → Blog Post → LinkedIn Article → Substack Post

PODCAST PIPELINE:
Audio → Transcript → Show Notes → Audiogram Clips → Quote Cards
```

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                  ATOMIZATION ENGINE                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                           │
│  │ Source Input │  (URL, file, or pasted content)          │
│  └──────┬───────┘                                           │
│         ▼                                                   │
│  ┌──────────────┐                                           │
│  │   Analyzer   │  Detect content type, extract metadata    │
│  └──────┬───────┘                                           │
│         ▼                                                   │
│  ┌──────────────┐                                           │
│  │  Transformer │  AI-powered content adaptation            │
│  │   Pipeline   │                                           │
│  └──────┬───────┘                                           │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Output Formats                       │       │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │       │
│  │  │Twitter │ │LinkedIn│ │ Medium │ │  Insta │    │       │
│  │  │ Thread │ │  Post  │ │  Blog  │ │Carousel│    │       │
│  │  └────────┘ └────────┘ └────────┘ └────────┘    │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema
```sql
CREATE TABLE atomization_jobs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,      -- 'youtube', 'blog', 'thread', 'text'
    source_url TEXT,
    source_content TEXT,
    status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    created_at INTEGER,
    completed_at INTEGER
);

CREATE TABLE atomized_content (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES atomization_jobs(id),
    platform TEXT NOT NULL,
    format TEXT NOT NULL,           -- 'thread', 'post', 'article', 'carousel'
    content TEXT NOT NULL,
    media_urls TEXT,                -- JSON array
    is_published BOOLEAN DEFAULT FALSE,
    scheduled_for INTEGER,
    published_at INTEGER
);
```

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/atomize` | POST | Start atomization job |
| `/api/v1/atomize/:id` | GET | Get job status and outputs |
| `/api/v1/atomize/:id/outputs` | GET | Get all generated content |
| `/api/v1/atomize/:id/publish` | POST | Publish selected outputs |
| `/api/v1/atomize/:id/schedule` | POST | Schedule outputs |

### Frontend Components
- `AtomizationWizard` - Step-by-step content input
- `SourceAnalyzer` - Show detected content type
- `OutputPreview` - Preview each platform format
- `AtomizationQueue` - Jobs in progress
- `ContentCalendar` - Schedule atomized content

---

## Feature 3: Workflow Automations

### Concept
Visual automation builder like Zapier/n8n but specifically for social media.

### Trigger Types
```yaml
triggers:
  - new_post: "When I post on {platform}"
  - new_mention: "When someone mentions me on {platform}"
  - new_follower: "When I get a new follower on {platform}"
  - viral_post: "When a post exceeds {threshold} engagement"
  - scheduled_time: "At {time} every {frequency}"
  - webhook: "When webhook receives data"
  - rss_new_item: "When RSS feed has new item"
  - github_release: "When new GitHub release"
```

### Action Types
```yaml
actions:
  - cross_post: "Post to {platforms}"
  - send_notification: "Send to {telegram/discord/email}"
  - create_thread: "Create thread from {content}"
  - add_to_queue: "Add to posting queue"
  - transform_content: "Adapt content for {platform}"
  - send_dm: "Send DM to {user}"
  - add_tag: "Tag content with {tag}"
```

### Example Workflows
```yaml
# Workflow 1: Viral Amplification
name: "Amplify Viral Posts"
trigger:
  type: viral_post
  platform: twitter
  threshold:
    likes: 1000
    retweets: 100
actions:
  - cross_post:
      platforms: [bluesky, threads, mastodon]
      delay: 30m
  - send_notification:
      to: telegram
      message: "🚀 Your tweet is going viral! {post_url}"

# Workflow 2: Blog to Social
name: "Blog Distribution"
trigger:
  type: rss_new_item
  feed_url: "https://myblog.com/feed.xml"
actions:
  - transform_content:
      to: twitter_thread
  - cross_post:
      platforms: [twitter, linkedin]
  - send_notification:
      to: discord
      channel: announcements
```

### Database Schema
```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_config TEXT NOT NULL,   -- JSON
    actions_config TEXT NOT NULL,   -- JSON array
    run_count INTEGER DEFAULT 0,
    last_run_at INTEGER,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    trigger_data TEXT,              -- JSON
    status TEXT DEFAULT 'running',  -- 'running', 'completed', 'failed'
    actions_completed TEXT,         -- JSON array of completed action IDs
    error_message TEXT,
    started_at INTEGER,
    completed_at INTEGER
);
```

### Frontend Components
- `WorkflowBuilder` - Visual drag-and-drop builder
- `TriggerSelector` - Choose trigger type
- `ActionChain` - Chain of actions
- `WorkflowList` - All workflows
- `WorkflowHistory` - Run history

---

## Feature 4: Audience Intelligence

### Concept
Cross-platform audience analysis and insights.

### Metrics
```yaml
audience_metrics:
  demographics:
    - follower_count_per_platform
    - growth_rate_per_platform
    - geographic_distribution
    - language_distribution

  engagement:
    - avg_engagement_rate
    - best_posting_times
    - top_performing_content_types
    - audience_overlap_between_platforms

  content_analysis:
    - topics_that_resonate
    - optimal_post_length
    - hashtag_performance
    - media_type_performance
```

### Database Schema
```sql
CREATE TABLE audience_snapshots (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    follower_count INTEGER,
    following_count INTEGER,
    engagement_rate REAL,
    top_posts TEXT,                 -- JSON array of post IDs
    metrics TEXT,                   -- JSON blob
    UNIQUE(user_id, platform, snapshot_date)
);

CREATE TABLE content_performance (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    post_id TEXT NOT NULL,
    content_type TEXT,              -- 'text', 'image', 'video', 'thread'
    posted_at INTEGER,
    likes INTEGER,
    reposts INTEGER,
    replies INTEGER,
    impressions INTEGER,
    engagement_rate REAL,
    topics TEXT                     -- JSON array
);
```

### Frontend Components
- `AudienceDashboard` - Main analytics page
- `PlatformComparison` - Side-by-side metrics
- `GrowthChart` - Follower growth over time
- `EngagementHeatmap` - Best times to post
- `ContentInsights` - What performs best

---

## Feature 5: Content Recycling Engine

### Concept
Identify evergreen content and suggest reposting.

### Algorithm
```python
def calculate_recycle_score(post):
    age_factor = 1 - (days_since_post / 365)  # Older = lower
    engagement_factor = normalize(engagement_rate)  # Higher = better
    evergreen_factor = is_evergreen(post.content)   # Timeless content
    recency_penalty = was_recently_shared(post)     # Don't spam

    return (
        engagement_factor * 0.4 +
        evergreen_factor * 0.3 +
        age_factor * 0.2 -
        recency_penalty * 0.3
    )
```

### Database Schema
```sql
CREATE TABLE content_library (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    original_post_id TEXT NOT NULL,
    content TEXT,
    media_urls TEXT,
    engagement_score REAL,
    evergreen_score REAL,
    recycle_score REAL,
    tags TEXT,                      -- JSON array
    last_recycled_at INTEGER,
    recycle_count INTEGER DEFAULT 0,
    created_at INTEGER
);

CREATE TABLE recycle_suggestions (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL REFERENCES content_library(id),
    suggested_platforms TEXT,       -- JSON array
    suggested_at INTEGER,
    status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'dismissed'
    scheduled_for INTEGER
);
```

### Frontend Components
- `ContentLibrary` - Browse all content
- `RecycleSuggestions` - AI suggestions
- `EvergreenTagger` - Tag content as evergreen
- `RecycleScheduler` - Schedule recycled posts

---

## Feature 6: Smart Notifications Hub

### Concept
Centralized notification center with smart filtering and delivery.

### Notification Types
```yaml
notification_types:
  engagement:
    - new_like
    - new_repost
    - new_reply
    - new_mention
    - new_follower

  system:
    - sync_completed
    - sync_failed
    - workflow_triggered
    - content_published

  insights:
    - viral_alert
    - engagement_spike
    - best_time_reminder
    - recycle_suggestion
```

### Delivery Channels
- In-app notifications
- Browser push notifications
- Telegram bot
- Discord webhook
- Email digest

### Database Schema
```sql
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data TEXT,                      -- JSON
    priority INTEGER DEFAULT 3,     -- 1=low, 5=urgent
    is_read BOOLEAN DEFAULT FALSE,
    created_at INTEGER
);

CREATE TABLE notification_preferences (
    user_id INTEGER PRIMARY KEY,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    telegram_enabled BOOLEAN DEFAULT FALSE,
    telegram_chat_id TEXT,
    discord_enabled BOOLEAN DEFAULT FALSE,
    discord_webhook_url TEXT,
    email_digest_enabled BOOLEAN DEFAULT FALSE,
    email_digest_frequency TEXT DEFAULT 'daily',
    quiet_hours_start INTEGER,      -- Hour 0-23
    quiet_hours_end INTEGER
);
```

---

## Implementation Order

### Phase 1: Foundation (Agents 1-2)
1. **Unified Inbox** - Core feature, high value
2. **Notifications Hub** - Supports inbox

### Phase 2: Content (Agents 3-4)
3. **Content Recycling** - Quick win, uses existing data
4. **Content Atomization** - High value, complex

### Phase 3: Intelligence (Agents 5-6)
5. **Audience Intelligence** - Analytics
6. **Workflow Automations** - Most complex

---

## File Structure

```
app/
├── features/
│   ├── inbox/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── service.py
│   │   ├── ingester.py
│   │   └── priority.py
│   ├── atomization/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── service.py
│   │   ├── pipelines/
│   │   │   ├── video.py
│   │   │   ├── blog.py
│   │   │   └── thread.py
│   │   └── transformers/
│   │       ├── twitter.py
│   │       ├── linkedin.py
│   │       └── medium.py
│   ├── workflows/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── engine.py
│   │   ├── triggers/
│   │   └── actions/
│   ├── audience/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── analytics.py
│   │   └── insights.py
│   ├── recycling/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── scorer.py
│   │   └── suggester.py
│   └── notifications/
│       ├── __init__.py
│       ├── models.py
│       ├── dispatcher.py
│       └── channels/
│           ├── telegram.py
│           ├── discord.py
│           └── email.py
└── web/api/v1/
    ├── inbox.py
    ├── atomization.py
    ├── workflows.py
    ├── audience.py
    ├── recycling.py
    └── notifications.py

frontend/src/
├── app/dashboard/
│   ├── inbox/
│   ├── atomize/
│   ├── workflows/
│   ├── audience/
│   ├── library/
│   └── notifications/
├── components/
│   ├── inbox/
│   ├── atomization/
│   ├── workflows/
│   ├── audience/
│   └── notifications/
└── lib/
    ├── inbox.ts
    ├── atomization.ts
    ├── workflows.ts
    ├── audience.ts
    └── notifications.ts
```
