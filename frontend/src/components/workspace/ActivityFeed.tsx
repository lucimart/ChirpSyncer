'use client';

/**
 * Sprint 21: Activity Feed
 * Chronological feed of workspace activities with filtering
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

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
};

// Icon components for each activity type
const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const UserPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const UserMinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const PlusCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CleanupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const LoginIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const getActivityIcon = (type: ActivityType): React.ReactNode => {
  switch (type) {
    case 'credential_added':
    case 'credential_removed':
      return <KeyIcon />;
    case 'member_invited':
      return <UserPlusIcon />;
    case 'member_removed':
      return <UserMinusIcon />;
    case 'member_role_changed':
      return <ShieldIcon />;
    case 'rule_created':
      return <PlusCircleIcon />;
    case 'rule_updated':
      return <EditIcon />;
    case 'rule_deleted':
      return <TrashIcon />;
    case 'sync_triggered':
      return <RefreshIcon />;
    case 'cleanup_executed':
      return <CleanupIcon />;
    case 'login':
      return <LoginIcon />;
    default:
      return <PlusCircleIcon />;
  }
};

const getIconColor = (type: ActivityType): string => {
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
      return 'neutral';
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

// Styled Components
const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const FilterLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

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

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
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

const IconWrapper = styled.div<{ $colorType: string }>`
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

const ActivityContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  flex: 1;
  min-width: 0;
`;

const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`;

const UserName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Description = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Timestamp = styled.time`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: auto;
  flex-shrink: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const LoadingSkeleton = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
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

const SkeletonContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  flex: 1;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const EmptyIcon = styled.div`
  width: 48px;
  height: 48px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin: 0;
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.primary[600]};
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[50]};
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

export function ActivityFeed({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
}: ActivityFeedProps) {
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');

  const sortedAndFilteredActivities = useMemo(() => {
    let filtered = activities;

    if (filterType !== 'all') {
      filtered = activities.filter((activity) => activity.type === filterType);
    }

    // Sort by timestamp descending (most recent first)
    return [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities, filterType]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(event.target.value as ActivityType | 'all');
  };

  if (isLoading && activities.length === 0) {
    return (
      <FeedContainer data-testid="activity-feed">
        <LoadingContainer data-testid="activity-loading">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i}>
              <SkeletonCircle />
              <SkeletonContent>
                <SkeletonLine $width="60%" />
                <SkeletonLine $width="40%" />
              </SkeletonContent>
            </LoadingSkeleton>
          ))}
        </LoadingContainer>
      </FeedContainer>
    );
  }

  return (
    <FeedContainer data-testid="activity-feed">
      <FilterWrapper>
        <FilterLabel htmlFor="activity-filter">Filter by type</FilterLabel>
        <FilterSelect
          id="activity-filter"
          value={filterType}
          onChange={handleFilterChange}
          aria-label="Filter by type"
        >
          <option value="all">All Activities</option>
          {(Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </option>
          ))}
        </FilterSelect>
      </FilterWrapper>

      {sortedAndFilteredActivities.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </EmptyIcon>
          <EmptyText>No activity yet</EmptyText>
        </EmptyState>
      ) : (
        <ActivityList>
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
              <ActivityContent>
                <ActivityHeader>
                  <UserName>{activity.userName}</UserName>
                  <Description>{activity.description}</Description>
                  <Timestamp dateTime={activity.timestamp}>
                    {formatRelativeTime(activity.timestamp)}
                  </Timestamp>
                </ActivityHeader>
              </ActivityContent>
            </ActivityItemContainer>
          ))}
        </ActivityList>
      )}

      {isLoading && activities.length > 0 && (
        <LoadingContainer data-testid="activity-loading">
          <LoadingSkeleton>
            <SkeletonCircle />
            <SkeletonContent>
              <SkeletonLine $width="60%" />
              <SkeletonLine $width="40%" />
            </SkeletonContent>
          </LoadingSkeleton>
        </LoadingContainer>
      )}

      {hasMore && !isLoading && (
        <LoadMoreButton onClick={onLoadMore} type="button">
          Load More
        </LoadMoreButton>
      )}
    </FeedContainer>
  );
}
