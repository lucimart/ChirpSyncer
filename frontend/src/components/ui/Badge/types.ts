'use client';

import { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'neutral-soft'
  | 'success-soft'
  | 'warning-soft'
  | 'danger-soft'
  | 'primary-soft'
  | 'text'
  | 'status-success'
  | 'status-warning'
  | 'status-danger'
  | 'status-primary'
  | 'twitter'
  | 'bluesky'
  | 'count';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge content */
  children: ReactNode;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
  /** Show status dot before text */
  dot?: boolean;
  /** Use outline style (transparent bg with border) */
  outline?: boolean;
  /** Custom dot color */
  dotColor?: string;
  /** Left icon element */
  leftIcon?: ReactNode;
  /** Right icon element */
  rightIcon?: ReactNode;
  /** Make badge removable with X button */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Pulsing animation for dot */
  pulse?: boolean;
}

export const BADGE_SIZES: Record<BadgeSize, { padding: string; fontSize: string; gap: string; iconSize: number }> = {
  xs: { padding: '2px 6px', fontSize: 'xs', gap: '4px', iconSize: 10 },
  sm: { padding: '2px 8px', fontSize: 'xs', gap: '4px', iconSize: 12 },
  md: { padding: '4px 10px', fontSize: 'sm', gap: '6px', iconSize: 14 },
  lg: { padding: '6px 12px', fontSize: 'base', gap: '8px', iconSize: 16 },
};

export const BADGE_ANIMATION = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  remove: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
  },
} as const;
