'use client';

import styled from 'styled-components';

export interface PlatformIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { container: '32px', font: 'sm' },
  md: { container: '48px', font: 'xl' },
  lg: { container: '64px', font: '2xl' },
} as const;

const IconContainer = styled.div<{
  $color: string;
  $size: 'sm' | 'md' | 'lg';
}>`
  width: ${({ $size }) => SIZES[$size].container};
  height: ${({ $size }) => SIZES[$size].container};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => $color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme, $size }) => theme.fontSizes[SIZES[$size].font]};
  flex-shrink: 0;
`;

export function PlatformIcon({
  icon,
  color,
  size = 'md',
  className,
}: PlatformIconProps) {
  return (
    <IconContainer
      $color={color}
      $size={size}
      className={className}
      data-testid="platform-icon"
    >
      {icon}
    </IconContainer>
  );
}
