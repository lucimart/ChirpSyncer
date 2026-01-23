'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text */
  label?: ReactNode;
  /** Description below label */
  description?: string;
  /** Size preset */
  size?: CheckboxSize;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
}

export const CHECKBOX_SIZES: Record<CheckboxSize, { box: number; check: number; font: string }> = {
  sm: { box: 14, check: 10, font: 'xs' },
  md: { box: 16, check: 12, font: 'sm' },
  lg: { box: 20, check: 14, font: 'base' },
};

export const CHECKBOX_ANIMATION = {
  check: {
    initial: { pathLength: 0, opacity: 0 },
    checked: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { type: 'spring' as const, stiffness: 500, damping: 30 },
      opacity: { duration: 0.1 },
    },
  },
  box: {
    tap: { scale: 0.95 },
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    },
  },
};
