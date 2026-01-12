---
name: Connector Framework
description: Multi-platform connector architecture for Twitter, Bluesky, Mastodon, Instagram
category: integration
triggers:
  - connector
  - platform integration
  - bluesky
  - mastodon
  - instagram
  - multi-platform
  - twscrape
  - PlatformConnector
  - rate limiter
  - CanonicalPost
auto_trigger: after_platform_change
dependencies:
  - app/integrations/
  - chirp-open-social-hub.md
  - chirp-multi-platform.md
  - docs/PROTOCOL_ROADMAP.md
version: "1.1"
sprint_relevant: 16-18
---

# Skill: Connector Framework

Use this skill when implementing platform connectors, adding new platform support, or working with the integration layer.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Pattern | Abstract base + platform implementations |
| Current | Twitter (twscrape) |
| Planned | Bluesky, Mastodon, Instagram |
| Location | `app/integrations/connectors/` |

## Connector Interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime

@dataclass
class PlatformCapabilities:
    """What this platform can do."""
    can_publish: bool
    can_delete: bool
    can_read_timeline: bool
    can_read_mentions: bool
    can_read_metrics: bool
    can_search: bool
    max_text_length: int
    max_images: int
    max_video_size_mb: int
    supports_threads: bool
    supports_polls: bool
    auth_method: str  # 'oauth2', 'api_key', 'session', 'atproto'
    rate_limits: Dict[str, int]  # operation -> requests per window

class PlatformConnector(ABC):
    """Base class for all platform connectors."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Unique platform identifier."""
        ...

    @abstractmethod
    def get_capabilities(self) -> PlatformCapabilities:
        """Return platform capabilities."""
        ...

    @abstractmethod
    def authenticate(self, credentials: Dict) -> bool:
        """
        Authenticate with the platform.

        Args:
            credentials: Platform-specific auth data

        Returns:
            True if authentication successful
        """
        ...

    @abstractmethod
    def test_connection(self) -> Dict:
        """
        Test if connection is valid.

        Returns:
            {'success': bool, 'message': str, 'user_info': Optional[Dict]}
        """
        ...

    @abstractmethod
    def fetch_posts(
        self,
        user_id: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: int = 100
    ) -> List['CanonicalPost']:
        """
        Fetch posts from the platform.

        Args:
            user_id: Platform user ID (None = authenticated user)
            since: Only posts after this time
            limit: Maximum posts to fetch

        Returns:
            List of CanonicalPost objects
        """
        ...

    @abstractmethod
    def publish_post(self, post: 'CanonicalPost') -> 'NetworkPostMapping':
        """
        Publish a post to the platform.

        Args:
            post: CanonicalPost to publish

        Returns:
            NetworkPostMapping with platform-specific IDs
        """
        ...

    @abstractmethod
    def delete_post(self, native_id: str) -> bool:
        """
        Delete a post from the platform.

        Args:
            native_id: Platform-specific post ID

        Returns:
            True if deletion successful
        """
        ...

    def get_metrics(self, native_id: str) -> Optional['PostMetrics']:
        """Get metrics for a post (optional implementation)."""
        return None

    def search(self, query: str, limit: int = 50) -> List['CanonicalPost']:
        """Search posts (optional implementation)."""
        return []
```

## Platform Implementations

### Twitter Connector (Current)

```python
# app/integrations/connectors/twitter_connector.py
from twscrape import API, gather

class TwitterConnector(PlatformConnector):
    platform_name = "twitter"

    def __init__(self, credentials: Dict):
        self.api = API()
        self._credentials = credentials

    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=False,      # twscrape is read-only
            can_delete=False,       # Need official API
            can_read_timeline=True,
            can_read_mentions=True,
            can_read_metrics=True,
            can_search=True,
            max_text_length=280,
            max_images=4,
            max_video_size_mb=512,
            supports_threads=True,
            supports_polls=True,
            auth_method='session',
            rate_limits={
                'user_tweets': 900,     # per 15 min
                'search': 180,
                'user_by_login': 900,
            }
        )

    async def authenticate(self, credentials: Dict) -> bool:
        await self.api.pool.add_account(
            credentials['username'],
            credentials['password'],
            credentials.get('email'),
            credentials.get('email_password')
        )
        await self.api.pool.login_all()
        return True

    async def fetch_posts(self, user_id: str, since: datetime = None, limit: int = 100):
        tweets = await gather(self.api.user_tweets(int(user_id), limit=limit))
        return [self._to_canonical(t) for t in tweets]

    def _to_canonical(self, tweet) -> 'CanonicalPost':
        return CanonicalPost(
            id=str(uuid4()),
            content=tweet.rawContent,
            media=self._extract_media(tweet),
            created_at=tweet.date,
            author=Author(
                id=str(tweet.user.id),
                username=tweet.user.username,
                display_name=tweet.user.displayname
            ),
            metrics=PostMetrics(
                likes=tweet.likeCount,
                reposts=tweet.retweetCount,
                replies=tweet.replyCount,
                views=tweet.viewCount,
                engagement_rate=self._calc_engagement(tweet)
            ),
            platform_mappings=[
                NetworkPostMapping(
                    platform='twitter',
                    native_id=str(tweet.id),
                    url=tweet.url,
                    synced_at=datetime.utcnow()
                )
            ]
        )
```

### Bluesky Connector (Sprint 17)

```python
# app/integrations/connectors/bluesky_connector.py
from atproto import Client, models

class BlueskyConnector(PlatformConnector):
    platform_name = "bluesky"

    def __init__(self):
        self.client = Client()
        self._session = None

    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=True,
            can_delete=True,
            can_read_timeline=True,
            can_read_mentions=True,
            can_read_metrics=True,
            can_search=True,
            max_text_length=300,
            max_images=4,
            max_video_size_mb=50,
            supports_threads=True,
            supports_polls=False,
            auth_method='atproto',
            rate_limits={
                'create_record': 1666,   # per 5 min
                'get_timeline': 1000,
            }
        )

    def authenticate(self, credentials: Dict) -> bool:
        self._session = self.client.login(
            credentials['handle'],
            credentials['app_password']
        )
        return self._session is not None

    def publish_post(self, post: 'CanonicalPost') -> 'NetworkPostMapping':
        response = self.client.send_post(text=post.content)
        return NetworkPostMapping(
            platform='bluesky',
            native_id=response.uri,
            url=f"https://bsky.app/profile/{self._session.handle}/post/{response.uri.split('/')[-1]}",
            synced_at=datetime.utcnow()
        )

    def delete_post(self, native_id: str) -> bool:
        self.client.delete_post(native_id)
        return True
```

### Mastodon Connector (Sprint 18)

```python
# app/integrations/connectors/mastodon_connector.py
from mastodon import Mastodon

class MastodonConnector(PlatformConnector):
    platform_name = "mastodon"

    def __init__(self, instance_url: str):
        self.instance_url = instance_url
        self.client = None

    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=True,
            can_delete=True,
            can_read_timeline=True,
            can_read_mentions=True,
            can_read_metrics=True,
            can_search=True,
            max_text_length=500,  # Varies by instance
            max_images=4,
            max_video_size_mb=40,
            supports_threads=True,
            supports_polls=True,
            auth_method='oauth2',
            rate_limits={
                'statuses': 300,  # per 5 min
            }
        )

    def authenticate(self, credentials: Dict) -> bool:
        self.client = Mastodon(
            access_token=credentials['access_token'],
            api_base_url=self.instance_url
        )
        return self.client.me() is not None
```

### Instagram Connector (Sprint 18)

```python
# app/integrations/connectors/instagram_connector.py

class InstagramConnector(PlatformConnector):
    """Read-only Instagram connector via Graph API."""

    platform_name = "instagram"

    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=False,       # Requires Business account
            can_delete=False,
            can_read_timeline=True,
            can_read_mentions=False,
            can_read_metrics=True,   # Basic metrics only
            can_search=False,
            max_text_length=2200,
            max_images=10,
            max_video_size_mb=100,
            supports_threads=False,
            supports_polls=False,
            auth_method='oauth2',
            rate_limits={
                'user_media': 200,  # per hour
            }
        )
```

## Connector Registry

```python
# app/integrations/connector_registry.py
from typing import Dict, Type

class ConnectorRegistry:
    """Registry for platform connectors."""

    _connectors: Dict[str, Type[PlatformConnector]] = {}

    @classmethod
    def register(cls, connector_class: Type[PlatformConnector]):
        """Register a connector class."""
        cls._connectors[connector_class.platform_name] = connector_class

    @classmethod
    def get(cls, platform: str) -> Type[PlatformConnector]:
        """Get connector class by platform name."""
        if platform not in cls._connectors:
            raise ValueError(f"Unknown platform: {platform}")
        return cls._connectors[platform]

    @classmethod
    def list_platforms(cls) -> List[str]:
        """List all registered platforms."""
        return list(cls._connectors.keys())

    @classmethod
    def get_capabilities(cls, platform: str) -> PlatformCapabilities:
        """Get capabilities for a platform."""
        return cls.get(platform)().get_capabilities()

# Auto-register connectors
ConnectorRegistry.register(TwitterConnector)
ConnectorRegistry.register(BlueskyConnector)
ConnectorRegistry.register(MastodonConnector)
ConnectorRegistry.register(InstagramConnector)
```

## Rate Limiting

```python
# app/integrations/rate_limiter.py
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta

class RateLimiter:
    """Token bucket rate limiter for API calls."""

    def __init__(self):
        self._buckets: Dict[str, Dict] = defaultdict(dict)

    async def acquire(self, platform: str, operation: str, limit: int, window_seconds: int):
        """
        Acquire a rate limit token.

        Args:
            platform: Platform name
            operation: Operation name (e.g., 'user_tweets')
            limit: Max requests per window
            window_seconds: Window duration

        Raises:
            RateLimitExceeded if limit reached
        """
        key = f"{platform}:{operation}"
        bucket = self._buckets[key]

        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window_seconds)

        # Clean old entries
        bucket['requests'] = [
            t for t in bucket.get('requests', [])
            if t > window_start
        ]

        if len(bucket['requests']) >= limit:
            wait_time = (bucket['requests'][0] - window_start).total_seconds()
            raise RateLimitExceeded(f"Rate limit exceeded. Wait {wait_time:.0f}s")

        bucket['requests'].append(now)

    async def wait_if_needed(self, platform: str, operation: str, limit: int, window_seconds: int):
        """Wait until rate limit allows request."""
        while True:
            try:
                await self.acquire(platform, operation, limit, window_seconds)
                return
            except RateLimitExceeded:
                await asyncio.sleep(1)
```

## Error Handling

```python
# app/integrations/exceptions.py

class ConnectorError(Exception):
    """Base exception for connector errors."""
    pass

class AuthenticationError(ConnectorError):
    """Failed to authenticate with platform."""
    pass

class RateLimitExceeded(ConnectorError):
    """Rate limit exceeded for platform."""
    pass

class PlatformUnavailable(ConnectorError):
    """Platform API is unavailable."""
    pass

class CapabilityNotSupported(ConnectorError):
    """Requested capability not supported by platform."""
    pass

class PostNotFound(ConnectorError):
    """Post not found on platform."""
    pass
```

## Testing Connectors

```python
# tests/unit/test_connectors.py
import pytest
from unittest.mock import Mock, patch

class TestTwitterConnector:
    @pytest.fixture
    def connector(self):
        return TwitterConnector({})

    def test_capabilities(self, connector):
        caps = connector.get_capabilities()
        assert caps.can_read_timeline is True
        assert caps.can_publish is False  # twscrape limitation
        assert caps.max_text_length == 280

    @patch('twscrape.API')
    async def test_fetch_posts(self, mock_api, connector):
        mock_api.return_value.user_tweets.return_value = [
            Mock(id=1, rawContent="Hello", likeCount=10)
        ]
        posts = await connector.fetch_posts("123", limit=10)
        assert len(posts) == 1
        assert posts[0].content == "Hello"
```

## File Structure

```
app/integrations/
├── __init__.py
├── connectors/
│   ├── __init__.py
│   ├── base.py              # PlatformConnector ABC
│   ├── twitter_connector.py
│   ├── bluesky_connector.py
│   ├── mastodon_connector.py
│   └── instagram_connector.py
├── connector_registry.py
├── rate_limiter.py
├── exceptions.py
└── models/
    ├── canonical_post.py
    └── capabilities.py
```

## Related Skills

- `chirp-open-social-hub.md` - Vision and data models
- `chirp-api-contracts.md` - API specifications
- `chirp-architecture.md` - System design
