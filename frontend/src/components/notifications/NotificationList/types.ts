/**
 * NotificationList Types
 */

import type { NotificationWithCategory } from '../NotificationCard/types';

export interface NotificationListProps {
  className?: string;
  onNotificationClick?: (notification: NotificationWithCategory) => void;
}

export type DateGroup = 'today' | 'yesterday' | 'this_week' | 'earlier';

export interface GroupedNotifications {
  today: NotificationWithCategory[];
  yesterday: NotificationWithCategory[];
  this_week: NotificationWithCategory[];
  earlier: NotificationWithCategory[];
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
  notifications: NotificationWithCategory[]
): GroupedNotifications {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: GroupedNotifications = {
    today: [],
    yesterday: [],
    this_week: [],
    earlier: [],
  };

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    const notificationDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (notificationDate >= today) {
      groups.today.push(notification);
    } else if (notificationDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= weekAgo) {
      groups.this_week.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
}

export const DATE_GROUP_LABELS: Record<DateGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  earlier: 'Earlier',
};
