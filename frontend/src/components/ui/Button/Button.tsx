'use client';

import styled, { css } from 'styled-components';
import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'danger' 
  | 'outline' 
  | 'soft' 
  | 'danger-soft' 
  | 'dashed';

type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: css`
    background-color: ${({ theme }) => theme.colors.primary[600]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border: 1px solid ${({ theme }) => theme.colors.primary[600]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primary[700]};
      border-color: ${({ theme }) => theme.colors.primary[700]};
    }
  `,
  secondary: css`
    background-color: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.background.secondary};
      border-color: ${({ theme }) => theme.colors.border.dark};
    }
  `,
  ghost: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.background.secondary};
    }
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.danger[600]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border: 1px solid ${({ theme }) => theme.colors.danger[600]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.danger[700]};
      border-color: ${({ theme }) => theme.colors.danger[700]};
    }
  `,
  outline: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary[600]};
    border: 1px solid ${({ theme }) => theme.colors.border.light};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primary[50]};
      border-color: ${({ theme }) => theme.colors.primary[500]};
    }
  `,
  soft: css`
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.secondary};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.background.tertiary};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  `,
  'danger-soft': css`
    background-color: ${({ theme }) => theme.colors.danger[50]};
    color: ${({ theme }) => theme.colors.danger[700]};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.danger[100]};
    }
  `,
  dashed: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary[600]};
    border: 1px dashed ${({ theme }) => theme.colors.primary[200]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.primary[50]};
      border-color: ${({ theme }) => theme.colors.primary[400]};
    }
  `,
};

const sizeStyles = {
  sm: css`
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    height: 32px;
  `,
  md: css`
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
    font-size: ${({ theme }) => theme.fontSizes.base};
    height: 40px;
  `,
  lg: css`
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
    font-size: ${({ theme }) => theme.fontSizes.lg};
    height: 48px;
  `,
  icon: css`
    padding: ${({ theme }) => theme.spacing[2]};
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $isLoading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  white-space: nowrap;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size }) => sizeStyles[$size]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $isLoading }) =>
    $isLoading &&
    css`
      pointer-events: none;
      opacity: 0.7;
    `}
`;

const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <StyledButton
        ref={ref}
        $variant={variant}
        $size={size}
        $fullWidth={fullWidth}
        $isLoading={isLoading}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Spinner />}
        {children}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';
