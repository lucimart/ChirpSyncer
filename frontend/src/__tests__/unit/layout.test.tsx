/**
 * Layout Components Tests
 * Tests for DashboardLayout and Sidebar components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/lib/auth';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));

// Mock useAuth
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01' },
      token: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      register: jest.fn(),
      checkAuth: jest.fn(),
      setUser: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders logo text', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Swoop')).toBeInTheDocument();
    });

    it('renders dashboard link', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders navigation sections', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Platforms')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Organize')).toBeInTheDocument();
    });

    it('renders settings link', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders user info', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('renders user avatar initials', () => {
      renderWithTheme(<Sidebar />);
      // Avatar component shows first 2 chars for single-word names: 'testuser' -> 'te' (CSS uppercases visually)
      expect(screen.getByText('te')).toBeInTheDocument();
    });

    it('renders sign out button', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  describe('Admin Section', () => {
    it('renders admin section for admin users', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: 'admin', email: 'admin@example.com', is_admin: true, created_at: '2024-01-01' },
        token: 'test-token',
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        register: jest.fn(),
        checkAuth: jest.fn(),
        setUser: jest.fn(),
      });

      renderWithTheme(<Sidebar />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('does not render admin section for non-admin users', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('renders close button when onClose is provided', () => {
      const onClose = jest.fn();
      renderWithTheme(<Sidebar isOpen onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close menu');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      renderWithTheme(<Sidebar isOpen onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close menu');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('does not render close button when onClose is not provided', () => {
      renderWithTheme(<Sidebar />);
      expect(screen.queryByLabelText('Close menu')).not.toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('calls logout when sign out button is clicked', async () => {
      const mockLogout = jest.fn().mockResolvedValue(undefined);
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01' },
        token: 'test-token',
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        logout: mockLogout,
        register: jest.fn(),
        checkAuth: jest.fn(),
        setUser: jest.fn(),
      });

      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });

      renderWithTheme(<Sidebar />);
      
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });

      // Restore window.location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('Collapsible Menus', () => {
    it('expands platforms menu on click', () => {
      renderWithTheme(<Sidebar />);
      
      const platformsButton = screen.getByText('Platforms');
      fireEvent.click(platformsButton);
      
      expect(screen.getByText('Connectors')).toBeInTheDocument();
      expect(screen.getByText('Credentials')).toBeInTheDocument();
    });

    it('expands content menu on click', () => {
      renderWithTheme(<Sidebar />);
      
      const contentButton = screen.getByText('Content');
      fireEvent.click(contentButton);
      
      expect(screen.getByText('Sync')).toBeInTheDocument();
      expect(screen.getByText('Scheduler')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Cleanup')).toBeInTheDocument();
    });

    it('expands insights menu on click', () => {
      renderWithTheme(<Sidebar />);
      
      const insightsButton = screen.getByText('Insights');
      fireEvent.click(insightsButton);
      
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Feed Lab')).toBeInTheDocument();
      expect(screen.getByText('Algorithm')).toBeInTheDocument();
    });

    it('expands organize menu on click', () => {
      renderWithTheme(<Sidebar />);
      
      const organizeButton = screen.getByText('Organize');
      fireEvent.click(organizeButton);
      
      expect(screen.getByText('Workspaces')).toBeInTheDocument();
      expect(screen.getByText('Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('User Display', () => {
    it('shows avatar initials when username is missing', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: '', email: 'test@example.com', is_admin: false, created_at: '2024-01-01' },
        token: 'test-token',
        isLoading: false,
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        register: jest.fn(),
        checkAuth: jest.fn(),
        setUser: jest.fn(),
      });

      renderWithTheme(<Sidebar />);
      // Avatar component shows first 2 chars for single-word names, fallback is 'User' -> 'Us'
      expect(screen.getByText('Us')).toBeInTheDocument();
    });

    it('shows User as username when username is missing', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        register: jest.fn(),
        checkAuth: jest.fn(),
        setUser: jest.fn(),
      });

      renderWithTheme(<Sidebar />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });
});
