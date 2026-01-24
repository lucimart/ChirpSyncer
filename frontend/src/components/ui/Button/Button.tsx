'use client';

import styled, { css } from 'styled-components';
import { forwardRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  BUTTON_ANIMATION,
  SPINNER_ANIMATION,
} from './types';

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
      background-color: ${({ theme }) => theme.colors.surface.primary.bg};
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
    background-color: ${({ theme }) => theme.colors.surface?.danger?.bg ?? theme.colors.danger[50]};
    color: ${({ theme }) => theme.colors.surface?.danger?.text ?? theme.colors.danger[700]};
    border: 1px solid transparent;

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surface?.dangerSubtle?.bg ?? theme.colors.danger[100]};
    }
  `,
  dashed: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.primary[600]};
    border: 1px dashed ${({ theme }) => theme.colors.primary[200]};

    &:hover:not(:disabled) {
      background-color: ${({ theme }) => theme.colors.surface?.primary?.bg ?? theme.colors.primary[50]};
      border-color: ${({ theme }) => theme.colors.primary[400]};
    }
  `,
};

const sizeStyles = {
  xs: css`
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    height: 28px;
    gap: ${({ theme }) => theme.spacing[1]};
  `,
  sm: css`
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    height: 32px;
    gap: ${({ theme }) => theme.spacing[1]};
  `,
  md: css`
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
    font-size: ${({ theme }) => theme.fontSizes.base};
    height: 40px;
    gap: ${({ theme }) => theme.spacing[2]};
  `,
  lg: css`
    padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[6]}`};
    font-size: ${({ theme }) => theme.fontSizes.lg};
    height: 48px;
    gap: ${({ theme }) => theme.spacing[2]};
  `,
  icon: css`
    padding: ${({ theme }) => theme.spacing[2]};
    width: 36px;
    height: 36px;
    gap: 0;
  `,
};

const StyledButton = styled(motion.button)<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $isLoading: boolean;
  $isRound: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme, $isRound }) =>
    $isRound ? '9999px' : theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  white-space: nowrap;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  /* Remove default outline, add custom focus-visible */
  outline: none;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $size }) => sizeStyles[$size]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $isLoading }) =>
    $isLoading &&
    css`
      cursor: wait;
    `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Spinner = styled(motion.span)<{ $size: ButtonSize }>`
  display: inline-flex;
  width: ${({ $size }) => ($size === 'xs' || $size === 'sm' ? '14px' : '16px')};
  height: ${({ $size }) => ($size === 'xs' || $size === 'sm' ? '14px' : '16px')};
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  flex-shrink: 0;
`;

const IconWrapper = styled.span<{ $position: 'left' | 'right' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ContentWrapper = styled.span<{ $isLoading: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $isLoading }) => ($isLoading ? 0 : 1)};
  gap: inherit;
`;

const LoadingWrapper = styled.span`
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      isRound = false,
      disableAnimations = false,
      children,
      disabled,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const shouldAnimate = !disableAnimations && !shouldReduceMotion && !isLoading && !disabled;

    const animationProps = useMemo(() => {
      if (!shouldAnimate) {
        return {};
      }
      return {
        whileHover: BUTTON_ANIMATION.hover,
        whileTap: BUTTON_ANIMATION.tap,
        transition: BUTTON_ANIMATION.transition,
      };
    }, [shouldAnimate]);

    const spinnerAnimation = useMemo(() => {
      if (shouldReduceMotion) {
        return {};
      }
      return {
        animate: SPINNER_ANIMATION.animate,
        transition: SPINNER_ANIMATION.transition,
      };
    }, [shouldReduceMotion]);

    // Accessibility: announce loading state
    const computedAriaLabel = isLoading && loadingText
      ? loadingText
      : ariaLabel;

    return (
      <StyledButton
        ref={ref}
        $variant={variant}
        $size={size}
        $fullWidth={fullWidth}
        $isLoading={isLoading}
        $isRound={isRound}
        disabled={disabled || isLoading}
        aria-label={computedAriaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...animationProps}
        {...props}
      >
        {isLoading && (
          <LoadingWrapper aria-hidden="true">
            <Spinner $size={size} {...spinnerAnimation} />
            {loadingText && <span>{loadingText}</span>}
          </LoadingWrapper>
        )}
        <ContentWrapper $isLoading={isLoading}>
          {leftIcon && <IconWrapper $position="left" aria-hidden="true">{leftIcon}</IconWrapper>}
          {children}
          {rightIcon && <IconWrapper $position="right" aria-hidden="true">{rightIcon}</IconWrapper>}
        </ContentWrapper>
        {isLoading && (
          <VisuallyHidden role="status" aria-live="polite">
            {loadingText || 'Loading'}
          </VisuallyHidden>
        )}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';
