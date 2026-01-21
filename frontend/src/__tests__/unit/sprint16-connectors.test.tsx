/**
 * Sprint 16: Connector Framework - Unit Tests
 * Tests connected to actual implementation in:
 * - src/lib/connectors.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useConnectors,
  useConnections,
  useSyncConfigs,
  useConnectPlatform,
  useDisconnectPlatform,
  useUpdateSyncConfig,
  PLATFORM_DEFAULTS,
  getPlatformCapabilities,
  canPublishTo,
  getCharacterLimit,
  validatePostForPlatform,
  PlatformType,
  CanonicalPost,
} from '@/lib/connectors';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Sprint 16: Connector Framework', () => {
  describe('US-080: Platform Capabilities', () => {
    it('should define capabilities for twitter', () => {
      const caps = PLATFORM_DEFAULTS.twitter;

      expect(caps.publish).toBe(true);
      expect(caps.delete).toBe(true);
      expect(caps.edit).toBe(false);
      expect(caps.read).toBe(true);
      expect(caps.metrics).toBe(true);
      expect(caps.schedule).toBe(true);
      expect(caps.threads).toBe(true);
      expect(caps.characterLimit).toBe(280);
    });

    it('should define capabilities for bluesky', () => {
      const caps = PLATFORM_DEFAULTS.bluesky;

      expect(caps.publish).toBe(true);
      expect(caps.delete).toBe(true);
      expect(caps.edit).toBe(false);
      expect(caps.read).toBe(true);
      expect(caps.characterLimit).toBe(300);
      expect(caps.media.videos).toBe(false);
      expect(caps.interactions.bookmark).toBe(false);
    });

    it('should define capabilities for mastodon', () => {
      const caps = PLATFORM_DEFAULTS.mastodon;

      expect(caps.publish).toBe(true);
      expect(caps.edit).toBe(true); // Mastodon supports editing
      expect(caps.characterLimit).toBe(500);
      expect(caps.media.videos).toBe(true);
      expect(caps.interactions.quote).toBe(false); // Mastodon doesn't support quote posts
    });

    it('should define capabilities for instagram (read-only)', () => {
      const caps = PLATFORM_DEFAULTS.instagram;

      expect(caps.publish).toBe(false); // Requires Business account
      expect(caps.delete).toBe(false);
      expect(caps.edit).toBe(false);
      expect(caps.read).toBe(true);
      expect(caps.metrics).toBe(true);
      expect(caps.characterLimit).toBe(2200);
      expect(caps.media.maxImages).toBe(10);
    });

    it('should include media capabilities for each platform', () => {
      const platforms: PlatformType[] = ['twitter', 'bluesky', 'mastodon', 'instagram'];

      platforms.forEach((platform) => {
        const caps = PLATFORM_DEFAULTS[platform];
        expect(caps.media).toHaveProperty('images');
        expect(caps.media).toHaveProperty('videos');
        expect(caps.media).toHaveProperty('gifs');
        expect(caps.media).toHaveProperty('maxImages');
      });
    });

    it('should include interaction capabilities for each platform', () => {
      const platforms: PlatformType[] = ['twitter', 'bluesky', 'mastodon', 'instagram'];

      platforms.forEach((platform) => {
        const caps = PLATFORM_DEFAULTS[platform];
        expect(caps.interactions).toHaveProperty('like');
        expect(caps.interactions).toHaveProperty('repost');
        expect(caps.interactions).toHaveProperty('reply');
        expect(caps.interactions).toHaveProperty('quote');
        expect(caps.interactions).toHaveProperty('bookmark');
      });
    });
  });

  describe('US-080: Canonical Post Format', () => {
    it('should define CanonicalPost with required fields', () => {
      const post: CanonicalPost = {
        id: 'post-123',
        content: 'Test content',
        created_at: new Date().toISOString(),
        author: {
          id: 'user-1',
          handle: 'testuser',
          displayName: 'Test User',
        },
      };

      expect(post.id).toBeDefined();
      expect(post.content).toBeDefined();
      expect(post.created_at).toBeDefined();
      expect(post.author.id).toBeDefined();
      expect(post.author.handle).toBeDefined();
      expect(post.author.displayName).toBeDefined();
    });

    it('should support optional media array', () => {
      const post: CanonicalPost = {
        id: 'post-123',
        content: 'Post with media',
        created_at: new Date().toISOString(),
        author: { id: '1', handle: 'user', displayName: 'User' },
        media: [
          { type: 'image', url: 'https://example.com/img.jpg', alt_text: 'Alt text' },
          { type: 'video', url: 'https://example.com/vid.mp4', duration_ms: 30000 },
        ],
      };

      expect(post.media).toHaveLength(2);
      expect(post.media![0].type).toBe('image');
      expect(post.media![1].type).toBe('video');
    });

    it('should support optional metrics', () => {
      const post: CanonicalPost = {
        id: 'post-123',
        content: 'Post with metrics',
        created_at: new Date().toISOString(),
        author: { id: '1', handle: 'user', displayName: 'User' },
        metrics: {
          likes: 100,
          reposts: 50,
          replies: 25,
          quotes: 10,
          views: 1000,
          bookmarks: 5,
        },
      };

      expect(post.metrics!.likes).toBe(100);
      expect(post.metrics!.views).toBe(1000);
    });

    it('should support thread_id for thread posts', () => {
      const post: CanonicalPost = {
        id: 'post-123',
        content: 'Part of a thread',
        created_at: new Date().toISOString(),
        author: { id: '1', handle: 'user', displayName: 'User' },
        thread_id: 'thread-456',
        reply_to: 'post-122',
      };

      expect(post.thread_id).toBe('thread-456');
      expect(post.reply_to).toBe('post-122');
    });

    it('should support language and labels', () => {
      const post: CanonicalPost = {
        id: 'post-123',
        content: 'Labeled post',
        created_at: new Date().toISOString(),
        author: { id: '1', handle: 'user', displayName: 'User' },
        language: 'en',
        labels: ['nsfw', 'spoiler'],
      };

      expect(post.language).toBe('en');
      expect(post.labels).toContain('nsfw');
    });
  });

  describe('US-080: Platform Connections', () => {
    it('should return list of available connectors', async () => {
      const { result } = renderHook(() => useConnectors(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(4);
      expect(result.current.data!.map((c) => c.platform)).toEqual([
        'twitter',
        'bluesky',
        'mastodon',
        'instagram',
      ]);
    });

    it('should include auth_type for each connector', async () => {
      const { result } = renderHook(() => useConnectors(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const authTypes = result.current.data!.map((c) => c.auth_type);
      expect(authTypes).toContain('oauth2');
      expect(authTypes).toContain('atproto');
      expect(authTypes).toContain('session');
    });

    it('should indicate connector status (available, coming_soon, beta)', async () => {
      const { result } = renderHook(() => useConnectors(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const twitterConnector = result.current.data!.find((c) => c.platform === 'twitter');
      const mastodonConnector = result.current.data!.find((c) => c.platform === 'mastodon');

      expect(twitterConnector!.status).toBe('available');
      expect(mastodonConnector!.status).toBe('coming_soon');
    });

    it('should return user connections', async () => {
      const { result } = renderHook(() => useConnections(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      const connection = result.current.data![0];

      expect(connection).toHaveProperty('id');
      expect(connection).toHaveProperty('platform');
      expect(connection).toHaveProperty('connected');
      expect(connection).toHaveProperty('sync_enabled');
    });

    it('should connect to a platform', async () => {
      const { result } = renderHook(() => useConnectPlatform(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          platform: 'bluesky',
          credentials: { identifier: 'user.bsky.social', password: 'app-password' },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 3000 }
      );

      expect(result.current.data).toEqual({ success: true, platform: 'bluesky' });
    });

    it('should disconnect from a platform', async () => {
      const { result } = renderHook(() => useDisconnectPlatform(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('twitter');
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 2000 }
      );

      expect(result.current.data).toEqual({ success: true });
    });
  });

  describe('US-080: Sync Configuration', () => {
    it('should return sync configs for connected platforms', async () => {
      const { result } = renderHook(() => useSyncConfigs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(Array.isArray(result.current.data)).toBe(true);

      const config = result.current.data![0];
      expect(config).toHaveProperty('platform');
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('direction');
      expect(config).toHaveProperty('filters');
      expect(config).toHaveProperty('transform');
    });

    it('should support sync directions: inbound, outbound, bidirectional', async () => {
      const { result } = renderHook(() => useSyncConfigs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const validDirections = ['inbound', 'outbound', 'bidirectional'];
      result.current.data!.forEach((config) => {
        expect(validDirections).toContain(config.direction);
      });
    });

    it('should include filter options in sync config', async () => {
      const { result } = renderHook(() => useSyncConfigs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { filters } = result.current.data![0];
      expect(filters).toHaveProperty('include_replies');
      expect(filters).toHaveProperty('include_reposts');
      expect(filters).toHaveProperty('include_quotes');
    });

    it('should include transform options in sync config', async () => {
      const { result } = renderHook(() => useSyncConfigs(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { transform } = result.current.data![0];
      expect(transform).toHaveProperty('add_source_link');
      expect(transform).toHaveProperty('preserve_mentions');
      expect(transform).toHaveProperty('preserve_hashtags');
      expect(transform).toHaveProperty('truncate_strategy');
    });

    it('should update sync config', async () => {
      const { result } = renderHook(() => useUpdateSyncConfig(), {
        wrapper: createWrapper(),
      });

      const newConfig = {
        platform: 'twitter' as PlatformType,
        enabled: true,
        direction: 'outbound' as const,
        filters: {
          include_replies: true,
          include_reposts: false,
          include_quotes: true,
        },
        transform: {
          add_source_link: false,
          preserve_mentions: true,
          preserve_hashtags: true,
          truncate_strategy: 'thread' as const,
        },
      };

      act(() => {
        result.current.mutate(newConfig);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newConfig);
    });
  });

  describe('US-080: Post Validation', () => {
    it('should validate content length against platform limit', () => {
      const longContent = 'x'.repeat(300);

      const twitterResult = validatePostForPlatform({ content: longContent }, 'twitter');
      const blueskyResult = validatePostForPlatform({ content: longContent }, 'bluesky');

      expect(twitterResult.valid).toBe(false);
      expect(twitterResult.errors).toContain(
        'Content exceeds 280 character limit for twitter'
      );

      expect(blueskyResult.valid).toBe(true);
      expect(blueskyResult.errors).toHaveLength(0);
    });

    it('should validate media count against platform limit', () => {
      const post: Partial<CanonicalPost> = {
        content: 'Post with many images',
        media: Array.from({ length: 5 }, (_, i) => ({
          type: 'image' as const,
          url: `https://example.com/img${i}.jpg`,
        })),
      };

      const twitterResult = validatePostForPlatform(post, 'twitter');
      expect(twitterResult.valid).toBe(false);
      expect(twitterResult.errors[0]).toContain('Too many media items');
    });

    it('should validate video support for platforms', () => {
      const post: Partial<CanonicalPost> = {
        content: 'Post with video',
        media: [{ type: 'video', url: 'https://example.com/vid.mp4' }],
      };

      const blueskyResult = validatePostForPlatform(post, 'bluesky');
      expect(blueskyResult.valid).toBe(false);
      expect(blueskyResult.errors).toContain('bluesky does not support videos');

      const twitterResult = validatePostForPlatform(post, 'twitter');
      expect(twitterResult.valid).toBe(true);
    });

    it('should validate GIF support for platforms', () => {
      const post: Partial<CanonicalPost> = {
        content: 'Post with GIF',
        media: [{ type: 'gif', url: 'https://example.com/anim.gif' }],
      };

      const blueskyResult = validatePostForPlatform(post, 'bluesky');
      expect(blueskyResult.valid).toBe(false);
      expect(blueskyResult.errors).toContain('bluesky does not support GIFs');

      const instagramResult = validatePostForPlatform(post, 'instagram');
      expect(instagramResult.valid).toBe(false);
    });

    it('should validate quote post support', () => {
      const post: Partial<CanonicalPost> = {
        content: 'Quote post',
        quote_of: 'original-post-123',
      };

      const mastodonResult = validatePostForPlatform(post, 'mastodon');
      expect(mastodonResult.valid).toBe(false);
      expect(mastodonResult.errors).toContain('mastodon does not support quote posts');

      const twitterResult = validatePostForPlatform(post, 'twitter');
      expect(twitterResult.valid).toBe(true);
    });

    it('should validate alt text length', () => {
      const post: Partial<CanonicalPost> = {
        content: 'Post',
        media: [
          {
            type: 'image',
            url: 'https://example.com/img.jpg',
            alt_text: 'x'.repeat(2500), // Too long for any platform
          },
        ],
      };

      const twitterResult = validatePostForPlatform(post, 'twitter');
      const blueskyResult = validatePostForPlatform(post, 'bluesky');

      expect(twitterResult.valid).toBe(false);
      expect(twitterResult.errors[0]).toContain('Alt text');

      // Bluesky has 2000 char limit, so still fails
      expect(blueskyResult.valid).toBe(false);
    });
  });

  describe('US-080: Utility Functions', () => {
    it('should get platform capabilities', () => {
      const caps = getPlatformCapabilities('twitter');
      expect(caps).toEqual(PLATFORM_DEFAULTS.twitter);
    });

    it('should check if platform supports publishing', () => {
      expect(canPublishTo('twitter')).toBe(true);
      expect(canPublishTo('bluesky')).toBe(true);
      expect(canPublishTo('instagram')).toBe(false);
    });

    it('should get character limit for platform', () => {
      expect(getCharacterLimit('twitter')).toBe(280);
      expect(getCharacterLimit('bluesky')).toBe(300);
      expect(getCharacterLimit('mastodon')).toBe(500);
      expect(getCharacterLimit('instagram')).toBe(2200);
    });
  });
});
