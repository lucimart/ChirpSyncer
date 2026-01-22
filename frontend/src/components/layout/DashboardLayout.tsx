'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { PageTransition } from './PageTransition';
import { NotificationCenter, Notification } from '@/components/notifications';
import { layout, breakpoints } from '@/styles/tokens/spacing';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Mock notifications - replace with real API hook when available
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Sync Complete',
    message: '15 posts synced successfully from Twitter to Bluesky',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Rate Limit Warning',
    message: 'Approaching API rate limit on Twitter (80% used)',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'New Feature',
    message: 'Check out our new scheduling feature!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

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

const MenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-left: -${({ theme }) => theme.spacing[2]};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
  }
`;

const MobileTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
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
  background-color: ${({ theme }) => theme.colors.background.secondary};
  min-height: 100vh;
  transition: margin-left 0.3s ease;
  width: 100%;

  @media (min-width: ${breakpoints.md}) and (max-width: calc(${breakpoints.lg} - 1px)) {
    margin-left: ${layout.sidebarCollapsedWidth};
  }

  @media (max-width: calc(${breakpoints.md} - 1px)) {
    margin-left: 0;
    padding: ${({ theme }) => theme.spacing[4]};
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

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border.light};
  border-top-color: ${({ theme }) => theme.colors.primary[600]};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Swipe handling state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEndY(null);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;
    
    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - touchEndY;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (!isHorizontalSwipe) return;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe && isMobileMenuOpen) {
      closeMobileMenu();
    }
    
    // Only allow opening from the left edge (first 50px)
    if (isRightSwipe && !isMobileMenuOpen && touchStart < 50) {
      setIsMobileMenuOpen(true);
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
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
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader>
          <MenuButton
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="sidebar-nav"
          >
            <Menu size={24} />
          </MenuButton>
          <MobileTitle>ChirpSyncer</MobileTitle>
          <HeaderActions>
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismiss}
            />
          </HeaderActions>
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
      </div>
    </LayoutContainer>
  );
}
