import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WidgetGrid } from './WidgetGrid';
import type { WidgetConfig } from '../types';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockWidgets: WidgetConfig[] = [
  {
    id: 'widget-1',
    type: 'stats',
    title: 'Stats Widget',
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    data: {
      items: [
        { label: 'Total', value: 100 },
        { label: 'Active', value: 50 },
      ],
    },
  },
  {
    id: 'widget-2',
    type: 'chart',
    title: 'Chart Widget',
    position: { x: 1, y: 0 },
    size: { width: 1, height: 1 },
    data: {
      data: [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ],
      type: 'bar',
    },
  },
];

describe('WidgetGrid', () => {
  it('renders the widget grid', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
  });

  it('renders all widgets', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
  });

  it('shows empty state when no widgets', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={[]}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    expect(screen.getByTestId('widget-grid-empty')).toBeInTheDocument();
    expect(screen.getByText('No widgets yet')).toBeInTheDocument();
  });

  it('shows Add Widget button when widgets exist', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    expect(screen.getByTestId('add-widget-button')).toBeInTheDocument();
  });

  it('opens widget picker when Add Widget is clicked', async () => {
    const user = userEvent.setup();
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    await user.click(screen.getByTestId('add-widget-button'));
    expect(screen.getByTestId('widget-picker')).toBeInTheDocument();
  });

  it('toggles edit mode', async () => {
    const user = userEvent.setup();
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-1')).toHaveAttribute('data-editable', 'true');
  });

  it('calls onRemoveWidget when widget is removed', async () => {
    const user = userEvent.setup();
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(handleRemove).toHaveBeenCalledWith('widget-1');
  });

  it('calls onWidgetSettings when settings is clicked', async () => {
    const user = userEvent.setup();
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    const settingsButtons = screen.getAllByRole('button', { name: /settings/i });
    await user.click(settingsButtons[0]);

    expect(handleSettings).toHaveBeenCalledWith('widget-1');
  });

  it('applies compact mode', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
        compact
      />
    );

    expect(screen.getByTestId('widget-grid')).toHaveAttribute('data-compact', 'true');
  });

  it('shows loading state on widgets', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
        isLoading
      />
    );

    expect(screen.getAllByTestId('widget-loading')).toHaveLength(2);
  });

  it('shows error on specific widgets', () => {
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
        widgetErrors={{ 'widget-1': 'Failed to load' }}
      />
    );

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('adds new widget when selected from picker', async () => {
    const user = userEvent.setup();
    const handleLayoutChange = jest.fn();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <WidgetGrid
        widgets={mockWidgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemove}
        onWidgetSettings={handleSettings}
      />
    );

    await user.click(screen.getByTestId('add-widget-button'));
    await user.click(screen.getByTestId('widget-option-stats'));

    expect(handleLayoutChange).toHaveBeenCalled();
    const newWidgets = handleLayoutChange.mock.calls[0][0];
    expect(newWidgets).toHaveLength(3);
    expect(newWidgets[2].type).toBe('stats');
  });
});
