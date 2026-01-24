/**
 * Content Library and Recycling API Client
 * Provides React Query hooks for content recycling features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { ApiResponse } from '@/types';

// Platform types
export type PlatformType = 'twitter' | 'bluesky';

// Content Item from the library
export interface ContentItem {
  id: string;
  platform: PlatformType;
  original_post_id: string;
  content: string;
  media_urls?: string[];
  engagement_score: number;
  evergreen_score: number;
  recycle_score: number;
  tags: string[];
  last_recycled_at?: string;
  recycle_count: number;
  created_at: string;
}

// Recycling suggestion
export interface RecycleSuggestion {
  id: string;
  content_id: string;
  content: ContentItem;
  suggested_platforms: PlatformType[];
  suggested_at: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

// Library stats
export interface LibraryStats {
  total_items: number;
  avg_engagement_score: number;
  avg_evergreen_score: number;
  avg_recycle_score: number;
  items_by_platform: Record<PlatformType, number>;
  top_tags: Array<{ tag: string; count: number }>;
}

// Filter options for content library
export interface ContentFilters {
  platform?: PlatformType;
  min_engagement_score?: number;
  max_engagement_score?: number;
  min_evergreen_score?: number;
  max_evergreen_score?: number;
  min_recycle_score?: number;
  max_recycle_score?: number;
  tags?: string[];
  sort_by?: 'recycle_score' | 'engagement_score' | 'evergreen_score' | 'created_at' | 'recycle_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Query keys
export const recyclingKeys = {
  all: ['recycling'] as const,
  library: (filters?: ContentFilters) => [...recyclingKeys.all, 'library', filters] as const,
  suggestions: () => [...recyclingKeys.all, 'suggestions'] as const,
  stats: () => [...recyclingKeys.all, 'stats'] as const,
  item: (id: string) => [...recyclingKeys.all, 'item', id] as const,
};

/**
 * Fetch content library with optional filters
 */
export function useContentLibrary(filters?: ContentFilters) {
  return useQuery({
    queryKey: recyclingKeys.library(filters),
    queryFn: async (): Promise<PaginatedResponse<ContentItem>> => {
      const response = await api.get<PaginatedResponse<ContentItem>>('/library', {
        params: filters as Record<string, unknown>,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch content library');
      }
      return response.data;
    },
  });
}

/**
 * Fetch recycling suggestions
 */
export function useRecycleSuggestions() {
  return useQuery({
    queryKey: recyclingKeys.suggestions(),
    queryFn: async (): Promise<RecycleSuggestion[]> => {
      const response = await api.get<{ suggestions: RecycleSuggestion[] }>('/library/suggestions');
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch suggestions');
      }
      return response.data.suggestions;
    },
  });
}

/**
 * Fetch library statistics
 */
export function useLibraryStats() {
  return useQuery({
    queryKey: recyclingKeys.stats(),
    queryFn: async (): Promise<LibraryStats> => {
      const response = await api.get<LibraryStats>('/library/stats');
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch library stats');
      }
      return response.data;
    },
  });
}

/**
 * Recycle content to specified platforms
 */
export function useRecycleContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      platforms,
      scheduledAt,
    }: {
      contentId: string;
      platforms: PlatformType[];
      scheduledAt?: string;
    }): Promise<{ job_id: string }> => {
      const response = await api.post<{ job_id: string }>(`/library/${contentId}/recycle`, {
        platforms,
        scheduled_at: scheduledAt,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to recycle content');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclingKeys.library() });
      queryClient.invalidateQueries({ queryKey: recyclingKeys.stats() });
    },
  });
}

/**
 * Update tags for a content item
 */
export function useUpdateTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      tags,
    }: {
      contentId: string;
      tags: string[];
    }): Promise<ContentItem> => {
      const response = await api.put<ContentItem>(`/library/${contentId}/tags`, { tags });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update tags');
      }
      return response.data;
    },
    onSuccess: (_, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: recyclingKeys.library() });
      queryClient.invalidateQueries({ queryKey: recyclingKeys.item(contentId) });
    },
  });
}

/**
 * Sync content library from connected platforms
 */
export function useSyncLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ job_id: string; items_synced: number }> => {
      const response = await api.post<{ job_id: string; items_synced: number }>('/library/sync');
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to sync library');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclingKeys.all });
    },
  });
}

/**
 * Accept a recycling suggestion
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      platforms,
      scheduledAt,
    }: {
      suggestionId: string;
      platforms?: PlatformType[];
      scheduledAt?: string;
    }): Promise<{ job_id: string }> => {
      const response = await api.post<{ job_id: string }>(`/library/suggestions/${suggestionId}/accept`, {
        platforms,
        scheduled_at: scheduledAt,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to accept suggestion');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclingKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: recyclingKeys.library() });
    },
  });
}

/**
 * Dismiss a recycling suggestion
 */
export function useDismissSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string): Promise<void> => {
      const response = await api.post<void>(`/library/suggestions/${suggestionId}/dismiss`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to dismiss suggestion');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recyclingKeys.suggestions() });
    },
  });
}
