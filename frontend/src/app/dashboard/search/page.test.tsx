import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import SearchPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/search',
}));

// Mock api
const mockSearchPosts = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    searchPosts: (...args: unknown[]) => mockSearchPosts(...args),
  },
  SearchResultItem: {},
}));

const mockSearchResults = [
  {
    id: '1',
    content: 'This is a test tweet about React',
    platform: 'twitter',
    created_at: '2024-01-15T10:00:00Z',
    author: 'testuser',
    hashtags: ['react', 'javascript'],
  },
  {
    id: '2',
    content: 'Bluesky post about TypeScript',
    platform: 'bluesky',
    created_at: '2024-01-16T12:00:00Z',
    author: 'devuser',
    hashtags: ['typescript'],
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

describe('SearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchPosts.mockResolvedValue({
      success: true,
      data: { results: mockSearchResults },
    });
  });

  it('renders search page with header', () => {
    renderWithProviders(<SearchPage />);

    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(
      screen.getByText('Search through your synced posts across all platforms')
    ).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<SearchPage />);

    expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
  });

  it('shows empty state when no search query', () => {
    renderWithProviders(<SearchPage />);

    expect(screen.getByText('Search your synced posts')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Enter a search term to find posts across your synced accounts'
      )
    ).toBeInTheDocument();
  });

  it('shows filters button', () => {
    renderWithProviders(<SearchPage />);

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('toggles filters panel visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    await user.click(filtersButton);

    expect(screen.getByLabelText('Has media')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum likes')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum retweets')).toBeInTheDocument();
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toBeInTheDocument();
    expect(screen.getByLabelText('Platform')).toBeInTheDocument();
  });

  it('searches and calls API with query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search posts...');
    await user.type(searchInput, 'React');

    await waitFor(
      () => {
        expect(mockSearchPosts).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'React' })
        );
      },
      { timeout: 3000 }
    );
  });

  it('displays platform badges on results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search posts...'), 'test');

    await waitFor(() => {
      expect(screen.getByText('twitter')).toBeInTheDocument();
      expect(screen.getByText('bluesky')).toBeInTheDocument();
    });
  });

  it('shows results count after search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search posts...'), 'test');

    await waitFor(() => {
      expect(screen.getByText(/2 results for "test"/)).toBeInTheDocument();
    });
  });

  it('allows selecting results for export', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search posts...'), 'test');

    // Wait for results to load
    await waitFor(
      () => {
        expect(screen.getByText('twitter')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Find checkboxes in results (excluding filter checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    const resultCheckbox = checkboxes.find(
      (cb) => !cb.closest('[class*="Filter"]')
    );
    if (resultCheckbox) {
      await user.click(resultCheckbox);
      await waitFor(() => {
        expect(screen.getByText(/Export 1 selected/)).toBeInTheDocument();
      });
    }
  });

  it('shows no results message when search returns empty', async () => {
    const user = userEvent.setup();
    mockSearchPosts.mockResolvedValue({
      success: true,
      data: { results: [] },
    });

    renderWithProviders(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search posts...'), 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No results found for "nonexistent"/)).toBeInTheDocument();
    });
  });

  it('filters by platform when selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }));

    // Select platform
    const platformSelect = screen.getByLabelText('Platform');
    await user.selectOptions(platformSelect, 'twitter');

    // Type search
    await user.type(screen.getByPlaceholderText('Search posts...'), 'test');

    await waitFor(() => {
      expect(mockSearchPosts).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'twitter' })
      );
    });
  });

  it('has accessible search input', () => {
    renderWithProviders(<SearchPage />);

    const searchInput = screen.getByPlaceholderText('Search posts...');
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('highlights search term in results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);

    await user.type(screen.getByPlaceholderText('Search posts...'), 'React');

    await waitFor(() => {
      const mark = screen.getByText('React', { selector: 'mark' });
      expect(mark).toBeInTheDocument();
    });
  });
});
