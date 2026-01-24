import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { NotificationCenter } from './NotificationCenter';
import type { Notification } from '../types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'sync_complete',
    title: 'Sync Complete',
    message: 'Successfully synced 10 posts',
    timestamp: new Date().toISOString(),
    read: false,
    severity: 'success',
  },
  {
    id: '2',
    type: 'sync_failed',
    title: 'Sync Failed',
    message: 'Failed to sync posts',
    timestamp: new Date().toISOString(),
    read: true,
    severity: 'error',
  },
  {
    id: '3',
    type: 'rate_limit',
    title: 'Rate Limit Warning',
    message: 'Approaching rate limit',
    timestamp: new Date().toISOString(),
    read: false,
    severity: 'warning',
  },
];

describe('NotificationCenter', () => {
  const defaultProps = {
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bell button', () => {
    renderWithTheme(<NotificationCenter {...defaultProps} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    renderWithTheme(<NotificationCenter {...defaultProps} />);
    expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
  });

  it('does not show unread count when all notifications are read', () => {
    const readNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
    renderWithTheme(<NotificationCenter {...defaultProps} notifications={readNotifications} />);
    expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument();
  });

  it('opens dropdown when bell is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationCenter {...defaultProps} />
      </div>
    );

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when pressing Escape', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });

  it('displays all notifications in the dropdown', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);

    await user.click(screen.getByTestId('notification-bell'));

    expect(screen.getByText('Sync Complete')).toBeInTheDocument();
    expect(screen.getByText('Sync Failed')).toBeInTheDocument();
    expect(screen.getByText('Rate Limit Warning')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} notifications={[]} />);

    await user.click(screen.getByTestId('notification-bell'));
    expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('calls onMarkAllAsRead when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);

    await user.click(screen.getByTestId('notification-bell'));
    await user.click(screen.getByLabelText('Mark all as read'));

    expect(defaultProps.onMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('has settings link in footer', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);

    await user.click(screen.getByTestId('notification-bell'));
    const settingsLink = screen.getByTestId('notification-settings-link');

    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/dashboard/settings/notifications');
  });

  it('has correct aria attributes on bell button', () => {
    renderWithTheme(<NotificationCenter {...defaultProps} />);
    const bell = screen.getByTestId('notification-bell');

    expect(bell).toHaveAttribute('aria-label', 'Notifications');
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    expect(bell).toHaveAttribute('aria-haspopup', 'true');
  });

  it('updates aria-expanded when dropdown opens', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationCenter {...defaultProps} />);
    const bell = screen.getByTestId('notification-bell');

    expect(bell).toHaveAttribute('aria-expanded', 'false');

    await user.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
  });
});
