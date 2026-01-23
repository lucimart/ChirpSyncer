/**
 * Shared types and constants for scheduler components
 */

import type { DefaultTheme } from 'styled-components';

/** Day index (0-6, Sunday-Saturday) */
export type DayIndex = number;

/** Hour index (0-23) */
export type HourIndex = number;

/** Data quality levels */
export type DataQuality = 'low' | 'medium' | 'high';

/** Score level for color coding */
export type ScoreLevel = 'high' | 'medium' | 'low';

/** Heatmap cell data */
export interface HeatmapCell {
  day: DayIndex;
  hour: HourIndex;
  score: number;
  postCount?: number;
  avgEngagement?: number;
}

/** Best time slot for posting */
export interface BestSlot {
  day: DayIndex;
  hour: HourIndex;
  score: number;
  label: string;
}

/** Heatmap data structure */
export interface TimingHeatmapData {
  cells: HeatmapCell[];
  bestSlots: BestSlot[];
  dataQuality: DataQuality;
  basedOnPosts: number;
}

// Constants
export const HOURS_COUNT = 24;
export const DAYS_COUNT = 7;

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const QUALITY_LABELS: Record<DataQuality, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
} as const;

/** Score thresholds for level classification */
export const SCORE_THRESHOLDS = {
  high: 80,
  medium: 60,
} as const;

// Helper functions

/** Format hour to 12-hour format with AM/PM */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

/** Get score level based on value */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.high) return 'high';
  if (score >= SCORE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/** Get color for engagement score */
export function getScoreColor(score: number, theme: DefaultTheme): string {
  if (score >= 80) return theme.colors.success[500];
  if (score >= 60) return theme.colors.success[300];
  if (score >= 40) return theme.colors.warning[500];
  if (score >= 20) return theme.colors.warning[300];
  return theme.colors.neutral[200];
}

/** Get color for data quality indicator */
export function getQualityColor(quality: DataQuality, theme: DefaultTheme): string {
  const colors: Record<DataQuality, string> = {
    high: theme.colors.success[500],
    medium: theme.colors.warning[500],
    low: theme.colors.danger[500],
  };
  return colors[quality];
}

/** Generate unique cell key */
export function getCellKey(day: number, hour: number): string {
  return `${day}-${hour}`;
}
