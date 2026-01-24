'use client';

import { ReactNode } from 'react';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
  /** Color variant */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Custom icon */
  icon?: ReactNode;
  /** Alert content */
  children: ReactNode;
  /** Make alert dismissible */
  dismissible?: boolean;
  /** Called when dismiss button is clicked */
  onDismiss?: () => void;
  /** Custom className */
  className?: string;
  /** ID for the alert */
  id?: string;
}

export const ALERT_ANIMATION = {
  container: {
    initial: { opacity: 0, y: -8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.98 },
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    },
  },
  icon: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 20,
      delay: 0.1,
    },
  },
};
