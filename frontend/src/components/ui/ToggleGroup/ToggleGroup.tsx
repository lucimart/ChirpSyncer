'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface ToggleGroupProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Size variant. Default: 'md' */
  size?: 'sm' | 'md';
  /** Visual style variant. Default: 'default' */
  variant?: 'default' | 'pill';
  className?: string;
}

const Container = styled.div<{ $variant: 'default' | 'pill' }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  background-color: ${({ $variant, theme }) =>
    $variant === 'pill' ? theme.colors.background.secondary : 'transparent'};
  padding: ${({ $variant, theme }) =>
    $variant === 'pill' ? theme.spacing[1] : '0'};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const ToggleButton = styled.button<{
  $active: boolean;
  $size: 'sm' | 'md';
  $variant: 'default' | 'pill';
}>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ $size, theme }) =>
    $size === 'sm'
      ? `${theme.spacing[1]} ${theme.spacing[2]}`
      : `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: ${({ $variant, $active, theme }) =>
    $variant === 'default'
      ? `1px solid ${$active ? theme.colors.primary[500] : theme.colors.border.default}`
      : 'none'};
  background-color: ${({ $active, $variant, theme }) => {
    if ($variant === 'pill') {
      return $active ? theme.colors.background.primary : 'transparent';
    }
    return $active ? theme.colors.primary[50] : 'transparent';
  }};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  font-size: ${({ $size, theme }) =>
    $size === 'sm' ? theme.fontSizes.xs : theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ $active, $variant, theme }) =>
    $active && $variant === 'pill'
      ? theme.shadows?.sm || '0 1px 2px rgba(0,0,0,0.1)'
      : 'none'};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background-color: ${({ $active, $variant, theme }) => {
      if ($variant === 'pill') {
        return $active
          ? theme.colors.background.primary
          : theme.colors.background.tertiary;
      }
      return $active ? theme.colors.primary[50] : theme.colors.background.secondary;
    }};
  }

  svg {
    width: ${({ $size }) => ($size === 'sm' ? '14px' : '16px')};
    height: ${({ $size }) => ($size === 'sm' ? '14px' : '16px')};
  }
`;

export function ToggleGroup<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className,
}: ToggleGroupProps<T>) {
  return (
    <Container $variant={variant} className={className}>
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          type="button"
          $active={value === option.value}
          $size={size}
          $variant={variant}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </ToggleButton>
      ))}
    </Container>
  );
}
