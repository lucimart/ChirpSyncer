/**
 * NotificationBell Types
 */

export interface NotificationBellProps {
  className?: string;
  maxRecentNotifications?: number;
}

export const BELL_CONFIG = {
  maxBadgeCount: 9,
  maxRecentItems: 5,
  dropdownWidth: 380,
  dropdownMaxHeight: 440,
} as const;
