import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { DetailsList } from './DetailsList';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('DetailsList', () => {
  const defaultItems = [
    { label: 'Status', value: 'Active' },
    { label: 'Last Updated', value: 'Jan 20, 2026' },
  ];

  it('renders all items', () => {
    renderWithTheme(<DetailsList items={defaultItems} />);

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
    expect(screen.getByText('Jan 20, 2026')).toBeInTheDocument();
  });

  it('renders empty list', () => {
    renderWithTheme(<DetailsList items={[]} />);

    expect(screen.getByTestId('details-list')).toBeInTheDocument();
    expect(screen.getByTestId('details-list').children).toHaveLength(0);
  });

  it('renders ReactNode values', () => {
    renderWithTheme(
      <DetailsList
        items={[
          {
            label: 'Status',
            value: <span data-testid="custom-value">Custom</span>,
          },
        ]}
      />
    );

    expect(screen.getByTestId('custom-value')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    renderWithTheme(<DetailsList items={defaultItems} />);

    expect(screen.getByTestId('details-list')).toBeInTheDocument();
  });

  it('renders with compact variant', () => {
    renderWithTheme(<DetailsList items={defaultItems} variant="compact" />);

    expect(screen.getByTestId('details-list')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    renderWithTheme(<DetailsList items={defaultItems} />);

    expect(screen.getByTestId('details-list')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <DetailsList items={defaultItems} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders multiple items with correct labels and values', () => {
    const items = [
      { label: 'Item 1', value: 'Value 1' },
      { label: 'Item 2', value: 'Value 2' },
      { label: 'Item 3', value: 'Value 3' },
    ];

    renderWithTheme(<DetailsList items={items} />);

    items.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.getByText(item.value as string)).toBeInTheDocument();
    });
  });

  it('renders numeric values', () => {
    renderWithTheme(
      <DetailsList
        items={[{ label: 'Count', value: '1234' }]}
      />
    );

    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});
