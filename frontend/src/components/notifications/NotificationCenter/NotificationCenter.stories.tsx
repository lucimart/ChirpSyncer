import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter } from './NotificationCenter';
import type { Notification } from '../types';

const meta: Meta<typeof NotificationCenter> = {
  title: 'Notifications/NotificationCenter',
  component: NotificationCenter,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onMarkAsRead: { action: 'marked as read' },
    onMarkAllAsRead: { action: 'marked all as read' },
    onDismiss: { action: 'dismissed' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationCenter>;

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'sync_complete',
    title: 'Sync Complete',
    message: 'Successfully synced 10 posts from Twitter to Bluesky',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    severity: 'success',
  },
  {
    id: '2',
    type: 'sync_failed',
    title: 'Sync Failed',
    message: 'Failed to sync posts due to rate limit',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    severity: 'error',
    actionUrl: '/dashboard/sync',
    actionLabel: 'View Details',
  },
  {
    id: '3',
    type: 'rate_limit',
    title: 'Rate Limit Warning',
    message: 'Twitter API rate limit at 80%',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
    severity: 'warning',
  },
  {
    id: '4',
    type: 'scheduled_post',
    title: 'Scheduled Post',
    message: 'Your post will be published in 15 minutes',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    severity: 'info',
  },
];

export const WithNotifications: Story = {
  args: {
    notifications: mockNotifications,
  },
};

export const AllUnread: Story = {
  args: {
    notifications: mockNotifications.map((n) => ({ ...n, read: false })),
  },
};

export const AllRead: Story = {
  args: {
    notifications: mockNotifications.map((n) => ({ ...n, read: true })),
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
};

export const ManyNotifications: Story = {
  args: {
    notifications: Array.from({ length: 15 }, (_, i) => ({
      id: String(i + 1),
      type: 'sync_complete' as const,
      title: `Notification ${i + 1}`,
      message: `This is notification message number ${i + 1}`,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      read: i % 3 === 0,
      severity: ['success', 'error', 'warning', 'info'][i % 4] as Notification['severity'],
    })),
  },
};

export const SingleUnread: Story = {
  args: {
    notifications: [
      {
        id: '1',
        type: 'credential_expired',
        title: 'Credential Expired',
        message: 'Your Twitter credentials have expired',
        timestamp: new Date().toISOString(),
        read: false,
        severity: 'error',
        actionUrl: '/dashboard/credentials',
        actionLabel: 'Reconnect',
      },
    ],
  },
};
