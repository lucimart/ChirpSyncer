/**
 * Realtime Notifications Hook Tests
 * Tests for useRealtimeNotifications and useNotify hooks
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { useRealtimeNotifications, useNotify } from '@/hooks/useRealtimeNotifications';

// Wrapper with all providers
const createWrapper = () => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </ToastProvider>
    </ThemeProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useRealtimeNotifications Hook', () => {
  it('should initialize with default options', () => {
    const { result } = renderHook(() => useRealtimeNotifications(), { wrapper: createWrapper() });
    // Hook doesn't return anything, just sets up listeners
    expect(result.current).toBeUndefined();
  });

  it('should accept custom options', () => {
    const { result } = renderHook(
      () =>
        useRealtimeNotifications({
          showSyncNotifications: false,
          showCleanupNotifications: false,
          showJobCompletedNotifications: false,
        }),
      { wrapper: createWrapper() }
    );
    expect(result.current).toBeUndefined();
  });

  it('should accept partial options', () => {
    const { result } = renderHook(
      () =>
        useRealtimeNotifications({
          showSyncNotifications: true,
        }),
      { wrapper: createWrapper() }
    );
    expect(result.current).toBeUndefined();
  });
});

describe('useNotify Hook', () => {
  it('should return notification functions', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    expect(result.current.notifySyncStarted).toBeDefined();
    expect(result.current.notifySyncCompleted).toBeDefined();
    expect(result.current.notifySyncFailed).toBeDefined();
    expect(result.current.notifyCleanupStarted).toBeDefined();
    expect(result.current.notifyCleanupCompleted).toBeDefined();
    expect(result.current.notifyCleanupFailed).toBeDefined();
  });

  it('should call notifySyncStarted', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifySyncStarted('job-123');
    });
    // Toast should be added (we can't easily verify without mocking useToast)
  });

  it('should call notifySyncCompleted', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifySyncCompleted('job-123', 10);
    });
  });

  it('should call notifySyncFailed', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifySyncFailed('job-123', 'Network error');
    });
  });

  it('should call notifyCleanupStarted', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifyCleanupStarted(1);
    });
  });

  it('should call notifyCleanupCompleted', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifyCleanupCompleted(1, 5);
    });
  });

  it('should call notifyCleanupFailed', () => {
    const { result } = renderHook(() => useNotify(), { wrapper: createWrapper() });

    act(() => {
      result.current.notifyCleanupFailed(1, 'Cleanup error');
    });
  });
});
