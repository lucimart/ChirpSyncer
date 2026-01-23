'use client';

import { Fragment, useState, useCallback, useMemo, memo, type FC, type MouseEvent } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { Badge, EmptyState, Stack, SmallText, Caption } from '@/components/ui';
import {
  type HeatmapCell,
  type TimingHeatmapData,
  HOURS_COUNT,
  DAYS_COUNT,
  DAY_NAMES,
  DAY_NAMES_FULL,
  QUALITY_LABELS,
  formatHour,
  getScoreColor,
  getQualityColor,
  getCellKey,
} from '../types';

// Re-export types for backwards compatibility
export type { HeatmapCell, TimingHeatmapData };

export interface TimingHeatmapProps {
  data: TimingHeatmapData | null;
  onCellSelect?: (cell: HeatmapCell) => void;
  selectedDay?: number;
  selectedHour?: number;
  loading?: boolean;
  compact?: boolean;
}

// Animations
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

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

const GridWrapper = styled.div`
  overflow-x: auto;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const Grid = styled.div<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? '40px' : '50px')} repeat(7, 1fr);
  gap: 2px;
  min-width: ${({ $compact }) => ($compact ? '400px' : '500px')};
`;

const DayHeader = styled.div<{ $compact?: boolean }>`
  text-align: center;
  font-size: ${({ theme, $compact }) => ($compact ? theme.fontSizes.xs : theme.fontSizes.sm)};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing[2]};
`;

const HourLabel = styled.div<{ $compact?: boolean }>`
  text-align: right;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding-right: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: ${({ $compact }) => ($compact ? '20px' : '24px')};
`;

const Cell = styled.div<{
  $score: number;
  $selected?: boolean;
  $best?: boolean;
  $compact?: boolean;
}>`
  height: ${({ $compact }) => ($compact ? '20px' : '24px')};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};
  position: relative;
  background-color: ${({ $score, theme }) => getScoreColor($score, theme)};
  opacity: ${({ $score }) => Math.max(0.3, $score / 100)};

  ${({ $selected, theme }) =>
    $selected &&
    css`
      box-shadow: 0 0 0 2px ${theme.colors.primary[500]};
      z-index: 1;
    `}

  ${({ $best, theme }) =>
    $best &&
    css`
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border: 2px solid ${theme.colors.primary[600]};
        border-radius: ${theme.borderRadius.sm};
        pointer-events: none;
      }
    `}

  &:hover {
    opacity: 1;
    transform: scale(1.1);
    z-index: 2;
  }
`;

const SkeletonCell = styled.div<{ $compact?: boolean }>`
  height: ${({ $compact }) => ($compact ? '20px' : '24px')};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.neutral[200]} 25%,
    ${({ theme }) => theme.colors.neutral[100]} 50%,
    ${({ theme }) => theme.colors.neutral[200]} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const Tooltip = styled.div`
  position: fixed;
  z-index: 1000;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 150px;
  animation: ${fadeIn} 0.15s ease-out;
`;

const LegendGradient = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
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

// Legend color constants
const LEGEND_COLORS = [
  { color: '#E2E8F0', opacity: 0.3 },
  { color: '#FDE047', opacity: 0.5 },
  { color: '#FDE047', opacity: 0.7 },
  { color: '#86EFAC', opacity: 0.8 },
  { color: '#22C55E', opacity: 1 },
] as const;

// Component
export const TimingHeatmap: FC<TimingHeatmapProps> = memo(({
  data,
  onCellSelect,
  selectedDay,
  selectedHour,
  loading = false,
  compact = false,
}) => {
  const theme = useTheme();
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Create lookup maps for O(1) access
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    data?.cells.forEach((cell) => {
      map.set(getCellKey(cell.day, cell.hour), cell);
    });
    return map;
  }, [data?.cells]);

  const bestSlotsSet = useMemo(() => {
    const set = new Set<string>();
    data?.bestSlots.forEach((slot) => {
      set.add(getCellKey(slot.day, slot.hour));
    });
    return set;
  }, [data?.bestSlots]);

  const handleMouseEnter = useCallback((cell: HeatmapCell, event: MouseEvent) => {
    setHoveredCell(cell);
    setTooltipPosition({ x: event.clientX + 10, y: event.clientY + 10 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleCellClick = useCallback(
    (cell: HeatmapCell) => {
      onCellSelect?.(cell);
    },
    [onCellSelect]
  );

  // Shared grid content
  const gridContent = useMemo(() => (
    <>
      <div />
      {DAY_NAMES.map((day, index) => (
        <DayHeader key={day} $compact={compact} data-testid={`day-header-${index}`}>
          {day}
        </DayHeader>
      ))}
    </>
  ), [compact]);

  // Loading state
  if (loading) {
    return (
      <Container $compact={compact} data-testid="heatmap-loading">
        <Stack gap={4}>
          <Stack direction="row" justify="between" align="center" wrap gap={3}>
            <Title>Engagement Heatmap</Title>
          </Stack>
          <GridWrapper tabIndex={0} aria-label="Scrollable engagement heatmap grid (loading)">
            <Grid $compact={compact}>
              {gridContent}
              {Array.from({ length: HOURS_COUNT }, (_, hour) => (
                <Fragment key={hour}>
                  <HourLabel $compact={compact} data-testid={`hour-label-${hour}`}>
                    {formatHour(hour)}
                  </HourLabel>
                  {Array.from({ length: DAYS_COUNT }, (_, day) => (
                    <SkeletonCell
                      key={getCellKey(day, hour)}
                      $compact={compact}
                      data-testid={`skeleton-cell-${day}-${hour}`}
                    />
                  ))}
                </Fragment>
              ))}
            </Grid>
          </GridWrapper>
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
    <Container
      $compact={compact}
      data-testid="timing-heatmap"
      data-compact={compact ? 'true' : undefined}
    >
      <Stack direction="row" justify="between" align="center" wrap gap={3}>
        <Title>Engagement Heatmap</Title>
        <Stack direction="row" align="center" gap={2} data-testid="heatmap-legend">
          <SmallText>Low</SmallText>
          <LegendGradient>
            {LEGEND_COLORS.map((item, i) => (
              <LegendBlock key={i} $color={item.color} $opacity={item.opacity} />
            ))}
          </LegendGradient>
          <SmallText>Best</SmallText>
        </Stack>
      </Stack>

      <GridWrapper tabIndex={0} aria-label="Scrollable engagement heatmap grid">
        <Grid $compact={compact}>
          {gridContent}
          {Array.from({ length: HOURS_COUNT }, (_, hour) => (
            <Fragment key={hour}>
              <HourLabel $compact={compact} data-testid={`hour-label-${hour}`}>
                {formatHour(hour)}
              </HourLabel>
              {Array.from({ length: DAYS_COUNT }, (_, day) => {
                const key = getCellKey(day, hour);
                const cellData = cellMap.get(key);
                const score = cellData?.score ?? 0;
                const isSelected = selectedDay === day && selectedHour === hour;
                const isBest = bestSlotsSet.has(key);
                const displayCell: HeatmapCell = cellData ?? { day, hour, score: 0 };

                return (
                  <Cell
                    key={key}
                    $score={score}
                    $selected={isSelected}
                    $best={isBest}
                    $compact={compact}
                    data-testid={`heatmap-cell-${day}-${hour}`}
                    data-score={score.toString()}
                    data-selected={isSelected ? 'true' : undefined}
                    data-best={isBest ? 'true' : undefined}
                    onClick={() => handleCellClick(displayCell)}
                    onMouseEnter={(e) => handleMouseEnter(displayCell, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })}
            </Fragment>
          ))}
        </Grid>
      </GridWrapper>

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

      {/* Tooltip */}
      {hoveredCell && (
        <Tooltip
          data-testid="heatmap-tooltip"
          style={{ left: tooltipPosition.x, top: tooltipPosition.y }}
        >
          <Stack gap={2}>
            <SmallText style={{ fontWeight: 600 }}>
              {DAY_NAMES_FULL[hoveredCell.day]} {formatHour(hoveredCell.hour)}
            </SmallText>
            <Stack gap={1}>
              <Stack direction="row" justify="between" gap={3}>
                <Caption>Score</Caption>
                <Caption style={{ fontWeight: 500 }}>{hoveredCell.score}%</Caption>
              </Stack>
              {hoveredCell.postCount !== undefined && (
                <Stack direction="row" justify="between" gap={3}>
                  <Caption>Posts</Caption>
                  <Caption style={{ fontWeight: 500 }}>{hoveredCell.postCount}</Caption>
                </Stack>
              )}
              {hoveredCell.avgEngagement !== undefined && (
                <Stack direction="row" justify="between" gap={3}>
                  <Caption>Avg. Engagement</Caption>
                  <Caption style={{ fontWeight: 500 }}>{Math.round(hoveredCell.avgEngagement)}</Caption>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Tooltip>
      )}
    </Container>
  );
});

TimingHeatmap.displayName = 'TimingHeatmap';
