import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

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
    description: 'Connect to any Mastodon/ActivityPub instance',
    icon: 'M',
    color: '#6364FF',
    capabilities: PLATFORM_DEFAULTS.mastodon,
    auth_type: 'oauth2',
    status: 'beta',
  },
  {
    id: 'instagram',
    platform: 'instagram',
    name: 'Instagram',
    description: 'Read-only access to your Instagram posts and insights',
    icon: 'I',
    color: '#E4405F',
    capabilities: PLATFORM_DEFAULTS.instagram,
    auth_type: 'oauth2',
    status: 'beta',
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
      const response = await api.getCredentials();
      if (!response.success || !response.data) {
        return [];
      }

      // Map credentials to platform connections
      return response.data.map((cred) => ({
        id: `conn-${cred.id}`,
        platform: cred.platform as PlatformType,
        connected: cred.is_active,
        handle: undefined, // Credential API doesn't expose handle
        display_name: undefined,
        avatar: undefined,
        last_sync: cred.last_used || undefined,
        sync_enabled: cred.is_active,
        capabilities_used: ['publish', 'delete', 'read'] as (keyof PlatformCapabilities)[],
      }));
    },
  });
}

export function useSyncConfigs() {
  return useQuery<PlatformSyncConfig[]>({
    queryKey: ['sync-configs'],
    queryFn: async () => {
      // Get saved sync configs from backend
      const configResponse = await api.getSyncConfig();
      const credResponse = await api.getCredentials();

      if (!credResponse.success || !credResponse.data) {
        return [];
      }

      const savedConfigs = configResponse.success && configResponse.data
        ? configResponse.data.configs
        : [];

      // Map credentials to sync configs, using saved config if available
      // Map backend direction values to frontend interface values
      const mapDirection = (dir?: string): 'bidirectional' | 'inbound' | 'outbound' => {
        if (dir === 'import_only') return 'inbound';
        if (dir === 'export_only') return 'outbound';
        return 'bidirectional';
      };

      const mapTruncateStrategy = (strategy?: string): 'smart' | 'cut' | 'thread' => {
        if (strategy === 'truncate') return 'cut';
        if (strategy === 'skip') return 'smart';
        return strategy as 'smart' | 'cut' | 'thread' || 'smart';
      };

      return credResponse.data
        .filter((cred) => cred.is_active)
        .map((cred) => {
          const saved = savedConfigs.find((c) => c.platform === cred.platform);
          return {
            platform: cred.platform as PlatformType,
            enabled: saved ? saved.enabled : true,
            direction: mapDirection(saved?.direction),
            filters: {
              include_replies: saved ? saved.sync_replies : false,
              include_reposts: saved ? saved.sync_reposts : false,
              include_quotes: true,
            },
            transform: {
              add_source_link: true,
              preserve_mentions: true,
              preserve_hashtags: saved ? saved.auto_hashtag : true,
              truncate_strategy: mapTruncateStrategy(saved?.truncation_strategy) || (cred.platform === 'bluesky' ? 'thread' : 'smart'),
            },
          };
        });
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
      // Determine credential_type based on platform
      const credentialType = (platform === 'bluesky' || platform === 'instagram') ? 'api' : 'scraping';

      const response = await api.addCredential({
        platform,
        credential_type: credentialType,
        credentials,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to connect platform');
      }

      return { success: true, platform };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['sync-configs'] });
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: PlatformType) => {
      // First get the credential ID for this platform
      const credResponse = await api.getCredentials();
      if (!credResponse.success || !credResponse.data) {
        throw new Error('Failed to get credentials');
      }

      const credential = credResponse.data.find((c) => c.platform === platform);
      if (!credential) {
        throw new Error('No credential found for platform');
      }

      const response = await api.deleteCredential(credential.id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to disconnect platform');
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['sync-configs'] });
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useUpdateSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: PlatformSyncConfig) => {
      // Map frontend direction values to backend values
      const mapDirectionToBackend = (dir: 'bidirectional' | 'inbound' | 'outbound'): 'bidirectional' | 'import_only' | 'export_only' => {
        if (dir === 'inbound') return 'import_only';
        if (dir === 'outbound') return 'export_only';
        return 'bidirectional';
      };

      const mapTruncateToBackend = (strategy: 'smart' | 'cut' | 'thread'): 'smart' | 'truncate' | 'skip' => {
        if (strategy === 'cut') return 'truncate';
        if (strategy === 'thread') return 'smart';
        return strategy;
      };

      const response = await api.saveSyncConfig({
        platform: config.platform,
        enabled: config.enabled,
        direction: mapDirectionToBackend(config.direction),
        sync_replies: config.filters.include_replies,
        sync_reposts: config.filters.include_reposts,
        truncation_strategy: mapTruncateToBackend(config.transform.truncate_strategy),
        auto_hashtag: config.transform.preserve_hashtags,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save sync config');
      }

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
