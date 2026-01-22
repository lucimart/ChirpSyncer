import { render, screen, fireEvent } from '@testing-library/react';
import { RuleContributionChart } from './RuleContributionChart';

describe('RuleContributionChart', () => {
  const mockContributions = [
    {
      ruleId: 'rule-1',
      ruleName: 'Boost Rule',
      ruleType: 'boost' as const,
      contribution: 30,
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Demote Rule',
      ruleType: 'demote' as const,
      contribution: -20,
    },
  ];

  it('renders the chart container', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByTestId('contribution-chart')).toBeInTheDocument();
  });

  it('displays total score', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByTestId('total-score')).toHaveTextContent('60');
  });

  it('shows empty state when no contributions', () => {
    render(
      <RuleContributionChart
        contributions={[]}
        baseScore={50}
      />
    );

    expect(screen.getByText(/no rules applied/i)).toBeInTheDocument();
  });

  it('renders base score line', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByTestId('base-score-line')).toBeInTheDocument();
  });

  it('renders bars for each contribution', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByTestId('chart-bar-rule-1')).toBeInTheDocument();
    expect(screen.getByTestId('chart-bar-rule-2')).toBeInTheDocument();
  });

  it('renders labels for each rule', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByTestId('chart-label-rule-1')).toHaveTextContent('Boost Rule');
    expect(screen.getByTestId('chart-label-rule-2')).toHaveTextContent('Demote Rule');
  });

  it('positions boost bars above baseline', () => {
    render(
      <RuleContributionChart
        contributions={[mockContributions[0]]}
        baseScore={50}
        totalScore={80}
      />
    );

    const boostBar = screen.getByTestId('chart-bar-rule-1');
    expect(boostBar).toHaveAttribute('data-position', 'above-baseline');
  });

  it('positions demote bars below baseline', () => {
    render(
      <RuleContributionChart
        contributions={[mockContributions[1]]}
        baseScore={50}
        totalScore={30}
      />
    );

    const demoteBar = screen.getByTestId('chart-bar-rule-2');
    expect(demoteBar).toHaveAttribute('data-position', 'below-baseline');
  });

  it('calls onRuleHover when hovering over a bar', () => {
    const mockOnHover = jest.fn();

    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
        onRuleHover={mockOnHover}
      />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    fireEvent.mouseEnter(bar);

    expect(mockOnHover).toHaveBeenCalledWith('rule-1');
  });

  it('calls onRuleClick when clicking a bar', () => {
    const mockOnClick = jest.fn();

    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
        onRuleClick={mockOnClick}
      />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    fireEvent.click(bar);

    expect(mockOnClick).toHaveBeenCalledWith('rule-1');
  });

  it('shows tooltip on hover', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    fireEvent.mouseEnter(bar);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    fireEvent.mouseEnter(bar);
    fireEvent.mouseLeave(bar);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('accepts explanation format', () => {
    render(
      <RuleContributionChart
        explanation={{
          postId: 'post-1',
          baseScore: 50,
          totalScore: 100,
          appliedRules: [
            {
              ruleId: 'rule-1',
              ruleName: 'Test Rule',
              type: 'boost',
              contribution: 50,
              percentage: 50,
              matchedConditions: [],
            },
          ],
        }}
      />
    );

    expect(screen.getByTestId('total-score')).toHaveTextContent('100');
    expect(screen.getByTestId('chart-bar-rule-1')).toBeInTheDocument();
  });

  it('has accessible labels', () => {
    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
      />
    );

    expect(screen.getByLabelText(/feed score breakdown chart/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /bar chart/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation on bars', () => {
    const mockOnClick = jest.fn();

    render(
      <RuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={60}
        onRuleClick={mockOnClick}
      />
    );

    const bar = screen.getByTestId('chart-bar-rule-1');
    fireEvent.keyDown(bar, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledWith('rule-1');
  });
});
