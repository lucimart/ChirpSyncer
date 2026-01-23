'use client';

import { ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'soft'
  | 'danger-soft'
  | 'dashed';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

// Exclude props that conflict with framer-motion
type ConflictingMotionProps = 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, ConflictingMotionProps> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Shows loading spinner and disables button */
  isLoading?: boolean;
  /** Loading text to show (for accessibility) */
  loadingText?: string;
  /** Makes button full width */
  fullWidth?: boolean;
  /** Icon to show before children */
  leftIcon?: ReactNode;
  /** Icon to show after children */
  rightIcon?: ReactNode;
  /** Makes the button round (for icon buttons) */
  isRound?: boolean;
  /** Disables hover/active animations */
  disableAnimations?: boolean;
}

export const BUTTON_ANIMATION = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
  transition: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
  },
  reducedMotion: {
    tap: {},
    hover: {},
  },
};

export const SPINNER_ANIMATION = {
  animate: { rotate: 360 },
  transition: {
    duration: 0.8,
    repeat: Infinity,
    ease: 'linear' as const,
  },
};

export const SIZE_HEIGHTS: Record<ButtonSize, number> = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 48,
  icon: 36,
};
