import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FeedCondition {
  field: 'author' | 'content' | 'engagement' | 'age' | 'platform' | string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex' | string;
  value: string | number;
}

export interface FeedRule {
  id: string;
  name: string;
  type: 'boost' | 'demote' | 'filter';
  conditions: FeedCondition[];
  weight: number; // -100 to +100
  enabled: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UseFeedRulesOptions {
  enabledOnly?: boolean;
}

function normalizeFeedRule(raw: any): FeedRule {
  return {
    id: String(raw.id),
    name: raw.name,
    type: raw.type,
    conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
    weight: typeof raw.weight === 'number' ? raw.weight : 0,
    enabled: Boolean(raw.enabled),
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

export function validateFeedCondition(condition: FeedCondition): ValidationResult {
  const errors: string[] = [];

  // Validate field
  const validFields: FeedCondition['field'][] = [
    'author',
    'content',
    'engagement',
    'age',
    'platform',
  ];
  if (!validFields.includes(condition.field)) {
    errors.push('Invalid field type');
  }

  // Validate operator
  const validOperators: FeedCondition['operator'][] = [
    'contains',
    'equals',
    'gt',
    'lt',
    'regex',
  ];
  if (!validOperators.includes(condition.operator)) {
    errors.push('Invalid operator');
  }

  // Validate value type based on operator
  if (condition.operator === 'gt' || condition.operator === 'lt') {
    if (typeof condition.value !== 'number') {
      errors.push('Value must be numeric for gt/lt operators');
    }
  }

  // Note: 'contains' and 'equals' can work with both strings and numbers
  // depending on the field type, so we don't enforce type here

  // Validate regex
  if (condition.operator === 'regex') {
    try {
      new RegExp(String(condition.value));
    } catch (e) {
      errors.push('Invalid regex pattern');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFeedRule(rule: Omit<FeedRule, 'id'>): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (rule.name && rule.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Validate type
  const validTypes: FeedRule['type'][] = ['boost', 'demote', 'filter'];
  if (!validTypes.includes(rule.type)) {
    errors.push('Invalid rule type');
  }

  // Validate weight
  if (rule.weight < -100 || rule.weight > 100) {
    errors.push('Weight must be between -100 and +100');
  }

  // Validate conditions
  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('At least one condition is required');
  }

  // Validate each condition
  if (rule.conditions) {
    rule.conditions.forEach((condition) => {
      const conditionResult = validateFeedCondition(condition);
      errors.push(...conditionResult.errors);
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// React Query Hooks
// ============================================================================

export function useFeedRules(options?: UseFeedRulesOptions) {
  return useQuery<FeedRule[]>({
    queryKey: ['feed-rules', options],
    queryFn: async () => {
      const response = await api.getFeedRules();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load feed rules');
      }

      let rules = (response.data as any[]).map(normalizeFeedRule);

      if (options?.enabledOnly) {
        rules = rules.filter((rule) => rule.enabled);
      }

      return rules;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCreateFeedRule() {
  const queryClient = useQueryClient();

  return useMutation<FeedRule, Error, Omit<FeedRule, 'id'>>({
    mutationFn: async (newRule) => {
      // Validate before creation
      const validation = validateFeedRule(newRule);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const response = await api.createFeedRule(newRule);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create feed rule');
      }
      return normalizeFeedRule(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-rules'] });
    },
  });
}

export function useUpdateFeedRule() {
  const queryClient = useQueryClient();

  return useMutation<FeedRule, Error, Partial<FeedRule> & { id: string }>({
    mutationFn: async (updates) => {
      const response = await api.updateFeedRule(Number(updates.id), updates);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update feed rule');
      }
      return normalizeFeedRule(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-rules'] });
    },
  });
}

export function useDeleteFeedRule() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (ruleId) => {
      const response = await api.deleteFeedRule(Number(ruleId));
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete feed rule');
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-rules'] });
    },
  });
}

export function useToggleFeedRule() {
  const queryClient = useQueryClient();

  return useMutation<FeedRule, Error, { id: string; enabled: boolean }>({
    mutationFn: async ({ id, enabled }) => {
      const response = await api.updateFeedRule(Number(id), { enabled });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to toggle feed rule');
      }
      return normalizeFeedRule(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-rules'] });
    },
  });
}
