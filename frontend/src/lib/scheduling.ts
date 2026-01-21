import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TimeSlot {
  hour: number;
  day: number; // 0-6, Sunday = 0
  score: number; // 0-100 predicted engagement score
  label: string; // "Monday 9:00 AM"
}

export interface ScheduledPost {
  id: string;
  content: string;
  scheduled_at: string;
  platform: 'twitter' | 'bluesky' | 'both';
  status: 'pending' | 'published' | 'failed';
  predicted_engagement: number;
  created_at: string;
}

export interface EngagementPrediction {
  score: number;
  confidence: number;
  factors: {
    time_of_day: number;
    day_of_week: number;
    content_length: number;
    has_media: number;
    historical_performance: number;
  };
  suggested_improvements: string[];
}

export interface OptimalTimeResult {
  best_times: TimeSlot[];
  timezone: string;
  based_on_posts: number;
}

// Mock optimal times data
const MOCK_OPTIMAL_TIMES: TimeSlot[] = [
  { hour: 9, day: 1, score: 92, label: 'Monday 9:00 AM' },
  { hour: 12, day: 2, score: 88, label: 'Tuesday 12:00 PM' },
  { hour: 18, day: 3, score: 85, label: 'Wednesday 6:00 PM' },
  { hour: 10, day: 4, score: 82, label: 'Thursday 10:00 AM' },
  { hour: 14, day: 5, score: 78, label: 'Friday 2:00 PM' },
];

export function useOptimalTimes() {
  return useQuery<OptimalTimeResult>({
    queryKey: ['optimal-times'],
    queryFn: async () => {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        best_times: MOCK_OPTIMAL_TIMES,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        based_on_posts: 247,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useScheduledPosts() {
  return useQuery<ScheduledPost[]>({
    queryKey: ['scheduled-posts'],
    queryFn: async () => {
      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [
        {
          id: '1',
          content: 'Excited to share our new feature launch! Stay tuned for more updates.',
          scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          platform: 'both',
          status: 'pending',
          predicted_engagement: 85,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          content: 'Thread: 5 tips for better social media engagement...',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          platform: 'twitter',
          status: 'pending',
          predicted_engagement: 72,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          content: 'Check out our latest blog post on productivity tips!',
          scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          platform: 'bluesky',
          status: 'published',
          predicted_engagement: 68,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];
    },
  });
}

export function useEngagementPrediction() {
  return useMutation<
    EngagementPrediction,
    Error,
    { content: string; scheduledAt: string; hasMedia: boolean }
  >({
    mutationFn: async ({ content, scheduledAt, hasMedia }) => {
      // Mock prediction
      await new Promise((resolve) => setTimeout(resolve, 800));

      const date = new Date(scheduledAt);
      const hour = date.getHours();
      const day = date.getDay();

      // Simple mock scoring logic
      const timeScore = hour >= 9 && hour <= 18 ? 80 : 50;
      const dayScore = day >= 1 && day <= 5 ? 75 : 60;
      const lengthScore = content.length > 100 ? 70 : content.length > 50 ? 80 : 60;
      const mediaScore = hasMedia ? 85 : 65;

      const baseScore = (timeScore + dayScore + lengthScore + mediaScore) / 4;
      const finalScore = Math.min(100, Math.max(0, baseScore + (Math.random() * 10 - 5)));

      const improvements: string[] = [];
      if (hour < 9 || hour > 18) {
        improvements.push('Consider scheduling during business hours (9 AM - 6 PM)');
      }
      if (content.length < 50) {
        improvements.push('Longer posts tend to get more engagement');
      }
      if (!hasMedia) {
        improvements.push('Posts with images get 2x more engagement');
      }
      if (day === 0 || day === 6) {
        improvements.push('Weekdays typically have higher engagement');
      }

      return {
        score: Math.round(finalScore),
        confidence: 0.78,
        factors: {
          time_of_day: timeScore / 100,
          day_of_week: dayScore / 100,
          content_length: lengthScore / 100,
          has_media: mediaScore / 100,
          historical_performance: 0.72,
        },
        suggested_improvements: improvements,
      };
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id: `post-${Date.now()}`,
        content,
        scheduled_at: scheduledAt,
        platform,
        status: 'pending',
        predicted_engagement: Math.floor(Math.random() * 30) + 60,
        created_at: new Date().toISOString(),
      };
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
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });
}
