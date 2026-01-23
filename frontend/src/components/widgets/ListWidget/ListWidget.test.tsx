import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ListWidget, type ListItem } from './ListWidget';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockItems: ListItem[] = [
  { id: '1', title: 'First Item', subtitle: 'Description 1' },
  { id: '2', title: 'Second Item', subtitle: 'Description 2', status: 'success' },
  { id: '3', title: 'Third Item', status: 'warning' },
  { id: '4', title: 'Fourth Item', status: 'error' },
  { id: '5', title: 'Fifth Item', status: 'info' },
];

describe('ListWidget', () => {
  it('renders all items', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} />
    );
    expect(screen.getByTestId('list-widget')).toBeInTheDocument();
    expect(screen.getByText('First Item')).toBeInTheDocument();
    expect(screen.getByText('Second Item')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} />
    );
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });

  it('calls onItemClick when item is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} />
    );

    await user.click(screen.getByTestId('list-item-1'));
    expect(handleClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('calls onItemClick on Enter key', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} />
    );

    const item = screen.getByTestId('list-item-1');
    item.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it('limits displayed items when maxItems is set', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} maxItems={3} />
    );

    expect(screen.getByTestId('list-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('list-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('list-item-3')).toBeInTheDocument();
    expect(screen.queryByTestId('list-item-4')).not.toBeInTheDocument();
  });

  it('shows View all button when there are more items than maxItems', () => {
    const handleClick = jest.fn();
    const handleViewAll = jest.fn();
    renderWithTheme(
      <ListWidget
        items={mockItems}
        title="My List"
        onItemClick={handleClick}
        maxItems={3}
        onViewAll={handleViewAll}
      />
    );

    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('calls onViewAll when View all button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    const handleViewAll = jest.fn();
    renderWithTheme(
      <ListWidget
        items={mockItems}
        title="My List"
        onItemClick={handleClick}
        maxItems={3}
        onViewAll={handleViewAll}
      />
    );

    await user.click(screen.getByRole('button', { name: /view all/i }));
    expect(handleViewAll).toHaveBeenCalled();
  });

  it('shows empty state when items array is empty', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={[]} title="Empty List" onItemClick={handleClick} />
    );

    expect(screen.getByTestId('list-empty')).toBeInTheDocument();
    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('applies status styles to items', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <ListWidget items={mockItems} title="My List" onItemClick={handleClick} />
    );

    expect(screen.getByTestId('list-item-2')).toHaveAttribute('data-status', 'success');
    expect(screen.getByTestId('list-item-3')).toHaveAttribute('data-status', 'warning');
    expect(screen.getByTestId('list-item-4')).toHaveAttribute('data-status', 'error');
  });
});
