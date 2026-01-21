/**
 * Sprint 20: Feed Explainability - "Why Am I Seeing This?" - Unit Tests (TDD)
 * Tests for WhyAmISeeingThis, RuleContributionChart, useFeedExplanation
 *
 * TDD Red Phase: Components don't exist yet
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// TDD - These components don't exist yet, tests will fail until implemented
import { WhyAmISeeingThis } from '@/components/feed-lab/WhyAmISeeingThis';
import { RuleContributionChart } from '@/components/feed-lab/RuleContributionChart';
import { useFeedExplanation, clearExplanationCache } from '@/hooks/useFeedExplanation';

// Theme wrapper for tests
const ThemeProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Test wrapper with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock data
const mockExplanation = {
  postId: 'post-1',
  baseScore: 50,
  totalScore: 125,
  appliedRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'Prioritize AI posts',
      type: 'boost' as const,
      contribution: 50,
      percentage: 40,
      matchedConditions: [
        { field: 'content', operator: 'contains', value: 'AI' },
      ],
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Boost trending topics',
      type: 'boost' as const,
      contribution: 25,
      percentage: 20,
      matchedConditions: [
        { field: 'hashtags', operator: 'contains', value: '#trending' },
      ],
    },
  ],
};

const mockExplanationWithDemote = {
  postId: 'post-2',
  baseScore: 50,
  totalScore: 25,
  appliedRules: [
    {
      ruleId: 'rule-3',
      ruleName: 'Demote old content',
      type: 'demote' as const,
      contribution: -25,
      percentage: -50,
      matchedConditions: [
        { field: 'age', operator: 'greater_than', value: '30' },
      ],
    },
  ],
};

const mockExplanationNoRules = {
  postId: 'post-3',
  baseScore: 50,
  totalScore: 50,
  appliedRules: [],
};

const mockExplanationMixedRules = {
  postId: 'post-4',
  baseScore: 50,
  totalScore: 75,
  appliedRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'Boost AI content',
      type: 'boost' as const,
      contribution: 50,
      percentage: 100,
      matchedConditions: [
        { field: 'content', operator: 'contains', value: 'AI' },
      ],
    },
    {
      ruleId: 'rule-3',
      ruleName: 'Demote long posts',
      type: 'demote' as const,
      contribution: -25,
      percentage: -50,
      matchedConditions: [
        { field: 'length', operator: 'greater_than', value: '500' },
      ],
    },
  ],
};

const mockApiExplanation = {
  post_id: 'post-1',
  base_score: 50,
  final_score: 125,
  rules_applied: [
    {
      rule_id: 'rule-1',
      rule_name: 'Prioritize AI posts',
      rule_type: 'boost',
      contribution: 50,
      percentage: 40,
      matched_condition: { field: 'content', operator: 'contains', value: 'AI' },
    },
    {
      rule_id: 'rule-2',
      rule_name: 'Boost trending topics',
      rule_type: 'boost',
      contribution: 25,
      percentage: 20,
      matched_condition: { field: 'hashtags', operator: 'contains', value: '#trending' },
    },
  ],
};

const mockApiExplanationWithDemote = {
  post_id: 'post-2',
  base_score: 50,
  final_score: 25,
  rules_applied: [
    {
      rule_id: 'rule-3',
      rule_name: 'Demote old content',
      rule_type: 'demote',
      contribution: -25,
      percentage: -50,
      matched_condition: { field: 'age', operator: 'greater_than', value: '30' },
    },
  ],
};

describe('WhyAmISeeingThis Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Why am I seeing this?" button on posts', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    expect(screen.getByRole('button', { name: /why am i seeing this/i })).toBeInTheDocument();
  });

  it('opens modal/popover when button clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/feed explanation/i)).toBeInTheDocument();
    });
  });

  it('displays list of matching rules with their contribution', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" explanation={mockExplanation} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Prioritize AI posts')).toBeInTheDocument();
      expect(screen.getByText('Boost trending topics')).toBeInTheDocument();
    });
  });

  it('shows which conditions matched for each rule', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" explanation={mockExplanation} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/content contains "AI"/i)).toBeInTheDocument();
      expect(screen.getByText(/hashtags contains "#trending"/i)).toBeInTheDocument();
    });
  });

  it('shows rule impact as percentage', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" explanation={mockExplanation} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/40%/)).toBeInTheDocument();
      expect(screen.getByText(/20%/)).toBeInTheDocument();
    });
  });

  it('displays contribution with + sign for boost rules', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" explanation={mockExplanation} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/\+50/)).toBeInTheDocument();
      expect(screen.getByText(/\+25/)).toBeInTheDocument();
    });
  });

  it('displays contribution with - sign for demote rules', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-2" explanation={mockExplanationWithDemote} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/-25/)).toBeInTheDocument();
      expect(screen.getByText('Demote old content')).toBeInTheDocument();
    });
  });

  it('handles posts with no rules applied', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-3" explanation={mockExplanationNoRules} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/default chronological order/i)).toBeInTheDocument();
      expect(screen.getByText(/no custom rules applied/i)).toBeInTheDocument();
    });
  });

  it('shows positive and negative contributions differently', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-4" explanation={mockExplanationMixedRules} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      const boostRule = screen.getByTestId('rule-contribution-rule-1');
      const demoteRule = screen.getByTestId('rule-contribution-rule-3');

      expect(boostRule).toHaveClass('boost');
      expect(demoteRule).toHaveClass('demote');
    });
  });

  it('has accessible dismiss button', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" onClose={mockOnClose} />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  it('calls onClose when dismiss button clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" onClose={mockOnClose} />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(async () => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" onClose={mockOnClose} />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(async () => {
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;
      if (backdrop) {
        await user.click(backdrop);
      }
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state while fetching explanation', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-1" isLoading={true} />);

    expect(screen.getByTestId('explanation-loading')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" error="Failed to load explanation" />
    );

    expect(screen.getByText(/failed to load explanation/i)).toBeInTheDocument();
  });

  it('displays base score and total score', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <WhyAmISeeingThis postId="post-1" explanation={mockExplanation} />
    );

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/base score: 50/i)).toBeInTheDocument();
      expect(screen.getByText(/total score: 125/i)).toBeInTheDocument();
    });
  });

  it('shows visual indicator for button (icon)', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    const icon = within(button).getByTestId('info-icon');
    expect(icon).toBeInTheDocument();
  });

  it('button has proper aria-label for accessibility', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    expect(button).toHaveAttribute('aria-label', 'Why am I seeing this post?');
  });

  it('modal has proper aria attributes', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });
  });

  it('focuses close button when modal opens for keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveFocus();
    });
  });

  it('closes modal on Escape key press', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WhyAmISeeingThis postId="post-1" onClose={mockOnClose} />);

    const button = screen.getByRole('button', { name: /why am i seeing this/i });
    await user.click(button);

    await waitFor(async () => {
      await user.keyboard('{Escape}');
    });

    expect(mockOnClose).toHaveBeenCalled();
  });
});

describe('RuleContributionChart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders bar chart showing rule contributions', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    expect(screen.getByTestId('contribution-chart')).toBeInTheDocument();
  });

  it('shows base score as reference line', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const baseScoreLine = screen.getByTestId('base-score-line');
    expect(baseScoreLine).toBeInTheDocument();
    expect(baseScoreLine).toHaveTextContent('50');
  });

  it('bars colored by rule type (green=boost, red=demote)', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanationMixedRules} />
    );

    const boostBar = screen.getByTestId('chart-bar-rule-1');
    const demoteBar = screen.getByTestId('chart-bar-rule-3');

    expect(boostBar).toHaveClass('boost-bar');
    expect(demoteBar).toHaveClass('demote-bar');

    // Check CSS custom properties or inline styles
    expect(boostBar).toHaveStyle({ backgroundColor: expect.stringMatching(/green|#.*/) });
    expect(demoteBar).toHaveStyle({ backgroundColor: expect.stringMatching(/red|#.*/) });
  });

  it('shows total score at top', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    expect(screen.getByTestId('total-score')).toHaveTextContent('125');
  });

  it('handles multiple rules stacking', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const bars = screen.getAllByTestId(/chart-bar-/);
    expect(bars).toHaveLength(2);

    // First bar should be taller than second (50 > 25)
    const bar1Height = bars[0].getAttribute('data-height');
    const bar2Height = bars[1].getAttribute('data-height');

    expect(Number(bar1Height)).toBeGreaterThan(Number(bar2Height));
  });

  it('shows tooltip on hover with rule details', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const firstBar = screen.getByTestId('chart-bar-rule-1');
    await user.hover(firstBar);

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Prioritize AI posts');
      expect(tooltip).toHaveTextContent('+50');
      expect(tooltip).toHaveTextContent('40%');
    });
  });

  it('hides tooltip when mouse leaves', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const firstBar = screen.getByTestId('chart-bar-rule-1');
    await user.hover(firstBar);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    await user.unhover(firstBar);

    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('empty state when no rules', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanationNoRules} />
    );

    expect(screen.getByText(/no rules applied/i)).toBeInTheDocument();
    expect(screen.getByText(/showing base score only/i)).toBeInTheDocument();
  });

  it('displays bars in order of contribution magnitude', () => {
    const mixedContributions = {
      postId: 'post-5',
      baseScore: 50,
      totalScore: 125,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Small boost',
          type: 'boost' as const,
          contribution: 10,
          percentage: 13.3,
          matchedConditions: [],
        },
        {
          ruleId: 'rule-2',
          ruleName: 'Large boost',
          type: 'boost' as const,
          contribution: 50,
          percentage: 66.7,
          matchedConditions: [],
        },
        {
          ruleId: 'rule-3',
          ruleName: 'Medium boost',
          type: 'boost' as const,
          contribution: 25,
          percentage: 33.3,
          matchedConditions: [],
        },
      ],
    };

    renderWithTheme(
      <RuleContributionChart explanation={mixedContributions} />
    );

    const bars = screen.getAllByTestId(/chart-bar-/);
    expect(bars[0]).toHaveAttribute('data-testid', 'chart-bar-rule-2'); // Largest first
    expect(bars[1]).toHaveAttribute('data-testid', 'chart-bar-rule-3');
    expect(bars[2]).toHaveAttribute('data-testid', 'chart-bar-rule-1'); // Smallest last
  });

  it('shows positive contributions above baseline', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const boostBars = screen.getAllByTestId(/chart-bar-rule-/);
    boostBars.forEach(bar => {
      const position = bar.getAttribute('data-position');
      expect(position).toBe('above-baseline');
    });
  });

  it('shows negative contributions below baseline', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanationWithDemote} />
    );

    const demoteBar = screen.getByTestId('chart-bar-rule-3');
    expect(demoteBar.getAttribute('data-position')).toBe('below-baseline');
  });

  it('chart has proper aria-label for accessibility', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const chart = screen.getByTestId('contribution-chart');
    expect(chart).toHaveAttribute('aria-label', 'Feed score breakdown chart');
  });

  it('bars have aria-labels describing their values', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const firstBar = screen.getByTestId('chart-bar-rule-1');
    expect(firstBar).toHaveAttribute(
      'aria-label',
      'Prioritize AI posts: +50 points (40%)'
    );
  });

  it('displays rule labels below bars', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    expect(screen.getByText('Prioritize AI posts')).toBeInTheDocument();
    expect(screen.getByText('Boost trending topics')).toBeInTheDocument();
  });

  it('truncates long rule names with ellipsis', () => {
    const longNameExplanation = {
      ...mockExplanation,
      appliedRules: [
        {
          ...mockExplanation.appliedRules[0],
          ruleName: 'This is a very long rule name that should be truncated',
        },
      ],
    };

    renderWithTheme(
      <RuleContributionChart explanation={longNameExplanation} />
    );

    const label = screen.getByTestId('chart-label-rule-1');
    expect(label).toHaveClass('truncate');
  });

  it('shows full rule name in tooltip even if truncated', async () => {
    const user = userEvent.setup();
    const longNameExplanation = {
      ...mockExplanation,
      appliedRules: [
        {
          ...mockExplanation.appliedRules[0],
          ruleName: 'This is a very long rule name that should be truncated',
        },
      ],
    };

    renderWithTheme(
      <RuleContributionChart explanation={longNameExplanation} />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    await user.hover(bar);

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('This is a very long rule name that should be truncated');
    });
  });

  it('animates bars on mount', () => {
    renderWithTheme(
      <RuleContributionChart explanation={mockExplanation} />
    );

    const bars = screen.getAllByTestId(/chart-bar-/);
    bars.forEach(bar => {
      expect(bar).toHaveClass('animate-grow');
    });
  });
});

describe('useFeedExplanation Hook', () => {
  // Mock fetch
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
    clearExplanationCache(); // Clear cache between tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches explanation for a given post ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toMatchObject(mockExplanation);
    expect(result.current.data?.fetchedAt).toEqual(expect.any(String));
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/feed/explain/post-1', expect.objectContaining({ signal: expect.any(Object) }));
  });

  it('returns loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message || result.current.error).toMatch(/Network error/i);
    expect(result.current.data).toBeNull();
  });

  it('returns error when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });

  it('caches explanations to avoid refetching', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result: result1 } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second hook instance with same postId
    const { result: result2 } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    // Should not fetch again (cached)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toMatchObject(mockExplanation);
    expect(result2.current.data?.fetchedAt).toEqual(expect.any(String));
  });

  it('fetches different posts separately', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockApiExplanation }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockApiExplanationWithDemote }),
      });

    const { result: result1 } = renderHook(() => useFeedExplanation('post-1'));
    const { result: result2 } = renderHook(() => useFeedExplanation('post-2'));

    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
      expect(result2.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result1.current.data).toMatchObject(mockExplanation);
    expect(result1.current.data?.fetchedAt).toEqual(expect.any(String));
    expect(result2.current.data).toMatchObject(mockExplanationWithDemote);
    expect(result2.current.data?.fetchedAt).toEqual(expect.any(String));
  });

  it('includes matched conditions in response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.appliedRules[0].matchedConditions).toEqual([
      { field: 'content', operator: 'contains', value: 'AI' },
    ]);
  });

  it('refetch function forces new fetch even if cached', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('clears cache when invalidate is called', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Invalidate cache
    act(() => {
      result.current.invalidateCache();
    });

    // New hook instance should fetch again
    const { result: result2 } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles null or undefined postId gracefully', () => {
    const { result } = renderHook(() => useFeedExplanation(null as any));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('updates when postId changes', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockApiExplanation }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockApiExplanationWithDemote }),
      });

    const { result, rerender } = renderHook(
      ({ postId }) => useFeedExplanation(postId),
      { initialProps: { postId: 'post-1' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toMatchObject(mockExplanation);
    expect(result.current.data?.fetchedAt).toEqual(expect.any(String));

    // Change postId
    rerender({ postId: 'post-2' });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toMatchObject(mockExplanationWithDemote);
    expect(result.current.data?.fetchedAt).toEqual(expect.any(String));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('aborts previous fetch when postId changes quickly', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { rerender } = renderHook(
      ({ postId }) => useFeedExplanation(postId),
      { initialProps: { postId: 'post-1' } }
    );

    // Quickly change postId
    rerender({ postId: 'post-2' });

    expect(abortSpy).toHaveBeenCalled();

    abortSpy.mockRestore();
  });

  it('provides timestamp of last fetch', async () => {
    const beforeFetch = Date.now();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockApiExplanation }),
    });

    const { result } = renderHook(() => useFeedExplanation('post-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const afterFetch = Date.now();

    expect(result.current.lastFetched).toBeGreaterThanOrEqual(beforeFetch);
    expect(result.current.lastFetched).toBeLessThanOrEqual(afterFetch);
  });
});
