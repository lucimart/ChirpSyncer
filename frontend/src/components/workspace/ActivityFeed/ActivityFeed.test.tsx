import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ActivityFeed, type ActivityItem } from './ActivityFeed';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'credential_added',
    userId: 'user-1',
    userName: 'John Doe',
    description: 'added Twitter credentials',
    timestamp: new Date().toISOString(),
    metadata: { platform: 'twitter' },
  },
  {
    id: '2',
    type: 'member_invited',
    userId: 'user-2',
    userName: 'Jane Smith',
    description: 'invited alice@example.com',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: { email: 'alice@example.com' },
  },
  {
    id: '3',
    type: 'rule_deleted',
    userId: 'user-1',
    userName: 'John Doe',
    description: 'deleted cleanup rule "Old Posts"',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    metadata: { ruleName: 'Old Posts' },
  },
];

describe('ActivityFeed', () => {
  const defaultProps = {
    activities: mockActivities,
    isLoading: false,
    hasMore: false,
    onLoadMore: jest.fn(),
  };

  it('renders activity feed container', () => {
    renderWithTheme(<ActivityFeed {...defaultProps} />);
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('renders all activity items', () => {
    renderWithTheme(<ActivityFeed {...defaultProps} />);
    expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-3')).toBeInTheDocument();
  });

  it('displays user name and description', () => {
    renderWithTheme(<ActivityFeed {...defaultProps} />);
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getByText('added Twitter credentials')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading and no activities', () => {
    renderWithTheme(
      <ActivityFeed
        activities={[]}
        isLoading={true}
        hasMore={false}
        onLoadMore={jest.fn()}
      />
    );
    expect(screen.getByTestId('activity-loading')).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    renderWithTheme(
      <ActivityFeed
        activities={[]}
        isLoading={false}
        hasMore={false}
        onLoadMore={jest.fn()}
      />
    );
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('shows Load More button when hasMore is true', () => {
    renderWithTheme(
      <ActivityFeed {...defaultProps} hasMore={true} />
    );
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('calls onLoadMore when Load More button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    renderWithTheme(
      <ActivityFeed {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />
    );
    await user.click(screen.getByRole('button', { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('filters activities by type', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ActivityFeed {...defaultProps} />);

    const filterSelect = screen.getByRole('combobox', { name: /filter by type/i });
    await user.selectOptions(filterSelect, 'credential_added');

    expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-item-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('activity-item-3')).not.toBeInTheDocument();
  });

  it('shows all activities when filter is set to all', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ActivityFeed {...defaultProps} />);

    const filterSelect = screen.getByRole('combobox', { name: /filter by type/i });
    await user.selectOptions(filterSelect, 'credential_added');
    await user.selectOptions(filterSelect, 'all');

    expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-3')).toBeInTheDocument();
  });

  it('displays correct icon for each activity type', () => {
    renderWithTheme(<ActivityFeed {...defaultProps} />);
    expect(screen.getByTestId('activity-icon-credential_added')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-member_invited')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-rule_deleted')).toBeInTheDocument();
  });

  it('shows additional loading skeleton when loading more', () => {
    renderWithTheme(
      <ActivityFeed {...defaultProps} isLoading={true} hasMore={true} />
    );
    expect(screen.getByTestId('activity-loading')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-1')).toBeInTheDocument();
  });
});
