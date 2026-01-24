import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { CanonicalPost, PlatformMapping } from './connectors';

// AT Protocol Types

export interface ATProtoDID {
  did: string;
  handle: string;
  pds: string;
  resolved_at: string;
}

export interface ATProtoSession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  pds_url: string;
  created_at: string;
  expires_at: string;
}

export interface ATProtoProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  indexedAt: string;
  labels?: ATProtoLabel[];
}

export interface ATProtoLabel {
  src: string;
  uri: string;
  val: string;
  neg?: boolean;
  cts: string;
}

export interface ATProtoPost {
  uri: string;
  cid: string;
  author: ATProtoProfile;
  record: ATProtoPostRecord;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  indexedAt: string;
  labels?: ATProtoLabel[];
  embed?: ATProtoEmbed;
}

export interface ATProtoPostRecord {
  $type: 'app.bsky.feed.post';
  text: string;
  createdAt: string;
  langs?: string[];
  facets?: ATProtoFacet[];
  reply?: ATProtoReplyRef;
  embed?: ATProtoEmbedRecord;
}

export interface ATProtoFacet {
  index: { byteStart: number; byteEnd: number };
  features: ATProtoFacetFeature[];
}

export type ATProtoFacetFeature =
  | { $type: 'app.bsky.richtext.facet#mention'; did: string }
  | { $type: 'app.bsky.richtext.facet#link'; uri: string }
  | { $type: 'app.bsky.richtext.facet#tag'; tag: string };

export interface ATProtoReplyRef {
  root: { uri: string; cid: string };
  parent: { uri: string; cid: string };
}

export interface ATProtoEmbedRecord {
  $type: string;
  images?: ATProtoImage[];
  external?: ATProtoExternal;
  record?: { uri: string; cid: string };
}

export interface ATProtoEmbed {
  $type: string;
  images?: ATProtoImageView[];
  external?: ATProtoExternalView;
  record?: ATProtoRecordView;
}

export interface ATProtoImage {
  alt: string;
  image: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
  aspectRatio?: { width: number; height: number };
}

export interface ATProtoImageView {
  thumb: string;
  fullsize: string;
  alt: string;
  aspectRatio?: { width: number; height: number };
}

export interface ATProtoExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
}

export interface ATProtoExternalView {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface ATProtoRecordView {
  $type: string;
  uri: string;
  cid: string;
  author: ATProtoProfile;
  value: ATProtoPostRecord;
  indexedAt: string;
}

// DID Resolution

export interface DIDDocument {
  id: string;
  alsoKnownAs: string[];
  verificationMethod: DIDVerificationMethod[];
  service: DIDService[];
}

export interface DIDVerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
}

export interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export type DIDMethod = 'plc' | 'web';

// Bluesky Feed Types

export interface BlueskyFeed {
  uri: string;
  cid: string;
  did: string;
  creator: ATProtoProfile;
  displayName: string;
  description?: string;
  avatar?: string;
  likeCount: number;
  indexedAt: string;
}

export interface BlueskyTimeline {
  cursor?: string;
  feed: BlueskyFeedItem[];
}

export interface BlueskyFeedItem {
  post: ATProtoPost;
  reply?: {
    root: ATProtoPost;
    parent: ATProtoPost;
  };
  reason?: BlueskyFeedReason;
}

export type BlueskyFeedReason = {
  $type: 'app.bsky.feed.defs#reasonRepost';
  by: ATProtoProfile;
  indexedAt: string;
};

// Utility Functions

export function parseATUri(uri: string): { repo: string; collection: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { repo: match[1], collection: match[2], rkey: match[3] };
}

export function buildATUri(repo: string, collection: string, rkey: string): string {
  return `at://${repo}/${collection}/${rkey}`;
}

export function getPostUrl(handle: string, uri: string): string {
  const parsed = parseATUri(uri);
  const rkey = parsed?.rkey || uri.split('/').pop() || '';
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

export function getProfileUrl(handle: string): string {
  return `https://bsky.app/profile/${handle}`;
}

export function getDIDMethod(did: string): DIDMethod | null {
  if (did.startsWith('did:plc:')) return 'plc';
  if (did.startsWith('did:web:')) return 'web';
  return null;
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/g;
  return (text.match(mentionRegex) || []).map((m) => m.slice(1));
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[a-zA-Z][a-zA-Z0-9_]*/g;
  return (text.match(hashtagRegex) || []).map((h) => h.slice(1));
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>[\]()]+/g;
  return text.match(urlRegex) || [];
}

// Convert AT Protocol post to Canonical format
export function atProtoToCanonical(post: ATProtoPost): CanonicalPost {
  return {
    id: post.uri,
    content: post.record.text,
    created_at: post.record.createdAt,
    author: {
      id: post.author.did,
      handle: post.author.handle,
      displayName: post.author.displayName || post.author.handle,
      avatar: post.author.avatar,
    },
    media: post.embed?.images?.map((img) => ({
      type: 'image' as const,
      url: img.fullsize,
      alt_text: img.alt,
      width: img.aspectRatio?.width,
      height: img.aspectRatio?.height,
    })),
    metrics: {
      likes: post.likeCount,
      reposts: post.repostCount,
      replies: post.replyCount,
      quotes: post.quoteCount,
    },
    reply_to: post.record.reply?.parent.uri,
    language: post.record.langs?.[0],
    labels: post.labels?.map((l) => l.val),
  };
}

// Convert Canonical post to AT Protocol record
export function canonicalToATProto(post: Partial<CanonicalPost>): Partial<ATProtoPostRecord> {
  const text = post.content || '';
  const facets: ATProtoFacet[] = [];

  // Extract mentions
  const mentions = extractMentions(text);
  mentions.forEach((handle) => {
    const start = text.indexOf(`@${handle}`);
    if (start !== -1) {
      facets.push({
        index: {
          byteStart: new TextEncoder().encode(text.slice(0, start)).length,
          byteEnd: new TextEncoder().encode(text.slice(0, start + handle.length + 1)).length,
        },
        features: [{ $type: 'app.bsky.richtext.facet#mention', did: '' }], // DID needs resolution
      });
    }
  });

  // Extract URLs
  const urls = extractUrls(text);
  urls.forEach((url) => {
    const start = text.indexOf(url);
    if (start !== -1) {
      facets.push({
        index: {
          byteStart: new TextEncoder().encode(text.slice(0, start)).length,
          byteEnd: new TextEncoder().encode(text.slice(0, start + url.length)).length,
        },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
      });
    }
  });

  // Extract hashtags
  const hashtags = extractHashtags(text);
  hashtags.forEach((tag) => {
    const start = text.indexOf(`#${tag}`);
    if (start !== -1) {
      facets.push({
        index: {
          byteStart: new TextEncoder().encode(text.slice(0, start)).length,
          byteEnd: new TextEncoder().encode(text.slice(0, start + tag.length + 1)).length,
        },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag }],
      });
    }
  });

  return {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: post.created_at || new Date().toISOString(),
    langs: post.language ? [post.language] : undefined,
    facets: facets.length > 0 ? facets : undefined,
  };
}

// API Client wrapper for Bluesky endpoints
class BlueskyApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/bluesky${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;
  }

  async getProfile(handle: string): Promise<ATProtoProfile> {
    return this.request(`/profile/${encodeURIComponent(handle)}`);
  }

  async getTimeline(cursor?: string, limit = 50): Promise<BlueskyTimeline> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    return this.request(`/timeline?${params.toString()}`);
  }

  async getPost(uri: string): Promise<ATProtoPost> {
    return this.request(`/post/${encodeURIComponent(uri)}`);
  }

  async createPost(text: string, replyTo?: { uri: string; cid: string }): Promise<{ uri: string; cid: string }> {
    return this.request('/post', {
      method: 'POST',
      body: JSON.stringify({ text, reply_to: replyTo }),
    });
  }

  async deletePost(uri: string): Promise<{ deleted: boolean }> {
    return this.request(`/post/${encodeURIComponent(uri)}`, { method: 'DELETE' });
  }

  async like(uri: string, cid: string): Promise<{ uri: string }> {
    return this.request('/like', {
      method: 'POST',
      body: JSON.stringify({ uri, cid }),
    });
  }

  async unlike(likeUri: string): Promise<{ deleted: boolean }> {
    return this.request('/unlike', {
      method: 'POST',
      body: JSON.stringify({ like_uri: likeUri }),
    });
  }

  async repost(uri: string, cid: string): Promise<{ uri: string }> {
    return this.request('/repost', {
      method: 'POST',
      body: JSON.stringify({ uri, cid }),
    });
  }

  async unrepost(repostUri: string): Promise<{ deleted: boolean }> {
    return this.request('/unrepost', {
      method: 'POST',
      body: JSON.stringify({ repost_uri: repostUri }),
    });
  }

  async resolveHandle(identifier: string): Promise<ATProtoDID> {
    return this.request(`/resolve/${encodeURIComponent(identifier)}`);
  }

  async getPopularFeeds(limit = 25, cursor?: string): Promise<{ cursor?: string; feeds: BlueskyFeed[] }> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    return this.request(`/feeds/popular?${params.toString()}`);
  }

  async getAuthorFeed(handle: string, cursor?: string, limit = 50): Promise<BlueskyTimeline> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    return this.request(`/author/${encodeURIComponent(handle)}/feed?${params.toString()}`);
  }
}

export const blueskyApi = new BlueskyApiClient();

// Hooks

export function useBlueskyProfile(handle?: string) {
  return useQuery<ATProtoProfile>({
    queryKey: ['bluesky-profile', handle],
    queryFn: () => blueskyApi.getProfile(handle!),
    enabled: !!handle,
  });
}

export function useBlueskyTimeline(cursor?: string) {
  return useQuery<BlueskyTimeline>({
    queryKey: ['bluesky-timeline', cursor],
    queryFn: () => blueskyApi.getTimeline(cursor),
  });
}

export function useBlueskyPost(uri?: string) {
  return useQuery<ATProtoPost>({
    queryKey: ['bluesky-post', uri],
    queryFn: () => blueskyApi.getPost(uri!),
    enabled: !!uri,
  });
}

export function useResolveDID() {
  return useMutation({
    mutationFn: (identifier: string) => blueskyApi.resolveHandle(identifier),
  });
}

export function useCreateBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Partial<CanonicalPost>): Promise<PlatformMapping> => {
      const response = await blueskyApi.createPost(post.content || '');
      // Extract DID from URI (at://did:plc:xxx/app.bsky.feed.post/rkey)
      const parsed = parseATUri(response.uri);
      const did = parsed?.repo || 'unknown';
      return {
        platform: 'bluesky',
        native_id: response.uri,
        url: getPostUrl(did, response.uri),
        status: 'synced',
        synced_at: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useDeleteBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uri: string) => blueskyApi.deletePost(uri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useLikeBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri, cid }: { uri: string; cid: string }) => blueskyApi.like(uri, cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useUnlikeBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (likeUri: string) => blueskyApi.unlike(likeUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useRepostBluesky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uri, cid }: { uri: string; cid: string }) => blueskyApi.repost(uri, cid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useUnrepostBluesky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repostUri: string) => blueskyApi.unrepost(repostUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

// Custom Feed Hooks

export function useBlueskyFeeds() {
  return useQuery<BlueskyFeed[]>({
    queryKey: ['bluesky-feeds'],
    queryFn: async () => {
      const response = await blueskyApi.getPopularFeeds();
      return response.feeds;
    },
  });
}

export function useBlueskyAuthorFeed(handle?: string, cursor?: string) {
  return useQuery<BlueskyTimeline>({
    queryKey: ['bluesky-author-feed', handle, cursor],
    queryFn: () => blueskyApi.getAuthorFeed(handle!, cursor),
    enabled: !!handle,
  });
}
