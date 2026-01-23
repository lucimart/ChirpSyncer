'use client';

import { createContext, useContext, useState, useCallback, memo, FC, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  Toast,
  ToastType,
  ToastPosition,
  ToastContextValue,
  ToastProviderProps,
  TOAST_ICONS,
  TOAST_COLORS,
  TOAST_ARIA_LIVE,
  TOAST_ANIMATION,
  POSITION_STYLES,
  DEFAULT_TOAST_DURATION,
  DEFAULT_TOAST_LIMIT,
} from './types';

const ToastContext = createContext<ToastContextValue | null>(null);

const ToastContainer = styled.div<{ $position: ToastPosition }>`
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  max-width: 400px;
  pointer-events: none;

  ${({ $position }) => {
    const styles = POSITION_STYLES[$position];
    return `
      ${styles.top ? `top: ${styles.top};` : ''}
      ${styles.bottom ? `bottom: ${styles.bottom};` : ''}
      ${styles.left ? `left: ${styles.left};` : ''}
      ${styles.right ? `right: ${styles.right};` : ''}
      ${styles.transform ? `transform: ${styles.transform};` : ''}
    `;
  }}

  ${({ $position }) =>
    $position.includes('bottom') &&
    `
    flex-direction: column-reverse;
  `}
`;

const ToastItemWrapper = styled(motion.div)`
  pointer-events: auto;
`;

const ToastItem = styled.div<{ $type: ToastType }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-left: 4px solid
    ${({ $type, theme }) => {
      const colorKey = TOAST_COLORS[$type];
      return theme.colors[colorKey as keyof typeof theme.colors]?.[500] ?? theme.colors.primary[500];
    }};
  width: 100%;
  max-width: 400px;

  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const ToastIcon = styled.div<{ $type: ToastType }>`
  flex-shrink: 0;
  color: ${({ $type, theme }) => {
    const colorKey = TOAST_COLORS[$type];
    return theme.colors[colorKey as keyof typeof theme.colors]?.[500] ?? theme.colors.primary[500];
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

const ToastActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ActionButton = styled.button`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.primary[600]};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: ${({ theme }) => theme.colors.primary[700]};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

const CloseButton = styled(motion.button)`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing[1]};
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const ProgressBar = styled(motion.div)<{ $type: ToastType }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: ${({ $type, theme }) => {
    const colorKey = TOAST_COLORS[$type];
    return theme.colors[colorKey as keyof typeof theme.colors]?.[500] ?? theme.colors.primary[500];
  }};
  border-radius: 0 0 0 ${({ theme }) => theme.borderRadius.lg};
`;

const ToastItemContainer = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

interface ToastItemComponentProps {
  toast: Toast;
  onRemove: (id: string) => void;
  position: ToastPosition;
}

const ToastItemComponent: FC<ToastItemComponentProps> = memo(({ toast, onRemove, position }) => {
  const shouldReduceMotion = useReducedMotion();
  const Icon = TOAST_ICONS[toast.type];
  const ariaLive = TOAST_ARIA_LIVE[toast.type];
  const dismissible = toast.dismissible ?? true;
  const duration = toast.duration ?? DEFAULT_TOAST_DURATION;

  const animation = shouldReduceMotion
    ? TOAST_ANIMATION.reducedMotion
    : TOAST_ANIMATION[position];

  const handleDismiss = useCallback(() => {
    toast.onDismiss?.();
    onRemove(toast.id);
  }, [toast, onRemove]);

  const handleAction = useCallback(() => {
    toast.action?.onClick();
    onRemove(toast.id);
  }, [toast, onRemove]);

  return (
    <ToastItemWrapper
      layout
      initial={animation.initial}
      animate={animation.animate}
      exit={animation.exit}
      transition={TOAST_ANIMATION.transition}
    >
      <ToastItemContainer>
        <ToastItem
          $type={toast.type}
          role="alert"
          aria-live={ariaLive}
          aria-atomic="true"
        >
          <ToastIcon $type={toast.type} aria-hidden="true">
            <Icon size={20} />
          </ToastIcon>
          <ToastContent>
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.message && <ToastMessage>{toast.message}</ToastMessage>}
            {toast.action && (
              <ToastActions>
                <ActionButton onClick={handleAction}>
                  {toast.action.label}
                </ActionButton>
              </ToastActions>
            )}
          </ToastContent>
          {dismissible && (
            <CloseButton
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={16} aria-hidden="true" />
            </CloseButton>
          )}
        </ToastItem>
        {duration > 0 && (
          <ProgressBar
            $type={toast.type}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        )}
      </ToastItemContainer>
    </ToastItemWrapper>
  );
});

ToastItemComponent.displayName = 'ToastItemComponent';

export const ToastProvider: FC<ToastProviderProps> = memo(({
  children,
  limit = DEFAULT_TOAST_LIMIT,
  position = 'top-right',
  defaultDuration = DEFAULT_TOAST_DURATION,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
        dismissible: toast.dismissible ?? true,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Limit number of toasts
        if (updated.length > limit) {
          return updated.slice(-limit);
        }
        return updated;
      });

      const duration = newToast.duration ?? defaultDuration;
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [defaultDuration, limit, removeToast]
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      removeToast,
      removeAllToasts,
      updateToast,
    }),
    [toasts, addToast, removeToast, removeAllToasts, updateToast]
  );

  const portalContent = (
    <ToastContainer
      $position={position}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItemComponent
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
            position={position}
          />
        ))}
      </AnimatePresence>
    </ToastContainer>
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof window !== 'undefined' && createPortal(portalContent, document.body)}
    </ToastContext.Provider>
  );
});

ToastProvider.displayName = 'ToastProvider';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience functions for creating toasts
export const toast = {
  success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => ({
    type: 'success' as const,
    title,
    ...options,
  }),
  error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => ({
    type: 'error' as const,
    title,
    ...options,
  }),
  warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => ({
    type: 'warning' as const,
    title,
    ...options,
  }),
  info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => ({
    type: 'info' as const,
    title,
    ...options,
  }),
};
