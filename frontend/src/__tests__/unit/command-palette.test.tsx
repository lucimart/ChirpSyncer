/**
 * CommandPalette Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { CommandPalette } from '@/components/ui/CommandPalette';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = ResizeObserverMock as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock theme
const mockTheme = {
  colors: {
    background: { primary: '#fff', secondary: '#f5f5f5', tertiary: '#eee' },
    text: { primary: '#000', secondary: '#666', tertiary: '#999' },
    border: { light: '#ddd', default: '#ccc', dark: '#999' },
    primary: { 50: '#e3f2fd', 100: '#bbdefb', 300: '#64b5f6', 600: '#1e88e5', 700: '#1976d2' },
    neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#eee', 500: '#9e9e9e' },
    danger: { 50: '#ffebee', 100: '#ffcdd2', 500: '#f44336', 600: '#e53935' },
    success: { 50: '#e8f5e9', 100: '#c8e6c9', 500: '#4caf50', 600: '#43a047' },
    warning: { 50: '#fff3e0', 100: '#ffe0b2', 600: '#fb8c00', 700: '#f57c00' },
    surface: {
      primary: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
      success: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
      warning: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
      danger: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
      info: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
      neutral: { bg: '#f5f5f5', text: '#424242', border: '#e0e0e0' },
    },
  },
  spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px' },
  fontSizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px' },
  fontWeights: { medium: 500, semibold: 600, bold: 700 },
  borderRadius: { md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)', xl: '0 20px 25px rgba(0,0,0,0.15)' },
  transitions: { fast: '150ms', default: '200ms' },
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('CommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue('dark'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: jest.fn() },
      writable: true,
      configurable: true,
    });
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('renders nothing when closed', () => {
    renderWithTheme(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument();
  });

  it('opens with Ctrl+K keyboard shortcut', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });
  });

  it('opens with Cmd+K keyboard shortcut (Mac)', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });
  });

  it('displays Quick Actions section', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  it('displays Navigation section', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });
  });

  it('displays navigation commands', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sync')).toBeInTheDocument();
      expect(screen.getByText('Scheduler')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Credentials')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('displays theme toggle action', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Switch to Light Mode/i)).toBeInTheDocument();
    });
  });

  it('displays Sync Now action', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });
  });

  it('displays footer with keyboard hints', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('navigates to dashboard when Dashboard command is selected', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
    // Click on Dashboard
    const dashboardItem = screen.getByText('Dashboard').closest('[data-value]');
    if (dashboardItem) {
      await act(async () => {
        fireEvent.click(dashboardItem);
      });
    }
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to sync page when Sync command is selected', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Sync')).toBeInTheDocument();
    });
    
    const syncItem = screen.getByText('Sync').closest('[data-value]');
    if (syncItem) {
      await act(async () => {
        fireEvent.click(syncItem);
      });
    }
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/sync');
    });
  });

  it('displays keyboard shortcuts for commands', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      // Check for keyboard shortcuts like "G D" for Dashboard
      const kbds = screen.getAllByText('G');
      expect(kbds.length).toBeGreaterThan(0);
    });
  });

  it('reads theme from localStorage on mount', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('light');
    
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Switch to Dark Mode/i)).toBeInTheDocument();
    });
  });

  it('uses system preference when theme is set to system', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('system');
    
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    // System prefers dark (mocked above), so should show "Switch to Light Mode"
    await waitFor(() => {
      expect(screen.getByText(/Switch to Light Mode/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no results match', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });
    
    // Type something that won't match
    const input = screen.getByPlaceholderText(/search commands/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'xyznonexistent123' } });
    });
    
    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('displays all navigation items', async () => {
    renderWithTheme(<CommandPalette />);
    
    await act(async () => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Connectors')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Cleanup')).toBeInTheDocument();
      expect(screen.getByText('Feed Lab')).toBeInTheDocument();
      expect(screen.getByText('Algorithm')).toBeInTheDocument();
      expect(screen.getByText('Workspaces')).toBeInTheDocument();
      expect(screen.getByText('Bookmarks')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  it('has displayName set', () => {
    expect(CommandPalette.displayName).toBe('CommandPalette');
  });
});
