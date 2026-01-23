'use client';

import { useState, useMemo, useCallback, type FC, type ChangeEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import {
  Key,
  UserPlus,
  UserMinus,
  Shield,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Wrench,
  LogIn,
  Clock,
} from 'lucide-react';
import { Stack, SmallText, Caption, Button } from '@/components/ui';

export type ActivityType =
  | 'credential_added'
  | 'credential_removed'
  | 'member_invited'
  | 'member_removed'
  | 'member_role_changed'
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deleted'
  | 'sync_triggered'
  | 'cleanup_executed'
  | 'login';

type IconColorType = 'success' | 'danger' | 'warning' | 'primary' | 'neutral';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const ICON_SIZE = 16;
const EMPTY_ICON_SIZE = 48;
const SKELETON_COUNT = [1, 2, 3] as const;

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  credential_added: 'Credential Added',
  credential_removed: 'Credential Removed',
  member_invited: 'Member Invited',
  member_removed: 'Member Removed',
  member_role_changed: 'Member Role Changed',
  rule_created: 'Rule Created',
  rule_updated: 'Rule Updated',
  rule_deleted: 'Rule Deleted',
  sync_triggered: 'Sync Triggered',
  cleanup_executed: 'Cleanup Executed',
  login: 'Login',
} as const;

const getActivityIcon = (type: ActivityType): ReactNode => {
  switch (type) {
    case 'credential_added':
    case 'credential_removed':
      return <Key size={ICON_SIZE} />;
    case 'member_invited':
      return <UserPlus size={ICON_SIZE} />;
    case 'member_removed':
      return <UserMinus size={ICON_SIZE} />;
    case 'member_role_changed':
      return <Shield size={ICON_SIZE} />;
    case 'rule_created':
      return <PlusCircle size={ICON_SIZE} />;
    case 'rule_updated':
      return <Pencil size={ICON_SIZE} />;
    case 'rule_deleted':
      return <Trash2 size={ICON_SIZE} />;
    case 'sync_triggered':
      return <RefreshCw size={ICON_SIZE} />;
    case 'cleanup_executed':
      return <Wrench size={ICON_SIZE} />;
    case 'login':
      return <LogIn size={ICON_SIZE} />;
    default:
      return <PlusCircle size={ICON_SIZE} />;
  }
};

const getIconColor = (type: ActivityType): IconColorType => {
  switch (type) {
    case 'credential_added':
    case 'member_invited':
    case 'rule_created':
      return 'success';
    case 'credential_removed':
    case 'member_removed':
    case 'rule_deleted':
      return 'danger';
    case 'member_role_changed':
    case 'rule_updated':
      return 'warning';
    case 'sync_triggered':
    case 'cleanup_executed':
      return 'primary';
    case 'login':
    default:
      return 'neutral';
  }
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Check if it's today
  const isToday = date.toDateString() === now.toDateString();

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24 && isToday) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (isToday) {
    return 'today';
  } else if (isYesterday) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }
}

const FilterSelect = styled.select`
  height: 36px;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.dark};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const ActivityItemContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const IconWrapper = styled.div<{ $colorType: IconColorType }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  flex-shrink: 0;

  ${({ $colorType, theme }) => {
    switch ($colorType) {
      case 'success':
        return `
          background-color: ${theme.colors.success[100]};
          color: ${theme.colors.success[600]};
        `;
      case 'danger':
        return `
          background-color: ${theme.colors.danger[100]};
          color: ${theme.colors.danger[600]};
        `;
      case 'warning':
        return `
          background-color: ${theme.colors.warning[100]};
          color: ${theme.colors.warning[600]};
        `;
      case 'primary':
        return `
          background-color: ${theme.colors.primary[100]};
          color: ${theme.colors.primary[600]};
        `;
      default:
        return `
          background-color: ${theme.colors.neutral[200]};
          color: ${theme.colors.neutral[600]};
        `;
    }
  }}
`;

const SkeletonCircle = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[200]} 25%,
    ${({ theme }) => theme.colors.neutral[100]} 50%,
    ${({ theme }) => theme.colors.neutral[200]} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const SkeletonLine = styled.div<{ $width: string }>`
  height: 12px;
  width: ${({ $width }) => $width};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[200]} 25%,
    ${({ theme }) => theme.colors.neutral[100]} 50%,
    ${({ theme }) => theme.colors.neutral[200]} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
`;

const LoadingSkeleton: FC = () => (
  <Stack direction="row" gap={3} align="center">
    <SkeletonCircle />
    <Stack gap={2} style={{ flex: 1 }}>
      <SkeletonLine $width="60%" />
      <SkeletonLine $width="40%" />
    </Stack>
  </Stack>
);

export const ActivityFeed: FC<ActivityFeedProps> = ({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
}) => {
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');

  const sortedAndFilteredActivities = useMemo(() => {
    const filtered =
      filterType === 'all'
        ? activities
        : activities.filter((activity) => activity.type === filterType);

    return [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities, filterType]);

  const handleFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setFilterType(event.target.value as ActivityType | 'all');
  }, []);

  const activityTypeOptions = useMemo(
    () =>
      (Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((type) => (
        <option key={type} value={type}>
          {ACTIVITY_TYPE_LABELS[type]}
        </option>
      )),
    []
  );

  if (isLoading && activities.length === 0) {
    return (
      <Stack gap={4} data-testid="activity-feed">
        <Stack gap={3} style={{ padding: '16px' }} data-testid="activity-loading">
          {SKELETON_COUNT.map((i) => (
            <LoadingSkeleton key={i} />
          ))}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap={4} data-testid="activity-feed">
      <Stack direction="row" align="center" gap={2} style={{ marginBottom: '8px' }}>
        <SmallText as="label" htmlFor="activity-filter" style={{ fontWeight: 500 }}>
          Filter by type
        </SmallText>
        <FilterSelect
          id="activity-filter"
          value={filterType}
          onChange={handleFilterChange}
          aria-label="Filter by type"
        >
          <option value="all">All Activities</option>
          {activityTypeOptions}
        </FilterSelect>
      </Stack>

      {sortedAndFilteredActivities.length === 0 ? (
        <Stack
          align="center"
          justify="center"
          gap={3}
          style={{ padding: '32px', textAlign: 'center' }}
        >
          <Clock size={EMPTY_ICON_SIZE} style={{ color: 'var(--color-text-tertiary)' }} />
          <SmallText>No activity yet</SmallText>
        </Stack>
      ) : (
        <Stack>
          {sortedAndFilteredActivities.map((activity) => (
            <ActivityItemContainer
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
            >
              <IconWrapper
                $colorType={getIconColor(activity.type)}
                data-testid={`activity-icon-${activity.type}`}
              >
                {getActivityIcon(activity.type)}
              </IconWrapper>
              <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" align="center" gap={2} style={{ flexWrap: 'wrap' }}>
                  <SmallText style={{ fontWeight: 600 }}>{activity.userName}</SmallText>
                  <SmallText>{activity.description}</SmallText>
                  <Caption as="time" dateTime={activity.timestamp} style={{ marginLeft: 'auto' }}>
                    {formatRelativeTime(activity.timestamp)}
                  </Caption>
                </Stack>
              </Stack>
            </ActivityItemContainer>
          ))}
        </Stack>
      )}

      {isLoading && activities.length > 0 && (
        <Stack gap={3} style={{ padding: '16px' }} data-testid="activity-loading">
          <LoadingSkeleton />
        </Stack>
      )}

      {hasMore && !isLoading && (
        <Button variant="secondary" onClick={onLoadMore} style={{ width: '100%' }}>
          Load More
        </Button>
      )}
    </Stack>
  );
};
