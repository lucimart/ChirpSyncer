/**
 * Sprint 20: Algorithm Transparency Dashboard - Unit Tests (TDD)
 * Tests for AlgorithmDashboard, FeedCompositionChart, RuleImpactSummary, useAlgorithmStats
 *
 * TDD Red Phase: Components don't exist yet
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';

// TDD - These components don't exist yet, tests will fail until implemented
import { AlgorithmDashboard } from '@/components/algorithm-dashboard/AlgorithmDashboard';
import { FeedCompositionChart } from '@/components/algorithm-dashboard/FeedCompositionChart';
import { RuleImpactSummary } from '@/components/algorithm-dashboard/RuleImpactSummary';
import { useAlgorithmStats, clearStatsCache } from '@/hooks/useAlgorithmStats';

// Theme wrapper for tests
const ThemeProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Test wrapper with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock data
const mockAlgorithmStats = {
  transparencyScore: 85,
  totalRules: 12,
  activeRules: 8,
  lastUpdate: '2025-01-14T10:30:00Z',
  lastUpdated: '2025-01-14T10:30:00Z',
  feedComposition: {
    boosted: 35, // 35%
    demoted: 15, // 15%
    filtered: 5,  // 5%
    unaffected: 45, // 45%
  },
  topRules: [
    {
      id: '1',
      name: 'Prioritize AI content',
      type: 'boost' as const,
      postsAffected: 145,
      averageImpact: 42,
    },
    {
      id: '2',
      name: 'Filter spam keywords',
      type: 'filter' as const,
      postsAffected: 89,
      averageImpact: 0,
    },
    {
      id: '3',
      name: 'Demote clickbait',
      type: 'demote' as const,
      postsAffected: 67,
      averageImpact: -35,
    },
    {
      id: '4',
      name: 'Boost verified accounts',
      type: 'boost' as const,
      postsAffected: 52,
      averageImpact: 25,
    },
    {
      id: '5',
      name: 'Hide NSFW content',
      type: 'filter' as const,
      postsAffected: 41,
      averageImpact: 0,
    },
  ],
};

const mockCompositionData = {
  boosted: 35,
  demoted: 15,
  filtered: 5,
  unaffected: 45,
};

describe('AlgorithmDashboard Component', () => {
  const mockOnToggleAlgorithm = jest.fn();
  const mockOnViewRule = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays overall algorithm transparency score', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByText(/transparency score/i)).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('shows total number of active rules', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByText(/active rules/i)).toBeInTheDocument();
    expect(screen.getByText('8 of 12')).toBeInTheDocument();
  });

  it('shows feed composition breakdown', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getAllByText(/feed composition/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/35% boosted/i)).toBeInTheDocument();
    expect(screen.getByText(/15% demoted/i)).toBeInTheDocument();
    expect(screen.getByText(/5% filtered/i)).toBeInTheDocument();
    expect(screen.getByText(/45% unaffected/i)).toBeInTheDocument();
  });

  it('has toggle to enable/disable algorithmic sorting', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    const algorithmToggle = screen.getByRole('switch', { name: /enable algorithmic sorting/i });
    expect(algorithmToggle).toBeChecked();

    await user.click(algorithmToggle);
    expect(mockOnToggleAlgorithm).toHaveBeenCalledWith(false);
  });

  it('shows chronological mode when algorithm is disabled', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={false}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByText(/chronological mode active/i)).toBeInTheDocument();
    expect(screen.queryByText(/feed composition/i)).not.toBeInTheDocument();
  });

  it('shows last algorithm update timestamp', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    // Should format timestamp nicely - look for any formatted time
    expect(screen.getByRole('time')).toBeInTheDocument();
  });

  it('links to rule editor for each rule type', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    const editRulesButton = screen.getByRole('button', { name: /edit rules/i });
    await user.click(editRulesButton);

    expect(mockOnViewRule).toHaveBeenCalled();
  });

  it('displays transparency score with visual indicator', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    const scoreIndicator = screen.getByTestId('transparency-score-indicator');
    expect(scoreIndicator).toBeInTheDocument();
    expect(scoreIndicator).toHaveAttribute('aria-valuenow', '85');
  });

  it('shows warning when transparency score is low', () => {
    const lowScoreStats = {
      ...mockAlgorithmStats,
      transparencyScore: 45,
    };

    renderWithTheme(
      <AlgorithmDashboard
        stats={lowScoreStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByText(/low transparency/i)).toBeInTheDocument();
    expect(screen.getByText(/consider reviewing your rules/i)).toBeInTheDocument();
  });

  it('renders FeedCompositionChart component', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByTestId('feed-composition-chart')).toBeInTheDocument();
  });

  it('renders RuleImpactSummary component', () => {
    renderWithTheme(
      <AlgorithmDashboard
        stats={mockAlgorithmStats}
        algorithmEnabled={true}
        onToggleAlgorithm={mockOnToggleAlgorithm}
        onViewRule={mockOnViewRule}
      />
    );

    expect(screen.getByTestId('rule-impact-summary')).toBeInTheDocument();
  });
});

describe('FeedCompositionChart Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pie/donut chart showing feed composition', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const chart = screen.getByRole('img', { name: /feed composition chart/i });
    expect(chart).toBeInTheDocument();
  });

  it('shows boosted segment in green', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const boostedSegment = screen.getByTestId('chart-segment-boosted');
    const fill = boostedSegment.getAttribute('fill') || '';
    expect(fill.toLowerCase()).toMatch(/green|#22c55e/i);
  });

  it('shows demoted segment in orange', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const demotedSegment = screen.getByTestId('chart-segment-demoted');
    const fill = demotedSegment.getAttribute('fill') || '';
    expect(fill.toLowerCase()).toMatch(/orange|#f97316/i);
  });

  it('shows filtered segment in red', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const filteredSegment = screen.getByTestId('chart-segment-filtered');
    const fill = filteredSegment.getAttribute('fill') || '';
    expect(fill.toLowerCase()).toMatch(/red|#ef4444/i);
  });

  it('shows unaffected segment in gray', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const unaffectedSegment = screen.getByTestId('chart-segment-unaffected');
    const fill = unaffectedSegment.getAttribute('fill') || '';
    expect(fill.toLowerCase()).toMatch(/gray|#9ca3af/i);
  });

  it('shows percentages on hover', async () => {
    const user = userEvent.setup();
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const boostedSegment = screen.getByTestId('chart-segment-boosted');
    await user.hover(boostedSegment);

    await waitFor(() => {
      expect(screen.getByText(/boosted: 35%/i)).toBeInTheDocument();
    });
  });

  it('displays legend with counts per category', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const legend = screen.getByTestId('chart-legend');
    expect(legend).toBeInTheDocument();

    // Check that all category names are present
    expect(within(legend).getByText(/boosted/i)).toBeInTheDocument();
    expect(within(legend).getByText(/demoted/i)).toBeInTheDocument();
    expect(within(legend).getByText(/filtered/i)).toBeInTheDocument();
    expect(within(legend).getByText(/unaffected/i)).toBeInTheDocument();

    // Check that percentages are displayed (using getAllByText for flexible matching)
    const allText = legend.textContent || '';
    expect(allText).toMatch(/35%/);
    expect(allText).toMatch(/15%/);
    expect(allText).toMatch(/5%/);
    expect(allText).toMatch(/45%/);
  });

  it('is accessible with aria labels', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const chart = screen.getByRole('img', { name: /feed composition chart/i });
    expect(chart).toHaveAttribute('aria-label');

    expect(screen.getByLabelText(/35% of posts are boosted/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/15% of posts are demoted/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/5% of posts are filtered/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/45% of posts are unaffected/i)).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    const emptyData = {
      boosted: 0,
      demoted: 0,
      filtered: 0,
      unaffected: 100,
    };

    renderWithTheme(<FeedCompositionChart data={emptyData} />);

    expect(screen.getByTestId('chart-segment-unaffected')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-segment-boosted')).not.toBeInTheDocument();
  });

  it('calculates correct segment sizes based on percentages', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const boostedSegment = screen.getByTestId('chart-segment-boosted');
    const demotedSegment = screen.getByTestId('chart-segment-demoted');
    const filteredSegment = screen.getByTestId('chart-segment-filtered');
    const unaffectedSegment = screen.getByTestId('chart-segment-unaffected');

    // Check that segments have correct data-percentage attributes
    expect(boostedSegment).toHaveAttribute('data-percentage', '35');
    expect(demotedSegment).toHaveAttribute('data-percentage', '15');
    expect(filteredSegment).toHaveAttribute('data-percentage', '5');
    expect(unaffectedSegment).toHaveAttribute('data-percentage', '45');
  });

  it('displays total percentage as 100%', () => {
    renderWithTheme(<FeedCompositionChart data={mockCompositionData} />);

    const legend = screen.getByTestId('chart-legend');
    expect(within(legend).getByText(/total: 100%/i)).toBeInTheDocument();
  });
});

describe('RuleImpactSummary Component', () => {
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists top 5 most impactful rules', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Prioritize AI content')).toBeInTheDocument();
    expect(screen.getByText('Filter spam keywords')).toBeInTheDocument();
    expect(screen.getByText('Demote clickbait')).toBeInTheDocument();
    expect(screen.getByText('Boost verified accounts')).toBeInTheDocument();
    expect(screen.getByText('Hide NSFW content')).toBeInTheDocument();
  });

  it('shows rule name, type, and posts affected count', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const firstRule = screen.getByTestId('rule-impact-item-1');
    expect(within(firstRule).getByText('Prioritize AI content')).toBeInTheDocument();
    expect(within(firstRule).getByText(/boost/i)).toBeInTheDocument();
    expect(within(firstRule).getByText(/145 posts/i)).toBeInTheDocument();
  });

  it('is sortable by impact in ascending order', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const sortButton = screen.getByRole('button', { name: /sort by impact/i });
    await user.click(sortButton);

    const ruleItems = screen.getAllByTestId(/rule-impact-item-/);
    // After ascending sort, lowest impact first
    expect(ruleItems[0]).toHaveAttribute('data-testid', 'rule-impact-item-2'); // Filter: 0 impact
    expect(ruleItems[4]).toHaveAttribute('data-testid', 'rule-impact-item-1'); // Boost: 42 impact
  });

  it('is sortable by impact in descending order', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const sortButton = screen.getByRole('button', { name: /sort by impact/i });

    // Click twice for descending
    await user.click(sortButton);
    await user.click(sortButton);

    const ruleItems = screen.getAllByTestId(/rule-impact-item-/);
    // After descending sort, highest impact first
    expect(ruleItems[0]).toHaveAttribute('data-testid', 'rule-impact-item-1'); // Boost: 42 impact
  });

  it('is sortable by posts affected', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const sortButton = screen.getByRole('button', { name: /sort by posts affected/i });
    await user.click(sortButton);

    const ruleItems = screen.getAllByTestId(/rule-impact-item-/);
    // Should be sorted by posts affected (descending by default)
    expect(ruleItems[0]).toHaveAttribute('data-testid', 'rule-impact-item-1'); // 145 posts
    expect(ruleItems[1]).toHaveAttribute('data-testid', 'rule-impact-item-2'); // 89 posts
  });

  it('click to view rule details', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const firstRule = screen.getByTestId('rule-impact-item-1');
    await user.click(firstRule);

    expect(mockOnViewDetails).toHaveBeenCalledWith('1');
  });

  it('shows "No rules configured" empty state', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={[]}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText(/no rules configured/i)).toBeInTheDocument();
    expect(screen.getByText(/create rules to customize your feed/i)).toBeInTheDocument();
  });

  it('displays visual indicators for rule types', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const boostRule = screen.getByTestId('rule-impact-item-1');
    expect(within(boostRule).getByTestId('type-badge-boost')).toBeInTheDocument();

    const filterRule = screen.getByTestId('rule-impact-item-2');
    expect(within(filterRule).getByTestId('type-badge-filter')).toBeInTheDocument();

    const demoteRule = screen.getByTestId('rule-impact-item-3');
    expect(within(demoteRule).getByTestId('type-badge-demote')).toBeInTheDocument();
  });

  it('shows average impact for boost and demote rules', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const boostRule = screen.getByTestId('rule-impact-item-1');
    expect(within(boostRule).getByText(/\+42 avg/i)).toBeInTheDocument();

    const demoteRule = screen.getByTestId('rule-impact-item-3');
    expect(within(demoteRule).getByText(/-35 avg/i)).toBeInTheDocument();
  });

  it('does not show average impact for filter rules', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const filterRule = screen.getByTestId('rule-impact-item-2');
    expect(within(filterRule).queryByText(/avg/i)).not.toBeInTheDocument();
  });

  it('shows progress bar for posts affected percentage', () => {
    // Assuming total of 500 posts in feed
    const totalPosts = 500;

    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        totalPosts={totalPosts}
        onViewDetails={mockOnViewDetails}
      />
    );

    const firstRule = screen.getByTestId('rule-impact-item-1');
    const progressBar = within(firstRule).getByRole('progressbar');

    // 145 out of 500 = 29%
    expect(progressBar).toHaveAttribute('aria-valuenow', '29');
  });

  it('limits display to top 5 rules even if more provided', () => {
    const manyRules = [
      ...mockAlgorithmStats.topRules,
      {
        id: '6',
        name: 'Extra rule 1',
        type: 'boost' as const,
        postsAffected: 30,
        averageImpact: 20,
      },
      {
        id: '7',
        name: 'Extra rule 2',
        type: 'demote' as const,
        postsAffected: 25,
        averageImpact: -15,
      },
    ];

    renderWithTheme(
      <RuleImpactSummary
        rules={manyRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    const ruleItems = screen.getAllByTestId(/rule-impact-item-/);
    expect(ruleItems).toHaveLength(5);
  });

  it('shows link to view all rules', () => {
    renderWithTheme(
      <RuleImpactSummary
        rules={mockAlgorithmStats.topRules}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByRole('link', { name: /view all rules/i })).toBeInTheDocument();
  });
});

describe('useAlgorithmStats Hook', () => {
  // Mock fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearStatsCache(); // Clear cache between tests
  });

  it('fetches algorithm statistics on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { result } = renderHook(() => useAlgorithmStats());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith('/api/algorithm/stats');
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockAlgorithmStats);
    expect(result.current.error).toBeNull();
  });

  it('returns totalRules, activeRules, feedComposition, topRules', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.totalRules).toBe(12);
    expect(result.current.data?.activeRules).toBe(8);
    expect(result.current.data?.feedComposition).toEqual(mockCompositionData);
    expect(result.current.data?.topRules).toHaveLength(5);
  });

  it('handles loading state', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useAlgorithmStats());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to fetch stats';
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('handles HTTP error responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toMatch(/404/i);
  });

  it('refreshes on rule changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('provides refresh function', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('accepts custom refetch interval', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    renderHook(() => useAlgorithmStats({ refetchInterval: 5000 }));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('cleans up interval on unmount', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { unmount } = renderHook(() => useAlgorithmStats({ refetchInterval: 5000 }));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount();

    // Fast-forward 10 seconds
    jest.advanceTimersByTime(10000);

    // Should not have made additional fetches after unmount
    expect(global.fetch).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('caches results to avoid unnecessary refetches', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    const { result } = renderHook(() => useAlgorithmStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const firstData = result.current.data;

    // Call refresh but mock returns same data
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Data reference should be the same (cached)
    expect(result.current.data).toBe(firstData);
  });

  it('accepts userId parameter for user-specific stats', async () => {
    const userId = 'user123';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlgorithmStats,
    });

    renderHook(() => useAlgorithmStats({ userId }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/algorithm/stats?userId=${userId}`);
    });
  });
});
