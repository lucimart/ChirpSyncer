/**
 * NotificationCenter Component
 *
 * Renders a notification bell with unread count badge, dropdown with notification list,
 * mark all as read functionality, and settings link.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Bell, Settings, Check } from 'lucide-react';
import { NotificationItem, Notification } from './NotificationItem';

export interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
}

// Styled Components
const Container = styled.div`
  position: relative;
`;

const BellButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

const UnreadBadge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: white;
  background: ${({ theme }) => theme.colors.danger[500]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-height: 500px;
  background: ${({ theme }) => theme.colors.background.primary};
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

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MarkAllReadButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.primary[600]};
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primary[50]};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

const NotificationList = styled.div`
  max-height: 380px;
  overflow-y: auto;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral[300]};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.neutral[400]};
  }
`;

const NotificationItemWrapper = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  text-align: center;
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.neutral[100]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const DropdownFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const SettingsLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.primary[600]};
    background: ${({ theme }) => theme.colors.primary[50]};
  }
`;

/**
 * NotificationCenter Component
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <Container ref={containerRef}>
      <BellButton
        data-testid="notification-bell"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <UnreadBadge data-testid="unread-count">{unreadCount}</UnreadBadge>
        )}
      </BellButton>

      {isOpen && (
        <Dropdown data-testid="notification-dropdown" role="menu">
          <DropdownHeader>
            <HeaderTitle>Notifications</HeaderTitle>
            <MarkAllReadButton
              onClick={onMarkAllAsRead}
              aria-label="Mark all as read"
            >
              <Check size={14} />
              Mark all as read
            </MarkAllReadButton>
          </DropdownHeader>

          <NotificationList>
            {notifications.length === 0 ? (
              <EmptyState data-testid="notifications-empty">
                <EmptyIcon>
                  <Bell size={24} />
                </EmptyIcon>
                <EmptyText>No notifications</EmptyText>
              </EmptyState>
            ) : (
              notifications.map((notification) => (
                <NotificationItemWrapper key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onDismiss={onDismiss}
                  />
                </NotificationItemWrapper>
              ))
            )}
          </NotificationList>

          <DropdownFooter>
            <SettingsLink
              href="/dashboard/settings/notifications"
              data-testid="notification-settings-link"
            >
              <Settings size={16} />
              Notification Settings
            </SettingsLink>
          </DropdownFooter>
        </Dropdown>
      )}
    </Container>
  );
};
