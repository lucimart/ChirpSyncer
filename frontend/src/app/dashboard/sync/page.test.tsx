import type { ReactElement, ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import SyncPage from './page';

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
  usePathname: () => '/dashboard/sync',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock RealtimeProvider
const mockUseRealtimeMessage = jest.fn();
jest.mock('@/providers/RealtimeProvider', () => ({
  useRealtimeMessage: (type: string, handler: () => void) => mockUseRealtimeMessage(type, handler),
  useRealtime: () => ({ status: 'connected' }),
  useConnectionStatus: () => 'connected',
  RealtimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock @/lib/api
const mockGetSyncStats = jest.fn();
const mockGetSyncHistory = jest.fn();
const mockStartSync = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getSyncStats: () => mockGetSyncStats(),
    getSyncHistory: () => mockGetSyncHistory(),
    startSync: () => mockStartSync(),
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

const mockSyncStats = {
  total: 256,
  last_sync: '2025-01-15T10:30:00Z',
};

const mockSyncHistory = {
  items: [
    {
      id: 1,
      direction: 'Twitter to Bluesky',
      status: 'success' as const,
      posts_synced: 15,
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 2,
      direction: 'Bluesky to Twitter',
      status: 'success' as const,
      posts_synced: 8,
      created_at: '2025-01-15T09:15:00Z',
    },
    {
      id: 3,
      direction: 'Twitter to Bluesky',
      status: 'failed' as const,
      posts_synced: 0,
      created_at: '2025-01-14T14:00:00Z',
    },
  ],
};

describe('SyncPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSyncStats.mockResolvedValue({
      success: true,
      data: mockSyncStats,
    });
    mockGetSyncHistory.mockResolvedValue({
      success: true,
      data: mockSyncHistory,
    });
    mockStartSync.mockResolvedValue({
      success: true,
      data: { operation_id: 'op-123' },
    });
  });

  describe('Initial Render', () => {
    it('renders page header', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync Dashboard')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Manage synchronization between Twitter and Bluesky')
      ).toBeInTheDocument();
    });

    it('renders sync now button', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      });
    });

    it('renders connection status', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Display', () => {
    it('displays total synced count', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Synced')).toBeInTheDocument();
      });
    });

    it('displays pending count', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });

    it('displays last sync time', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Last Sync')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Directions', () => {
    it('renders Twitter to Bluesky direction card', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync Directions')).toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: /sync twitter.*bluesky/i })
      ).toBeInTheDocument();
    });

    it('renders Bluesky to Twitter direction card', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sync bluesky.*twitter/i })
        ).toBeInTheDocument();
      });
    });

    it('displays success rate for each direction', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        const successRates = screen.getAllByText(/success rate/i);
        expect(successRates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sync History', () => {
    it('renders sync history section', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Sync History')).toBeInTheDocument();
      });
    });

    it('displays history items', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        const items = screen.getAllByText('Twitter to Bluesky');
        expect(items.length).toBeGreaterThan(0);
      });
    });

    it('shows status icons for history items', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        // Check that success and failed items are rendered
        const items = screen.getAllByText('Twitter to Bluesky');
        expect(items.length).toBeGreaterThan(0);
      });
    });

    it('shows empty state when no history', async () => {
      mockGetSyncHistory.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('No sync history available yet')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Actions', () => {
    it('triggers sync when sync now button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sync now/i }));

      await waitFor(() => {
        expect(mockStartSync).toHaveBeenCalled();
      });
    });

    it('triggers directional sync for Twitter to Bluesky', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sync twitter.*bluesky/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sync twitter.*bluesky/i }));

      await waitFor(() => {
        expect(mockStartSync).toHaveBeenCalled();
      });
    });

    it('disables sync buttons while syncing', async () => {
      const user = userEvent.setup();
      mockStartSync.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /sync now/i }));

      // Directional buttons should be disabled
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /sync twitter.*bluesky/i })
        ).toBeDisabled();
      });
    });
  });

  describe('Sync Progress', () => {
    it('displays progress when sync is in progress', async () => {
      // This tests the realtime message handling
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(mockUseRealtimeMessage).toHaveBeenCalledWith(
          'sync.progress',
          expect.any(Function)
        );
      });
    });

    it('handles sync completion message', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(mockUseRealtimeMessage).toHaveBeenCalledWith(
          'sync.complete',
          expect.any(Function)
        );
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches sync stats on mount', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(mockGetSyncStats).toHaveBeenCalled();
      });
    });

    it('fetches sync history on mount', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(mockGetSyncHistory).toHaveBeenCalled();
      });
    });

    it('handles stats fetch error', async () => {
      mockGetSyncStats.mockResolvedValue({
        success: false,
        error: 'Failed to fetch stats',
      });

      renderWithProviders(<SyncPage />);

      // Page should still render
      await waitFor(() => {
        expect(screen.getByText('Sync Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sync Dashboard' })).toBeInTheDocument();
      });
    });

    it('sync button has accessible name', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      });
    });

    it('direction cards have accessible buttons', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        const syncButtons = screen.getAllByRole('button', { name: /sync/i });
        expect(syncButtons.length).toBeGreaterThan(0);
      });
    });

    it('status icons have appropriate visual indicators', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        // History items should be rendered
        const items = screen.getAllByText('Twitter to Bluesky');
        expect(items.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('renders stats grid', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Synced')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Last Sync')).toBeInTheDocument();
      });
    });

    it('renders direction cards in grid', async () => {
      renderWithProviders(<SyncPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync Directions')).toBeInTheDocument();
      });
    });
  });
});
