import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';

// Mock react's use() before importing the component
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    use: (promise: Promise<unknown>) => {
      // For tests, we need to handle the promise synchronously
      // This mock assumes the promise is already resolved with our test data
      if (promise && typeof promise === 'object' && 'then' in promise) {
        // Return the value we set in mockParams
        return { id: (global as unknown as { __testParamsId: string }).__testParamsId || '1' };
      }
      return promise;
    },
  };
});

import CleanupPreviewPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => '/dashboard/cleanup/1',
}));

// Mock api
const mockGetCleanupRules = jest.fn();
const mockPreviewCleanupRule = jest.fn();
const mockExecuteCleanupRule = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    getCleanupRules: () => mockGetCleanupRules(),
    previewCleanupRule: (id: number) => mockPreviewCleanupRule(id),
    executeCleanupRule: (id: number, reason: string) => mockExecuteCleanupRule(id, reason),
  },
}));

// Mock RealtimeProvider hooks
jest.mock('@/providers/RealtimeProvider', () => ({
  useRealtimeMessage: jest.fn(),
}));

// Mock useToast
const mockAddToast = jest.fn();
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    useToast: () => ({ addToast: mockAddToast }),
  };
});

const mockRule = {
  id: 1,
  name: 'Delete old tweets',
  rule_type: 'age' as const,
  config: { max_age_days: 90 },
};

const mockPreviewTweets = [
  {
    id: 'tweet1',
    text: 'This is an old tweet that will be deleted',
    created_at: 1609459200, // 2021-01-01
    likes: 5,
    retweets: 2,
    replies: 1,
  },
  {
    id: 'tweet2',
    text: 'Another old tweet matching the cleanup rule',
    created_at: 1612137600, // 2021-02-01
    likes: 3,
    retweets: 0,
    replies: 0,
  },
  {
    id: 'tweet3',
    text: 'A third tweet that matches criteria',
    created_at: 1614556800, // 2021-03-01
    likes: 10,
    retweets: 5,
    replies: 3,
  },
];

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

// Create a promise-wrapped params object for Next.js 15 compatibility
const createParams = (id: string) => {
  (global as unknown as { __testParamsId: string }).__testParamsId = id;
  return Promise.resolve({ id });
};

describe('CleanupPreviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCleanupRules.mockResolvedValue({
      success: true,
      data: [mockRule],
    });
    mockPreviewCleanupRule.mockResolvedValue({
      success: true,
      data: { tweets: mockPreviewTweets },
    });
    mockExecuteCleanupRule.mockResolvedValue({
      success: true,
      data: { tweets_deleted: 3 },
    });
  });

  it('renders back button', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Back to rules')).toBeInTheDocument();
    });
  });

  it('renders rule name as title', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Delete old tweets')).toBeInTheDocument();
    });
  });

  it('renders preview description', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Preview tweets that match this rule before deleting')).toBeInTheDocument();
    });
  });

  it('displays stats cards', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Matching Tweets')).toBeInTheDocument();
      expect(screen.getByText('Selected')).toBeInTheDocument();
      expect(screen.getByText('Rule Criteria')).toBeInTheDocument();
    });
  });

  it('displays matching tweet count', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      // The count appears in the stats card and button
      const threes = screen.getAllByText('3');
      expect(threes.length).toBeGreaterThan(0);
    });
  });

  it('displays rule criteria for age-based rule', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('90 days')).toBeInTheDocument();
    });
  });

  it('displays preview results section', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Preview Results')).toBeInTheDocument();
    });
  });

  it('displays tweets in table', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText(/This is an old tweet/)).toBeInTheDocument();
      expect(screen.getByText(/Another old tweet/)).toBeInTheDocument();
    });
  });

  it('displays tweet engagement metrics', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      // Check that engagement column header is present
      expect(screen.getByText('Engagement')).toBeInTheDocument();
    });

    // Check that some engagement numbers are displayed (they appear multiple times)
    await waitFor(() => {
      const fives = screen.getAllByText('5');
      expect(fives.length).toBeGreaterThan(0);
    });
  });

  it('navigates back on back button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Back to rules')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Back to rules'));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/cleanup');
  });

  it('shows delete button with tweet count', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete 3 tweets/i })).toBeInTheDocument();
    });
  });

  it('opens confirmation modal on delete click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete 3 tweets/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /delete 3 tweets/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete Tweets Permanently')).toBeInTheDocument();
    });
  });

  it('shows confirmation message in modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete 3 tweets/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /delete 3 tweets/i }));

    await waitFor(() => {
      expect(screen.getByText(/permanently delete 3 tweets/i)).toBeInTheDocument();
    });
  });

  it('allows selecting tweets', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText(/This is an old tweet/)).toBeInTheDocument();
    });

    // Find checkbox in the table
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 0) {
      await user.click(checkboxes[1]); // First row checkbox (index 0 is header)

      await waitFor(() => {
        expect(screen.getByText(/1 tweet selected/i)).toBeInTheDocument();
      });
    }
  });

  it('shows loading state for preview', () => {
    mockPreviewCleanupRule.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('shows empty state when no tweets match', async () => {
    mockPreviewCleanupRule.mockResolvedValue({
      success: true,
      data: { tweets: [] },
    });

    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('No tweets match this rule')).toBeInTheDocument();
    });
  });

  it('disables delete button when no tweets', async () => {
    mockPreviewCleanupRule.mockResolvedValue({
      success: true,
      data: { tweets: [] },
    });

    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete 0 tweets/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  it('displays engagement-based rule criteria', async () => {
    const engagementRule = {
      id: 1,
      name: 'Low engagement cleanup',
      rule_type: 'engagement' as const,
      config: { min_likes: 5 },
    };
    mockGetCleanupRules.mockResolvedValue({
      success: true,
      data: [engagementRule],
    });

    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('< 5 likes')).toBeInTheDocument();
    });
  });

  it('displays pattern-based rule criteria', async () => {
    const patternRule = {
      id: 1,
      name: 'Pattern cleanup',
      rule_type: 'pattern' as const,
      config: { pattern: 'test' },
    };
    mockGetCleanupRules.mockResolvedValue({
      success: true,
      data: [patternRule],
    });

    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Pattern')).toBeInTheDocument();
    });
  });

  it('has accessible table structure', async () => {
    renderWithProviders(<CleanupPreviewPage params={createParams('1')} />);

    await waitFor(() => {
      expect(screen.getByText('Tweet')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Engagement')).toBeInTheDocument();
    });
  });
});
