/**
 * Sprint 14: WebSocket Real-Time - Unit Tests
 * Tests connected to actual implementation in:
 * - src/providers/RealtimeProvider.tsx
 * - src/components/ui/Toast.tsx
 * - src/components/ui/ConnectionStatus.tsx
 */

import { act, waitFor } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { ReactNode } from 'react';

import {
  RealtimeProvider,
  useRealtime,
  useRealtimeMessage,
  SyncProgressPayload,
  CleanupProgressPayload,
} from '@/providers/RealtimeProvider';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Test wrapper with all providers
const AllProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>
    <ToastProvider>
      <RealtimeProvider>{children}</RealtimeProvider>
    </ToastProvider>
  </ThemeProvider>
);

const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>
    <ToastProvider>{children}</ToastProvider>
  </ThemeProvider>
);
// Helper to get the current mock WebSocket instance
const getMockWS = () => {
  // Access the MockWebSocket class instances
  const instances = (global.WebSocket as any).__instances__;
  if (!instances || instances.length === 0) {
    throw new Error('No WebSocket instances found');
  }
  return instances[instances.length - 1];
};


describe('Sprint 14: WebSocket Real-Time', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('US-071: WebSocket Connection Management', () => {
    it('should establish WebSocket connection when provider mounts', async () => {
      render(
        <AllProviders>
          <div>Test</div>
        </AllProviders>
      );

      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
        expect(instances[0].url).toContain('ws://localhost:5000/ws');
      });
    });

    it('should expose connection status to child components', async () => {
      const StatusComponent = () => {
        const { status } = useRealtime();
        return <div data-testid="status">{status}</div>;
      };

      render(
        <AllProviders>
          <StatusComponent />
        </AllProviders>
      );

      // Wait for auto-connection from setup.ts mock (setTimeout 0)

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('connected');
      });
    });

    it('should attempt reconnection on disconnect', async () => {
      jest.useFakeTimers();
      render(
        <AllProviders>
          <div>Test</div>
        </AllProviders>
      );

      // Wait for initial connection
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const mockWS = getMockWS();

      // Simulate disconnect

      act(() => {
        mockWS.readyState = WebSocket.CLOSED;
        mockWS.onclose?.(new CloseEvent('close'));
      });

      // Fast-forward past reconnect delay (3000ms in RealtimeProvider)
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Should have created a new WebSocket instance (initial + reconnect)
      const instances = (global.WebSocket as any).__instances__;
      expect(instances.length).toBe(2);

      jest.useRealTimers();
    });

    it('should stop reconnecting after 5 failed attempts', async () => {
      jest.useFakeTimers();

      // Disable auto-connect so we can control connection behavior
      (global.WebSocket as any).__setAutoConnect__(false);

      render(
        <AllProviders>
          <div>Test</div>
        </AllProviders>
      );

      const instances = (global.WebSocket as any).__instances__;

      // Initial connection attempt (1)
      expect(instances.length).toBe(1);

      // Simulate initial connection failure - close without ever opening
      act(() => {
        const ws = instances[0];
        ws.readyState = WebSocket.CLOSED;
        ws.onclose?.(new CloseEvent('close'));
      });

      // Simulate 5 reconnection attempts (each fails)
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(3100); // RECONNECT_DELAY + buffer
        });

        const ws = instances[instances.length - 1];
        act(() => {
          ws.readyState = WebSocket.CLOSED;
          ws.onclose?.(new CloseEvent('close'));
        });
      }

      // After 5 failed reconnects, should stop trying
      // Total: 1 initial + 5 reconnects = 6
      expect(instances.length).toBe(6);

      // Wait more time - should NOT create new connections
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Still 6 - no more reconnection attempts
      expect(instances.length).toBe(6);

      // Re-enable auto-connect for other tests
      (global.WebSocket as any).__setAutoConnect__(true);
      jest.useRealTimers();
    });

    it('should reset reconnect attempts after successful connection', async () => {
      jest.useFakeTimers();
      const StatusComponent = () => {
        const { status } = useRealtime();
        return <div data-testid="status">{status}</div>;
      };

      render(
        <AllProviders>
          <StatusComponent />
        </AllProviders>
      );

      // Wait for initial connection
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        const mockWS = getMockWS();
        act(() => {
          mockWS.onclose?.(new CloseEvent('close'));
        });
        await act(async () => {
          jest.advanceTimersByTime(3000);
        });
      }

      // Wait for successful reconnection (auto-connects via setup.ts mock)
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('connected');
      });

      jest.useRealTimers();
    });
  });

  describe('US-071: Sync Progress Updates', () => {
    it('should parse sync.progress message with current, total, and message', async () => {
      let receivedPayload: SyncProgressPayload | null = null;

      const TestComponent = () => {
        useRealtimeMessage('sync.progress', (payload) => {
          receivedPayload = payload;
        });
        return <div>Test</div>;
      };

      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
      });

      const mockWS = getMockWS();

      const syncMessage = {
        type: 'sync.progress',
        payload: {
          operation_id: 'sync-123',
          current: 50,
          total: 100,
          message: 'Syncing tweets...',
        },
      };

      act(() => {
        mockWS.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify(syncMessage) })
        );
      });

      await waitFor(() => {
        expect(receivedPayload).toEqual({
          operation_id: 'sync-123',
          current: 50,
          total: 100,
          message: 'Syncing tweets...',
        });
      });
    });

    it('should notify subscribers when sync.progress is received', async () => {
      const mockHandler = jest.fn();

      const TestComponent = () => {
        useRealtimeMessage('sync.progress', mockHandler);
        return <div>Test</div>;
      };

      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
      });

      const mockWS = getMockWS();

      act(() => {
        mockWS.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'sync.progress',
              payload: { operation_id: 'op-1', current: 1, total: 10, message: 'test' },
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledWith({
          operation_id: 'op-1',
          current: 1,
          total: 10,
          message: 'test',
        });
      });
    });

    it('should emit sync.complete with operation_id and synced count', async () => {
      let completedPayload: { operation_id: string; synced: number } | null = null;

      const TestComponent = () => {
        useRealtimeMessage('sync.complete', (payload) => {
          completedPayload = payload;
        });
        return <div>Test</div>;
      };

      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
      });

      const mockWS = getMockWS();

      act(() => {
        mockWS.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'sync.complete',
              payload: { operation_id: 'sync-456', synced: 150 },
            }),
          })
        );
      });

      await waitFor(() => {
        expect(completedPayload).toEqual({ operation_id: 'sync-456', synced: 150 });
      });
    });
  });

  describe('US-071: Cleanup Progress Updates', () => {
    it('should parse cleanup.progress with deleted, total, and current_item', async () => {
      let receivedPayload: CleanupProgressPayload | null = null;

      const TestComponent = () => {
        useRealtimeMessage('cleanup.progress', (payload) => {
          receivedPayload = payload;
        });
        return <div>Test</div>;
      };

      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
      });

      const mockWS = getMockWS();

      act(() => {
        mockWS.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'cleanup.progress',
              payload: { rule_id: 1, deleted: 25, total: 100, current_tweet: 'tweet-abc' },
            }),
          })
        );
      });

      await waitFor(() => {
        expect(receivedPayload).toEqual({
          rule_id: 1,
          deleted: 25,
          total: 100,
          current_tweet: 'tweet-abc',
        });
      });
    });

    it('should emit cleanup.complete with rule_id and deleted count', async () => {
      let completedPayload: { rule_id: number; deleted: number } | null = null;

      const TestComponent = () => {
        useRealtimeMessage('cleanup.complete', (payload) => {
          completedPayload = payload;
        });
        return <div>Test</div>;
      };

      render(
        <AllProviders>
          <TestComponent />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        const instances = (global.WebSocket as any).__instances__;
        expect(instances.length).toBeGreaterThan(0);
      });

      const mockWS = getMockWS();

      act(() => {
        mockWS.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'cleanup.complete',
              payload: { rule_id: 5, deleted: 200 },
            }),
          })
        );
      });

      await waitFor(() => {
        expect(completedPayload).toEqual({ rule_id: 5, deleted: 200 });
      });
    });
  });

  describe('US-071: Toast Notifications', () => {
    it('should support four toast types with distinct styling', () => {
      const ToastTestComponent = () => {
        const { addToast, toasts } = useToast();

        return (
          <div>
            <button onClick={() => addToast({ type: 'success', title: 'Success' })}>
              Add Success
            </button>
            <button onClick={() => addToast({ type: 'error', title: 'Error' })}>
              Add Error
            </button>
            <button onClick={() => addToast({ type: 'warning', title: 'Warning' })}>
              Add Warning
            </button>
            <button onClick={() => addToast({ type: 'info', title: 'Info' })}>
              Add Info
            </button>
            <div data-testid="toast-count">{toasts.length}</div>
          </div>
        );
      };

      render(
        <ThemeWrapper>
          <ToastTestComponent />
        </ThemeWrapper>
      );

      fireEvent.click(screen.getByText('Add Success'));
      fireEvent.click(screen.getByText('Add Error'));
      fireEvent.click(screen.getByText('Add Warning'));
      fireEvent.click(screen.getByText('Add Info'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('4');
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('should auto-dismiss toast after duration', async () => {
      jest.useFakeTimers();
      const ToastTestComponent = () => {
        const { addToast, toasts } = useToast();

        return (
          <div>
            <button onClick={() => addToast({ type: 'info', title: 'Auto', duration: 1000 })}>
              Add Toast
            </button>
            <div data-testid="toast-count">{toasts.length}</div>
          </div>
        );
      };

      render(
        <ThemeWrapper>
          <ToastTestComponent />
        </ThemeWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Wait for auto-dismiss (1000ms) + animation (300ms)
      act(() => {
        jest.advanceTimersByTime(1300);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });

      jest.useRealTimers();
    });

    it('should stack multiple toasts without overlap', () => {
      const ToastTestComponent = () => {
        const { addToast, toasts } = useToast();

        return (
          <div>
            <button
              onClick={() => {
                addToast({ type: 'info', title: 'Toast 1', duration: 0 });
                addToast({ type: 'success', title: 'Toast 2', duration: 0 });
                addToast({ type: 'warning', title: 'Toast 3', duration: 0 });
              }}
            >
              Add Toasts
            </button>
            <div data-testid="toast-count">{toasts.length}</div>
          </div>
        );
      };

      render(
        <ThemeWrapper>
          <ToastTestComponent />
        </ThemeWrapper>
      );

      fireEvent.click(screen.getByText('Add Toasts'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
    });

    it('should allow manual dismissal via close button', async () => {
      jest.useFakeTimers();
      const ToastTestComponent = () => {
        const { addToast, toasts } = useToast();

        return (
          <div>
            <button onClick={() => addToast({ type: 'info', title: 'Dismissable', duration: 0 })}>
              Add Toast
            </button>
            <div data-testid="toast-count">{toasts.length}</div>
          </div>
        );
      };

      render(
        <ThemeWrapper>
          <ToastTestComponent />
        </ThemeWrapper>
      );

      fireEvent.click(screen.getByText('Add Toast'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Find and click close button (X icon button with aria-label)
      const closeButton = screen.getByRole('button', { name: /dismiss notification/i });
      fireEvent.click(closeButton);

      // Wait for exit animation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });

      jest.useRealTimers();
    });
  });

  describe('US-071: Connection Status Indicator', () => {
    it('should show green indicator when connected', async () => {
      render(
        <AllProviders>
          <ConnectionStatus />
        </AllProviders>
      );

      // Wait for auto-connection from setup.ts mock
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('should show pulsing yellow indicator when connecting', async () => {
      jest.useFakeTimers();

      render(
        <AllProviders>
          <ConnectionStatus />
        </AllProviders>
      );

      // Check connecting state before auto-connection happens
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('should show red indicator when disconnected', async () => {
      render(
        <AllProviders>
          <ConnectionStatus />
        </AllProviders>
      );

      // Wait for auto-connection
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      const mockWS = getMockWS();

      act(() => {
        mockWS.readyState = WebSocket.CLOSED;
        mockWS.onclose?.(new CloseEvent('close'));
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });
});
