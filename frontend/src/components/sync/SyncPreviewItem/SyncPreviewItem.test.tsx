import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { SyncPreviewItem } from './SyncPreviewItem';
import type { SyncPreviewItemData } from '@/lib/api';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createItem = (overrides: Partial<SyncPreviewItemData> = {}): SyncPreviewItemData => ({
  id: 'test-1',
  content: 'This is a test post content for sync preview',
  sourcePlatform: 'twitter',
  targetPlatform: 'bluesky',
  timestamp: new Date().toISOString(),
  selected: false,
  hasMedia: false,
  ...overrides,
});

describe('SyncPreviewItem', () => {
  const defaultProps = {
    item: createItem(),
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the item content', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByTestId('preview-content')).toHaveTextContent(
      'This is a test post content for sync preview'
    );
  });

  it('renders with correct data-testid', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByTestId('sync-preview-item-test-1')).toBeInTheDocument();
  });

  it('renders checkbox with correct checked state when not selected', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checkbox with correct checked state when selected', () => {
    const selectedItem = createItem({ selected: true });
    renderWithTheme(<SyncPreviewItem {...defaultProps} item={selectedItem} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onToggle when checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);

    await user.click(screen.getByRole('checkbox'));
    expect(defaultProps.onToggle).toHaveBeenCalledWith('test-1');
  });

  it('displays source platform icon', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    const sourceIcon = screen.getByTestId('source-platform-icon');
    expect(sourceIcon).toBeInTheDocument();
    expect(sourceIcon).toHaveAttribute('data-platform', 'twitter');
  });

  it('displays target platform icon', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    const targetIcon = screen.getByTestId('target-platform-icon');
    expect(targetIcon).toBeInTheDocument();
    expect(targetIcon).toHaveAttribute('data-platform', 'bluesky');
  });

  it('displays sync direction indicator', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByTestId('sync-direction-indicator')).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByTestId('item-timestamp')).toBeInTheDocument();
  });

  it('shows media indicator when item has media', () => {
    const itemWithMedia = createItem({ hasMedia: true, mediaCount: 3 });
    renderWithTheme(<SyncPreviewItem {...defaultProps} item={itemWithMedia} />);

    expect(screen.getByTestId('media-indicator')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show media indicator when item has no media', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.queryByTestId('media-indicator')).not.toBeInTheDocument();
  });

  it('truncates long content', () => {
    const longContent = 'A'.repeat(150);
    const itemWithLongContent = createItem({ content: longContent });
    renderWithTheme(<SyncPreviewItem {...defaultProps} item={itemWithLongContent} />);

    const content = screen.getByTestId('preview-content');
    expect(content.textContent).toContain('...');
    expect(content.textContent?.length).toBeLessThan(150);
  });

  it('renders bluesky to twitter direction', () => {
    const reverseItem = createItem({
      sourcePlatform: 'bluesky',
      targetPlatform: 'twitter',
    });
    renderWithTheme(<SyncPreviewItem {...defaultProps} item={reverseItem} />);

    expect(screen.getByTestId('source-platform-icon')).toHaveAttribute(
      'data-platform',
      'bluesky'
    );
    expect(screen.getByTestId('target-platform-icon')).toHaveAttribute(
      'data-platform',
      'twitter'
    );
  });

  it('has correct data-selected attribute when not selected', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByTestId('sync-preview-item-test-1')).toHaveAttribute(
      'data-selected',
      'false'
    );
  });

  it('has correct data-selected attribute when selected', () => {
    const selectedItem = createItem({ selected: true });
    renderWithTheme(<SyncPreviewItem {...defaultProps} item={selectedItem} />);
    expect(screen.getByTestId('sync-preview-item-test-1')).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  it('checkbox has correct aria-label', () => {
    renderWithTheme(<SyncPreviewItem {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute(
      'aria-label',
      'Select item test-1'
    );
  });
});
