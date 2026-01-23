'use client';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressDetail {
  label: string;
  value: string | number;
}

export interface ProgressProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max?: number;
  /** Label text */
  label?: string;
  /** Show value text */
  showValue?: boolean;
  /** Color variant */
  variant?: ProgressVariant;
  /** Size preset */
  size?: ProgressSize;
  /** Animate the progress bar */
  animated?: boolean;
  /** Show indeterminate state */
  indeterminate?: boolean;
  /** Additional details to display */
  details?: ProgressDetail[];
  /** Accessible label */
  'aria-label'?: string;
  /** Custom className */
  className?: string;
}

export const PROGRESS_SIZES: Record<ProgressSize, { height: number; fontSize: string }> = {
  sm: { height: 4, fontSize: 'xs' },
  md: { height: 8, fontSize: 'sm' },
  lg: { height: 12, fontSize: 'base' },
};

export const PROGRESS_ANIMATION = {
  fill: {
    initial: { width: '0%' },
    animate: (percentage: number) => ({ width: `${percentage}%` }),
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
    },
  },
  indeterminate: {
    animate: {
      x: ['-100%', '100%'],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
  pulse: {
    animate: {
      opacity: [1, 0.6, 1],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};
