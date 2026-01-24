import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Tabs } from './Tabs';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Tabs', () => {
  const mockItems = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
  ];

  it('renders all tabs', () => {
    renderWithTheme(<Tabs items={mockItems} value="tab1" onChange={() => { }} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('highlights active tab', () => {
    renderWithTheme(<Tabs items={mockItems} value="tab1" onChange={() => { }} />);
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab2).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when clicked', () => {
    const handleChange = jest.fn();
    renderWithTheme(<Tabs items={mockItems} value="tab1" onChange={handleChange} />);

    fireEvent.click(screen.getByText('Tab 2'));
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('renders badges when provided', () => {
    const itemsWithBadge = [
      { id: 'tab1', label: 'Tab 1', badge: 5 },
    ];
    renderWithTheme(<Tabs items={itemsWithBadge} value="tab1" onChange={() => { }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders different variants', () => {
    // Just ensure it renders without error
    const { unmount } = renderWithTheme(<Tabs items={mockItems} value="tab1" onChange={() => { }} variant="accent" />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    unmount();

    renderWithTheme(<Tabs items={mockItems} value="tab1" onChange={() => { }} variant="soft" />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
  });
});
