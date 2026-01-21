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
const MAX_RECONNECT_ATTEMPTS = 5;

interface RealtimeProviderProps {
  children: ReactNode;
  userId?: number;
}

export function RealtimeProvider({ children, userId }: RealtimeProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setStatus('connecting');

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
      // Auto-join user room if userId provided
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
    if (socketRef.current) {
      socketRef.current.disconnect();
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
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const joinRoom = useCallback((roomUserId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join', { user_id: roomUserId });
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Re-join room when userId changes
  useEffect(() => {
    if (userId && socketRef.current?.connected) {
      socketRef.current.emit('join', { user_id: userId });
    }
  }, [userId]);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler(message.payload as any);
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
