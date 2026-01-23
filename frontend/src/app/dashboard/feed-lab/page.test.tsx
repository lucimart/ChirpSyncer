/**
 * Feed Lab Page Tests
 * Tests for the feed customization and algorithm tuning page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import FeedLabPage from './page';

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
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard/feed-lab',
}));

// Mock feed rules
const mockFeedRules = [
  {
    id: 'rule-1',
    name: 'Boost Original Content',
    type: 'boost' as const,
    weight: 75,
    enabled: true,
    conditions: [
      { field: 'isRetweet', operator: 'equals', value: false },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Filter Spam',
    type: 'filter' as const,
    weight: 100,
    enabled: false,
    conditions: [
      { field: 'content', operator: 'contains', value: 'spam' },
    ],
    created_at: new Date().toISOString(),
  },
];

jest.mock('@/lib/feed-rules', () => ({
  useFeedRules: () => ({ data: mockFeedRules, isLoading: false }),
  useCreateFeedRule: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useUpdateFeedRule: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useDeleteFeedRule: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useToggleFeedRule: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useReorderFeedRules: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  FeedRule: {},
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    previewFeed: jest.fn().mockResolvedValue({
      success: true,
      data: {
        posts: [
          {
            id: 'preview-1',
            content: 'Preview post content',
            author: 'testuser',
            timestamp: new Date().toISOString(),
            score: 85,
            applied_rules: [
              { rule_id: 'rule-1', rule_name: 'Boost Original', contribution: 20 },
            ],
          },
        ],
      },
    }),
  },
}));

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

describe('FeedLabPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders page header with title', () => {
      renderWithProviders(<FeedLabPage />);
      expect(screen.getByText('Feed Lab')).toBeInTheDocument();
    });

    it('renders page description', () => {
      renderWithProviders(<FeedLabPage />);
      expect(
        screen.getByText(/Customize your algorithm and preview how rules shape your feed/i)
      ).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      renderWithProviders(<FeedLabPage />);
      expect(screen.getByText('My Rules')).toBeInTheDocument();
      expect(screen.getByText('Create Rule')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Recipes')).toBeInTheDocument();
    });

    it('shows rules count badge on My Rules tab', () => {
      renderWithProviders(<FeedLabPage />);
      // The badge should show the number of rules
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible tab buttons', () => {
      renderWithProviders(<FeedLabPage />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(4);
    });

    it('displays rule names in the list', () => {
      renderWithProviders(<FeedLabPage />);
      expect(screen.getByText('Boost Original Content')).toBeInTheDocument();
      expect(screen.getByText('Filter Spam')).toBeInTheDocument();
    });

    it('shows rule type badges', () => {
      renderWithProviders(<FeedLabPage />);
      // Rule types may be capitalized or in badges - use getAllByText for potential duplicates
      expect(screen.getAllByText(/boost/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/filter/i).length).toBeGreaterThan(0);
    });
  });

  describe('Tab Navigation', () => {
    it('shows rules list on My Rules tab by default', () => {
      renderWithProviders(<FeedLabPage />);
      expect(screen.getByText('Your Rules')).toBeInTheDocument();
    });

    it('switches to Create Rule tab when clicked', async () => {
      renderWithProviders(<FeedLabPage />);

      const createTab = screen.getByText('Create Rule');
      fireEvent.click(createTab);

      await waitFor(() => {
        expect(screen.getByText('Create New Rule')).toBeInTheDocument();
      });
    });

    it('switches to Preview tab when clicked', async () => {
      renderWithProviders(<FeedLabPage />);

      const previewTab = screen.getByText('Preview');
      fireEvent.click(previewTab);

      await waitFor(() => {
        expect(screen.getByText('Feed Preview')).toBeInTheDocument();
      });
    });

    it('switches to Recipes tab when clicked', async () => {
      renderWithProviders(<FeedLabPage />);

      const recipesTab = screen.getByText('Recipes');
      fireEvent.click(recipesTab);

      await waitFor(() => {
        expect(screen.getByText('Recipe Templates')).toBeInTheDocument();
      });
    });
  });

  describe('Rules Tab', () => {
    it('displays helper text for rules section', () => {
      renderWithProviders(<FeedLabPage />);
      expect(screen.getByText(/Create, tune, and toggle your feed rules/i)).toBeInTheDocument();
    });

    it('shows rule weight values', () => {
      renderWithProviders(<FeedLabPage />);
      // Weight may be formatted as "75%" or "+75"
      expect(screen.getByText(/75/)).toBeInTheDocument();
    });
  });

  describe('Recipes Tab', () => {
    it('displays pre-built recipe templates', async () => {
      renderWithProviders(<FeedLabPage />);

      fireEvent.click(screen.getByText('Recipes'));

      await waitFor(() => {
        expect(screen.getByText('Pre-built rule templates to quickly customize your feed.')).toBeInTheDocument();
      });
    });
  });

  describe('Create Rule Tab', () => {
    it('shows rule builder form', async () => {
      renderWithProviders(<FeedLabPage />);

      fireEvent.click(screen.getByText('Create Rule'));

      await waitFor(() => {
        expect(screen.getByText('Define conditions and weights to shape your feed.')).toBeInTheDocument();
      });
    });
  });
});

describe('FeedLabPage Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Override mock for empty state
    jest.doMock('@/lib/feed-rules', () => ({
      useFeedRules: () => ({ data: [], isLoading: false }),
      useCreateFeedRule: () => ({ mutate: jest.fn(), isPending: false }),
      useUpdateFeedRule: () => ({ mutate: jest.fn(), isPending: false }),
      useDeleteFeedRule: () => ({ mutate: jest.fn(), isPending: false }),
      useToggleFeedRule: () => ({ mutate: jest.fn(), isPending: false }),
      useReorderFeedRules: () => ({ mutate: jest.fn(), isPending: false }),
      FeedRule: {},
    }));
  });

  it('renders page even with empty rules', () => {
    renderWithProviders(<FeedLabPage />);
    expect(screen.getByText('Feed Lab')).toBeInTheDocument();
  });
});
