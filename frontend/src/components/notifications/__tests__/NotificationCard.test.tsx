import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { NotificationCard } from '../NotificationCard';
import type { NotificationWithCategory } from '../NotificationCard/types';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockNotification: NotificationWithCategory = {
  id: 'notif-1',
  type: 'sync_completed',
  category: 'sync',
  title: 'Sync Completed',
  body: 'Successfully synced 15 posts from Twitter to Bluesky.',
  data: { posts_synced: 15 },
  priority: 2,
  is_read: false,
  created_at: '2024-01-15T10:30:00Z',
};

describe('NotificationCard', () => {
  it('renders notification title and body', () => {
    renderWithTheme(<NotificationCard notification={mockNotification} />);

    expect(screen.getByText('Sync Completed')).toBeInTheDocument();
    expect(screen.getByText(/Successfully synced 15 posts/)).toBeInTheDocument();
  });

  it('shows unread indicator for unread notifications', () => {
    renderWithTheme(<NotificationCard notification={mockNotification} />);

    expect(screen.getByTestId('unread-indicator')).toBeInTheDocument();
  });

  it('does not show unread indicator for read notifications', () => {
    const readNotification = { ...mockNotification, is_read: true };
    renderWithTheme(<NotificationCard notification={readNotification} />);

    expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument();
  });

  it('displays category icon based on notification category', () => {
    renderWithTheme(<NotificationCard notification={mockNotification} />);

    expect(screen.getByTestId('category-icon')).toBeInTheDocument();
  });

  it('shows correct priority indicator color', () => {
    const urgentNotification = { ...mockNotification, priority: 4 as const };
    renderWithTheme(<NotificationCard notification={urgentNotification} />);

    expect(screen.getByTestId('priority-indicator')).toBeInTheDocument();
  });

  it('displays critical priority with animation class', () => {
    const criticalNotification = { ...mockNotification, priority: 5 as const };
    renderWithTheme(<NotificationCard notification={criticalNotification} />);

    expect(screen.getByTestId('priority-indicator')).toHaveAttribute('data-critical', 'true');
  });

  it('calls onMarkAsRead when mark read button clicked', () => {
    const onMarkAsRead = jest.fn();
    renderWithTheme(
      <NotificationCard notification={mockNotification} onMarkAsRead={onMarkAsRead} />
    );

    const readButton = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(readButton);

    expect(onMarkAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('does not show mark as read button for already read notifications', () => {
    const readNotification = { ...mockNotification, is_read: true };
    renderWithTheme(<NotificationCard notification={readNotification} />);

    expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
  });

  it('displays relative timestamp', () => {
    renderWithTheme(<NotificationCard notification={mockNotification} />);

    expect(screen.getByTestId('notification-time')).toBeInTheDocument();
  });

  it('renders different category icons correctly', () => {
    const categories: NotificationWithCategory['category'][] = ['sync', 'alert', 'system', 'engagement', 'security'];

    categories.forEach((category) => {
      const notification = { ...mockNotification, category };
      const { unmount } = renderWithTheme(
        <NotificationCard notification={notification} />
      );
      expect(screen.getByTestId('category-icon')).toBeInTheDocument();
      unmount();
    });
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    renderWithTheme(
      <NotificationCard notification={mockNotification} onClick={onClick} />
    );

    const card = screen.getByTestId('notification-card');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith(mockNotification);
  });

  it('renders notification with data metadata', () => {
    const notificationWithData = {
      ...mockNotification,
      data: { posts_synced: 15, platform: 'twitter' },
    };
    renderWithTheme(<NotificationCard notification={notificationWithData} />);

    expect(screen.getByText(/Successfully synced 15 posts/)).toBeInTheDocument();
  });
});
