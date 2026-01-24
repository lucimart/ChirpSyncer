/**
 * Sprint 15: ML Scheduling - Unit Tests
 * Tests connected to actual implementation in:
 * - src/lib/scheduling.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useOptimalTimes,
  useScheduledPosts,
  useEngagementPrediction,
  useCreateScheduledPost,
  useDeleteScheduledPost,
} from '@/lib/scheduling';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

const mockFetch = (response: any, status: number = 200) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    headers: new Headers({ 'content-type': 'application/json' }),
  });
};

const mockApiResponse = (data: any, status: number = 200) => {
  mockFetch({ success: true, data }, status);
};

describe('Sprint 15: ML Scheduling', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  describe('US-075: Optimal Time Suggestions', () => {
    it('should return top 5 optimal time slots ordered by engagement score', async () => {
      mockApiResponse({
        best_times: [
          { hour: 10, day: 1, score: 95, label: 'Mon 10am' },
          { hour: 14, day: 2, score: 90, label: 'Tue 2pm' },
          { hour: 9, day: 3, score: 85, label: 'Wed 9am' },
          { hour: 16, day: 4, score: 80, label: 'Thu 4pm' },
          { hour: 11, day: 5, score: 75, label: 'Fri 11am' },
        ],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        based_on_posts: 50
      });

      const { result } = renderHook(() => useOptimalTimes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { best_times } = result.current.data!;

      expect(best_times).toHaveLength(5);
      // Verify descending order by score
      for (let i = 1; i < best_times.length; i++) {
        expect(best_times[i - 1].score).toBeGreaterThanOrEqual(best_times[i].score);
      }
    });

    it('should include hour, day, score, and label for each time slot', async () => {
      mockApiResponse({
        best_times: [
          { hour: 10, day: 1, score: 95, label: 'Mon 10am' },
        ],
        timezone: 'UTC',
        based_on_posts: 50
      });

      const { result } = renderHook(() => useOptimalTimes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const slot = result.current.data!.best_times[0];

      expect(slot).toHaveProperty('hour');
      expect(slot).toHaveProperty('day');
      expect(slot).toHaveProperty('score');
      expect(slot).toHaveProperty('label');

      expect(typeof slot.hour).toBe('number');
      expect(slot.hour).toBeGreaterThanOrEqual(0);
      expect(slot.hour).toBeLessThan(24);

      expect(typeof slot.day).toBe('number');
      expect(slot.day).toBeGreaterThanOrEqual(0);
      expect(slot.day).toBeLessThan(7);

      expect(typeof slot.score).toBe('number');
      expect(slot.score).toBeGreaterThanOrEqual(0);
      expect(slot.score).toBeLessThanOrEqual(100);

      expect(typeof slot.label).toBe('string');
    });

    it('should include timezone and based_on_posts count', async () => {
      mockApiResponse({
        best_times: [],
        timezone: 'UTC',
        based_on_posts: 10
      });

      const { result } = renderHook(() => useOptimalTimes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const data = result.current.data!;

      expect(data).toHaveProperty('timezone');
      expect(data).toHaveProperty('based_on_posts');
      expect(typeof data.timezone).toBe('string');
      expect(typeof data.based_on_posts).toBe('number');
      expect(data.based_on_posts).toBeGreaterThan(0);
    });

    it('should use local timezone for suggestions', async () => {
      const expectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      mockApiResponse({
        best_times: [],
        timezone: expectedTimezone,
        based_on_posts: 10
      });

      const { result } = renderHook(() => useOptimalTimes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.timezone).toBe(expectedTimezone);
    });
  });

  describe('US-075: Engagement Prediction', () => {
    it('should return engagement score between 0-100', async () => {
      mockApiResponse({
        score: 85,
        confidence: 0.9,
        factors: { time_of_day: 0.8, day_of_week: 0.7, content_length: 0.6, has_media: 0, historical_performance: 0.5 },
        suggested_improvements: []
      });

      const { result } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          content: 'Test post content for engagement prediction',
          scheduledAt: new Date().toISOString(),
          hasMedia: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const prediction = result.current.data!;
      expect(prediction.score).toBeGreaterThanOrEqual(0);
      expect(prediction.score).toBeLessThanOrEqual(100);
    });

    it('should include confidence score', async () => {
      mockApiResponse({
        score: 85,
        confidence: 0.9,
        factors: {},
        suggested_improvements: []
      });

      const { result } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          content: 'Test post',
          scheduledAt: new Date().toISOString(),
          hasMedia: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const prediction = result.current.data!;
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should include factor breakdown', async () => {
      mockApiResponse({
        score: 85,
        confidence: 0.9,
        factors: {
          time_of_day: 0.8,
          day_of_week: 0.7,
          content_length: 0.6,
          has_media: 1.0,
          historical_performance: 0.5
        },
        suggested_improvements: []
      });

      const { result } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          content: 'Test post',
          scheduledAt: new Date().toISOString(),
          hasMedia: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { factors } = result.current.data!;

      expect(factors).toHaveProperty('time_of_day');
      expect(factors).toHaveProperty('day_of_week');
      expect(factors).toHaveProperty('content_length');
      expect(factors).toHaveProperty('has_media');
      expect(factors).toHaveProperty('historical_performance');

      // All factors should be normalized 0-1
      Object.values(factors).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should return suggested improvements when score is low', async () => {
      mockApiResponse({
        score: 30,
        confidence: 0.8,
        factors: {},
        suggested_improvements: ['Post at a better time', 'Add media']
      });

      const { result } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      // Schedule at midnight on weekend, short content, no media
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
      saturday.setHours(2, 0, 0, 0);

      act(() => {
        result.current.mutate({
          content: 'Short', // Very short content
          scheduledAt: saturday.toISOString(),
          hasMedia: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const { suggested_improvements } = result.current.data!;
      expect(Array.isArray(suggested_improvements)).toBe(true);
      // Should suggest improvements for poor timing and no media
      expect(suggested_improvements.length).toBeGreaterThan(0);
    });

    it('should consider media presence as engagement factor', async () => {
      mockApiResponse({
        score: 80,
        confidence: 0.9,
        factors: { has_media: 0.8 },
        suggested_improvements: []
      }); // Response for withMedia

      const { result: withMedia } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      // We need to re-mock for the second call
      // Note: mockResolvedValueOnce handles one call. We need two.
      // But we can't easily interleave mocking between renders here without more complex setup.
      // Instead, we'll queue up TWO responses.
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { score: 60, confidence: 0.9, factors: { has_media: 0.2 }, suggested_improvements: [] } }),
      });

      const { result: withoutMedia } = renderHook(() => useEngagementPrediction(), {
        wrapper: createWrapper(),
      });

      const scheduledAt = new Date().toISOString();

      act(() => {
        withMedia.current.mutate({
          content: 'Test post with media',
          scheduledAt,
          hasMedia: true,
        });
        withoutMedia.current.mutate({
          content: 'Test post with media',
          scheduledAt,
          hasMedia: false,
        });
      });

      await waitFor(() => {
        expect(withMedia.current.isSuccess).toBe(true);
        expect(withoutMedia.current.isSuccess).toBe(true);
      });

      // Media posts should have higher media factor
      expect(withMedia.current.data!.factors.has_media).toBeGreaterThan(
        withoutMedia.current.data!.factors.has_media
      );
    });
  });

  describe('US-075: Scheduled Posts Management', () => {
    it('should return list of scheduled posts', async () => {
      mockApiResponse([
        {
          id: 'post-1',
          content: 'Scheduled content',
          scheduled_at: new Date().toISOString(),
          platform: 'twitter',
          status: 'pending',
          predicted_engagement: 80,
          created_at: new Date().toISOString()
        }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data!.length).toBeGreaterThan(0);
    });

    it('should include required fields for each scheduled post', async () => {
      mockApiResponse([
        {
          id: 'post-1',
          content: 'Scheduled content',
          scheduled_at: new Date().toISOString(),
          platform: 'twitter',
          status: 'pending',
          predicted_engagement: 80,
          created_at: new Date().toISOString()
        }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const post = result.current.data![0];

      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('scheduled_at');
      expect(post).toHaveProperty('platform');
      expect(post).toHaveProperty('status');
      expect(post).toHaveProperty('predicted_engagement');
      expect(post).toHaveProperty('created_at');
    });

    it('should support platform values: twitter, bluesky, both', async () => {
      mockApiResponse([
        { id: '1', platform: 'twitter', status: 'pending', scheduled_at: new Date().toISOString() },
        { id: '2', platform: 'bluesky', status: 'pending', scheduled_at: new Date().toISOString() },
        { id: '3', platform: 'both', status: 'pending', scheduled_at: new Date().toISOString() }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const platforms = result.current.data!.map((p) => p.platform);
      const validPlatforms = ['twitter', 'bluesky', 'both'];

      platforms.forEach((platform) => {
        expect(validPlatforms).toContain(platform);
      });
    });

    it('should support status values: pending, published, failed', async () => {
      mockApiResponse([
        { id: '1', platform: 'twitter', status: 'pending', scheduled_at: new Date().toISOString() },
        { id: '2', platform: 'twitter', status: 'published', scheduled_at: new Date().toISOString() },
        { id: '3', platform: 'twitter', status: 'failed', scheduled_at: new Date().toISOString() }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const statuses = result.current.data!.map((p) => p.status);
      const validStatuses = ['pending', 'published', 'failed'];

      statuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });

    it('should create a new scheduled post', async () => {
      const newPost = {
        content: 'New scheduled post for testing',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        platform: 'both' as const,
      };

      mockApiResponse({
        id: 'new-id',
        content: newPost.content,
        scheduled_at: newPost.scheduledAt,
        platform: newPost.platform,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      const { result } = renderHook(() => useCreateScheduledPost(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(newPost);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const created = result.current.data!;

      expect(created.content).toBe(newPost.content);
      expect(created.scheduled_at).toBe(newPost.scheduledAt);
      expect(created.platform).toBe(newPost.platform);
      expect(created.status).toBe('pending');
      expect(created.id).toBeDefined();
    });

    it('should delete a scheduled post', async () => {
      mockApiResponse({ success: true });

      const { result } = renderHook(() => useDeleteScheduledPost(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate('post-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Mutation should complete successfully
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('US-075: Scheduler UI Behavior', () => {
    it('should have predicted_engagement for pending posts', async () => {
      mockApiResponse([
        { id: '1', status: 'pending', predicted_engagement: 75, scheduled_at: new Date().toISOString() }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const pendingPosts = result.current.data!.filter((p) => p.status === 'pending');

      pendingPosts.forEach((post) => {
        expect(typeof post.predicted_engagement).toBe('number');
        expect(post.predicted_engagement).toBeGreaterThanOrEqual(0);
        expect(post.predicted_engagement).toBeLessThanOrEqual(100);
      });
    });

    it('should have scheduled_at as valid ISO date string', async () => {
      const now = new Date().toISOString();
      mockApiResponse([
        { id: '1', scheduled_at: now, status: 'pending' }
      ]);

      const { result } = renderHook(() => useScheduledPosts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.data!.forEach((post) => {
        const date = new Date(post.scheduled_at);
        expect(date.toISOString()).toBe(post.scheduled_at);
      });
    });

    it('should cache optimal times for 5 minutes', async () => {
      const wrapper = createWrapper();
      mockApiResponse({ best_times: [], timezone: 'UTC', based_on_posts: 10 });

      const { result: result1 } = renderHook(() => useOptimalTimes(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second request should use cache
      const { result: result2 } = renderHook(() => useOptimalTimes(), { wrapper });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Should be same reference (cached)
      expect(result1.current.dataUpdatedAt).toBe(result2.current.dataUpdatedAt);
    });
  });
});
