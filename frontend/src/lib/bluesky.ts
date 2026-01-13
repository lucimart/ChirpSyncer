import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function getPostUrl(handle: string, rkey: string): string {
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
  const parsed = parseATUri(post.uri);

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

// Hooks

export function useBlueskyProfile(handle?: string) {
  return useQuery<ATProtoProfile>({
    queryKey: ['bluesky-profile', handle],
    queryFn: async () => {
      // Mock profile
      return {
        did: 'did:plc:example123',
        handle: handle || 'user.bsky.social',
        displayName: 'Example User',
        description: 'A Bluesky user',
        avatar: undefined,
        banner: undefined,
        followersCount: 150,
        followsCount: 75,
        postsCount: 320,
        indexedAt: new Date().toISOString(),
      };
    },
    enabled: !!handle,
  });
}

export function useBlueskyTimeline(cursor?: string) {
  return useQuery<BlueskyTimeline>({
    queryKey: ['bluesky-timeline', cursor],
    queryFn: async () => {
      // Mock timeline
      return {
        cursor: 'next-cursor',
        feed: Array.from({ length: 20 }, (_, i) => ({
          post: {
            uri: `at://did:plc:example/app.bsky.feed.post/${i}`,
            cid: `cid-${i}`,
            author: {
              did: 'did:plc:example',
              handle: 'user.bsky.social',
              displayName: 'Example User',
              followersCount: 100,
              followsCount: 50,
              postsCount: 200,
              indexedAt: new Date().toISOString(),
            },
            record: {
              $type: 'app.bsky.feed.post' as const,
              text: `This is post number ${i + 1} from the timeline`,
              createdAt: new Date(Date.now() - i * 3600000).toISOString(),
            },
            replyCount: Math.floor(Math.random() * 10),
            repostCount: Math.floor(Math.random() * 20),
            likeCount: Math.floor(Math.random() * 50),
            quoteCount: Math.floor(Math.random() * 5),
            indexedAt: new Date(Date.now() - i * 3600000).toISOString(),
          },
        })),
      };
    },
  });
}

export function useBlueskyPost(uri?: string) {
  return useQuery<ATProtoPost>({
    queryKey: ['bluesky-post', uri],
    queryFn: async () => {
      const parsed = parseATUri(uri!);
      return {
        uri: uri!,
        cid: 'example-cid',
        author: {
          did: parsed?.repo || 'did:plc:example',
          handle: 'user.bsky.social',
          displayName: 'Example User',
          followersCount: 100,
          followsCount: 50,
          postsCount: 200,
          indexedAt: new Date().toISOString(),
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'This is an example Bluesky post',
          createdAt: new Date().toISOString(),
        },
        replyCount: 5,
        repostCount: 10,
        likeCount: 25,
        quoteCount: 2,
        indexedAt: new Date().toISOString(),
      };
    },
    enabled: !!uri,
  });
}

export function useResolveDID() {
  return useMutation({
    mutationFn: async (identifier: string): Promise<ATProtoDID> => {
      // Mock DID resolution
      await new Promise((resolve) => setTimeout(resolve, 300));

      const isHandle = !identifier.startsWith('did:');
      return {
        did: isHandle ? `did:plc:${identifier.replace(/\./g, '')}` : identifier,
        handle: isHandle ? identifier : `${identifier.slice(-8)}.bsky.social`,
        pds: 'https://bsky.social',
        resolved_at: new Date().toISOString(),
      };
    },
  });
}

export function useCreateBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Partial<CanonicalPost>): Promise<PlatformMapping> => {
      // Mock post creation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const rkey = Date.now().toString(36);
      return {
        platform: 'bluesky',
        native_id: `at://did:plc:user/app.bsky.feed.post/${rkey}`,
        url: `https://bsky.app/profile/user.bsky.social/post/${rkey}`,
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
    mutationFn: async (uri: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useLikeBlueskyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, cid }: { uri: string; cid: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bluesky-timeline'] });
    },
  });
}

export function useRepostBluesky() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, cid }: { uri: string; cid: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { success: true };
    },
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
      // Mock popular feeds
      return [
        {
          uri: 'at://did:plc:feed1/app.bsky.feed.generator/whats-hot',
          cid: 'feed-cid-1',
          did: 'did:plc:feed1',
          creator: {
            did: 'did:plc:bsky',
            handle: 'bsky.app',
            displayName: 'Bluesky',
            followersCount: 1000000,
            followsCount: 0,
            postsCount: 500,
            indexedAt: new Date().toISOString(),
          },
          displayName: "What's Hot",
          description: 'Top trending posts on Bluesky',
          likeCount: 50000,
          indexedAt: new Date().toISOString(),
        },
        {
          uri: 'at://did:plc:feed2/app.bsky.feed.generator/discover',
          cid: 'feed-cid-2',
          did: 'did:plc:feed2',
          creator: {
            did: 'did:plc:bsky',
            handle: 'bsky.app',
            displayName: 'Bluesky',
            followersCount: 1000000,
            followsCount: 0,
            postsCount: 500,
            indexedAt: new Date().toISOString(),
          },
          displayName: 'Discover',
          description: 'Discover new accounts and posts',
          likeCount: 35000,
          indexedAt: new Date().toISOString(),
        },
      ];
    },
  });
}
