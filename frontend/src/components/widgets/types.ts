/**
 * Shared types for widget components
 */

import type { LucideIcon } from 'lucide-react';
import type { StatItem } from './StatsWidget';
import type { ChartDataPoint } from './ChartWidget';
import type { ListItem } from './ListWidget';

// Re-export for convenience
export type { ListItem } from './ListWidget';

/** Supported widget types */
export type WidgetType = 'stats' | 'chart' | 'list' | 'custom';

/** Widget position in grid */
export interface WidgetPosition {
  x: number;
  y: number;
}

/** Widget dimensions */
export interface WidgetSize {
  width: number;
  height: number;
}

/** Type-specific widget data */
export interface WidgetDataMap {
  stats: {
    items: StatItem[];
    compact?: boolean;
    layout?: 'grid' | 'list';
  };
  chart: {
    data: ChartDataPoint[];
    type?: 'bar' | 'line' | 'area';
    showLegend?: boolean;
    /** Use Nivo for enhanced animations and tooltips */
    useNivo?: boolean;
    /** Height in pixels (Nivo only) */
    height?: number;
  };
  list: {
    items: ListItem[];
    maxItems?: number;
  };
  custom: Record<string, unknown>;
}

/** Base widget configuration */
export interface BaseWidgetConfig {
  id: string;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  settings?: Record<string, unknown>;
}

/** Typed widget configuration with discriminated union */
export type TypedWidgetConfig<T extends WidgetType = WidgetType> = BaseWidgetConfig & {
  type: T;
  data?: WidgetDataMap[T];
};

/** Generic widget configuration (for backwards compatibility) */
export interface WidgetConfig extends BaseWidgetConfig {
  type: WidgetType;
  data?: WidgetDataMap[WidgetType];
}

/** Widget option for picker */
export interface WidgetOption {
  type: WidgetType;
  title: string;
  description: string;
  Icon: LucideIcon;
  keywords: string[];
}

/** Widget event handlers */
export interface WidgetHandlers {
  onRemove: (id: string) => void;
  onSettings: (id: string) => void;
  onItemClick?: (item: ListItem) => void;
  onViewAll?: () => void;
}

/** Status types for list items */
export type StatusType = 'success' | 'warning' | 'error' | 'info';

/** Status color mapping */
export interface StatusColorConfig {
  bg: string;
  border: string;
}

export const STATUS_COLORS: Record<StatusType, StatusColorConfig> = {
  success: { bg: 'success', border: 'success' },
  warning: { bg: 'warning', border: 'warning' },
  error: { bg: 'danger', border: 'danger' },
  info: { bg: 'primary', border: 'primary' },
} as const;
