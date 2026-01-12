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

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SyncProgressPayload {
  operation_id: string;
  current: number;
  total: number;
  message: string;
}

interface CleanupProgressPayload {
  rule_id: number;
  deleted: number;
  total: number;
  current_tweet?: string;
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
  | { type: 'notification'; payload: NotificationPayload };

type MessageHandler = (message: RealtimeMessage) => void;

interface RealtimeContextValue {
  status: ConnectionStatus;
  subscribe: (handler: MessageHandler) => () => void;
  sendMessage: (message: object) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeMessage;
          handlersRef.current.forEach((handler) => handler(message));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      socket.onclose = () => {
        setStatus('disconnected');
        socketRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };

      socket.onerror = () => {
        setStatus('error');
      };
    } catch (e) {
      setStatus('error');
      console.error('WebSocket connection error:', e);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
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

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <RealtimeContext.Provider value={{ status, subscribe, sendMessage }}>
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
        handler(message.payload as Extract<RealtimeMessage, { type: T }>['payload']);
      }
    });
  }, [type, handler, subscribe]);
}

export type {
  ConnectionStatus,
  SyncProgressPayload,
  CleanupProgressPayload,
  NotificationPayload,
  RealtimeMessage,
};
