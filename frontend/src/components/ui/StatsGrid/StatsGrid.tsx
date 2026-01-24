'use client';

import styled from 'styled-components';
import type { ReactNode } from 'react';

export interface StatsGridProps {
  /**
   * Number of columns or responsive configuration
   * @default 'auto'
   */
  columns?: number | 'auto';
  /**
   * Minimum width for auto-fit columns
   * @default '180px'
   */
  minColumnWidth?: string;
  /**
   * Gap between items
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Bottom margin
   * @default true
   */
  marginBottom?: boolean;
  children: ReactNode;
}

const gapSizes = {
  sm: '2',
  md: '4',
  lg: '6',
};

const Container = styled.div<{
  $columns: number | 'auto';
  $minColumnWidth: string;
  $gap: 'sm' | 'md' | 'lg';
  $marginBottom: boolean;
}>`
  display: grid;
  grid-template-columns: ${({ $columns, $minColumnWidth }) =>
    $columns === 'auto'
      ? `repeat(auto-fit, minmax(${$minColumnWidth}, 1fr))`
      : `repeat(${$columns}, 1fr)`};
  gap: ${({ theme, $gap }) => theme.spacing[gapSizes[$gap]]};
  margin-bottom: ${({ theme, $marginBottom }) =>
    $marginBottom ? theme.spacing[6] : 0};
`;

export function StatsGrid({
  columns = 'auto',
  minColumnWidth = '180px',
  gap = 'md',
  marginBottom = true,
  children,
}: StatsGridProps) {
  return (
    <Container
      $columns={columns}
      $minColumnWidth={minColumnWidth}
      $gap={gap}
      $marginBottom={marginBottom}
      data-testid="stats-grid"
    >
      {children}
    </Container>
  );
}

StatsGrid.displayName = 'StatsGrid';
