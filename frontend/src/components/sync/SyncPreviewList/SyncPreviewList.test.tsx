import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { SyncPreviewList } from './SyncPreviewList';
import type { SyncPreviewItemData } from '@/lib/api';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createItems = (count: number): SyncPreviewItemData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    content: `Test post content ${i + 1}`,
    sourcePlatform: i % 2 === 0 ? 'twitter' : 'bluesky',
    targetPlatform: i % 2 === 0 ? 'bluesky' : 'twitter',
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    selected: false,
    hasMedia: i % 3 === 0,
  }));

describe('SyncPreviewList', () => {
  const defaultProps = {
    items: createItems(5),
    onToggleItem: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onFilter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list container', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);
    expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();
  });

  it('renders all items', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    expect(screen.getByTestId('sync-preview-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-4')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-5')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} items={[]} />);
    expect(screen.getByTestId('sync-preview-empty')).toBeInTheDocument();
    expect(screen.getByText('No items to sync')).toBeInTheDocument();
  });

  it('renders platform filter', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);
    expect(screen.getByTestId('platform-filter')).toBeInTheDocument();
  });

  it('renders date filter', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);
    expect(screen.getByTestId('date-filter')).toBeInTheDocument();
  });

  it('displays selected count', () => {
    const itemsWithSelection = defaultProps.items.map((item, i) => ({
      ...item,
      selected: i < 2,
    }));
    renderWithTheme(<SyncPreviewList {...defaultProps} items={itemsWithSelection} />);
    expect(screen.getByTestId('selected-count')).toHaveTextContent('2 selected');
  });

  it('calls onSelectAll when Select All button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Select All' }));
    expect(defaultProps.onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('calls onDeselectAll when Deselect All button is clicked', async () => {
    const user = userEvent.setup();
    const itemsWithSelection = defaultProps.items.map((item) => ({
      ...item,
      selected: true,
    }));
    renderWithTheme(<SyncPreviewList {...defaultProps} items={itemsWithSelection} />);

    await user.click(screen.getByRole('button', { name: 'Deselect All' }));
    expect(defaultProps.onDeselectAll).toHaveBeenCalledTimes(1);
  });

  it('disables Select All when all items are selected', () => {
    const allSelected = defaultProps.items.map((item) => ({
      ...item,
      selected: true,
    }));
    renderWithTheme(<SyncPreviewList {...defaultProps} items={allSelected} />);

    expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled();
  });

  it('disables Deselect All when no items are selected', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Deselect All' })).toBeDisabled();
  });

  it('calls onToggleItem when item is toggled', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(defaultProps.onToggleItem).toHaveBeenCalledWith('1');
  });

  it('calls onFilter when platform filter changes', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    const platformFilter = screen.getByTestId('platform-filter');
    await user.selectOptions(platformFilter, 'twitter');

    expect(defaultProps.onFilter).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'twitter' })
    );
  });

  it('calls onFilter when date filter changes', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    const dateFilter = screen.getByTestId('date-filter');
    await user.selectOptions(dateFilter, '24h');

    expect(defaultProps.onFilter).toHaveBeenCalledWith(
      expect.objectContaining({ date: '24h' })
    );
  });

  it('filters items by platform', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    const platformFilter = screen.getByTestId('platform-filter');
    await user.selectOptions(platformFilter, 'twitter');

    // Items with sourcePlatform 'twitter' should be visible
    expect(screen.getByTestId('sync-preview-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('sync-preview-item-5')).toBeInTheDocument();

    // Items with sourcePlatform 'bluesky' should not be visible (wait for animation exit)
    await waitFor(() => {
      expect(screen.queryByTestId('sync-preview-item-2')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('sync-preview-item-4')).not.toBeInTheDocument();
    });
  });

  it('has accessible aria-labels on filters', () => {
    renderWithTheme(<SyncPreviewList {...defaultProps} />);

    expect(screen.getByLabelText('Filter by platform')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by date')).toBeInTheDocument();
  });

  it('works without onFilter callback', async () => {
    const user = userEvent.setup();
    const propsWithoutFilter = {
      ...defaultProps,
      onFilter: undefined,
    };
    renderWithTheme(<SyncPreviewList {...propsWithoutFilter} />);

    const platformFilter = screen.getByTestId('platform-filter');
    await user.selectOptions(platformFilter, 'twitter');

    // Should not throw error
    expect(screen.getByTestId('sync-preview-list')).toBeInTheDocument();
  });
});
