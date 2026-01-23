'use client';

import { InputHTMLAttributes } from 'react';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Size of the switch */
  size?: SwitchSize;
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Position of label relative to switch */
  labelPosition?: 'left' | 'right';
  /** Custom on/off labels inside switch */
  onLabel?: string;
  offLabel?: string;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

export const SWITCH_SIZES: Record<SwitchSize, { width: number; height: number; knob: number; translate: number }> = {
  sm: { width: 36, height: 20, knob: 16, translate: 16 },
  md: { width: 44, height: 24, knob: 20, translate: 20 },
  lg: { width: 52, height: 28, knob: 24, translate: 24 },
};

export const SWITCH_ANIMATION = {
  knob: {
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    },
  },
  track: {
    transition: {
      duration: 0.15,
    },
  },
};
