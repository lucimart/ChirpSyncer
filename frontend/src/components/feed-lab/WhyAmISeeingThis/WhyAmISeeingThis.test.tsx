import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { WhyAmISeeingThis } from './WhyAmISeeingThis';
import type { FeedExplanation } from './WhyAmISeeingThis';

// Mock the hook
jest.mock('@/hooks/useFeedExplanation', () => ({
  useFeedExplanation: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock RuleContributionChart
jest.mock('../RuleContributionChart', () => ({
  RuleContributionChart: ({ explanation }: { explanation: FeedExplanation }) => (
    <div data-testid="mock-contribution-chart">Chart for {explanation.postId}</div>
  ),
}));

// Mock ui components
jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    Spinner: ({ size }: { size: string }) => <div data-testid="spinner">Loading {size}</div>,
    Modal: ({ isOpen, onClose, title, footer, children }: {
      isOpen: boolean;
      onClose: () => void;
      title: string;
      footer?: React.ReactNode;
      children: React.ReactNode;
    }) => {
      React.useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }, [isOpen, onClose]);

      if (!isOpen) return null;
      return (
        <div role="dialog" aria-label={title} onClick={(e: React.MouseEvent) => e.target === e.currentTarget && onClose()}>
          <div>
            <h2>{title}</h2>
            {children}
            {footer}
          </div>
        </div>
      );
    },
    Button: ({ children, onClick, variant, size }: {
      children: React.ReactNode;
      onClick?: () => void;
      variant?: string;
      size?: string;
    }) => <button onClick={onClick} data-variant={variant} data-size={size}>{children}</button>,
  };
});

const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('WhyAmISeeingThis', () => {
  const mockExplanation: FeedExplanation = {
    postId: 'post-123',
    baseScore: 50,
    totalScore: 100,
    appliedRules: [
      {
        ruleId: 'rule-1',
        ruleName: 'Boost Rule',
        type: 'boost',
        contribution: 30,
        percentage: 30,
        matchedConditions: [
          { field: 'engagement', operator: 'gt', value: '100' },
        ],
      },
      {
        ruleId: 'rule-2',
        ruleName: 'Demote Rule',
        type: 'demote',
        contribution: -20,
        percentage: 20,
        matchedConditions: [
          { field: 'content', operator: 'contains', value: 'spam' },
        ],
      },
    ],
    feedPosition: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-123" />);

    expect(screen.getByRole('button', { name: /why am i seeing this/i })).toBeInTheDocument();
  });

  it('renders info icon', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-123" />);

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('shows loading state when isLoading prop is true', () => {
    renderWithTheme(<WhyAmISeeingThis postId="post-123" isLoading={true} />);

    expect(screen.getByTestId('explanation-loading')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" error="Failed to load" />
    );

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('opens modal when trigger button is clicked', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Feed Explanation')).toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when clicking backdrop', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    // Click the overlay/backdrop (the dialog element in mock, not its content)
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal on Escape key', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays scores when explanation is provided', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByTestId('explanation-scores')).toBeInTheDocument();
    expect(screen.getByText(/base score.*50/i)).toBeInTheDocument();
    expect(screen.getByText(/total score.*100/i)).toBeInTheDocument();
  });

  it('displays feed position when provided', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('displays applied rules', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByTestId('explanation-rules')).toBeInTheDocument();
    expect(screen.getByText('Boost Rule')).toBeInTheDocument();
    expect(screen.getByText('Demote Rule')).toBeInTheDocument();
  });

  it('displays rule contributions with correct formatting', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByText('+30')).toBeInTheDocument();
    expect(screen.getByText('-20')).toBeInTheDocument();
  });

  it('displays matched conditions for rules', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByText(/engagement.*gt.*"100"/)).toBeInTheDocument();
    expect(screen.getByText(/content.*contains.*"spam"/)).toBeInTheDocument();
  });

  it('shows empty state when no rules applied', () => {
    const noRulesExplanation: FeedExplanation = {
      postId: 'post-empty',
      baseScore: 50,
      totalScore: 50,
      appliedRules: [],
    };

    renderWithTheme(
      <WhyAmISeeingThis postId="post-empty" explanation={noRulesExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByText(/default chronological order/i)).toBeInTheDocument();
    expect(screen.getByText(/no custom rules applied/i)).toBeInTheDocument();
  });

  it('calls onClose callback when modal is closed', () => {
    const mockOnClose = jest.fn();

    renderWithTheme(
      <WhyAmISeeingThis
        postId="post-123"
        explanation={mockExplanation}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders contribution chart when rules exist', () => {
    renderWithTheme(
      <WhyAmISeeingThis postId="post-123" explanation={mockExplanation} />
    );

    fireEvent.click(screen.getByRole('button', { name: /why am i seeing this/i }));

    expect(screen.getByTestId('mock-contribution-chart')).toBeInTheDocument();
  });
});
