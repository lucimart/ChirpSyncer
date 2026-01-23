/**
 * Shared constants for Feed Lab components
 */

/**
 * Default base score for posts
 */
export const BASE_SCORE = 100;

/**
 * Field type definitions
 */
export type FieldType = 'text' | 'numeric' | 'timestamp';

/**
 * Available fields for conditions
 */
export const FIELD_OPTIONS: Array<{ value: string; label: string; type: FieldType }> = [
  { value: 'content', label: 'Content', type: 'text' },
  { value: 'author', label: 'Author', type: 'text' },
  { value: 'score', label: 'Score', type: 'numeric' },
  { value: 'timestamp', label: 'Timestamp', type: 'timestamp' },
  { value: 'engagement', label: 'Engagement', type: 'numeric' },
  { value: 'platform', label: 'Platform', type: 'text' },
];

/**
 * Operators for text fields
 */
export const TEXT_OPERATORS: Array<{ value: string; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Excludes' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
];

/**
 * Operators for numeric fields
 */
export const NUMERIC_OPERATORS: Array<{ value: string; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

/**
 * Rule type options for dropdowns
 */
export const RULE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'boost', label: 'Boost' },
  { value: 'demote', label: 'Demote' },
  { value: 'filter', label: 'Filter' },
];

/**
 * Colors for charts
 */
export const CHART_COLORS = {
  boost: '#22c55e', // green-500
  demote: '#ef4444', // red-500
  baseline: '#6b7280', // gray-500
  background: '#f3f4f6', // gray-100
} as const;

/**
 * Chart configuration
 */
export const CHART_CONFIG = {
  barHeight: 32,
  barGap: 8,
  leftMargin: 140,
  rightMargin: 60,
  topMargin: 40,
  bottomMargin: 20,
} as const;

/**
 * Category options for recipes
 */
export const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'filtering', label: 'Filtering' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'productivity', label: 'Productivity' },
];

/**
 * Sort options for recipes
 */
export const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'name', label: 'Sort by Name' },
  { value: 'popularity', label: 'Sort by Popularity' },
  { value: 'weight', label: 'Sort by Weight' },
];
