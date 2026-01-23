'use client';

/**
 * NotificationBell Component
 *
 * Bell icon with unread count badge and dropdown showing recent notifications.
 */

import { memo, FC, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';
import Link from 'next/link';
import { IconButton } from '@/components/ui/IconButton';
import { Spinner } from '@/components/ui/Spinner';
import { Stack } from '@/components/ui/Stack';
import { NotificationCard } from '../NotificationCard';
import { useNotifications, useMarkNotificationRead } from '@/lib/notifications';
import { NotificationBellProps, BELL_CONFIG } from './types';

// Badge pulse animation
const badgePulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
`;

const BellContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

const BellButton = styled(IconButton)`
  position: relative;
`;

const UnreadBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.danger[500]};
  color: white;
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  border: 2px solid ${({ theme }) => theme.colors.background.primary};
  animation: ${badgePulse} 2s ease-in-out infinite;
`;

const Dropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: ${BELL_CONFIG.dropdownWidth}px;
  max-height: ${BELL_CONFIG.dropdownMaxHeight}px;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
  z-index: 1000;
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const DropdownTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const NotificationsList = styled.div`
  max-height: 320px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};

  & > * + * {
    margin-top: ${({ theme }) => theme.spacing[2]};
  }
`;

const DropdownFooter = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  text-align: center;
`;

const ViewAllLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[4]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyIcon = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
`;

export const NotificationBell: FC<NotificationBellProps> = memo(
  ({ className, maxRecentNotifications = BELL_CONFIG.maxRecentItems }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const { data, isLoading } = useNotifications({ limit: maxRecentNotifications });
    const markAsRead = useMarkNotificationRead();

    const unreadCount = data?.unread_count ?? 0;
    const notifications = data?.notifications ?? [];

    const handleToggle = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const handleMarkAsRead = useCallback(
      (id: string) => {
        markAsRead.mutate(id);
      },
      [markAsRead]
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Close dropdown on escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    const displayCount =
      unreadCount > BELL_CONFIG.maxBadgeCount
        ? `${BELL_CONFIG.maxBadgeCount}+`
        : unreadCount.toString();

    const dropdownVariants = prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: -10, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -10, scale: 0.95 },
        };

    return (
      <BellContainer ref={containerRef} className={className}>
        <BellButton
          variant="ghost"
          size="md"
          onClick={handleToggle}
          aria-label="Notifications"
          aria-expanded={isOpen}
          aria-haspopup="true"
          data-testid="notification-bell"
        >
          {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
          {unreadCount > 0 && (
            <UnreadBadge data-testid="unread-badge">{displayCount}</UnreadBadge>
          )}
        </BellButton>

        <AnimatePresence>
          {isOpen && (
            <Dropdown
              data-testid="notification-dropdown"
              role="dialog"
              aria-label="Notifications"
              {...dropdownVariants}
              transition={{ duration: 0.15 }}
            >
              <DropdownHeader>
                <DropdownTitle>Notifications</DropdownTitle>
              </DropdownHeader>

              {isLoading ? (
                <LoadingContainer data-testid="loading-spinner">
                  <Spinner size="md" />
                </LoadingContainer>
              ) : notifications.length === 0 ? (
                <EmptyState>
                  <EmptyIcon>
                    <Bell size={32} />
                  </EmptyIcon>
                  <EmptyText>No notifications yet</EmptyText>
                </EmptyState>
              ) : (
                <NotificationsList>
                  <Stack gap={2}>
                    {notifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={{
                          id: notification.id,
                          type: notification.type,
                          category: notification.category || 'system',
                          title: notification.title,
                          body: notification.message || notification.body || '',
                          priority: notification.priority || 2,
                          is_read: notification.read ?? notification.is_read ?? false,
                          created_at: notification.timestamp || notification.created_at || new Date().toISOString(),
                          data: notification.data,
                        }}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    ))}
                  </Stack>
                </NotificationsList>
              )}

              <DropdownFooter>
                <ViewAllLink href="/dashboard/notifications">
                  View all notifications
                </ViewAllLink>
              </DropdownFooter>
            </Dropdown>
          )}
        </AnimatePresence>
      </BellContainer>
    );
  }
);

NotificationBell.displayName = 'NotificationBell';
