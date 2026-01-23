'use client';

import styled, { css } from 'styled-components';
import { HTMLAttributes, forwardRef } from 'react';

type MetaItemSize = 'xs' | 'sm' | 'md';
type MetaItemColor = 'primary' | 'secondary' | 'tertiary';

export interface MetaItemProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Variant style
   * - 'inline': display flex with icon alignment (default)
   * - 'text': simple text styling
   */
  variant?: 'inline' | 'text';
  /** Font size */
  size?: MetaItemSize;
  /** Text color */
  color?: MetaItemColor;
}

const sizeStyles = {
  xs: css`
    font-size: ${({ theme }) => theme.fontSizes.xs};
  `,
  sm: css`
    font-size: ${({ theme }) => theme.fontSizes.sm};
  `,
  md: css`
    font-size: ${({ theme }) => theme.fontSizes.base};
  `,
};

const colorStyles = {
  primary: css`
    color: ${({ theme }) => theme.colors.text.primary};
  `,
  secondary: css`
    color: ${({ theme }) => theme.colors.text.secondary};
  `,
  tertiary: css`
    color: ${({ theme }) => theme.colors.text.tertiary};
  `,
};

const StyledMetaItem = styled.span<{
  $variant: 'inline' | 'text';
  $size: MetaItemSize;
  $color: MetaItemColor;
}>`
  ${({ $variant, theme }) =>
    $variant === 'inline'
      ? `
        display: flex;
        align-items: center;
        gap: ${theme.spacing[1]};
      `
      : ``}
  ${({ $size }) => sizeStyles[$size]}
  ${({ $color }) => colorStyles[$color]}
`;

export const MetaItem = forwardRef<HTMLSpanElement, MetaItemProps>(
  ({ variant = 'inline', size = 'sm', color = 'secondary', children, ...props }, ref) => {
    return (
      <StyledMetaItem ref={ref} $variant={variant} $size={size} $color={color} {...props}>
        {children}
      </StyledMetaItem>
    );
  }
);

MetaItem.displayName = 'MetaItem';
