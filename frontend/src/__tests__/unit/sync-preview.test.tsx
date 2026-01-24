/**
 * Sync Preview Feature Tests (TDD)
 *
 * Tests for SyncPreviewModal, SyncPreviewItem, SyncPreviewList components
 * and useSyncPreview hook.
 *
 * Based on UI_UX_INNOVATIONS_IMPLEMENTATION.md spec (P1 - Sync Preview)
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Component imports (to be implemented)
import { SyncPreviewModal } from '@/components/sync/SyncPreviewModal';
import { SyncPreviewItem } from '@/components/sync/SyncPreviewItem';
import { SyncPreviewList } from '@/components/sync/SyncPreviewList';
import { useSyncPreview } from '@/hooks/useSyncPreview';
import { api } from '@/lib/api';

// Types for Sync Preview feature
export interface SyncPreviewItemData {
  id: string;
  content: string;
  sourcePlatform: 'twitter' | 'bluesky';
  targetPlatform: 'twitter' | 'bluesky';
  timestamp: string;
  hasMedia: boolean;
  mediaCount?: number;
  selected: boolean;
}

export interface SyncPreviewData {
  items: SyncPreviewItemData[];
  totalCount: number;
  estimatedTime: number;
}

// Mock the API module
jest.mock('@/lib/api', () => ({
  api: {
    getSyncPreview: jest.fn(),
    executeSyncWithItems: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Theme wrapper for component tests
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

// Full wrapper with QueryClient and Theme for hooks
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

// Render with all providers (QueryClient + Theme) for components that use hooks
const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mockPreviewItems: SyncPreviewItemData[] = [
  {
    id: '1',
    content: 'This is a test tweet that will be synced to Bluesky. It contains some interesting content about testing.',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: '2026-01-22T10:30:00Z',
    hasMedia: false,
    selected: true,
  },
  {
    id: '2',
    content: 'Another post with media attachment showing a beautiful sunset photo.',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: '2026-01-22T09:15:00Z',
    hasMedia: true,
    mediaCount: 2,
    selected: true,
  },
  {
    id: '3',
    content: 'A Bluesky post that will be synced back to Twitter with some hashtags #testing #sync',
    sourcePlatform: 'bluesky',
    targetPlatform: 'twitter',
    timestamp: '2026-01-22T08:00:00Z',
    hasMedia: false,
    selected: true,
  },
  {
    id: '4',
    content: 'Short post',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: '2026-01-21T22:00:00Z',
    hasMedia: true,
    mediaCount: 1,
    selected: false,
  },
  {
    id: '5',
    content: 'This is a very long post that exceeds one hundred characters and should be truncated when displayed in the preview item component to maintain UI consistency.',
    sourcePlatform: 'bluesky',
    targetPlatform: 'twitter',
    timestamp: '2026-01-21T20:00:00Z',
    hasMedia: false,
    selected: true,
  },
];

// ============================================================================
// SyncPreviewModal Component Tests
// ============================================================================

describe('SyncPreviewModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getSyncPreview.mockResolvedValue({
      success: true,
      data: { items: mockPreviewItems, totalCount: 5, estimatedTime: 30 },
    });
  });

  describe('Rendering', () => {
    it('renders modal with title "Sync Preview"', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Sync Preview')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Sync Preview')).not.toBeInTheDocument();
    });

    it('renders modal dialog', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state while fetching preview', async () => {
      // Delay the API response
      mockApi.getSyncPreview.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          data: { items: mockPreviewItems, totalCount: 5, estimatedTime: 30 },
        }), 100))
      );

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      expect(screen.getByTestId('sync-preview-loading')).toBeInTheDocument();
      // Multiple elements may contain "loading" text, verify at least one exists
      expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);

      await waitFor(() => {
        expect(screen.queryByTestId('sync-preview-loading')).not.toBeInTheDocument();
      });
    });

    it('shows spinner during loading', async () => {
      mockApi.getSyncPreview.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          data: { items: mockPreviewItems, totalCount: 5, estimatedTime: 30 },
        }), 100))
      );

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Item Display', () => {
    it('displays list of items to sync', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();
      });

      // Check that items are rendered
      mockPreviewItems.forEach((item) => {
        expect(screen.getByTestId(`sync-preview-item-${item.id}`)).toBeInTheDocument();
      });
    });

    it('shows item count (e.g., "5 items will be synced")', async () => {
      // Override mock to have ALL items selected
      const allSelectedItems = mockPreviewItems.map((item) => ({ ...item, selected: true }));
      mockApi.getSyncPreview.mockResolvedValue({
        success: true,
        data: { items: allSelectedItems, totalCount: 5, estimatedTime: 30 },
      });

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/5 items will be synced/i)).toBeInTheDocument();
      });
    });

    it('shows selected item count when not all are selected', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        // 4 selected out of 5 (item 4 is not selected)
        expect(screen.getByText(/4 of 5 items selected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('has "Sync Now" button', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
      });
    });

    it('has "Cancel" button', async () => {
      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('calls onSync with selected items when "Sync Now" is clicked', async () => {
      const onSync = jest.fn();
      renderWithProviders(<SyncPreviewModal {...defaultProps} onSync={onSync} />);

      // Wait for items to load
      await waitFor(() => {
        expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();
      });

      // Wait another tick for useEffect to initialize localItems
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

      await waitFor(() => {
        expect(onSync).toHaveBeenCalledTimes(1);
        // Should only include selected items
        expect(onSync).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: '1', selected: true }),
            expect.objectContaining({ id: '2', selected: true }),
            expect.objectContaining({ id: '3', selected: true }),
            expect.objectContaining({ id: '5', selected: true }),
          ])
        );
      });
    });

    it('calls onClose when "Cancel" is clicked', async () => {
      const onClose = jest.fn();
      renderWithProviders(<SyncPreviewModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking backdrop/overlay', async () => {
      const onClose = jest.fn();
      renderWithProviders(<SyncPreviewModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click outside the modal (on the overlay area)
      // The overlay is the parent that receives the click
      const dialog = screen.getByRole('dialog');
      const overlay = dialog.parentElement;
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing Escape key', async () => {
      const onClose = jest.fn();
      renderWithProviders(<SyncPreviewModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('disables "Sync Now" button when no items are selected', async () => {
      const noSelectedItems = mockPreviewItems.map((item) => ({ ...item, selected: false }));
      mockApi.getSyncPreview.mockResolvedValue({
        success: true,
        data: { items: noSelectedItems, totalCount: 5, estimatedTime: 0 },
      });

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message when API fails', async () => {
      mockApi.getSyncPreview.mockResolvedValue({
        success: false,
        error: 'Failed to fetch sync preview',
      });

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch sync preview/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockApi.getSyncPreview.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      renderWithProviders(<SyncPreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// SyncPreviewItem Component Tests
// ============================================================================

describe('SyncPreviewItem Component', () => {
  const defaultItem: SyncPreviewItemData = {
    id: '1',
    content: 'This is a test post content for the sync preview item component.',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: '2026-01-22T10:30:00Z',
    hasMedia: false,
    selected: true,
  };

  const defaultProps = {
    item: defaultItem,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Display', () => {
    it('renders post content preview', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByText(/This is a test post content/)).toBeInTheDocument();
    });

    it('truncates content to 100 characters', () => {
      const longContent = 'A'.repeat(150);
      const item = { ...defaultItem, content: longContent };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      const displayedContent = screen.getByTestId('preview-content');
      // Should be truncated to 100 chars + ellipsis
      expect(displayedContent.textContent?.length).toBeLessThanOrEqual(103);
      expect(displayedContent.textContent).toContain('...');
    });

    it('shows full content if less than 100 characters', () => {
      const shortContent = 'Short post';
      const item = { ...defaultItem, content: shortContent };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByText('Short post')).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('renders with data-testid="sync-preview-item-{id}"', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByTestId('sync-preview-item-1')).toBeInTheDocument();
    });
  });

  describe('Platform Icons', () => {
    it('shows source platform icon (Twitter)', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByTestId('source-platform-icon')).toBeInTheDocument();
      expect(screen.getByTestId('source-platform-icon')).toHaveAttribute('data-platform', 'twitter');
    });

    it('shows source platform icon (Bluesky)', () => {
      const item = { ...defaultItem, sourcePlatform: 'bluesky' as const };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByTestId('source-platform-icon')).toHaveAttribute('data-platform', 'bluesky');
    });

    it('shows target platform icon', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByTestId('target-platform-icon')).toBeInTheDocument();
      expect(screen.getByTestId('target-platform-icon')).toHaveAttribute('data-platform', 'bluesky');
    });

    it('shows arrow or direction indicator between source and target', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByTestId('sync-direction-indicator')).toBeInTheDocument();
    });
  });

  describe('Timestamp', () => {
    it('shows timestamp', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByTestId('item-timestamp')).toBeInTheDocument();
    });

    it('formats timestamp in readable format', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      // Should show formatted date/time
      const timestamp = screen.getByTestId('item-timestamp');
      expect(timestamp.textContent).toMatch(/jan|january|22|2026|10:30/i);
    });
  });

  describe('Checkbox for Include/Exclude', () => {
    it('has checkbox for include/exclude', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('checkbox is checked when item is selected', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('checkbox is unchecked when item is not selected', () => {
      const item = { ...defaultItem, selected: false };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('calls onToggle when checkbox is clicked', () => {
      const onToggle = jest.fn();
      renderWithTheme(<SyncPreviewItem {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('checkbox'));

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith('1');
    });
  });

  describe('Media Indicator', () => {
    it('shows media indicator if post has media', () => {
      const item = { ...defaultItem, hasMedia: true, mediaCount: 2 };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByTestId('media-indicator')).toBeInTheDocument();
    });

    it('does not show media indicator if post has no media', () => {
      renderWithTheme(<SyncPreviewItem {...defaultProps} />);

      expect(screen.queryByTestId('media-indicator')).not.toBeInTheDocument();
    });

    it('shows media count when available', () => {
      const item = { ...defaultItem, hasMedia: true, mediaCount: 3 };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows media icon', () => {
      const item = { ...defaultItem, hasMedia: true, mediaCount: 1 };
      renderWithTheme(<SyncPreviewItem {...defaultProps} item={item} />);

      expect(screen.getByTestId('media-icon')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// SyncPreviewList Component Tests
// ============================================================================

describe('SyncPreviewList Component', () => {
  const defaultProps = {
    items: mockPreviewItems,
    onToggleItem: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders list of SyncPreviewItem components', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();

      mockPreviewItems.forEach((item) => {
        expect(screen.getByTestId(`sync-preview-item-${item.id}`)).toBeInTheDocument();
      });
    });

    it('renders correct number of items', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      const items = screen.getAllByTestId(/sync-preview-item-/);
      expect(items).toHaveLength(mockPreviewItems.length);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no items', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} items={[]} />);

      expect(screen.getByTestId('sync-preview-empty')).toBeInTheDocument();
      expect(screen.getByText(/no items to sync/i)).toBeInTheDocument();
    });

    it('shows appropriate message in empty state', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} items={[]} />);

      expect(screen.getByText(/no items available for synchronization/i)).toBeInTheDocument();
    });
  });

  describe('Select All / Deselect All', () => {
    it('has "Select All" button', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      // Use exact name to avoid matching "Deselect All"
      expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    });

    it('has "Deselect All" button', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Deselect All' })).toBeInTheDocument();
    });

    it('calls onSelectAll when "Select All" is clicked', () => {
      const onSelectAll = jest.fn();
      renderWithTheme(<SyncPreviewList {...defaultProps} onSelectAll={onSelectAll} />);

      fireEvent.click(screen.getByRole('button', { name: 'Select All' }));

      expect(onSelectAll).toHaveBeenCalledTimes(1);
    });

    it('calls onDeselectAll when "Deselect All" is clicked', () => {
      const onDeselectAll = jest.fn();
      renderWithTheme(<SyncPreviewList {...defaultProps} onDeselectAll={onDeselectAll} />);

      fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }));

      expect(onDeselectAll).toHaveBeenCalledTimes(1);
    });

    it('disables "Select All" when all items are selected', () => {
      const allSelected = mockPreviewItems.map((item) => ({ ...item, selected: true }));
      renderWithTheme(<SyncPreviewList {...defaultProps} items={allSelected} />);

      expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled();
    });

    it('disables "Deselect All" when no items are selected', () => {
      const noneSelected = mockPreviewItems.map((item) => ({ ...item, selected: false }));
      renderWithTheme(<SyncPreviewList {...defaultProps} items={noneSelected} />);

      expect(screen.getByRole('button', { name: 'Deselect All' })).toBeDisabled();
    });
  });

  describe('Filters', () => {
    it('has platform filter dropdown', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      expect(screen.getByTestId('platform-filter')).toBeInTheDocument();
    });

    it('filters by source platform (Twitter)', async () => {
      const onFilter = jest.fn();
      renderWithTheme(<SyncPreviewList {...defaultProps} onFilter={onFilter} />);

      const platformFilter = screen.getByTestId('platform-filter');
      fireEvent.change(platformFilter, { target: { value: 'twitter' } });

      await waitFor(() => {
        expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ platform: 'twitter' }));
      });
    });

    it('filters by source platform (Bluesky)', async () => {
      const onFilter = jest.fn();
      renderWithTheme(<SyncPreviewList {...defaultProps} onFilter={onFilter} />);

      const platformFilter = screen.getByTestId('platform-filter');
      fireEvent.change(platformFilter, { target: { value: 'bluesky' } });

      await waitFor(() => {
        expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ platform: 'bluesky' }));
      });
    });

    it('has date filter', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      expect(screen.getByTestId('date-filter')).toBeInTheDocument();
    });

    it('filters by date range', async () => {
      const onFilter = jest.fn();
      renderWithTheme(<SyncPreviewList {...defaultProps} onFilter={onFilter} />);

      const dateFilter = screen.getByTestId('date-filter');
      fireEvent.change(dateFilter, { target: { value: '24h' } });

      await waitFor(() => {
        expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ date: '24h' }));
      });
    });

    it('shows "All Platforms" option', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      const platformFilter = screen.getByTestId('platform-filter');
      expect(platformFilter).toContainElement(screen.getByText(/all platforms/i));
    });
  });

  describe('Selected Count', () => {
    it('shows selected count', () => {
      renderWithTheme(<SyncPreviewList {...defaultProps} />);

      // 4 items are selected in mockPreviewItems
      expect(screen.getByTestId('selected-count')).toBeInTheDocument();
      expect(screen.getByText(/4 selected/i)).toBeInTheDocument();
    });

    it('updates selected count when items change', () => {
      const { rerender } = renderWithTheme(<SyncPreviewList {...defaultProps} />);

      expect(screen.getByText(/4 selected/i)).toBeInTheDocument();

      // All selected
      const allSelected = mockPreviewItems.map((item) => ({ ...item, selected: true }));
      rerender(
        <ThemeProvider theme={theme}>
          <SyncPreviewList {...defaultProps} items={allSelected} />
        </ThemeProvider>
      );

      expect(screen.getByText(/5 selected/i)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// useSyncPreview Hook Tests
// ============================================================================

describe('useSyncPreview Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getSyncPreview.mockResolvedValue({
      success: true,
      data: { items: mockPreviewItems, totalCount: 5, estimatedTime: 30 },
    });
  });

  describe('Data Fetching', () => {
    it('fetches preview from API', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.getSyncPreview).toHaveBeenCalledTimes(1);
    });

    it('returns items from API', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.items).toHaveLength(5);
      expect(result.current.items[0]).toMatchObject({
        id: '1',
        sourcePlatform: 'twitter',
        targetPlatform: 'bluesky',
      });
    });
  });

  describe('Loading State', () => {
    it('returns isLoading: true while fetching', async () => {
      mockApi.getSyncPreview.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          success: true,
          data: { items: mockPreviewItems, totalCount: 5, estimatedTime: 30 },
        }), 100))
      );

      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error State', () => {
    it('returns error when API fails', async () => {
      mockApi.getSyncPreview.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('API Error');
    });
  });

  describe('Refetch Function', () => {
    it('has refetch function', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('refetch function calls API again', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      mockApi.getSyncPreview.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockApi.getSyncPreview).toHaveBeenCalledTimes(1);
    });
  });

  describe('Selection Tracking', () => {
    it('tracks selected items', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // 4 items are selected by default in mockPreviewItems
      expect(result.current.selectedItems).toHaveLength(4);
    });

    it('selectedItems returns only selected items', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.selectedItems.forEach((item) => {
        expect(item.selected).toBe(true);
      });
    });
  });

  describe('toggleItem Function', () => {
    it('has toggleItem function', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.toggleItem).toBe('function');
    });

    it('toggleItem deselects a selected item', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Item 1 is selected, toggle it
      act(() => {
        result.current.toggleItem('1');
      });

      const item1 = result.current.items.find((item) => item.id === '1');
      expect(item1?.selected).toBe(false);
    });

    it('toggleItem selects a deselected item', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Item 4 is not selected, toggle it
      act(() => {
        result.current.toggleItem('4');
      });

      const item4 = result.current.items.find((item) => item.id === '4');
      expect(item4?.selected).toBe(true);
    });
  });

  describe('selectAll Function', () => {
    it('has selectAll function', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.selectAll).toBe('function');
    });

    it('selectAll selects all items', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.selectAll();
      });

      result.current.items.forEach((item) => {
        expect(item.selected).toBe(true);
      });
    });
  });

  describe('deselectAll Function', () => {
    it('has deselectAll function', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.deselectAll).toBe('function');
    });

    it('deselectAll deselects all items', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      act(() => {
        result.current.deselectAll();
      });

      result.current.items.forEach((item) => {
        expect(item.selected).toBe(false);
      });

      expect(result.current.selectedItems).toHaveLength(0);
    });
  });

  describe('Computed Properties', () => {
    it('returns totalCount', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.totalCount).toBe(5);
    });

    it('returns selectedCount', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.selectedCount).toBe(4);
    });

    it('returns estimatedTime', async () => {
      const { result } = renderHook(() => useSyncPreview(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.estimatedTime).toBe(30);
    });
  });
});
