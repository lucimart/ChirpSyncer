import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import BookmarksPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/bookmarks',
}));

// Mock api
const mockGetCollections = jest.fn();
const mockGetBookmarks = jest.fn();
const mockCreateCollection = jest.fn();
const mockDeleteBookmark = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    getCollections: () => mockGetCollections(),
    getBookmarks: (collectionId?: number) => mockGetBookmarks(collectionId),
    createCollection: (data: { name: string; description: string | null }) =>
      mockCreateCollection(data),
    deleteBookmark: (id: number) => mockDeleteBookmark(id),
  },
}));

const mockCollections = [
  { id: 1, name: 'Read Later' },
  { id: 2, name: 'Favorites' },
];

const mockBookmarks = [
  {
    id: 1,
    tweet_id: 'tweet123',
    collection_id: 1,
    notes: 'Great article about React hooks',
    saved_at: 1705312800,
  },
  {
    id: 2,
    tweet_id: 'tweet456',
    collection_id: null,
    notes: 'TypeScript tips and tricks',
    saved_at: 1705399200,
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

describe('BookmarksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollections.mockResolvedValue({
      success: true,
      data: mockCollections,
    });
    mockGetBookmarks.mockResolvedValue({
      success: true,
      data: mockBookmarks,
    });
    mockCreateCollection.mockResolvedValue({ success: true });
    mockDeleteBookmark.mockResolvedValue({ success: true });
  });

  it('renders bookmarks page with header', () => {
    renderWithProviders(<BookmarksPage />);

    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(
      screen.getByText('Save and organize your favorite posts across platforms')
    ).toBeInTheDocument();
  });

  it('renders new collection button', () => {
    renderWithProviders(<BookmarksPage />);

    expect(
      screen.getByRole('button', { name: /new collection/i })
    ).toBeInTheDocument();
  });

  it('displays collections in sidebar', async () => {
    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('All Bookmarks')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Read Later')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });

  it('displays bookmarks list', async () => {
    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Great article about React hooks')).toBeInTheDocument();
      expect(screen.getByText('TypeScript tips and tricks')).toBeInTheDocument();
    });
  });

  it('opens create collection modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));

    expect(screen.getByText('Create Collection')).toBeInTheDocument();
    expect(screen.getByLabelText('Collection Name')).toBeInTheDocument();
  });

  it('creates a new collection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));
    await user.type(screen.getByLabelText('Collection Name'), 'My New Collection');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateCollection).toHaveBeenCalledWith({
        name: 'My New Collection',
        description: null,
      });
    });
  });

  it('shows color picker in create collection modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));

    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('switches between collections', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Read Later')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Read Later'));

    await waitFor(() => {
      expect(mockGetBookmarks).toHaveBeenCalledWith(1);
    });
  });

  it('shows empty state when no bookmarks', async () => {
    mockGetBookmarks.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
      expect(
        screen.getByText('Save your favorite posts to see them here.')
      ).toBeInTheDocument();
    });
  });

  it('can delete a bookmark', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Great article about React hooks')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete bookmark');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteBookmark).toHaveBeenCalledWith(1);
    });
  });

  it('displays bookmark content', async () => {
    renderWithProviders(<BookmarksPage />);

    await waitFor(() => {
      expect(screen.getByText('Great article about React hooks')).toBeInTheDocument();
    });
  });

  it('has accessible modal elements', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));

    const input = screen.getByLabelText('Collection Name');
    expect(input).toHaveAttribute('required');
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookmarksPage />);

    await user.click(screen.getByRole('button', { name: /new collection/i }));
    expect(screen.getByText('Create Collection')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Create Collection')).not.toBeInTheDocument();
    });
  });
});
