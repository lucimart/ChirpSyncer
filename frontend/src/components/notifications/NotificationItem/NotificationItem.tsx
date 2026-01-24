/**
 * NotificationItem Component
 *
 * Renders individual notification with severity indicator, type icon,
 * timestamp, action buttons and dismiss functionality.
 */

import { useCallback, memo, type FC, type MouseEvent } from 'react';
import styled, { css } from 'styled-components';
import { X } from 'lucide-react';
import { Stack } from '@/components/ui';
import {
  type Notification,
  type NotificationSeverity,
  SEVERITY_COLORS,
  TYPE_ICONS,
  DEFAULT_ICON,
  ICON_SIZES,
  formatRelativeTime,
} from '../types';

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

// Styled Components
const ItemContainer = styled.div<{ $severity: NotificationSeverity; $read: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme, $read }) =>
    $read ? theme.colors.background.secondary : theme.colors.background.primary};
  border-left: 3px solid ${({ $severity }) => SEVERITY_COLORS[$severity].border};
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

const IconWrapper = styled.div<{ $severity: NotificationSeverity }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $severity }) => SEVERITY_COLORS[$severity].bg};
  color: ${({ $severity }) => SEVERITY_COLORS[$severity].icon};
  flex-shrink: 0;
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

const ActionButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.surface.primary.text};
  background: ${({ theme }) => theme.colors.surface.primary.bg};
  border: 1px solid ${({ theme }) => theme.colors.surface.primary.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surface.primary.bg};
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.surface.primary.border};
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
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

/**
 * NotificationItem Component
 */
export const NotificationItem: FC<NotificationItemProps> = memo(({
  notification,
  onMarkAsRead,
  onDismiss,
}) => {
  const { id, type, title, message, timestamp, read, severity, actionUrl, actionLabel } = notification;

  const IconComponent = TYPE_ICONS[type] || DEFAULT_ICON;

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-testid="dismiss-button"]') || target.closest('button[type="button"]')) {
      return;
    }
    onMarkAsRead(id);
  }, [id, onMarkAsRead]);

  const handleDismiss = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onDismiss(id);
  }, [id, onDismiss]);

  const handleAction = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

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
        <IconComponent size={ICON_SIZES.notification} data-testid="notification-icon" />
      </IconWrapper>

      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <Timestamp data-testid="notification-timestamp">
          {formatRelativeTime(timestamp)}
        </Timestamp>

        {actionUrl && actionLabel && (
          <div style={{ marginTop: '8px' }}>
            <ActionButton type="button" onClick={handleAction}>
              {actionLabel}
            </ActionButton>
          </div>
        )}
      </Stack>

      <DismissButton
        data-testid="dismiss-button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        <X size={ICON_SIZES.action} />
      </DismissButton>
    </ItemContainer>
  );
});

NotificationItem.displayName = 'NotificationItem';
