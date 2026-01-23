'use client';

import styled, { css } from 'styled-components';
import { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'neutral-soft'
  | 'success-soft'
  | 'warning-soft'
  | 'text'
  | 'status-success'
  | 'status-warning'
  | 'status-danger'
  | 'status-primary';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outline?: boolean;
  dotColor?: string;
}

const variantStyles = {
  default: css`
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[700]};
    border-color: ${({ theme }) => theme.colors.neutral[200]};
  `,
  primary: css`
    background-color: ${({ theme }) => theme.colors.primary[50]};
    color: ${({ theme }) => theme.colors.primary[700]};
    border-color: ${({ theme }) => theme.colors.primary[200]};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.success[50]};
    color: ${({ theme }) => theme.colors.success[700]};
    border-color: ${({ theme }) => theme.colors.success[100]};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.warning[50]};
    color: ${({ theme }) => theme.colors.warning[700]};
    border-color: ${({ theme }) => theme.colors.warning[100]};
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.danger[50]};
    color: ${({ theme }) => theme.colors.danger[700]};
    border-color: ${({ theme }) => theme.colors.danger[100]};
  `,
  info: css`
    background-color: ${({ theme }) => theme.colors.primary[50]};
    color: ${({ theme }) => theme.colors.primary[700]};
    border-color: ${({ theme }) => theme.colors.primary[100]};
  `,
  neutral: css`
    background-color: ${({ theme }) => theme.colors.neutral[200]};
    color: ${({ theme }) => theme.colors.neutral[700]};
    border-color: ${({ theme }) => theme.colors.neutral[200]};
  `,
  'neutral-soft': css`
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[700]};
    border-color: ${({ theme }) => theme.colors.neutral[100]};
  `,
  'success-soft': css`
    background-color: ${({ theme }) => theme.colors.success[100]};
    color: ${({ theme }) => theme.colors.success[700]};
    border-color: ${({ theme }) => theme.colors.success[100]};
  `,
  'warning-soft': css`
    background-color: ${({ theme }) => theme.colors.warning[100]};
    color: ${({ theme }) => theme.colors.warning[700]};
    border-color: ${({ theme }) => theme.colors.warning[100]};
  `,
  text: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: transparent;
  `,
  'status-success': css`
    background-color: ${({ theme }) => theme.colors.success[500]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: transparent;
  `,
  'status-warning': css`
    background-color: ${({ theme }) => theme.colors.warning[500]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: transparent;
  `,
  'status-danger': css`
    background-color: ${({ theme }) => theme.colors.danger[500]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: transparent;
  `,
  'status-primary': css`
    background-color: ${({ theme }) => theme.colors.primary[500]};
    color: white;
    border-color: transparent;
  `,
};

const sizeStyles = {
  xs: css`
    padding: 2px 8px;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    gap: 4px;
  `,
  sm: css`
    padding: 2px 6px;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    gap: 4px;
  `,
  md: css`
    padding: 4px 10px;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    gap: 6px;
  `,
  lg: css`
    padding: 6px 12px;
    font-size: ${({ theme }) => theme.fontSizes.base};
    gap: 8px;
  `,
};

const StyledBadge = styled.span<{
  $variant: BadgeVariant;
  $size: BadgeSize;
  $outline: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.fast};
  border: 1px solid transparent;

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size }) => sizeStyles[$size]}

  ${({ $outline }) =>
    $outline &&
    css`
      background-color: transparent;
      border-width: 1px;
      border-style: solid;
    `}
`;

const Dot = styled.span<{ $variant: BadgeVariant; $dotColor?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ $dotColor }) => $dotColor ?? 'currentColor'};
`;

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  outline = false,
  dotColor,
  ...props
}: BadgeProps) => {
  return (
    <StyledBadge $variant={variant} $size={size} $outline={outline} {...props}>
      {dot && <Dot $variant={variant} $dotColor={dotColor} />}
      {children}
    </StyledBadge>
  );
};

Badge.displayName = 'Badge';
