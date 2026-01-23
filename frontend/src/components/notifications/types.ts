/**
 * Notification Types and Constants
 */

import type { ComponentType } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  Bell,
} from 'lucide-react';

// Notification Types
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export type NotificationType =
  | 'sync_complete'
  | 'sync_failed'
  | 'rate_limit'
  | 'credential_expired'
  | 'scheduled_post'
  | 'engagement_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: NotificationSeverity;
  actionUrl?: string;
  actionLabel?: string;
}

// Preferences Types
export interface NotificationChannels {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface NotificationThresholds {
  syncFailures: number;
  rateLimitWarning: number;
  engagementDrop: number;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string;
  end: string;
}

export interface NotificationCategories {
  sync: boolean;
  scheduling: boolean;
  engagement: boolean;
  security: boolean;
}

export interface NotificationPreferences {
  channels: NotificationChannels;
  thresholds: NotificationThresholds;
  quietHours: QuietHoursConfig;
  categories: NotificationCategories;
}

// Icon Props Type
export type IconProps = { size?: number | string; className?: string };

// Severity Colors
export interface SeverityColorSet {
  bg: string;
  border: string;
  icon: string;
}

export const SEVERITY_COLORS: Record<NotificationSeverity, SeverityColorSet> = {
  success: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', icon: '#22c55e' },
  error: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', icon: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', icon: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', icon: '#3b82f6' },
} as const;

// Type to Icon Mapping
export const TYPE_ICONS: Record<NotificationType, ComponentType<IconProps>> = {
  sync_complete: CheckCircle,
  sync_failed: XCircle,
  rate_limit: AlertTriangle,
  credential_expired: AlertTriangle,
  scheduled_post: Clock,
  engagement_alert: TrendingDown,
};

export const DEFAULT_ICON = Bell;

// Dropdown Configuration
export const DROPDOWN_CONFIG = {
  width: 380,
  maxHeight: 500,
  listMaxHeight: 380,
} as const;

// Icon Sizes
export const ICON_SIZES = {
  notification: 18,
  bell: 20,
  empty: 24,
  action: 14,
  settings: 16,
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
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}
