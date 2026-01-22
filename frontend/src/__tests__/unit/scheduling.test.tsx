/**
 * Scheduling Hooks Tests
 * Tests for scheduling-related hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useOptimalTimes,
  useScheduledPosts,
  useEngagementPrediction,
  useCreateScheduledPost,
  useUpdateScheduledPost,
  useDeleteScheduledPost,
} from '@/lib/scheduling';
import { api } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  api: {
    getOptimalTimes: jest.fn(),
    getScheduledPosts: jest.fn(),
    predictEngagement: jest.fn(),
    createScheduledPost: jest.fn(),
    updateScheduledPost: jest.fn(),
    deleteScheduledPost: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Wrapper with QueryClient
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useOptimalTimes Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch optimal times successfully', async () => {
    const mockData = {
      best_times: [{ hour: 9, day: 1, score: 0.9, label: 'Monday 9AM' }],
      timezone: 'UTC',
      based_on_posts: 100,
    };

    mockApi.getOptimalTimes.mockResolvedValue({ success: true, data: mockData });

    const { result } = renderHook(() => useOptimalTimes(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle fetch error', async () => {
    mockApi.getOptimalTimes.mockResolvedValue({ success: false, error: 'Failed' });

    const { result } = renderHook(() => useOptimalTimes(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed');
  });
});

describe('useScheduledPosts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch scheduled posts successfully', async () => {
    const mockPosts = [
      { id: '1', content: 'Test post', scheduled_at: '2024-01-01T10:00:00Z', status: 'pending' as const, platform: 'twitter' as const, predicted_engagement: 0.8, created_at: '2024-01-01T00:00:00Z' },
    ];

    mockApi.getScheduledPosts.mockResolvedValue({ success: true, data: mockPosts });

    const { result } = renderHook(() => useScheduledPosts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPosts);
  });

  it('should fetch with status filter', async () => {
    mockApi.getScheduledPosts.mockResolvedValue({ success: true, data: [] });

    renderHook(() => useScheduledPosts('pending'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockApi.getScheduledPosts).toHaveBeenCalledWith('pending');
    });
  });

  it('should handle fetch error', async () => {
    mockApi.getScheduledPosts.mockResolvedValue({ success: false, error: 'Error' });

    const { result } = renderHook(() => useScheduledPosts(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useEngagementPrediction Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should predict engagement successfully', async () => {
    const mockPrediction = {
      score: 0.85,
      confidence: 0.9,
      factors: {
        time_of_day: 0.8,
        day_of_week: 0.7,
        content_length: 0.6,
        has_media: 0.5,
        historical_performance: 0.9,
      },
      suggested_improvements: ['Add media', 'Post earlier'],
    };

    mockApi.predictEngagement.mockResolvedValue({ success: true, data: mockPrediction });

    const { result } = renderHook(() => useEngagementPrediction(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ content: 'Test content' });
    });

    expect(mockApi.predictEngagement).toHaveBeenCalledWith({
      content: 'Test content',
      scheduled_at: undefined,
      has_media: undefined,
    });
  });

  it('should handle prediction error', async () => {
    mockApi.predictEngagement.mockResolvedValue({ success: false, error: 'Prediction failed' });

    const { result } = renderHook(() => useEngagementPrediction(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ content: 'Test' });
      })
    ).rejects.toThrow('Prediction failed');
  });
});

describe('useCreateScheduledPost Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create scheduled post successfully', async () => {
    const mockPost = { id: '1', content: 'New post', scheduled_at: '2024-01-01T10:00:00Z', status: 'pending' as const, platform: 'twitter' as const, predicted_engagement: 0.8, created_at: '2024-01-01T00:00:00Z' };

    mockApi.createScheduledPost.mockResolvedValue({ success: true, data: mockPost });

    const { result } = renderHook(() => useCreateScheduledPost(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        content: 'New post',
        scheduledAt: '2024-01-01T10:00:00Z',
        platform: 'twitter',
      });
    });

    expect(mockApi.createScheduledPost).toHaveBeenCalledWith({
      content: 'New post',
      scheduled_at: '2024-01-01T10:00:00Z',
      platform: 'twitter',
    });
  });

  it('should handle create error', async () => {
    mockApi.createScheduledPost.mockResolvedValue({ success: false, error: 'Create failed' });

    const { result } = renderHook(() => useCreateScheduledPost(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          content: 'Test',
          scheduledAt: '2024-01-01T10:00:00Z',
          platform: 'both',
        });
      })
    ).rejects.toThrow('Create failed');
  });
});

describe('useUpdateScheduledPost Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update scheduled post successfully', async () => {
    const mockPost = { id: '1', content: 'Updated', scheduled_at: '2024-01-01T10:00:00Z', status: 'pending' as const, platform: 'twitter' as const, predicted_engagement: 0.8, created_at: '2024-01-01T00:00:00Z' };

    mockApi.updateScheduledPost.mockResolvedValue({ success: true, data: mockPost });

    const { result } = renderHook(() => useUpdateScheduledPost(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', content: 'Updated' });
    });

    expect(mockApi.updateScheduledPost).toHaveBeenCalledWith('1', {
      content: 'Updated',
      scheduled_at: undefined,
    });
  });

  it('should handle update error', async () => {
    mockApi.updateScheduledPost.mockResolvedValue({ success: false, error: 'Update failed' });

    const { result } = renderHook(() => useUpdateScheduledPost(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ id: '1', content: 'Test' });
      })
    ).rejects.toThrow('Update failed');
  });
});

describe('useDeleteScheduledPost Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete scheduled post successfully', async () => {
    mockApi.deleteScheduledPost.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteScheduledPost(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(mockApi.deleteScheduledPost).toHaveBeenCalledWith('1');
  });

  it('should handle delete error', async () => {
    mockApi.deleteScheduledPost.mockResolvedValue({ success: false, error: 'Delete failed' });

    const { result } = renderHook(() => useDeleteScheduledPost(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync('1');
      })
    ).rejects.toThrow('Delete failed');
  });
});
