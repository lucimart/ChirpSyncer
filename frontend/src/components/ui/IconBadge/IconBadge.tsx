'use client';

import styled, { css } from 'styled-components';
import { ReactNode } from 'react';

type IconBadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'custom';
type IconBadgeSize = 'sm' | 'md' | 'lg';

export interface IconBadgeProps {
  variant?: IconBadgeVariant;
  size?: IconBadgeSize;
  /** Custom color (hex). Used when variant is 'custom' or as override. */
  color?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  primary: css`
    background-color: ${({ theme }) => theme.colors.primary[100]};
    color: ${({ theme }) => theme.colors.primary[600]};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.success[100]};
    color: ${({ theme }) => theme.colors.success[600]};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.warning[100]};
    color: ${({ theme }) => theme.colors.warning[600]};
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.danger[100]};
    color: ${({ theme }) => theme.colors.danger[600]};
  `,
  neutral: css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
  `,
  custom: css``,
};

const sizeStyles = {
  sm: css`
    width: 32px;
    height: 32px;
  `,
  md: css`
    width: 40px;
    height: 40px;
  `,
  lg: css`
    width: 48px;
    height: 48px;
  `,
};

const StyledIconBadge = styled.div<{
  $variant: IconBadgeVariant;
  $size: IconBadgeSize;
  $color?: string;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  flex-shrink: 0;
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size }) => sizeStyles[$size]}
  ${({ $color }) =>
    $color &&
    css`
      background-color: ${$color}15;
      color: ${$color};
    `}
`;

export function IconBadge({
  variant = 'primary',
  size = 'md',
  color,
  children,
  className,
}: IconBadgeProps) {
  return (
    <StyledIconBadge
      $variant={color ? 'custom' : variant}
      $size={size}
      $color={color}
      className={className}
      data-testid="icon-badge"
    >
      {children}
    </StyledIconBadge>
  );
}
