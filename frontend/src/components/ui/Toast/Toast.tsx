'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: ${({ theme }) => theme.spacing[4]};
  right: ${({ theme }) => theme.spacing[4]};
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  max-width: 400px;
`;

const ToastItem = styled.div<{ $type: ToastType; $exiting?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-left: 4px solid
    ${({ $type, theme }) => {
      switch ($type) {
        case 'success':
          return theme.colors.success[500];
        case 'error':
          return theme.colors.danger[500];
        case 'warning':
          return theme.colors.warning[500];
        default:
          return theme.colors.primary[500];
      }
    }};
  animation: ${({ $exiting }) => ($exiting ? slideOut : slideIn)} 0.3s ease-out forwards;
`;

const ToastIcon = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  color: ${({ $type, theme }) => {
    switch ($type) {
      case 'success':
        return theme.colors.success[500];
      case 'error':
        return theme.colors.danger[500];
      case 'warning':
        return theme.colors.warning[500];
      default:
        return theme.colors.primary[500];
    }
  }};
`;

const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToastTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ToastMessage = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing[1]};
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

function getIcon(type: ToastType) {
  switch (type) {
    case 'success':
      return <CheckCircle size={20} />;
    case 'error':
      return <AlertCircle size={20} />;
    case 'warning':
      return <AlertTriangle size={20} />;
    default:
      return <Info size={20} />;
  }
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const removeToast = useCallback((id: string) => {
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newToast: Toast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            $type={toast.type}
            $exiting={exitingIds.has(toast.id)}
          >
            <ToastIcon $type={toast.type}>{getIcon(toast.type)}</ToastIcon>
            <ToastContent>
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.message && <ToastMessage>{toast.message}</ToastMessage>}
            </ToastContent>
            <CloseButton onClick={() => removeToast(toast.id)}>
              <X size={16} />
            </CloseButton>
          </ToastItem>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
