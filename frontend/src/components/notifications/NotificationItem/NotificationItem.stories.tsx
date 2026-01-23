import type { Meta, StoryObj } from '@storybook/react';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '../types';

const meta: Meta<typeof NotificationItem> = {
  title: 'Notifications/NotificationItem',
  component: NotificationItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onMarkAsRead: { action: 'marked as read' },
    onDismiss: { action: 'dismissed' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '360px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotificationItem>;

const baseNotification: Notification = {
  id: '1',
  type: 'sync_complete',
  title: 'Sync Complete',
  message: 'Successfully synced 10 posts from Twitter to Bluesky',
  timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  read: false,
  severity: 'success',
};

export const Success: Story = {
  args: {
    notification: baseNotification,
  },
};

export const Error: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '2',
      type: 'sync_failed',
      title: 'Sync Failed',
      message: 'Failed to sync posts due to API error',
      severity: 'error',
    },
  },
};

export const Warning: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '3',
      type: 'rate_limit',
      title: 'Rate Limit Warning',
      message: 'Twitter API rate limit at 80%',
      severity: 'warning',
    },
  },
};

export const Info: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '4',
      type: 'scheduled_post',
      title: 'Scheduled Post',
      message: 'Your post will be published in 15 minutes',
      severity: 'info',
    },
  },
};

export const Read: Story = {
  args: {
    notification: {
      ...baseNotification,
      read: true,
    },
  },
};

export const Unread: Story = {
  args: {
    notification: {
      ...baseNotification,
      read: false,
    },
  },
};

export const WithAction: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '5',
      type: 'credential_expired',
      title: 'Credential Expired',
      message: 'Your Twitter credentials have expired',
      severity: 'error',
      actionUrl: '/dashboard/credentials',
      actionLabel: 'Reconnect',
    },
  },
};

export const LongMessage: Story = {
  args: {
    notification: {
      ...baseNotification,
      message:
        'This is a very long notification message that demonstrates how the component handles text that spans multiple lines. The content should wrap gracefully and maintain readability.',
    },
  },
};

export const CredentialExpired: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '6',
      type: 'credential_expired',
      title: 'Credential Expired',
      message: 'Your Bluesky credentials need to be renewed',
      severity: 'warning',
      actionUrl: '/dashboard/credentials',
      actionLabel: 'Renew Now',
    },
  },
};

export const EngagementAlert: Story = {
  args: {
    notification: {
      ...baseNotification,
      id: '7',
      type: 'engagement_alert',
      title: 'Engagement Drop Detected',
      message: 'Your engagement has dropped 25% this week',
      severity: 'warning',
      actionUrl: '/dashboard/analytics',
      actionLabel: 'View Analytics',
    },
  },
};
