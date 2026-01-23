'use client';

/**
 * NotificationCard Component
 *
 * Displays individual notifications with category icons, priority indicators,
 * and mark as read functionality.
 */

import { memo, FC, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  RefreshCw,
  AlertTriangle,
  Settings,
  Heart,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import {
  NotificationCardProps,
  NotificationCategory,
  NotificationPriority,
  PRIORITY_COLORS,
  formatRelativeTime,
} from './types';

// Category icon mapping
const CATEGORY_ICONS = {
  sync: RefreshCw,
  alert: AlertTriangle,
  system: Settings,
  engagement: Heart,
  security: Shield,
} as const;

// Category colors for the icon background
const CATEGORY_COLORS: Record<NotificationCategory, { bg: string; icon: string }> = {
  sync: { bg: 'rgba(59, 130, 246, 0.1)', icon: '#3b82f6' },
  alert: { bg: 'rgba(245, 158, 11, 0.1)', icon: '#f59e0b' },
  system: { bg: 'rgba(107, 114, 128, 0.1)', icon: '#6b7280' },
  engagement: { bg: 'rgba(239, 68, 68, 0.1)', icon: '#ef4444' },
  security: { bg: 'rgba(16, 185, 129, 0.1)', icon: '#10b981' },
};

// Priority indicator colors
const PRIORITY_INDICATOR_COLORS: Record<NotificationPriority, string> = {
  1: '#9ca3af', // neutral gray
  2: '#3b82f6', // info blue
  3: '#f59e0b', // warning yellow
  4: '#ef4444', // error red
  5: '#ef4444', // critical red (with animation)
};

// Pulse animation for critical priority
const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
`;

const CardContainer = styled(motion.article)<{ $isRead: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;

  ${({ $isRead, theme }) =>
    !$isRead &&
    css`
      background-color: ${theme.colors.primary[50]};
      border-color: ${theme.colors.primary[200]};
    `}

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const UnreadIndicator = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.spacing[2]};
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary[500]};
`;

const IconWrapper = styled.div<{ $category: NotificationCategory }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $category }) => CATEGORY_COLORS[$category].bg};
  color: ${({ $category }) => CATEGORY_COLORS[$category].icon};
  flex-shrink: 0;
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const Title = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`;

const PriorityIndicator = styled.span<{
  $priority: NotificationPriority;
  $isCritical: boolean;
}>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $priority }) => PRIORITY_INDICATOR_COLORS[$priority]};
  flex-shrink: 0;

  ${({ $isCritical }) =>
    $isCritical &&
    css`
      animation: ${pulseAnimation} 1.5s ease-in-out infinite;
    `}
`;

const Body = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;

  /* Clamp to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const Timestamp = styled.time`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ActionsWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
`;

export const NotificationCard: FC<NotificationCardProps> = memo(
  ({ notification, onMarkAsRead, onClick }) => {
    const prefersReducedMotion = useReducedMotion();

    const handleCardClick = useCallback(() => {
      onClick?.(notification);
    }, [notification, onClick]);

    const handleMarkAsRead = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkAsRead?.(notification.id);
      },
      [notification.id, onMarkAsRead]
    );

    const CategoryIcon = CATEGORY_ICONS[notification.category];
    const isCritical = notification.priority === 5;

    const motionProps = prefersReducedMotion
      ? {}
      : {
          whileHover: { y: -2 },
          whileTap: { scale: 0.99 },
        };

    return (
      <CardContainer
        $isRead={notification.is_read}
        onClick={handleCardClick}
        tabIndex={0}
        role="article"
        aria-label={`Notification: ${notification.title}`}
        data-testid="notification-card"
        {...motionProps}
      >
        {!notification.is_read && <UnreadIndicator data-testid="unread-indicator" />}

        <IconWrapper $category={notification.category}>
          <CategoryIcon size={20} data-testid="category-icon" />
        </IconWrapper>

        <ContentWrapper>
          <Header>
            <Title>{notification.title}</Title>
            <PriorityIndicator
              $priority={notification.priority}
              $isCritical={isCritical && !prefersReducedMotion}
              data-testid="priority-indicator"
              data-critical={isCritical ? 'true' : 'false'}
              aria-label={`Priority ${notification.priority}`}
            />
          </Header>

          <Body>{notification.body}</Body>

          <MetaRow>
            <Timestamp
              data-testid="notification-time"
              dateTime={notification.created_at}
            >
              {formatRelativeTime(notification.created_at)}
            </Timestamp>
          </MetaRow>
        </ContentWrapper>

        {!notification.is_read && onMarkAsRead && (
          <ActionsWrapper>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleMarkAsRead}
              aria-label="Mark as read"
              title="Mark as read"
            >
              <CheckCircle size={18} />
            </IconButton>
          </ActionsWrapper>
        )}
      </CardContainer>
    );
  }
);

NotificationCard.displayName = 'NotificationCard';
