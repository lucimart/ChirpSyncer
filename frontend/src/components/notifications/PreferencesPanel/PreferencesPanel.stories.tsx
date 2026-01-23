import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreferencesPanel } from './PreferencesPanel';

// Create a mock query client for stories
const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
};

const meta: Meta<typeof PreferencesPanel> = {
  title: 'Notifications/PreferencesPanel',
  component: PreferencesPanel,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => {
      const queryClient = createMockQueryClient();

      // Set mock data for preferences
      queryClient.setQueryData(['notifications', 'preferences'], {
        in_app_enabled: true,
        push_enabled: false,
        telegram_enabled: false,
        telegram_chat_id: undefined,
        discord_enabled: true,
        discord_webhook_url: 'https://discord.com/api/webhooks/123456/abcdef',
        email_digest_enabled: true,
        email_digest_frequency: 'daily',
        quiet_hours_start: 22,
        quiet_hours_end: 8,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof PreferencesPanel>;

export const Default: Story = {};

export const AllChannelsEnabled: Story = {
  decorators: [
    (Story) => {
      const queryClient = createMockQueryClient();

      queryClient.setQueryData(['notifications', 'preferences'], {
        in_app_enabled: true,
        push_enabled: true,
        telegram_enabled: true,
        telegram_chat_id: '123456789',
        discord_enabled: true,
        discord_webhook_url: 'https://discord.com/api/webhooks/123456/abcdef',
        email_digest_enabled: true,
        email_digest_frequency: 'weekly',
        quiet_hours_start: 23,
        quiet_hours_end: 7,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export const AllChannelsDisabled: Story = {
  decorators: [
    (Story) => {
      const queryClient = createMockQueryClient();

      queryClient.setQueryData(['notifications', 'preferences'], {
        in_app_enabled: false,
        push_enabled: false,
        telegram_enabled: false,
        discord_enabled: false,
        email_digest_enabled: false,
        email_digest_frequency: 'daily',
        quiet_hours_start: undefined,
        quiet_hours_end: undefined,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export const InvalidDiscordUrl: Story = {
  decorators: [
    (Story) => {
      const queryClient = createMockQueryClient();

      queryClient.setQueryData(['notifications', 'preferences'], {
        in_app_enabled: true,
        push_enabled: false,
        telegram_enabled: false,
        discord_enabled: true,
        discord_webhook_url: 'not-a-valid-webhook-url',
        email_digest_enabled: false,
        email_digest_frequency: 'daily',
        quiet_hours_start: 22,
        quiet_hours_end: 8,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
