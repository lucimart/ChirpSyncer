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

// Types for TimingHeatmap
export interface HeatmapCell {
  day: number;
  hour: number;
  score: number;
  postCount?: number;
  avgEngagement?: number;
}

export interface TimingHeatmapData {
  cells: HeatmapCell[];
  bestSlots: Array<{
    day: number;
    hour: number;
    score: number;
    label: string;
  }>;
  dataQuality: 'low' | 'medium' | 'high';
  basedOnPosts: number;
}

/**
 * Hook that transforms OptimalTimeResult into TimingHeatmapData format.
 * Generates heatmap cells from best_times and fills remaining slots with estimated scores.
 */
export function useHeatmapData() {
  const { data: optimalTimes, isLoading, error } = useOptimalTimes();

  const heatmapData: TimingHeatmapData | null = optimalTimes
    ? (() => {
        const cells: HeatmapCell[] = [];
        const bestSlots = optimalTimes.best_times.map((slot) => ({
          day: slot.day,
          hour: slot.hour,
          score: slot.score,
          label: slot.label,
        }));

        // Create a map of best slots for quick lookup
        const bestSlotsMap = new Map<string, number>();
        optimalTimes.best_times.forEach((slot) => {
          bestSlotsMap.set(`${slot.day}-${slot.hour}`, slot.score);
        });

        // Generate cells for all day/hour combinations
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            const key = `${day}-${hour}`;
            const bestScore = bestSlotsMap.get(key);

            if (bestScore !== undefined) {
              cells.push({ day, hour, score: bestScore });
            } else {
              // Estimate score based on typical engagement patterns
              const isWeekday = day >= 1 && day <= 5;
              const isPeakHour = (hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 21);
              const isOffHour = hour < 6 || hour > 23;

              let estimatedScore = 30;
              if (isWeekday && isPeakHour) estimatedScore = 55;
              else if (isPeakHour) estimatedScore = 45;
              else if (isOffHour) estimatedScore = 10;

              cells.push({ day, hour, score: estimatedScore });
            }
          }
        }

        const dataQuality: 'low' | 'medium' | 'high' =
          optimalTimes.based_on_posts >= 50
            ? 'high'
            : optimalTimes.based_on_posts >= 10
              ? 'medium'
              : 'low';

        return {
          cells,
          bestSlots,
          dataQuality,
          basedOnPosts: optimalTimes.based_on_posts,
        };
      })()
    : null;

  return { data: heatmapData, isLoading, error };
}
