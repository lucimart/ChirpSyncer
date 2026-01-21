import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type ScheduledPost,
  type TimeSlot,
  type OptimalTimeResult,
  type EngagementPrediction,
} from './api';

// Re-export types for consumers
export type { ScheduledPost, TimeSlot, OptimalTimeResult, EngagementPrediction };

export function useOptimalTimes() {
  return useQuery<OptimalTimeResult>({
    queryKey: ['optimal-times'],
    queryFn: async () => {
      const response = await api.getOptimalTimes();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch optimal times');
      }
      return response.data!;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useScheduledPosts(status?: string) {
  return useQuery<ScheduledPost[]>({
    queryKey: ['scheduled-posts', status],
    queryFn: async () => {
      const response = await api.getScheduledPosts(status);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch scheduled posts');
      }
      return response.data!;
    },
  });
}

export function useEngagementPrediction() {
  return useMutation<
    EngagementPrediction,
    Error,
    { content: string; scheduledAt?: string; hasMedia?: boolean }
  >({
    mutationFn: async ({ content, scheduledAt, hasMedia }) => {
      const response = await api.predictEngagement({
        content,
        scheduled_at: scheduledAt,
        has_media: hasMedia,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to predict engagement');
      }
      return response.data!;
    },
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation<
    ScheduledPost,
    Error,
    { content: string; scheduledAt: string; platform: 'twitter' | 'bluesky' | 'both' }
  >({
    mutationFn: async ({ content, scheduledAt, platform }) => {
      const response = await api.createScheduledPost({
        content,
        scheduled_at: scheduledAt,
        platform,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to create scheduled post');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });
}

export function useUpdateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation<
    ScheduledPost,
    Error,
    { id: string; content?: string; scheduledAt?: string }
  >({
    mutationFn: async ({ id, content, scheduledAt }) => {
      const response = await api.updateScheduledPost(id, {
        content,
        scheduled_at: scheduledAt,
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update scheduled post');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });
}

export function useDeleteScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      const response = await api.deleteScheduledPost(postId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete scheduled post');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });
}
