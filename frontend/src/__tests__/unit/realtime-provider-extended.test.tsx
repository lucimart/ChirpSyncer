/**
 * RealtimeProvider Extended Tests
 * Tests for WebSocket connection, reconnection, and message handling
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { 
  RealtimeProvider, 
  useRealtime, 
  useRealtimeMessage, 
  useConnectionStatus 
} from '@/providers/RealtimeProvider';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock WebSocket for test environment
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  });
}

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Helper to set NODE_ENV
const setNodeEnv = (value: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    writable: true,
    configurable: true,
  });
};

describe('RealtimeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global as any).WebSocket = MockWebSocket;
  });
  
  afterEach(() => {
    jest.useRealTimers();
    setNodeEnv(originalNodeEnv || 'test');
  });

  it('provides context to children', () => {
    const TestComponent = () => {
      const context = useRealtime();
      return <div data-testid="status">{context.status}</div>;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    expect(screen.getByTestId('status')).toBeInTheDocument();
  });

  it('throws error when useRealtime is used outside provider', () => {
    const TestComponent = () => {
      useRealtime();
      return null;
    };
    
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow(
      'useRealtime must be used within a RealtimeProvider'
    );
    
    consoleSpy.mockRestore();
  });

  it('connects to WebSocket in test environment', async () => {
    setNodeEnv('test');
    
    const TestComponent = () => {
      const { status } = useRealtime();
      return <div data-testid="status">{status}</div>;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    // Initially connecting
    expect(screen.getByTestId('status').textContent).toBe('connecting');
    
    // Wait for connection
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('connected');
    });
  });

  it('joins room with userId when provided', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    render(
      <RealtimeProvider userId={123}>
        <div>Test</div>
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    await waitFor(() => {
      expect(capturedSocket?.send).toHaveBeenCalledWith(
        JSON.stringify({ event: 'join', data: { user_id: 123 } })
      );
    });
  });

  it('handles incoming messages', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const messageHandler = jest.fn();
    
    const TestComponent = () => {
      const { subscribe } = useRealtime();
      React.useEffect(() => {
        return subscribe(messageHandler);
      }, [subscribe]);
      return null;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    // Simulate incoming message
    act(() => {
      if (capturedSocket?.onmessage) {
        capturedSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'sync.progress', payload: { current: 1, total: 10 } }),
        }));
      }
    });
    
    expect(messageHandler).toHaveBeenCalledWith({
      type: 'sync.progress',
      payload: { current: 1, total: 10 },
    });
  });

  it('ignores malformed messages', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const messageHandler = jest.fn();
    
    const TestComponent = () => {
      const { subscribe } = useRealtime();
      React.useEffect(() => {
        return subscribe(messageHandler);
      }, [subscribe]);
      return null;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    // Simulate malformed message
    act(() => {
      if (capturedSocket?.onmessage) {
        capturedSocket.onmessage(new MessageEvent('message', {
          data: 'not valid json',
        }));
      }
    });
    
    // Handler should not be called for malformed messages
    expect(messageHandler).not.toHaveBeenCalled();
  });

  it('unsubscribes handler when cleanup is called', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const messageHandler = jest.fn();
    let unsubscribe: (() => void) | null = null;
    
    const TestComponent = () => {
      const { subscribe } = useRealtime();
      React.useEffect(() => {
        unsubscribe = subscribe(messageHandler);
        return unsubscribe;
      }, [subscribe]);
      return null;
    };
    
    const { unmount } = render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    // Unsubscribe
    act(() => {
      if (unsubscribe) unsubscribe();
    });
    
    // Simulate message after unsubscribe
    act(() => {
      if (capturedSocket?.onmessage) {
        capturedSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'sync.progress', payload: {} }),
        }));
      }
    });
    
    // Handler should not be called after unsubscribe
    expect(messageHandler).not.toHaveBeenCalled();
    
    unmount();
  });

  it('sendMessage sends data via WebSocket', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const TestComponent = () => {
      const { sendMessage } = useRealtime();
      React.useEffect(() => {
        // Wait for connection before sending
        setTimeout(() => {
          sendMessage('test-event', { data: 'test' });
        }, 50);
      }, [sendMessage]);
      return null;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(capturedSocket?.send).toHaveBeenCalledWith(
        JSON.stringify({ event: 'test-event', data: { data: 'test' } })
      );
    });
  });

  it('joinRoom sends join event', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const TestComponent = () => {
      const { joinRoom } = useRealtime();
      React.useEffect(() => {
        setTimeout(() => {
          joinRoom(456);
        }, 50);
      }, [joinRoom]);
      return null;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(capturedSocket?.send).toHaveBeenCalledWith(
        JSON.stringify({ event: 'join', data: { user_id: 456 } })
      );
    });
  });

  it('disconnects on unmount', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const { unmount } = render(
      <RealtimeProvider>
        <div>Test</div>
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    unmount();
    
    expect((capturedSocket as MockWebSocket | null)?.close).toHaveBeenCalled();
  });

  it('sets error status on WebSocket error', async () => {
    setNodeEnv('test');
    
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const TestComponent = () => {
      const { status } = useRealtime();
      return <div data-testid="status">{status}</div>;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    // Simulate error
    act(() => {
      if (capturedSocket?.onerror) {
        capturedSocket.onerror(new Event('error'));
      }
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
    });
  });
});

describe('useRealtimeMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global as any).WebSocket = MockWebSocket;
    setNodeEnv('test');
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls handler only for matching message type', async () => {
    let capturedSocket: MockWebSocket | null = null;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        capturedSocket = this;
      }
    };
    
    const syncHandler = jest.fn();
    const cleanupHandler = jest.fn();
    
    const TestComponent = () => {
      useRealtimeMessage('sync.progress', syncHandler);
      useRealtimeMessage('cleanup.progress', cleanupHandler);
      return null;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    // Send sync message
    act(() => {
      if (capturedSocket?.onmessage) {
        capturedSocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({ type: 'sync.progress', payload: { current: 1 } }),
        }));
      }
    });
    
    expect(syncHandler).toHaveBeenCalledWith({ current: 1 });
    expect(cleanupHandler).not.toHaveBeenCalled();
  });
});

describe('useConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (global as any).WebSocket = MockWebSocket;
    setNodeEnv('test');
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns current connection status', async () => {
    const TestComponent = () => {
      const status = useConnectionStatus();
      return <div data-testid="status">{status}</div>;
    };
    
    render(
      <RealtimeProvider>
        <TestComponent />
      </RealtimeProvider>
    );
    
    expect(screen.getByTestId('status').textContent).toBe('connecting');
    
    act(() => {
      jest.advanceTimersByTime(20);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('connected');
    });
  });
});
