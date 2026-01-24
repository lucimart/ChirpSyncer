'use client';

import { memo, FC, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  BadgeProps,
  BadgeVariant,
  BadgeSize,
  BADGE_SIZES,
  BADGE_ANIMATION,
} from './types';

const variantStyles: Record<BadgeVariant, ReturnType<typeof css>> = {
  default: css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: ${({ theme }) => theme.colors.border.default};
  `,
  primary: css`
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
    color: ${({ theme }) => theme.colors.surface.primary.text};
    border-color: ${({ theme }) => theme.colors.surface.primary.border};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.surface.success.bg};
    color: ${({ theme }) => theme.colors.surface.success.text};
    border-color: ${({ theme }) => theme.colors.surface.success.border};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.surface.warning.bg};
    color: ${({ theme }) => theme.colors.surface.warning.text};
    border-color: ${({ theme }) => theme.colors.surface.warning.border};
  `,
  danger: css`
    background-color: ${({ theme }) => theme.colors.surface.danger.bg};
    color: ${({ theme }) => theme.colors.surface.danger.text};
    border-color: ${({ theme }) => theme.colors.surface.danger.border};
  `,
  info: css`
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
    color: ${({ theme }) => theme.colors.surface.primary.text};
    border-color: ${({ theme }) => theme.colors.surface.primary.border};
  `,
  neutral: css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: ${({ theme }) => theme.colors.border.default};
  `,
  'neutral-soft': css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
    border-color: ${({ theme }) => theme.colors.background.tertiary};
  `,
  'success-soft': css`
    background-color: ${({ theme }) => theme.colors.surface.success.bg};
    color: ${({ theme }) => theme.colors.surface.success.text};
    border-color: ${({ theme }) => theme.colors.surface.success.bg};
  `,
  'warning-soft': css`
    background-color: ${({ theme }) => theme.colors.surface.warning.bg};
    color: ${({ theme }) => theme.colors.surface.warning.text};
    border-color: ${({ theme }) => theme.colors.surface.warning.bg};
  `,
  'danger-soft': css`
    background-color: ${({ theme }) => theme.colors.surface.danger.bg};
    color: ${({ theme }) => theme.colors.surface.danger.text};
    border-color: ${({ theme }) => theme.colors.surface.danger.bg};
  `,
  'primary-soft': css`
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
    color: ${({ theme }) => theme.colors.surface.primary.text};
    border-color: ${({ theme }) => theme.colors.surface.primary.bg};
  `,
  text: css`
    background-color: transparent;
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: transparent;
  `,
  'status-success': css`
    background-color: ${({ theme }) => theme.colors.success[600]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: transparent;
  `,
  'status-warning': css`
    background-color: ${({ theme }) => theme.colors.surface.warning.bg};
    color: ${({ theme }) => theme.colors.surface.warning.text};
    border-color: transparent;
  `,
  'status-danger': css`
    background-color: ${({ theme }) => theme.colors.danger[600]};
    color: ${({ theme }) => theme.colors.text.inverse};
    border-color: transparent;
  `,
  'status-primary': css`
    background-color: ${({ theme }) => theme.colors.primary[600]};
    color: white;
    border-color: transparent;
  `,
  twitter: css`
    background-color: #1da1f2;
    color: white;
    border-color: transparent;
  `,
  bluesky: css`
    background-color: #0085ff;
    color: white;
    border-color: transparent;
  `,
  count: css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.tertiary};
    border-color: transparent;
  `,
};

const StyledBadge = styled.span<{
  $variant: BadgeVariant;
  $size: BadgeSize;
  $outline: boolean;
  $removable: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.fast};
  border: 1px solid transparent;
  gap: ${({ $size }) => BADGE_SIZES[$size].gap};
  padding: ${({ $size }) => BADGE_SIZES[$size].padding};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[BADGE_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};

  ${({ $variant }) => variantStyles[$variant]}

  ${({ $outline }) =>
    $outline &&
    css`
      background-color: transparent;
      border-width: 1px;
      border-style: solid;
    `}

  ${({ $removable }) =>
    $removable &&
    css`
      padding-right: 4px;
    `}
`;

const Dot = styled(motion.span)<{ $dotColor?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ $dotColor }) => $dotColor ?? 'currentColor'};
  flex-shrink: 0;
`;

const IconWrapper = styled.span<{ $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: ${({ $size }) => BADGE_SIZES[$size].iconSize}px;
    height: ${({ $size }) => BADGE_SIZES[$size].iconSize}px;
  }
`;

const RemoveButton = styled(motion.button)<{ $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 2px;
  margin-left: 2px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: currentColor;
  opacity: 0.7;
  cursor: pointer;
  transition: opacity ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  svg {
    width: ${({ $size }) => BADGE_SIZES[$size].iconSize - 2}px;
    height: ${({ $size }) => BADGE_SIZES[$size].iconSize - 2}px;
  }
`;

export const Badge: FC<BadgeProps> = memo(({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  outline = false,
  dotColor,
  leftIcon,
  rightIcon,
  removable = false,
  onRemove,
  pulse = false,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove]
  );

  const showPulseAnimation = pulse && !prefersReducedMotion;

  return (
    <StyledBadge
      $variant={variant}
      $size={size}
      $outline={outline}
      $removable={removable}
      {...props}
    >
      {dot && (
        <Dot
          $dotColor={dotColor}
          animate={
            showPulseAnimation
              ? { scale: [...BADGE_ANIMATION.pulse.scale], opacity: [...BADGE_ANIMATION.pulse.opacity] }
              : undefined
          }
          transition={showPulseAnimation ? { ...BADGE_ANIMATION.pulse.transition } : undefined}
          aria-hidden="true"
        />
      )}
      {leftIcon && (
        <IconWrapper $size={size} aria-hidden="true">
          {leftIcon}
        </IconWrapper>
      )}
      {children}
      {rightIcon && (
        <IconWrapper $size={size} aria-hidden="true">
          {rightIcon}
        </IconWrapper>
      )}
      {removable && (
        <RemoveButton
          $size={size}
          onClick={handleRemove}
          aria-label="Remove"
          whileHover={prefersReducedMotion ? undefined : BADGE_ANIMATION.remove.whileHover}
          whileTap={prefersReducedMotion ? undefined : BADGE_ANIMATION.remove.whileTap}
        >
          <X aria-hidden="true" />
        </RemoveButton>
      )}
    </StyledBadge>
  );
});

Badge.displayName = 'Badge';
