/**
 * Smart Notifications Tests (TDD)
 *
 * Tests for NotificationCenter, NotificationItem, and NotificationSettings components
 * Based on UI_UX_INNOVATIONS_IMPLEMENTATION.md spec (P1.3 - Notificaciones Inteligentes)
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Component imports (to be implemented)
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

// Types for Notifications feature
export interface Notification {
  id: string;
  type: 'sync_complete' | 'sync_failed' | 'rate_limit' | 'credential_expired' | 'scheduled_post' | 'engagement_alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  thresholds: {
    syncFailures: number; // Alert after N failures
    rateLimitWarning: number; // Alert when X% of rate limit used
    engagementDrop: number; // Alert when engagement drops X%
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
  };
  categories: {
    sync: boolean;
    scheduling: boolean;
    engagement: boolean;
    security: boolean;
  };
}

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Theme wrapper
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'sync_complete',
    title: 'Sync Completed',
    message: '15 posts synced successfully to Bluesky',
    timestamp: '2026-01-22T10:30:00Z',
    read: false,
    severity: 'success',
    actionUrl: '/dashboard/sync',
    actionLabel: 'View Details',
  },
  {
    id: '2',
    type: 'sync_failed',
    title: 'Sync Failed',
    message: 'Failed to sync 3 posts due to rate limiting',
    timestamp: '2026-01-22T10:00:00Z',
    read: false,
    severity: 'error',
    actionUrl: '/dashboard/sync',
    actionLabel: 'Retry',
  },
  {
    id: '3',
    type: 'rate_limit',
    title: 'Rate Limit Warning',
    message: 'Twitter API rate limit at 80%',
    timestamp: '2026-01-22T09:30:00Z',
    read: true,
    severity: 'warning',
  },
  {
    id: '4',
    type: 'scheduled_post',
    title: 'Post Scheduled',
    message: 'Your post will be published tomorrow at 10 AM',
    timestamp: '2026-01-22T09:00:00Z',
    read: true,
    severity: 'info',
    actionUrl: '/dashboard/scheduler',
    actionLabel: 'View Schedule',
  },
  {
    id: '5',
    type: 'engagement_alert',
    title: 'Engagement Drop',
    message: 'Engagement dropped 25% this week',
    timestamp: '2026-01-21T18:00:00Z',
    read: true,
    severity: 'warning',
    actionUrl: '/dashboard/analytics',
    actionLabel: 'View Analytics',
  },
];

const mockPreferences: NotificationPreferences = {
  channels: {
    inApp: true,
    email: true,
    push: false,
  },
  thresholds: {
    syncFailures: 3,
    rateLimitWarning: 80,
    engagementDrop: 20,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
  categories: {
    sync: true,
    scheduling: true,
    engagement: true,
    security: true,
  },
};

// ============================================================================
// NotificationCenter Component Tests
// ============================================================================

describe('NotificationCenter Component', () => {
  const defaultProps = {
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification bell button with data-testid="notification-bell"', () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('shows unread count badge', () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      const badge = screen.getByTestId('unread-count');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2'); // 2 unread notifications
    });

    it('hides badge when all notifications are read', () => {
      const allRead = mockNotifications.map((n) => ({ ...n, read: true }));
      renderWithTheme(<NotificationCenter {...defaultProps} notifications={allRead} />);

      expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown when bell is clicked', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });
    });

    it('closes dropdown when clicking outside', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
      });
    });

    it('has header with "Notifications" title', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('shows "Mark all as read" button', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
      });
    });

    it('calls onMarkAllAsRead when "Mark all as read" is clicked', async () => {
      const onMarkAllAsRead = jest.fn();
      renderWithTheme(<NotificationCenter {...defaultProps} onMarkAllAsRead={onMarkAllAsRead} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }));

      expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('Notification List', () => {
    it('renders list of notifications', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        const items = screen.getAllByTestId(/^notification-item-/);
        expect(items).toHaveLength(mockNotifications.length);
      });
    });

    it('shows each notification with data-testid="notification-item-{id}"', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        mockNotifications.forEach((n) => {
          expect(screen.getByTestId(`notification-item-${n.id}`)).toBeInTheDocument();
        });
      });
    });

    it('shows empty state when no notifications', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} notifications={[]} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByTestId('notifications-empty')).toBeInTheDocument();
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings Link', () => {
    it('has link to notification settings', async () => {
      renderWithTheme(<NotificationCenter {...defaultProps} />);

      fireEvent.click(screen.getByTestId('notification-bell'));

      await waitFor(() => {
        expect(screen.getByTestId('notification-settings-link')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// NotificationItem Component Tests
// ============================================================================

describe('NotificationItem Component', () => {
  const defaultNotification = mockNotifications[0];
  const defaultProps = {
    notification: defaultNotification,
    onMarkAsRead: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders notification with title', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByText('Sync Completed')).toBeInTheDocument();
    });

    it('renders notification with message', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByText('15 posts synced successfully to Bluesky')).toBeInTheDocument();
    });

    it('renders timestamp in relative format', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      const timestampEl = screen.getByTestId('notification-timestamp');
      expect(timestampEl).toBeInTheDocument();
    });

    it('renders with data-testid="notification-item-{id}"', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByTestId(`notification-item-${defaultNotification.id}`)).toBeInTheDocument();
    });
  });

  describe('Severity Indicators', () => {
    it('shows success indicator for success severity', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      const item = screen.getByTestId(`notification-item-${defaultNotification.id}`);
      expect(item).toHaveAttribute('data-severity', 'success');
    });

    it('shows error indicator for error severity', () => {
      const errorNotification = mockNotifications[1]; // sync_failed
      renderWithTheme(<NotificationItem {...defaultProps} notification={errorNotification} />);

      const item = screen.getByTestId(`notification-item-${errorNotification.id}`);
      expect(item).toHaveAttribute('data-severity', 'error');
    });

    it('shows warning indicator for warning severity', () => {
      const warningNotification = mockNotifications[2]; // rate_limit
      renderWithTheme(<NotificationItem {...defaultProps} notification={warningNotification} />);

      const item = screen.getByTestId(`notification-item-${warningNotification.id}`);
      expect(item).toHaveAttribute('data-severity', 'warning');
    });

    it('shows info indicator for info severity', () => {
      const infoNotification = mockNotifications[3]; // scheduled_post
      renderWithTheme(<NotificationItem {...defaultProps} notification={infoNotification} />);

      const item = screen.getByTestId(`notification-item-${infoNotification.id}`);
      expect(item).toHaveAttribute('data-severity', 'info');
    });
  });

  describe('Read State', () => {
    it('shows unread indicator for unread notifications', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      const item = screen.getByTestId(`notification-item-${defaultNotification.id}`);
      expect(item).toHaveAttribute('data-read', 'false');
    });

    it('shows read state for read notifications', () => {
      const readNotification = { ...defaultNotification, read: true };
      renderWithTheme(<NotificationItem {...defaultProps} notification={readNotification} />);

      const item = screen.getByTestId(`notification-item-${readNotification.id}`);
      expect(item).toHaveAttribute('data-read', 'true');
    });

    it('calls onMarkAsRead when clicked', () => {
      const onMarkAsRead = jest.fn();
      renderWithTheme(<NotificationItem {...defaultProps} onMarkAsRead={onMarkAsRead} />);

      fireEvent.click(screen.getByTestId(`notification-item-${defaultNotification.id}`));

      expect(onMarkAsRead).toHaveBeenCalledWith(defaultNotification.id);
    });
  });

  describe('Actions', () => {
    it('shows action button when actionUrl is provided', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('does not show action button when actionUrl is not provided', () => {
      const noActionNotification = { ...defaultNotification, actionUrl: undefined, actionLabel: undefined };
      renderWithTheme(<NotificationItem {...defaultProps} notification={noActionNotification} />);

      expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
    });

    it('shows dismiss button', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      renderWithTheme(<NotificationItem {...defaultProps} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('dismiss-button'));

      expect(onDismiss).toHaveBeenCalledWith(defaultNotification.id);
    });
  });

  describe('Type Icons', () => {
    it('shows appropriate icon for sync_complete type', () => {
      renderWithTheme(<NotificationItem {...defaultProps} />);

      expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
    });

    it('shows appropriate icon for each notification type', () => {
      mockNotifications.forEach((notification) => {
        const { unmount } = renderWithTheme(
          <NotificationItem {...defaultProps} notification={notification} />
        );
        expect(screen.getByTestId('notification-icon')).toBeInTheDocument();
        unmount();
      });
    });
  });
});

// ============================================================================
// NotificationSettings Component Tests
// ============================================================================

describe('NotificationSettings Component', () => {
  const defaultProps = {
    preferences: mockPreferences,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders settings panel with data-testid="notification-settings"', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    });

    it('renders title "Notification Settings"', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByText(/notification settings/i)).toBeInTheDocument();
    });
  });

  describe('Channel Settings', () => {
    it('renders channel toggles section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('channel-settings')).toBeInTheDocument();
    });

    it('shows in-app notifications toggle', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByTestId('channel-inApp');
      expect(toggle).toBeInTheDocument();
    });

    it('shows email notifications toggle', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByTestId('channel-email');
      expect(toggle).toBeInTheDocument();
    });

    it('shows push notifications toggle', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByTestId('channel-push');
      expect(toggle).toBeInTheDocument();
    });

    it('reflects current preferences state', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const inAppToggle = screen.getByTestId('channel-inApp');
      const emailToggle = screen.getByTestId('channel-email');
      const pushToggle = screen.getByTestId('channel-push');

      expect(inAppToggle).toBeChecked();
      expect(emailToggle).toBeChecked();
      expect(pushToggle).not.toBeChecked();
    });
  });

  describe('Threshold Settings', () => {
    it('renders threshold settings section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('threshold-settings')).toBeInTheDocument();
    });

    it('shows sync failures threshold input', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('threshold-syncFailures');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(3);
    });

    it('shows rate limit warning threshold input', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('threshold-rateLimitWarning');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(80);
    });

    it('shows engagement drop threshold input', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('threshold-engagementDrop');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(20);
    });
  });

  describe('Quiet Hours Settings', () => {
    it('renders quiet hours section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('quiet-hours-settings')).toBeInTheDocument();
    });

    it('shows quiet hours toggle', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByTestId('quiet-hours-enabled');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toBeChecked();
    });

    it('shows start time input', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('quiet-hours-start');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('22:00');
    });

    it('shows end time input', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('quiet-hours-end');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('08:00');
    });

    it('disables time inputs when quiet hours is disabled', () => {
      const disabledQuietHours = {
        ...mockPreferences,
        quietHours: { ...mockPreferences.quietHours, enabled: false },
      };
      renderWithTheme(<NotificationSettings {...defaultProps} preferences={disabledQuietHours} />);

      const startInput = screen.getByTestId('quiet-hours-start');
      const endInput = screen.getByTestId('quiet-hours-end');

      expect(startInput).toBeDisabled();
      expect(endInput).toBeDisabled();
    });
  });

  describe('Category Settings', () => {
    it('renders category toggles section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('category-settings')).toBeInTheDocument();
    });

    it('shows toggle for each category', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('category-sync')).toBeInTheDocument();
      expect(screen.getByTestId('category-scheduling')).toBeInTheDocument();
      expect(screen.getByTestId('category-engagement')).toBeInTheDocument();
      expect(screen.getByTestId('category-security')).toBeInTheDocument();
    });

    it('reflects current category preferences', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('category-sync')).toBeChecked();
      expect(screen.getByTestId('category-scheduling')).toBeChecked();
      expect(screen.getByTestId('category-engagement')).toBeChecked();
      expect(screen.getByTestId('category-security')).toBeChecked();
    });
  });

  describe('Save and Cancel', () => {
    it('shows save button', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('shows cancel button', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onSave with updated preferences when save is clicked', async () => {
      const onSave = jest.fn();
      renderWithTheme(<NotificationSettings {...defaultProps} onSave={onSave} />);

      // Toggle push notifications
      fireEvent.click(screen.getByTestId('channel-push'));

      // Save
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            channels: expect.objectContaining({
              push: true,
            }),
          })
        );
      });
    });

    it('calls onCancel when cancel is clicked', () => {
      const onCancel = jest.fn();
      renderWithTheme(<NotificationSettings {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Validation', () => {
    it('shows error for invalid threshold values', async () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const syncFailuresInput = screen.getByTestId('threshold-syncFailures');
      fireEvent.change(syncFailuresInput, { target: { value: '-1' } });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument();
      });
    });
  });
});
