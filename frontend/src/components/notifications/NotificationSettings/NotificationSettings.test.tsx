import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { NotificationSettings } from './NotificationSettings';
import type { NotificationPreferences } from '../types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const defaultPreferences: NotificationPreferences = {
  channels: {
    inApp: true,
    email: false,
    push: true,
  },
  thresholds: {
    syncFailures: 3,
    rateLimitWarning: 80,
    engagementDrop: 20,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  categories: {
    sync: true,
    scheduling: true,
    engagement: false,
    security: true,
  },
};

describe('NotificationSettings', () => {
  const defaultProps = {
    preferences: defaultPreferences,
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings form', () => {
    renderWithTheme(<NotificationSettings {...defaultProps} />);
    expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    expect(screen.getByText('Notification Settings')).toBeInTheDocument();
  });

  describe('Notification Channels', () => {
    it('renders channel settings section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);
      expect(screen.getByTestId('channel-settings')).toBeInTheDocument();
      expect(screen.getByText('Notification Channels')).toBeInTheDocument();
    });

    it('renders channel toggles with correct initial state', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('channel-inApp')).toBeChecked();
      expect(screen.getByTestId('channel-email')).not.toBeChecked();
      expect(screen.getByTestId('channel-push')).toBeChecked();
    });

    it('toggles channel on click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const emailSwitch = screen.getByTestId('channel-email');
      expect(emailSwitch).not.toBeChecked();

      await user.click(emailSwitch);
      expect(emailSwitch).toBeChecked();
    });
  });

  describe('Alert Thresholds', () => {
    it('renders threshold settings section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);
      expect(screen.getByTestId('threshold-settings')).toBeInTheDocument();
      expect(screen.getByText('Alert Thresholds')).toBeInTheDocument();
    });

    it('renders threshold inputs with correct initial values', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('threshold-syncFailures')).toHaveValue(3);
      expect(screen.getByTestId('threshold-rateLimitWarning')).toHaveValue(80);
      expect(screen.getByTestId('threshold-engagementDrop')).toHaveValue(20);
    });

    it('updates threshold value on change', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const input = screen.getByTestId('threshold-syncFailures');
      await user.clear(input);
      await user.type(input, '5');

      expect(input).toHaveValue(5);
    });
  });

  describe('Quiet Hours', () => {
    it('renders quiet hours settings section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);
      expect(screen.getByTestId('quiet-hours-settings')).toBeInTheDocument();
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
    });

    it('renders quiet hours toggle with correct initial state', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);
      expect(screen.getByTestId('quiet-hours-enabled')).not.toBeChecked();
    });

    it('toggles quiet hours on click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const toggle = screen.getByTestId('quiet-hours-enabled');
      await user.click(toggle);
      expect(toggle).toBeChecked();
    });

    it('disables time inputs when quiet hours is disabled', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('quiet-hours-start')).toBeDisabled();
      expect(screen.getByTestId('quiet-hours-end')).toBeDisabled();
    });

    it('enables time inputs when quiet hours is enabled', async () => {
      const user = userEvent.setup();
      const prefsWithQuietHours = {
        ...defaultPreferences,
        quietHours: { ...defaultPreferences.quietHours, enabled: true },
      };
      renderWithTheme(
        <NotificationSettings {...defaultProps} preferences={prefsWithQuietHours} />
      );

      expect(screen.getByTestId('quiet-hours-start')).not.toBeDisabled();
      expect(screen.getByTestId('quiet-hours-end')).not.toBeDisabled();
    });
  });

  describe('Notification Categories', () => {
    it('renders category settings section', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);
      expect(screen.getByTestId('category-settings')).toBeInTheDocument();
      expect(screen.getByText('Notification Categories')).toBeInTheDocument();
    });

    it('renders category toggles with correct initial state', () => {
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      expect(screen.getByTestId('category-sync')).toBeChecked();
      expect(screen.getByTestId('category-scheduling')).toBeChecked();
      expect(screen.getByTestId('category-engagement')).not.toBeChecked();
      expect(screen.getByTestId('category-security')).toBeChecked();
    });

    it('toggles category on click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      const engagementSwitch = screen.getByTestId('category-engagement');
      await user.click(engagementSwitch);
      expect(engagementSwitch).toBeChecked();
    });
  });

  describe('Form Actions', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onSave with updated preferences when save is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(defaultProps.onSave).toHaveBeenCalledWith(defaultPreferences);
    });

    it('saves updated channel values', async () => {
      const user = userEvent.setup();
      renderWithTheme(<NotificationSettings {...defaultProps} />);

      await user.click(screen.getByTestId('channel-email'));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(defaultProps.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: expect.objectContaining({
            email: true,
          }),
        })
      );
    });
  });

  describe('Validation', () => {
    it('shows error for negative threshold values', async () => {
      const user = userEvent.setup();
      const prefsWithNegative = {
        ...defaultPreferences,
        thresholds: { ...defaultPreferences.thresholds, syncFailures: -1 },
      };
      renderWithTheme(
        <NotificationSettings {...defaultProps} preferences={prefsWithNegative} />
      );

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByText('must be a positive number')).toBeInTheDocument();
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('does not call onSave when validation fails', async () => {
      const user = userEvent.setup();
      const prefsWithNegative = {
        ...defaultPreferences,
        thresholds: { ...defaultPreferences.thresholds, syncFailures: -1 },
      };
      renderWithTheme(
        <NotificationSettings {...defaultProps} preferences={prefsWithNegative} />
      );

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });
});
