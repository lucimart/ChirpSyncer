'use client';

import { memo, useId, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import {
  ToggleGroupProps,
  ToggleGroupSize,
  ToggleGroupVariant,
  TOGGLE_GROUP_SIZES,
  TOGGLE_GROUP_ANIMATION,
} from './types';

const Container = styled.div<{ $variant: ToggleGroupVariant }>`
  display: inline-flex;
  gap: ${({ $variant }) => $variant === 'outline' ? '0' : '4px'};
  background-color: ${({ $variant, theme }) =>
    $variant === 'pill' ? theme.colors.background.secondary : 'transparent'};
  padding: ${({ $variant, theme }) =>
    $variant === 'pill' ? theme.spacing[1] : '0'};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: ${({ $variant, theme }) =>
    $variant === 'outline' ? `1px solid ${theme.colors.border.default}` : 'none'};
`;

const ButtonWrapper = styled.div<{ $variant: ToggleGroupVariant }>`
  position: relative;

  &:not(:last-child) {
    border-right: ${({ $variant, theme }) =>
      $variant === 'outline' ? `1px solid ${theme.colors.border.default}` : 'none'};
  }
`;

const ActiveIndicator = styled(motion.div)<{ $variant: ToggleGroupVariant }>`
  position: absolute;
  inset: ${({ $variant }) => $variant === 'pill' ? '0' : '2px'};
  background-color: ${({ $variant, theme }) =>
    $variant === 'pill'
      ? theme.colors.background.primary
      : theme.colors.surface.primary.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ $variant, theme }) =>
    $variant === 'pill'
      ? theme.shadows?.sm || '0 1px 2px rgba(0,0,0,0.1)'
      : 'none'};
  border: ${({ $variant, theme }) =>
    $variant === 'default'
      ? `1px solid ${theme.colors.primary[500]}`
      : 'none'};
  z-index: 0;
`;

const ToggleButton = styled.button<{
  $active: boolean;
  $size: ToggleGroupSize;
  $variant: ToggleGroupVariant;
  $disabled?: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ $size }) => TOGGLE_GROUP_SIZES[$size].padding};
  border-radius: ${({ theme, $variant }) =>
    $variant === 'outline' ? '0' : theme.borderRadius.md};
  border: ${({ $variant, $active, theme }) =>
    $variant === 'default' && !$active
      ? `1px solid ${theme.colors.border.default}`
      : $variant === 'default' && $active
        ? '1px solid transparent'
        : 'none'};
  background-color: transparent;
  color: ${({ $active, $disabled, theme }) =>
    $disabled
      ? theme.colors.text.disabled
      : $active
        ? theme.colors.text.primary
        : theme.colors.text.secondary};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[TOGGLE_GROUP_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: color 0.15s ease;
  white-space: nowrap;
  z-index: 1;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};

  &:first-child {
    border-radius: ${({ theme, $variant }) =>
      $variant === 'outline'
        ? `${theme.borderRadius.md} 0 0 ${theme.borderRadius.md}`
        : theme.borderRadius.md};
  }

  &:last-child {
    border-radius: ${({ theme, $variant }) =>
      $variant === 'outline'
        ? `0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0`
        : theme.borderRadius.md};
  }

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
    z-index: 2;
  }

  svg {
    width: ${({ $size }) => TOGGLE_GROUP_SIZES[$size].iconSize}px;
    height: ${({ $size }) => TOGGLE_GROUP_SIZES[$size].iconSize}px;
  }
`;

function ToggleGroupComponent<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className,
  'aria-label': ariaLabel,
  id: providedId,
}: ToggleGroupProps<T>) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const shouldReduceMotion = useReducedMotion();

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    const enabledOptions = options.filter(opt => !opt.disabled);
    const currentEnabledIndex = enabledOptions.findIndex(opt => opt.value === options[currentIndex].value);

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentEnabledIndex + 1) % enabledOptions.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentEnabledIndex - 1 + enabledOptions.length) % enabledOptions.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledOptions.length - 1;
        break;
    }

    if (nextIndex !== null) {
      const nextOption = enabledOptions[nextIndex];
      buttonRefs.current.get(nextOption.value)?.focus();
      onChange(nextOption.value);
    }
  }, [options, onChange]);

  const indicatorTransition = shouldReduceMotion
    ? { duration: 0 }
    : TOGGLE_GROUP_ANIMATION.indicator.transition;

  return (
    <LayoutGroup id={id}>
      <Container
        $variant={variant}
        className={className}
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((option, index) => {
          const isActive = value === option.value;

          return (
            <ButtonWrapper key={option.value} $variant={variant}>
              {isActive && (
                <ActiveIndicator
                  $variant={variant}
                  layoutId={`${id}-indicator`}
                  transition={indicatorTransition}
                />
              )}
              <ToggleButton
                ref={(el) => {
                  if (el) buttonRefs.current.set(option.value, el);
                }}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-disabled={option.disabled}
                $active={isActive}
                $size={size}
                $variant={variant}
                $disabled={option.disabled}
                onClick={() => !option.disabled && onChange(option.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={isActive ? 0 : -1}
                disabled={option.disabled}
              >
                {option.icon}
                {option.label}
              </ToggleButton>
            </ButtonWrapper>
          );
        })}
      </Container>
    </LayoutGroup>
  );
}

ToggleGroupComponent.displayName = 'ToggleGroup';

export const ToggleGroup = memo(ToggleGroupComponent) as typeof ToggleGroupComponent;
