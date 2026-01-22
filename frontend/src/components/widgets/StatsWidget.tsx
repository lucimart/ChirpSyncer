'use client';

import React from 'react';
import styled from 'styled-components';

/**
 * Single stat item interface
 */
export interface StatItem {
  label: string;
  value: number | string;
  change?: number;
  icon?: string;
}

/**
 * StatsWidget props interface
 */
export interface StatsWidgetProps {
  stats: StatItem[];
  title: string;
  compact?: boolean;
  layout?: 'grid' | 'list';
}

const StatsContainer = styled.div<{ $compact?: boolean; $layout?: 'grid' | 'list' }>`
  display: ${({ $layout }) => ($layout === 'grid' ? 'grid' : 'flex')};
  ${({ $layout }) =>
    $layout === 'grid'
      ? 'grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));'
      : 'flex-direction: column;'}
  gap: ${({ theme, $compact }) => ($compact ? theme.spacing[2] : theme.spacing[4])};
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing[2] : theme.spacing[4])};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const StatItemContainer = styled.div<{ $change?: 'positive' | 'negative' | 'neutral'; $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $compact }) => ($compact ? theme.spacing[1] : theme.spacing[2])};
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing[2] : theme.spacing[3])};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 3px solid ${({ theme, $change }) => {
    if ($change === 'positive') return theme.colors.success[500];
    if ($change === 'negative') return theme.colors.danger[500];
    return theme.colors.neutral[300];
  }};
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const StatLabel = styled.span<{ $compact?: boolean }>`
  font-size: ${({ theme, $compact }) => ($compact ? theme.fontSizes.xs : theme.fontSizes.sm)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const StatValue = styled.span<{ $compact?: boolean }>`
  font-size: ${({ theme, $compact }) => ($compact ? theme.fontSizes.lg : theme.fontSizes['2xl'])};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatChange = styled.span<{ $positive?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.success[600] : theme.colors.danger[600]};
`;

const StatRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`;

/**
 * StatsWidget - Displays a collection of stat items with optional change indicators
 *
 * Features:
 * - Grid or list layout
 * - Compact mode for smaller spaces
 * - Change indicators (positive/negative)
 * - Themed styling
 */
export const StatsWidget: React.FC<StatsWidgetProps> = ({
  stats,
  title,
  compact = false,
  layout = 'list',
}) => {
  const getChangeType = (change?: number): 'positive' | 'negative' | 'neutral' => {
    if (change === undefined || change === 0) return 'neutral';
    return change > 0 ? 'positive' : 'negative';
  };

  const formatChange = (change: number): string => {
    return change > 0 ? `+${change}` : `${change}`;
  };

  return (
    <StatsContainer
      data-testid="stats-widget"
      data-compact={compact ? 'true' : undefined}
      data-layout={layout}
      $compact={compact}
      $layout={layout}
      aria-label={title}
    >
      {stats.map((stat, index) => {
        const changeType = getChangeType(stat.change);

        return (
          <StatItemContainer
            key={`${stat.label}-${index}`}
            data-testid={`stat-item-${index}`}
            data-change={changeType}
            $change={changeType}
            $compact={compact}
          >
            <StatLabel $compact={compact}>{stat.label}</StatLabel>
            <StatRow>
              <StatValue $compact={compact}>{stat.value}</StatValue>
              {stat.change !== undefined && stat.change !== 0 && (
                <StatChange $positive={stat.change > 0}>
                  {formatChange(stat.change)}
                </StatChange>
              )}
            </StatRow>
          </StatItemContainer>
        );
      })}
    </StatsContainer>
  );
};

export default StatsWidget;
