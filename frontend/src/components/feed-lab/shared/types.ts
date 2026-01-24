/**
 * Shared type definitions for Feed Lab components
 */

// Rule types
export type RuleType = 'boost' | 'demote' | 'filter';

// Condition operators
export type ConditionOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'regex'
  | 'gt'
  | 'lt';

// Condition fields
export type ConditionField =
  | 'author'
  | 'content'
  | 'engagement'
  | 'age'
  | 'platform'
  | 'score'
  | 'timestamp';

// Recipe categories
export type RecipeCategory = 'engagement' | 'filtering' | 'discovery' | 'productivity';

/**
 * A condition that can be matched against posts
 */
export interface Condition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

/**
 * Internal condition with unique ID for form management
 */
export interface ConditionWithId extends Condition {
  _id: string;
}

/**
 * A matched condition with string value for display
 */
export interface MatchedCondition {
  field: string;
  operator: string;
  value: string;
}

/**
 * A feed rule that modifies post scores
 */
export interface Rule {
  id: string;
  name: string;
  type: RuleType;
  weight: number;
  conditions: Condition[];
  enabled: boolean;
}

/**
 * A recipe template for creating rules
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  type: RuleType;
  conditions: Condition[];
  weight: number;
  popularity?: number;
  tags?: string[];
}

/**
 * A rule that was applied to a post with its contribution
 */
export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  type?: RuleType;
  contribution: number;
  percentage?: number;
  matchedConditions?: MatchedCondition[];
}

/**
 * Explanation of why a post appears in the feed
 */
export interface FeedExplanation {
  postId: string;
  baseScore: number;
  totalScore: number;
  appliedRules: AppliedRule[];
  feedPosition?: number;
}

/**
 * A post in the feed
 */
export interface Post {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  score: number;
  appliedRules?: AppliedRule[];
}

/**
 * Rule contribution data for charts
 */
export interface RuleContribution {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  contribution: number;
}
