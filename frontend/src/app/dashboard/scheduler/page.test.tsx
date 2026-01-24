/**
 * Scheduler Page Tests
 * Tests for the ML-powered post scheduling page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import SchedulerPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard/scheduler',
}));

// Mock scheduling hooks
const mockOptimalTimes = {
  best_times: [
    { hour: 10, day: 1, score: 95, label: 'Mon 10am', estimated: false },
    { hour: 14, day: 2, score: 90, label: 'Tue 2pm', estimated: false },
    { hour: 9, day: 3, score: 85, label: 'Wed 9am', estimated: true },
  ],
  timezone: 'UTC',
  based_on_posts: 50,
  data_quality: 'high',
};

const mockScheduledPosts = [
  {
    id: 'post-1',
    content: 'Test scheduled post content',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    platform: 'twitter',
    status: 'pending',
    predicted_engagement: 80,
    created_at: new Date().toISOString(),
  },
  {
    id: 'post-2',
    content: 'Another scheduled post',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    platform: 'bluesky',
    status: 'published',
    predicted_engagement: 75,
    created_at: new Date().toISOString(),
  },
];

const mockHeatmapData = {
  cells: Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({
      day,
      hour,
      score: Math.floor(Math.random() * 100),
    }))
  ).flat(),
  bestSlots: [
    { day: 2, hour: 14, score: 95, label: 'Tuesday 2 PM' },
    { day: 4, hour: 10, score: 92, label: 'Thursday 10 AM' },
  ],
  dataQuality: 'high' as const,
  basedOnPosts: 50,
};

jest.mock('@/lib/scheduling', () => ({
  useOptimalTimes: () => ({ data: mockOptimalTimes, isLoading: false }),
  useScheduledPosts: () => ({ data: mockScheduledPosts, isLoading: false }),
  useHeatmapData: () => ({ data: mockHeatmapData, isLoading: false }),
  useEngagementPrediction: () => ({
    mutate: jest.fn(),
    data: null,
    isPending: false,
  }),
  useCreateScheduledPost: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useDeleteScheduledPost: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  }),
  TimeSlot: {},
}));

// Mock toast
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    useToast: () => ({ addToast: jest.fn() }),
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('SchedulerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders page header with title', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('Scheduler')).toBeInTheDocument();
    });

    it('renders schedule post button', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByRole('button', { name: /schedule post/i })).toBeInTheDocument();
    });

    it('renders optimal times section', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('Optimal Times')).toBeInTheDocument();
    });

    it('renders upcoming posts section', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText(/Upcoming Posts/i)).toBeInTheDocument();
    });

    it('renders engagement heatmap section', () => {
      renderWithProviders(<SchedulerPage />);
      // Multiple "Engagement Heatmap" texts may exist (section title + component title)
      const heatmapTexts = screen.getAllByText('Engagement Heatmap');
      expect(heatmapTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has accessible schedule post button', () => {
      renderWithProviders(<SchedulerPage />);
      const button = screen.getByRole('button', { name: /schedule post/i });
      expect(button).toBeEnabled();
    });

    it('displays optimal time slots with score badges', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('Mon 10am')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('displays scheduled post content', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('Test scheduled post content')).toBeInTheDocument();
    });

    it('shows platform badges for posts', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('twitter')).toBeInTheDocument();
    });

    it('shows status badges for posts', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('opens modal when schedule post button is clicked', async () => {
      renderWithProviders(<SchedulerPage />);

      const button = screen.getByRole('button', { name: /schedule post/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
      });
    });

    it('shows content textarea in modal', async () => {
      renderWithProviders(<SchedulerPage />);

      fireEvent.click(screen.getByRole('button', { name: /schedule post/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
      });
    });

    it('shows platform selection in modal', async () => {
      renderWithProviders(<SchedulerPage />);

      fireEvent.click(screen.getByRole('button', { name: /schedule post/i }));

      await waitFor(() => {
        expect(screen.getByText('Platform')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /twitter/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /bluesky/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /both/i })).toBeInTheDocument();
      });
    });

    it('closes modal when cancel is clicked', async () => {
      renderWithProviders(<SchedulerPage />);

      fireEvent.click(screen.getByRole('button', { name: /schedule post/i }));

      await waitFor(() => {
        expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Schedule New Post')).not.toBeInTheDocument();
      });
    });

    it('displays delete button for pending posts', () => {
      renderWithProviders(<SchedulerPage />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')
      );
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Data Display', () => {
    it('shows recently published section when there are published posts', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText(/Recently Published/i)).toBeInTheDocument();
    });

    it('displays post metadata with predicted engagement', () => {
      renderWithProviders(<SchedulerPage />);
      expect(screen.getByText(/80% predicted/i)).toBeInTheDocument();
    });

    it('displays data quality indicator for optimal times', () => {
      renderWithProviders(<SchedulerPage />);
      // There may be multiple elements, check at least one exists
      const postsTexts = screen.getAllByText(/Based on 50 posts/i);
      expect(postsTexts.length).toBeGreaterThan(0);
      const confidenceTexts = screen.getAllByText(/high confidence/i);
      expect(confidenceTexts.length).toBeGreaterThan(0);
    });
  });
});
