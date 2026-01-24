// Types
export type {
  Notification,
  NotificationSeverity,
  NotificationType,
  NotificationChannels,
  NotificationThresholds,
  QuietHoursConfig,
  NotificationCategories,
  NotificationPreferences,
  IconProps,
  SeverityColorSet,
} from './types';

export {
  SEVERITY_COLORS,
  TYPE_ICONS,
  DEFAULT_ICON,
  DROPDOWN_CONFIG,
  ICON_SIZES,
  formatRelativeTime,
} from './types';

// Components
export { NotificationCenter } from './NotificationCenter';
export type { NotificationCenterProps } from './NotificationCenter';

export { NotificationItem } from './NotificationItem';
export type { NotificationItemProps } from './NotificationItem';

export { NotificationSettings } from './NotificationSettings';
export type { NotificationSettingsProps } from './NotificationSettings';

// New Notifications Hub components
export { NotificationCard } from './NotificationCard';
export type {
  NotificationCardProps,
  NotificationWithCategory,
  NotificationCategory,
  NotificationPriority,
} from './NotificationCard';

export { NotificationBell } from './NotificationBell';
export type { NotificationBellProps } from './NotificationBell';

export { NotificationList } from './NotificationList';
export type { NotificationListProps } from './NotificationList';

export { PreferencesPanel } from './PreferencesPanel';
export type { PreferencesPanelProps, NotificationChannelPreferences } from './PreferencesPanel';
