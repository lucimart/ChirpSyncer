import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFeed, type ActivityItem, type ActivityType } from './ActivityFeed';

const meta: Meta<typeof ActivityFeed> = {
  title: 'Workspace/ActivityFeed',
  component: ActivityFeed,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof ActivityFeed>;

const createActivity = (
  id: string,
  type: ActivityType,
  userName: string,
  description: string,
  hoursAgo: number
): ActivityItem => ({
  id,
  type,
  userId: `user-${id}`,
  userName,
  description,
  timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  metadata: {},
});

const mockActivities: ActivityItem[] = [
  createActivity('1', 'credential_added', 'John Doe', 'added Twitter credentials', 0.1),
  createActivity('2', 'member_invited', 'Jane Smith', 'invited alice@example.com', 1),
  createActivity('3', 'sync_triggered', 'John Doe', 'triggered manual sync', 2),
  createActivity('4', 'rule_created', 'Jane Smith', 'created cleanup rule "Remove old posts"', 5),
  createActivity('5', 'member_role_changed', 'Admin User', 'changed role for Bob to editor', 12),
  createActivity('6', 'cleanup_executed', 'System', 'executed cleanup for 45 posts', 24),
  createActivity('7', 'credential_removed', 'John Doe', 'removed Bluesky credentials', 48),
  createActivity('8', 'login', 'Jane Smith', 'logged in from new device', 72),
];

export const Default: Story = {
  args: {
    activities: mockActivities,
    isLoading: false,
    hasMore: false,
    onLoadMore: () => console.log('Load more clicked'),
  },
};

export const Loading: Story = {
  args: {
    activities: [],
    isLoading: true,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const Empty: Story = {
  args: {
    activities: [],
    isLoading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};

export const WithLoadMore: Story = {
  args: {
    activities: mockActivities.slice(0, 3),
    isLoading: false,
    hasMore: true,
    onLoadMore: () => console.log('Load more clicked'),
  },
};

export const LoadingMore: Story = {
  args: {
    activities: mockActivities.slice(0, 3),
    isLoading: true,
    hasMore: true,
    onLoadMore: () => {},
  },
};

export const AllActivityTypes: Story = {
  args: {
    activities: [
      createActivity('1', 'credential_added', 'User', 'added credentials', 0),
      createActivity('2', 'credential_removed', 'User', 'removed credentials', 1),
      createActivity('3', 'member_invited', 'User', 'invited member', 2),
      createActivity('4', 'member_removed', 'User', 'removed member', 3),
      createActivity('5', 'member_role_changed', 'User', 'changed role', 4),
      createActivity('6', 'rule_created', 'User', 'created rule', 5),
      createActivity('7', 'rule_updated', 'User', 'updated rule', 6),
      createActivity('8', 'rule_deleted', 'User', 'deleted rule', 7),
      createActivity('9', 'sync_triggered', 'User', 'triggered sync', 8),
      createActivity('10', 'cleanup_executed', 'User', 'executed cleanup', 9),
      createActivity('11', 'login', 'User', 'logged in', 10),
    ],
    isLoading: false,
    hasMore: false,
    onLoadMore: () => {},
  },
};
