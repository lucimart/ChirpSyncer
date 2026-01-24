'use client';

import { ReactNode } from 'react';

export type ToggleGroupSize = 'sm' | 'md' | 'lg';
export type ToggleGroupVariant = 'default' | 'pill' | 'outline';

export interface ToggleOption<T extends string = string> {
  /** Option value */
  value: T;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Disable this option */
  disabled?: boolean;
}

export interface ToggleGroupProps<T extends string = string> {
  /** Available options */
  options: ToggleOption<T>[];
  /** Currently selected value */
  value: T;
  /** Called when selection changes */
  onChange: (value: T) => void;
  /** Size preset */
  size?: ToggleGroupSize;
  /** Visual variant */
  variant?: ToggleGroupVariant;
  /** Custom className */
  className?: string;
  /** Accessible label for the group */
  'aria-label'?: string;
  /** ID for the group */
  id?: string;
}

export const TOGGLE_GROUP_SIZES: Record<ToggleGroupSize, { padding: string; fontSize: string; iconSize: number }> = {
  sm: { padding: '4px 8px', fontSize: 'xs', iconSize: 14 },
  md: { padding: '8px 12px', fontSize: 'sm', iconSize: 16 },
  lg: { padding: '10px 16px', fontSize: 'base', iconSize: 18 },
};

export const TOGGLE_GROUP_ANIMATION = {
  indicator: {
    layout: true,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 35,
    },
  },
};
