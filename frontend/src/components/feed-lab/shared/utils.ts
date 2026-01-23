/**
 * Shared utility functions for Feed Lab components
 */

import type { Condition, MatchedCondition } from './types';

/**
 * Format an operator for display
 */
export function formatOperator(operator: string): string {
  const operatorMap: Record<string, string> = {
    contains: 'contains',
    not_contains: 'does not contain',
    equals: 'equals',
    not_equals: 'does not equal',
    greater_than: 'is greater than',
    less_than: 'is less than',
    greater_than_or_equal: 'is greater than or equal to',
    less_than_or_equal: 'is less than or equal to',
    gt: 'greater than',
    lt: 'less than',
    regex: 'matches',
  };
  return operatorMap[operator] || operator;
}

/**
 * Format a weight value with sign
 */
export function formatWeight(weight: number): string {
  return weight >= 0 ? `+${weight}` : `${weight}`;
}

/**
 * Format a contribution value with sign
 */
export function formatContribution(contribution: number): string {
  return contribution >= 0 ? `+${contribution}` : `${contribution}`;
}

/**
 * Format a condition for display
 * Note: Uses raw operator to maintain backwards compatibility with tests
 */
export function formatCondition(condition: MatchedCondition | Condition): string {
  const value = typeof condition.value === 'string' ? condition.value : String(condition.value);
  return `${condition.field} ${condition.operator} "${value}"`;
}

/**
 * Calculate the percentage impact of a contribution
 */
export function calculatePercentage(contribution: number, totalScore: number): number {
  if (totalScore === 0) return 0;
  return Math.abs((contribution / totalScore) * 100);
}

/**
 * Format condition count text
 */
export function formatConditionCount(count: number): string {
  return count === 1 ? '1 condition' : `${count} conditions`;
}

/**
 * Get the display label for a rule type
 */
export function getRuleTypeLabel(type: 'boost' | 'demote' | 'filter'): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
