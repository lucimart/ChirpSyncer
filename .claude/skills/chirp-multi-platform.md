---
name: ChirpSyncer Multi-Platform
description: Capabilities-first platform abstraction for Twitter, Bluesky, and future platforms
category: integration
triggers:
  - new platform integration
  - platform capabilities
  - multi-platform support
  - Instagram
  - LinkedIn
  - Mastodon
  - add platform
  - platform handler
  - capabilities
auto_trigger: false
dependencies:
  - app/integrations/
  - docs/architecture/
  - chirp-connector-framework.md
version: "1.1"
sprint_relevant: 16-18
---

# Skill: ChirpSyncer Multi-Platform Support

Use this skill when designing or implementing support for additional platforms (Instagram, LinkedIn, etc.)

## Design Principle: Capabilities-First

**NEVER assume what a platform can do.** Every feature must be explicitly defined in the platform's capability manifest.

## Platform Capability Interface

```python
@dataclass
class PlatformCapabilities:
    """What a platform can and cannot do."""
    # Basic operations
    can_post: bool = False
    can_read_timeline: bool = False
    can_delete_own_posts: bool = False
    can_edit_posts: bool = False

    # Content types
    supports_text: bool = True
    supports_images: bool = False
    supports_videos: bool = False
    supports_links: bool = False
    supports_hashtags: bool = False
    supports_mentions: bool = False

    # Threads/conversations
    supports_threads: bool = False
    supports_replies: bool = False
    supports_quotes: bool = False
    supports_reposts: bool = False

    # Limits
    max_text_length: int = 0
    max_images_per_post: int = 0
    max_video_duration_seconds: int = 0

    # Scheduling
    supports_native_scheduling: bool = False

    # Analytics
    provides_impressions: bool = False
    provides_engagement_metrics: bool = False

    # Auth
    auth_method: str = "oauth2"  # oauth1, oauth2, api_key, credentials

    # Rate limits
    rate_limit_posts_per_hour: int = 0
    rate_limit_reads_per_hour: int = 0
```

## Current Platform Capabilities

### Twitter (via twscrape)

```python
TWITTER_CAPABILITIES = PlatformCapabilities(
    can_post=False,  # twscrape is read-only
    can_read_timeline=True,
    can_delete_own_posts=False,
    supports_text=True,
    supports_images=True,
    supports_videos=True,
    supports_threads=True,
    supports_replies=True,
    supports_quotes=True,
    supports_reposts=True,
    max_text_length=280,
    max_images_per_post=4,
    provides_impressions=False,  # Requires API
    provides_engagement_metrics=True,
    auth_method="credentials",
)
```

### Bluesky (via atproto)

```python
BLUESKY_CAPABILITIES = PlatformCapabilities(
    can_post=True,
    can_read_timeline=True,
    can_delete_own_posts=True,
    supports_text=True,
    supports_images=True,
    supports_videos=False,  # Not yet supported
    supports_threads=True,
    supports_replies=True,
    supports_quotes=True,
    supports_reposts=True,
    max_text_length=300,
    max_images_per_post=4,
    provides_impressions=False,
    provides_engagement_metrics=True,
    auth_method="credentials",
)
```

### Instagram (RESEARCH-GATED)

```python
# NOTE: Instagram capabilities require research
# - Official API is limited (Business accounts only)
# - Scraping has legal and ToS implications
# - Rate limits are aggressive

INSTAGRAM_CAPABILITIES = PlatformCapabilities(
    # TBD - requires research into:
    # - Instagram Basic Display API
    # - Instagram Graph API (Business)
    # - Meta API restrictions
)
```

### LinkedIn (RESEARCH-GATED)

```python
# NOTE: LinkedIn capabilities require research
# - API access is restricted
# - Rate limits are strict
# - Content policies are strict

LINKEDIN_CAPABILITIES = PlatformCapabilities(
    # TBD - requires research into:
    # - LinkedIn Marketing API
    # - LinkedIn Share API
    # - Approval process requirements
)
```

## Platform Handler Interface

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional

class PlatformHandler(ABC):
    """Base class for all platform integrations."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Return platform identifier (e.g., 'twitter', 'bluesky')."""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> PlatformCapabilities:
        """Return platform capabilities."""
        pass

    @abstractmethod
    def authenticate(self, credentials: Dict) -> bool:
        """Authenticate with platform. Returns success status."""
        pass

    @abstractmethod
    def validate_credentials(self, credentials: Dict) -> Dict:
        """Validate credentials without full auth. Returns validation result."""
        pass

    # Content operations (check capabilities before calling)
    def post(self, content: str, media: List[str] = None) -> Optional[str]:
        """Post content. Returns post ID or None if not supported."""
        if not self.capabilities.can_post:
            raise NotImplementedError(f"{self.platform_name} does not support posting")
        return self._post_impl(content, media)

    def read_timeline(self, user_id: str, count: int) -> List[Dict]:
        """Read user timeline."""
        if not self.capabilities.can_read_timeline:
            raise NotImplementedError(f"{self.platform_name} does not support reading")
        return self._read_timeline_impl(user_id, count)

    def delete_post(self, post_id: str) -> bool:
        """Delete a post."""
        if not self.capabilities.can_delete_own_posts:
            raise NotImplementedError(f"{self.platform_name} does not support deletion")
        return self._delete_post_impl(post_id)

    # Abstract implementation methods
    @abstractmethod
    def _post_impl(self, content: str, media: List[str]) -> str:
        pass

    @abstractmethod
    def _read_timeline_impl(self, user_id: str, count: int) -> List[Dict]:
        pass

    @abstractmethod
    def _delete_post_impl(self, post_id: str) -> bool:
        pass
```

## Database Schema for Multi-Platform

```sql
-- Platform registry
CREATE TABLE platforms (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,           -- 'twitter', 'bluesky', 'instagram'
    display_name TEXT NOT NULL,          -- 'Twitter', 'Bluesky', 'Instagram'
    capabilities_json TEXT NOT NULL,     -- JSON of PlatformCapabilities
    enabled INTEGER DEFAULT 0,           -- Admin can enable/disable
    requires_research INTEGER DEFAULT 0  -- Mark research-gated platforms
);

-- User credentials per platform
CREATE TABLE user_credentials (
    ...
    platform TEXT NOT NULL,  -- References platforms.name
    ...
);

-- Synced posts with platform info
CREATE TABLE synced_posts (
    ...
    source_platform TEXT NOT NULL,
    target_platform TEXT NOT NULL,
    source_post_id TEXT NOT NULL,
    target_post_id TEXT,
    ...
);
```

## UI Considerations

```typescript
// Only show platforms user has credentials for
const AvailablePlatforms = ({ userCredentials }) => (
  <>
    {platforms.filter(p =>
      userCredentials.some(c => c.platform === p.name)
    ).map(p => (
      <PlatformCard
        key={p.name}
        platform={p}
        capabilities={p.capabilities}
      />
    ))}
  </>
);

// Disable actions not supported by platform
const PostActions = ({ platform }) => {
  const caps = platform.capabilities;
  return (
    <>
      <Button disabled={!caps.can_post}>Post</Button>
      <Button disabled={!caps.can_delete_own_posts}>Delete</Button>
      <Button disabled={!caps.supports_native_scheduling}>Schedule</Button>
    </>
  );
};
```

## Adding a New Platform: Checklist

1. [ ] Research platform API/capabilities (document in ADR)
2. [ ] Define PlatformCapabilities dataclass
3. [ ] Implement PlatformHandler subclass
4. [ ] Add to platforms table (enabled=0 initially)
5. [ ] Create credential form for platform
6. [ ] Add credential validation
7. [ ] Write unit tests with mocked API
8. [ ] Write integration tests
9. [ ] Update UI to show platform
10. [ ] Document in user docs
11. [ ] Enable platform (admin setting)

## Related Skills

- `chirp-architecture.md` - System design
- `chirp-api-design.md` - Platform API endpoints
