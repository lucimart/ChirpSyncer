/**
 * Sprint 19: Feed Lab Foundation - Feed Rules (TDD)
 * Tests for Feed Rules CRUD and validation
 *
 * This test file is written BEFORE implementation (TDD red phase)
 * Implementation should be in:
 * - src/lib/feed-rules.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Feed Rules imports (not implemented yet - TDD style)
import {
  useFeedRules,
  useCreateFeedRule,
  useUpdateFeedRule,
  useDeleteFeedRule,
  useToggleFeedRule,
  validateFeedRule,
  validateFeedCondition,
  FeedRule,
  FeedCondition,
} from '@/lib/feed-rules';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';
  return Wrapper;
};

const mockFetch = (response: any, status: number = 200) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    headers: new Headers({ 'content-type': 'application/json' }),
  });
};

const mockApiResponse = (data: any, status: number = 200) => {
  mockFetch({ success: true, data }, status);
};

describe('Sprint 19: Feed Lab Foundation - Feed Rules', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  describe('US-050: Feed Lab - Rule Creation', () => {
    it('should create a new feed rule with name and type', async () => {
      const { result } = renderHook(() => useCreateFeedRule(), {
        wrapper: createWrapper(),
      });

      const newRule: Omit<FeedRule, 'id'> = {
        name: 'Boost Tech Posts',
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
      };

      mockApiResponse({ id: 1, ...newRule });

      act(() => {
        result.current.mutate(newRule);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const createdRule = result.current.data!;
      expect(createdRule.id).toBeDefined();
      expect(createdRule.name).toBe('Boost Tech Posts');
      expect(createdRule.type).toBe('boost');
      expect(createdRule.weight).toBe(50);
      expect(createdRule.enabled).toBe(true);
    });

    it('should validate rule weight is between -100 and +100', () => {
      const validRule: Omit<FeedRule, 'id'> = {
        name: 'Test Rule',
        type: 'boost',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
        weight: 75,
        enabled: true,
      };

      const invalidRuleHigh: Omit<FeedRule, 'id'> = {
        name: 'Invalid High',
        type: 'boost',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
        weight: 150,
        enabled: true,
      };

      const invalidRuleLow: Omit<FeedRule, 'id'> = {
        name: 'Invalid Low',
        type: 'demote',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
        weight: -150,
        enabled: true,
      };

      expect(validateFeedRule(validRule).isValid).toBe(true);
      expect(validateFeedRule(invalidRuleHigh).isValid).toBe(false);
      expect(validateFeedRule(invalidRuleHigh).errors).toContain(
        'Weight must be between -100 and +100'
      );
      expect(validateFeedRule(invalidRuleLow).isValid).toBe(false);
      expect(validateFeedRule(invalidRuleLow).errors).toContain(
        'Weight must be between -100 and +100'
      );
    });

    it('should create boost type rule', async () => {
      const { result } = renderHook(() => useCreateFeedRule(), {
        wrapper: createWrapper(),
      });

      const boostRule: Omit<FeedRule, 'id'> = {
        name: 'Boost Popular Posts',
        type: 'boost',
        conditions: [
          {
            field: 'engagement',
            operator: 'gt',
            value: 100,
          },
        ],
        weight: 80,
        enabled: true,
      };

      mockApiResponse({ id: 2, ...boostRule });

      act(() => {
        result.current.mutate(boostRule);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.type).toBe('boost');
      expect(result.current.data!.weight).toBeGreaterThan(0);
    });

    it('should create demote type rule', async () => {
      const { result } = renderHook(() => useCreateFeedRule(), {
        wrapper: createWrapper(),
      });

      const demoteRule: Omit<FeedRule, 'id'> = {
        name: 'Demote Low Quality',
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
      };

      mockApiResponse({ id: 3, ...demoteRule });

      act(() => {
        result.current.mutate(demoteRule);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.type).toBe('demote');
      expect(result.current.data!.weight).toBeLessThan(0);
    });

    it('should create filter type rule', async () => {
      const { result } = renderHook(() => useCreateFeedRule(), {
        wrapper: createWrapper(),
      });

      const filterRule: Omit<FeedRule, 'id'> = {
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
        enabled: true,
      };

      mockApiResponse({ id: 4, ...filterRule });

      act(() => {
        result.current.mutate(filterRule);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.type).toBe('filter');
    });

    it('should handle multiple conditions', async () => {
      const { result } = renderHook(() => useCreateFeedRule(), {
        wrapper: createWrapper(),
      });

      const multiConditionRule: Omit<FeedRule, 'id'> = {
        name: 'Complex Rule',
        type: 'boost',
        conditions: [
          {
            field: 'author',
            operator: 'equals',
            value: '@techexpert',
          },
          {
            field: 'content',
            operator: 'contains',
            value: 'AI',
          },
          {
            field: 'engagement',
            operator: 'gt',
            value: 50,
          },
        ],
        weight: 60,
        enabled: true,
      };

      mockApiResponse({ id: 5, ...multiConditionRule });

      act(() => {
        result.current.mutate(multiConditionRule);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const createdRule = result.current.data!;
      expect(createdRule.conditions).toHaveLength(3);
      expect(createdRule.conditions[0].field).toBe('author');
      expect(createdRule.conditions[1].field).toBe('content');
      expect(createdRule.conditions[2].field).toBe('engagement');
    });

    it('should test all condition field types', () => {
      const authorCondition: FeedCondition = {
        field: 'author',
        operator: 'equals',
        value: '@user',
      };

      const contentCondition: FeedCondition = {
        field: 'content',
        operator: 'contains',
        value: 'keyword',
      };

      const engagementCondition: FeedCondition = {
        field: 'engagement',
        operator: 'gt',
        value: 100,
      };

      const ageCondition: FeedCondition = {
        field: 'age',
        operator: 'lt',
        value: 24,
      };

      const platformCondition: FeedCondition = {
        field: 'platform',
        operator: 'equals',
        value: 'twitter',
      };

      expect(validateFeedCondition(authorCondition).isValid).toBe(true);
      expect(validateFeedCondition(contentCondition).isValid).toBe(true);
      expect(validateFeedCondition(engagementCondition).isValid).toBe(true);
      expect(validateFeedCondition(ageCondition).isValid).toBe(true);
      expect(validateFeedCondition(platformCondition).isValid).toBe(true);
    });

    it('should test all operator types', () => {
      const containsOp: FeedCondition = {
        field: 'content',
        operator: 'contains',
        value: 'test',
      };

      const equalsOp: FeedCondition = {
        field: 'platform',
        operator: 'equals',
        value: 'mastodon',
      };

      const gtOp: FeedCondition = {
        field: 'engagement',
        operator: 'gt',
        value: 50,
      };

      const ltOp: FeedCondition = {
        field: 'age',
        operator: 'lt',
        value: 12,
      };

      const regexOp: FeedCondition = {
        field: 'content',
        operator: 'regex',
        value: '^#[a-z]+$',
      };

      expect(validateFeedCondition(containsOp).isValid).toBe(true);
      expect(validateFeedCondition(equalsOp).isValid).toBe(true);
      expect(validateFeedCondition(gtOp).isValid).toBe(true);
      expect(validateFeedCondition(ltOp).isValid).toBe(true);
      expect(validateFeedCondition(regexOp).isValid).toBe(true);
    });
  });

  describe('Feed Rules CRUD Hooks', () => {
    it('should fetch all feed rules with useFeedRules', async () => {
      mockApiResponse([
        {
          id: 1,
          name: 'Boost Tech Content',
          type: 'boost',
          conditions: [
            { field: 'content', operator: 'contains', value: 'programming' },
          ],
          weight: 50,
          enabled: true,
        },
        {
          id: 2,
          name: 'Demote Low Engagement',
          type: 'demote',
          conditions: [
            { field: 'engagement', operator: 'lt', value: 5 },
          ],
          weight: -30,
          enabled: true,
        },
      ]);

      const { result } = renderHook(() => useFeedRules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const rules = result.current.data!;
      expect(Array.isArray(rules)).toBe(true);
      rules.forEach((rule) => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('conditions');
        expect(rule).toHaveProperty('weight');
        expect(rule).toHaveProperty('enabled');
        expect(['boost', 'demote', 'filter']).toContain(rule.type);
        expect(rule.weight).toBeGreaterThanOrEqual(-100);
        expect(rule.weight).toBeLessThanOrEqual(100);
      });
    });

    it('should filter enabled rules only', async () => {
      mockApiResponse([
        {
          id: 1,
          name: 'Boost Tech Content',
          type: 'boost',
          conditions: [
            { field: 'content', operator: 'contains', value: 'programming' },
          ],
          weight: 50,
          enabled: true,
        },
        {
          id: 2,
          name: 'Filter Spam',
          type: 'filter',
          conditions: [
            { field: 'content', operator: 'contains', value: 'spam' },
          ],
          weight: -100,
          enabled: false,
        },
      ]);

      const { result } = renderHook(() => useFeedRules({ enabledOnly: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const rules = result.current.data!;
      rules.forEach((rule) => {
        expect(rule.enabled).toBe(true);
      });
    });

    it('should update an existing feed rule', async () => {
      const { result } = renderHook(() => useUpdateFeedRule(), {
        wrapper: createWrapper(),
      });

      // Use an existing rule ID from mock data
      const updates = {
        id: '1',
        name: 'Updated Rule Name',
        weight: 75,
      };

      mockApiResponse({
        id: 1,
        name: 'Updated Rule Name',
        type: 'boost',
        conditions: [
          { field: 'content', operator: 'contains', value: 'programming' },
        ],
        weight: 75,
        enabled: true,
      });

      act(() => {
        result.current.mutate(updates);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const updatedRule = result.current.data!;
      expect(updatedRule.id).toBe('1');
      expect(updatedRule.name).toBe('Updated Rule Name');
      expect(updatedRule.weight).toBe(75);
    });

    it('should delete a feed rule', async () => {
      const { result } = renderHook(() => useDeleteFeedRule(), {
        wrapper: createWrapper(),
      });

      // Use an existing rule ID from mock data
      mockApiResponse({ deleted: true });

      act(() => {
        result.current.mutate('2');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ success: true });
    });

    it('should toggle feed rule enabled status', async () => {
      const { result } = renderHook(() => useToggleFeedRule(), {
        wrapper: createWrapper(),
      });

      // Use an existing rule ID from mock data (rule-3 is disabled by default)
      mockApiResponse({
        id: 3,
        name: 'Filter Spam',
        type: 'filter',
        conditions: [
          { field: 'content', operator: 'contains', value: 'spam' },
        ],
        weight: -100,
        enabled: true,
      });

      act(() => {
        result.current.mutate({ id: '3', enabled: true });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const toggledRule = result.current.data!;
      expect(toggledRule.id).toBe('3');
      expect(toggledRule.enabled).toBe(true);
    });

    it('should re-enable a disabled rule', async () => {
      const { result } = renderHook(() => useToggleFeedRule(), {
        wrapper: createWrapper(),
      });

      // Toggle rule-1 (enabled by default) to disabled
      mockApiResponse({
        id: 1,
        name: 'Boost Tech Content',
        type: 'boost',
        conditions: [
          { field: 'content', operator: 'contains', value: 'programming' },
        ],
        weight: 50,
        enabled: false,
      });

      act(() => {
        result.current.mutate({ id: '1', enabled: false });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const toggledRule = result.current.data!;
      expect(toggledRule.enabled).toBe(false);
    });
  });

  describe('Feed Rule Validation', () => {
    it('should validate condition field types', () => {
      const validFields: FeedCondition['field'][] = [
        'author',
        'content',
        'engagement',
        'age',
        'platform',
      ];

      validFields.forEach((field) => {
        const condition: FeedCondition = {
          field,
          operator: 'equals',
          value: 'test',
        };
        expect(validateFeedCondition(condition).isValid).toBe(true);
      });
    });

    it('should validate condition operators', () => {
      const containsOp: FeedCondition = {
        field: 'content',
        operator: 'contains',
        value: 'test',
      };

      const equalsOp: FeedCondition = {
        field: 'platform',
        operator: 'equals',
        value: 'twitter',
      };

      const gtOp: FeedCondition = {
        field: 'engagement',
        operator: 'gt',
        value: 50,
      };

      const ltOp: FeedCondition = {
        field: 'age',
        operator: 'lt',
        value: 12,
      };

      const regexOp: FeedCondition = {
        field: 'content',
        operator: 'regex',
        value: '^test.*',
      };

      expect(validateFeedCondition(containsOp).isValid).toBe(true);
      expect(validateFeedCondition(equalsOp).isValid).toBe(true);
      expect(validateFeedCondition(gtOp).isValid).toBe(true);
      expect(validateFeedCondition(ltOp).isValid).toBe(true);
      expect(validateFeedCondition(regexOp).isValid).toBe(true);
    });

    it('should reject invalid field types', () => {
      const invalidCondition = {
        field: 'invalid_field',
        operator: 'equals',
        value: 'test',
      } as any;

      const result = validateFeedCondition(invalidCondition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid field type');
    });

    it('should reject invalid operators', () => {
      const invalidCondition = {
        field: 'content',
        operator: 'invalid_operator',
        value: 'test',
      } as any;

      const result = validateFeedCondition(invalidCondition);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid operator');
    });

    it('should validate numeric values for gt/lt operators', () => {
      const validCondition: FeedCondition = {
        field: 'engagement',
        operator: 'gt',
        value: 100,
      };

      const invalidCondition: FeedCondition = {
        field: 'engagement',
        operator: 'gt',
        value: 'not-a-number',
      };

      expect(validateFeedCondition(validCondition).isValid).toBe(true);
      expect(validateFeedCondition(invalidCondition).isValid).toBe(false);
      expect(validateFeedCondition(invalidCondition).errors).toContain(
        'Value must be numeric for gt/lt operators'
      );
    });

    it('should validate string values for contains/equals operators', () => {
      const stringCondition: FeedCondition = {
        field: 'content',
        operator: 'contains',
        value: 'keyword',
      };

      const numericCondition: FeedCondition = {
        field: 'platform',
        operator: 'equals',
        value: 'twitter',
      };

      // Both string and number values are acceptable for contains/equals
      // depending on the field context
      expect(validateFeedCondition(stringCondition).isValid).toBe(true);
      expect(validateFeedCondition(numericCondition).isValid).toBe(true);
    });

    it('should validate regex patterns', () => {
      const validRegex: FeedCondition = {
        field: 'content',
        operator: 'regex',
        value: '^[A-Z][a-z]+$',
      };

      const invalidRegex: FeedCondition = {
        field: 'content',
        operator: 'regex',
        value: '[invalid(regex',
      };

      expect(validateFeedCondition(validRegex).isValid).toBe(true);
      expect(validateFeedCondition(invalidRegex).isValid).toBe(false);
      expect(validateFeedCondition(invalidRegex).errors).toContain(
        'Invalid regex pattern'
      );
    });

    it('should reject rules with empty name', () => {
      const invalidRule: Omit<FeedRule, 'id'> = {
        name: '',
        type: 'boost',
        conditions: [],
        weight: 50,
        enabled: true,
      };

      const result = validateFeedRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should reject rules with no conditions', () => {
      const invalidRule: Omit<FeedRule, 'id'> = {
        name: 'Test Rule',
        type: 'boost',
        conditions: [],
        weight: 50,
        enabled: true,
      };

      const result = validateFeedRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one condition is required');
    });

    it('should reject rules with invalid type', () => {
      const invalidRule = {
        name: 'Test Rule',
        type: 'invalid_type',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: 'test',
          },
        ],
        weight: 50,
        enabled: true,
      } as any;

      const result = validateFeedRule(invalidRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid rule type');
    });

    it('should validate all conditions in a rule', () => {
      const ruleWithInvalidCondition: Omit<FeedRule, 'id'> = {
        name: 'Test Rule',
        type: 'boost',
        conditions: [
          {
            field: 'content',
            operator: 'contains',
            value: 'valid',
          },
          {
            field: 'engagement',
            operator: 'gt',
            value: 'not-a-number',
          },
        ],
        weight: 50,
        enabled: true,
      };

      const result = validateFeedRule(ruleWithInvalidCondition);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept valid complete rule', () => {
      const validRule: Omit<FeedRule, 'id'> = {
        name: 'Valid Boost Rule',
        type: 'boost',
        conditions: [
          {
            field: 'author',
            operator: 'equals',
            value: '@expert',
          },
          {
            field: 'engagement',
            operator: 'gt',
            value: 100,
          },
        ],
        weight: 75,
        enabled: true,
      };

      const result = validateFeedRule(validRule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Feed Rule Edge Cases', () => {
    it('should handle rule with weight at exact boundaries', () => {
      const minWeightRule: Omit<FeedRule, 'id'> = {
        name: 'Min Weight',
        type: 'demote',
        conditions: [{ field: 'content', operator: 'contains', value: 'bad' }],
        weight: -100,
        enabled: true,
      };

      const maxWeightRule: Omit<FeedRule, 'id'> = {
        name: 'Max Weight',
        type: 'boost',
        conditions: [{ field: 'content', operator: 'contains', value: 'good' }],
        weight: 100,
        enabled: true,
      };

      expect(validateFeedRule(minWeightRule).isValid).toBe(true);
      expect(validateFeedRule(maxWeightRule).isValid).toBe(true);
    });

    it('should handle rule with zero weight', () => {
      const zeroWeightRule: Omit<FeedRule, 'id'> = {
        name: 'Neutral Rule',
        type: 'boost',
        conditions: [{ field: 'content', operator: 'contains', value: 'neutral' }],
        weight: 0,
        enabled: true,
      };

      expect(validateFeedRule(zeroWeightRule).isValid).toBe(true);
    });

    it('should handle complex regex patterns', () => {
      const complexRegex: FeedCondition = {
        field: 'content',
        operator: 'regex',
        value: '^(?=.*#\\w+)(?=.*@\\w+).+$',
      };

      expect(validateFeedCondition(complexRegex).isValid).toBe(true);
    });

    it('should handle unicode content in conditions', () => {
      const unicodeCondition: FeedCondition = {
        field: 'content',
        operator: 'contains',
        value: '你好世界 🌍',
      };

      expect(validateFeedCondition(unicodeCondition).isValid).toBe(true);
    });

    it('should handle very long rule names', () => {
      const longNameRule: Omit<FeedRule, 'id'> = {
        name: 'A'.repeat(200),
        type: 'boost',
        conditions: [{ field: 'content', operator: 'contains', value: 'test' }],
        weight: 50,
        enabled: true,
      };

      const result = validateFeedRule(longNameRule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be less than 100 characters');
    });
  });
});
