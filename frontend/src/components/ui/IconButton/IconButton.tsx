'use client';

import { forwardRef, memo } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  IconButtonProps,
  IconButtonVariant,
  IconButtonSize,
  IconButtonColor,
  ICON_BUTTON_SIZES,
  ICON_BUTTON_ANIMATION,
} from './types';
import { Spinner } from '../Spinner';

const getColorStyles = (color: IconButtonColor, variant: IconButtonVariant) => {
  if (color === 'primary') {
    switch (variant) {
      case 'solid':
        return css`
          background-color: ${({ theme }) => theme.colors.primary[600]};
          color: white;
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.primary[700]};
          }
        `;
      case 'soft':
        return css`
          background-color: ${({ theme }) => theme.colors.primary[100]};
          color: ${({ theme }) => theme.colors.primary[700]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.primary[200]};
          }
        `;
      case 'outline':
        return css`
          border-color: ${({ theme }) => theme.colors.primary[500]};
          color: ${({ theme }) => theme.colors.primary[600]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.primary[50]};
            border-color: ${({ theme }) => theme.colors.primary[600]};
          }
        `;
      default:
        return css`
          color: ${({ theme }) => theme.colors.primary[600]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.primary[50]};
            color: ${({ theme }) => theme.colors.primary[700]};
          }
        `;
    }
  }

  if (color === 'danger') {
    switch (variant) {
      case 'solid':
        return css`
          background-color: ${({ theme }) => theme.colors.danger[600]};
          color: white;
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.danger[700]};
          }
        `;
      case 'soft':
        return css`
          background-color: ${({ theme }) => theme.colors.danger[100]};
          color: ${({ theme }) => theme.colors.danger[700]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.danger[200]};
          }
        `;
      case 'outline':
        return css`
          border-color: ${({ theme }) => theme.colors.danger[500]};
          color: ${({ theme }) => theme.colors.danger[600]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.danger[50]};
            border-color: ${({ theme }) => theme.colors.danger[600]};
          }
        `;
      default:
        return css`
          color: ${({ theme }) => theme.colors.danger[600]};
          &:hover:not(:disabled) {
            background-color: ${({ theme }) => theme.colors.danger[50]};
            color: ${({ theme }) => theme.colors.danger[700]};
          }
        `;
    }
  }

  return css``;
};

const variantStyles: Record<IconButtonVariant, ReturnType<typeof css>> = {
  ghost: css`
    background: none;
    border: none;
    color: ${({ theme }) => theme.colors.text.tertiary};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.background.secondary};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  `,
  soft: css`
    background-color: ${({ theme }) => theme.colors.background.secondary};
    border: none;
    color: ${({ theme }) => theme.colors.text.secondary};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.background.tertiary};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  `,
  outline: css`
    background: none;
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.secondary};

    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.border.dark};
      color: ${({ theme }) => theme.colors.text.primary};
    }
  `,
  solid: css`
    background-color: ${({ theme }) => theme.colors.neutral[800]};
    border: none;
    color: white;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.neutral[900]};
    }
  `,
};

const StyledIconButton = styled(motion.button)<{
  $variant: IconButtonVariant;
  $size: IconButtonSize;
  $color: IconButtonColor;
  $round: boolean;
  $loading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme, $round }) =>
    $round ? theme.borderRadius.full : theme.borderRadius.md};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};
  width: ${({ $size }) => ICON_BUTTON_SIZES[$size].size}px;
  height: ${({ $size }) => ICON_BUTTON_SIZES[$size].size}px;
  flex-shrink: 0;
  position: relative;

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $color, $variant }) => getColorStyles($color, $variant)}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $loading }) =>
    $loading &&
    css`
      cursor: wait;
      pointer-events: none;
    `}

  svg {
    width: ${({ $size }) => ICON_BUTTON_SIZES[$size].iconSize}px;
    height: ${({ $size }) => ICON_BUTTON_SIZES[$size].iconSize}px;
  }
`;

const IconButtonBase = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'ghost',
      size = 'md',
      color = 'default',
      loading = false,
      round = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const motionProps = !disabled && !loading && !prefersReducedMotion
      ? {
          whileHover: ICON_BUTTON_ANIMATION.hover,
          whileTap: ICON_BUTTON_ANIMATION.tap,
        }
      : {};

    const spinnerSize = size === 'xs' ? 'xs' : size === 'sm' ? 'xs' : 'sm';
    const spinnerColor = variant === 'solid' ? 'white' : 'current';

    return (
      <StyledIconButton
        ref={ref}
        $variant={variant}
        $size={size}
        $color={color}
        $round={round}
        $loading={loading}
        disabled={disabled || loading}
        {...motionProps}
        {...props}
      >
        {loading ? (
          <Spinner size={spinnerSize} color={spinnerColor} />
        ) : (
          icon || children
        )}
      </StyledIconButton>
    );
  }
);

IconButtonBase.displayName = 'IconButton';

export const IconButton = memo(IconButtonBase);
