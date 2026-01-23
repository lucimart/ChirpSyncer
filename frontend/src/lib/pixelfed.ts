/**
 * Pixelfed API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface PixelfedAccount {
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
  avatar_static: string;
  header: string;
  header_static: string;
  followers_count: number;
  following_count: number;
  statuses_count: number;
}

export interface PixelfedMediaAttachment {
  id: string;
  type: 'image' | 'video' | 'gifv' | 'audio';
  url: string;
  preview_url: string;
  remote_url: string | null;
  description: string | null;
  blurhash: string | null;
  meta: {
    original?: { width: number; height: number };
    small?: { width: number; height: number };
  };
}

export interface PixelfedStatus {
  id: string;
  created_at: string;
  in_reply_to_id: string | null;
  in_reply_to_account_id: string | null;
  sensitive: boolean;
  spoiler_text: string;
  visibility: 'public' | 'unlisted' | 'private' | 'direct';
  language: string | null;
  uri: string;
  url: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
  content: string;
  reblog: PixelfedStatus | null;
  account: PixelfedAccount;
  media_attachments: PixelfedMediaAttachment[];
  favourited: boolean;
  reblogged: boolean;
  bookmarked: boolean;
}

export interface CreateStatusInput {
  status?: string;
  media_ids: string[];
  visibility?: 'public' | 'unlisted' | 'private' | 'direct';
  sensitive?: boolean;
  spoiler_text?: string;
}

// Query keys
export const pixelfedKeys = {
  all: ['pixelfed'] as const,
  me: () => [...pixelfedKeys.all, 'me'] as const,
  account: (id: string) => [...pixelfedKeys.all, 'account', id] as const,
  accountStatuses: (id: string, params?: object) =>
    [...pixelfedKeys.all, 'account-statuses', id, params] as const,
  homeTimeline: (params?: object) => [...pixelfedKeys.all, 'home-timeline', params] as const,
  publicTimeline: (params?: object) => [...pixelfedKeys.all, 'public-timeline', params] as const,
  status: (id: string) => [...pixelfedKeys.all, 'status', id] as const,
  discover: () => [...pixelfedKeys.all, 'discover'] as const,
};

// Hooks
export function usePixelfedMe() {
  return useQuery({
    queryKey: pixelfedKeys.me(),
    queryFn: async () => {
      const response = await api.get<PixelfedAccount>('/pixelfed/verify_credentials');
      return response.data;
    },
  });
}

export function usePixelfedAccount(accountId: string) {
  return useQuery({
    queryKey: pixelfedKeys.account(accountId),
    queryFn: async () => {
      const response = await api.get<PixelfedAccount>(`/pixelfed/accounts/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });
}

export function usePixelfedAccountStatuses(
  accountId: string,
  params?: { limit?: number; max_id?: string; min_id?: string; only_media?: boolean }
) {
  return useQuery({
    queryKey: pixelfedKeys.accountStatuses(accountId, params),
    queryFn: async () => {
      const response = await api.get<{ data: { statuses: PixelfedStatus[] } }>(
        `/pixelfed/accounts/${accountId}/statuses`,
        { params }
      );
      return response.data?.statuses;
    },
    enabled: !!accountId,
  });
}

export function usePixelfedHomeTimeline(params?: { limit?: number; max_id?: string; min_id?: string }) {
  return useQuery({
    queryKey: pixelfedKeys.homeTimeline(params),
    queryFn: async () => {
      const response = await api.get<{ data: { statuses: PixelfedStatus[] } }>(
        '/pixelfed/timelines/home',
        { params }
      );
      return response.data?.statuses;
    },
  });
}

export function usePixelfedPublicTimeline(params?: { limit?: number; local?: boolean }) {
  return useQuery({
    queryKey: pixelfedKeys.publicTimeline(params),
    queryFn: async () => {
      const response = await api.get<{ data: { statuses: PixelfedStatus[] } }>(
        '/pixelfed/timelines/public',
        { params }
      );
      return response.data?.statuses;
    },
  });
}

export function usePixelfedStatus(statusId: string) {
  return useQuery({
    queryKey: pixelfedKeys.status(statusId),
    queryFn: async () => {
      const response = await api.get<PixelfedStatus>(`/pixelfed/statuses/${statusId}`);
      return response.data;
    },
    enabled: !!statusId,
  });
}

export function useCreatePixelfedStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStatusInput) => {
      const response = await api.post<PixelfedStatus>('/pixelfed/statuses', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.all });
    },
  });
}

export function useDeletePixelfedStatus(statusId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/pixelfed/statuses/${statusId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.all });
    },
  });
}

export function useFavouritePixelfedStatus(statusId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<PixelfedStatus>(
        `/pixelfed/statuses/${statusId}/favourite`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.status(statusId) });
    },
  });
}

export function useUnfavouritePixelfedStatus(statusId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<PixelfedStatus>(
        `/pixelfed/statuses/${statusId}/unfavourite`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.status(statusId) });
    },
  });
}

export function useReblogPixelfedStatus(statusId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<PixelfedStatus>(
        `/pixelfed/statuses/${statusId}/reblog`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.all });
    },
  });
}

export function useUploadPixelfedMedia() {
  return useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      const response = await api.post<PixelfedMediaAttachment>(
        '/pixelfed/media',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    },
  });
}

export function useFollowPixelfedAccount(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<unknown>(`/pixelfed/accounts/${accountId}/follow`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.account(accountId) });
    },
  });
}

export function useUnfollowPixelfedAccount(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<unknown>(
        `/pixelfed/accounts/${accountId}/unfollow`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pixelfedKeys.account(accountId) });
    },
  });
}

export function usePixelfedDiscover() {
  return useQuery({
    queryKey: pixelfedKeys.discover(),
    queryFn: async () => {
      const response = await api.get<{ data: { posts: PixelfedStatus[] } }>('/pixelfed/discover/posts');
      return response.data?.posts;
    },
  });
}
