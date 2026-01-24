'use client';

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for authenticated dashboard pages with sidebar,
 * mobile menu, notification center, and page transitions.
 */

import { useEffect, useState, useCallback, memo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDismissNotification,
} from '@/lib/notifications';
import { Sidebar } from '../Sidebar';
import { PageTransition } from '../PageTransition';
import { NotificationCenter } from '@/components/notifications';
import { Spinner, Stack, IconButton } from '@/components/ui';
import { layout, breakpoints } from '@/styles/tokens/spacing';
import { type DashboardLayoutProps, SWIPE_CONFIG, ICON_SIZES } from '../types';

// Styled Components
const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  position: relative;
  touch-action: pan-y;
`;

const MobileHeader = styled.header`
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  position: sticky;
  top: 0;
  z-index: 30;

  @media (max-width: calc(${breakpoints.md} - 1px)) {
    display: flex;
  }
`;

const MobileTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
  margin: 0;
`;

const DesktopHeader = styled.header`
  display: none;
  align-items: center;
  justify-content: flex-end;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  position: sticky;
  top: 0;
  z-index: 20;

  @media (min-width: ${breakpoints.md}) {
    display: flex;
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: ${layout.sidebarWidth};
  padding: ${({ theme }) => theme.spacing[6]};
  padding-bottom: ${({ theme }) => theme.spacing[12]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  transition: margin-left 0.3s ease;
  min-width: 0;

  @media (min-width: ${breakpoints.md}) and (max-width: calc(${breakpoints.lg} - 1px)) {
    margin-left: ${layout.sidebarCollapsedWidth};
  }

  @media (max-width: calc(${breakpoints.md} - 1px)) {
    margin-left: 0;
    padding: ${({ theme }) => theme.spacing[4]};
    padding-bottom: ${({ theme }) => theme.spacing[12]};
  }
`;

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 40;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(4px);

  @media (min-width: ${breakpoints.md}) {
    display: none;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
`;

/**
 * DashboardLayout Component
 */
export const DashboardLayout: FC<DashboardLayoutProps> = memo(({ children }) => {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth, _hasHydrated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: notificationsData } = useNotifications();
  const notifications = notificationsData?.notifications ?? [];
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();
  const dismissNotification = useDismissNotification();

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead.mutate(id);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleDismiss = useCallback(
    (id: string) => {
      dismissNotification.mutate(id);
    },
    [dismissNotification]
  );

  // Swipe handling state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (_hasHydrated) {
      checkAuth();
    }
  }, [checkAuth, _hasHydrated]);

  useEffect(() => {
    // Wait for hydration before making redirect decisions
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, _hasHydrated]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEndY(null);
    setTouchStartY(e.targetTouches[0].clientY);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;

    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - touchEndY;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (!isHorizontalSwipe) return;

    const isLeftSwipe = distanceX > SWIPE_CONFIG.minDistance;
    const isRightSwipe = distanceX < -SWIPE_CONFIG.minDistance;

    if (isLeftSwipe && isMobileMenuOpen) {
      closeMobileMenu();
    }

    // Only allow opening from the left edge
    if (isRightSwipe && !isMobileMenuOpen && touchStart < SWIPE_CONFIG.edgeZone) {
      setIsMobileMenuOpen(true);
    }
  }, [touchStart, touchEnd, touchStartY, touchEndY, isMobileMenuOpen, closeMobileMenu]);

  // Show loading while waiting for hydration or auth check
  if (!_hasHydrated || isLoading) {
    return (
      <LoadingContainer>
        <Spinner size="lg" />
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <LayoutContainer
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      <Overlay $isOpen={isMobileMenuOpen} onClick={closeMobileMenu} />

      <ContentWrapper>
        <MobileHeader>
          <IconButton
            icon={<Menu size={ICON_SIZES.menu} />}
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="sidebar-nav"
            variant="ghost"
            size="sm"
            style={{ marginLeft: '-8px' }}
          />
          <MobileTitle>ChirpSyncer</MobileTitle>
          <Stack direction="row" align="center" gap={2}>
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismiss}
            />
          </Stack>
        </MobileHeader>

        <DesktopHeader>
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDismiss={handleDismiss}
          />
        </DesktopHeader>

        <MainContent>
          <PageTransition>{children}</PageTransition>
        </MainContent>
      </ContentWrapper>
    </LayoutContainer>
  );
});

DashboardLayout.displayName = 'DashboardLayout';
