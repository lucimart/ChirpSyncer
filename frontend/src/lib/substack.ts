/**
 * Substack API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface SubstackPublication {
  id: number;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  logo_url: string | null;
  author_name: string;
  author_photo_url: string | null;
  hero_text: string;
}

export interface SubstackPost {
  id: number;
  title: string;
  subtitle: string;
  slug: string;
  post_date: string;
  audience: 'everyone' | 'only_paid' | 'founding';
  type: 'newsletter' | 'podcast' | 'thread';
  draft: boolean;
  canonical_url: string;
  description: string;
  word_count: number;
  reactions: {
    '❤️': number;
  };
  comment_count: number;
}

export interface SubstackDraft {
  id: number;
  title: string;
  subtitle: string;
  body_html: string;
  draft: boolean;
  type: string;
}

export interface CreateDraftInput {
  title: string;
  subtitle?: string;
  body: string;
  type?: 'newsletter' | 'podcast' | 'thread';
}

export interface PublishPostInput {
  send_email?: boolean;
  audience?: 'everyone' | 'paid' | 'founding';
}

export interface SubscriberStats {
  total_subscribers: number;
  free_subscribers: number;
  paid_subscribers: number;
  founding_subscribers: number;
}

// Query keys
export const substackKeys = {
  all: ['substack'] as const,
  publication: () => [...substackKeys.all, 'publication'] as const,
  posts: (params?: { limit?: number; offset?: number; type?: string }) =>
    [...substackKeys.all, 'posts', params] as const,
  drafts: () => [...substackKeys.all, 'drafts'] as const,
  subscriberStats: () => [...substackKeys.all, 'subscriber-stats'] as const,
  settings: () => [...substackKeys.all, 'settings'] as const,
};

// Hooks
export function useSubstackPublication() {
  return useQuery({
    queryKey: substackKeys.publication(),
    queryFn: async () => {
      const response = await api.get<SubstackPublication>('/substack/publication');
      return response.data;
    },
  });
}

export function useSubstackPosts(params?: { limit?: number; offset?: number; type?: string }) {
  return useQuery({
    queryKey: substackKeys.posts(params),
    queryFn: async () => {
      const response = await api.get<SubstackPost[]>('/substack/posts', {
        params,
      });
      return response.data;
    },
  });
}

export function useSubstackDrafts() {
  return useQuery({
    queryKey: substackKeys.drafts(),
    queryFn: async () => {
      const response = await api.get<SubstackDraft[]>('/substack/drafts');
      return response.data;
    },
  });
}

export function useCreateSubstackDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDraftInput) => {
      const response = await api.post<SubstackDraft>('/substack/posts', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: substackKeys.drafts() });
    },
  });
}

export function useUpdateSubstackPost(postId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreateDraftInput>) => {
      const response = await api.put<SubstackPost>(`/substack/posts/${postId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: substackKeys.all });
    },
  });
}

export function useDeleteSubstackPost(postId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/substack/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: substackKeys.all });
    },
  });
}

export function usePublishSubstackPost(postId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PublishPostInput = {}) => {
      const response = await api.post<SubstackPost>(
        `/substack/posts/${postId}/publish`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: substackKeys.all });
    },
  });
}

export function useSubstackSubscriberStats() {
  return useQuery({
    queryKey: substackKeys.subscriberStats(),
    queryFn: async () => {
      const response = await api.get<SubscriberStats>('/substack/subscribers/stats');
      return response.data;
    },
  });
}

export function useSubstackSettings() {
  return useQuery({
    queryKey: substackKeys.settings(),
    queryFn: async () => {
      const response = await api.get<Record<string, unknown>>('/substack/settings');
      return response.data;
    },
  });
}
