import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost, PlatformMapping } from './connectors';

// Mastodon OAuth2 Types

export interface MastodonInstance {
  uri: string;
  title: string;
  short_description: string;
  description: string;
  email: string;
  version: string;
  urls: { streaming_api: string };
  stats: { user_count: number; status_count: number; domain_count: number };
  thumbnail?: string;
  languages: string[];
  registrations: boolean;
  approval_required: boolean;
  invites_enabled: boolean;
  configuration: MastodonConfiguration;
  rules: MastodonRule[];
}

export interface MastodonConfiguration {
  statuses: { max_characters: number; max_media_attachments: number; characters_reserved_per_url: number };
  media_attachments: { supported_mime_types: string[]; image_size_limit: number; video_size_limit: number };
  polls: { max_options: number; max_characters_per_option: number; min_expiration: number; max_expiration: number };
}

export interface MastodonRule {
  id: string;
  text: string;
}

export interface MastodonOAuthApp {
  id: string;
  name: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}

export interface MastodonOAuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  created_at: number;
}

export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  locked: boolean;
  bot: boolean;
  created_at: string;
  note: string;
  url: string;
  avatar: string;
  header: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
  emojis: MastodonEmoji[];
  fields: MastodonField[];
}

export interface MastodonEmoji {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker: boolean;
}

export interface MastodonField {
  name: string;
  value: string;
  verified_at?: string;
}

export interface MastodonStatus {
  id: string;
  created_at: string;
  in_reply_to_id?: string;
  sensitive: boolean;
  spoiler_text: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  language?: string;
  uri: string;
  url?: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  edited_at?: string;
  content: string;
  reblog?: MastodonStatus;
  account: MastodonAccount;
  media_attachments: MastodonMediaAttachment[];
  mentions: MastodonMention[];
  tags: MastodonTag[];
  emojis: MastodonEmoji[];
  card?: MastodonPreviewCard;
  poll?: MastodonPoll;
  favourited?: boolean;
  reblogged?: boolean;
  bookmarked?: boolean;
}

export interface MastodonMediaAttachment {
  id: string;
  type: 'unknown' | 'image' | 'gifv' | 'video' | 'audio';
  url: string;
  preview_url?: string;
  description?: string;
  meta?: { original?: { width: number; height: number; duration?: number } };
}

export interface MastodonMention {
  id: string;
  username: string;
  url: string;
  acct: string;
}

export interface MastodonTag {
  name: string;
  url: string;
}

export interface MastodonPreviewCard {
  url: string;
  title: string;
  description: string;
  type: 'link' | 'photo' | 'video' | 'rich';
  image?: string;
}

export interface MastodonPoll {
  id: string;
  expires_at?: string;
  expired: boolean;
  multiple: boolean;
  votes_count: number;
  options: { title: string; votes_count?: number }[];
}

// Utility Functions

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function mastodonToCanonical(status: MastodonStatus): CanonicalPost {
  return {
    id: status.id,
    content: stripHtml(status.content),
    created_at: status.created_at,
    author: {
      id: status.account.id,
      handle: status.account.acct,
      displayName: status.account.display_name || status.account.username,
      avatar: status.account.avatar,
    },
    media: status.media_attachments.map((m) => ({
      type: m.type === 'gifv' ? 'gif' as const : m.type === 'video' ? 'video' as const : 'image' as const,
      url: m.url,
      alt_text: m.description,
      width: m.meta?.original?.width,
      height: m.meta?.original?.height,
    })),
    metrics: {
      likes: status.favourites_count,
      reposts: status.reblogs_count,
      replies: status.replies_count,
      quotes: 0,
    },
    reply_to: status.in_reply_to_id || undefined,
    language: status.language || undefined,
  };
}

// Hooks

export function useMastodonInstance(instanceUrl?: string) {
  return useQuery<MastodonInstance>({
    queryKey: ['mastodon-instance', instanceUrl],
    queryFn: async () => ({
      uri: instanceUrl || 'mastodon.social',
      title: 'Mastodon',
      short_description: 'A decentralized social network',
      description: 'The original Mastodon server',
      email: 'admin@mastodon.social',
      version: '4.2.0',
      urls: { streaming_api: 'wss://mastodon.social' },
      stats: { user_count: 1500000, status_count: 50000000, domain_count: 25000 },
      languages: ['en'],
      registrations: true,
      approval_required: false,
      invites_enabled: true,
      configuration: {
        statuses: { max_characters: 500, max_media_attachments: 4, characters_reserved_per_url: 23 },
        media_attachments: { supported_mime_types: ['image/jpeg', 'image/png', 'video/mp4'], image_size_limit: 10485760, video_size_limit: 41943040 },
        polls: { max_options: 4, max_characters_per_option: 50, min_expiration: 300, max_expiration: 2629746 },
      },
      rules: [{ id: '1', text: 'Be respectful' }],
    }),
    enabled: !!instanceUrl,
  });
}

export function useMastodonTimeline() {
  return useQuery<{ statuses: MastodonStatus[] }>({
    queryKey: ['mastodon-timeline'],
    queryFn: async () => ({
      statuses: Array.from({ length: 20 }, (_, i) => ({
        id: `status-${i}`,
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        sensitive: false,
        spoiler_text: '',
        visibility: 'public' as const,
        language: 'en',
        uri: `https://mastodon.social/users/user/statuses/${i}`,
        url: `https://mastodon.social/@user/${i}`,
        replies_count: Math.floor(Math.random() * 10),
        reblogs_count: Math.floor(Math.random() * 20),
        favourites_count: Math.floor(Math.random() * 50),
        content: `<p>Mastodon post ${i + 1}</p>`,
        account: {
          id: 'user-1', username: 'user', acct: 'user@mastodon.social', display_name: 'User',
          locked: false, bot: false, created_at: '2023-01-01T00:00:00.000Z', note: '',
          url: 'https://mastodon.social/@user', avatar: '', header: '',
          followers_count: 100, following_count: 50, statuses_count: 500, emojis: [], fields: [],
        },
        media_attachments: [], mentions: [], tags: [], emojis: [],
      })),
    }),
  });
}

export function useCreateMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { status: string; visibility?: string }): Promise<PlatformMapping> => {
      await new Promise((r) => setTimeout(r, 500));
      const id = Date.now().toString();
      return { platform: 'mastodon', native_id: id, url: `https://mastodon.social/@user/${id}`, status: 'synced', synced_at: new Date().toISOString() };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useDeleteMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => { await new Promise((r) => setTimeout(r, 300)); return { success: true }; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useFavouriteMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => { await new Promise((r) => setTimeout(r, 200)); return { success: true }; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useBoostMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => { await new Promise((r) => setTimeout(r, 200)); return { success: true }; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}
