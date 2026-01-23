'use client';

import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import { CanvasContainer, type CanvasContainerRef } from '../core';

export interface PostDataPoint {
  x: number; // 0-1 normalized position (e.g., time)
  y: number; // 0-1 normalized position (e.g., engagement)
  weight?: number; // Optional intensity multiplier
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface PostDensityMapProps {
  /** Data points to visualize */
  data: PostDataPoint[];
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Heatmap radius for each point */
  radius?: number;
  /** Maximum intensity value (for normalization) */
  maxIntensity?: number;
  /** Color gradient stops (low to high intensity) */
  colorStops?: Array<{ offset: number; color: string }>;
  /** Show grid overlay */
  showGrid?: boolean;
  /** Grid cell size */
  gridSize?: number;
  /** Called when a region is clicked */
  onRegionClick?: (x: number, y: number, pointsInRegion: PostDataPoint[]) => void;
  /** Called when hovering over region */
  onRegionHover?: (x: number, y: number, pointsInRegion: PostDataPoint[] | null) => void;
  /** X-axis label */
  xLabel?: string;
  /** Y-axis label */
  yLabel?: string;
  /** CSS class name */
  className?: string;
  /** Accessibility label */
  ariaLabel?: string;
}

export interface PostDensityMapRef {
  /** Force redraw */
  redraw: () => void;
  /** Get points in a region */
  getPointsInRegion: (x: number, y: number, radius: number) => PostDataPoint[];
  /** Highlight a specific region */
  highlightRegion: (x: number, y: number, radius: number) => void;
  /** Clear highlight */
  clearHighlight: () => void;
}

const Container = styled.div`
  position: relative;
`;

const AxisLabel = styled.span<{ $position: 'x' | 'y' }>`
  position: absolute;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};

  ${({ $position }) =>
    $position === 'x'
      ? `
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
  `
      : `
    left: 4px;
    top: 50%;
    transform: rotate(-90deg) translateX(-50%);
    transform-origin: left center;
  `}
`;

// Default color gradient (blue to red)
const DEFAULT_COLOR_STOPS = [
  { offset: 0, color: 'rgba(0, 0, 255, 0)' },
  { offset: 0.2, color: 'rgba(0, 0, 255, 0.5)' },
  { offset: 0.4, color: 'rgba(0, 255, 255, 0.7)' },
  { offset: 0.6, color: 'rgba(0, 255, 0, 0.8)' },
  { offset: 0.8, color: 'rgba(255, 255, 0, 0.9)' },
  { offset: 1, color: 'rgba(255, 0, 0, 1)' },
];

// Parse color string to RGBA
function parseColor(color: string): [number, number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      match[4] ? parseFloat(match[4]) : 1,
    ];
  }
  return [0, 0, 0, 0];
}

// Interpolate between colors
function interpolateColor(
  stops: Array<{ offset: number; color: string }>,
  t: number
): [number, number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clampedT >= stops[i].offset && clampedT <= stops[i + 1].offset) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper.offset - lower.offset;
  const localT = range === 0 ? 0 : (clampedT - lower.offset) / range;

  const lowerColor = parseColor(lower.color);
  const upperColor = parseColor(upper.color);

  return [
    Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * localT),
    Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * localT),
    Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * localT),
    lowerColor[3] + (upperColor[3] - lowerColor[3]) * localT,
  ];
}

/**
 * High-performance heatmap visualization for 10k+ data points
 * Uses pre-computed density grid and efficient Canvas 2D rendering
 */
export const PostDensityMap = memo(
  forwardRef<PostDensityMapRef, PostDensityMapProps>(
    function PostDensityMap(
      {
        data,
        width,
        height,
        radius = 20,
        maxIntensity,
        colorStops = DEFAULT_COLOR_STOPS,
        showGrid = false,
        gridSize = 50,
        onRegionClick,
        onRegionHover,
        xLabel,
        yLabel,
        className,
        ariaLabel = 'Post density heatmap',
      },
      ref
    ) {
      const canvasRef = useRef<CanvasContainerRef>(null);
      const densityGridRef = useRef<Float32Array | null>(null);
      const highlightRef = useRef<{ x: number; y: number; radius: number } | null>(null);

      const prefersReducedMotion = useReducedMotion();

      // Grid dimensions for density calculation
      const gridWidth = Math.ceil(width / 4);
      const gridHeight = Math.ceil(height / 4);

      // Compute density grid from data points
      const computeDensityGrid = useCallback(() => {
        const grid = new Float32Array(gridWidth * gridHeight);
        const radiusInGrid = radius / 4;
        const radiusSq = radiusInGrid * radiusInGrid;

        data.forEach((point) => {
          const centerX = point.x * gridWidth;
          const centerY = (1 - point.y) * gridHeight; // Flip Y for canvas
          const weight = point.weight ?? 1;

          // Only iterate over cells within radius
          const minX = Math.max(0, Math.floor(centerX - radiusInGrid));
          const maxX = Math.min(gridWidth - 1, Math.ceil(centerX + radiusInGrid));
          const minY = Math.max(0, Math.floor(centerY - radiusInGrid));
          const maxY = Math.min(gridHeight - 1, Math.ceil(centerY + radiusInGrid));

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const dx = x - centerX;
              const dy = y - centerY;
              const distSq = dx * dx + dy * dy;

              if (distSq < radiusSq) {
                // Gaussian falloff
                const intensity = Math.exp(-distSq / (radiusSq * 0.5)) * weight;
                grid[y * gridWidth + x] += intensity;
              }
            }
          }
        });

        densityGridRef.current = grid;
        return grid;
      }, [data, gridWidth, gridHeight, radius]);

      // Find max intensity for normalization
      const actualMaxIntensity = useMemo(() => {
        if (maxIntensity) return maxIntensity;
        const grid = computeDensityGrid();
        let max = 0;
        for (let i = 0; i < grid.length; i++) {
          if (grid[i] > max) max = grid[i];
        }
        return max || 1;
      }, [computeDensityGrid, maxIntensity]);

      // Draw the heatmap
      const onDraw = useCallback(
        (ctx: CanvasRenderingContext2D) => {
          const grid = densityGridRef.current;
          if (!grid) return;

          // Clear
          ctx.clearRect(0, 0, width, height);

          // Create image data for efficient pixel manipulation
          const imageData = ctx.createImageData(gridWidth, gridHeight);
          const pixels = imageData.data;

          for (let i = 0; i < grid.length; i++) {
            const intensity = grid[i] / actualMaxIntensity;
            const [r, g, b, a] = interpolateColor(colorStops, intensity);

            const pixelIndex = i * 4;
            pixels[pixelIndex] = r;
            pixels[pixelIndex + 1] = g;
            pixels[pixelIndex + 2] = b;
            pixels[pixelIndex + 3] = Math.round(a * 255);
          }

          // Draw scaled up
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = gridWidth;
          tempCanvas.height = gridHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(tempCanvas, 0, 0, width, height);
          }

          // Draw grid overlay
          if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;

            for (let x = gridSize; x < width; x += gridSize) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }

            for (let y = gridSize; y < height; y += gridSize) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
          }

          // Draw highlight
          const highlight = highlightRef.current;
          if (highlight) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(highlight.x, highlight.y, highlight.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        },
        [width, height, gridWidth, gridHeight, colorStops, actualMaxIntensity, showGrid, gridSize]
      );

      // Recompute grid when data changes
      useEffect(() => {
        computeDensityGrid();
        canvasRef.current?.redraw();
      }, [computeDensityGrid]);

      // Get points in a region
      const getPointsInRegion = useCallback(
        (x: number, y: number, regionRadius: number): PostDataPoint[] => {
          const normalizedX = x / width;
          const normalizedY = 1 - y / height; // Flip Y
          const normalizedRadius = regionRadius / Math.min(width, height);

          return data.filter((point) => {
            const dx = point.x - normalizedX;
            const dy = point.y - normalizedY;
            return dx * dx + dy * dy <= normalizedRadius * normalizedRadius;
          });
        },
        [data, width, height]
      );

      // Handle clicks
      const handleClick = useCallback(
        (x: number, y: number) => {
          if (!onRegionClick) return;
          const points = getPointsInRegion(x, y, radius);
          onRegionClick(x / width, 1 - y / height, points);
        },
        [onRegionClick, getPointsInRegion, radius, width, height]
      );

      // Handle mouse move
      const handleMouseMove = useCallback(
        (x: number, y: number) => {
          if (!onRegionHover) return;
          const points = getPointsInRegion(x, y, radius);
          onRegionHover(x / width, 1 - y / height, points.length > 0 ? points : null);
        },
        [onRegionHover, getPointsInRegion, radius, width, height]
      );

      // Handle mouse leave
      const handleMouseLeave = useCallback(() => {
        onRegionHover?.(0, 0, null);
      }, [onRegionHover]);

      // Expose imperative methods
      useImperativeHandle(
        ref,
        () => ({
          redraw: () => canvasRef.current?.redraw(),
          getPointsInRegion,
          highlightRegion: (x: number, y: number, regionRadius: number) => {
            highlightRef.current = { x, y, radius: regionRadius };
            canvasRef.current?.redraw();
          },
          clearHighlight: () => {
            highlightRef.current = null;
            canvasRef.current?.redraw();
          },
        }),
        [getPointsInRegion]
      );

      return (
        <Container className={className} style={{ width, height }}>
          <CanvasContainer
            ref={canvasRef}
            width={width}
            height={height}
            fps={prefersReducedMotion ? 1 : 30}
            running={false} // Static render, we control redraws
            onDraw={onDraw}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            ariaLabel={ariaLabel}
            ariaDescription={`Heatmap visualization of ${data.length} data points`}
          />
          {xLabel && <AxisLabel $position="x">{xLabel}</AxisLabel>}
          {yLabel && <AxisLabel $position="y">{yLabel}</AxisLabel>}
        </Container>
      );
    }
  )
);

export default PostDensityMap;
