'use client';

import { memo, FC } from 'react';
import styled, { DefaultTheme } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { SpinnerProps, SpinnerSize, SpinnerColor, SPINNER_SIZES } from './types';

const SpinnerContainer = styled.div<{ $size: SpinnerSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => SPINNER_SIZES[$size].size}px;
  height: ${({ $size }) => SPINNER_SIZES[$size].size}px;
`;

const CircleSpinner = styled(motion.div)<{ $size: SpinnerSize; $color: SpinnerColor }>`
  width: 100%;
  height: 100%;
  border: ${({ $size }) => SPINNER_SIZES[$size].borderWidth}px solid
    ${({ $color, theme }) => {
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
  border-top-color: ${({ $color, theme }) => {
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
  border-radius: 50%;
`;

const DotsContainer = styled.div<{ $size: SpinnerSize }>`
  display: flex;
  align-items: center;
  gap: ${({ $size }) => Math.max(2, SPINNER_SIZES[$size].dotSize / 2)}px;
`;

const Dot = styled(motion.div)<{ $size: SpinnerSize; $color: SpinnerColor }>`
  width: ${({ $size }) => SPINNER_SIZES[$size].dotSize}px;
  height: ${({ $size }) => SPINNER_SIZES[$size].dotSize}px;
  border-radius: 50%;
  background-color: ${({ $color, theme }) => {
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
`;

const PulseSpinner = styled(motion.div)<{ $size: SpinnerSize; $color: SpinnerColor }>`
  width: ${({ $size }) => SPINNER_SIZES[$size].size * 0.6}px;
  height: ${({ $size }) => SPINNER_SIZES[$size].size * 0.6}px;
  border-radius: 50%;
  background-color: ${({ $color, theme }) => {
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
`;

export const Spinner: FC<SpinnerProps> = memo(({
  size = 'md',
  color = 'primary',
  variant = 'circle',
  label = 'Loading',
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <DotsContainer $size={size}>
            {[0, 1, 2].map((index) => (
              <Dot
                key={index}
                $size={size}
                $color={color}
                animate={
                  prefersReducedMotion
                    ? { opacity: [0.5, 1, 0.5] }
                    : { y: [0, -6, 0] }
                }
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: index * 0.15,
                }}
              />
            ))}
          </DotsContainer>
        );

      case 'pulse':
        return (
          <PulseSpinner
            $size={size}
            $color={color}
            animate={
              prefersReducedMotion
                ? { opacity: [1, 0.5, 1] }
                : { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }
            }
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        );

      case 'circle':
      default:
        return (
          <CircleSpinner
            $size={size}
            $color={color}
            animate={{ rotate: 360 }}
            transition={{
              duration: prefersReducedMotion ? 1.5 : 0.8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
    }
  };

  return (
    <SpinnerContainer
      $size={size}
      className={className}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {renderSpinner()}
      <span className="sr-only" style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}>
        {label}
      </span>
    </SpinnerContainer>
  );
});

Spinner.displayName = 'Spinner';
