'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useEffect } from 'react';
import {
  Home,
  Key,
  RefreshCw,
  Trash2,
  Search,
  BarChart3,
  Settings,
  LogOut,
  Bookmark,
  Download,
  Calendar,
  Plug,
  Sparkles,
  Users,
  SlidersHorizontal,
  ShieldCheck,
  Cable,
  FileText,
  Lightbulb,
  FolderOpen,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { CollapsibleMenu } from '@/components/ui';
import { layout, breakpoints } from '@/styles/tokens/spacing';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

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

const LogoText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
  transition: opacity 0.2s ease, visibility 0.2s ease;
`;

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

const Nav = styled.nav`
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

const NavSection = styled.div`
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
    $active ? theme.colors.primary[700] : theme.colors.text.secondary};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.primary[50] : 'transparent'};
  text-decoration: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme, $active }) =>
      $active ? theme.colors.primary[100] : theme.colors.background.secondary};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary[700] : theme.colors.text.primary};
    text-decoration: none;
  }

  svg {
    width: 18px;
    height: 18px;
    min-width: 18px; // Prevent squishing
  }
  
  span {
    transition: opacity 0.2s ease;
  }
`;

const UserSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px; // Prevent squishing
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
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
    background-color: ${({ theme }) => theme.colors.danger[50]};
    color: ${({ theme }) => theme.colors.danger[600]};
  }

  svg {
    width: 18px;
    height: 18px;
    min-width: 18px;
  }
  
  span {
    transition: opacity 0.2s ease;
  }
`;

// Grouped navigation structure
const navGroups = {
  platforms: {
    label: 'Platforms',
    icon: Cable,
    items: [
      { href: '/dashboard/connectors', icon: Plug, label: 'Connectors' },
      { href: '/dashboard/credentials', icon: Key, label: 'Credentials' },
    ],
  },
  content: {
    label: 'Content',
    icon: FileText,
    items: [
      { href: '/dashboard/sync', icon: RefreshCw, label: 'Sync' },
      { href: '/dashboard/scheduler', icon: Calendar, label: 'Scheduler' },
      { href: '/dashboard/search', icon: Search, label: 'Search' },
      { href: '/dashboard/cleanup', icon: Trash2, label: 'Cleanup' },
    ],
  },
  insights: {
    label: 'Insights',
    icon: Lightbulb,
    items: [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/feed-lab', icon: Sparkles, label: 'Feed Lab' },
      { href: '/dashboard/algorithm', icon: SlidersHorizontal, label: 'Algorithm' },
    ],
  },
  organize: {
    label: 'Organize',
    icon: FolderOpen,
    items: [
      { href: '/dashboard/workspaces', icon: Users, label: 'Workspaces' },
      { href: '/dashboard/bookmarks', icon: Bookmark, label: 'Bookmarks' },
      { href: '/dashboard/export', icon: Download, label: 'Export' },
    ],
  },
};

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
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

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handleLinkClick = () => {
    // Only close on mobile
    if (window.innerWidth < parseInt(breakpoints.md) && onClose) {
      onClose();
    }
  };

  return (
    <SidebarContainer $isOpen={isOpen} id="sidebar-nav">
      <Logo>
        <LogoText>ChirpSyncer</LogoText>
        {onClose && (
          <CloseButton 
            ref={closeButtonRef}
            onClick={onClose} 
            aria-label="Close menu"
          >
            <X size={20} />
          </CloseButton>
        )}
      </Logo>

      <Nav>
        {/* Dashboard - always visible at top */}
        <NavSection>
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
        <NavSection>
          <CollapsibleMenu
            label={navGroups.platforms.label}
            icon={navGroups.platforms.icon}
            defaultOpen={navGroups.platforms.items.some(item => pathname === item.href)}
          >
            {navGroups.platforms.items.map((item) => (
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

          <CollapsibleMenu
            label={navGroups.content.label}
            icon={navGroups.content.icon}
            defaultOpen={navGroups.content.items.some(item => pathname === item.href)}
          >
            {navGroups.content.items.map((item) => (
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

          <CollapsibleMenu
            label={navGroups.insights.label}
            icon={navGroups.insights.icon}
            defaultOpen={navGroups.insights.items.some(item => pathname === item.href)}
          >
            {navGroups.insights.items.map((item) => (
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

          <CollapsibleMenu
            label={navGroups.organize.label}
            icon={navGroups.organize.icon}
            defaultOpen={navGroups.organize.items.some(item => pathname === item.href)}
          >
            {navGroups.organize.items.map((item) => (
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
        </NavSection>

        {/* Settings */}
        <NavSection>
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
          <NavSection>
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
        <UserInfo>
          <Avatar>{user?.username?.[0]?.toUpperCase() || 'U'}</Avatar>
          <UserName>{user?.username || 'User'}</UserName>
        </UserInfo>
        <LogoutButton onClick={handleLogout}>
          <LogOut />
          <span>Sign Out</span>
        </LogoutButton>
      </UserSection>
    </SidebarContainer>
  );
}
