import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { NivoRuleContributionChart } from './NivoRuleContributionChart';
import type { RuleContribution } from '../shared';

// Mock Nivo bar chart
jest.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data, onMouseEnter, onMouseLeave, onClick }: {
    data: Array<{ id: string; ruleName: string; contribution: number }>;
    onMouseEnter?: (datum: { data: { id: string } }) => void;
    onMouseLeave?: () => void;
    onClick?: (datum: { data: { id: string } }) => void;
  }) => (
    <div data-testid="nivo-bar">
      {data.map((datum) => (
        <div
          key={datum.id}
          data-testid={`bar-${datum.id}`}
          onMouseEnter={() => onMouseEnter?.({ data: { id: datum.id } })}
          onMouseLeave={() => onMouseLeave?.()}
          onClick={() => onClick?.({ data: { id: datum.id } })}
        >
          {datum.ruleName}: {datum.contribution}
        </div>
      ))}
    </div>
  ),
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockContributions: RuleContribution[] = [
  { ruleId: 'rule-1', ruleName: 'Boost Popular', ruleType: 'boost', contribution: 20 },
  { ruleId: 'rule-2', ruleName: 'Demote Spam', ruleType: 'demote', contribution: -15 },
  { ruleId: 'rule-3', ruleName: 'Boost New', ruleType: 'boost', contribution: 10 },
];

describe('NivoRuleContributionChart', () => {
  it('renders with data-testid', () => {
    renderWithTheme(<NivoRuleContributionChart contributions={mockContributions} />);
    expect(screen.getByTestId('contribution-chart')).toBeInTheDocument();
  });

  it('renders Nivo bar chart', () => {
    renderWithTheme(<NivoRuleContributionChart contributions={mockContributions} />);
    expect(screen.getByTestId('nivo-bar')).toBeInTheDocument();
  });

  it('renders bars for all contributions', () => {
    renderWithTheme(<NivoRuleContributionChart contributions={mockContributions} />);
    expect(screen.getByTestId('bar-rule-1')).toBeInTheDocument();
    expect(screen.getByTestId('bar-rule-2')).toBeInTheDocument();
    expect(screen.getByTestId('bar-rule-3')).toBeInTheDocument();
  });

  it('shows total score in header', () => {
    renderWithTheme(
      <NivoRuleContributionChart
        contributions={mockContributions}
        baseScore={50}
        totalScore={65}
      />
    );
    expect(screen.getByTestId('total-score')).toHaveTextContent('65');
  });

  it('calculates total score if not provided', () => {
    renderWithTheme(
      <NivoRuleContributionChart contributions={mockContributions} baseScore={50} />
    );
    // 50 + 20 - 15 + 10 = 65
    expect(screen.getByTestId('total-score')).toHaveTextContent('65');
  });

  it('shows empty state when no contributions', () => {
    renderWithTheme(<NivoRuleContributionChart contributions={[]} />);
    expect(screen.getByText('No rules applied')).toBeInTheDocument();
    expect(screen.getByText('Showing base score only')).toBeInTheDocument();
  });

  it('calls onRuleHover on mouse enter', () => {
    const handleHover = jest.fn();
    renderWithTheme(
      <NivoRuleContributionChart contributions={mockContributions} onRuleHover={handleHover} />
    );

    fireEvent.mouseEnter(screen.getByTestId('bar-rule-1'));
    expect(handleHover).toHaveBeenCalledWith('rule-1');
  });

  it('calls onRuleHover with null on mouse leave', () => {
    const handleHover = jest.fn();
    renderWithTheme(
      <NivoRuleContributionChart contributions={mockContributions} onRuleHover={handleHover} />
    );

    fireEvent.mouseLeave(screen.getByTestId('bar-rule-1'));
    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it('calls onRuleClick on click', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <NivoRuleContributionChart contributions={mockContributions} onRuleClick={handleClick} />
    );

    fireEvent.click(screen.getByTestId('bar-rule-2'));
    expect(handleClick).toHaveBeenCalledWith('rule-2');
  });

  it('shows Score Breakdown title', () => {
    renderWithTheme(<NivoRuleContributionChart contributions={mockContributions} />);
    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
  });
});
