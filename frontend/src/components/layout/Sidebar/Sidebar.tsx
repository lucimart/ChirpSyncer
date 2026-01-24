'use client';

/**
 * Sidebar Component
 *
 * Navigation sidebar with collapsible menu groups, responsive behavior,
 * and user section with logout functionality.
 */

import styled from 'styled-components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useCallback, memo, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Settings, LogOut, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CollapsibleMenu, Avatar, Stack } from '@/components/ui';
import { layout, breakpoints } from '@/styles/tokens/spacing';
import { type SidebarProps, NAV_GROUPS, ICON_SIZES } from '../types';

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

const navContainerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Styled Components
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 49;
  display: none;

  @media (max-width: calc(${breakpoints.md} - 1px)) {
    display: block;
  }
`;

const SidebarContainer = styled.aside<{ $isOpen: boolean }>`
  width: ${layout.sidebarWidth};
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  transition: width 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  overflow-x: hidden;
  white-space: nowrap;

  // Tablet: Collapsed state
  @media (min-width: ${breakpoints.md}) and (max-width: calc(${breakpoints.lg} - 1px)) {
    width: ${layout.sidebarCollapsedWidth};

    &:hover {
      width: ${layout.sidebarWidth};
      box-shadow: ${({ theme }) => theme.shadows.xl};
    }

    // Hide text labels when collapsed (and not hovered)
    &:not(:hover) {
      // Target LogoText
      ${() => LogoText} {
        opacity: 0;
        visibility: hidden;
        width: 0;
      }

      // Target NavLink text and CollapsibleMenu labels
      nav span,
      button span:not(:first-child) {
        display: none;
      }

      // Center icons in NavLinks and Buttons
      nav a,
      nav button {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }

      // Remove padding from nested CollapsibleMenu content
      nav button + div {
        padding-left: 0;
      }

      // Hide CollapsibleMenu chevron
      button > span:last-child {
        display: none;
      }
    }
  }

  // Mobile: Drawer state
  @media (max-width: calc(${breakpoints.md} - 1px)) {
    width: ${layout.sidebarWidth};
    transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    box-shadow: ${({ $isOpen, theme }) => ($isOpen ? theme.shadows.xl : 'none')};
  }
`;

const Logo = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${layout.headerHeight};
  min-height: ${layout.headerHeight};
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const LogoIcon = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const LogoText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
  transition: opacity 0.2s ease, visibility 0.2s ease;
`;

const SwoopIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="swoop-sidebar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6"/>
        <stop offset="100%" stopColor="#34D399"/>
      </linearGradient>
    </defs>
    <path
      d="M4 22 Q16 6 28 22"
      stroke="url(#swoop-sidebar-gradient)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]};
  display: none;

  @media (max-width: calc(${breakpoints.md} - 1px)) {
    display: flex;
  }
`;

const Nav = styled(motion.nav)`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-y: auto;
  overflow-x: hidden;

  // Hide scrollbar but keep functionality
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: transparent;
  }
  &:hover::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const NavSection = styled(motion.div)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const NavSectionTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  transition: opacity 0.2s ease;
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.surface.primary.text : theme.colors.text.secondary};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.surface.primary.bg : 'transparent'};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $active }) =>
      $active ? theme.colors.surface.primary.bg : theme.colors.background.secondary};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.surface.primary.text : theme.colors.text.primary};
    text-decoration: none;
  }

  svg {
    width: ${ICON_SIZES.nav}px;
    height: ${ICON_SIZES.nav}px;
    min-width: ${ICON_SIZES.nav}px;
  }

  span {
    transition: opacity 0.2s ease;
  }
`;

const UserSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const UserName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: opacity 0.2s ease;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface.danger.bg};
    color: ${({ theme }) => theme.colors.surface.danger.text};
  }

  svg {
    width: ${ICON_SIZES.nav}px;
    height: ${ICON_SIZES.nav}px;
    min-width: ${ICON_SIZES.nav}px;
  }

  span {
    transition: opacity 0.2s ease;
  }
`;

/**
 * Sidebar Component
 */
export const Sidebar: FC<SidebarProps> = memo(({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Small timeout to ensure visibility transition has started
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = '/login';
  }, [logout]);

  const handleLinkClick = useCallback(() => {
    // Only close on mobile
    if (window.innerWidth < parseInt(breakpoints.md) && onClose) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Overlay
            key="sidebar-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <SidebarContainer
        $isOpen={isOpen}
        id="sidebar-nav"
      >
      <Logo>
        <LogoContainer>
          <LogoIcon>
            <SwoopIcon />
          </LogoIcon>
          <LogoText>Swoop</LogoText>
        </LogoContainer>
        {onClose && (
          <CloseButton
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={ICON_SIZES.close} />
          </CloseButton>
        )}
      </Logo>

      <Nav
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Dashboard - always visible at top */}
        <NavSection variants={navItemVariants}>
          <NavLink
            href="/dashboard"
            $active={pathname === '/dashboard'}
            onClick={handleLinkClick}
          >
            <Home />
            <span>Dashboard</span>
          </NavLink>
        </NavSection>

        {/* Collapsible Groups */}
        <NavSection variants={navItemVariants}>
          {NAV_GROUPS.map((group) => (
            <CollapsibleMenu
              key={group.label}
              label={group.label}
              icon={group.icon}
              defaultOpen={group.items.some((item) => pathname === item.href)}
            >
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  $active={pathname === item.href}
                  onClick={handleLinkClick}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </CollapsibleMenu>
          ))}
        </NavSection>

        {/* Settings */}
        <NavSection variants={navItemVariants}>
          <NavLink
            href="/dashboard/settings"
            $active={pathname === '/dashboard/settings'}
            onClick={handleLinkClick}
          >
            <Settings />
            <span>Settings</span>
          </NavLink>
        </NavSection>

        {/* Admin section */}
        {user?.is_admin && (
          <NavSection variants={navItemVariants}>
            <NavSectionTitle>Admin</NavSectionTitle>
            <NavLink
              href="/dashboard/admin/users"
              $active={pathname === '/dashboard/admin/users'}
              onClick={handleLinkClick}
            >
              <ShieldCheck />
              <span>User Management</span>
            </NavLink>
          </NavSection>
        )}
      </Nav>

      <UserSection>
        <Stack direction="row" align="center" gap={3} style={{ marginBottom: '12px' }}>
          <Avatar name={user?.username || 'User'} size="sm" />
          <UserName>{user?.username || 'User'}</UserName>
        </Stack>
        <LogoutButton onClick={handleLogout}>
          <LogOut />
          <span>Sign Out</span>
        </LogoutButton>
      </UserSection>
    </SidebarContainer>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
