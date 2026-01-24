'use client';

import styled, { css } from 'styled-components';
import { forwardRef, HTMLAttributes } from 'react';

export interface SelectableCardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
};

const StyledSelectableCard = styled.div<{ $selected: boolean; $padding: string }>`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ $padding }) => $padding};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.default};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  ${({ $selected, theme }) =>
    $selected &&
    css`
      box-shadow: 0 0 0 1px ${theme.colors.primary[200]};
    `}
`;

export const SelectableCard = forwardRef<HTMLDivElement, SelectableCardProps>(
  ({ selected = false, padding = 'md', children, ...props }, ref) => {
    return (
      <StyledSelectableCard
        ref={ref}
        $selected={selected}
        $padding={paddingMap[padding]}
        {...props}
      >
        {children}
      </StyledSelectableCard>
    );
  }
);

SelectableCard.displayName = 'SelectableCard';
