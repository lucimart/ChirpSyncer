'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export interface AnimationLoopOptions {
  /** Target FPS (default: 60) */
  fps?: number;
  /** Whether the loop is running */
  running?: boolean;
  /** Callback called each frame with delta time in ms */
  onFrame: (deltaTime: number, elapsedTime: number) => void;
}

export interface AnimationLoopControls {
  /** Start the animation loop */
  start: () => void;
  /** Stop the animation loop */
  stop: () => void;
  /** Whether the loop is currently running */
  isRunning: boolean;
}

/**
 * Hook for managing a requestAnimationFrame loop with FPS control
 *
 * @example
 * ```tsx
 * const { start, stop } = useAnimationLoop({
 *   fps: 60,
 *   running: true,
 *   onFrame: (delta, elapsed) => {
 *     // Update animation state
 *     ctx.clearRect(0, 0, width, height);
 *     drawParticles(elapsed);
 *   }
 * });
 * ```
 */
export function useAnimationLoop({
  fps = 60,
  running = true,
  onFrame,
}: AnimationLoopOptions): AnimationLoopControls {
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isRunningRef = useRef(running);
  const frameInterval = 1000 / fps;

  // Store callback in ref to avoid re-creating loop
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const loop = useCallback((currentTime: number) => {
    if (!isRunningRef.current) return;

    // Initialize start time on first frame
    if (startTimeRef.current === 0) {
      startTimeRef.current = currentTime;
      lastTimeRef.current = currentTime;
    }

    const deltaTime = currentTime - lastTimeRef.current;

    // FPS throttling
    if (deltaTime >= frameInterval) {
      const elapsedTime = currentTime - startTimeRef.current;
      onFrameRef.current(deltaTime, elapsedTime);
      lastTimeRef.current = currentTime - (deltaTime % frameInterval);
    }

    frameRef.current = requestAnimationFrame(loop);
  }, [frameInterval]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    startTimeRef.current = 0;
    lastTimeRef.current = 0;
    frameRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  // Handle running prop changes
  useEffect(() => {
    // Skip animations if user prefers reduced motion
    if (prefersReducedMotion) {
      // Call once with 0 delta for static render
      onFrameRef.current(0, 0);
      return;
    }

    if (running) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [running, prefersReducedMotion, start, stop]);

  return {
    start,
    stop,
    isRunning: isRunningRef.current,
  };
}

export default useAnimationLoop;
