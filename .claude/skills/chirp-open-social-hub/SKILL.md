---
name: chirp-open-social-hub
description: Evolution from ChirpSyncer to multi-platform social hub with user-owned algorithms
---

# Skill: Open Social Hub Vision

Use this skill when planning future features, understanding the product vision, or implementing Feed Lab functionality.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Vision | User-owned, multi-platform social hub |
| Core Principle | Algorithm transparency |
| Target Platforms | Twitter, Bluesky, Mastodon, Instagram |
| Key Feature | Feed Lab (customizable algorithm) |

## Guiding Principles

### 1. User-Owned Algorithm
- Users control what they see
- No hidden manipulation
- Transparent ranking rules
- "Why am I seeing this?" explainability

### 2. Capabilities-First
- Each platform declares what it can do
- Graceful degradation when features unavailable
- No fake functionality

### 3. Privacy-First
- Local-first data storage
- User controls all exports
- No data sold to third parties
- Audit log for all actions

### 4. Interoperable
- CanonicalPost format across platforms
- Easy platform switching
- Open data formats
- No lock-in

### 5. Auditable
- Every action logged
- Correlation IDs for tracing
- Compliance-ready audit trail

## Architecture Evolution

```
ChirpSyncer (Now)          →    Open Social Hub (Future)
────────────────────────────────────────────────────────
Twitter only               →    4+ platforms
Flask dashboard            →    Next.js dashboard
Basic sync                 →    Intelligent sync
Manual cleanup             →    ML-assisted cleanup
Single user                →    Team workspaces
No feed control            →    Feed Lab
```

## CanonicalPost Model

The unified post format that bridges all platforms:

```python
@dataclass
class CanonicalPost:
    """Universal post format for cross-platform operations."""
    id: str                              # Internal UUID
    content: str                         # Text content
    media: List[MediaAttachment]         # Images, videos, links
    created_at: datetime
    updated_at: Optional[datetime]
    author: Author
    metrics: PostMetrics
    platform_mappings: List[NetworkPostMapping]
    tags: List[str]                      # Internal categorization
    is_deleted: bool
    deletion_reason: Optional[str]

@dataclass
class NetworkPostMapping:
    """Maps canonical post to platform-specific post."""
    platform: str                        # 'twitter', 'bluesky', etc.
    native_id: str                       # Platform's post ID
    url: str                             # Direct link
    synced_at: datetime
    sync_status: str                     # 'synced', 'pending', 'failed'
    platform_metadata: Dict[str, Any]    # Platform-specific data

@dataclass
class PostMetrics:
    """Unified metrics across platforms."""
    likes: int
    reposts: int                         # retweets, boosts, etc.
    replies: int
    views: Optional[int]
    engagement_rate: float
    last_updated: datetime
```

## Feed Lab Specification

### Feed Rules

```typescript
interface FeedRule {
  id: string;
  name: string;
  description: string;
  type: 'boost' | 'demote' | 'filter' | 'highlight';
  conditions: FeedCondition[];
  weight: number;           // -100 (hide) to +100 (prioritize)
  enabled: boolean;
  created_at: string;
}

interface FeedCondition {
  field: FeedField;
  operator: ConditionOperator;
  value: string | number | string[];
}

type FeedField =
  | 'author.username'
  | 'author.is_following'
  | 'content.text'
  | 'content.has_media'
  | 'content.language'
  | 'metrics.likes'
  | 'metrics.engagement_rate'
  | 'post.age_hours'
  | 'post.platform';

type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in_list'
  | 'regex';
```

### Example Rules

```json
{
  "name": "Boost close friends",
  "type": "boost",
  "weight": 50,
  "conditions": [
    {"field": "author.username", "operator": "in_list", "value": ["friend1", "friend2"]}
  ]
}

{
  "name": "Demote low engagement",
  "type": "demote",
  "weight": -30,
  "conditions": [
    {"field": "metrics.engagement_rate", "operator": "less_than", "value": 0.01}
  ]
}

{
  "name": "Filter out politics",
  "type": "filter",
  "weight": -100,
  "conditions": [
    {"field": "content.text", "operator": "regex", "value": "\\b(politics|election|vote)\\b"}
  ]
}
```

### Explainability

```typescript
interface PostExplanation {
  post_id: string;
  final_score: number;
  rules_applied: RuleApplication[];
  base_score: number;
}

interface RuleApplication {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  weight_applied: number;
  conditions_matched: string[];
}

// API Response
GET /api/v1/feed/:postId/explain
{
  "data": {
    "post_id": "123",
    "final_score": 75,
    "base_score": 50,
    "rules_applied": [
      {
        "rule_name": "Boost close friends",
        "matched": true,
        "weight_applied": 50,
        "conditions_matched": ["author.username in ['friend1']"]
      },
      {
        "rule_name": "Demote old posts",
        "matched": true,
        "weight_applied": -25,
        "conditions_matched": ["post.age_hours > 48"]
      }
    ]
  }
}
```

## Team Collaboration Model

### Workspace Hierarchy

```
Organization (future)
└── Workspace
    ├── Members (users with roles)
    ├── Credentials (shared)
    ├── Rules (cleanup, feed)
    └── Activity (audit log)
```

### Roles

```typescript
type WorkspaceRole = 'admin' | 'editor' | 'viewer';

interface WorkspaceMember {
  user_id: number;
  workspace_id: number;
  role: WorkspaceRole;
  invited_by: number;
  joined_at: string;
}

// Permissions by role
const rolePermissions = {
  admin: ['*'],  // Everything
  editor: [
    'credentials.read', 'credentials.write',
    'rules.read', 'rules.write',
    'sync.trigger',
    'analytics.read'
  ],
  viewer: [
    'credentials.read',
    'rules.read',
    'analytics.read'
  ]
};
```

## Export Format Specification

User data is fully exportable in open formats:

```typescript
interface ExportRequest {
  format: 'json' | 'csv' | 'zip';
  include: ExportInclude[];
  dateRange?: { from: string; to: string };
}

type ExportInclude =
  | 'posts'           // All synced posts
  | 'metrics'         // Engagement data
  | 'cleanup_history' // Deletion log
  | 'feed_rules'      // Feed Lab configuration
  | 'credentials'     // Platform connections (no secrets)
  | 'audit_log';      // Full activity history

interface ExportedPost {
  id: string;
  content: string;
  created_at: string;
  platforms: {
    [platform: string]: {
      native_id: string;
      url: string;
      synced_at: string;
    };
  };
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
  };
  media: string[];    // URLs or base64 if include_media=true
  is_deleted: boolean;
  deleted_at?: string;
  deletion_reason?: string;
}

// ZIP export structure
export.zip
├── posts.json
├── metrics.json
├── cleanup_history.json
├── feed_rules.json
├── audit_log.json
└── media/
    ├── {post_id}_1.jpg
    └── {post_id}_2.png
```

## Roadmap Phases

| Phase | Sprints | Focus |
|-------|---------|-------|
| A: Productize | 8-9 | Cleanup + Search completion |
| B: Frontend | 10-13 | Next.js migration |
| C: Intelligence | 14-15 | WebSocket + ML scheduling |
| D: Multi-platform | 16-18 | Connector framework |
| E: Feed Lab | 19-21 | User-owned algorithm |
| F: Protocols | 22-26 | Decentralized federation |

> See `docs/PROTOCOL_ROADMAP.md` for detailed protocol specifications.

## Implementation Priority

1. **Now (Sprint 8-9)**: Fix core, ship cleanup
2. **Next (Sprint 10-13)**: Modern UI with Next.js
3. **Then (Sprint 14-15)**: Real-time + intelligence
4. **Future (Sprint 16+)**: Multi-platform + Feed Lab

## Related Skills

- `chirp-connector-framework.md` - Platform integrations
- `chirp-architecture.md` - Current system design
- `chirp-nextjs-migration.md` - Frontend evolution
