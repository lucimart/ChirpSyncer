/**
 * Telegram Bot API Client
 *
 * React Query hooks for Telegram Bot API integration.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// =============================================================================
// Types
// =============================================================================

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: TelegramChatPhoto;
  bio?: string;
  description?: string;
  invite_link?: string;
  pinned_message?: TelegramMessage;
  permissions?: TelegramChatPermissions;
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  linked_chat_id?: number;
}

export interface TelegramChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

export interface TelegramChatPermissions {
  can_send_messages?: boolean;
  can_send_media_messages?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number;
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_date?: number;
  reply_to_message?: TelegramMessage;
  edit_date?: number;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
  video?: TelegramVideo;
  poll?: TelegramPoll;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramPoll {
  id: string;
  question: string;
  options: TelegramPollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
}

export interface TelegramPollOption {
  text: string;
  voter_count: number;
}

export interface TelegramChatMember {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  user: TelegramUser;
  is_anonymous?: boolean;
  custom_title?: string;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_to_message_id?: number;
  reply_markup?: object;
}

export interface SendPhotoParams {
  chat_id: number | string;
  photo: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface SendDocumentParams {
  chat_id: number | string;
  document: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface SendVideoParams {
  chat_id: number | string;
  video: string;
  caption?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface SendPollParams {
  chat_id: number | string;
  question: string;
  options: string[];
  is_anonymous?: boolean;
  type?: 'regular' | 'quiz';
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
}

export interface BroadcastParams {
  chat_ids: (number | string)[];
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface BroadcastResult {
  total: number;
  successful: number;
  failed: number;
  results: {
    chat_id: number | string;
    success: boolean;
    message_id?: number;
    error?: string;
  }[];
}

// =============================================================================
// Bot Info Hooks
// =============================================================================

export function useTelegramMe() {
  return useQuery({
    queryKey: ['telegram', 'me'],
    queryFn: async (): Promise<TelegramUser> => {
      const response = await api.get('/api/v1/telegram/me');
      return response.data;
    },
  });
}

// =============================================================================
// Message Hooks
// =============================================================================

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/messages', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message_id,
      ...params
    }: { message_id: string | number; chat_id: number | string; text: string; parse_mode?: string }): Promise<TelegramMessage> => {
      const response = await api.put(`/api/v1/telegram/messages/${message_id}`, params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message_id, chat_id }: { message_id: string | number; chat_id: number | string }) => {
      const response = await api.delete(`/api/v1/telegram/messages/${message_id}?chat_id=${chat_id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

export function useForwardMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      chat_id: number | string;
      from_chat_id: number | string;
      message_id: number;
      disable_notification?: boolean;
    }): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/messages/forward', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

// =============================================================================
// Media Hooks
// =============================================================================

export function useSendPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendPhotoParams): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/photos', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

export function useSendDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendDocumentParams): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/documents', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

export function useSendVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendVideoParams): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/videos', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

// =============================================================================
// Chat Hooks
// =============================================================================

export function useTelegramChat(chatId: string | number | undefined) {
  return useQuery({
    queryKey: ['telegram', 'chat', chatId],
    queryFn: async (): Promise<TelegramChat> => {
      const response = await api.get(`/api/v1/telegram/chats/${chatId}`);
      return response.data;
    },
    enabled: !!chatId,
  });
}

export function useTelegramChatMemberCount(chatId: string | number | undefined) {
  return useQuery({
    queryKey: ['telegram', 'chat', chatId, 'member-count'],
    queryFn: async (): Promise<{ count: number }> => {
      const response = await api.get(`/api/v1/telegram/chats/${chatId}/members/count`);
      return response.data;
    },
    enabled: !!chatId,
  });
}

export function useTelegramChatMember(chatId: string | number | undefined, userId: string | number | undefined) {
  return useQuery({
    queryKey: ['telegram', 'chat', chatId, 'member', userId],
    queryFn: async (): Promise<TelegramChatMember> => {
      const response = await api.get(`/api/v1/telegram/chats/${chatId}/members/${userId}`);
      return response.data;
    },
    enabled: !!chatId && !!userId,
  });
}

export function useTelegramChatAdministrators(chatId: string | number | undefined) {
  return useQuery({
    queryKey: ['telegram', 'chat', chatId, 'administrators'],
    queryFn: async (): Promise<TelegramChatMember[]> => {
      const response = await api.get(`/api/v1/telegram/chats/${chatId}/administrators`);
      return response.data;
    },
    enabled: !!chatId,
  });
}

// =============================================================================
// Channel Hooks
// =============================================================================

export function usePostToChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel_id,
      ...params
    }: { channel_id: string; text: string; parse_mode?: string; disable_web_page_preview?: boolean }): Promise<TelegramMessage> => {
      const response = await api.post(`/api/v1/telegram/channels/${channel_id}/posts`, params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

// =============================================================================
// Poll Hooks
// =============================================================================

export function useSendPoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendPollParams): Promise<TelegramMessage> => {
      const response = await api.post('/api/v1/telegram/polls', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}

// =============================================================================
// Webhook Hooks
// =============================================================================

export function useTelegramWebhookInfo() {
  return useQuery({
    queryKey: ['telegram', 'webhook', 'info'],
    queryFn: async (): Promise<TelegramWebhookInfo> => {
      const response = await api.get('/api/v1/telegram/webhook/info');
      return response.data;
    },
  });
}

export function useSetWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { url: string; max_connections?: number; allowed_updates?: string[] }) => {
      const response = await api.post('/api/v1/telegram/webhook', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram', 'webhook'] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/api/v1/telegram/webhook');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram', 'webhook'] });
    },
  });
}

// =============================================================================
// Broadcast Hooks
// =============================================================================

export function useBroadcastMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BroadcastParams): Promise<BroadcastResult> => {
      const response = await api.post('/api/v1/telegram/broadcast', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram'] });
    },
  });
}
