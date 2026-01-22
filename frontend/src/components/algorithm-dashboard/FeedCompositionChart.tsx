/**
 * Sprint 20: Feed Composition Chart
 * Donut chart showing feed composition breakdown by segment type
 */

import React, { useState, useCallback, useMemo } from 'react';

export interface FeedComposition {
  boosted: number;
  demoted: number;
  filtered: number;
  unaffected: number;
}

export interface FeedCompositionChartProps {
  /** Feed composition data - use either `data` or `composition` */
  data?: FeedComposition;
  /** Alias for `data` - used by AlgorithmDashboard */
  composition?: FeedComposition;
  showLegend?: boolean;
  showPercentages?: boolean;
  onSegmentHover?: (segment: keyof FeedComposition | null) => void;
  onSegmentClick?: (segment: keyof FeedComposition) => void;
}

interface SegmentConfig {
  key: keyof FeedComposition;
  label: string;
  color: string;
}

const SEGMENT_CONFIGS: SegmentConfig[] = [
  { key: 'boosted', label: 'Boosted', color: '#22c55e' },
  { key: 'demoted', label: 'Demoted', color: '#f97316' },
  { key: 'filtered', label: 'Filtered', color: '#ef4444' },
  { key: 'unaffected', label: 'Unaffected', color: '#9ca3af' },
];

const SVG_SIZE = 200;
const CENTER = SVG_SIZE / 2;
const OUTER_RADIUS = 80;
const INNER_RADIUS = 50;

interface ArcPath {
  key: keyof FeedComposition;
  d: string;
  color: string;
  percentage: number;
  label: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
  const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  const d = [
    'M', start.x, start.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    'L', innerEnd.x, innerEnd.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    'Z',
  ].join(' ');

  return d;
}

export function FeedCompositionChart({
  data,
  composition,
  showLegend = true,
  showPercentages = true,
  onSegmentHover,
  onSegmentClick,
}: FeedCompositionChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<keyof FeedComposition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Support both `data` and `composition` props (composition is an alias)
  const safeData = useMemo(
    () => data ?? composition ?? { boosted: 0, demoted: 0, filtered: 0, unaffected: 0 },
    [data, composition]
  );

  const total = useMemo(() => {
    return safeData.boosted + safeData.demoted + safeData.filtered + safeData.unaffected;
  }, [safeData]);

  const arcs = useMemo(() => {
    const result: ArcPath[] = [];
    let currentAngle = 0;

    for (const config of SEGMENT_CONFIGS) {
      const value = safeData[config.key];
      if (value === 0) continue;

      const percentage = total > 0 ? (value / total) * 100 : 0;
      const sweepAngle = (percentage / 100) * 360;

      // Avoid rendering a full circle as a single arc (causes rendering issues)
      const adjustedSweepAngle = sweepAngle >= 360 ? 359.99 : sweepAngle;

      result.push({
        key: config.key,
        d: describeArc(
          CENTER,
          CENTER,
          OUTER_RADIUS,
          INNER_RADIUS,
          currentAngle,
          currentAngle + adjustedSweepAngle
        ),
        color: config.color,
        percentage: Math.round(percentage),
        label: config.label,
        startAngle: currentAngle,
        endAngle: currentAngle + adjustedSweepAngle,
      });

      currentAngle += sweepAngle;
    }

    return result;
  }, [safeData, total]);

  const handleMouseEnter = useCallback(
    (segment: keyof FeedComposition, event: React.MouseEvent) => {
      setHoveredSegment(segment);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
      onSegmentHover?.(segment);
    },
    [onSegmentHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSegment(null);
    onSegmentHover?.(null);
  }, [onSegmentHover]);

  const handleClick = useCallback(
    (segment: keyof FeedComposition) => {
      onSegmentClick?.(segment);
    },
    [onSegmentClick]
  );

  const getPercentage = (key: keyof FeedComposition): number => {
    if (total === 0) return 0;
    return Math.round((safeData[key] / total) * 100);
  };

  return (
    <div
      data-testid="feed-composition-chart"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
    >
      {/* SVG Donut Chart */}
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label="Feed composition chart showing the distribution of boosted, demoted, filtered, and unaffected posts"
        style={{ overflow: 'visible' }}
      >
        <title>Feed Composition Chart</title>

        {/* Render arcs */}
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.d}
            fill={arc.color}
            data-testid={`chart-segment-${arc.key}`}
            data-percentage={arc.percentage.toString()}
            aria-label={`${arc.percentage}% of posts are ${arc.key}`}
            style={{
              cursor: 'pointer',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transform: hoveredSegment === arc.key ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: `${CENTER}px ${CENTER}px`,
              opacity: hoveredSegment && hoveredSegment !== arc.key ? 0.6 : 1,
            }}
            onMouseEnter={(e) => handleMouseEnter(arc.key, e)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(arc.key)}
          />
        ))}

        {/* Center text showing hovered segment or total */}
        <text
          x={CENTER}
          y={CENTER - 5}
          textAnchor="middle"
          style={{ fontSize: '14px', fontWeight: 600, fill: '#374151' }}
        >
          {hoveredSegment ? `${getPercentage(hoveredSegment)}%` : '100%'}
        </text>
        <text
          x={CENTER}
          y={CENTER + 12}
          textAnchor="middle"
          style={{ fontSize: '11px', fill: '#6b7280' }}
        >
          {hoveredSegment
            ? hoveredSegment.charAt(0).toUpperCase() + hoveredSegment.slice(1)
            : 'Total'}
        </text>
      </svg>

      {/* Tooltip on hover */}
      {hoveredSegment && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y + 10,
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {hoveredSegment.charAt(0).toUpperCase() + hoveredSegment.slice(1)}: {getPercentage(hoveredSegment)}%
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div
          data-testid="chart-legend"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            minWidth: '180px',
          }}
        >
          {SEGMENT_CONFIGS.map((config) => {
            const percentage = getPercentage(config.key);
            const value = safeData[config.key];

            // Only show segments with values > 0
            if (value === 0) return null;

            return (
              <div
                key={config.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      backgroundColor: config.color,
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>{config.label}</span>
                </div>
                {showPercentages && (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1f2937' }}>
                    {percentage}%
                  </span>
                )}
              </div>
            );
          })}

          {/* Total row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Total: 100%</span>
          </div>
        </div>
      )}
    </div>
  );
}
