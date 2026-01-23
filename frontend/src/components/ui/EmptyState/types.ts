'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'default' | 'inline' | 'card';

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Title text (required) */
  title: string;
  /** Description text */
  description?: string;
  /** Action element (usually a Button) */
  action?: ReactNode;
  /** Secondary action element */
  secondaryAction?: ReactNode;
  /** Size preset */
  size?: EmptyStateSize;
  /** Visual style variant */
  variant?: EmptyStateVariant;
  /** Custom illustration (replaces icon) */
  illustration?: ReactNode;
  /** Test ID */
  'data-testid'?: string;
  /** Custom className */
  className?: string;
}

export const EMPTY_STATE_SIZES: Record<EmptyStateSize, {
  iconSize: number;
  titleSize: string;
  descSize: string;
  padding: string;
  gap: string;
}> = {
  sm: {
    iconSize: 32,
    titleSize: 'base',
    descSize: 'sm',
    padding: '24px',
    gap: '12px',
  },
  md: {
    iconSize: 48,
    titleSize: 'lg',
    descSize: 'base',
    padding: '40px',
    gap: '16px',
  },
  lg: {
    iconSize: 64,
    titleSize: 'xl',
    descSize: 'base',
    padding: '64px',
    gap: '20px',
  },
};

export const EMPTY_STATE_ANIMATION = {
  icon: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  content: {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { delay: 0.1 },
  },
} as const;
