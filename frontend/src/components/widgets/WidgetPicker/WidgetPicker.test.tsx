import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WidgetPicker } from './WidgetPicker';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('WidgetPicker', () => {
  it('renders when open', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    expect(screen.getByTestId('widget-picker')).toBeInTheDocument();
    expect(screen.getByText('Add Widget')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={false} onClose={handleClose} onSelect={handleSelect} />
    );

    expect(screen.queryByTestId('widget-picker')).not.toBeInTheDocument();
  });

  it('shows all widget options', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    expect(screen.getByTestId('widget-option-stats')).toBeInTheDocument();
    expect(screen.getByTestId('widget-option-chart')).toBeInTheDocument();
    expect(screen.getByTestId('widget-option-list')).toBeInTheDocument();
  });

  it('shows widget descriptions', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    expect(screen.getByText('View key metrics and statistics')).toBeInTheDocument();
    expect(screen.getByText('Data chart and visualization')).toBeInTheDocument();
    expect(screen.getByText('Activity list and recent items')).toBeInTheDocument();
  });

  it('calls onSelect and onClose when option is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    await user.click(screen.getByTestId('widget-option-stats'));

    expect(handleSelect).toHaveBeenCalledWith('stats');
    expect(handleClose).toHaveBeenCalled();
  });

  it('filters options based on search', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    const searchInput = screen.getByTestId('widget-search');
    await user.type(searchInput, 'chart');

    expect(screen.getByTestId('widget-option-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-option-stats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-option-list')).not.toBeInTheDocument();
  });

  it('shows empty state when no results match search', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    const searchInput = screen.getByTestId('widget-search');
    await user.type(searchInput, 'xyz123');

    expect(screen.getByText('No widgets match your search')).toBeInTheDocument();
  });

  it('clears search when closed and reopened', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    const { rerender } = renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    const searchInput = screen.getByTestId('widget-search');
    await user.type(searchInput, 'chart');

    rerender(
      <ThemeProvider>
        <WidgetPicker isOpen={false} onClose={handleClose} onSelect={handleSelect} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider>
        <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('widget-search')).toHaveValue('');
  });

  it('searches by keywords', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    const searchInput = screen.getByTestId('widget-search');
    await user.type(searchInput, 'metrics');

    expect(screen.getByTestId('widget-option-stats')).toBeInTheDocument();
  });

  it('searches by title', async () => {
    const user = userEvent.setup();
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    renderWithTheme(
      <WidgetPicker isOpen={true} onClose={handleClose} onSelect={handleSelect} />
    );

    const searchInput = screen.getByTestId('widget-search');
    await user.type(searchInput, 'Feed');

    expect(screen.getByTestId('widget-option-list')).toBeInTheDocument();
  });
});
