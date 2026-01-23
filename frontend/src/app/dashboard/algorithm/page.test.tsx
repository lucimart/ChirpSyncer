import type { ReactElement } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import AlgorithmPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard/algorithm',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useAlgorithmStats hook
const mockUseAlgorithmStats = jest.fn();
jest.mock('@/hooks/useAlgorithmStats', () => ({
  useAlgorithmStats: () => mockUseAlgorithmStats(),
}));

// Mock fetch for settings API
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

const mockStats = {
  transparencyScore: 85,
  totalRules: 10,
  activeRules: 7,
  feedComposition: {
    boosted: 30,
    demoted: 15,
    filtered: 5,
    unaffected: 50,
  },
  topRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'Boost Follows',
      ruleType: 'boost' as const,
      postsAffected: 120,
      averageImpact: 25,
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Demote Spam',
      ruleType: 'demote' as const,
      postsAffected: 45,
      averageImpact: -15,
    },
  ],
  lastUpdated: '2025-01-14T10:30:00Z',
};

describe('AlgorithmPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlgorithmStats.mockReturnValue({
      data: mockStats,
      loading: false,
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { algorithm_enabled: true } }),
    });
  });

  describe('Initial Render', () => {
    it('renders page header', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByText('Algorithm Dashboard')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Review your transparency score and see how rules shape the feed.')
      ).toBeInTheDocument();
    });

    it('renders AlgorithmDashboard component', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByTestId('algorithm-dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching stats', async () => {
      mockUseAlgorithmStats.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('displays error when stats fetch fails', async () => {
      mockUseAlgorithmStats.mockReturnValue({
        data: null,
        loading: false,
        error: 'Failed to fetch algorithm stats',
      });

      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('With Data', () => {
    it('displays transparency score', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByText('Transparency Score')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });

    it('displays active rules count', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByText('Active Rules')).toBeInTheDocument();
        expect(screen.getByText('7 of 10')).toBeInTheDocument();
      });
    });

    it('displays feed composition breakdown', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(screen.getByText('Feed Composition')).toBeInTheDocument();
        expect(screen.getByText('30% boosted')).toBeInTheDocument();
      });
    });
  });

  describe('Algorithm Toggle', () => {
    it('renders toggle switch', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /enable algorithmic sorting/i });
        expect(toggle).toBeInTheDocument();
      });
    });

    it('calls API when toggle is changed', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/algorithm/settings',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('algorithm_enabled'),
          })
        );
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to feed-lab when view rule is clicked', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit rules/i });
        fireEvent.click(editButton);
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard/feed-lab');
    });
  });

  describe('Settings Fetch', () => {
    it('fetches algorithm settings on mount', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/algorithm/settings');
      });
    });

    it('handles settings fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      renderWithProviders(<AlgorithmPage />);

      // Should still render with default enabled state
      await waitFor(() => {
        expect(screen.getByText('Algorithm Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Algorithm Dashboard' })
        ).toBeInTheDocument();
      });
    });

    it('toggle has accessible label', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /enable algorithmic sorting/i });
        expect(toggle).toBeInTheDocument();
      });
    });

    it('transparency score has proper aria attributes', async () => {
      renderWithProviders(<AlgorithmPage />);

      await waitFor(() => {
        const meter = screen.getByRole('meter');
        expect(meter).toHaveAttribute('aria-valuenow', '85');
      });
    });
  });
});
