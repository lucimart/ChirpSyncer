'use client';

/**
 * Framer Motion Animation Components
 *
 * Reusable animation components and variants for consistent micro-interactions.
 */

import { forwardRef, type FC, type ReactNode, type ComponentPropsWithRef } from 'react';
import { motion, type Variants, type Transition, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// ============================================================================
// Animation Variants
// ============================================================================

/** Fade in/out animation */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Slide up with fade */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

/** Slide down with fade */
export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

/** Slide in from left */
export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

/** Slide in from right */
export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/** Scale up animation */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/** Pop animation for attention */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.8 },
};

/** Staggered children animation */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/** Item for staggered lists */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
  exit: { opacity: 0, y: -10 },
};

// ============================================================================
// Transitions
// ============================================================================

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

export const fastTransition: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15,
};

// ============================================================================
// Hover/Tap Props
// ============================================================================

/** Standard button hover/tap effect */
export const buttonMotionProps = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: fastTransition,
};

/** Card hover effect with lift */
export const cardMotionProps = {
  whileHover: {
    y: -4,
    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
  },
  transition: smoothTransition,
};

/** Icon button hover effect */
export const iconButtonMotionProps = {
  whileHover: { scale: 1.1 },
  whileTap: { scale: 0.9 },
  transition: springTransition,
};

/** List item hover effect */
export const listItemMotionProps = {
  whileHover: { x: 4, backgroundColor: 'rgba(0, 0, 0, 0.02)' },
  transition: fastTransition,
};

// ============================================================================
// Motion Components
// ============================================================================

const MotionDivBase = styled(motion.div)``;

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/** Fade in animation wrapper */
export const FadeIn: FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 0.3,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ delay, duration, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

interface SlideInProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

/** Slide in animation wrapper */
export const SlideIn: FC<SlideInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.3,
  className,
}) => {
  const variants = {
    up: slideUpVariants,
    down: slideDownVariants,
    left: slideLeftVariants,
    right: slideRightVariants,
  }[direction];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      transition={{ delay, duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Scale in with spring animation */
export const ScaleIn: FC<ScaleInProps> = ({ children, delay = 0, className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{
      delay,
      type: 'spring',
      stiffness: 300,
      damping: 25,
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}

/** Staggered list container - children should use StaggerItem */
export const StaggerList: FC<StaggerListProps> = ({ children, className }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    exit="exit"
    variants={staggerContainerVariants}
    className={className}
  >
    {children}
  </motion.div>
);

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/** Staggered list item - use inside StaggerList */
export const StaggerItem: FC<StaggerItemProps> = ({ children, className }) => (
  <motion.div variants={staggerItemVariants} className={className}>
    {children}
  </motion.div>
);

interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  show: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
}

/** Conditional animation wrapper */
export const AnimatedPresenceWrapper: FC<AnimatedPresenceWrapperProps> = ({
  children,
  show,
  mode = 'wait',
}) => (
  <AnimatePresence mode={mode}>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={smoothTransition}
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

interface PulseProps {
  children: ReactNode;
  className?: string;
}

/** Pulsing attention animation */
export const Pulse: FC<PulseProps> = ({ children, className }) => (
  <motion.div
    animate={{
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface ShakeProps {
  children: ReactNode;
  trigger?: boolean;
  className?: string;
}

/** Shake animation for errors/attention */
export const Shake: FC<ShakeProps> = ({ children, trigger = false, className }) => (
  <motion.div
    animate={trigger ? { x: [-10, 10, -10, 10, 0] } : {}}
    transition={{ duration: 0.4 }}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================================================
// Animated Button Component
// ============================================================================

const AnimatedButtonBase = styled(motion.button)`
  cursor: pointer;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

interface AnimatedButtonProps extends ComponentPropsWithRef<typeof motion.button> {
  children: ReactNode;
}

/** Button with built-in hover/tap animations */
export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  function AnimatedButton({ children, ...props }, ref) {
    return (
      <AnimatedButtonBase
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={fastTransition}
        {...props}
      >
        {children}
      </AnimatedButtonBase>
    );
  }
);

// ============================================================================
// Animated Card Component
// ============================================================================

const AnimatedCardBase = styled(motion.div)`
  transition: box-shadow 0.2s ease;
`;

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Card with hover lift animation */
export const AnimatedCard: FC<AnimatedCardProps> = ({
  children,
  className,
  onClick,
}) => (
  <AnimatedCardBase
    whileHover={{
      y: -4,
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
    }}
    transition={smoothTransition}
    className={className}
    onClick={onClick}
  >
    {children}
  </AnimatedCardBase>
);

// ============================================================================
// Skeleton Loading Animation
// ============================================================================

const SkeletonBase = styled(motion.div)<{ $width?: string; $height?: string }>`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.background.tertiary} 25%,
    ${({ theme }) => theme.colors.background.secondary} 50%,
    ${({ theme }) => theme.colors.background.tertiary} 75%
  );
  background-size: 200% 100%;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
`;

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

/** Animated skeleton loader */
export const Skeleton: FC<SkeletonProps> = ({ width, height, className }) => (
  <SkeletonBase
    $width={width}
    $height={height}
    className={className}
    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    }}
  />
);

// ============================================================================
// Number Counter Animation
// ============================================================================

interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}

/** Animated number counter */
export const Counter: FC<CounterProps> = ({
  from = 0,
  to,
  duration = 1,
  className,
}) => {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {to}
      </motion.span>
    </motion.span>
  );
};

// ============================================================================
// Re-exports from Framer Motion
// ============================================================================

export { motion, AnimatePresence } from 'framer-motion';
export type { Variants, Transition } from 'framer-motion';
