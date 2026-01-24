/**
 * Hooks Unit Tests
 * Tests for useAdminUsers, useSyncProgress, useCleanupProgress hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { RealtimeProvider, useRealtimeMessage } from '@/providers/RealtimeProvider';
import { useAdminUsers, useAdminUser, useUpdateAdminUser, useDeleteAdminUser, useToggleUserActive, useToggleUserAdmin } from '@/hooks/useAdminUsers';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { useCleanupProgress } from '@/hooks/useCleanupProgress';
import { api } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  api: {
    getAdminUsers: jest.fn(),
    getAdminUser: jest.fn(),
    updateAdminUser: jest.fn(),
    deleteAdminUser: jest.fn(),
    toggleUserActive: jest.fn(),
    toggleUserAdmin: jest.fn(),
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

// Wrapper with all providers
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <ToastProvider>
          <RealtimeProvider>{children}</RealtimeProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useAdminUsers Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAdminUsers', () => {
    it('should fetch admin users successfully', async () => {
      const mockUsers = [
        { id: '1', username: 'admin', email: 'admin@test.com', is_active: true, is_admin: true, created_at: '2024-01-01', last_login: null },
        { id: '2', username: 'user', email: 'user@test.com', is_active: true, is_admin: false, created_at: '2024-01-02', last_login: '2024-01-03' },
      ];

      mockApi.getAdminUsers.mockResolvedValue({ success: true, data: mockUsers });

      const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUsers);
    });

    it('should handle fetch error', async () => {
      mockApi.getAdminUsers.mockResolvedValue({ success: false, error: 'Unauthorized' });

      const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Unauthorized');
    });

    it('should pass search params', async () => {
      mockApi.getAdminUsers.mockResolvedValue({ success: true, data: [] });

      renderHook(() => useAdminUsers({ search: 'test', page: 1, limit: 10 }), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockApi.getAdminUsers).toHaveBeenCalledWith({ search: 'test', page: 1, limit: 10 });
      });
    });
  });

  describe('useAdminUser', () => {
    it('should fetch single admin user', async () => {
      const mockUser = { id: '1', username: 'admin', email: 'admin@test.com', is_active: true, is_admin: true, created_at: '2024-01-01', last_login: null };

      mockApi.getAdminUser.mockResolvedValue({ success: true, data: mockUser });

      const { result } = renderHook(() => useAdminUser('1'), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useAdminUser(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(mockApi.getAdminUser).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateAdminUser', () => {
    it('should update admin user', async () => {
      const updatedUser = { id: '1', username: 'admin', email: 'new@test.com', is_active: true, is_admin: true, created_at: '2024-01-01', last_login: null };

      mockApi.updateAdminUser.mockResolvedValue({ success: true, data: updatedUser });

      const { result } = renderHook(() => useUpdateAdminUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '1', email: 'new@test.com' });
      });

      expect(mockApi.updateAdminUser).toHaveBeenCalledWith('1', { email: 'new@test.com' });
    });

    it('should handle update error', async () => {
      mockApi.updateAdminUser.mockResolvedValue({ success: false, error: 'Update failed' });

      const { result } = renderHook(() => useUpdateAdminUser(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ id: '1', email: 'new@test.com' });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useDeleteAdminUser', () => {
    it('should delete admin user', async () => {
      mockApi.deleteAdminUser.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteAdminUser(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockApi.deleteAdminUser).toHaveBeenCalledWith('1');
    });

    it('should handle delete error', async () => {
      mockApi.deleteAdminUser.mockResolvedValue({ success: false, error: 'Delete failed' });

      const { result } = renderHook(() => useDeleteAdminUser(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('1');
        })
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('useToggleUserActive', () => {
    it('should toggle user active status', async () => {
      const toggledUser = { id: '1', username: 'admin', email: 'admin@test.com', is_active: false, is_admin: true, created_at: '2024-01-01', last_login: null };

      mockApi.toggleUserActive.mockResolvedValue({ success: true, data: toggledUser });

      const { result } = renderHook(() => useToggleUserActive(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockApi.toggleUserActive).toHaveBeenCalledWith('1');
    });
  });

  describe('useToggleUserAdmin', () => {
    it('should toggle user admin status', async () => {
      const toggledUser = { id: '1', username: 'admin', email: 'admin@test.com', is_active: true, is_admin: false, created_at: '2024-01-01', last_login: null };

      mockApi.toggleUserAdmin.mockResolvedValue({ success: true, data: toggledUser });

      const { result } = renderHook(() => useToggleUserAdmin(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockApi.toggleUserAdmin).toHaveBeenCalledWith('1');
    });
  });
});

describe('useSyncProgress Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSyncProgress(), { wrapper: createWrapper() });

    expect(result.current.jobs).toEqual([]);
    expect(result.current.currentJob).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('should provide getJob function', () => {
    const { result } = renderHook(() => useSyncProgress(), { wrapper: createWrapper() });

    expect(result.current.getJob('test-job')).toBeUndefined();
  });

  it('should provide clearJob function', () => {
    const { result } = renderHook(() => useSyncProgress(), { wrapper: createWrapper() });

    act(() => {
      result.current.clearJob('test-job');
    });

    expect(result.current.jobs).toEqual([]);
  });

  it('should provide clearAll function', () => {
    const { result } = renderHook(() => useSyncProgress(), { wrapper: createWrapper() });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.jobs).toEqual([]);
  });

  it('should accept options with jobId filter', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(
      () => useSyncProgress({ jobId: 'specific-job', onComplete, onError }),
      { wrapper: createWrapper() }
    );

    expect(result.current.currentJob).toBeUndefined();
  });
});

describe('useCleanupProgress Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useCleanupProgress(), { wrapper: createWrapper() });

    expect(result.current.rules).toEqual([]);
    expect(result.current.currentRule).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('should provide getRule function', () => {
    const { result } = renderHook(() => useCleanupProgress(), { wrapper: createWrapper() });

    expect(result.current.getRule(1)).toBeUndefined();
  });

  it('should provide clearRule function', () => {
    const { result } = renderHook(() => useCleanupProgress(), { wrapper: createWrapper() });

    act(() => {
      result.current.clearRule(1);
    });

    expect(result.current.rules).toEqual([]);
  });

  it('should provide clearAll function', () => {
    const { result } = renderHook(() => useCleanupProgress(), { wrapper: createWrapper() });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.rules).toEqual([]);
  });

  it('should accept options with ruleId filter', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(
      () => useCleanupProgress({ ruleId: 1, onComplete, onError }),
      { wrapper: createWrapper() }
    );

    expect(result.current.currentRule).toBeUndefined();
  });
});
