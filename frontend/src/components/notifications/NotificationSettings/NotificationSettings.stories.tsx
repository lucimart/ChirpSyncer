import type { Meta, StoryObj } from '@storybook/react';
import { NotificationSettings } from './NotificationSettings';
import type { NotificationPreferences } from '../types';

const meta: Meta<typeof NotificationSettings> = {
  title: 'Notifications/NotificationSettings',
  component: NotificationSettings,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSave: { action: 'saved' },
    onCancel: { action: 'cancelled' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationSettings>;

const defaultPreferences: NotificationPreferences = {
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
    enabled: false,
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

export const Default: Story = {
  args: {
    preferences: defaultPreferences,
  },
};

export const AllChannelsEnabled: Story = {
  args: {
    preferences: {
      ...defaultPreferences,
      channels: {
        inApp: true,
        email: true,
        push: true,
      },
    },
  },
};

export const QuietHoursEnabled: Story = {
  args: {
    preferences: {
      ...defaultPreferences,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    },
  },
};

export const MinimalNotifications: Story = {
  args: {
    preferences: {
      ...defaultPreferences,
      channels: {
        inApp: true,
        email: false,
        push: false,
      },
      categories: {
        sync: false,
        scheduling: false,
        engagement: false,
        security: true,
      },
    },
  },
};

export const HighThresholds: Story = {
  args: {
    preferences: {
      ...defaultPreferences,
      thresholds: {
        syncFailures: 10,
        rateLimitWarning: 95,
        engagementDrop: 50,
      },
    },
  },
};

export const LowThresholds: Story = {
  args: {
    preferences: {
      ...defaultPreferences,
      thresholds: {
        syncFailures: 1,
        rateLimitWarning: 50,
        engagementDrop: 5,
      },
    },
  },
};

export const AllDisabled: Story = {
  args: {
    preferences: {
      channels: {
        inApp: false,
        email: false,
        push: false,
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
        sync: false,
        scheduling: false,
        engagement: false,
        security: false,
      },
    },
  },
};
