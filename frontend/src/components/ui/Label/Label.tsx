'use client';

import styled from 'styled-components';
import { LabelHTMLAttributes, forwardRef } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * Bottom margin spacing
   * - 'none': no margin
   * - 'sm': theme.spacing[1]
   * - 'md': theme.spacing[2]
   */
  spacing?: 'none' | 'sm' | 'md';
}

const spacingMap = {
  none: 0,
  sm: 1,
  md: 2,
} as const;

const StyledLabel = styled.label<{ $spacing: 'none' | 'sm' | 'md' }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: block;
  margin-bottom: ${({ theme, $spacing }) =>
    $spacing === 'none' ? 0 : theme.spacing[spacingMap[$spacing]]};
`;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ spacing = 'sm', children, ...props }, ref) => {
    return (
      <StyledLabel ref={ref} $spacing={spacing} {...props}>
        {children}
      </StyledLabel>
    );
  }
);

Label.displayName = 'Label';
