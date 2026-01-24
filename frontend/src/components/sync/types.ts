/**
 * Shared types for sync components
 */

import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

/** Supported platforms for sync */
export type Platform = 'twitter' | 'bluesky';

/** Platform color configuration */
export const PLATFORM_COLORS: Record<Platform, string> = {
  twitter: '#1DA1F2',
  bluesky: '#0085FF',
} as const;

/** Platform filter options including 'all' */
export type PlatformFilter = Platform | 'all';

/** Date range filter options */
export type DateFilter = 'all' | '24h' | '7d' | '30d';

/** Filter options for sync preview */
export interface FilterOptions {
  platform?: PlatformFilter;
  date?: DateFilter;
}

/** Platform icon mapping type */
export type PlatformIconMap = Record<Platform, ComponentType<LucideProps>>;

/** Select option for filters */
export interface FilterSelectOption {
  value: string;
  label: string;
}

/** Platform filter options */
export const PLATFORM_FILTER_OPTIONS: FilterSelectOption[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'bluesky', label: 'Bluesky' },
] as const;

/** Date filter options */
export const DATE_FILTER_OPTIONS: FilterSelectOption[] = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

/** Date format options for timestamps */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
} as const;

/** Check if a timestamp is within a date range */
export function isWithinDateRange(timestamp: string, range: DateFilter): boolean {
  if (range === 'all') return true;

  const itemDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - itemDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const rangeHours: Record<Exclude<DateFilter, 'all'>, number> = {
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
  };

  return diffHours <= rangeHours[range];
}

/** Format a timestamp for display */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS);
}

/** Truncate content to a maximum length */
export function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + '...';
}
