import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { AlgorithmDashboard, type AlgorithmStats } from './AlgorithmDashboard';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockStats: AlgorithmStats = {
  transparencyScore: 85,
  totalRules: 10,
  activeRules: 7,
  feedComposition: {
    boosted: 30,
    demoted: 15,
    filtered: 5,
    unaffected: 50,
  },
  topRules: [
    {
      id: 'rule-1',
      name: 'Boost Follows',
      type: 'boost',
      postsAffected: 120,
      averageImpact: 25,
    },
    {
      id: 'rule-2',
      name: 'Demote Spam',
      type: 'demote',
      postsAffected: 45,
      averageImpact: -15,
    },
    {
      id: 'rule-3',
      name: 'Filter Blocked Users',
      type: 'filter',
      postsAffected: 10,
    },
  ],
  lastUpdated: '2025-01-14T10:30:00Z',
};

const mockStatsLowTransparency: AlgorithmStats = {
  ...mockStats,
  transparencyScore: 35,
};

describe('AlgorithmDashboard', () => {
  describe('Loading State', () => {
    it('renders loading state', () => {
      renderWithTheme(<AlgorithmDashboard isLoading />);

      expect(screen.getByTestId('algorithm-dashboard')).toHaveClass(
        'algorithm-dashboard--loading'
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading algorithm statistics...')).toBeInTheDocument();
    });

    it('sets aria-busy when loading', () => {
      renderWithTheme(<AlgorithmDashboard isLoading />);

      expect(screen.getByTestId('algorithm-dashboard')).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });
  });

  describe('Error State', () => {
    it('renders error state', () => {
      const error = new Error('Failed to fetch');
      renderWithTheme(<AlgorithmDashboard error={error} />);

      expect(screen.getByTestId('algorithm-dashboard')).toHaveClass(
        'algorithm-dashboard--error'
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load algorithm statistics')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });

    it('renders retry button on error', () => {
      const error = new Error('Network error');
      renderWithTheme(<AlgorithmDashboard error={error} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Default State', () => {
    it('renders dashboard with stats', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByTestId('algorithm-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Algorithm Dashboard')).toBeInTheDocument();
    });

    it('renders transparency score', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByText('Transparency Score')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('renders active rules count', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByText('Active Rules')).toBeInTheDocument();
      expect(screen.getByText('7 of 10')).toBeInTheDocument();
    });

    it('renders feed composition breakdown', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByText('Feed Composition')).toBeInTheDocument();
      expect(screen.getByText('30% boosted')).toBeInTheDocument();
      expect(screen.getByText('15% demoted')).toBeInTheDocument();
      expect(screen.getByText('5% filtered')).toBeInTheDocument();
      expect(screen.getByText('50% unaffected')).toBeInTheDocument();
    });

    it('renders top rules section', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByText('Top Impactful Rules')).toBeInTheDocument();
    });

    it('renders last updated timestamp', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByText('Last updated:')).toBeInTheDocument();
    });
  });

  describe('Algorithm Toggle', () => {
    it('renders toggle switch', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      const toggle = screen.getByRole('switch', { name: /enable algorithmic sorting/i });
      expect(toggle).toBeInTheDocument();
    });

    it('toggle is checked when algorithm is enabled', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} algorithmEnabled />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toBeChecked();
    });

    it('toggle is unchecked when algorithm is disabled', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} algorithmEnabled={false} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
    });

    it('calls onToggleAlgorithm when toggle is clicked', () => {
      const onToggle = jest.fn();
      renderWithTheme(
        <AlgorithmDashboard
          stats={mockStats}
          algorithmEnabled
          onToggleAlgorithm={onToggle}
        />
      );

      fireEvent.click(screen.getByRole('switch'));
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('shows chronological mode notice when disabled', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} algorithmEnabled={false} />);

      expect(screen.getByText('Chronological mode active')).toBeInTheDocument();
    });

    it('hides stats sections when algorithm is disabled', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} algorithmEnabled={false} />);

      expect(screen.queryByText('Transparency Score')).not.toBeInTheDocument();
      expect(screen.queryByText('Feed Composition')).not.toBeInTheDocument();
    });
  });

  describe('Transparency Warning', () => {
    it('shows warning for low transparency score', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStatsLowTransparency} />);

      expect(screen.getByText('Low transparency')).toBeInTheDocument();
      expect(
        screen.getByText('Consider reviewing your rules to improve transparency.')
      ).toBeInTheDocument();
    });

    it('does not show warning for high transparency score', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.queryByText('Low transparency')).not.toBeInTheDocument();
    });

    it('applies warning class to transparency indicator', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStatsLowTransparency} />);

      expect(screen.getByTestId('transparency-score-indicator')).toHaveClass(
        'algorithm-dashboard__score-indicator--low'
      );
    });
  });

  describe('Interactions', () => {
    it('calls onEditRules when edit button is clicked', () => {
      const onEditRules = jest.fn();
      renderWithTheme(<AlgorithmDashboard stats={mockStats} onEditRules={onEditRules} />);

      fireEvent.click(screen.getByRole('button', { name: /edit rules/i }));
      expect(onEditRules).toHaveBeenCalled();
    });

    it('calls onViewRule when edit button is clicked', () => {
      const onViewRule = jest.fn();
      renderWithTheme(<AlgorithmDashboard stats={mockStats} onViewRule={onViewRule} />);

      fireEvent.click(screen.getByRole('button', { name: /edit rules/i }));
      expect(onViewRule).toHaveBeenCalledWith();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on transparency score', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      const meter = screen.getByRole('meter');
      expect(meter).toHaveAttribute(
        'aria-label',
        'Transparency score: 85 out of 100'
      );
      expect(meter).toHaveAttribute('aria-valuenow', '85');
    });

    it('sections have proper aria-labelledby', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} />);

      expect(screen.getByRole('heading', { name: 'Transparency Score' })).toHaveAttribute(
        'id',
        'transparency-heading'
      );
    });

    it('chronological notice has proper role', () => {
      renderWithTheme(<AlgorithmDashboard stats={mockStats} algorithmEnabled={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
