import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WidgetRenderer } from './WidgetRenderer';
import type { WidgetConfig } from '../types';

// Mock NivoChartWidget to avoid Nivo rendering issues in tests
jest.mock('../NivoChartWidget', () => ({
  NivoChartWidget: ({ title, chartType }: { title: string; chartType: string }) => (
    <div data-testid="nivo-chart-widget" data-chart-type={chartType}>
      {title}
    </div>
  ),
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('WidgetRenderer', () => {
  describe('stats widget', () => {
    it('renders StatsWidget with data', () => {
      const config: WidgetConfig = {
        id: 'stats-1',
        type: 'stats',
        title: 'Metrics',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          items: [
            { label: 'Total', value: 100 },
            { label: 'Active', value: 50, change: 5 },
          ],
        },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByTestId('stats-widget')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('shows default content when no data', () => {
      const config: WidgetConfig = {
        id: 'stats-1',
        type: 'stats',
        title: 'Empty Stats',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByText(/no data configured for stats widget/i)).toBeInTheDocument();
    });
  });

  describe('chart widget', () => {
    it('renders ChartWidget with data', () => {
      const config: WidgetConfig = {
        id: 'chart-1',
        type: 'chart',
        title: 'Activity',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          data: [
            { label: 'Mon', value: 100 },
            { label: 'Tue', value: 150 },
          ],
          type: 'bar',
        },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    });

    it('renders NivoChartWidget when useNivo is true', () => {
      const config: WidgetConfig = {
        id: 'chart-2',
        type: 'chart',
        title: 'Nivo Chart',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          data: [
            { label: 'Mon', value: 100 },
            { label: 'Tue', value: 150 },
          ],
          type: 'bar',
          useNivo: true,
          height: 250,
        },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByTestId('nivo-chart-widget')).toBeInTheDocument();
    });

    it('shows default content when no data', () => {
      const config: WidgetConfig = {
        id: 'chart-1',
        type: 'chart',
        title: 'Empty Chart',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByText(/no data configured for chart widget/i)).toBeInTheDocument();
    });
  });

  describe('list widget', () => {
    it('renders ListWidget with data', () => {
      const config: WidgetConfig = {
        id: 'list-1',
        type: 'list',
        title: 'Items',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          items: [
            { id: '1', title: 'Item 1' },
            { id: '2', title: 'Item 2' },
          ],
        },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByTestId('list-widget')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('calls onItemClick when item is clicked', async () => {
      const user = userEvent.setup();
      const handleItemClick = jest.fn();

      const config: WidgetConfig = {
        id: 'list-1',
        type: 'list',
        title: 'Items',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          items: [
            { id: '1', title: 'Clickable Item' },
          ],
        },
      };

      renderWithTheme(
        <WidgetRenderer config={config} onItemClick={handleItemClick} />
      );

      await user.click(screen.getByTestId('list-item-1'));
      expect(handleItemClick).toHaveBeenCalledWith({ id: '1', title: 'Clickable Item' });
    });

    it('calls onViewAll when provided', async () => {
      const user = userEvent.setup();
      const handleViewAll = jest.fn();

      const config: WidgetConfig = {
        id: 'list-1',
        type: 'list',
        title: 'Items',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
        data: {
          items: [
            { id: '1', title: 'Item 1' },
            { id: '2', title: 'Item 2' },
            { id: '3', title: 'Item 3' },
          ],
          maxItems: 2,
        },
      };

      renderWithTheme(
        <WidgetRenderer config={config} onViewAll={handleViewAll} />
      );

      await user.click(screen.getByRole('button', { name: /view all/i }));
      expect(handleViewAll).toHaveBeenCalled();
    });

    it('shows default content when no data', () => {
      const config: WidgetConfig = {
        id: 'list-1',
        type: 'list',
        title: 'Empty List',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByText(/no data configured for list widget/i)).toBeInTheDocument();
    });
  });

  describe('custom widget', () => {
    it('shows default content for custom type', () => {
      const config: WidgetConfig = {
        id: 'custom-1',
        type: 'custom',
        title: 'Custom Widget',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByText(/no data configured for custom widget/i)).toBeInTheDocument();
    });
  });

  describe('unknown widget', () => {
    it('shows default content for unknown type', () => {
      const config = {
        id: 'unknown-1',
        type: 'unknown' as WidgetConfig['type'],
        title: 'Unknown Widget',
        position: { x: 0, y: 0 },
        size: { width: 1, height: 1 },
      };

      renderWithTheme(<WidgetRenderer config={config} />);

      expect(screen.getByText(/no data configured for unknown widget/i)).toBeInTheDocument();
    });
  });
});
