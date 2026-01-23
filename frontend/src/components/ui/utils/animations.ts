/**
 * Shared Animation Configurations
 *
 * Centralized animation presets for consistent motion across UI components.
 */

import type { Transition } from 'framer-motion';

// Base spring configurations
export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
} as const;

export const SPRING_GENTLE: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
} as const;

export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
} as const;

// Tween configurations
export const TWEEN_FAST: Transition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
} as const;

export const TWEEN_NORMAL: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeInOut',
} as const;

// Interactive element animations
export const INTERACTIVE_ANIMATION = {
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
  transition: SPRING_SNAPPY,
} as const;

export const SUBTLE_ANIMATION = {
  tap: { scale: 0.98 },
  hover: { y: -2 },
  transition: SPRING_GENTLE,
} as const;

export const ICON_BUTTON_ANIMATION = {
  tap: { scale: 0.92 },
  hover: { scale: 1.05 },
  transition: SPRING_SNAPPY,
} as const;

// Pulse animation for indicators
export const PULSE_ANIMATION = {
  scale: [1, 1.2, 1],
  opacity: [1, 0.7, 1],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
} as const;

// Fade animations
export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: TWEEN_FAST,
} as const;

export const FADE_IN_UP = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: SPRING_GENTLE,
} as const;

// Spinner animation
export const SPINNER_ANIMATION = {
  rotate: 360,
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear',
  },
} as const;
