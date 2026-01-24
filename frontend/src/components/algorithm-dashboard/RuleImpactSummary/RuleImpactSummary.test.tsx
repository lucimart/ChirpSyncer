import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { RuleImpactSummary, type RuleImpact } from './RuleImpactSummary';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockRules: RuleImpact[] = [
  {
    id: 'rule-1',
    name: 'Boost Followed Users',
    type: 'boost',
    postsAffected: 120,
    averageImpact: 25,
  },
  {
    id: 'rule-2',
    name: 'Demote Spam Content',
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
  {
    id: 'rule-4',
    name: 'Boost Mutuals',
    type: 'boost',
    postsAffected: 85,
    averageImpact: 18,
  },
  {
    id: 'rule-5',
    name: 'Demote Low Engagement',
    type: 'demote',
    postsAffected: 32,
    averageImpact: -8,
  },
  {
    id: 'rule-6',
    name: 'Extra Rule',
    type: 'boost',
    postsAffected: 20,
    averageImpact: 5,
  },
];

describe('RuleImpactSummary', () => {
  describe('Rendering', () => {
    it('renders summary container', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByTestId('rule-impact-summary')).toBeInTheDocument();
    });

    it('renders title', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByText('Top Rules')).toBeInTheDocument();
    });

    it('renders rule list', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByRole('list', { name: /impact rules list/i })).toBeInTheDocument();
    });

    it('renders maximum 5 rules', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      // Rule items have role="button" on li elements, filter by testid pattern
      const ruleItems = screen.getAllByTestId(/^rule-impact-item-/);
      expect(ruleItems).toHaveLength(5);
    });

    it('renders all rules if less than 5', () => {
      const fewRules = mockRules.slice(0, 3);
      renderWithTheme(<RuleImpactSummary rules={fewRules} />);

      const ruleItems = screen.getAllByTestId(/^rule-impact-item-/);
      expect(ruleItems).toHaveLength(3);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no rules', () => {
      renderWithTheme(<RuleImpactSummary rules={[]} />);

      expect(screen.getByTestId('rule-impact-summary')).toHaveClass(
        'rule-impact-summary--empty'
      );
      expect(screen.getByText('No rules configured')).toBeInTheDocument();
      expect(screen.getByText('Create rules to customize your feed')).toBeInTheDocument();
    });
  });

  describe('Rule Display', () => {
    it('displays rule names', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 3)} />);

      expect(screen.getByText('Boost Followed Users')).toBeInTheDocument();
      expect(screen.getByText('Demote Spam Content')).toBeInTheDocument();
      expect(screen.getByText('Filter Blocked Users')).toBeInTheDocument();
    });

    it('displays type badges', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 3)} />);

      expect(screen.getByTestId('type-badge-boost')).toHaveTextContent('Boost');
      expect(screen.getByTestId('type-badge-demote')).toHaveTextContent('Demote');
      expect(screen.getByTestId('type-badge-filter')).toHaveTextContent('Filter');
    });

    it('displays posts affected count', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 2)} />);

      expect(screen.getByText('120 posts')).toBeInTheDocument();
      expect(screen.getByText('45 posts')).toBeInTheDocument();
    });

    it('displays average impact for boost/demote rules', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 2)} />);

      expect(screen.getByText('+25 avg')).toBeInTheDocument();
      expect(screen.getByText('-15 avg')).toBeInTheDocument();
    });

    it('does not display average impact for filter rules', () => {
      const filterRule: RuleImpact[] = [
        {
          id: 'filter-1',
          name: 'Filter Test',
          type: 'filter',
          postsAffected: 50,
          averageImpact: 0,
        },
      ];
      renderWithTheme(<RuleImpactSummary rules={filterRule} />);

      expect(screen.queryByText(/avg/i)).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('renders sort buttons', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByRole('button', { name: /sort by impact/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /sort by posts affected/i })
      ).toBeInTheDocument();
    });

    it('defaults to sort by impact', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      const impactButton = screen.getByRole('button', { name: /sort by impact/i });
      expect(impactButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles sort direction when clicking same sort button', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      const impactButton = screen.getByRole('button', { name: /sort by impact/i });

      // Initially descending
      expect(impactButton).toHaveTextContent('\u2193');

      // Click to change to ascending
      fireEvent.click(impactButton);
      expect(impactButton).toHaveTextContent('\u2191');
    });

    it('calls onSortChange when sort changes (controlled)', () => {
      const onSortChange = jest.fn();
      renderWithTheme(
        <RuleImpactSummary
          rules={mockRules}
          sortBy="impact"
          sortOrder="desc"
          onSortChange={onSortChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /sort by posts affected/i }));
      expect(onSortChange).toHaveBeenCalledWith('postsAffected', 'desc');
    });

    it('switches to new sort field with desc order', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      const postsButton = screen.getByRole('button', { name: /sort by posts affected/i });
      fireEvent.click(postsButton);

      expect(postsButton).toHaveAttribute('aria-pressed', 'true');
      expect(postsButton).toHaveTextContent('\u2193');
    });
  });

  describe('Interactions', () => {
    it('calls onRuleClick when rule is clicked', () => {
      const onRuleClick = jest.fn();
      renderWithTheme(<RuleImpactSummary rules={mockRules} onRuleClick={onRuleClick} />);

      fireEvent.click(screen.getByTestId('rule-impact-item-rule-1'));
      expect(onRuleClick).toHaveBeenCalledWith('rule-1');
    });

    it('calls onViewDetails when rule is clicked', () => {
      const onViewDetails = jest.fn();
      renderWithTheme(
        <RuleImpactSummary rules={mockRules} onViewDetails={onViewDetails} />
      );

      fireEvent.click(screen.getByTestId('rule-impact-item-rule-2'));
      expect(onViewDetails).toHaveBeenCalledWith('rule-2');
    });

    it('handles keyboard navigation (Enter)', () => {
      const onRuleClick = jest.fn();
      renderWithTheme(<RuleImpactSummary rules={mockRules} onRuleClick={onRuleClick} />);

      const ruleItem = screen.getByTestId('rule-impact-item-rule-1');
      fireEvent.keyDown(ruleItem, { key: 'Enter' });
      expect(onRuleClick).toHaveBeenCalledWith('rule-1');
    });

    it('handles keyboard navigation (Space)', () => {
      const onRuleClick = jest.fn();
      renderWithTheme(<RuleImpactSummary rules={mockRules} onRuleClick={onRuleClick} />);

      const ruleItem = screen.getByTestId('rule-impact-item-rule-1');
      fireEvent.keyDown(ruleItem, { key: ' ' });
      expect(onRuleClick).toHaveBeenCalledWith('rule-1');
    });

    it('calls onViewAllClick when view all link is clicked', () => {
      const onViewAllClick = jest.fn();
      renderWithTheme(
        <RuleImpactSummary rules={mockRules} onViewAllClick={onViewAllClick} />
      );

      fireEvent.click(screen.getByRole('link', { name: /view all rules/i }));
      expect(onViewAllClick).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bars when totalPosts is provided', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 1)} totalPosts={500} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '24'); // 120/500 = 24%
    });

    it('does not render progress bars without totalPosts', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 1)} />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper region role', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByRole('region', { name: /rule impact summary/i })).toBeInTheDocument();
    });

    it('rule items have proper aria-labels', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 1)} />);

      const ruleItem = screen.getByTestId('rule-impact-item-rule-1');
      expect(ruleItem).toHaveAttribute(
        'aria-label',
        'Boost Followed Users, Boost rule, 120 posts affected'
      );
    });

    it('rule items are focusable', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules.slice(0, 1)} />);

      const ruleItem = screen.getByTestId('rule-impact-item-rule-1');
      expect(ruleItem).toHaveAttribute('tabIndex', '0');
    });

    it('sort controls have proper group role', () => {
      renderWithTheme(<RuleImpactSummary rules={mockRules} />);

      expect(screen.getByRole('group', { name: /sort options/i })).toBeInTheDocument();
    });
  });
});
