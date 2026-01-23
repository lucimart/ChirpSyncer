'use client';

import { CheckCircle, AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Whether toast can be dismissed */
  dismissible?: boolean;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Maximum number of toasts visible at once */
  limit?: number;
  /** Default position for all toasts */
  position?: ToastPosition;
  /** Default duration in ms (0 = infinite) */
  defaultDuration?: number;
}

export const TOAST_ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const TOAST_COLORS: Record<ToastType, string> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'primary',
};

export const TOAST_ARIA_LIVE: Record<ToastType, 'polite' | 'assertive'> = {
  success: 'polite',
  error: 'assertive',
  warning: 'assertive',
  info: 'polite',
};

export const TOAST_ANIMATION = {
  'top-right': {
    initial: { opacity: 0, x: 100, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.9 },
  },
  'top-left': {
    initial: { opacity: 0, x: -100, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -100, scale: 0.9 },
  },
  'bottom-right': {
    initial: { opacity: 0, x: 100, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 100, scale: 0.9 },
  },
  'bottom-left': {
    initial: { opacity: 0, x: -100, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -100, scale: 0.9 },
  },
  'top-center': {
    initial: { opacity: 0, y: -50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -50, scale: 0.9 },
  },
  'bottom-center': {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.9 },
  },
  reducedMotion: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  transition: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
  },
};

export const POSITION_STYLES: Record<ToastPosition, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  'top-right': { top: '1rem', right: '1rem' },
  'top-left': { top: '1rem', left: '1rem' },
  'bottom-right': { bottom: '1rem', right: '1rem' },
  'bottom-left': { bottom: '1rem', left: '1rem' },
  'top-center': { top: '1rem', left: '50%', transform: 'translateX(-50%)' },
  'bottom-center': { bottom: '1rem', left: '50%', transform: 'translateX(-50%)' },
};

export const DEFAULT_TOAST_DURATION = 5000;
export const DEFAULT_TOAST_LIMIT = 5;
