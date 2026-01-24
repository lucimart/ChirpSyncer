import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCard } from './NotificationCard';
import type { NotificationWithCategory } from './types';

const meta: Meta<typeof NotificationCard> = {
  title: 'Notifications/NotificationCard',
  component: NotificationCard,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onMarkAsRead: { action: 'markAsRead' },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationCard>;

const baseNotification: NotificationWithCategory = {
  id: 'notif-1',
  type: 'sync_completed',
  category: 'sync',
  title: 'Sync Completed',
  body: 'Successfully synced 15 posts from Twitter to Bluesky. All content has been transferred.',
  priority: 2,
  is_read: false,
  created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
};

export const Default: Story = {
  args: {
    notification: baseNotification,
  },
};

export const Read: Story = {
  args: {
    notification: { ...baseNotification, is_read: true },
  },
};

export const SyncCategory: Story = {
  args: {
    notification: {
      ...baseNotification,
      category: 'sync',
      title: 'Sync Completed',
      body: 'Successfully synced 15 posts from Twitter to Bluesky.',
    },
  },
};

export const AlertCategory: Story = {
  args: {
    notification: {
      ...baseNotification,
      category: 'alert',
      title: 'Rate Limit Warning',
      body: 'You are approaching the Twitter API rate limit. Consider reducing sync frequency.',
      priority: 3,
    },
  },
};

export const SystemCategory: Story = {
  args: {
    notification: {
      ...baseNotification,
      category: 'system',
      title: 'System Maintenance',
      body: 'Scheduled maintenance will occur tonight at 2:00 AM UTC. Service may be briefly unavailable.',
      priority: 2,
    },
  },
};

export const EngagementCategory: Story = {
  args: {
    notification: {
      ...baseNotification,
      category: 'engagement',
      title: 'Post Trending!',
      body: 'Your post about "AI advancements" has received over 100 likes and 50 retweets in the last hour.',
      priority: 2,
    },
  },
};

export const SecurityCategory: Story = {
  args: {
    notification: {
      ...baseNotification,
      category: 'security',
      title: 'New Login Detected',
      body: 'A new login was detected from Chrome on macOS. If this was not you, please secure your account.',
      priority: 4,
    },
  },
};

export const LowPriority: Story = {
  args: {
    notification: { ...baseNotification, priority: 1 },
  },
};

export const NormalPriority: Story = {
  args: {
    notification: { ...baseNotification, priority: 2 },
  },
};

export const HighPriority: Story = {
  args: {
    notification: { ...baseNotification, priority: 3 },
  },
};

export const UrgentPriority: Story = {
  args: {
    notification: { ...baseNotification, priority: 4 },
  },
};

export const CriticalPriority: Story = {
  args: {
    notification: {
      ...baseNotification,
      priority: 5,
      category: 'security',
      title: 'Account Compromised!',
      body: 'Multiple failed login attempts detected. Your account may be under attack. Please change your password immediately.',
    },
  },
};

export const LongContent: Story = {
  args: {
    notification: {
      ...baseNotification,
      title: 'Very Long Notification Title That Should Handle Overflow Gracefully',
      body: 'This is a very long notification body text that should be truncated after a certain number of lines to maintain a clean UI. The notification card should handle long content gracefully without breaking the layout. We want to ensure that users can still understand the gist of the notification without seeing the full text.',
    },
  },
};
