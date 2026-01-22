/**
 * DashboardLayout Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth
const mockCheckAuth = jest.fn();
let mockIsAuthenticated = true;
let mockIsLoading = false;

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    checkAuth: mockCheckAuth,
    user: { id: 1, username: 'testuser', is_admin: false },
    logout: jest.fn(),
  }),
}));

// Mock Sidebar
jest.mock('@/components/layout/Sidebar', () => ({
  Sidebar: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="sidebar" data-open={isOpen}>
      <button onClick={onClose} data-testid="close-sidebar">Close</button>
    </div>
  ),
}));

// Mock theme
const mockTheme = {
  colors: {
    background: { primary: '#fff', secondary: '#f5f5f5', tertiary: '#eee' },
    text: { primary: '#000', secondary: '#666', tertiary: '#999' },
    border: { light: '#ddd', default: '#ccc', dark: '#999' },
    primary: { 600: '#1e88e5' },
  },
  spacing: { 2: '8px', 3: '12px', 4: '16px', 6: '24px' },
  fontSizes: { lg: '18px' },
  fontWeights: { bold: 700 },
  borderRadius: { md: '6px' },
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockIsLoading = false;
  });

  it('renders children when authenticated', () => {
    renderWithTheme(
      <DashboardLayout>
        <div data-testid="child-content">Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('calls checkAuth on mount', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(mockCheckAuth).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    mockIsLoading = true;
    mockIsAuthenticated = false;

    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Should not show content when loading
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    // Should not show sidebar when loading
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    mockIsAuthenticated = false;
    mockIsLoading = false;

    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('returns null when not authenticated and not loading', () => {
    mockIsAuthenticated = false;
    mockIsLoading = false;

    const { container } = renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Should not render content
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders sidebar component', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('toggles mobile menu when menu button is clicked', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'false');

    // Click menu button to open
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);

    expect(sidebar).toHaveAttribute('data-open', 'true');

    // Click again to close
    fireEvent.click(menuButton);
    expect(sidebar).toHaveAttribute('data-open', 'false');
  });

  it('closes mobile menu when close button is clicked', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Open menu first
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'true');

    // Close via sidebar close button
    const closeButton = screen.getByTestId('close-sidebar');
    fireEvent.click(closeButton);

    expect(sidebar).toHaveAttribute('data-open', 'false');
  });

  it('closes mobile menu when sidebar close is called', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Open menu first
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'true');

    // Close via sidebar's onClose callback (simulated by close button)
    const closeButton = screen.getByTestId('close-sidebar');
    fireEvent.click(closeButton);

    expect(sidebar).toHaveAttribute('data-open', 'false');
  });

  it('displays ChirpSyncer title in mobile header', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('ChirpSyncer')).toBeInTheDocument();
  });

  describe('touch/swipe handling', () => {
    const getLayoutContainer = (container: HTMLElement) => {
      // Get the first div which is the LayoutContainer
      return container.firstChild as HTMLElement;
    };

    it('handles touch start event', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 10, clientY: 100 }],
      });

      // No error should occur
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles touch move event', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 10, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 100, clientY: 100 }],
      });

      // No error should occur
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('opens menu on right swipe from left edge', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      const sidebar = screen.getByTestId('sidebar');
      
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Swipe right from left edge (x < 50)
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 10, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(layoutContainer);

      expect(sidebar).toHaveAttribute('data-open', 'true');
    });

    it('closes menu on left swipe when menu is open', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      const sidebar = screen.getByTestId('sidebar');
      
      // Open menu first
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);
      expect(sidebar).toHaveAttribute('data-open', 'true');

      // Swipe left to close
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 50, clientY: 100 }],
      });

      fireEvent.touchEnd(layoutContainer);

      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('does not open menu on right swipe from middle of screen', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      const sidebar = screen.getByTestId('sidebar');
      
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Swipe right from middle (x > 50)
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchEnd(layoutContainer);

      // Should still be closed
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('ignores vertical swipes', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      const sidebar = screen.getByTestId('sidebar');
      
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Vertical swipe (more Y movement than X)
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 10, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 20, clientY: 300 }],
      });

      fireEvent.touchEnd(layoutContainer);

      // Should still be closed (vertical swipe ignored)
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });

    it('handles touch end without touch move', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      
      // Touch end without start/move
      fireEvent.touchEnd(layoutContainer);

      // No error should occur
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles touch end without touch start', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      
      // Only touch move and end
      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 100, clientY: 100 }],
      });

      fireEvent.touchEnd(layoutContainer);

      // No error should occur
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('ignores small swipes below threshold', () => {
      const { container } = renderWithTheme(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const layoutContainer = getLayoutContainer(container);
      const sidebar = screen.getByTestId('sidebar');
      
      expect(sidebar).toHaveAttribute('data-open', 'false');

      // Small swipe (less than 50px)
      fireEvent.touchStart(layoutContainer, {
        targetTouches: [{ clientX: 10, clientY: 100 }],
      });

      fireEvent.touchMove(layoutContainer, {
        targetTouches: [{ clientX: 40, clientY: 100 }],
      });

      fireEvent.touchEnd(layoutContainer);

      // Should still be closed (swipe too small)
      expect(sidebar).toHaveAttribute('data-open', 'false');
    });
  });

  it('has correct aria attributes on menu button', () => {
    renderWithTheme(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'sidebar-nav');

    // Open menu
    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton).toHaveAttribute('aria-label', 'Close menu');
  });
});
