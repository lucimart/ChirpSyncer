import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost, PlatformMapping } from './connectors';

// Mastodon OAuth2 Types

export interface MastodonInstance {
  uri: string;
  title: string;
  shortDescription: string;
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
  displayName: string;
  locked: boolean;
  bot: boolean;
  createdAt: string;
  note: string;
  url: string;
  avatar: string;
  header: string;
  followersCount: number;
  followingCount: number;
  statusesCount: number;
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
  createdAt: string;
  inReplyToId?: string;
  sensitive: boolean;
  spoilerText: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  language?: string;
  uri: string;
  url?: string;
  repliesCount: number;
  reblogsCount: number;
  favouritesCount: number;
  editedAt?: string;
  content: string;
  reblog?: MastodonStatus;
  account: MastodonAccount;
  mediaAttachments: MastodonMediaAttachment[];
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
  previewUrl?: string;
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

export interface MastodonTimeline {
  statuses: MastodonStatus[];
}

// Utility Functions

export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: simple regex strip
    return html.replace(/<[^>]*>/g, '');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function mastodonToCanonical(status: MastodonStatus): CanonicalPost {
  return {
    id: status.id,
    content: stripHtml(status.content),
    created_at: status.createdAt,
    author: {
      id: status.account.id,
      handle: status.account.acct,
      displayName: status.account.displayName || status.account.username,
      avatar: status.account.avatar,
    },
    media: status.mediaAttachments.map((m) => ({
      type: m.type === 'gifv' ? 'gif' as const : m.type === 'video' ? 'video' as const : 'image' as const,
      url: m.url,
      alt_text: m.description,
      width: m.meta?.original?.width,
      height: m.meta?.original?.height,
    })),
    metrics: {
      likes: status.favouritesCount,
      reposts: status.reblogsCount,
      replies: status.repliesCount,
      quotes: 0,
    },
    reply_to: status.inReplyToId || undefined,
    language: status.language || undefined,
  };
}

// API Client wrapper for Mastodon endpoints
class MastodonApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/mastodon${endpoint}`, {
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

  async getInstance(): Promise<MastodonInstance> {
    return this.request('/instance');
  }

  async getHomeTimeline(maxId?: string, limit = 40): Promise<MastodonTimeline> {
    const params = new URLSearchParams();
    if (maxId) params.set('max_id', maxId);
    params.set('limit', String(limit));
    return this.request(`/timeline/home?${params.toString()}`);
  }

  async getPublicTimeline(maxId?: string, limit = 40, local = false): Promise<MastodonTimeline> {
    const params = new URLSearchParams();
    if (maxId) params.set('max_id', maxId);
    params.set('limit', String(limit));
    params.set('local', String(local));
    return this.request(`/timeline/public?${params.toString()}`);
  }

  async getStatus(statusId: string): Promise<MastodonStatus> {
    return this.request(`/status/${statusId}`);
  }

  async createStatus(params: {
    status: string;
    visibility?: string;
    in_reply_to_id?: string;
    sensitive?: boolean;
    spoiler_text?: string;
  }): Promise<MastodonStatus> {
    return this.request('/status', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteStatus(statusId: string): Promise<{ deleted: boolean }> {
    return this.request(`/status/${statusId}`, { method: 'DELETE' });
  }

  async favouriteStatus(statusId: string): Promise<MastodonStatus> {
    return this.request(`/status/${statusId}/favourite`, { method: 'POST' });
  }

  async unfavouriteStatus(statusId: string): Promise<MastodonStatus> {
    return this.request(`/status/${statusId}/unfavourite`, { method: 'POST' });
  }

  async reblogStatus(statusId: string): Promise<MastodonStatus> {
    return this.request(`/status/${statusId}/reblog`, { method: 'POST' });
  }

  async unreblogStatus(statusId: string): Promise<MastodonStatus> {
    return this.request(`/status/${statusId}/unreblog`, { method: 'POST' });
  }

  async getAccount(accountId: string): Promise<MastodonAccount> {
    return this.request(`/account/${accountId}`);
  }

  async getAccountStatuses(accountId: string, maxId?: string, limit = 40): Promise<MastodonTimeline> {
    const params = new URLSearchParams();
    if (maxId) params.set('max_id', maxId);
    params.set('limit', String(limit));
    return this.request(`/account/${accountId}/statuses?${params.toString()}`);
  }

  async verifyCredentials(): Promise<MastodonAccount> {
    return this.request('/verify_credentials');
  }
}

export const mastodonApi = new MastodonApiClient();

// Hooks

export function useMastodonInstance() {
  return useQuery<MastodonInstance>({
    queryKey: ['mastodon-instance'],
    queryFn: () => mastodonApi.getInstance(),
  });
}

export function useMastodonTimeline(maxId?: string) {
  return useQuery<MastodonTimeline>({
    queryKey: ['mastodon-timeline', maxId],
    queryFn: () => mastodonApi.getHomeTimeline(maxId),
  });
}

export function useMastodonPublicTimeline(maxId?: string, local = false) {
  return useQuery<MastodonTimeline>({
    queryKey: ['mastodon-public-timeline', maxId, local],
    queryFn: () => mastodonApi.getPublicTimeline(maxId, 40, local),
  });
}

export function useMastodonStatus(statusId?: string) {
  return useQuery<MastodonStatus>({
    queryKey: ['mastodon-status', statusId],
    queryFn: () => mastodonApi.getStatus(statusId!),
    enabled: !!statusId,
  });
}

export function useCreateMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { status: string; visibility?: string }): Promise<PlatformMapping> => {
      const status = await mastodonApi.createStatus(params);
      return {
        platform: 'mastodon',
        native_id: status.id,
        url: status.url || status.uri,
        status: 'synced',
        synced_at: new Date().toISOString(),
      };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useDeleteMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => mastodonApi.deleteStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useFavouriteMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => mastodonApi.favouriteStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useUnfavouriteMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => mastodonApi.unfavouriteStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useBoostMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => mastodonApi.reblogStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useUnboostMastodonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => mastodonApi.unreblogStatus(statusId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mastodon-timeline'] }),
  });
}

export function useMastodonAccount(accountId?: string) {
  return useQuery<MastodonAccount>({
    queryKey: ['mastodon-account', accountId],
    queryFn: () => mastodonApi.getAccount(accountId!),
    enabled: !!accountId,
  });
}

export function useMastodonAccountStatuses(accountId?: string, maxId?: string) {
  return useQuery<MastodonTimeline>({
    queryKey: ['mastodon-account-statuses', accountId, maxId],
    queryFn: () => mastodonApi.getAccountStatuses(accountId!, maxId),
    enabled: !!accountId,
  });
}

export function useMastodonCurrentUser() {
  return useQuery<MastodonAccount>({
    queryKey: ['mastodon-current-user'],
    queryFn: () => mastodonApi.verifyCredentials(),
  });
}
