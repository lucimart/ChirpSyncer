'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Size preset */
  size?: InputSize;
  /** Icon at start of input */
  startIcon?: ReactNode;
  /** Icon at end of input */
  endIcon?: ReactNode;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
}

export const INPUT_SIZES: Record<InputSize, { height: number; padding: string; fontSize: string; iconSize: number }> = {
  sm: { height: 32, padding: '6px 10px', fontSize: 'sm', iconSize: 14 },
  md: { height: 40, padding: '8px 12px', fontSize: 'base', iconSize: 16 },
  lg: { height: 48, padding: '12px 16px', fontSize: 'base', iconSize: 18 },
};
