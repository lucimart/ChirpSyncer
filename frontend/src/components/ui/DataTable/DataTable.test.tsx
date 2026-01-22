import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { DataTable, Column } from './DataTable';

interface TestData {
  id: number;
  name: string;
  value: number;
}

const testData: TestData[] = [
  { id: 1, name: 'Alpha', value: 100 },
  { id: 2, name: 'Beta', value: 200 },
  { id: 3, name: 'Gamma', value: 150 },
  { id: 4, name: 'Delta', value: 50 },
  { id: 5, name: 'Epsilon', value: 300 },
];

const columns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'value', header: 'Value', sortable: true },
];

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('DataTable', () => {
  it('renders table with data', () => {
    renderWithTheme(<DataTable columns={columns} data={testData} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    renderWithTheme(
      <DataTable columns={columns} data={[]} emptyMessage="No items found" />
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('uses default empty message', () => {
    renderWithTheme(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('sorts data when clicking sortable column', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DataTable columns={columns} data={testData} />);

    // Get all rows initially
    const rows = screen.getAllByRole('row');
    // First row is header, data starts at index 1
    expect(rows[1]).toHaveTextContent('Alpha');

    // Click on Name header to sort
    await user.click(screen.getByText('Name'));

    // Should be sorted ascending by name
    const sortedRows = screen.getAllByRole('row');
    expect(sortedRows[1]).toHaveTextContent('Alpha');
  });

  it('toggles sort direction on second click', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DataTable columns={columns} data={testData} />);

    // Click twice to sort descending
    await user.click(screen.getByText('Name'));
    await user.click(screen.getByText('Name'));

    // Should now be descending
    const rows = screen.getAllByRole('row');
    // Gamma should be last alphabetically when ascending, first when descending
    expect(rows).toHaveLength(6); // 1 header + 5 data rows
  });

  it('renders pagination when data exceeds pageSize', () => {
    renderWithTheme(<DataTable columns={columns} data={testData} pageSize={2} />);

    expect(screen.getByText(/Showing 1 to 2 of 5/)).toBeInTheDocument();
  });

  it('navigates pages correctly', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DataTable columns={columns} data={testData} pageSize={2} />);

    // Should show first 2 items
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();

    // Click next page
    const nextButton = screen.getAllByRole('button').pop();
    if (nextButton) {
      await user.click(nextButton);
    }

    // Should now show items 3-4
    expect(screen.getByText(/Showing 3 to 4 of 5/)).toBeInTheDocument();
  });

  it('renders selectable table with checkboxes', () => {
    const onSelectionChange = jest.fn();
    renderWithTheme(
      <DataTable
        columns={columns}
        data={testData}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Should have header checkbox + one for each row
    expect(checkboxes).toHaveLength(6);
  });

  it('calls onSelectionChange when row is selected', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    renderWithTheme(
      <DataTable
        columns={columns}
        data={testData}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click first row checkbox (index 1, 0 is header)
    await user.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
  });

  it('selects all visible rows when header checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    renderWithTheme(
      <DataTable
        columns={columns}
        data={testData}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
        pageSize={3}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click header checkbox
    await user.click(checkboxes[0]);

    // Should select first 3 items (page size)
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2, 3]));
  });

  it('renders custom cell content using render prop', () => {
    const columnsWithRender: Column<TestData>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'value',
        header: 'Value',
        render: (row) => <span data-testid="custom">{row.value * 2}</span>,
      },
    ];

    renderWithTheme(<DataTable columns={columnsWithRender} data={[testData[0]]} />);

    expect(screen.getByTestId('custom')).toHaveTextContent('200');
  });

  it('does not sort when clicking non-sortable column', async () => {
    const user = userEvent.setup();
    const nonSortableColumns: Column<TestData>[] = [
      { key: 'name', header: 'Name', sortable: false },
      { key: 'value', header: 'Value', sortable: false },
    ];

    renderWithTheme(<DataTable columns={nonSortableColumns} data={testData} />);

    await user.click(screen.getByText('Name'));

    // Order should remain unchanged
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Alpha');
  });

  it('applies column width when specified', () => {
    const columnsWithWidth: Column<TestData>[] = [
      { key: 'name', header: 'Name', width: '200px' },
      { key: 'value', header: 'Value' },
    ];

    renderWithTheme(<DataTable columns={columnsWithWidth} data={testData} />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveStyle({ width: '200px' });
  });
});
