import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import { PreferencesPanel } from '../PreferencesPanel';
import type { NotificationChannelPreferences } from '../PreferencesPanel/types';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderWithProviders(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

const mockPreferences: NotificationChannelPreferences = {
  in_app_enabled: true,
  push_enabled: false,
  telegram_enabled: false,
  telegram_chat_id: undefined,
  discord_enabled: true,
  discord_webhook_url: 'https://discord.com/api/webhooks/123/abc',
  email_digest_enabled: true,
  email_digest_frequency: 'daily',
  quiet_hours_start: 22,
  quiet_hours_end: 8,
};

const mockUpdatePreferences = jest.fn();
const mockTestChannel = jest.fn();

// Mock the hooks
jest.mock('@/lib/notifications', () => ({
  useNotificationPreferences: jest.fn(() => ({
    data: mockPreferences,
    isLoading: false,
    error: null,
  })),
  useUpdatePreferences: jest.fn(() => ({
    mutate: mockUpdatePreferences,
    isPending: false,
  })),
  useTestChannel: jest.fn(() => ({
    mutate: mockTestChannel,
    isPending: false,
  })),
}));

describe('PreferencesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all channel toggles', () => {
    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByRole('switch', { name: /in-app/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /telegram/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /discord/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /email digest/i })).toBeInTheDocument();
  });

  it('shows current preference values', () => {
    renderWithProviders(<PreferencesPanel />);

    const inAppSwitch = screen.getByRole('switch', { name: /in-app/i });
    const telegramSwitch = screen.getByRole('switch', { name: /telegram/i });
    const discordSwitch = screen.getByRole('switch', { name: /discord/i });

    expect(inAppSwitch).toHaveAttribute('aria-checked', 'true');
    expect(telegramSwitch).toHaveAttribute('aria-checked', 'false');
    expect(discordSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('calls updatePreferences when toggle is changed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreferencesPanel />);

    const telegramSwitch = screen.getByRole('switch', { name: /telegram/i });
    await user.click(telegramSwitch);

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ telegram_enabled: true })
      );
    });
  });

  it('shows Telegram chat ID input when Telegram is enabled', async () => {
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: { ...mockPreferences, telegram_enabled: true, telegram_chat_id: '123456' },
      isLoading: false,
    });

    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByLabelText(/telegram chat id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telegram chat id/i)).toHaveValue('123456');
  });

  it('hides Telegram chat ID input when Telegram is disabled', () => {
    // Reset mock to default (telegram_enabled: false)
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<PreferencesPanel />);

    expect(screen.queryByLabelText(/telegram chat id/i)).not.toBeInTheDocument();
  });

  it('shows Discord webhook URL input when Discord is enabled', () => {
    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByLabelText(/discord webhook url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discord webhook url/i)).toHaveValue(
      'https://discord.com/api/webhooks/123/abc'
    );
  });

  it('shows email frequency selector when email digest is enabled', () => {
    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByLabelText(/digest frequency/i)).toBeInTheDocument();
  });

  it('shows quiet hours selector', () => {
    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByLabelText(/quiet hours start/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quiet hours end/i)).toBeInTheDocument();
  });

  it('displays current quiet hours values', () => {
    renderWithProviders(<PreferencesPanel />);

    const startSelect = screen.getByLabelText(/quiet hours start/i);
    const endSelect = screen.getByLabelText(/quiet hours end/i);

    expect(startSelect).toHaveValue('22');
    expect(endSelect).toHaveValue('8');
  });

  it('shows test button for each enabled channel', () => {
    renderWithProviders(<PreferencesPanel />);

    // Discord is enabled
    expect(screen.getByRole('button', { name: /test discord/i })).toBeInTheDocument();

    // Email digest is enabled
    expect(screen.getByRole('button', { name: /test email/i })).toBeInTheDocument();
  });

  it('calls testChannel when test button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreferencesPanel />);

    const testDiscordButton = screen.getByRole('button', { name: /test discord/i });
    await user.click(testDiscordButton);

    expect(mockTestChannel).toHaveBeenCalledWith('discord');
  });

  it('disables test button when channel config is incomplete', () => {
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: {
        ...mockPreferences,
        telegram_enabled: true,
        telegram_chat_id: undefined,
      },
      isLoading: false,
    });

    renderWithProviders(<PreferencesPanel />);

    const testTelegramButton = screen.getByRole('button', { name: /test telegram/i });
    expect(testTelegramButton).toBeDisabled();
  });

  it('shows loading state while fetching preferences', () => {
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByTestId('preferences-loading')).toBeInTheDocument();
  });

  it('shows error state when preferences fail to load', () => {
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByText(/failed to load preferences/i)).toBeInTheDocument();
  });

  it('validates Discord webhook URL format', async () => {
    const { useNotificationPreferences } = require('@/lib/notifications');
    useNotificationPreferences.mockReturnValue({
      data: { ...mockPreferences, discord_webhook_url: 'invalid-url' },
      isLoading: false,
    });

    renderWithProviders(<PreferencesPanel />);

    expect(screen.getByText(/invalid webhook url/i)).toBeInTheDocument();
  });

  it('updates quiet hours when changed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreferencesPanel />);

    const startSelect = screen.getByLabelText(/quiet hours start/i);
    await user.selectOptions(startSelect, '23');

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ quiet_hours_start: 23 })
      );
    });
  });
});
