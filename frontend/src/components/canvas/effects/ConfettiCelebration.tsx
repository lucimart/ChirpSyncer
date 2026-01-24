'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import { CanvasContainer, type CanvasContainerRef } from '../core/CanvasContainer';
import { ParticleSystem } from './ParticleSystem';

export interface ConfettiCelebrationProps {
  /** Whether the celebration is active */
  active: boolean;
  /** Duration in ms before auto-stopping (default: 3000) */
  duration?: number;
  /** Number of particles to emit (default: 150) */
  particleCount?: number;
  /** Callback when celebration ends */
  onComplete?: () => void;
  /** Custom color palette */
  colors?: string[];
  /** Origin point (default: center-top) */
  origin?: { x: number; y: number } | 'center' | 'center-top' | 'left' | 'right';
  /** Spread pattern */
  spread?: 'burst' | 'fountain' | 'cannon';
  /** Z-index for overlay (default: 1000) */
  zIndex?: number;
  /** Test ID */
  'data-testid'?: string;
}

const Overlay = styled.div<{ $zIndex: number }>`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: ${({ $zIndex }) => $zIndex};
`;

const CONFETTI_COLORS = [
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#96CEB4', // Sage green
  '#FFEAA7', // Pale yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Warm yellow
  '#BB8FCE', // Light purple
  '#85C1E9', // Light blue
];

/**
 * Full-screen confetti celebration effect
 *
 * @example
 * ```tsx
 * const [showConfetti, setShowConfetti] = useState(false);
 *
 * // Trigger on success
 * const handleSuccess = () => setShowConfetti(true);
 *
 * return (
 *   <>
 *     <ConfettiCelebration
 *       active={showConfetti}
 *       onComplete={() => setShowConfetti(false)}
 *     />
 *     <Button onClick={handleSuccess}>Complete Sync</Button>
 *   </>
 * );
 * ```
 */
export function ConfettiCelebration({
  active,
  duration = 3000,
  particleCount = 150,
  onComplete,
  colors = CONFETTI_COLORS,
  origin = 'center-top',
  spread = 'burst',
  zIndex = 1000,
  'data-testid': testId,
}: ConfettiCelebrationProps) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<CanvasContainerRef>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize particle system
  useEffect(() => {
    particleSystemRef.current = new ParticleSystem({
      gravity: 0.15,
      drag: 0.02,
    });

    return () => {
      particleSystemRef.current?.clear();
    };
  }, []);

  // Calculate origin point
  const getOriginPoint = useCallback((): { x: number; y: number } => {
    if (typeof origin === 'object') {
      return origin;
    }

    const { width, height } = dimensions;
    if (width === 0) return { x: 0, y: 0 };

    switch (origin) {
      case 'center':
        return { x: width / 2, y: height / 2 };
      case 'center-top':
        return { x: width / 2, y: height * 0.2 };
      case 'left':
        return { x: 0, y: height / 2 };
      case 'right':
        return { x: width, y: height / 2 };
      default:
        return { x: width / 2, y: height * 0.2 };
    }
  }, [origin, dimensions]);

  // Get spread config based on pattern
  const getSpreadConfig = useCallback(() => {
    switch (spread) {
      case 'fountain':
        return {
          angle: -Math.PI / 2, // Up
          spread: Math.PI / 3, // 60 degrees
          speed: { min: 8, max: 15 },
        };
      case 'cannon':
        return {
          angle: -Math.PI / 4, // Up-right
          spread: Math.PI / 6, // 30 degrees
          speed: { min: 10, max: 18 },
        };
      case 'burst':
      default:
        return {
          angle: -Math.PI / 2, // Up
          spread: Math.PI, // 180 degrees (hemisphere)
          speed: { min: 5, max: 12 },
        };
    }
  }, [spread]);

  // Trigger celebration
  useEffect(() => {
    if (!active || prefersReducedMotion || dimensions.width === 0) return;

    const ps = particleSystemRef.current;
    if (!ps) return;

    setIsRunning(true);

    const originPoint = getOriginPoint();
    const spreadConfig = getSpreadConfig();

    // Burst particles
    ps.burst({
      x: originPoint.x,
      y: originPoint.y,
      count: particleCount,
      colors,
      shapes: ['square', 'circle', 'triangle'],
      size: { min: 8, max: 16 },
      life: { min: 2000, max: 4000 },
      ...spreadConfig,
    });

    // Auto-stop after duration
    const timeoutId = setTimeout(() => {
      setIsRunning(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    active,
    prefersReducedMotion,
    dimensions,
    particleCount,
    colors,
    duration,
    getOriginPoint,
    getSpreadConfig,
    onComplete,
  ]);

  // Check if animation is complete
  useEffect(() => {
    if (!isRunning) return;

    const checkComplete = setInterval(() => {
      const ps = particleSystemRef.current;
      if (ps && !ps.isActive()) {
        setIsRunning(false);
        onComplete?.();
      }
    }, 100);

    return () => clearInterval(checkComplete);
  }, [isRunning, onComplete]);

  // Draw callback
  const handleDraw = useCallback(
    (ctx: CanvasRenderingContext2D, deltaTime: number) => {
      const ps = particleSystemRef.current;
      if (!ps) return;

      // Clear canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Update and draw particles
      ps.update(deltaTime);
      ps.draw(ctx);
    },
    []
  );

  // Handle resize
  const handleResize = useCallback((width: number, height: number) => {
    setDimensions({ width, height });
  }, []);

  // Don't render if reduced motion preferred or not active
  if (prefersReducedMotion || (!active && !isRunning)) {
    return null;
  }

  return (
    <Overlay $zIndex={zIndex} data-testid={testId} aria-hidden="true">
      <CanvasContainer
        ref={canvasRef}
        width="100%"
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        running={isRunning}
        onDraw={handleDraw}
        onResize={handleResize}
        ariaLabel="Celebration animation"
        ariaDescription="Colorful confetti particles celebrating a successful action"
      />
    </Overlay>
  );
}

export default ConfettiCelebration;
