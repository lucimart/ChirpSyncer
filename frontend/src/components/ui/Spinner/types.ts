'use client';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'secondary' | 'white' | 'current';
export type SpinnerVariant = 'circle' | 'dots' | 'pulse';

export interface SpinnerProps {
  /** Size preset */
  size?: SpinnerSize;
  /** Color variant */
  color?: SpinnerColor;
  /** Visual style variant */
  variant?: SpinnerVariant;
  /** Custom label for screen readers */
  label?: string;
  /** Custom className */
  className?: string;
}

export const SPINNER_SIZES: Record<SpinnerSize, { size: number; borderWidth: number; dotSize: number }> = {
  xs: { size: 12, borderWidth: 1.5, dotSize: 3 },
  sm: { size: 16, borderWidth: 2, dotSize: 4 },
  md: { size: 24, borderWidth: 2.5, dotSize: 5 },
  lg: { size: 32, borderWidth: 3, dotSize: 6 },
  xl: { size: 48, borderWidth: 4, dotSize: 8 },
};

export const SPINNER_ANIMATION = {
  circle: {
    rotate: {
      repeat: Infinity,
      duration: 0.8,
      ease: 'linear',
    },
  },
  dots: {
    bounce: {
      y: [0, -8, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
} as const;
