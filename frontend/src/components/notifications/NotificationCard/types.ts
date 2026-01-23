/**
 * NotificationCard Types
 *
 * Extended notification types with category and priority support
 * for the Notifications Hub feature.
 */

import type { ComponentType } from 'react';

// Extended notification categories
export type NotificationCategory = 'sync' | 'alert' | 'system' | 'engagement' | 'security';

// Priority levels (1 = lowest, 5 = critical)
export type NotificationPriority = 1 | 2 | 3 | 4 | 5;

// Extended notification interface
export interface NotificationWithCategory {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  is_read: boolean;
  created_at: string;
}

// Component props
export interface NotificationCardProps {
  notification: NotificationWithCategory;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: NotificationWithCategory) => void;
}

// Icon props type
export type IconProps = { size?: number | string; className?: string };

// Priority color mapping
export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  1: 'neutral',   // Low
  2: 'info',      // Normal
  3: 'warning',   // High
  4: 'error',     // Urgent
  5: 'error',     // Critical (with animation)
} as const;

// Category configuration
export interface CategoryConfig {
  label: string;
  color: string;
  icon: ComponentType<IconProps>;
}

// Animation config for critical priority
export const CRITICAL_ANIMATION = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
} as const;

/**
 * Formats a timestamp into a relative time string
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
