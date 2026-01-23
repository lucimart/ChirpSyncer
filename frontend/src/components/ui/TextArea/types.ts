'use client';

import { TextareaHTMLAttributes } from 'react';

export type TextAreaSize = 'sm' | 'md' | 'lg';
export type TextAreaResize = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message (shows instead of helper text when present) */
  error?: string;
  /** Size preset */
  size?: TextAreaSize;
  /** Full width */
  fullWidth?: boolean;
  /** Minimum number of rows */
  minRows?: number;
  /** Maximum number of rows (enables auto-grow up to this limit) */
  maxRows?: number;
  /** Show character count */
  showCharCount?: boolean;
  /** Maximum character limit */
  maxLength?: number;
  /** Resize behavior */
  resize?: TextAreaResize;
  /** Required indicator */
  required?: boolean;
}

export const TEXTAREA_SIZES: Record<TextAreaSize, { fontSize: string; padding: string; lineHeight: number }> = {
  sm: { fontSize: 'sm', padding: '8px 10px', lineHeight: 1.4 },
  md: { fontSize: 'base', padding: '10px 12px', lineHeight: 1.5 },
  lg: { fontSize: 'lg', padding: '12px 14px', lineHeight: 1.6 },
};
