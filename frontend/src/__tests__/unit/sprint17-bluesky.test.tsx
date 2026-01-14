/**
 * Sprint 17: Bluesky AT Protocol - Unit Tests
 * Tests connected to actual implementation in:
 * - src/lib/bluesky.ts
 * - src/components/bluesky/BlueskyPost.tsx
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  parseATUri,
  buildATUri,
  getPostUrl,
  getProfileUrl,
  getDIDMethod,
  extractMentions,
  extractHashtags,
  extractUrls,
  atProtoToCanonical,
  canonicalToATProto,
  useBlueskyProfile,
  useBlueskyTimeline,
  useBlueskyPost,
  useResolveDID,
  useCreateBlueskyPost,
  useDeleteBlueskyPost,
  useLikeBlueskyPost,
  useRepostBluesky,
  useBlueskyFeeds,
  ATProtoPost,
  ATProtoFacet,
} from '@/lib/bluesky';

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

describe('Sprint 17: Bluesky AT Protocol', () => {
  describe('US-085: DID Resolution', () => {
    it('should identify did:plc method', () => {
      expect(getDIDMethod('did:plc:z72i7hdynmk6r22z27h6tvur')).toBe('plc');
    });

    it('should identify did:web method', () => {
      expect(getDIDMethod('did:web:example.com')).toBe('web');
    });

    it('should return null for invalid DID', () => {
      expect(getDIDMethod('invalid-did')).toBeNull();
      expect(getDIDMethod('did:unknown:123')).toBeNull();
    });

    it('should resolve handle to DID', async () => {
      const { result } = renderHook(() => useResolveDID(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('user.bsky.social');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const resolved = result.current.data!;
      expect(resolved.did).toMatch(/^did:plc:/);
      expect(resolved.handle).toBe('user.bsky.social');
      expect(resolved.pds).toBeDefined();
      expect(resolved.resolved_at).toBeDefined();
    });

    it('should resolve DID to handle', async () => {
      const { result } = renderHook(() => useResolveDID(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('did:plc:example123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const resolved = result.current.data!;
      expect(resolved.did).toBe('did:plc:example123');
      expect(resolved.handle).toMatch(/\.bsky\.social$/);
    });
  });

  describe('US-085: AT URI Parsing', () => {
    it('should parse valid AT URI', () => {
      const uri = 'at://did:plc:user123/app.bsky.feed.post/abc123';
      const parsed = parseATUri(uri);

      expect(parsed).not.toBeNull();
      expect(parsed!.repo).toBe('did:plc:user123');
      expect(parsed!.collection).toBe('app.bsky.feed.post');
      expect(parsed!.rkey).toBe('abc123');
    });

    it('should return null for invalid AT URI', () => {
      expect(parseATUri('invalid')).toBeNull();
      expect(parseATUri('https://bsky.app/...')).toBeNull();
      expect(parseATUri('at://incomplete')).toBeNull();
    });

    it('should build AT URI from components', () => {
      const uri = buildATUri('did:plc:user123', 'app.bsky.feed.post', 'rkey456');
      expect(uri).toBe('at://did:plc:user123/app.bsky.feed.post/rkey456');
    });

    it('should generate bsky.app post URL', () => {
      const url = getPostUrl('user.bsky.social', 'abc123');
      expect(url).toBe('https://bsky.app/profile/user.bsky.social/post/abc123');
    });

    it('should generate bsky.app profile URL', () => {
      const url = getProfileUrl('user.bsky.social');
      expect(url).toBe('https://bsky.app/profile/user.bsky.social');
    });
  });

  describe('US-085: Rich Text Facets', () => {
    it('should extract mentions from text', () => {
      const text = 'Hello @user.bsky.social and @other.bsky.social!';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(2);
      expect(mentions).toContain('user.bsky.social');
      expect(mentions).toContain('other.bsky.social');
    });

    it('should extract hashtags from text', () => {
      const text = 'Check out #bluesky and #atproto today!';
      const hashtags = extractHashtags(text);

      expect(hashtags).toHaveLength(2);
      expect(hashtags).toContain('bluesky');
      expect(hashtags).toContain('atproto');
    });

    it('should extract URLs from text', () => {
      const text = 'Visit https://bsky.app and http://example.com for more info';
      const urls = extractUrls(text);

      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://bsky.app');
      expect(urls).toContain('http://example.com');
    });

    it('should convert canonical post to AT Protocol record with facets', () => {
      const canonical = {
        content: 'Hello @user.bsky.social! Check #bluesky at https://bsky.app',
        created_at: '2024-01-15T12:00:00.000Z',
        language: 'en',
      };

      const record = canonicalToATProto(canonical);

      expect(record.$type).toBe('app.bsky.feed.post');
      expect(record.text).toBe(canonical.content);
      expect(record.createdAt).toBe(canonical.created_at);
      expect(record.langs).toEqual(['en']);
      expect(record.facets).toBeDefined();
      expect(record.facets!.length).toBe(3); // mention, hashtag, link
    });

    it('should calculate correct byte indices for facets', () => {
      const canonical = {
        content: 'Hi @a.bsky.social!',
      };

      const record = canonicalToATProto(canonical);
      const mentionFacet = record.facets?.find((f) =>
        f.features.some((feat) => feat.$type === 'app.bsky.richtext.facet#mention')
      );

      expect(mentionFacet).toBeDefined();
      // "Hi " = 3 bytes, "@a.bsky.social" = 14 bytes
      expect(mentionFacet!.index.byteStart).toBe(3);
      expect(mentionFacet!.index.byteEnd).toBe(17);
    });
  });

  describe('US-085: Post Conversion', () => {
    it('should convert AT Protocol post to canonical format', () => {
      const atPost: ATProtoPost = {
        uri: 'at://did:plc:user123/app.bsky.feed.post/rkey456',
        cid: 'bafyrei...',
        author: {
          did: 'did:plc:user123',
          handle: 'user.bsky.social',
          displayName: 'Test User',
          followersCount: 100,
          followsCount: 50,
          postsCount: 200,
          indexedAt: new Date().toISOString(),
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'Hello Bluesky!',
          createdAt: '2024-01-15T12:00:00.000Z',
          langs: ['en'],
        },
        replyCount: 5,
        repostCount: 10,
        likeCount: 25,
        quoteCount: 2,
        indexedAt: new Date().toISOString(),
      };

      const canonical = atProtoToCanonical(atPost);

      expect(canonical.id).toBe(atPost.uri);
      expect(canonical.content).toBe('Hello Bluesky!');
      expect(canonical.created_at).toBe('2024-01-15T12:00:00.000Z');
      expect(canonical.author.id).toBe('did:plc:user123');
      expect(canonical.author.handle).toBe('user.bsky.social');
      expect(canonical.author.displayName).toBe('Test User');
      expect(canonical.metrics!.likes).toBe(25);
      expect(canonical.metrics!.reposts).toBe(10);
      expect(canonical.metrics!.replies).toBe(5);
      expect(canonical.metrics!.quotes).toBe(2);
      expect(canonical.language).toBe('en');
    });

    it('should convert AT Protocol post with images', () => {
      const atPost: ATProtoPost = {
        uri: 'at://did:plc:user123/app.bsky.feed.post/rkey456',
        cid: 'bafyrei...',
        author: {
          did: 'did:plc:user123',
          handle: 'user.bsky.social',
          followersCount: 100,
          followsCount: 50,
          postsCount: 200,
          indexedAt: new Date().toISOString(),
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'Post with image',
          createdAt: new Date().toISOString(),
        },
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [
            {
              thumb: 'https://cdn.bsky.app/thumb.jpg',
              fullsize: 'https://cdn.bsky.app/full.jpg',
              alt: 'Alt text',
              aspectRatio: { width: 800, height: 600 },
            },
          ],
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        quoteCount: 0,
        indexedAt: new Date().toISOString(),
      };

      const canonical = atProtoToCanonical(atPost);

      expect(canonical.media).toHaveLength(1);
      expect(canonical.media![0].type).toBe('image');
      expect(canonical.media![0].url).toBe('https://cdn.bsky.app/full.jpg');
      expect(canonical.media![0].alt_text).toBe('Alt text');
      expect(canonical.media![0].width).toBe(800);
      expect(canonical.media![0].height).toBe(600);
    });

    it('should handle reply posts', () => {
      const atPost: ATProtoPost = {
        uri: 'at://did:plc:user/app.bsky.feed.post/reply',
        cid: 'bafyrei...',
        author: {
          did: 'did:plc:user',
          handle: 'user.bsky.social',
          followersCount: 100,
          followsCount: 50,
          postsCount: 200,
          indexedAt: new Date().toISOString(),
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'This is a reply',
          createdAt: new Date().toISOString(),
          reply: {
            root: { uri: 'at://did:plc:other/app.bsky.feed.post/root', cid: 'cid1' },
            parent: { uri: 'at://did:plc:other/app.bsky.feed.post/parent', cid: 'cid2' },
          },
        },
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        quoteCount: 0,
        indexedAt: new Date().toISOString(),
      };

      const canonical = atProtoToCanonical(atPost);

      expect(canonical.reply_to).toBe('at://did:plc:other/app.bsky.feed.post/parent');
    });

    it('should include labels from moderation', () => {
      const atPost: ATProtoPost = {
        uri: 'at://did:plc:user/app.bsky.feed.post/labeled',
        cid: 'bafyrei...',
        author: {
          did: 'did:plc:user',
          handle: 'user.bsky.social',
          followersCount: 100,
          followsCount: 50,
          postsCount: 200,
          indexedAt: new Date().toISOString(),
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'Sensitive content',
          createdAt: new Date().toISOString(),
        },
        labels: [
          { src: 'did:plc:user', uri: 'at://...', val: 'nsfw', cts: new Date().toISOString() },
        ],
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        quoteCount: 0,
        indexedAt: new Date().toISOString(),
      };

      const canonical = atProtoToCanonical(atPost);

      expect(canonical.labels).toContain('nsfw');
    });
  });

  describe('US-085: Bluesky API Hooks', () => {
    it('should fetch profile by handle', async () => {
      const { result } = renderHook(() => useBlueskyProfile('user.bsky.social'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const profile = result.current.data!;
      expect(profile.handle).toBe('user.bsky.social');
      expect(profile.did).toMatch(/^did:plc:/);
      expect(profile).toHaveProperty('followersCount');
      expect(profile).toHaveProperty('followsCount');
      expect(profile).toHaveProperty('postsCount');
    });

    it('should fetch timeline', async () => {
      const { result } = renderHook(() => useBlueskyTimeline(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const timeline = result.current.data!;
      expect(timeline.feed).toBeDefined();
      expect(Array.isArray(timeline.feed)).toBe(true);
      expect(timeline.feed.length).toBeGreaterThan(0);
      expect(timeline.feed[0].post).toBeDefined();
    });

    it('should fetch single post by URI', async () => {
      const { result } = renderHook(
        () => useBlueskyPost('at://did:plc:example/app.bsky.feed.post/123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const post = result.current.data!;
      expect(post.uri).toBe('at://did:plc:example/app.bsky.feed.post/123');
      expect(post.record.text).toBeDefined();
    });

    it('should create a new post', async () => {
      const { result } = renderHook(() => useCreateBlueskyPost(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ content: 'Test post from unit test' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const mapping = result.current.data!;
      expect(mapping.platform).toBe('bluesky');
      expect(mapping.native_id).toMatch(/^at:\/\//);
      expect(mapping.url).toMatch(/^https:\/\/bsky\.app/);
      expect(mapping.status).toBe('synced');
    });

    it('should delete a post', async () => {
      const { result } = renderHook(() => useDeleteBlueskyPost(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('at://did:plc:user/app.bsky.feed.post/123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ success: true });
    });

    it('should like a post', async () => {
      const { result } = renderHook(() => useLikeBlueskyPost(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          uri: 'at://did:plc:user/app.bsky.feed.post/123',
          cid: 'bafyrei...',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should repost', async () => {
      const { result } = renderHook(() => useRepostBluesky(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          uri: 'at://did:plc:user/app.bsky.feed.post/123',
          cid: 'bafyrei...',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should fetch custom feeds', async () => {
      const { result } = renderHook(() => useBlueskyFeeds(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const feeds = result.current.data!;
      expect(Array.isArray(feeds)).toBe(true);
      expect(feeds.length).toBeGreaterThan(0);
      expect(feeds[0]).toHaveProperty('displayName');
      expect(feeds[0]).toHaveProperty('uri');
    });
  });
});
