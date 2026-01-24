/**
 * Extended tests for useRealtimeNotifications and useNotify hooks
 * Focus on branch coverage
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useRealtimeNotifications, useNotify } from '@/hooks/useRealtimeNotifications';

// Mock the dependencies
const mockAddToast = jest.fn();
const mockMessageHandlers = new Map<string, (payload: unknown) => void>();

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

jest.mock('@/providers/RealtimeProvider', () => ({
  useRealtimeMessage: (type: string, handler: (payload: unknown) => void) => {
    mockMessageHandlers.set(type, handler);
    React.useEffect(() => {
      return () => {
        mockMessageHandlers.delete(type);
      };
    }, [type, handler]);
  },
}));

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageHandlers.clear();
  });

  describe('notification event handling', () => {
    it('shows toast for notification events', () => {
      renderHook(() => useRealtimeNotifications());
      
      const notificationHandler = mockMessageHandlers.get('notification');
      expect(notificationHandler).toBeDefined();
      
      act(() => {
        notificationHandler!({
          id: 'notif-1',
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test message',
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test message',
      });
    });
  });

  describe('sync.complete event handling', () => {
    it('shows toast when showSyncNotifications is true (default)', () => {
      renderHook(() => useRealtimeNotifications());
      
      const syncCompleteHandler = mockMessageHandlers.get('sync.complete');
      
      act(() => {
        syncCompleteHandler!({
          operation_id: 'op-1',
          synced: 42,
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Sync Completed',
        message: 'Successfully synced 42 items',
      });
    });

    it('does not show toast when showSyncNotifications is false', () => {
      renderHook(() => useRealtimeNotifications({ showSyncNotifications: false }));
      
      const syncCompleteHandler = mockMessageHandlers.get('sync.complete');
      
      act(() => {
        syncCompleteHandler!({
          operation_id: 'op-1',
          synced: 42,
        });
      });
      
      // Should not be called for sync.complete
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('cleanup.complete event handling', () => {
    it('shows toast when showCleanupNotifications is true (default)', () => {
      renderHook(() => useRealtimeNotifications());
      
      const cleanupCompleteHandler = mockMessageHandlers.get('cleanup.complete');
      
      act(() => {
        cleanupCompleteHandler!({
          rule_id: 5,
          deleted: 100,
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Cleanup Completed',
        message: 'Deleted 100 items from rule #5',
      });
    });

    it('does not show toast when showCleanupNotifications is false', () => {
      renderHook(() => useRealtimeNotifications({ showCleanupNotifications: false }));
      
      const cleanupCompleteHandler = mockMessageHandlers.get('cleanup.complete');
      
      act(() => {
        cleanupCompleteHandler!({
          rule_id: 5,
          deleted: 100,
        });
      });
      
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('job.completed event handling', () => {
    it('shows success toast for completed sync job', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-123',
          job_type: 'sync',
          status: 'completed',
          result: { synced: 50 },
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Sync Job Completed',
        message: 'Job job-123 finished successfully',
      });
    });

    it('shows success toast for completed cleanup job', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-456',
          job_type: 'cleanup',
          status: 'completed',
          result: { deleted: 25 },
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Cleanup Job Completed',
        message: 'Job job-456 finished successfully',
      });
    });

    it('shows success toast without message when result is empty', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-789',
          job_type: 'sync',
          status: 'completed',
          result: null,
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Sync Job Completed',
        message: undefined,
      });
    });

    it('shows error toast for failed sync job', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-fail',
          job_type: 'sync',
          status: 'failed',
          error: 'Rate limit exceeded',
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Sync Job Failed',
        message: 'Rate limit exceeded',
      });
    });

    it('shows error toast for failed cleanup job', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-fail',
          job_type: 'cleanup',
          status: 'failed',
          error: 'Permission denied',
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Cleanup Job Failed',
        message: 'Permission denied',
      });
    });

    it('shows default error message when error is not provided', () => {
      renderHook(() => useRealtimeNotifications());
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-fail',
          job_type: 'sync',
          status: 'failed',
        });
      });
      
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Sync Job Failed',
        message: 'Job job-fail failed',
      });
    });

    it('does not show toast when showJobCompletedNotifications is false', () => {
      renderHook(() => useRealtimeNotifications({ showJobCompletedNotifications: false }));
      
      const jobCompletedHandler = mockMessageHandlers.get('job.completed');
      
      act(() => {
        jobCompletedHandler!({
          job_id: 'job-123',
          job_type: 'sync',
          status: 'completed',
          result: { synced: 50 },
        });
      });
      
      expect(mockAddToast).not.toHaveBeenCalled();
    });
  });

  describe('options combinations', () => {
    it('respects all options being false', () => {
      renderHook(() => useRealtimeNotifications({
        showSyncNotifications: false,
        showCleanupNotifications: false,
        showJobCompletedNotifications: false,
      }));
      
      // Trigger all event types
      act(() => {
        mockMessageHandlers.get('sync.complete')!({ operation_id: 'op-1', synced: 10 });
        mockMessageHandlers.get('cleanup.complete')!({ rule_id: 1, deleted: 5 });
        mockMessageHandlers.get('job.completed')!({ job_id: 'j-1', job_type: 'sync', status: 'completed' });
      });
      
      // Only notification events should trigger toast (they're always shown)
      expect(mockAddToast).not.toHaveBeenCalled();
    });

    it('respects mixed options', () => {
      renderHook(() => useRealtimeNotifications({
        showSyncNotifications: true,
        showCleanupNotifications: false,
        showJobCompletedNotifications: true,
      }));
      
      // Trigger sync.complete - should show
      act(() => {
        mockMessageHandlers.get('sync.complete')!({ operation_id: 'op-1', synced: 10 });
      });
      expect(mockAddToast).toHaveBeenCalledTimes(1);
      
      // Trigger cleanup.complete - should not show
      act(() => {
        mockMessageHandlers.get('cleanup.complete')!({ rule_id: 1, deleted: 5 });
      });
      expect(mockAddToast).toHaveBeenCalledTimes(1); // Still 1
      
      // Trigger job.completed - should show
      act(() => {
        mockMessageHandlers.get('job.completed')!({ job_id: 'j-1', job_type: 'sync', status: 'completed', result: {} });
      });
      expect(mockAddToast).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useNotify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifySyncStarted shows info toast', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifySyncStarted('job-123');
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'info',
      title: 'Sync Started',
      message: 'Job job-123 is now running',
      duration: 3000,
    });
  });

  it('notifySyncCompleted shows success toast', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifySyncCompleted('job-123', 42);
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'Sync Completed',
      message: 'Successfully synced 42 items',
    });
  });

  it('notifySyncFailed shows error toast with long duration', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifySyncFailed('job-123', 'Network error');
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Sync Failed',
      message: 'Network error',
      duration: 10000,
    });
  });

  it('notifyCleanupStarted shows info toast', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifyCleanupStarted(5);
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'info',
      title: 'Cleanup Started',
      message: 'Rule #5 is now running',
      duration: 3000,
    });
  });

  it('notifyCleanupCompleted shows success toast', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifyCleanupCompleted(5, 100);
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      title: 'Cleanup Completed',
      message: 'Deleted 100 items',
    });
  });

  it('notifyCleanupFailed shows error toast with long duration', () => {
    const { result } = renderHook(() => useNotify());
    
    act(() => {
      result.current.notifyCleanupFailed(5, 'Permission denied');
    });
    
    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      title: 'Cleanup Failed',
      message: 'Permission denied',
      duration: 10000,
    });
  });

  it('returns all notify functions', () => {
    const { result } = renderHook(() => useNotify());
    
    expect(result.current).toHaveProperty('notifySyncStarted');
    expect(result.current).toHaveProperty('notifySyncCompleted');
    expect(result.current).toHaveProperty('notifySyncFailed');
    expect(result.current).toHaveProperty('notifyCleanupStarted');
    expect(result.current).toHaveProperty('notifyCleanupCompleted');
    expect(result.current).toHaveProperty('notifyCleanupFailed');
  });
});
