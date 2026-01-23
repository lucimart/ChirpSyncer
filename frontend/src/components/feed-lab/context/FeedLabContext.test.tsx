import { renderHook, act } from '@testing-library/react';
import { FeedLabProvider, useFeedLab, useFeedLabRules } from './FeedLabContext';
import type { Rule, Recipe } from '../shared';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FeedLabProvider>{children}</FeedLabProvider>
);

const mockRule: Rule = {
  id: 'rule-1',
  name: 'Test Rule',
  type: 'boost',
  weight: 10,
  conditions: [{ field: 'content', operator: 'contains', value: 'test' }],
  enabled: true,
};

const mockRecipe: Recipe = {
  id: 'recipe-1',
  name: 'Test Recipe',
  description: 'A test recipe',
  category: 'engagement',
  type: 'boost',
  weight: 15,
  conditions: [{ field: 'engagement', operator: 'gt', value: 100 }],
};

describe('FeedLabContext', () => {
  it('provides initial empty state', () => {
    const { result } = renderHook(() => useFeedLab(), { wrapper });

    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.selectedRuleId).toBeNull();
    expect(result.current.state.editingRuleId).toBeNull();
    expect(result.current.state.activeExplanation).toBeNull();
  });

  it('allows setting initial rules', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={[mockRule]}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    expect(result.current.state.rules).toHaveLength(1);
    expect(result.current.state.rules[0].name).toBe('Test Rule');
  });

  it('adds a rule', () => {
    const { result } = renderHook(() => useFeedLab(), { wrapper });

    act(() => {
      result.current.addRule(mockRule);
    });

    expect(result.current.state.rules).toHaveLength(1);
    expect(result.current.state.rules[0]).toEqual(mockRule);
  });

  it('updates a rule', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={[mockRule]}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    act(() => {
      result.current.updateRule('rule-1', { name: 'Updated Rule', weight: 20 });
    });

    expect(result.current.state.rules[0].name).toBe('Updated Rule');
    expect(result.current.state.rules[0].weight).toBe(20);
  });

  it('deletes a rule', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={[mockRule]}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    act(() => {
      result.current.deleteRule('rule-1');
    });

    expect(result.current.state.rules).toHaveLength(0);
  });

  it('toggles a rule', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={[mockRule]}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    act(() => {
      result.current.toggleRule('rule-1', false);
    });

    expect(result.current.state.rules[0].enabled).toBe(false);
  });

  it('reorders rules', () => {
    const rules: Rule[] = [
      { ...mockRule, id: 'rule-1', name: 'Rule 1' },
      { ...mockRule, id: 'rule-2', name: 'Rule 2' },
    ];

    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={rules}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    act(() => {
      result.current.reorderRules([rules[1], rules[0]]);
    });

    expect(result.current.state.rules[0].name).toBe('Rule 2');
    expect(result.current.state.rules[1].name).toBe('Rule 1');
  });

  it('selects a rule', () => {
    const { result } = renderHook(() => useFeedLab(), { wrapper });

    act(() => {
      result.current.selectRule('rule-1');
    });

    expect(result.current.state.selectedRuleId).toBe('rule-1');

    act(() => {
      result.current.selectRule(null);
    });

    expect(result.current.state.selectedRuleId).toBeNull();
  });

  it('sets editing rule', () => {
    const { result } = renderHook(() => useFeedLab(), { wrapper });

    act(() => {
      result.current.setEditing('rule-1');
    });

    expect(result.current.state.editingRuleId).toBe('rule-1');
  });

  it('applies a recipe', () => {
    const { result } = renderHook(() => useFeedLab(), { wrapper });

    act(() => {
      result.current.applyRecipe(mockRecipe);
    });

    expect(result.current.state.rules).toHaveLength(1);
    expect(result.current.state.rules[0].name).toBe('Test Recipe');
    expect(result.current.state.rules[0].type).toBe('boost');
    expect(result.current.state.rules[0].enabled).toBe(true);
  });

  it('clears selectedRuleId when deleting selected rule', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <FeedLabProvider initialRules={[mockRule]}>{children}</FeedLabProvider>
    );

    const { result } = renderHook(() => useFeedLab(), { wrapper: customWrapper });

    act(() => {
      result.current.selectRule('rule-1');
    });

    expect(result.current.state.selectedRuleId).toBe('rule-1');

    act(() => {
      result.current.deleteRule('rule-1');
    });

    expect(result.current.state.selectedRuleId).toBeNull();
  });
});

describe('useFeedLabRules', () => {
  it('returns rules and rule actions', () => {
    const { result } = renderHook(() => useFeedLabRules(), { wrapper });

    expect(result.current.rules).toEqual([]);
    expect(typeof result.current.addRule).toBe('function');
    expect(typeof result.current.updateRule).toBe('function');
    expect(typeof result.current.deleteRule).toBe('function');
    expect(typeof result.current.toggleRule).toBe('function');
    expect(typeof result.current.reorderRules).toBe('function');
  });
});

describe('useFeedLab outside provider', () => {
  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useFeedLab());
    }).toThrow('useFeedLab must be used within a FeedLabProvider');

    consoleSpy.mockRestore();
  });
});
