import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FeedCondition {
  field: 'author' | 'content' | 'engagement' | 'age' | 'platform';
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex';
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

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_FEED_RULES: FeedRule[] = [
  {
    id: 'rule-1',
    name: 'Boost Tech Content',
    type: 'boost',
    conditions: [
      {
        field: 'content',
        operator: 'contains',
        value: 'programming',
      },
    ],
    weight: 50,
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Demote Low Engagement',
    type: 'demote',
    conditions: [
      {
        field: 'engagement',
        operator: 'lt',
        value: 5,
      },
    ],
    weight: -30,
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Filter Spam',
    type: 'filter',
    conditions: [
      {
        field: 'content',
        operator: 'contains',
        value: 'spam',
      },
    ],
    weight: -100,
    enabled: false,
  },
];

// In-memory storage for tests
let mockRules = [...MOCK_FEED_RULES];
let nextId = 4;

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
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      let rules = [...mockRules];

      // Filter by enabled status if requested
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

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 200));

      const createdRule: FeedRule = {
        ...newRule,
        id: `rule-${nextId++}`,
      };

      mockRules.push(createdRule);

      return createdRule;
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
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 200));

      const index = mockRules.findIndex((rule) => rule.id === updates.id);
      if (index === -1) {
        throw new Error('Rule not found');
      }

      const updatedRule: FeedRule = {
        ...mockRules[index],
        ...updates,
      };

      // Validate updated rule
      const validation = validateFeedRule(updatedRule);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      mockRules[index] = updatedRule;

      return updatedRule;
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
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 200));

      const index = mockRules.findIndex((rule) => rule.id === ruleId);
      if (index === -1) {
        throw new Error('Rule not found');
      }

      mockRules.splice(index, 1);

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
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 200));

      const index = mockRules.findIndex((rule) => rule.id === id);
      if (index === -1) {
        throw new Error('Rule not found');
      }

      mockRules[index] = {
        ...mockRules[index],
        enabled,
      };

      return mockRules[index];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-rules'] });
    },
  });
}
