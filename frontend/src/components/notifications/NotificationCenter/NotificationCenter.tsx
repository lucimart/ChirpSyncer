/**
 * NotificationCenter Component
 *
 * Renders a notification bell with unread count badge, dropdown with notification list,
 * mark all as read functionality, and settings link.
 */

import { useState, useRef, useEffect, useCallback, useMemo, memo, type FC } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, Check } from 'lucide-react';
import { Stack, Typography, SmallText } from '@/components/ui';
import { NotificationItem } from '../NotificationItem';
import { type Notification, DROPDOWN_CONFIG, ICON_SIZES } from '../types';

export interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
}

// Animation variants
const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

const containerVariants = {
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const badgeVariants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 },
};

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

const UnreadBadge = styled(motion.span)`
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

const Dropdown = styled(motion.div)`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: ${DROPDOWN_CONFIG.width}px;
  max-height: ${DROPDOWN_CONFIG.maxHeight}px;
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
    background: ${({ theme }) => theme.colors.surface.primary.bg};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[200]};
  }
`;

const NotificationList = styled(motion.div)`
  max-height: ${DROPDOWN_CONFIG.listMaxHeight}px;
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

const NotificationItemWrapper = styled(motion.div)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const EmptyIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const DropdownFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const SettingsLink = styled(Link)`
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
    background: ${({ theme }) => theme.colors.surface.primary.bg};
  }
`;

/**
 * NotificationCenter Component
 */
export const NotificationCenter: FC<NotificationCenterProps> = memo(({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Click outside and keyboard handlers (only when open)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <Container ref={containerRef}>
      <BellButton
        data-testid="notification-bell"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={ICON_SIZES.bell} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <UnreadBadge
              data-testid="unread-count"
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {unreadCount}
            </UnreadBadge>
          )}
        </AnimatePresence>
      </BellButton>

      <AnimatePresence>
        {isOpen && (
          <Dropdown
            data-testid="notification-dropdown"
            role="menu"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.15 }}
          >
          <DropdownHeader>
            <Typography variant="h4" as="h3">Notifications</Typography>
            <MarkAllReadButton
              onClick={onMarkAllAsRead}
              aria-label="Mark all as read"
            >
              <Check size={ICON_SIZES.action} />
              Mark all as read
            </MarkAllReadButton>
          </DropdownHeader>

          <NotificationList
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {notifications.length === 0 ? (
              <Stack
                align="center"
                justify="center"
                gap={3}
                style={{ padding: '2rem', textAlign: 'center' }}
                data-testid="notifications-empty"
              >
                <EmptyIcon>
                  <Bell size={ICON_SIZES.empty} />
                </EmptyIcon>
                <SmallText>No notifications</SmallText>
              </Stack>
            ) : (
              notifications.map((notification) => (
                <NotificationItemWrapper
                  key={notification.id}
                  variants={itemVariants}
                  transition={{ duration: 0.15 }}
                >
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
              <Settings size={ICON_SIZES.settings} />
              Notification Settings
            </SettingsLink>
          </DropdownFooter>
        </Dropdown>
        )}
      </AnimatePresence>
    </Container>
  );
});

NotificationCenter.displayName = 'NotificationCenter';
