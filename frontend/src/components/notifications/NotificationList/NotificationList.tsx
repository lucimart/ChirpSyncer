'use client';

/**
 * NotificationList Component
 *
 * Displays notifications grouped by date with infinite scroll support.
 */

import { memo, FC, useCallback, Fragment, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Inbox } from 'lucide-react';
import { Stack } from '@/components/ui/Stack';
import { Spinner } from '@/components/ui/Spinner';
import { NotificationCard } from '../NotificationCard';
import type { NotificationWithCategory } from '../NotificationCard/types';
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  type NotificationFilters,
} from '@/lib/notifications';
import {
  NotificationListProps,
  DateGroup,
  groupNotificationsByDate,
  DATE_GROUP_LABELS,
} from './types';

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const DateGroupSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const DateGroupHeader = styled.h3`
  margin: 0;
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
`;

const EmptyIcon = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const LoadMoreTrigger = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
`;

const ErrorMessage = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.danger[600]};
  background-color: ${({ theme }) => theme.colors.surface.danger.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: center;
`;

interface NotificationListInternalProps extends NotificationListProps {
  filters?: Omit<NotificationFilters, 'page'>;
}

export const NotificationList: FC<NotificationListInternalProps> = memo(
  ({ className, onNotificationClick, filters }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
      data,
      isLoading,
      error,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    } = useInfiniteNotifications(filters);

    const markAsRead = useMarkNotificationRead();

    const handleMarkAsRead = useCallback(
      (id: string) => {
        markAsRead.mutate(id);
      },
      [markAsRead]
    );

    const handleNotificationClick = useCallback(
      (notification: NotificationWithCategory) => {
        onNotificationClick?.(notification);
        if (!notification.is_read) {
          markAsRead.mutate(notification.id);
        }
      },
      [onNotificationClick, markAsRead]
    );

    // Infinite scroll using Intersection Observer
    useEffect(() => {
      if (!loadMoreRef.current || !hasNextPage) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(loadMoreRef.current);

      return () => {
        observerRef.current?.disconnect();
      };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    if (isLoading) {
      return (
        <LoadingContainer data-testid="notification-list-loading">
          <Spinner size="lg" />
        </LoadingContainer>
      );
    }

    if (error) {
      return (
        <ErrorMessage>
          Failed to load notifications. Please try again later.
        </ErrorMessage>
      );
    }

    // Flatten all pages of notifications
    const allNotifications: NotificationWithCategory[] =
      data?.pages.flatMap((page) =>
        page.notifications.map((n) => ({
          id: n.id,
          type: n.type,
          category: n.category || 'system',
          title: n.title,
          body: n.message || n.body || '',
          priority: n.priority || 2,
          is_read: n.read ?? n.is_read ?? false,
          created_at: n.timestamp || n.created_at || new Date().toISOString(),
          data: n.data,
        }))
      ) ?? [];

    if (allNotifications.length === 0) {
      return (
        <EmptyState data-testid="notification-list-empty">
          <EmptyIcon>
            <Inbox size={48} />
          </EmptyIcon>
          <EmptyTitle>No notifications</EmptyTitle>
          <EmptyDescription>
            You're all caught up! New notifications will appear here.
          </EmptyDescription>
        </EmptyState>
      );
    }

    const groupedNotifications = groupNotificationsByDate(allNotifications);
    const dateGroups: DateGroup[] = ['today', 'yesterday', 'this_week', 'earlier'];

    return (
      <ListContainer className={className} data-testid="notification-list">
        {dateGroups.map((group) => {
          const notifications = groupedNotifications[group];
          if (notifications.length === 0) return null;

          return (
            <DateGroupSection key={group} aria-label={DATE_GROUP_LABELS[group]}>
              <DateGroupHeader>{DATE_GROUP_LABELS[group]}</DateGroupHeader>
              <Stack gap={2}>
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onClick={handleNotificationClick}
                  />
                ))}
              </Stack>
            </DateGroupSection>
          );
        })}

        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <LoadMoreTrigger ref={loadMoreRef}>
            {isFetchingNextPage && <Spinner size="sm" />}
          </LoadMoreTrigger>
        )}
      </ListContainer>
    );
  }
);

NotificationList.displayName = 'NotificationList';
