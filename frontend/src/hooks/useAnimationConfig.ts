'use client';

import { useReducedMotion } from 'framer-motion';
import { config as springConfig } from '@react-spring/web';

/**
 * Animation configuration hook for selecting optimal animation settings
 *
 * Use cases by library:
 * - **framer-motion**: Enter/exit, gestures, layout, staggered lists
 * - **react-spring**: Number counting, progress bars, physics-based values
 * - **lottie-react**: Complex visual feedback (success/error/empty states)
 * - **CSS**: Simple loops (pulse, shimmer, rotate)
 */

export type AnimationUseCase =
  | 'enter-exit'       // Page transitions, modals, tooltips
  | 'gesture'          // Hover, tap, drag interactions
  | 'list-stagger'     // Staggered list items
  | 'layout'           // Layout animations (reordering, resize)
  | 'number'           // Counting numbers
  | 'progress'         // Progress bars, loading
  | 'feedback'         // Success/error/warning states
  | 'empty-state'      // Empty state illustrations
  | 'loop'             // Continuous animations (pulse, spin)
  | 'validation';      // Form validation (shake)

export type AnimationIntensity = 'subtle' | 'normal' | 'expressive';

export interface AnimationConfig {
  library: 'framer-motion' | 'react-spring' | 'lottie' | 'css';
  enabled: boolean;
  duration: number;
  spring?: {
    stiffness: number;
    damping: number;
    mass?: number;
  };
  tween?: {
    ease: string;
    duration: number;
  };
}

// Optimal configurations per use case
const ANIMATION_CONFIGS: Record<AnimationUseCase, Omit<AnimationConfig, 'enabled'>> = {
  'enter-exit': {
    library: 'framer-motion',
    duration: 200,
    spring: { stiffness: 400, damping: 30 },
  },
  gesture: {
    library: 'framer-motion',
    duration: 150,
    spring: { stiffness: 500, damping: 30 },
  },
  'list-stagger': {
    library: 'framer-motion',
    duration: 300,
    tween: { ease: 'easeOut', duration: 0.3 },
  },
  layout: {
    library: 'framer-motion',
    duration: 250,
    spring: { stiffness: 300, damping: 25 },
  },
  number: {
    library: 'react-spring',
    duration: 1000,
    spring: { stiffness: 100, damping: 20, mass: 1 },
  },
  progress: {
    library: 'react-spring',
    duration: 600,
    spring: { stiffness: 120, damping: 14 },
  },
  feedback: {
    library: 'lottie',
    duration: 1500,
  },
  'empty-state': {
    library: 'lottie',
    duration: 2000,
  },
  loop: {
    library: 'css',
    duration: 1500,
  },
  validation: {
    library: 'framer-motion',
    duration: 400,
    spring: { stiffness: 600, damping: 15 },
  },
};

// Intensity multipliers
const INTENSITY_MULTIPLIERS: Record<AnimationIntensity, number> = {
  subtle: 0.6,
  normal: 1,
  expressive: 1.4,
};

export interface UseAnimationConfigOptions {
  useCase: AnimationUseCase;
  intensity?: AnimationIntensity;
}

export interface UseAnimationConfigResult {
  /** Whether animations are enabled (respects reduced motion) */
  enabled: boolean;
  /** Recommended library for this use case */
  library: AnimationConfig['library'];
  /** Animation duration in ms */
  duration: number;
  /** Framer-motion spring config */
  framerSpring: {
    type: 'spring';
    stiffness: number;
    damping: number;
  } | {
    type: 'tween';
    ease: string;
    duration: number;
  };
  /** React-spring config */
  reactSpringConfig: { tension: number; friction: number; mass?: number };
  /** CSS animation duration string */
  cssDuration: string;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
}

/**
 * Hook to get optimal animation configuration based on use case
 *
 * @example
 * ```tsx
 * const { enabled, framerSpring, duration } = useAnimationConfig({
 *   useCase: 'enter-exit',
 *   intensity: 'normal'
 * });
 *
 * return (
 *   <motion.div
 *     animate={{ opacity: enabled ? 1 : 0 }}
 *     transition={framerSpring}
 *   />
 * );
 * ```
 */
export function useAnimationConfig({
  useCase,
  intensity = 'normal',
}: UseAnimationConfigOptions): UseAnimationConfigResult {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const config = ANIMATION_CONFIGS[useCase];
  const multiplier = INTENSITY_MULTIPLIERS[intensity];

  const enabled = !prefersReducedMotion;
  const duration = Math.round(config.duration * multiplier);

  // Build framer-motion transition config
  const framerSpring = config.spring
    ? {
        type: 'spring' as const,
        stiffness: config.spring.stiffness * multiplier,
        damping: config.spring.damping,
      }
    : {
        type: 'tween' as const,
        ease: config.tween?.ease ?? 'easeOut',
        duration: (config.tween?.duration ?? 0.3) * multiplier,
      };

  // Build react-spring config
  const reactSpringConfig = config.spring
    ? {
        tension: config.spring.stiffness * multiplier,
        friction: config.spring.damping * 1.5,
        mass: config.spring.mass ?? 1,
      }
    : springConfig.gentle;

  return {
    enabled,
    library: config.library,
    duration,
    framerSpring,
    reactSpringConfig,
    cssDuration: `${duration}ms`,
    prefersReducedMotion,
  };
}

/**
 * Pre-built animation presets for common patterns
 */
export const animationPresets = {
  /** Modal enter/exit */
  modal: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  /** Toast notification */
  toast: {
    initial: { opacity: 0, x: 50, scale: 0.9 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 50, scale: 0.9 },
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },

  /** Dropdown menu */
  dropdown: {
    initial: { opacity: 0, y: -10, scaleY: 0.95 },
    animate: { opacity: 1, y: 0, scaleY: 1 },
    exit: { opacity: 0, y: -5, scaleY: 0.95 },
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },

  /** Tooltip */
  tooltip: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.15 },
  },

  /** List item stagger */
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },

  /** Card hover */
  cardHover: {
    whileHover: { y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)' },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },

  /** Button tap */
  buttonTap: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },

  /** Shake (validation error) */
  shake: {
    animate: { x: [-10, 10, -10, 10, 0] },
    transition: { duration: 0.4 },
  },

  /** Pulse (attention) */
  pulse: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 0.6, repeat: Infinity },
  },

  /** Fade in */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },

  /** Slide up */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },

  /** Page transition */
  page: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },

  /** Stagger container */
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },
} as const;

/**
 * Spring configs for react-spring
 */
export const springConfigs = {
  /** Gentle, smooth motion */
  gentle: springConfig.gentle,

  /** Snappy, responsive motion */
  snappy: { tension: 400, friction: 25 },

  /** Bouncy, playful motion */
  bouncy: { tension: 200, friction: 12 },

  /** Stiff, precise motion */
  stiff: { tension: 500, friction: 30 },

  /** Number counting */
  counting: { tension: 120, friction: 14 },

  /** Progress bars */
  progress: { tension: 280, friction: 20 },
} as const;

export default useAnimationConfig;
