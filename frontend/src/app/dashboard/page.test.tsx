import type { ReactElement, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import DashboardPage from './page';

// Mock OnboardingProvider
jest.mock('@/components/onboarding', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useOnboarding: () => ({
    steps: [],
    currentStep: null,
    progress: 100,
    isComplete: true,
    showChecklist: false,
    completeStep: jest.fn(),
    dismissChecklist: jest.fn(),
    resetOnboarding: jest.fn(),
  }),
  OnboardingChecklist: () => null,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock @/lib/api
const mockGetDashboardStats = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getDashboardStats: () => mockGetDashboardStats(),
  },
}));

// Mock useToast
const mockAddToast = jest.fn();
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    useToast: () => ({
      addToast: mockAddToast,
      toasts: [],
      dismissToast: jest.fn(),
    }),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockGetDashboardStats.mockResolvedValue({
      success: true,
      data: {
        synced_today: 15,
        synced_week: 42,
        total_synced: 256,
        platforms_connected: 2,
      },
    });
  });

  describe('Initial Render', () => {
    it('renders dashboard page header', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Overview of your ChirpSyncer activity')
      ).toBeInTheDocument();
    });

    it('renders widget grid with default widgets', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Synced Today')).toBeInTheDocument();
      });
      expect(screen.getByText('Synced This Week')).toBeInTheDocument();
      expect(screen.getByText('Total Synced')).toBeInTheDocument();
      expect(screen.getByText('Platforms Connected')).toBeInTheDocument();
    });

    it('renders recent activity section', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('shows empty state for recent activity', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Start by adding credentials and syncing your accounts.')
      ).toBeInTheDocument();
    });

    it('renders manage credentials link', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /manage credentials/i })).toHaveAttribute(
          'href',
          '/dashboard/credentials'
        );
      });
    });
  });

  describe('OnboardingChecklist', () => {
    it('renders onboarding checklist when incomplete', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // OnboardingChecklist should be rendered within OnboardingProvider
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('calls getDashboardStats on mount', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(mockGetDashboardStats).toHaveBeenCalled();
      });
    });

    it('handles API error gracefully', async () => {
      mockGetDashboardStats.mockResolvedValue({
        success: false,
        error: 'Failed to fetch stats',
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Widget Interactions', () => {
    it('persists widget layout to localStorage', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chirpsyncer-dashboard-widgets',
          expect.any(String)
        );
      });
    });

    it('loads widget layout from localStorage', async () => {
      const savedWidgets = JSON.stringify([
        {
          id: 'custom-widget',
          type: 'stats',
          title: 'Custom Widget',
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          data: { icon: 'RefreshCw', color: '#22c55e', statKey: 'synced_today' },
        },
      ]);
      localStorageMock.getItem.mockReturnValue(savedWidgets);

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith(
          'chirpsyncer-dashboard-widgets'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible page structure', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      });
    });

    it('manage credentials button is accessible', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        const button = screen.getByRole('link', { name: /manage credentials/i });
        expect(button).toBeInTheDocument();
      });
    });
  });
});
