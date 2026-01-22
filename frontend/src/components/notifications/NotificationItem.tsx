/**
 * NotificationItem Component
 *
 * Renders individual notification with severity indicator, type icon,
 * timestamp, action buttons and dismiss functionality.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  TrendingDown,
  RefreshCw,
  Bell,
  X,
} from 'lucide-react';

// Types
export interface Notification {
  id: string;
  type: 'sync_complete' | 'sync_failed' | 'rate_limit' | 'credential_expired' | 'scheduled_post' | 'engagement_alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

// Severity color mapping
const severityColors = {
  success: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: '#22c55e',
    icon: '#22c55e',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: '#ef4444',
    icon: '#ef4444',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: '#f59e0b',
    icon: '#f59e0b',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: '#3b82f6',
    icon: '#3b82f6',
  },
};

// Type to icon mapping
const typeIcons: Record<Notification['type'], React.ComponentType<{ size?: number | string; className?: string }>> = {
  sync_complete: CheckCircle,
  sync_failed: XCircle,
  rate_limit: AlertTriangle,
  credential_expired: AlertTriangle,
  scheduled_post: Clock,
  engagement_alert: TrendingDown,
};

// Styled Components
const ItemContainer = styled.div<{ $severity: Notification['severity']; $read: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme, $read }) =>
    $read ? theme.colors.background.secondary : theme.colors.background.primary};
  border-left: 3px solid ${({ $severity }) => severityColors[$severity].border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};
  position: relative;

  ${({ $read }) => !$read && css`
    &::before {
      content: '';
      position: absolute;
      top: ${({ theme }) => theme.spacing[4]};
      right: ${({ theme }) => theme.spacing[4]};
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${({ theme }) => theme.colors.primary[500]};
    }
  `}

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`;

const IconWrapper = styled.div<{ $severity: Notification['severity'] }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $severity }) => severityColors[$severity].bg};
  color: ${({ $severity }) => severityColors[$severity].icon};
  flex-shrink: 0;
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
`;

const Message = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const Timestamp = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ActionsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ActionButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.primary[600]};
  background: ${({ theme }) => theme.colors.primary[50]};
  border: 1px solid ${({ theme }) => theme.colors.primary[200]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primary[100]};
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

const DismissButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

/**
 * Formats a timestamp into a relative time string
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * NotificationItem Component
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDismiss,
}) => {
  const { id, type, title, message, timestamp, read, severity, actionUrl, actionLabel } = notification;

  const IconComponent = typeIcons[type] || Bell;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger mark as read if clicking dismiss or action button
    const target = e.target as HTMLElement;
    if (target.closest('[data-testid="dismiss-button"]') || target.closest('button[type="button"]')) {
      return;
    }
    onMarkAsRead(id);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Action button click - could navigate to actionUrl or trigger action
    // For now, we just prevent propagation
  };

  return (
    <ItemContainer
      data-testid={`notification-item-${id}`}
      data-severity={severity}
      data-read={read ? 'true' : 'false'}
      $severity={severity}
      $read={read}
      onClick={handleClick}
      role="article"
      aria-label={`Notification: ${title}`}
    >
      <IconWrapper $severity={severity}>
        <IconComponent size={18} data-testid="notification-icon" />
      </IconWrapper>

      <ContentWrapper>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <Timestamp data-testid="notification-timestamp">
          {formatRelativeTime(timestamp)}
        </Timestamp>

        {actionUrl && actionLabel && (
          <ActionsWrapper>
            <ActionButton type="button" onClick={handleAction}>
              {actionLabel}
            </ActionButton>
          </ActionsWrapper>
        )}
      </ContentWrapper>

      <DismissButton
        data-testid="dismiss-button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={14} />
      </DismissButton>
    </ItemContainer>
  );
};
