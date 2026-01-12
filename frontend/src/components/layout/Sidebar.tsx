'use client';

import styled from 'styled-components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Key,
  RefreshCw,
  Trash2,
  Search,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const SidebarContainer = styled.aside`
  width: 240px;
  height: 100vh;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
`;

const Logo = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const LogoText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
`;

const Nav = styled.nav`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow-y: auto;
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
  }
`;

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/credentials', icon: Key, label: 'Credentials' },
  { href: '/dashboard/sync', icon: RefreshCw, label: 'Sync' },
  { href: '/dashboard/cleanup', icon: Trash2, label: 'Cleanup' },
  { href: '/dashboard/search', icon: Search, label: 'Search' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <SidebarContainer>
      <Logo>
        <LogoText>ChirpSyncer</LogoText>
      </Logo>

      <Nav>
        <NavSection>
          <NavSectionTitle>Menu</NavSectionTitle>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              $active={pathname === item.href}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </NavSection>

        <NavSection>
          <NavSectionTitle>Settings</NavSectionTitle>
          <NavLink
            href="/dashboard/settings"
            $active={pathname === '/dashboard/settings'}
          >
            <Settings />
            Settings
          </NavLink>
        </NavSection>
      </Nav>

      <UserSection>
        <UserInfo>
          <Avatar>{user?.username?.[0]?.toUpperCase() || 'U'}</Avatar>
          <UserName>{user?.username || 'User'}</UserName>
        </UserInfo>
        <LogoutButton onClick={handleLogout}>
          <LogOut />
          Sign Out
        </LogoutButton>
      </UserSection>
    </SidebarContainer>
  );
}
