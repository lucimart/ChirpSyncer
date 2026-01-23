'use client';

import styled from 'styled-components';
import { forwardRef, HTMLAttributes } from 'react';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Minimum width of each column */
  minWidth?: string;
  /** Gap between items */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  /** Number of columns (overrides minWidth) */
  columns?: 1 | 2 | 3 | 4;
}

const StyledGrid = styled.div<{
  $minWidth: string;
  $gap: number;
  $columns?: number;
}>`
  display: grid;
  grid-template-columns: ${({ $columns, $minWidth }) =>
    $columns
      ? `repeat(${$columns}, 1fr)`
      : `repeat(auto-fit, minmax(${$minWidth}, 1fr))`};
  gap: ${({ theme, $gap }) => theme.spacing[$gap]};
`;

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ minWidth = '300px', gap = 4, columns, children, ...props }, ref) => {
    return (
      <StyledGrid
        ref={ref}
        $minWidth={minWidth}
        $gap={gap}
        $columns={columns}
        {...props}
      >
        {children}
      </StyledGrid>
    );
  }
);

Grid.displayName = 'Grid';
