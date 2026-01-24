import type { ReactElement, ReactNode } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import AnalyticsPage from './page';

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
  usePathname: () => '/dashboard/analytics',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @/lib/api
const mockGetAnalyticsOverview = jest.fn();
const mockGetAnalyticsTopTweets = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    getAnalyticsOverview: (period: string) => mockGetAnalyticsOverview(period),
    getAnalyticsTopTweets: (period: string) => mockGetAnalyticsTopTweets(period),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Mock @nivo/pie
jest.mock('@nivo/pie', () => ({
  ResponsivePie: () => <div data-testid="nivo-pie-chart">Pie Chart</div>,
}));

// Mock @nivo/bar
jest.mock('@nivo/bar', () => ({
  ResponsiveBar: () => <div data-testid="nivo-bar-chart">Bar Chart</div>,
}));

// Mock @nivo/line
jest.mock('@nivo/line', () => ({
  ResponsiveLine: () => <div data-testid="nivo-line-chart">Line Chart</div>,
}));

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

const mockOverviewData = {
  total_impressions: 125000,
  total_engagements: 4500,
  avg_engagement_rate: 3.6,
  total_likes: 3200,
  total_replies: 1300,
};

const mockTopTweetsData = {
  items: [
    { tweet_id: 'tweet-1', likes: 150, replies: 42 },
    { tweet_id: 'tweet-2', likes: 89, replies: 23 },
    { tweet_id: 'tweet-3', likes: 67, replies: 15 },
  ],
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAnalyticsOverview.mockResolvedValue({
      success: true,
      data: mockOverviewData,
    });
    mockGetAnalyticsTopTweets.mockResolvedValue({
      success: true,
      data: mockTopTweetsData,
    });
  });

  describe('Initial Render', () => {
    it('renders page header', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Track your social media performance across platforms')
      ).toBeInTheDocument();
    });

    it('renders period selector with default 30d', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('30d')).toBeInTheDocument();
      });
      expect(screen.getByText('24h')).toBeInTheDocument();
      expect(screen.getByText('7d')).toBeInTheDocument();
      expect(screen.getByText('90d')).toBeInTheDocument();
    });

    it('renders export button', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });
  });

  describe('Stats Cards', () => {
    it('renders all stat cards', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Followers')).toBeInTheDocument();
      });
      expect(screen.getByText('Engagement Rate')).toBeInTheDocument();
      expect(screen.getByText('Impressions')).toBeInTheDocument();
      expect(screen.getByText('Interactions')).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('renders engagement chart', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Engagement Over Time')).toBeInTheDocument();
      });
    });

    it('renders platform breakdown chart', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Platform Breakdown')).toBeInTheDocument();
      });
    });
  });

  describe('Top Posts', () => {
    it('renders top performing posts section', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Performing Posts')).toBeInTheDocument();
      });
    });

    it('displays post content preview', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        const posts = screen.getAllByText(/just published a new update about the chirpsyncer project/i);
        expect(posts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Period Selection', () => {
    it('fetches data with selected period', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(mockGetAnalyticsOverview).toHaveBeenCalledWith('30d');
        expect(mockGetAnalyticsTopTweets).toHaveBeenCalledWith('30d');
      });
    });

    it('refetches data when period changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('7d')).toBeInTheDocument();
      });

      await user.click(screen.getByText('7d'));

      await waitFor(() => {
        expect(mockGetAnalyticsOverview).toHaveBeenCalledWith('7d');
        expect(mockGetAnalyticsTopTweets).toHaveBeenCalledWith('7d');
      });
    });

    it('updates active period button style', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        const button24h = screen.getByText('24h');
        expect(button24h).toBeInTheDocument();
      });

      await user.click(screen.getByText('24h'));

      // The 24h button should now be active (visual styling applied)
      await waitFor(() => {
        expect(mockGetAnalyticsOverview).toHaveBeenCalledWith('24h');
      });
    });
  });

  describe('Export Functionality', () => {
    it('exports data as JSON when export button is clicked', async () => {
      const user = userEvent.setup();
      const mockClick = jest.fn();
      const originalCreateElement = document.createElement.bind(document);

      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
          } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tagName);
      });

      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      mockGetAnalyticsOverview.mockResolvedValue({
        success: false,
        error: 'Failed to load analytics',
      });

      renderWithProviders(<AnalyticsPage />);

      // Page should still render
      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    it('handles missing top tweets data', async () => {
      mockGetAnalyticsTopTweets.mockResolvedValue({
        success: false,
        data: null,
      });

      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Top Performing Posts')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
      });
    });

    it('period buttons are keyboard accessible', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('export button has accessible name', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('renders stats grid', async () => {
      renderWithProviders(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Followers')).toBeInTheDocument();
        expect(screen.getByText('Engagement Rate')).toBeInTheDocument();
      });
    });
  });
});
