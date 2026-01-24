/**
 * Shared constants and utilities for flow diagram components
 */

import type { SyncConnection } from './types';

// Time constants
export const MS_PER_MINUTE = 60000;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

// Default styling
export const DEFAULT_COLOR = '#ccc';

// Status colors - used by SyncEdge and FlowDiagram legend
export const STATUS_COLORS: Record<SyncConnection['status'], string> = {
  active: '#22C55E',
  paused: '#EAB308',
  error: '#EF4444',
} as const;

// Platform colors
export const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  bluesky: '#0085FF',
} as const;

// Badge variant mapping for status
export const STATUS_BADGE_VARIANTS: Record<
  SyncConnection['status'],
  'status-success' | 'status-warning' | 'status-danger'
> = {
  active: 'status-success',
  paused: 'status-warning',
  error: 'status-danger',
} as const;

// Legend configuration - derived from STATUS_COLORS for consistency
export interface LegendConfig {
  color: string;
  label: string;
}

export const LEGEND_ITEMS: readonly LegendConfig[] = [
  { color: STATUS_COLORS.active, label: 'Active' },
  { color: STATUS_COLORS.paused, label: 'Paused' },
  { color: STATUS_COLORS.error, label: 'Error' },
] as const;

/**
 * Formats a date string as a relative time (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);

  if (diffMins < 1) return 'Just now';
  if (diffMins < MINUTES_PER_HOUR) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / MINUTES_PER_HOUR);
  if (diffHours < HOURS_PER_DAY) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / HOURS_PER_DAY);
  return `${diffDays}d ago`;
}
