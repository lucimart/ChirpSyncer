/**
 * Dashboard Widgets Tests (TDD)
 *
 * Tests for WidgetGrid, Widget, StatsWidget, ChartWidget, ListWidget, and WidgetPicker
 * Based on UI_UX_INNOVATIONS_IMPLEMENTATION.md spec (P2.3 - Dashboard Widgets)
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Component imports (to be implemented)
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { Widget } from '@/components/widgets/Widget';
import { StatsWidget } from '@/components/widgets/StatsWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { ListWidget } from '@/components/widgets/ListWidget';
import { WidgetPicker } from '@/components/widgets/WidgetPicker';

// Types for Dashboard Widgets feature
export interface WidgetConfig {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'custom';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings?: Record<string, unknown>;
}

export interface WidgetLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
}

export interface StatItem {
  label: string;
  value: number | string;
  change?: number;
  icon?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

// Theme wrapper
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

// Mock data
const mockWidgetConfigs: WidgetConfig[] = [
  {
    id: 'widget-1',
    type: 'stats',
    title: 'Sync Stats',
    position: { x: 0, y: 0 },
    size: { width: 2, height: 1 },
  },
  {
    id: 'widget-2',
    type: 'chart',
    title: 'Activity Chart',
    position: { x: 2, y: 0 },
    size: { width: 2, height: 2 },
  },
  {
    id: 'widget-3',
    type: 'list',
    title: 'Recent Activity',
    position: { x: 0, y: 1 },
    size: { width: 2, height: 1 },
  },
];

const mockStats: StatItem[] = [
  { label: 'Total Syncs', value: 1250, change: 12 },
  { label: 'Active Rules', value: 8, change: 2 },
  { label: 'Posts Today', value: 45, change: -5 },
];

const mockChartData: ChartDataPoint[] = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 150 },
  { label: 'Wed', value: 180 },
  { label: 'Thu', value: 140 },
  { label: 'Fri', value: 200 },
];

const mockListItems: ListItem[] = [
  { id: 'item-1', title: 'Sync completed', subtitle: '5 minutes ago', status: 'success' },
  { id: 'item-2', title: 'Rate limit warning', subtitle: '1 hour ago', status: 'warning' },
  { id: 'item-3', title: 'New follower', subtitle: '2 hours ago', status: 'info' },
];

// ============================================================================
// WidgetGrid Component Tests
// ============================================================================

describe('WidgetGrid Component', () => {
  const defaultProps = {
    widgets: mockWidgetConfigs,
    onLayoutChange: jest.fn(),
    onRemoveWidget: jest.fn(),
    onWidgetSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders grid with data-testid="widget-grid"', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
    });

    it('renders Widget for each config', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
      expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
      expect(screen.getByTestId('widget-widget-3')).toBeInTheDocument();
    });

    it('shows grid title or header', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      expect(screen.getByText(/dashboard|widgets/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no widgets', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} widgets={[]} />);

      expect(screen.getByTestId('widget-grid-empty')).toBeInTheDocument();
      expect(screen.getByText(/no widgets|add widgets/i)).toBeInTheDocument();
    });

    it('shows add widget button in empty state', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} widgets={[]} />);

      expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('supports grid layout mode', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      const grid = screen.getByTestId('widget-grid');
      expect(grid).toHaveAttribute('data-layout', 'grid');
    });

    it('supports compact mode', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} compact />);

      const grid = screen.getByTestId('widget-grid');
      expect(grid).toHaveAttribute('data-compact', 'true');
    });
  });

  describe('Widget Management', () => {
    it('calls onRemoveWidget when remove button is clicked', () => {
      const onRemoveWidget = jest.fn();
      renderWithTheme(<WidgetGrid {...defaultProps} onRemoveWidget={onRemoveWidget} />);

      const widget = screen.getByTestId('widget-widget-1');
      const removeButton = within(widget).getByRole('button', { name: /remove|delete|close/i });
      fireEvent.click(removeButton);

      expect(onRemoveWidget).toHaveBeenCalledWith('widget-1');
    });

    it('calls onWidgetSettings when settings button is clicked', () => {
      const onWidgetSettings = jest.fn();
      renderWithTheme(<WidgetGrid {...defaultProps} onWidgetSettings={onWidgetSettings} />);

      const widget = screen.getByTestId('widget-widget-1');
      const settingsButton = within(widget).getByRole('button', { name: /settings|configure/i });
      fireEvent.click(settingsButton);

      expect(onWidgetSettings).toHaveBeenCalledWith('widget-1');
    });
  });

  describe('Add Widget', () => {
    it('shows add widget button', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      expect(screen.getByTestId('add-widget-button')).toBeInTheDocument();
    });

    it('opens widget picker when add button is clicked', async () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      fireEvent.click(screen.getByTestId('add-widget-button'));

      await waitFor(() => {
        expect(screen.getByTestId('widget-picker')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    it('supports edit mode toggle', () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      expect(screen.getByRole('button', { name: /edit|customize/i })).toBeInTheDocument();
    });

    it('shows drag handles in edit mode', async () => {
      renderWithTheme(<WidgetGrid {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /edit|customize/i }));

      await waitFor(() => {
        const widget = screen.getByTestId('widget-widget-1');
        expect(widget).toHaveAttribute('data-editable', 'true');
      });
    });
  });
});

// ============================================================================
// Widget Component Tests
// ============================================================================

describe('Widget Component', () => {
  const defaultConfig: WidgetConfig = mockWidgetConfigs[0];
  const defaultProps = {
    config: defaultConfig,
    onRemove: jest.fn(),
    onSettings: jest.fn(),
    isEditable: false,
    children: <div>Widget Content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="widget-{id}"', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    });

    it('shows widget title', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByText('Sync Stats')).toBeInTheDocument();
    });

    it('renders children content', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByText('Widget Content')).toBeInTheDocument();
    });

    it('shows widget type indicator', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByTestId('widget-widget-1')).toHaveAttribute('data-type', 'stats');
    });
  });

  describe('Header Actions', () => {
    it('shows remove button', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByRole('button', { name: /remove|delete|close/i })).toBeInTheDocument();
    });

    it('shows settings button', () => {
      renderWithTheme(<Widget {...defaultProps} />);

      expect(screen.getByRole('button', { name: /settings|configure/i })).toBeInTheDocument();
    });

    it('calls onRemove when remove clicked', () => {
      const onRemove = jest.fn();
      renderWithTheme(<Widget {...defaultProps} onRemove={onRemove} />);

      fireEvent.click(screen.getByRole('button', { name: /remove|delete|close/i }));

      expect(onRemove).toHaveBeenCalled();
    });

    it('calls onSettings when settings clicked', () => {
      const onSettings = jest.fn();
      renderWithTheme(<Widget {...defaultProps} onSettings={onSettings} />);

      fireEvent.click(screen.getByRole('button', { name: /settings|configure/i }));

      expect(onSettings).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    it('shows drag handle when editable', () => {
      renderWithTheme(<Widget {...defaultProps} isEditable />);

      expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
    });

    it('hides drag handle when not editable', () => {
      renderWithTheme(<Widget {...defaultProps} isEditable={false} />);

      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument();
    });

    it('sets data-editable attribute', () => {
      renderWithTheme(<Widget {...defaultProps} isEditable />);

      expect(screen.getByTestId('widget-widget-1')).toHaveAttribute('data-editable', 'true');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      renderWithTheme(<Widget {...defaultProps} isLoading />);

      expect(screen.getByTestId('widget-loading')).toBeInTheDocument();
    });

    it('hides content when loading', () => {
      renderWithTheme(<Widget {...defaultProps} isLoading />);

      expect(screen.queryByText('Widget Content')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error prop is set', () => {
      renderWithTheme(<Widget {...defaultProps} error="Failed to load data" />);

      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('shows retry button on error', () => {
      const onRetry = jest.fn();
      renderWithTheme(<Widget {...defaultProps} error="Error" onRetry={onRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

// ============================================================================
// StatsWidget Component Tests
// ============================================================================

describe('StatsWidget Component', () => {
  const defaultProps = {
    stats: mockStats,
    title: 'Sync Stats',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="stats-widget"', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      expect(screen.getByTestId('stats-widget')).toBeInTheDocument();
    });

    it('shows all stat items', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      expect(screen.getByText('Total Syncs')).toBeInTheDocument();
      expect(screen.getByText('Active Rules')).toBeInTheDocument();
      expect(screen.getByText('Posts Today')).toBeInTheDocument();
    });

    it('shows stat values', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      expect(screen.getByText('1250')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('Change Indicators', () => {
    it('shows positive change indicator', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      const statItem = screen.getByText('Total Syncs').closest('[data-testid^="stat-item"]');
      expect(statItem).toHaveAttribute('data-change', 'positive');
    });

    it('shows negative change indicator', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      const statItem = screen.getByText('Posts Today').closest('[data-testid^="stat-item"]');
      expect(statItem).toHaveAttribute('data-change', 'negative');
    });

    it('shows change value', () => {
      renderWithTheme(<StatsWidget {...defaultProps} />);

      expect(screen.getByText(/\+12%?/)).toBeInTheDocument();
      expect(screen.getByText(/-5%?/)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('supports compact layout', () => {
      renderWithTheme(<StatsWidget {...defaultProps} compact />);

      expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-compact', 'true');
    });

    it('supports grid layout', () => {
      renderWithTheme(<StatsWidget {...defaultProps} layout="grid" />);

      expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-layout', 'grid');
    });
  });
});

// ============================================================================
// ChartWidget Component Tests
// ============================================================================

describe('ChartWidget Component', () => {
  const defaultProps = {
    data: mockChartData,
    title: 'Activity Chart',
    chartType: 'bar' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="chart-widget"', () => {
      renderWithTheme(<ChartWidget {...defaultProps} />);

      expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    });

    it('shows chart container', () => {
      renderWithTheme(<ChartWidget {...defaultProps} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('shows chart type indicator', () => {
      renderWithTheme(<ChartWidget {...defaultProps} />);

      expect(screen.getByTestId('chart-widget')).toHaveAttribute('data-chart-type', 'bar');
    });
  });

  describe('Chart Types', () => {
    it('supports bar chart', () => {
      renderWithTheme(<ChartWidget {...defaultProps} chartType="bar" />);

      expect(screen.getByTestId('chart-widget')).toHaveAttribute('data-chart-type', 'bar');
    });

    it('supports line chart', () => {
      renderWithTheme(<ChartWidget {...defaultProps} chartType="line" />);

      expect(screen.getByTestId('chart-widget')).toHaveAttribute('data-chart-type', 'line');
    });

    it('supports area chart', () => {
      renderWithTheme(<ChartWidget {...defaultProps} chartType="area" />);

      expect(screen.getByTestId('chart-widget')).toHaveAttribute('data-chart-type', 'area');
    });
  });

  describe('Legend', () => {
    it('shows legend when enabled', () => {
      renderWithTheme(<ChartWidget {...defaultProps} showLegend />);

      expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    });

    it('hides legend by default', () => {
      renderWithTheme(<ChartWidget {...defaultProps} />);

      expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no data', () => {
      renderWithTheme(<ChartWidget {...defaultProps} data={[]} />);

      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// ListWidget Component Tests
// ============================================================================

describe('ListWidget Component', () => {
  const defaultProps = {
    items: mockListItems,
    title: 'Recent Activity',
    onItemClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="list-widget"', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      expect(screen.getByTestId('list-widget')).toBeInTheDocument();
    });

    it('shows all list items', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      expect(screen.getByText('Sync completed')).toBeInTheDocument();
      expect(screen.getByText('Rate limit warning')).toBeInTheDocument();
      expect(screen.getByText('New follower')).toBeInTheDocument();
    });

    it('shows item subtitles', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows success status', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      const item = screen.getByText('Sync completed').closest('[data-testid^="list-item"]');
      expect(item).toHaveAttribute('data-status', 'success');
    });

    it('shows warning status', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      const item = screen.getByText('Rate limit warning').closest('[data-testid^="list-item"]');
      expect(item).toHaveAttribute('data-status', 'warning');
    });

    it('shows info status', () => {
      renderWithTheme(<ListWidget {...defaultProps} />);

      const item = screen.getByText('New follower').closest('[data-testid^="list-item"]');
      expect(item).toHaveAttribute('data-status', 'info');
    });
  });

  describe('Interactions', () => {
    it('calls onItemClick when item is clicked', () => {
      const onItemClick = jest.fn();
      renderWithTheme(<ListWidget {...defaultProps} onItemClick={onItemClick} />);

      fireEvent.click(screen.getByText('Sync completed'));

      expect(onItemClick).toHaveBeenCalledWith(mockListItems[0]);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no items', () => {
      renderWithTheme(<ListWidget {...defaultProps} items={[]} />);

      expect(screen.getByTestId('list-empty')).toBeInTheDocument();
    });
  });

  describe('Max Items', () => {
    it('limits displayed items when maxItems is set', () => {
      renderWithTheme(<ListWidget {...defaultProps} maxItems={2} />);

      expect(screen.getByText('Sync completed')).toBeInTheDocument();
      expect(screen.getByText('Rate limit warning')).toBeInTheDocument();
      expect(screen.queryByText('New follower')).not.toBeInTheDocument();
    });

    it('shows "View all" link when items exceed maxItems', () => {
      renderWithTheme(<ListWidget {...defaultProps} maxItems={2} />);

      expect(screen.getByRole('button', { name: /view all|see more/i })).toBeInTheDocument();
    });
  });
});

// ============================================================================
// WidgetPicker Component Tests
// ============================================================================

describe('WidgetPicker Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="widget-picker" when open', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByTestId('widget-picker')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} isOpen={false} />);

      expect(screen.queryByTestId('widget-picker')).not.toBeInTheDocument();
    });

    it('shows picker title', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByText(/add widget|choose widget/i)).toBeInTheDocument();
    });
  });

  describe('Widget Options', () => {
    it('shows stats widget option', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByTestId('widget-option-stats')).toBeInTheDocument();
    });

    it('shows chart widget option', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByTestId('widget-option-chart')).toBeInTheDocument();
    });

    it('shows list widget option', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByTestId('widget-option-list')).toBeInTheDocument();
    });

    it('shows widget descriptions', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByText(/statistics|key metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/chart|visualization/i)).toBeInTheDocument();
      expect(screen.getByText(/list|activity/i)).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelect when widget is selected', () => {
      const onSelect = jest.fn();
      renderWithTheme(<WidgetPicker {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('widget-option-stats'));

      expect(onSelect).toHaveBeenCalledWith('stats');
    });

    it('calls onClose after selection', () => {
      const onClose = jest.fn();
      renderWithTheme(<WidgetPicker {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('widget-option-stats'));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Close Actions', () => {
    it('shows close button', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close|cancel/i })).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = jest.fn();
      renderWithTheme(<WidgetPicker {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close|cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Search', () => {
    it('shows search input', () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      expect(screen.getByTestId('widget-search')).toBeInTheDocument();
    });

    it('filters widgets by search', async () => {
      renderWithTheme(<WidgetPicker {...defaultProps} />);

      fireEvent.change(screen.getByTestId('widget-search'), { target: { value: 'stats' } });

      await waitFor(() => {
        expect(screen.getByTestId('widget-option-stats')).toBeInTheDocument();
        expect(screen.queryByTestId('widget-option-chart')).not.toBeInTheDocument();
      });
    });
  });
});
