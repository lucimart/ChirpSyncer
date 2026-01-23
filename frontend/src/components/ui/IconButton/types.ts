'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonVariant = 'ghost' | 'soft' | 'outline' | 'solid';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconButtonColor = 'default' | 'primary' | 'danger';

// Omit handlers that conflict with framer-motion's event handlers
type BaseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
>;

export interface IconButtonProps extends BaseButtonProps {
  /** Visual style variant */
  variant?: IconButtonVariant;
  /** Button size */
  size?: IconButtonSize;
  /** Color scheme */
  color?: IconButtonColor;
  /** Accessible label (required for icon-only buttons) */
  'aria-label': string;
  /** Loading state */
  loading?: boolean;
  /** Round shape (full border radius) */
  round?: boolean;
  /** Icon element (alternative to children) */
  icon?: ReactNode;
}

export const ICON_BUTTON_SIZES: Record<IconButtonSize, { size: number; iconSize: number }> = {
  xs: { size: 24, iconSize: 14 },
  sm: { size: 28, iconSize: 16 },
  md: { size: 36, iconSize: 18 },
  lg: { size: 44, iconSize: 22 },
};

export const ICON_BUTTON_ANIMATION = {
  tap: { scale: 0.92 },
  hover: { scale: 1.05 },
} as const;
