'use client';

/**
 * D3TimingHeatmap
 *
 * Interactive heatmap showing optimal posting times based on engagement data.
 * Built with D3 for full customization and interactivity.
 * Drop-in replacement for TimingHeatmap with D3 rendering.
 *
 * Usage:
 * - Displays 7 days x 24 hours grid
 * - Color intensity = engagement level
 * - Click cell to schedule post at that time
 */

import { useRef, useEffect, useMemo, useCallback, memo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import * as d3 from 'd3';
import { Stack, SmallText, EmptyState, Badge } from '@/components/ui';
import { chartColors } from '@/styles/nivoTheme';
import type { HeatmapCell, TimingHeatmapData, DataQuality } from './types';
import { DAY_NAMES, DAY_NAMES_FULL, formatHour, getCellKey, QUALITY_LABELS, getQualityColor } from './types';

export interface D3TimingHeatmapProps {
  /** Heatmap data with cells and metadata */
  data: TimingHeatmapData | null;
  /** Called when a cell is clicked */
  onCellSelect?: (cell: HeatmapCell) => void;
  /** Currently selected day index (0-6) */
  selectedDay?: number;
  /** Currently selected hour index (0-23) */
  selectedHour?: number;
  /** Show loading skeleton */
  loading?: boolean;
  /** Compact mode with smaller cells */
  compact?: boolean;
  /** Show legend gradient */
  showLegend?: boolean;
}

// Constants
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const CELL_GAP = 2;
const LABEL_WIDTH = 50;
const LABEL_HEIGHT = 25;

// Styled Components
const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing[3] : theme.spacing[4])};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const HeatmapContainer = styled.div`
  width: 100%;
  overflow-x: auto;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  svg {
    display: block;

    .cell {
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.1s ease;

      &:hover {
        opacity: 0.85;
        transform: scale(1.05);
      }
    }

    .cell-selected {
      stroke: ${({ theme }) => theme.colors.primary[500]};
      stroke-width: 2;
    }

    .cell-best {
      stroke: ${({ theme }) => theme.colors.primary[600]};
      stroke-width: 2;
      stroke-dasharray: 4 2;
    }

    .axis-label {
      font-size: ${({ theme }) => theme.fontSizes.xs};
      fill: ${({ theme }) => theme.colors.text.secondary};
      font-family: inherit;
    }

    .tooltip-bg {
      fill: ${({ theme }) => theme.colors.background.primary};
      stroke: ${({ theme }) => theme.colors.border.default};
    }

    .tooltip-text {
      font-size: ${({ theme }) => theme.fontSizes.sm};
      fill: ${({ theme }) => theme.colors.text.primary};
      font-family: inherit;
    }
  }
`;

const LegendContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const LegendGradient = styled.div`
  display: flex;
  gap: 2px;
`;

const LegendBlock = styled.div<{ $color: string; $opacity: number }>`
  width: 16px;
  height: 12px;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};
  opacity: ${({ $opacity }) => $opacity};
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const SkeletonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SkeletonRow = styled.div`
  display: flex;
  gap: 2px;
`;

const SkeletonCell = styled.div<{ $compact?: boolean }>`
  flex: 1;
  height: ${({ $compact }) => ($compact ? '20px' : '24px')};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[200]} 25%,
    ${({ theme }) => theme.colors.neutral[100]} 50%,
    ${({ theme }) => theme.colors.neutral[200]} 75%
  );
  background-size: 200% 100%;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  animation: shimmer 1.5s infinite;

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

// Legend colors
const LEGEND_COLORS = [
  { color: '#E2E8F0', opacity: 0.3 },
  { color: '#FDE047', opacity: 0.5 },
  { color: '#FDE047', opacity: 0.7 },
  { color: '#86EFAC', opacity: 0.8 },
  { color: '#22C55E', opacity: 1 },
] as const;

// Helper to format hour for D3 (compact)
const formatHourCompact = (hour: number): string => {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
};

// Main Component
export const D3TimingHeatmap: FC<D3TimingHeatmapProps> = memo(({
  data,
  onCellSelect,
  selectedDay,
  selectedHour,
  loading = false,
  compact = false,
  showLegend = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const theme = useTheme();
  const height = compact ? 180 : 220;

  // Create cell lookup map
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    data?.cells.forEach((cell) => {
      map.set(getCellKey(cell.day, cell.hour), cell);
    });
    return map;
  }, [data?.cells]);

  // Best slots set
  const bestSlotsSet = useMemo(() => {
    const set = new Set<string>();
    data?.bestSlots.forEach((slot) => {
      set.add(getCellKey(slot.day, slot.hour));
    });
    return set;
  }, [data?.bestSlots]);

  // Create data matrix (7 days x 24 hours)
  const dataMatrix = useMemo(() => {
    const matrix: (number | null)[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(null)
    );

    data?.cells.forEach((cell) => {
      if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
        matrix[cell.day][cell.hour] = cell.score;
      }
    });

    return matrix;
  }, [data?.cells]);

  // Color scale
  const colorScale = useMemo(() => {
    const values = data?.cells.map((d) => d.score).filter((v) => v != null) ?? [];
    const maxValue = values.length > 0 ? Math.max(...values) : 100;

    return d3
      .scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateGreens);
  }, [data?.cells]);

  // Handle cell click
  const handleCellClick = useCallback(
    (day: number, hour: number) => {
      const cell = cellMap.get(getCellKey(day, hour)) ?? { day, hour, score: 0 };
      onCellSelect?.(cell);
    },
    [cellMap, onCellSelect]
  );

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || !data || data.cells.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate dimensions
    const containerWidth = svgRef.current.parentElement?.clientWidth || 600;
    const width = Math.max(containerWidth, 400);
    const chartWidth = width - LABEL_WIDTH - 10;
    const chartHeight = height - LABEL_HEIGHT - 10;
    const cellWidth = (chartWidth - CELL_GAP * 23) / 24;
    const cellHeight = (chartHeight - CELL_GAP * 6) / 7;

    // Create main group
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${LABEL_WIDTH}, ${LABEL_HEIGHT})`);

    // Draw cells
    DAY_NAMES.forEach((_, dayIndex) => {
      HOURS.forEach((hour) => {
        const score = dataMatrix[dayIndex][hour];
        const x = hour * (cellWidth + CELL_GAP);
        const y = dayIndex * (cellHeight + CELL_GAP);
        const isSelected = selectedDay === dayIndex && selectedHour === hour;
        const isBest = bestSlotsSet.has(getCellKey(dayIndex, hour));

        let cellClass = 'cell';
        if (isSelected) cellClass += ' cell-selected';
        if (isBest && !isSelected) cellClass += ' cell-best';

        const cell = g
          .append('rect')
          .attr('class', cellClass)
          .attr('x', x)
          .attr('y', y)
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('rx', 2)
          .attr('fill', score != null ? colorScale(score) : theme.colors.neutral[100])
          .attr('data-testid', `heatmap-cell-${dayIndex}-${hour}`)
          .attr('data-day', dayIndex)
          .attr('data-hour', hour)
          .attr('data-score', score ?? 0);

        // Click handler
        cell.on('click', () => handleCellClick(dayIndex, hour));

        // Tooltip on hover
        cell
          .on('mouseenter', function () {
            const rect = this as SVGRectElement;
            const cellX = parseFloat(rect.getAttribute('x') || '0');
            const cellY = parseFloat(rect.getAttribute('y') || '0');
            const cellData = cellMap.get(getCellKey(dayIndex, hour));

            const dayName = DAY_NAMES_FULL[dayIndex];
            const hourLabel = formatHour(hour);
            const scoreText = score != null ? `${score}%` : 'No data';
            const tooltipLines = [`${dayName} ${hourLabel}`, `Score: ${scoreText}`];
            if (cellData?.postCount) {
              tooltipLines.push(`Posts: ${cellData.postCount}`);
            }
            if (cellData?.avgEngagement) {
              tooltipLines.push(`Avg: ${Math.round(cellData.avgEngagement)}`);
            }

            const maxLineLength = Math.max(...tooltipLines.map(l => l.length));
            const tooltipWidth = maxLineLength * 7 + 20;
            const tooltipHeight = tooltipLines.length * 16 + 12;

            // Tooltip background
            g.append('rect')
              .attr('class', 'tooltip-bg')
              .attr('x', cellX - 10)
              .attr('y', cellY - tooltipHeight - 5)
              .attr('width', tooltipWidth)
              .attr('height', tooltipHeight)
              .attr('rx', 4);

            // Tooltip text
            tooltipLines.forEach((line, i) => {
              g.append('text')
                .attr('class', 'tooltip-text')
                .attr('x', cellX)
                .attr('y', cellY - tooltipHeight + 12 + i * 16)
                .style('font-weight', i === 0 ? '600' : '400')
                .style('font-size', i === 0 ? '13px' : '12px')
                .text(line);
            });
          })
          .on('mouseleave', () => {
            g.selectAll('.tooltip-bg, .tooltip-text').remove();
          });
      });
    });

    // Y-axis labels (days)
    svg
      .append('g')
      .attr('transform', `translate(0, ${LABEL_HEIGHT})`)
      .selectAll('text')
      .data(DAY_NAMES)
      .enter()
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', LABEL_WIDTH - 8)
      .attr('y', (_, i) => i * (cellHeight + CELL_GAP) + cellHeight / 2 + 4)
      .attr('text-anchor', 'end')
      .text((d) => d);

    // X-axis labels (hours) - show every 3 hours
    svg
      .append('g')
      .attr('transform', `translate(${LABEL_WIDTH}, 0)`)
      .selectAll('text')
      .data(HOURS.filter((h) => h % 3 === 0))
      .enter()
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', (d) => d * (cellWidth + CELL_GAP) + cellWidth / 2)
      .attr('y', LABEL_HEIGHT - 8)
      .attr('text-anchor', 'middle')
      .text((d) => formatHourCompact(d));
  }, [data, dataMatrix, colorScale, height, selectedDay, selectedHour, bestSlotsSet, cellMap, handleCellClick, theme]);

  // Loading state
  if (loading) {
    return (
      <Container $compact={compact} data-testid="heatmap-loading">
        <Stack gap={4}>
          <Stack direction="row" justify="between" align="center" wrap gap={3}>
            <Title>Engagement Heatmap</Title>
          </Stack>
          <SkeletonContainer>
            {Array.from({ length: 7 }, (_, i) => (
              <SkeletonRow key={i}>
                {Array.from({ length: 24 }, (_, j) => (
                  <SkeletonCell key={j} $compact={compact} />
                ))}
              </SkeletonRow>
            ))}
          </SkeletonContainer>
        </Stack>
      </Container>
    );
  }

  // Empty state
  if (!data || data.cells.length === 0) {
    return (
      <Container $compact={compact} data-testid="heatmap-empty">
        <EmptyState
          title="Not Enough Data"
          description="Sync more posts to generate engagement insights for optimal posting times."
          size="sm"
        />
      </Container>
    );
  }

  return (
    <Container $compact={compact} data-testid="d3-timing-heatmap">
      <Stack direction="row" justify="between" align="center" wrap gap={3}>
        <Title>Engagement Heatmap</Title>
        {showLegend && (
          <LegendContainer data-testid="heatmap-legend">
            <SmallText>Low</SmallText>
            <LegendGradient>
              {LEGEND_COLORS.map((item, i) => (
                <LegendBlock key={i} $color={item.color} $opacity={item.opacity} />
              ))}
            </LegendGradient>
            <SmallText>Best</SmallText>
          </LegendContainer>
        )}
      </Stack>

      <HeatmapContainer tabIndex={0} aria-label="Scrollable engagement heatmap grid">
        <svg ref={svgRef} role="img" aria-label={`Heatmap showing engagement patterns across ${data.cells.length} time slots`} />
      </HeatmapContainer>

      <Footer>
        <Badge
          variant="text"
          size="xs"
          dot
          dotColor={getQualityColor(data.dataQuality, theme)}
          data-testid="data-quality-indicator"
          style={{ padding: 0, gap: theme.spacing[2] }}
        >
          {QUALITY_LABELS[data.dataQuality]}
        </Badge>
        <SmallText>Based on {data.basedOnPosts} posts</SmallText>
      </Footer>
    </Container>
  );
});

D3TimingHeatmap.displayName = 'D3TimingHeatmap';

export default D3TimingHeatmap;
