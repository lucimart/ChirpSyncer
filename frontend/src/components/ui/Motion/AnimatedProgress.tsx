'use client';

/**
 * AnimatedProgress
 *
 * Progress bar with physics-based animation using react-spring.
 * Natural bounce when reaching 100%.
 */

import { memo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import { useSpring, animated, config } from '@react-spring/web';

export interface AnimatedProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  label?: string;
  className?: string;
}

// Size mappings
const SIZE_MAP = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

// Color mappings
const getBarColor = (color: string, theme: unknown) => {
  const t = theme as {
    colors: {
      primary: Record<number, string>;
      success: Record<number, string>;
      warning: Record<number, string>;
      danger: Record<number, string>;
    };
  };

  switch (color) {
    case 'success':
      return t.colors.success[500];
    case 'warning':
      return t.colors.warning[500];
    case 'danger':
      return t.colors.danger[500];
    default:
      return t.colors.primary[500];
  }
};

// Styled Components
const Container = styled.div`
  width: 100%;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ValueText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Track = styled.div<{ $size: string }>`
  width: 100%;
  height: ${({ $size }) => $size};
  background: ${({ theme }) => theme.colors.neutral[100]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const Bar = styled(animated.div)<{ $color: string; $size: string }>`
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transform-origin: left center;
`;

export const AnimatedProgress: FC<AnimatedProgressProps> = memo(({
  value,
  size = 'md',
  color = 'primary',
  showValue = false,
  label,
  className,
}) => {
  const theme = useTheme();
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Spring animation with bounce at 100%
  const springConfig = clampedValue === 100
    ? { tension: 200, friction: 12 } // Bounce when complete
    : config.gentle;

  const { width } = useSpring({
    width: clampedValue,
    config: springConfig,
  });

  const sizeValue = SIZE_MAP[size];

  return (
    <Container className={className} data-testid="animated-progress">
      {(label || showValue) && (
        <LabelRow>
          {label && <Label>{label}</Label>}
          {showValue && (
            <ValueText>
              <animated.span>
                {width.to((w) => `${Math.round(w)}%`)}
              </animated.span>
            </ValueText>
          )}
        </LabelRow>
      )}
      <Track $size={sizeValue} role="progressbar" aria-valuenow={clampedValue}>
        <Bar
          $color={getBarColor(color, theme)}
          $size={sizeValue}
          style={{
            width: width.to((w) => `${w}%`),
          }}
        />
      </Track>
    </Container>
  );
});

AnimatedProgress.displayName = 'AnimatedProgress';

// Circular progress variant
export interface AnimatedCircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
}

const CircularContainer = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`;

const CircularSvg = styled.svg`
  transform: rotate(-90deg);
`;

const CircularTrack = styled.circle`
  fill: none;
  stroke: ${({ theme }) => theme.colors.neutral[100]};
`;

const CircularBar = styled(animated.circle)<{ $color: string }>`
  fill: none;
  stroke: ${({ $color }) => $color};
  stroke-linecap: round;
`;

const CircularValue = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const AnimatedCircularProgress: FC<AnimatedCircularProgressProps> = memo(({
  value,
  size = 60,
  strokeWidth = 6,
  color = 'primary',
  showValue = true,
  className,
}) => {
  const theme = useTheme();
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const { offset, displayValue } = useSpring({
    offset: circumference - (clampedValue / 100) * circumference,
    displayValue: clampedValue,
    config: config.gentle,
  });

  return (
    <CircularContainer $size={size} className={className} data-testid="animated-circular-progress">
      <CircularSvg width={size} height={size}>
        <CircularTrack
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <CircularBar
          $color={getBarColor(color, theme)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
        />
      </CircularSvg>
      {showValue && (
        <CircularValue>
          <animated.span>
            {displayValue.to((v) => `${Math.round(v)}%`)}
          </animated.span>
        </CircularValue>
      )}
    </CircularContainer>
  );
});

AnimatedCircularProgress.displayName = 'AnimatedCircularProgress';

export default AnimatedProgress;
