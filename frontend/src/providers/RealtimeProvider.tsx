'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SyncProgressPayload {
  operation_id: string;
  current: number;
  total: number;
  message: string;
  correlation_id?: string;
}

interface CleanupProgressPayload {
  rule_id: number;
  deleted: number;
  total: number;
  current_tweet?: string;
  correlation_id?: string;
}

interface JobCompletedPayload {
  job_id: string;
  job_type: 'sync' | 'cleanup';
  status: 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
}

interface NotificationPayload {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

type RealtimeMessage =
  | { type: 'sync.progress'; payload: SyncProgressPayload }
  | { type: 'sync.complete'; payload: { operation_id: string; synced: number } }
  | { type: 'cleanup.progress'; payload: CleanupProgressPayload }
  | { type: 'cleanup.complete'; payload: { rule_id: number; deleted: number } }
  | { type: 'job.completed'; payload: JobCompletedPayload }
  | { type: 'notification'; payload: NotificationPayload };

type MessageHandler = (message: RealtimeMessage) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  subscribe: (handler: MessageHandler) => () => void;
  sendMessage: (event: string, data: object) => void;
  joinRoom: (userId: number) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const WS_URL = `${SOCKET_URL.replace(/^http/, 'ws')}/ws`;
const MAX_RECONNECT_ATTEMPTS = 5;
const TEST_RECONNECT_DELAY = 3000;

interface RealtimeProviderProps {
  children: ReactNode;
  userId?: number;
}

export function RealtimeProvider({ children, userId }: RealtimeProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTestEnv = process.env.NODE_ENV === 'test';

  const isSocketIo = (socket: Socket | WebSocket): socket is Socket => 'emit' in socket;

  const connect = useCallback(() => {
    const existing = socketRef.current;
    if (existing) {
      if (isSocketIo(existing) && existing.connected) {
        return;
      }
      if ('readyState' in existing &&
          (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
        return;
      }
    }

    setStatus('connecting');

    if (isTestEnv) {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setStatus('connected');
        if (userId) {
          socket.send(JSON.stringify({ event: 'join', data: { user_id: userId } }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeMessage;
          handlersRef.current.forEach((handler) => handler(message));
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        setStatus('disconnected');
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus('error');
          return;
        }
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, TEST_RECONNECT_DELAY);
      };

      socket.onerror = () => {
        setStatus('error');
      };

      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      if (userId) {
        socket.emit('join', { user_id: userId });
      }
    });

    socket.on('connected', (data: { status: string }) => {
      console.log('Server acknowledged connection:', data);
    });

    socket.on('joined', (data: { room: string }) => {
      console.log('Joined room:', data.room);
    });

    socket.on('message', (message: RealtimeMessage) => {
      handlersRef.current.forEach((handler) => handler(message));
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setStatus('error');
    });

    socket.on('reconnect_failed', () => {
      setStatus('error');
    });
  }, [userId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      if ('disconnect' in socketRef.current) {
        socketRef.current.disconnect();
      } else {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const sendMessage = useCallback((event: string, data: object) => {
    if (!socketRef.current) return;
    if (isSocketIo(socketRef.current) && socketRef.current.connected) {
      socketRef.current.emit(event, data);
      return;
    }
    if ('readyState' in socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data }));
    }
  }, [isSocketIo]);

  const joinRoom = useCallback((roomUserId: number) => {
    if (!socketRef.current) return;
    if (isSocketIo(socketRef.current) && socketRef.current.connected) {
      socketRef.current.emit('join', { user_id: roomUserId });
      return;
    }
    if ('readyState' in socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: 'join', data: { user_id: roomUserId } }));
    }
  }, [isSocketIo]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Re-join room when userId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!userId || !socket) return;
    if (isSocketIo(socket) && socket.connected) {
      socket.emit('join', { user_id: userId });
      return;
    }
    if ('readyState' in socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: 'join', data: { user_id: userId } }));
    }
  }, [userId, isSocketIo]);

  return (
    <RealtimeContext.Provider value={{ status, subscribe, sendMessage, joinRoom }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

export function useRealtimeMessage<T extends RealtimeMessage['type']>(
  type: T,
  handler: (payload: Extract<RealtimeMessage, { type: T }>['payload']) => void
) {
  const { subscribe } = useRealtime();

  useEffect(() => {
    return subscribe((message) => {
      if (message.type === type) {
        // @ts-ignore
        handler(message.payload);
      }
    });
  }, [type, handler, subscribe]);
}

export function useConnectionStatus() {
  const { status } = useRealtime();
  return status;
}

export type {
  ConnectionStatus,
  SyncProgressPayload,
  CleanupProgressPayload,
  JobCompletedPayload,
  NotificationPayload,
  RealtimeMessage,
};
