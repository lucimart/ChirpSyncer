/**
 * Shared UI Component Types
 *
 * Common type definitions used across multiple UI components.
 */

// Standard size options (most common)
export type ComponentSize = 'sm' | 'md' | 'lg';

// Extended size options (with xs)
export type ComponentSizeExtended = 'xs' | 'sm' | 'md' | 'lg';

// Full size options (with xl)
export type ComponentSizeFull = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Common variant types
export type SurfaceVariant = 'default' | 'outlined' | 'elevated' | 'filled';

// Status/semantic variants
export type StatusVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

// Button-specific variants
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

// Color scheme
export type ColorScheme = 'default' | 'primary' | 'danger';

// Icon position
export type IconPosition = 'start' | 'end' | 'left' | 'right';

// Common size configurations
export interface SizeConfig {
  height: number;
  padding: string;
  fontSize: string;
  iconSize: number;
}

export interface TextSizeConfig {
  fontSize: string;
  padding: string;
  lineHeight: number;
}

// Standard size presets
export const SIZE_HEIGHTS: Record<ComponentSizeExtended, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

export const SIZE_FONT_SIZES: Record<ComponentSizeExtended, string> = {
  xs: 'xs',
  sm: 'sm',
  md: 'base',
  lg: 'lg',
};

export const SIZE_ICON_SIZES: Record<ComponentSizeExtended, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
};

export const SIZE_PADDINGS: Record<ComponentSizeExtended, string> = {
  xs: '4px 8px',
  sm: '6px 12px',
  md: '8px 16px',
  lg: '12px 20px',
};
