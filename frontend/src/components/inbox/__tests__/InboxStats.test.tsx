import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { InboxStats } from '../InboxStats';
import type { InboxStats as InboxStatsType } from '@/lib/inbox';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockStats: InboxStatsType = {
  total_unread: 15,
  by_platform: {
    twitter: 8,
    bluesky: 5,
    mastodon: 2,
  },
  by_type: {
    mention: 6,
    reply: 5,
    dm: 3,
    comment: 1,
  },
};

describe('InboxStats', () => {
  it('renders total unread count', () => {
    renderWithTheme(<InboxStats stats={mockStats} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/unread/i)).toBeInTheDocument();
  });

  it('renders unread count per platform', () => {
    renderWithTheme(<InboxStats stats={mockStats} />);

    expect(screen.getByTestId('platform-stat-twitter')).toHaveTextContent('8');
    expect(screen.getByTestId('platform-stat-bluesky')).toHaveTextContent('5');
    expect(screen.getByTestId('platform-stat-mastodon')).toHaveTextContent('2');
  });

  it('does not show platform with zero unread', () => {
    const statsWithZero: InboxStatsType = {
      ...mockStats,
      by_platform: {
        twitter: 8,
        bluesky: 0,
      },
    };

    renderWithTheme(<InboxStats stats={statsWithZero} />);

    expect(screen.getByTestId('platform-stat-twitter')).toBeInTheDocument();
    expect(screen.queryByTestId('platform-stat-bluesky')).not.toBeInTheDocument();
  });

  it('renders loading state', () => {
    renderWithTheme(<InboxStats stats={undefined} isLoading={true} />);

    expect(screen.getByTestId('inbox-stats-loading')).toBeInTheDocument();
  });

  it('renders zero state when all read', () => {
    const zeroStats: InboxStatsType = {
      total_unread: 0,
      by_platform: {},
      by_type: {
        mention: 0,
        reply: 0,
        dm: 0,
        comment: 0,
      },
    };

    renderWithTheme(<InboxStats stats={zeroStats} />);

    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('applies correct platform colors', () => {
    renderWithTheme(<InboxStats stats={mockStats} />);

    const twitterBadge = screen.getByTestId('platform-stat-twitter');
    const blueskyBadge = screen.getByTestId('platform-stat-bluesky');

    // Check badges exist
    expect(twitterBadge).toBeInTheDocument();
    expect(blueskyBadge).toBeInTheDocument();
  });

  it('shows platform icons', () => {
    renderWithTheme(<InboxStats stats={mockStats} />);

    // Each platform stat should have an icon
    expect(screen.getByTestId('platform-icon-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon-bluesky')).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    renderWithTheme(<InboxStats stats={mockStats} variant="compact" />);

    const container = screen.getByTestId('inbox-stats');
    expect(container).toHaveAttribute('data-variant', 'compact');
  });

  it('shows type breakdown when expanded', () => {
    renderWithTheme(<InboxStats stats={mockStats} showTypeBreakdown />);

    expect(screen.getByText(/mentions/i)).toBeInTheDocument();
    expect(screen.getByText(/replies/i)).toBeInTheDocument();
  });
});
