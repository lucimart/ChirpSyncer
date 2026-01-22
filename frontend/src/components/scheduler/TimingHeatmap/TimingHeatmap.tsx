'use client';

import React, { useState, useCallback } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { Badge, EmptyState as UIEmptyState } from '@/components/ui';

// Types
export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  score: number; // 0-100 engagement score
  postCount?: number;
  avgEngagement?: number;
}

export interface TimingHeatmapData {
  cells: HeatmapCell[];
  bestSlots: Array<{
    day: number;
    hour: number;
    score: number;
    label: string;
  }>;
  dataQuality: 'low' | 'medium' | 'high';
  basedOnPosts: number;
}

export interface TimingHeatmapProps {
  data: TimingHeatmapData | null;
  onCellSelect?: (cell: HeatmapCell) => void;
  selectedDay?: number;
  selectedHour?: number;
  loading?: boolean;
  compact?: boolean;
}

// Helper functions
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

function getScoreColor(score: number, theme: any): string {
  if (score >= 80) return theme.colors.success[500];
  if (score >= 60) return theme.colors.success[300];
  if (score >= 40) return theme.colors.warning[500];
  if (score >= 20) return theme.colors.warning[300];
  return theme.colors.neutral[200];
}

// Animations
const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled Components
const Container = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme, $compact }) => $compact ? theme.spacing[3] : theme.spacing[4]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const GridWrapper = styled.div`
  overflow-x: auto;
`;

const Grid = styled.div<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) => $compact ? '40px' : '50px'} repeat(7, 1fr);
  gap: 2px;
  min-width: ${({ $compact }) => $compact ? '400px' : '500px'};
`;

const DayHeader = styled.div<{ $compact?: boolean }>`
  text-align: center;
  font-size: ${({ theme, $compact }) => $compact ? theme.fontSizes.xs : theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing[2]};
`;

const HourLabel = styled.div<{ $compact?: boolean }>`
  text-align: right;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding-right: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: ${({ $compact }) => $compact ? '20px' : '24px'};
`;

const Cell = styled.div<{
  $score: number;
  $selected?: boolean;
  $best?: boolean;
  $compact?: boolean;
}>`
  height: ${({ $compact }) => $compact ? '20px' : '24px'};
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
  height: ${({ $compact }) => $compact ? '20px' : '24px'};
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

const TooltipTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TooltipRow = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};

  & + & {
    margin-top: ${({ theme }) => theme.spacing[1]};
  }
`;

const TooltipValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LegendLabel = styled.span``;

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


const PostsCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;


const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

// Component
export const TimingHeatmap: React.FC<TimingHeatmapProps> = ({
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

  const getQualityColor = (quality: 'low' | 'medium' | 'high') => {
    switch (quality) {
      case 'high':
        return theme.colors.success[500];
      case 'medium':
        return theme.colors.warning[500];
      case 'low':
        return theme.colors.danger[500];
    }
  };

  const handleMouseEnter = useCallback(
    (cell: HeatmapCell, event: React.MouseEvent) => {
      setHoveredCell(cell);
      setTooltipPosition({
        x: event.clientX + 10,
        y: event.clientY + 10,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleCellClick = useCallback(
    (cell: HeatmapCell) => {
      if (onCellSelect) {
        onCellSelect(cell);
      }
    },
    [onCellSelect]
  );

  const getCellData = useCallback(
    (day: number, hour: number): HeatmapCell | undefined => {
      return data?.cells.find((c) => c.day === day && c.hour === hour);
    },
    [data]
  );

  const isBestSlot = useCallback(
    (day: number, hour: number): boolean => {
      return data?.bestSlots.some((s) => s.day === day && s.hour === hour) ?? false;
    },
    [data]
  );

  // Loading state
  if (loading) {
    return (
      <Container $compact={compact} data-testid="heatmap-loading">
        <LoadingContainer>
          <Header>
            <Title>Engagement Heatmap</Title>
          </Header>
          <GridWrapper>
            <Grid $compact={compact}>
              {/* Empty corner */}
              <div />
              {/* Day headers */}
              {DAY_NAMES.map((day, index) => (
                <DayHeader key={day} $compact={compact} data-testid={`day-header-${index}`}>
                  {day}
                </DayHeader>
              ))}
              {/* Hour rows with skeleton cells */}
              {Array.from({ length: 24 }, (_, hour) => (
                <React.Fragment key={hour}>
                  <HourLabel $compact={compact} data-testid={`hour-label-${hour}`}>
                    {formatHour(hour)}
                  </HourLabel>
                  {Array.from({ length: 7 }, (_, day) => (
                    <SkeletonCell
                      key={`${day}-${hour}`}
                      $compact={compact}
                      data-testid={`skeleton-cell-${day}-${hour}`}
                    />
                  ))}
                </React.Fragment>
              ))}
            </Grid>
          </GridWrapper>
        </LoadingContainer>
      </Container>
    );
  }

  // Empty state
  if (!data || data.cells.length === 0) {
    return (
      <Container $compact={compact} data-testid="heatmap-empty">
        <UIEmptyState
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
      <Header>
        <Title>Engagement Heatmap</Title>
        <Legend data-testid="heatmap-legend">
          <LegendLabel>Low</LegendLabel>
          <LegendGradient>
            <LegendBlock $color="#E2E8F0" $opacity={0.3} />
            <LegendBlock $color="#FDE047" $opacity={0.5} />
            <LegendBlock $color="#FDE047" $opacity={0.7} />
            <LegendBlock $color="#86EFAC" $opacity={0.8} />
            <LegendBlock $color="#22C55E" $opacity={1} />
          </LegendGradient>
          <LegendLabel>Best</LegendLabel>
        </Legend>
      </Header>

      <GridWrapper>
        <Grid $compact={compact}>
          {/* Empty corner */}
          <div />
          {/* Day headers */}
          {DAY_NAMES.map((day, index) => (
            <DayHeader key={day} $compact={compact} data-testid={`day-header-${index}`}>
              {day}
            </DayHeader>
          ))}
          {/* Hour rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <React.Fragment key={hour}>
              <HourLabel $compact={compact} data-testid={`hour-label-${hour}`}>
                {formatHour(hour)}
              </HourLabel>
              {Array.from({ length: 7 }, (_, day) => {
                const cellData = getCellData(day, hour);
                const score = cellData?.score ?? 0;
                const isSelected = selectedDay === day && selectedHour === hour;
                const best = isBestSlot(day, hour);
                const displayCell: HeatmapCell = cellData ?? { day, hour, score: 0 };

                return (
                  <Cell
                    key={`${day}-${hour}`}
                    $score={score}
                    $selected={isSelected}
                    $best={best}
                    $compact={compact}
                    data-testid={`heatmap-cell-${day}-${hour}`}
                    data-score={score.toString()}
                    data-selected={isSelected ? 'true' : undefined}
                    data-best={best ? 'true' : undefined}
                    onClick={() => handleCellClick(displayCell)}
                    onMouseEnter={(e) => handleMouseEnter(displayCell, e)}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </Grid>
      </GridWrapper>

      <Footer>
        <Badge
          variant="text"
          size="xs"
          dot
          dotColor={getQualityColor(data.dataQuality)}
          data-testid="data-quality-indicator"
          style={{ padding: 0, gap: theme.spacing[2] }}
        >
          {data.dataQuality === 'high' && 'High confidence'}
          {data.dataQuality === 'medium' && 'Medium confidence'}
          {data.dataQuality === 'low' && 'Low confidence'}
        </Badge>
        <PostsCount>Based on {data.basedOnPosts} posts</PostsCount>
      </Footer>

      {/* Tooltip */}
      {hoveredCell && (
        <Tooltip
          data-testid="heatmap-tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <TooltipTitle>
            {DAY_NAMES_FULL[hoveredCell.day]} {formatHour(hoveredCell.hour)}
          </TooltipTitle>
          <TooltipRow>
            <span>Score</span>
            <TooltipValue>{hoveredCell.score}%</TooltipValue>
          </TooltipRow>
          {hoveredCell.postCount !== undefined && (
            <TooltipRow>
              <span>Posts</span>
              <TooltipValue>{hoveredCell.postCount}</TooltipValue>
            </TooltipRow>
          )}
          {hoveredCell.avgEngagement !== undefined && (
            <TooltipRow>
              <span>Avg. Engagement</span>
              <TooltipValue>{Math.round(hoveredCell.avgEngagement)}</TooltipValue>
            </TooltipRow>
          )}
        </Tooltip>
      )}
    </Container>
  );
};
