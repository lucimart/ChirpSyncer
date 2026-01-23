'use client';

/**
 * PageTransition Component
 *
 * Simple, fast page transition with fade-in effect.
 * Optimized for Next.js App Router performance.
 */

import { memo, type FC } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import { type PageTransitionProps } from '../types';

const MotionWrapper = styled(motion.div)`
  width: 100%;
`;

/**
 * PageTransition - Fast fade-in on route change
 */
export const PageTransition: FC<PageTransitionProps> = memo(({ children }) => {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // Skip animation entirely if user prefers reduced motion
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <MotionWrapper
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </MotionWrapper>
  );
});

PageTransition.displayName = 'PageTransition';
