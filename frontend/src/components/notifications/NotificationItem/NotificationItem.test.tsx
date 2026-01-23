import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '../types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'test-1',
  type: 'sync_complete',
  title: 'Test Notification',
  message: 'This is a test notification message',
  timestamp: new Date().toISOString(),
  read: false,
  severity: 'success',
  ...overrides,
});

describe('NotificationItem', () => {
  const defaultProps = {
    notification: createNotification(),
    onMarkAsRead: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification title and message', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);

    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test notification message')).toBeInTheDocument();
  });

  it('renders with correct data-testid', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    expect(screen.getByTestId('notification-item-test-1')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    expect(screen.getByTestId('notification-timestamp')).toBeInTheDocument();
  });

  it('renders icon based on notification type', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
  });

  it('calls onMarkAsRead when item is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationItem {...defaultProps} />);

    await user.click(screen.getByTestId('notification-item-test-1'));
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('test-1');
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationItem {...defaultProps} />);

    await user.click(screen.getByTestId('dismiss-button'));
    expect(defaultProps.onDismiss).toHaveBeenCalledWith('test-1');
    expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
  });

  it('does not call onMarkAsRead when clicking dismiss button', async () => {
    const user = userEvent.setup();
    renderWithTheme(<NotificationItem {...defaultProps} />);

    await user.click(screen.getByTestId('dismiss-button'));
    expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled();
  });

  it('renders with correct severity attribute', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    const item = screen.getByTestId('notification-item-test-1');
    expect(item).toHaveAttribute('data-severity', 'success');
  });

  it('renders read notification with data-read attribute', () => {
    const readNotification = createNotification({ read: true });
    renderWithTheme(
      <NotificationItem {...defaultProps} notification={readNotification} />
    );
    const item = screen.getByTestId('notification-item-test-1');
    expect(item).toHaveAttribute('data-read', 'true');
  });

  it('renders unread notification with data-read attribute', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    const item = screen.getByTestId('notification-item-test-1');
    expect(item).toHaveAttribute('data-read', 'false');
  });

  it('renders action button when actionUrl and actionLabel are provided', () => {
    const notificationWithAction = createNotification({
      actionUrl: '/dashboard/sync',
      actionLabel: 'View Details',
    });
    renderWithTheme(
      <NotificationItem {...defaultProps} notification={notificationWithAction} />
    );

    expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument();
  });

  it('does not render action button when actionUrl is missing', () => {
    const notificationWithoutAction = createNotification({
      actionLabel: 'View Details',
    });
    renderWithTheme(
      <NotificationItem {...defaultProps} notification={notificationWithoutAction} />
    );

    expect(screen.queryByRole('button', { name: 'View Details' })).not.toBeInTheDocument();
  });

  it('renders different severity types correctly', () => {
    const severities = ['success', 'error', 'warning', 'info'] as const;

    severities.forEach((severity) => {
      const { unmount } = renderWithTheme(
        <NotificationItem
          {...defaultProps}
          notification={createNotification({ id: severity, severity })}
        />
      );

      expect(screen.getByTestId(`notification-item-${severity}`)).toHaveAttribute(
        'data-severity',
        severity
      );
      unmount();
    });
  });

  it('has correct aria-label for accessibility', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    const item = screen.getByTestId('notification-item-test-1');
    expect(item).toHaveAttribute('aria-label', 'Notification: Test Notification');
  });

  it('dismiss button has correct aria-label', () => {
    renderWithTheme(<NotificationItem {...defaultProps} />);
    expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
  });
});
