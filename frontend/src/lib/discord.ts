/**
 * Discord Client
 * Supports webhooks and Bot API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions?: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id?: string;
}

export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
    bot: boolean;
  };
  timestamp: string;
  embeds: DiscordEmbed[];
  attachments: DiscordAttachment[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  content_type?: string;
}

export interface WebhookPayload {
  webhook_url?: string;
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface BroadcastTarget {
  type: 'webhook' | 'channel';
  id: string;
}

export interface BroadcastResult {
  target: string;
  type: string;
  success: boolean;
  status?: number;
  message_id?: string;
  error?: string;
}

export interface DiscordCredentials {
  webhook_url?: string;
  bot_token?: string;
}

// API Client
class DiscordApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/discord${endpoint}`, {
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

  // Webhook endpoints
  async sendWebhook(payload: WebhookPayload): Promise<{ sent: boolean }> {
    return this.request('/webhook/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async testWebhook(webhookUrl?: string): Promise<{ success: boolean; status_code: number }> {
    return this.request('/webhook/test', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl }),
    });
  }

  // Bot API endpoints
  async getMe(): Promise<DiscordUser> {
    return this.request('/me');
  }

  async getGuilds(): Promise<{ guilds: DiscordGuild[]; count: number }> {
    return this.request('/guilds');
  }

  async getGuildChannels(guildId: string): Promise<{ channels: DiscordChannel[] }> {
    return this.request(`/guild/${guildId}/channels`);
  }

  async getChannelMessages(channelId: string, limit?: number): Promise<{ messages: DiscordMessage[] }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    return this.request(`/channel/${channelId}/messages?${params.toString()}`);
  }

  async sendChannelMessage(
    channelId: string,
    data: { content?: string; embeds?: DiscordEmbed[]; reply_to?: string }
  ): Promise<{ id: string; content: string; timestamp: string }> {
    return this.request(`/channel/${channelId}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMessage(channelId: string, messageId: string): Promise<{ deleted: boolean }> {
    return this.request(`/message/${channelId}/${messageId}`, {
      method: 'DELETE',
    });
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<{ reacted: boolean }> {
    return this.request(`/message/${channelId}/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async previewEmbed(embed: DiscordEmbed): Promise<{ valid: boolean; embed: DiscordEmbed }> {
    return this.request('/embed/preview', {
      method: 'POST',
      body: JSON.stringify(embed),
    });
  }

  async broadcast(
    targets: BroadcastTarget[],
    data: { content?: string; embeds?: DiscordEmbed[] }
  ): Promise<{ results: BroadcastResult[]; total: number; successful: number; failed: number }> {
    return this.request('/broadcast', {
      method: 'POST',
      body: JSON.stringify({ targets, ...data }),
    });
  }
}

export const discordClient = new DiscordApiClient();

// React Query Hooks

// Webhook
export function useSendWebhook() {
  return useMutation({
    mutationFn: (payload: WebhookPayload) => discordClient.sendWebhook(payload),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (webhookUrl?: string) => discordClient.testWebhook(webhookUrl),
  });
}

// Bot User
export function useDiscordMe() {
  return useQuery({
    queryKey: ['discord', 'me'],
    queryFn: () => discordClient.getMe(),
  });
}

// Guilds
export function useDiscordGuilds() {
  return useQuery({
    queryKey: ['discord', 'guilds'],
    queryFn: () => discordClient.getGuilds(),
  });
}

export function useDiscordGuildChannels(guildId: string) {
  return useQuery({
    queryKey: ['discord', 'guild', guildId, 'channels'],
    queryFn: () => discordClient.getGuildChannels(guildId),
    enabled: !!guildId,
  });
}

// Messages
export function useDiscordChannelMessages(channelId: string, limit?: number) {
  return useQuery({
    queryKey: ['discord', 'channel', channelId, 'messages', limit],
    queryFn: () => discordClient.getChannelMessages(channelId, limit),
    enabled: !!channelId,
  });
}

export function useSendDiscordMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      data,
    }: {
      channelId: string;
      data: { content?: string; embeds?: DiscordEmbed[]; reply_to?: string };
    }) => discordClient.sendChannelMessage(channelId, data),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['discord', 'channel', channelId, 'messages'] });
    },
  });
}

export function useDeleteDiscordMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId }: { channelId: string; messageId: string }) =>
      discordClient.deleteMessage(channelId, messageId),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['discord', 'channel', channelId, 'messages'] });
    },
  });
}

export function useAddDiscordReaction() {
  return useMutation({
    mutationFn: ({ channelId, messageId, emoji }: { channelId: string; messageId: string; emoji: string }) =>
      discordClient.addReaction(channelId, messageId, emoji),
  });
}

// Embed
export function usePreviewDiscordEmbed() {
  return useMutation({
    mutationFn: (embed: DiscordEmbed) => discordClient.previewEmbed(embed),
  });
}

// Broadcast
export function useDiscordBroadcast() {
  return useMutation({
    mutationFn: ({
      targets,
      content,
      embeds,
    }: {
      targets: BroadcastTarget[];
      content?: string;
      embeds?: DiscordEmbed[];
    }) => discordClient.broadcast(targets, { content, embeds }),
  });
}

// Utility: Build embed helper
export function buildEmbed(options: {
  title?: string;
  description?: string;
  color?: string | number;
  url?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  footerText?: string;
  authorName?: string;
  authorUrl?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}): DiscordEmbed {
  const embed: DiscordEmbed = {};

  if (options.title) embed.title = options.title;
  if (options.description) embed.description = options.description;
  if (options.url) embed.url = options.url;

  if (options.color) {
    embed.color =
      typeof options.color === 'string'
        ? parseInt(options.color.replace('#', ''), 16)
        : options.color;
  }

  if (options.imageUrl) embed.image = { url: options.imageUrl };
  if (options.thumbnailUrl) embed.thumbnail = { url: options.thumbnailUrl };
  if (options.footerText) embed.footer = { text: options.footerText };
  if (options.authorName) {
    embed.author = { name: options.authorName };
    if (options.authorUrl) embed.author.url = options.authorUrl;
  }
  if (options.fields) embed.fields = options.fields;

  return embed;
}

export default discordClient;
