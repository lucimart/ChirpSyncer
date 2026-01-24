/**
 * useSyncProgress and useCleanupProgress Hook Tests
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useCleanupProgress } from '@/hooks/useCleanupProgress';

// Mock the RealtimeProvider hooks
const mockSubscribe = jest.fn();
const mockMessageHandlers = new Map<string, (payload: unknown) => void>();

jest.mock('@/providers/RealtimeProvider', () => ({
  useRealtime: () => ({
    subscribe: mockSubscribe,
    status: 'connected',
    sendMessage: jest.fn(),
    joinRoom: jest.fn(),
  }),
  useRealtimeMessage: (type: string, handler: (payload: unknown) => void) => {
    mockMessageHandlers.set(type, handler);
    // Return cleanup function
    React.useEffect(() => {
      return () => {
        mockMessageHandlers.delete(type);
      };
    }, [type, handler]);
  },
}));

describe('useSyncProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageHandlers.clear();
  });

  it('initializes with empty jobs array', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    expect(result.current.jobs).toEqual([]);
    expect(result.current.currentJob).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('tracks job progress when sync.progress message is received', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    expect(progressHandler).toBeDefined();
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing posts...',
        correlation_id: 'corr-1',
      });
    });
    
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0]).toMatchObject({
      jobId: 'job-1',
      status: 'running',
      current: 5,
      total: 10,
      message: 'Syncing posts...',
    });
  });

  it('marks job as completed when message contains "completed"', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 10,
        total: 10,
        message: 'Sync completed successfully',
        correlation_id: 'corr-1',
      });
    });
    
    expect(result.current.jobs[0].status).toBe('completed');
  });

  it('marks job as failed when message contains "failed"', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Sync failed due to rate limit',
        correlation_id: 'corr-1',
      });
    });
    
    expect(result.current.jobs[0].status).toBe('failed');
  });

  it('filters by jobId when specified', () => {
    const { result } = renderHook(() => useSyncProgress({ jobId: 'job-1' }));
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    // Send progress for different job
    act(() => {
      progressHandler!({
        operation_id: 'job-2',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
    });
    
    // Should not be tracked
    expect(result.current.jobs).toHaveLength(0);
    
    // Send progress for matching job
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
    });
    
    // Should be tracked
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.currentJob).toBeDefined();
  });

  it('calls onComplete callback when sync.complete is received', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useSyncProgress({ onComplete }));
    
    const completeHandler = mockMessageHandlers.get('sync.complete');
    
    act(() => {
      completeHandler!({
        operation_id: 'job-1',
        synced: 25,
      });
    });
    
    expect(onComplete).toHaveBeenCalledWith('job-1', 25);
    expect(result.current.jobs[0].status).toBe('completed');
  });

  it('handles job.completed event for sync jobs', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();
    renderHook(() => useSyncProgress({ onComplete, onError }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    // Test completed status
    act(() => {
      jobCompletedHandler!({
        job_id: 'job-1',
        job_type: 'sync',
        status: 'completed',
        result: { synced: 15 },
      });
    });
    
    expect(onComplete).toHaveBeenCalledWith('job-1', 15);
  });

  it('handles job.completed event with failed status', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();
    renderHook(() => useSyncProgress({ onComplete, onError }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    act(() => {
      jobCompletedHandler!({
        job_id: 'job-1',
        job_type: 'sync',
        status: 'failed',
        error: 'Rate limit exceeded',
      });
    });
    
    expect(onError).toHaveBeenCalledWith('job-1', 'Rate limit exceeded');
  });

  it('ignores job.completed events for non-sync jobs', () => {
    const onComplete = jest.fn();
    renderHook(() => useSyncProgress({ onComplete }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    act(() => {
      jobCompletedHandler!({
        job_id: 'job-1',
        job_type: 'cleanup',
        status: 'completed',
        result: { deleted: 10 },
      });
    });
    
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('getJob returns specific job by id', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
      progressHandler!({
        operation_id: 'job-2',
        current: 3,
        total: 20,
        message: 'Syncing...',
      });
    });
    
    const job1 = result.current.getJob('job-1');
    expect(job1?.jobId).toBe('job-1');
    expect(job1?.current).toBe(5);
    
    const job2 = result.current.getJob('job-2');
    expect(job2?.jobId).toBe('job-2');
    expect(job2?.current).toBe(3);
    
    const nonExistent = result.current.getJob('job-999');
    expect(nonExistent).toBeUndefined();
  });

  it('clearJob removes specific job', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
      progressHandler!({
        operation_id: 'job-2',
        current: 3,
        total: 20,
        message: 'Syncing...',
      });
    });
    
    expect(result.current.jobs).toHaveLength(2);
    
    act(() => {
      result.current.clearJob('job-1');
    });
    
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.jobs[0].jobId).toBe('job-2');
  });

  it('clearAll removes all jobs', () => {
    const { result } = renderHook(() => useSyncProgress());
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
      progressHandler!({
        operation_id: 'job-2',
        current: 3,
        total: 20,
        message: 'Syncing...',
      });
    });
    
    expect(result.current.jobs).toHaveLength(2);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.jobs).toHaveLength(0);
  });

  it('returns correct status flags for currentJob', () => {
    const { result } = renderHook(() => useSyncProgress({ jobId: 'job-1' }));
    
    const progressHandler = mockMessageHandlers.get('sync.progress');
    
    // Running state
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 5,
        total: 10,
        message: 'Syncing...',
      });
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
    
    // Completed state
    act(() => {
      progressHandler!({
        operation_id: 'job-1',
        current: 10,
        total: 10,
        message: 'Sync completed',
      });
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.isFailed).toBe(false);
  });
});

describe('useCleanupProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageHandlers.clear();
  });

  it('initializes with empty rules array', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    expect(result.current.rules).toEqual([]);
    expect(result.current.currentRule).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('tracks rule progress when cleanup.progress message is received', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    expect(progressHandler).toBeDefined();
    
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
        current_tweet: 'tweet-123',
        correlation_id: 'corr-1',
      });
    });
    
    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0]).toMatchObject({
      ruleId: 1,
      status: 'running',
      deleted: 5,
      total: 10,
      currentTweet: 'tweet-123',
    });
  });

  it('marks rule as completed when deleted equals total', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 10,
        total: 10,
        current_tweet: 'tweet-last',
      });
    });
    
    expect(result.current.rules[0].status).toBe('completed');
  });

  it('filters by ruleId when specified', () => {
    const { result } = renderHook(() => useCleanupProgress({ ruleId: 1 }));
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    // Send progress for different rule
    act(() => {
      progressHandler!({
        rule_id: 2,
        deleted: 5,
        total: 10,
      });
    });
    
    // Should not be tracked
    expect(result.current.rules).toHaveLength(0);
    
    // Send progress for matching rule
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
      });
    });
    
    // Should be tracked
    expect(result.current.rules).toHaveLength(1);
    expect(result.current.currentRule).toBeDefined();
  });

  it('calls onComplete callback when cleanup.complete is received', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCleanupProgress({ onComplete }));
    
    const completeHandler = mockMessageHandlers.get('cleanup.complete');
    
    act(() => {
      completeHandler!({
        rule_id: 1,
        deleted: 25,
      });
    });
    
    expect(onComplete).toHaveBeenCalledWith(1, 25);
    expect(result.current.rules[0].status).toBe('completed');
  });

  it('handles job.completed event for cleanup jobs', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();
    renderHook(() => useCleanupProgress({ onComplete, onError }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    // Test completed status
    act(() => {
      jobCompletedHandler!({
        job_id: '1',
        job_type: 'cleanup',
        status: 'completed',
        result: { deleted: 15 },
      });
    });
    
    expect(onComplete).toHaveBeenCalledWith(1, 15);
  });

  it('handles job.completed event with failed status', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();
    renderHook(() => useCleanupProgress({ onComplete, onError }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    act(() => {
      jobCompletedHandler!({
        job_id: '1',
        job_type: 'cleanup',
        status: 'failed',
        error: 'Permission denied',
      });
    });
    
    expect(onError).toHaveBeenCalledWith(1, 'Permission denied');
  });

  it('ignores job.completed events for non-cleanup jobs', () => {
    const onComplete = jest.fn();
    renderHook(() => useCleanupProgress({ onComplete }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    act(() => {
      jobCompletedHandler!({
        job_id: '1',
        job_type: 'sync',
        status: 'completed',
        result: { synced: 10 },
      });
    });
    
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ignores job.completed events with invalid ruleId', () => {
    const onComplete = jest.fn();
    renderHook(() => useCleanupProgress({ onComplete }));
    
    const jobCompletedHandler = mockMessageHandlers.get('job.completed');
    
    act(() => {
      jobCompletedHandler!({
        job_id: 'not-a-number',
        job_type: 'cleanup',
        status: 'completed',
        result: { deleted: 10 },
      });
    });
    
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('getRule returns specific rule by id', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
      });
      progressHandler!({
        rule_id: 2,
        deleted: 3,
        total: 20,
      });
    });
    
    const rule1 = result.current.getRule(1);
    expect(rule1?.ruleId).toBe(1);
    expect(rule1?.deleted).toBe(5);
    
    const rule2 = result.current.getRule(2);
    expect(rule2?.ruleId).toBe(2);
    expect(rule2?.deleted).toBe(3);
    
    const nonExistent = result.current.getRule(999);
    expect(nonExistent).toBeUndefined();
  });

  it('clearRule removes specific rule', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
      });
      progressHandler!({
        rule_id: 2,
        deleted: 3,
        total: 20,
      });
    });
    
    expect(result.current.rules).toHaveLength(2);
    
    act(() => {
      result.current.clearRule(1);
    });
    
    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0].ruleId).toBe(2);
  });

  it('clearAll removes all rules', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
      });
      progressHandler!({
        rule_id: 2,
        deleted: 3,
        total: 20,
      });
    });
    
    expect(result.current.rules).toHaveLength(2);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.rules).toHaveLength(0);
  });

  it('returns correct status flags for currentRule', () => {
    const { result } = renderHook(() => useCleanupProgress({ ruleId: 1 }));
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    
    // Running state
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
      });
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
    
    // Completed state
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 10,
        total: 10,
      });
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.isFailed).toBe(false);
  });

  it('preserves correlationId from existing rule on complete', () => {
    const { result } = renderHook(() => useCleanupProgress());
    
    const progressHandler = mockMessageHandlers.get('cleanup.progress');
    const completeHandler = mockMessageHandlers.get('cleanup.complete');
    
    // First, add a rule with correlationId
    act(() => {
      progressHandler!({
        rule_id: 1,
        deleted: 5,
        total: 10,
        correlation_id: 'corr-123',
      });
    });
    
    // Then complete it
    act(() => {
      completeHandler!({
        rule_id: 1,
        deleted: 10,
      });
    });
    
    expect(result.current.rules[0].correlationId).toBe('corr-123');
  });
});
