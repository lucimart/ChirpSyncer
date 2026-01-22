'use client';

import styled, { keyframes } from 'styled-components';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'current';
  className?: string;
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const sizeMap = {
  xs: '12px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
};

const borderWidthMap = {
  xs: '1.5px',
  sm: '2px',
  md: '2.5px',
  lg: '3px',
  xl: '4px',
};

const SpinnerElement = styled.div<{ $size: SpinnerProps['size']; $color: SpinnerProps['color'] }>`
  display: inline-block;
  width: ${({ $size = 'md' }) => sizeMap[$size]};
  height: ${({ $size = 'md' }) => sizeMap[$size]};
  border: ${({ $size = 'md' }) => borderWidthMap[$size]} solid transparent;
  border-top-color: ${({ $color = 'primary', theme }) => {
    switch ($color) {
      case 'white':
        return '#ffffff';
      case 'current':
        return 'currentColor';
      case 'secondary':
        return theme.colors.text.secondary;
      default:
        return theme.colors.primary[600];
    }
  }};
  border-right-color: ${({ $color = 'primary', theme }) => {
    switch ($color) {
      case 'white':
        return 'rgba(255, 255, 255, 0.3)';
      case 'current':
        return 'currentColor';
      case 'secondary':
        return theme.colors.neutral[300];
      default:
        return theme.colors.primary[200];
    }
  }};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

export const Spinner = ({ size = 'md', color = 'primary', className }: SpinnerProps) => {
  return (
    <SpinnerElement
      $size={size}
      $color={color}
      className={className}
      role="status"
      aria-label="Loading"
    />
  );
};

Spinner.displayName = 'Spinner';
