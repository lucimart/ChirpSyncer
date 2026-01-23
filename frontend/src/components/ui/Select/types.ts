'use client';

import { SelectHTMLAttributes } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Disable this option */
  disabled?: boolean;
}

export interface SelectOptionGroup {
  /** Group label */
  label: string;
  /** Options in this group */
  options: SelectOption[];
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Size preset */
  size?: SelectSize;
  /** Options (flat list or grouped) */
  options: SelectOption[] | SelectOptionGroup[];
  /** Placeholder option */
  placeholder?: string;
}

export const SELECT_SIZES: Record<SelectSize, { height: number; padding: string; fontSize: string }> = {
  sm: { height: 32, padding: '6px 32px 6px 10px', fontSize: 'sm' },
  md: { height: 40, padding: '8px 40px 8px 12px', fontSize: 'base' },
  lg: { height: 48, padding: '12px 48px 12px 16px', fontSize: 'base' },
};
