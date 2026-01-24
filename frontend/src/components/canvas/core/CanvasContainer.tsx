'use client';

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styled from 'styled-components';
import { useAnimationLoop } from './useAnimationLoop';

export interface CanvasContainerProps {
  /** Width in pixels or '100%' for responsive */
  width?: number | '100%';
  /** Height in pixels */
  height?: number;
  /** Target FPS (default: 60) */
  fps?: number;
  /** Device pixel ratio for retina displays (default: auto) */
  pixelRatio?: number;
  /** Whether animation loop is running */
  running?: boolean;
  /** Draw callback - called each frame */
  onDraw: (ctx: CanvasRenderingContext2D, deltaTime: number, elapsedTime: number) => void;
  /** Called when canvas is resized */
  onResize?: (width: number, height: number) => void;
  /** Called on canvas click with coordinates */
  onClick?: (x: number, y: number, event: React.MouseEvent) => void;
  /** Called on mouse move with coordinates */
  onMouseMove?: (x: number, y: number, event: React.MouseEvent) => void;
  /** Called when mouse leaves canvas */
  onMouseLeave?: () => void;
  /** Accessibility label (required) */
  ariaLabel: string;
  /** Extended accessibility description */
  ariaDescription?: string;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

export interface CanvasContainerRef {
  /** Get the canvas element */
  getCanvas: () => HTMLCanvasElement | null;
  /** Get the 2D rendering context */
  getContext: () => CanvasRenderingContext2D | null;
  /** Get current dimensions */
  getDimensions: () => { width: number; height: number };
  /** Force a redraw */
  redraw: () => void;
}

const Container = styled.div<{ $width: number | '100%'; $height: number }>`
  position: relative;
  width: ${({ $width }) => (typeof $width === 'number' ? `${$width}px` : $width)};
  height: ${({ $height }) => $height}px;
  overflow: hidden;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;

const Description = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/**
 * React wrapper for Canvas 2D with animation loop, resize handling, and accessibility
 *
 * @example
 * ```tsx
 * <CanvasContainer
 *   width="100%"
 *   height={400}
 *   ariaLabel="Particle animation"
 *   onDraw={(ctx, delta, elapsed) => {
 *     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
 *     drawParticles(ctx, elapsed);
 *   }}
 * />
 * ```
 */
export const CanvasContainer = forwardRef<CanvasContainerRef, CanvasContainerProps>(
  function CanvasContainer(
    {
      width = '100%',
      height = 300,
      fps = 60,
      pixelRatio,
      running = true,
      onDraw,
      onResize,
      onClick,
      onMouseMove,
      onMouseLeave,
      ariaLabel,
      ariaDescription,
      className,
      'data-testid': testId,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const descriptionId = React.useId();

    // Get actual pixel ratio
    const dpr = pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);

    // Setup canvas and context
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) {
        console.error('CanvasContainer: Failed to get 2D context');
        return;
      }

      ctxRef.current = ctx;
    }, []);

    // Handle resize
    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: containerWidth, height: containerHeight } = entry.contentRect;

          // Set actual canvas dimensions (accounting for pixel ratio)
          canvas.width = containerWidth * dpr;
          canvas.height = containerHeight * dpr;

          // Scale context for retina
          const ctx = ctxRef.current;
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          }

          setDimensions({
            width: containerWidth,
            height: containerHeight,
          });

          onResize?.(containerWidth, containerHeight);
        }
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, [dpr, onResize]);

    // Store onDraw in ref to avoid re-creating animation loop
    const onDrawRef = useRef(onDraw);
    onDrawRef.current = onDraw;

    // Animation loop
    useAnimationLoop({
      fps,
      running: running && dimensions.width > 0,
      onFrame: useCallback((deltaTime, elapsedTime) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        onDrawRef.current(ctx, deltaTime, elapsedTime);
      }, []),
    });

    // Get coordinates relative to canvas
    const getCoordinates = useCallback(
      (event: React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      },
      []
    );

    // Event handlers
    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (!onClick) return;
        const { x, y } = getCoordinates(event);
        onClick(x, y, event);
      },
      [onClick, getCoordinates]
    );

    const handleMouseMove = useCallback(
      (event: React.MouseEvent) => {
        if (!onMouseMove) return;
        const { x, y } = getCoordinates(event);
        onMouseMove(x, y, event);
      },
      [onMouseMove, getCoordinates]
    );

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        getCanvas: () => canvasRef.current,
        getContext: () => ctxRef.current,
        getDimensions: () => dimensions,
        redraw: () => {
          const ctx = ctxRef.current;
          if (ctx) {
            onDrawRef.current(ctx, 0, 0);
          }
        },
      }),
      [dimensions]
    );

    return (
      <Container
        ref={containerRef}
        $width={width}
        $height={height}
        className={className}
        data-testid={testId}
      >
        <Canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={ariaDescription ? descriptionId : undefined}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={onMouseLeave}
        />
        {ariaDescription && (
          <Description id={descriptionId}>{ariaDescription}</Description>
        )}
      </Container>
    );
  }
);

export default CanvasContainer;
