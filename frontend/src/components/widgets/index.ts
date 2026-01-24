// Shared types
export type {
  WidgetType,
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
  WidgetDataMap,
  WidgetOption,
  WidgetHandlers,
  StatusType,
  StatusColorConfig,
  BaseWidgetConfig,
  TypedWidgetConfig,
} from './types';
export { STATUS_COLORS } from './types';

// Core components
export { Widget } from './Widget';
export type { WidgetProps } from './Widget';

export { WidgetGrid } from './WidgetGrid';
export type { WidgetGridProps } from './WidgetGrid';

export { WidgetPicker } from './WidgetPicker';

export { WidgetRenderer } from './WidgetRenderer';

// Content widgets
export { StatsWidget } from './StatsWidget';
export type { StatsWidgetProps, StatItem } from './StatsWidget';

export { ChartWidget } from './ChartWidget';
export type { ChartWidgetProps, ChartDataPoint } from './ChartWidget';

export { NivoChartWidget } from './NivoChartWidget';
export type { NivoChartWidgetProps } from './NivoChartWidget';

export { ListWidget } from './ListWidget';
export type { ListWidgetProps, ListItem } from './ListWidget';
