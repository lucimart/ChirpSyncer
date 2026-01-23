'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';

// Lazy load lottie-react for bundle optimization
const Lottie = lazy(() => import('lottie-react'));

export type LottieAnimationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'loading'
  | 'empty'
  | 'sync-complete'
  | 'confetti'
  | 'search-empty'
  | 'no-data'
  | 'upload'
  | 'notification';

export interface LottieAnimationProps {
  /** Animation type or custom animation data */
  animation: LottieAnimationType | object;
  /** Size in pixels (square) */
  size?: number;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Whether to autoplay */
  autoplay?: boolean;
  /** Playback speed (1 = normal) */
  speed?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback when animation loops */
  onLoopComplete?: () => void;
  /** Custom className */
  className?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const Container = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FallbackIcon = styled.div<{ $size: number; $type: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $size }) => $size * 0.5}px;
  color: ${({ theme, $type }) => {
    switch ($type) {
      case 'success':
      case 'sync-complete':
        return theme.colors.success[500];
      case 'error':
        return theme.colors.danger[500];
      case 'warning':
        return theme.colors.warning[500];
      default:
        return theme.colors.text.secondary;
    }
  }};
`;

// Simple inline animations as fallback JSON data
// These are minimal Lottie-compatible JSON structures
const BUILTIN_ANIMATIONS: Record<LottieAnimationType, object> = {
  success: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [
      {
        ty: 4,
        nm: 'check',
        ip: 0,
        op: 60,
        ks: {
          o: { a: 1, k: [{ t: 0, s: [0] }, { t: 20, s: [100] }] },
          s: { a: 1, k: [{ t: 0, s: [0, 0] }, { t: 30, s: [110, 110] }, { t: 40, s: [100, 100] }] },
        },
        shapes: [
          {
            ty: 'el',
            p: { a: 0, k: [50, 50] },
            s: { a: 0, k: [80, 80] },
          },
        ],
      },
    ],
  },
  error: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [
      {
        ty: 4,
        nm: 'x',
        ip: 0,
        op: 60,
        ks: {
          o: { a: 1, k: [{ t: 0, s: [0] }, { t: 15, s: [100] }] },
          r: { a: 1, k: [{ t: 0, s: [0] }, { t: 20, s: [180] }] },
        },
        shapes: [],
      },
    ],
  },
  warning: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 90,
    w: 100,
    h: 100,
    layers: [],
  },
  loading: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 100,
    h: 100,
    layers: [],
  },
  empty: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [],
  },
  'sync-complete': {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 90,
    w: 100,
    h: 100,
    layers: [],
  },
  confetti: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 120,
    w: 100,
    h: 100,
    layers: [],
  },
  'search-empty': {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [],
  },
  'no-data': {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [],
  },
  upload: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 90,
    w: 100,
    h: 100,
    layers: [],
  },
  notification: {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 60,
    w: 100,
    h: 100,
    layers: [],
  },
};

const FALLBACK_ICONS: Record<LottieAnimationType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  loading: '⟳',
  empty: '📭',
  'sync-complete': '🔄',
  confetti: '🎉',
  'search-empty': '🔍',
  'no-data': '📊',
  upload: '📤',
  notification: '🔔',
};

export function LottieAnimation({
  animation,
  size = 120,
  loop = false,
  autoplay = true,
  speed = 1,
  onComplete,
  onLoopComplete,
  className,
  ariaLabel,
}: LottieAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationType = typeof animation === 'string' ? animation : null;

  const animationData = useMemo(() => {
    if (typeof animation === 'object') {
      return animation;
    }
    return BUILTIN_ANIMATIONS[animation] || BUILTIN_ANIMATIONS.empty;
  }, [animation]);

  // Show static fallback for reduced motion preference
  if (prefersReducedMotion && animationType) {
    return (
      <Container $size={size} className={className} role="img" aria-label={ariaLabel}>
        <FallbackIcon $size={size} $type={animationType}>
          {FALLBACK_ICONS[animationType]}
        </FallbackIcon>
      </Container>
    );
  }

  return (
    <Container $size={size} className={className} role="img" aria-label={ariaLabel}>
      <Suspense
        fallback={
          animationType ? (
            <FallbackIcon $size={size} $type={animationType}>
              {FALLBACK_ICONS[animationType]}
            </FallbackIcon>
          ) : null
        }
      >
        <Lottie
          animationData={animationData}
          loop={loop}
          autoplay={autoplay}
          style={{ width: size, height: size }}
          onComplete={onComplete}
          onLoopComplete={onLoopComplete}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice',
          }}
        />
      </Suspense>
    </Container>
  );
}

export default LottieAnimation;
