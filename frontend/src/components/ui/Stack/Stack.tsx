'use client';

import styled from 'styled-components';
import { HTMLAttributes, forwardRef } from 'react';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** Stack direction */
  direction?: 'column' | 'row';
  /** Gap between items */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  /** Align items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** Wrap items */
  wrap?: boolean;
}

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
} as const;

const StyledStack = styled.div<{
  $direction: 'column' | 'row';
  $gap: number;
  $align: string;
  $justify: string;
  $wrap: boolean;
}>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  gap: ${({ theme, $gap }) => theme.spacing[$gap]};
  align-items: ${({ $align }) => $align};
  justify-content: ${({ $justify }) => $justify};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`;

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      direction = 'column',
      gap = 4,
      align = 'stretch',
      justify = 'start',
      wrap = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledStack
        ref={ref}
        $direction={direction}
        $gap={gap}
        $align={alignMap[align]}
        $justify={justifyMap[justify]}
        $wrap={wrap}
        {...props}
      >
        {children}
      </StyledStack>
    );
  }
);

Stack.displayName = 'Stack';
