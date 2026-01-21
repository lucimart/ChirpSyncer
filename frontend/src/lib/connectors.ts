import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Platform capability flags - what each platform can do
export interface PlatformCapabilities {
  publish: boolean;
  delete: boolean;
  edit: boolean;
  read: boolean;
  metrics: boolean;
  schedule: boolean;
  threads: boolean;
  media: {
    images: boolean;
    videos: boolean;
    gifs: boolean;
    maxImages: number;
  };
  interactions: {
    like: boolean;
    repost: boolean;
    reply: boolean;
    quote: boolean;
    bookmark: boolean;
  };
  characterLimit: number;
  altTextLimit: number;
}

// Canonical post format - platform-agnostic
export interface CanonicalPost {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    handle: string;
    displayName: string;
    avatar?: string;
  };
  media?: CanonicalMedia[];
  metrics?: PostMetrics;
  reply_to?: string;
  quote_of?: string;
  thread_id?: string;
  language?: string;
  labels?: string[];
}

export interface CanonicalMedia {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt_text?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
}

export interface PostMetrics {
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  views?: number;
  bookmarks?: number;
}

// Network post mapping - tracks a canonical post across platforms
export interface NetworkPostMapping {
  canonical_id: string;
  platform_mappings: PlatformMapping[];
  created_at: string;
  last_synced: string;
}

export interface PlatformMapping {
  platform: PlatformType;
  native_id: string;
  url: string;
  status: 'synced' | 'pending' | 'failed' | 'deleted';
  error?: string;
  synced_at?: string;
}

// Supported platforms
export type PlatformType = 'twitter' | 'bluesky' | 'mastodon' | 'instagram';

// Platform connector configuration
export interface PlatformConnector {
  id: string;
  platform: PlatformType;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: PlatformCapabilities;
  auth_type: 'oauth2' | 'api_key' | 'session' | 'atproto';
  status: 'available' | 'coming_soon' | 'beta';
}

// Connection status for a user's platform
export interface PlatformConnection {
  id: string;
  platform: PlatformType;
  connected: boolean;
  handle?: string;
  display_name?: string;
  avatar?: string;
  last_sync?: string;
  sync_enabled: boolean;
  capabilities_used: (keyof PlatformCapabilities)[];
  error?: string;
}

// Sync configuration per platform
export interface PlatformSyncConfig {
  platform: PlatformType;
  enabled: boolean;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  filters: {
    include_replies: boolean;
    include_reposts: boolean;
    include_quotes: boolean;
    min_engagement?: number;
    exclude_patterns?: string[];
  };
  transform: {
    add_source_link: boolean;
    preserve_mentions: boolean;
    preserve_hashtags: boolean;
    truncate_strategy: 'smart' | 'cut' | 'thread';
  };
}

// Default capabilities for each platform
export const PLATFORM_DEFAULTS: Record<PlatformType, PlatformCapabilities> = {
  twitter: {
    publish: true,
    delete: true,
    edit: false,
    read: true,
    metrics: true,
    schedule: true,
    threads: true,
    media: {
      images: true,
      videos: true,
      gifs: true,
      maxImages: 4,
    },
    interactions: {
      like: true,
      repost: true,
      reply: true,
      quote: true,
      bookmark: true,
    },
    characterLimit: 280,
    altTextLimit: 1000,
  },
  bluesky: {
    publish: true,
    delete: true,
    edit: false,
    read: true,
    metrics: true,
    schedule: false,
    threads: true,
    media: {
      images: true,
      videos: false,
      gifs: false,
      maxImages: 4,
    },
    interactions: {
      like: true,
      repost: true,
      reply: true,
      quote: true,
      bookmark: false,
    },
    characterLimit: 300,
    altTextLimit: 2000,
  },
  mastodon: {
    publish: true,
    delete: true,
    edit: true,
    read: true,
    metrics: true,
    schedule: true,
    threads: true,
    media: {
      images: true,
      videos: true,
      gifs: true,
      maxImages: 4,
    },
    interactions: {
      like: true,
      repost: true,
      reply: true,
      quote: false,
      bookmark: true,
    },
    characterLimit: 500,
    altTextLimit: 1500,
  },
  instagram: {
    publish: false, // Requires Business account
    delete: false,
    edit: false,
    read: true,
    metrics: true,
    schedule: false,
    threads: false,
    media: {
      images: true,
      videos: true,
      gifs: false,
      maxImages: 10,
    },
    interactions: {
      like: false,
      repost: false,
      reply: false,
      quote: false,
      bookmark: false,
    },
    characterLimit: 2200,
    altTextLimit: 100,
  },
};

// Available connectors
export const AVAILABLE_CONNECTORS: PlatformConnector[] = [
  {
    id: 'twitter',
    platform: 'twitter',
    name: 'Twitter / X',
    description: 'Connect your Twitter account to sync tweets',
    icon: 'T',
    color: '#1DA1F2',
    capabilities: PLATFORM_DEFAULTS.twitter,
    auth_type: 'session',
    status: 'available',
  },
  {
    id: 'bluesky',
    platform: 'bluesky',
    name: 'Bluesky',
    description: 'Connect your Bluesky account via AT Protocol',
    icon: 'B',
    color: '#0085FF',
    capabilities: PLATFORM_DEFAULTS.bluesky,
    auth_type: 'atproto',
    status: 'available',
  },
  {
    id: 'mastodon',
    platform: 'mastodon',
    name: 'Mastodon',
    description: 'Connect to any Mastodon instance',
    icon: 'M',
    color: '#6364FF',
    capabilities: PLATFORM_DEFAULTS.mastodon,
    auth_type: 'oauth2',
    status: 'coming_soon',
  },
  {
    id: 'instagram',
    platform: 'instagram',
    name: 'Instagram',
    description: 'Read-only access to your Instagram posts',
    icon: 'I',
    color: '#E4405F',
    capabilities: PLATFORM_DEFAULTS.instagram,
    auth_type: 'oauth2',
    status: 'coming_soon',
  },
];

// Hooks

export function useConnectors() {
  return useQuery<PlatformConnector[]>({
    queryKey: ['connectors'],
    queryFn: async () => {
      // Return available connectors
      return AVAILABLE_CONNECTORS;
    },
    staleTime: Infinity, // Static data
  });
}

export function useConnections() {
  return useQuery<PlatformConnection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      // Mock connected platforms
      return [
        {
          id: 'conn-1',
          platform: 'twitter' as PlatformType,
          connected: true,
          handle: '@chirpsyncer',
          display_name: 'ChirpSyncer',
          avatar: undefined,
          last_sync: new Date().toISOString(),
          sync_enabled: true,
          capabilities_used: ['publish', 'delete', 'read', 'metrics'],
        },
        {
          id: 'conn-2',
          platform: 'bluesky' as PlatformType,
          connected: true,
          handle: 'chirpsyncer.bsky.social',
          display_name: 'ChirpSyncer',
          avatar: undefined,
          last_sync: new Date(Date.now() - 3600000).toISOString(),
          sync_enabled: true,
          capabilities_used: ['publish', 'delete', 'read'],
        },
      ];
    },
  });
}

export function useSyncConfigs() {
  return useQuery<PlatformSyncConfig[]>({
    queryKey: ['sync-configs'],
    queryFn: async () => {
      return [
        {
          platform: 'twitter' as PlatformType,
          enabled: true,
          direction: 'bidirectional',
          filters: {
            include_replies: false,
            include_reposts: false,
            include_quotes: true,
          },
          transform: {
            add_source_link: true,
            preserve_mentions: true,
            preserve_hashtags: true,
            truncate_strategy: 'smart',
          },
        },
        {
          platform: 'bluesky' as PlatformType,
          enabled: true,
          direction: 'bidirectional',
          filters: {
            include_replies: false,
            include_reposts: false,
            include_quotes: true,
          },
          transform: {
            add_source_link: true,
            preserve_mentions: true,
            preserve_hashtags: true,
            truncate_strategy: 'thread',
          },
        },
      ];
    },
  });
}

export function useConnectPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, credentials }: {
      platform: PlatformType;
      credentials: Record<string, string>;
    }) => {
      // Mock connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, platform };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: PlatformType) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useUpdateSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: PlatformSyncConfig) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-configs'] });
    },
  });
}

// Utility functions

export function getPlatformCapabilities(platform: PlatformType): PlatformCapabilities {
  return PLATFORM_DEFAULTS[platform];
}

export function canPublishTo(platform: PlatformType): boolean {
  return PLATFORM_DEFAULTS[platform].publish;
}

export function getCharacterLimit(platform: PlatformType): number {
  return PLATFORM_DEFAULTS[platform].characterLimit;
}

export function validatePostForPlatform(
  post: Partial<CanonicalPost>,
  platform: PlatformType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const caps = PLATFORM_DEFAULTS[platform];

  if (post.content && post.content.length > caps.characterLimit) {
    errors.push(`Content exceeds ${caps.characterLimit} character limit for ${platform}`);
  }

  if (post.media) {
    if (post.media.length > caps.media.maxImages) {
      errors.push(`Too many media items for ${platform} (max ${caps.media.maxImages})`);
    }

    post.media.forEach((m, i) => {
      if (m.type === 'video' && !caps.media.videos) {
        errors.push(`${platform} does not support videos`);
      }
      if (m.type === 'gif' && !caps.media.gifs) {
        errors.push(`${platform} does not support GIFs`);
      }
      if (m.alt_text && m.alt_text.length > caps.altTextLimit) {
        errors.push(`Alt text for media ${i + 1} exceeds ${caps.altTextLimit} characters`);
      }
    });
  }

  if (post.quote_of && !caps.interactions.quote) {
    errors.push(`${platform} does not support quote posts`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
