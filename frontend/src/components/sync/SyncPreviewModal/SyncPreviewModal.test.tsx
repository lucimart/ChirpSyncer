import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import { SyncPreviewModal } from './SyncPreviewModal';
import * as useSyncPreviewModule from '@/hooks/useSyncPreview';
import type { SyncPreviewItemData } from '@/lib/api';

// Mock the useSyncPreview hook
jest.mock('@/hooks/useSyncPreview');

const mockUseSyncPreview = useSyncPreviewModule.useSyncPreview as jest.MockedFunction<
  typeof useSyncPreviewModule.useSyncPreview
>;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

const createItems = (count: number, selectedIndices: number[] = []): SyncPreviewItemData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    content: `Test post ${i + 1}`,
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: new Date().toISOString(),
    selected: selectedIndices.includes(i),
    hasMedia: false,
  }));

const mockHookReturn = (overrides = {}) => ({
  items: createItems(3, [0, 1]),
  isLoading: false,
  isError: false,
  isSuccess: true,
  error: null,
  refetch: jest.fn().mockResolvedValue({}),
  toggleItem: jest.fn(),
  selectAll: jest.fn(),
  deselectAll: jest.fn(),
  selectedItems: createItems(2, [0, 1]).filter((_, i) => i < 2),
  selectedCount: 2,
  totalCount: 3,
  estimatedTime: 30,
  ...overrides,
});

describe('SyncPreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSyncPreview.mockReturnValue(mockHookReturn());
  });

  it('renders modal when open', () => {
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sync Preview')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<SyncPreviewModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSyncPreview.mockReturnValue(mockHookReturn({ isLoading: true }));
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.getByTestId('sync-preview-loading')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByText('Loading preview...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        isError: true,
        error: { message: 'Failed to fetch' },
      })
    );
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('calls refetch on retry button click', async () => {
    const refetch = jest.fn();
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        isError: true,
        error: { message: 'Error' },
        refetch,
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders sync preview list when loaded', () => {
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);
    expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();
  });

  it('displays selected count in footer', () => {
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);
    expect(screen.getByText('2 of 3 items selected')).toBeInTheDocument();
  });

  it('displays all items selected message when all are selected', () => {
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        selectedCount: 3,
        totalCount: 3,
      })
    );
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);
    expect(screen.getByText('3 items will be synced')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSync with selected items when Sync Now is clicked', async () => {
    const selectedItems = createItems(2, [0, 1]);
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        selectedItems,
        selectedCount: 2,
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Sync Now' }));
    expect(defaultProps.onSync).toHaveBeenCalledWith(selectedItems);
  });

  it('disables Sync Now button when no items selected', () => {
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        selectedItems: [],
        selectedCount: 0,
      })
    );
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
  });

  it('disables Sync Now button when loading', () => {
    mockUseSyncPreview.mockReturnValue(mockHookReturn({ isLoading: true }));
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
  });

  it('disables Sync Now button when error', () => {
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        isError: true,
        error: { message: 'Error' },
      })
    );
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeDisabled();
  });

  it('does not show item count when loading', () => {
    mockUseSyncPreview.mockReturnValue(mockHookReturn({ isLoading: true }));
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.queryByText(/items selected/)).not.toBeInTheDocument();
    expect(screen.queryByText(/items will be synced/)).not.toBeInTheDocument();
  });

  it('does not show item count when error', () => {
    mockUseSyncPreview.mockReturnValue(
      mockHookReturn({
        isError: true,
        error: { message: 'Error' },
      })
    );
    renderWithProviders(<SyncPreviewModal {...defaultProps} />);

    expect(screen.queryByText(/items selected/)).not.toBeInTheDocument();
    expect(screen.queryByText(/items will be synced/)).not.toBeInTheDocument();
  });
});
