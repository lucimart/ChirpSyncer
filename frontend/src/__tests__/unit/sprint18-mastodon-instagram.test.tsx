/**
 * Sprint 18: Mastodon + Instagram - Unit Tests
 * Tests connected to actual implementation in:
 * - src/lib/mastodon.ts
 * - src/lib/instagram.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Mastodon imports
import {
  stripHtml,
  mastodonToCanonical,
  useMastodonInstance,
  useMastodonTimeline,
  useCreateMastodonStatus,
  useDeleteMastodonStatus,
  useFavouriteMastodonStatus,
  useBoostMastodonStatus,
  MastodonStatus,
} from '@/lib/mastodon';

// Instagram imports
import {
  getProfileUrl as getInstagramProfileUrl,
  extractHashtags as extractInstagramHashtags,
  instagramToCanonical,
  useInstagramProfile,
  useInstagramMedia,
  useInstagramInsights,
  useInstagramStories,
  INSTAGRAM_LIMITATIONS,
  InstagramMedia,
  InstagramUser,
} from '@/lib/instagram';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

describe('Sprint 18: Mastodon + Instagram', () => {
  describe('Mastodon: Instance Discovery', () => {
    const mockFetch = jest.fn();
    const originalFetch = global.fetch;

    const mockInstance = {
      uri: 'mastodon.social',
      title: 'Mastodon',
      version: '4.0.0',
      stats: { user_count: 1000000, status_count: 5000000, domain_count: 10000 },
      urls: { streaming_api: 'wss://mastodon.social/api/v1/streaming' },
      configuration: {
        statuses: { max_characters: 500, max_media_attachments: 4, characters_reserved_per_url: 23 },
        media_attachments: {
          supported_mime_types: ['image/jpeg', 'image/png'],
          image_size_limit: 10485760,
          video_size_limit: 41943040,
        },
        polls: { max_options: 4, max_characters_per_option: 50, min_expiration: 300, max_expiration: 2629746 },
      },
      rules: [],
    };

    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockInstance }),
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
      mockFetch.mockReset();
    });

    it('should fetch instance information', async () => {
      const { result } = renderHook(() => useMastodonInstance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const instance = result.current.data!;
      expect(instance.uri).toBeDefined();
      expect(instance).toHaveProperty('title');
      expect(instance).toHaveProperty('version');
      expect(instance).toHaveProperty('stats');
      expect(instance.stats).toHaveProperty('user_count');
      expect(instance.stats).toHaveProperty('status_count');
    });

    it('should include configuration limits from instance', async () => {
      const { result } = renderHook(() => useMastodonInstance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { configuration } = result.current.data!;
      expect(configuration.statuses.max_characters).toBeDefined();
      expect(configuration.statuses.max_media_attachments).toBeDefined();
      expect(configuration.media_attachments.image_size_limit).toBeDefined();
      expect(configuration.media_attachments.video_size_limit).toBeDefined();
    });

    it('should include streaming API URL', async () => {
      const { result } = renderHook(() => useMastodonInstance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.urls.streaming_api).toMatch(/^wss?:\/\//);
    });
  });

  describe('Mastodon: Post Conversion', () => {
    it('should strip HTML from status content', () => {
      const html = '<p>Hello <a href="https://example.com">world</a>!</p>';
      const text = stripHtml(html);
      expect(text).toBe('Hello world!');
    });

    it('should convert Mastodon status to canonical format', () => {
      const status: MastodonStatus = {
        id: 'status-123',
        createdAt: '2024-01-15T12:00:00.000Z',
        sensitive: false,
        spoilerText: '',
        visibility: 'public',
        language: 'en',
        uri: 'https://mastodon.social/users/user/statuses/123',
        url: 'https://mastodon.social/@user/123',
        repliesCount: 5,
        reblogsCount: 10,
        favouritesCount: 25,
        content: '<p>Hello Mastodon!</p>',
        account: {
          id: 'user-1',
          username: 'user',
          acct: 'user@mastodon.social',
          displayName: 'Test User',
          locked: false,
          bot: false,
          createdAt: '2023-01-01T00:00:00.000Z',
          note: '',
          url: 'https://mastodon.social/@user',
          avatar: 'https://example.com/avatar.jpg',
          header: '',
          followersCount: 100,
          followingCount: 50,
          statusesCount: 200,
          emojis: [],
          fields: [],
        },
        mediaAttachments: [],
        mentions: [],
        tags: [],
        emojis: [],
      };

      const canonical = mastodonToCanonical(status);

      expect(canonical.id).toBe('status-123');
      expect(canonical.content).toBe('Hello Mastodon!');
      expect(canonical.created_at).toBe('2024-01-15T12:00:00.000Z');
      expect(canonical.author.handle).toBe('user@mastodon.social');
      expect(canonical.author.displayName).toBe('Test User');
      expect(canonical.metrics!.likes).toBe(25);
      expect(canonical.metrics!.reposts).toBe(10);
      expect(canonical.metrics!.replies).toBe(5);
      expect(canonical.language).toBe('en');
    });

    it('should convert media attachments', () => {
      const status: MastodonStatus = {
        id: 'status-123',
        createdAt: new Date().toISOString(),
        sensitive: false,
        spoilerText: '',
        visibility: 'public',
        uri: 'https://mastodon.social/users/user/statuses/123',
        repliesCount: 0,
        reblogsCount: 0,
        favouritesCount: 0,
        content: '<p>Post with media</p>',
        account: {
          id: 'user-1',
          username: 'user',
          acct: 'user',
          displayName: 'User',
          locked: false,
          bot: false,
          createdAt: '',
          note: '',
          url: '',
          avatar: '',
          header: '',
          followersCount: 0,
          followingCount: 0,
          statusesCount: 0,
          emojis: [],
          fields: [],
        },
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'image',
            url: 'https://example.com/image.jpg',
            previewUrl: 'https://example.com/preview.jpg',
            description: 'Alt text',
            meta: { original: { width: 800, height: 600 } },
          },
          {
            id: 'media-2',
            type: 'video',
            url: 'https://example.com/video.mp4',
            meta: { original: { width: 1920, height: 1080, duration: 30 } },
          },
        ],
        mentions: [],
        tags: [],
        emojis: [],
      };

      const canonical = mastodonToCanonical(status);

      expect(canonical.media).toHaveLength(2);
      expect(canonical.media![0].type).toBe('image');
      expect(canonical.media![0].url).toBe('https://example.com/image.jpg');
      expect(canonical.media![0].alt_text).toBe('Alt text');
      expect(canonical.media![1].type).toBe('video');
    });

    it('should handle gifv as gif type', () => {
      const status: MastodonStatus = {
        id: 'status-123',
        createdAt: new Date().toISOString(),
        sensitive: false,
        spoilerText: '',
        visibility: 'public',
        uri: 'https://mastodon.social/users/user/statuses/123',
        repliesCount: 0,
        reblogsCount: 0,
        favouritesCount: 0,
        content: '<p>GIF post</p>',
        account: {
          id: 'user-1',
          username: 'user',
          acct: 'user',
          displayName: 'User',
          locked: false,
          bot: false,
          createdAt: '',
          note: '',
          url: '',
          avatar: '',
          header: '',
          followersCount: 0,
          followingCount: 0,
          statusesCount: 0,
          emojis: [],
          fields: [],
        },
        mediaAttachments: [
          {
            id: 'media-1',
            type: 'gifv',
            url: 'https://example.com/anim.gif',
          },
        ],
        mentions: [],
        tags: [],
        emojis: [],
      };

      const canonical = mastodonToCanonical(status);

      expect(canonical.media![0].type).toBe('gif');
    });
  });

  describe('Mastodon: API Hooks', () => {
    const mockFetch = jest.fn();
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      mockFetch.mockReset();
    });

    it('should fetch home timeline', async () => {
      const mockTimeline = {
        statuses: [
          {
            id: 'status-1',
            content: '<p>Test status</p>',
            createdAt: '2024-01-15T12:00:00.000Z',
            account: { id: 'user-1', username: 'testuser', acct: 'testuser' },
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTimeline }),
      });

      const { result } = renderHook(() => useMastodonTimeline(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { statuses } = result.current.data!;
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses[0]).toHaveProperty('id');
      expect(statuses[0]).toHaveProperty('content');
      expect(statuses[0]).toHaveProperty('account');
    });

    it('should create a status', async () => {
      const mockStatus = {
        id: 'new-status-123',
        uri: 'https://mastodon.social/users/test/statuses/123',
        url: 'https://mastodon.social/@test/123',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStatus }),
      });

      const { result } = renderHook(() => useCreateMastodonStatus(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ status: 'Test toot from unit test', visibility: 'public' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const mapping = result.current.data!;
      expect(mapping.platform).toBe('mastodon');
      expect(mapping.native_id).toBeDefined();
      expect(mapping.url).toMatch(/^https:\/\/mastodon\.social/);
      expect(mapping.status).toBe('synced');
    });

    it('should delete a status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { deleted: true } }),
      });

      const { result } = renderHook(() => useDeleteMastodonStatus(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('status-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ deleted: true });
    });

    it('should favourite a status', async () => {
      const mockStatus = { id: 'status-123', favourited: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStatus }),
      });

      const { result } = renderHook(() => useFavouriteMastodonStatus(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('status-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should boost a status', async () => {
      const mockStatus = { id: 'status-123', reblogged: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStatus }),
      });

      const { result } = renderHook(() => useBoostMastodonStatus(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('status-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe('Instagram: Limitations', () => {
    it('should define publishing requirements', () => {
      expect(INSTAGRAM_LIMITATIONS.publishRequiresApproval).toBe(true);
      expect(INSTAGRAM_LIMITATIONS.requiresBusinessAccount).toBe(true);
    });

    it('should define media limitations', () => {
      expect(INSTAGRAM_LIMITATIONS.maxCaptionLength).toBe(2200);
      expect(INSTAGRAM_LIMITATIONS.maxHashtags).toBe(30);
      expect(INSTAGRAM_LIMITATIONS.maxCarouselItems).toBe(10);
    });

    it('should define file size limits', () => {
      expect(INSTAGRAM_LIMITATIONS.maxImageSize).toBe(8 * 1024 * 1024); // 8MB
      expect(INSTAGRAM_LIMITATIONS.maxVideoSize).toBe(100 * 1024 * 1024); // 100MB
    });

    it('should define supported formats', () => {
      expect(INSTAGRAM_LIMITATIONS.supportedImageFormats).toContain('image/jpeg');
      expect(INSTAGRAM_LIMITATIONS.supportedImageFormats).toContain('image/png');
      expect(INSTAGRAM_LIMITATIONS.supportedVideoFormats).toContain('video/mp4');
    });
  });

  describe('Instagram: Post Conversion', () => {
    it('should generate Instagram profile URL', () => {
      const url = getInstagramProfileUrl('testuser');
      expect(url).toBe('https://instagram.com/testuser');
    });

    it('should extract hashtags from caption', () => {
      const caption = 'Beautiful sunset #photography #nature #travel';
      const hashtags = extractInstagramHashtags(caption);

      expect(hashtags).toHaveLength(3);
      expect(hashtags).toContain('photography');
      expect(hashtags).toContain('nature');
      expect(hashtags).toContain('travel');
    });

    it('should convert Instagram media to canonical format', () => {
      const media: InstagramMedia = {
        id: 'media-123',
        caption: 'Test post #instagram',
        media_type: 'IMAGE',
        media_url: 'https://example.com/image.jpg',
        permalink: 'https://instagram.com/p/abc123',
        timestamp: '2024-01-15T12:00:00.000Z',
        username: 'testuser',
        like_count: 100,
        comments_count: 25,
      };

      const user: InstagramUser = {
        id: 'user-123',
        username: 'testuser',
        name: 'Test User',
        followers_count: 5000,
        follows_count: 500,
        media_count: 150,
        account_type: 'PERSONAL',
      };

      const canonical = instagramToCanonical(media, user);

      expect(canonical.id).toBe('media-123');
      expect(canonical.content).toBe('Test post #instagram');
      expect(canonical.created_at).toBe('2024-01-15T12:00:00.000Z');
      expect(canonical.author.handle).toBe('testuser');
      expect(canonical.author.displayName).toBe('Test User');
      expect(canonical.metrics!.likes).toBe(100);
      expect(canonical.metrics!.replies).toBe(25);
      expect(canonical.media).toHaveLength(1);
      expect(canonical.media![0].type).toBe('image');
    });

    it('should convert carousel album media', () => {
      const media: InstagramMedia = {
        id: 'carousel-123',
        caption: 'Carousel post',
        media_type: 'CAROUSEL_ALBUM',
        permalink: 'https://instagram.com/p/carousel',
        timestamp: new Date().toISOString(),
        username: 'user',
        children: [
          { id: 'child-1', media_type: 'IMAGE', media_url: 'https://example.com/1.jpg' },
          { id: 'child-2', media_type: 'VIDEO', media_url: 'https://example.com/2.mp4' },
          { id: 'child-3', media_type: 'IMAGE', media_url: 'https://example.com/3.jpg' },
        ],
      };

      const user: InstagramUser = {
        id: 'user-123',
        username: 'user',
        followers_count: 100,
        follows_count: 50,
        media_count: 10,
        account_type: 'PERSONAL',
      };

      const canonical = instagramToCanonical(media, user);

      expect(canonical.media).toHaveLength(3);
      expect(canonical.media![0].type).toBe('image');
      expect(canonical.media![1].type).toBe('video');
      expect(canonical.media![2].type).toBe('image');
    });

    it('should handle video media type', () => {
      const media: InstagramMedia = {
        id: 'video-123',
        media_type: 'VIDEO',
        media_url: 'https://example.com/video.mp4',
        permalink: 'https://instagram.com/p/video',
        timestamp: new Date().toISOString(),
        username: 'user',
      };

      const user: InstagramUser = {
        id: 'user-123',
        username: 'user',
        followers_count: 100,
        follows_count: 50,
        media_count: 10,
        account_type: 'PERSONAL',
      };

      const canonical = instagramToCanonical(media, user);

      expect(canonical.media![0].type).toBe('video');
    });
  });

  describe('Instagram: API Hooks (Read-only)', () => {
    const mockFetch = jest.fn();
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      mockFetch.mockReset();
    });

    it('should fetch profile by username', async () => {
      const mockProfile = {
        id: 'ig-user-123',
        username: 'testuser',
        name: 'Test User',
        biography: 'Test bio',
        followers_count: 5000,
        follows_count: 500,
        media_count: 150,
        account_type: 'PERSONAL',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockProfile }),
      });

      const { result } = renderHook(() => useInstagramProfile('testuser'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const profile = result.current.data!;
      expect(profile.username).toBe('testuser');
      expect(profile).toHaveProperty('followers_count');
      expect(profile).toHaveProperty('follows_count');
      expect(profile).toHaveProperty('media_count');
      expect(profile).toHaveProperty('account_type');
    });

    it('should fetch user media', async () => {
      const mockMedia = {
        data: [
          {
            id: 'media-1',
            caption: 'Test post',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image.jpg',
            permalink: 'https://instagram.com/p/abc123',
            timestamp: '2024-01-15T12:00:00+0000',
            like_count: 100,
            comments_count: 10,
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockMedia }),
      });

      const { result } = renderHook(() => useInstagramMedia('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const media = result.current.data!;
      expect(Array.isArray(media.data)).toBe(true);
      expect(media.data.length).toBeGreaterThan(0);
      expect(media.data[0]).toHaveProperty('id');
      expect(media.data[0]).toHaveProperty('media_type');
      expect(media.data[0]).toHaveProperty('permalink');
    });

    it('should fetch insights for media', async () => {
      const mockInsights = {
        media_id: 'media-123',
        impressions: 5000,
        reach: 3000,
        engagement: 500,
        saved: 50,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockInsights }),
      });

      const { result } = renderHook(() => useInstagramInsights('media-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const insights = result.current.data!;
      expect(insights.media_id).toBe('media-123');
      expect(insights).toHaveProperty('impressions');
      expect(insights).toHaveProperty('reach');
      expect(insights).toHaveProperty('engagement');
      expect(insights).toHaveProperty('saved');
    });

    it('should fetch user stories', async () => {
      const mockStories = {
        data: [
          {
            id: 'story-1',
            media_type: 'IMAGE',
            media_url: 'https://example.com/story.jpg',
            timestamp: '2024-01-15T12:00:00+0000',
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockStories }),
      });

      const { result } = renderHook(() => useInstagramStories('user-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const stories = result.current.data!;
      expect(Array.isArray(stories.data)).toBe(true);
      stories.data.forEach((story: { id: string; media_type: string; media_url: string; timestamp: string }) => {
        expect(story).toHaveProperty('id');
        expect(story).toHaveProperty('media_type');
        expect(story).toHaveProperty('media_url');
        expect(story).toHaveProperty('timestamp');
      });
    });
  });
});
