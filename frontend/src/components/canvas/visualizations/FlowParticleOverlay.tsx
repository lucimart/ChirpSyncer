'use client';

import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import { useAnimationLoop } from '../core';

export interface FlowEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  active: boolean;
}

export interface FlowParticle {
  x: number;
  y: number;
  progress: number;
  speed: number;
  size: number;
  alpha: number;
  edgeId: string;
}

export interface FlowParticleOverlayProps {
  /** Edges to animate particles along */
  edges: FlowEdge[];
  /** Whether the overlay is active */
  active?: boolean;
  /** Number of particles per active edge */
  particlesPerEdge?: number;
  /** Particle speed (0-1, where 1 = full edge in 1 second) */
  speed?: number;
  /** Particle size in pixels */
  particleSize?: number;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** CSS class name */
  className?: string;
}

export interface FlowParticleOverlayRef {
  /** Force redraw */
  redraw: () => void;
  /** Burst particles on an edge */
  burstOnEdge: (edgeId: string, count?: number) => void;
}

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
`;

// Calculate point on bezier curve
function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// Get bezier control points for an edge (simplified curve)
function getControlPoints(edge: FlowEdge) {
  const dx = edge.targetX - edge.sourceX;
  const dy = edge.targetY - edge.sourceY;
  const midX = (edge.sourceX + edge.targetX) / 2;
  const midY = (edge.sourceY + edge.targetY) / 2;

  // Control points for smooth curve
  const cpOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5;
  const cp1x = edge.sourceX + dx * 0.25;
  const cp1y = edge.sourceY - cpOffset;
  const cp2x = edge.targetX - dx * 0.25;
  const cp2y = edge.targetY + cpOffset;

  return { cp1x, cp1y, cp2x, cp2y };
}

// Get position along edge at progress t (0-1)
function getPositionOnEdge(edge: FlowEdge, t: number): { x: number; y: number } {
  const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(edge);
  return {
    x: bezierPoint(t, edge.sourceX, cp1x, cp2x, edge.targetX),
    y: bezierPoint(t, edge.sourceY, cp1y, cp2y, edge.targetY),
  };
}

/**
 * Canvas overlay for animating particles along flow diagram edges
 *
 * @example
 * ```tsx
 * <FlowParticleOverlay
 *   edges={[
 *     { id: '1', sourceX: 100, sourceY: 100, targetX: 300, targetY: 200, color: '#4CAF50', active: true }
 *   ]}
 *   width={600}
 *   height={400}
 *   active={true}
 * />
 * ```
 */
export const FlowParticleOverlay = memo(
  forwardRef<FlowParticleOverlayRef, FlowParticleOverlayProps>(
    function FlowParticleOverlay(
      {
        edges,
        active = true,
        particlesPerEdge = 3,
        speed = 0.3,
        particleSize = 4,
        width,
        height,
        className,
      },
      ref
    ) {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
      const particlesRef = useRef<FlowParticle[]>([]);
      const prefersReducedMotion = useReducedMotion();

      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

      // Initialize canvas context
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctxRef.current = ctx;
        }
      }, [width, height, dpr]);

      // Initialize particles for active edges
      useEffect(() => {
        const activeEdges = edges.filter((e) => e.active);
        const particles: FlowParticle[] = [];

        activeEdges.forEach((edge) => {
          for (let i = 0; i < particlesPerEdge; i++) {
            particles.push({
              x: edge.sourceX,
              y: edge.sourceY,
              progress: i / particlesPerEdge, // Stagger start positions
              speed: speed * (0.8 + Math.random() * 0.4), // Vary speed slightly
              size: particleSize * (0.7 + Math.random() * 0.6),
              alpha: 1,
              edgeId: edge.id,
            });
          }
        });

        particlesRef.current = particles;
      }, [edges, particlesPerEdge, speed, particleSize]);

      // Animation frame handler
      const onFrame = useCallback(
        (deltaTime: number) => {
          const ctx = ctxRef.current;
          if (!ctx) return;

          // Clear canvas
          ctx.clearRect(0, 0, width, height);

          // Update and draw particles
          const edgeMap = new Map(edges.map((e) => [e.id, e]));

          particlesRef.current.forEach((particle) => {
            const edge = edgeMap.get(particle.edgeId);
            if (!edge || !edge.active) return;

            // Update progress
            particle.progress += (particle.speed * deltaTime) / 1000;
            if (particle.progress >= 1) {
              particle.progress = 0;
            }

            // Calculate position on edge
            const pos = getPositionOnEdge(edge, particle.progress);
            particle.x = pos.x;
            particle.y = pos.y;

            // Fade out near end
            particle.alpha = particle.progress < 0.8 ? 1 : 1 - (particle.progress - 0.8) / 0.2;

            // Draw particle with glow effect
            ctx.save();

            // Glow
            ctx.shadowColor = edge.color;
            ctx.shadowBlur = particle.size * 2;

            // Main particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = edge.color;
            ctx.globalAlpha = particle.alpha * 0.9;
            ctx.fill();

            // Inner bright core
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = particle.alpha * 0.7;
            ctx.fill();

            ctx.restore();
          });
        },
        [edges, width, height]
      );

      // Animation loop
      useAnimationLoop({
        fps: 30,
        running: active && !prefersReducedMotion && edges.some((e) => e.active),
        onFrame,
      });

      // Burst effect on edge
      const burstOnEdge = useCallback(
        (edgeId: string, count = 10) => {
          const edge = edges.find((e) => e.id === edgeId);
          if (!edge) return;

          for (let i = 0; i < count; i++) {
            particlesRef.current.push({
              x: edge.sourceX,
              y: edge.sourceY,
              progress: 0,
              speed: speed * (1 + Math.random()),
              size: particleSize * (0.8 + Math.random() * 0.8),
              alpha: 1,
              edgeId,
            });
          }
        },
        [edges, speed, particleSize]
      );

      // Expose imperative methods
      useImperativeHandle(
        ref,
        () => ({
          redraw: () => onFrame(0),
          burstOnEdge,
        }),
        [onFrame, burstOnEdge]
      );

      // Don't render if reduced motion preferred
      if (prefersReducedMotion) {
        return null;
      }

      return (
        <Canvas
          ref={canvasRef}
          className={className}
          width={width * dpr}
          height={height * dpr}
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
          aria-hidden="true"
        />
      );
    }
  )
);

export default FlowParticleOverlay;
