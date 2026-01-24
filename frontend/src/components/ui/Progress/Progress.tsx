'use client';

import { memo, FC, useId } from 'react';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ProgressProps,
  ProgressVariant,
  ProgressSize,
  PROGRESS_SIZES,
  PROGRESS_ANIMATION,
} from './types';

const ProgressContainer = styled.div`
  width: 100%;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const LabelText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LabelValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ProgressTrack = styled.div<{ $size: ProgressSize }>`
  position: relative;
  width: 100%;
  height: ${({ $size }) => PROGRESS_SIZES[$size].height}px;
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)<{ $variant: ProgressVariant }>`
  height: 100%;
  background-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.success[600];
      case 'warning':
        return theme.colors.warning[600];
      case 'danger':
        return theme.colors.danger[600];
      default:
        return theme.colors.primary[600];
    }
  }};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

const IndeterminateFill = styled(motion.div)<{ $variant: ProgressVariant }>`
  position: absolute;
  height: 100%;
  width: 40%;
  background-color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.success[600];
      case 'warning':
        return theme.colors.warning[600];
      case 'danger':
        return theme.colors.danger[600];
      default:
        return theme.colors.primary[600];
    }
  }};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

const ProgressDetails = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DetailLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

export const Progress: FC<ProgressProps> = memo(({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'primary',
  size = 'md',
  animated = false,
  indeterminate = false,
  details,
  className,
  'aria-label': ariaLabel,
}) => {
  const id = useId();
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const fillAnimation = shouldReduceMotion
    ? { width: `${percentage}%` }
    : {
        initial: PROGRESS_ANIMATION.fill.initial,
        animate: PROGRESS_ANIMATION.fill.animate(percentage),
        transition: PROGRESS_ANIMATION.fill.transition,
      };

  const pulseAnimation = animated && !shouldReduceMotion
    ? {
        animate: PROGRESS_ANIMATION.pulse.animate,
        transition: PROGRESS_ANIMATION.pulse.transition,
      }
    : {};

  const indeterminateAnimation = shouldReduceMotion
    ? {}
    : {
        animate: PROGRESS_ANIMATION.indeterminate.animate,
        transition: PROGRESS_ANIMATION.indeterminate.transition,
      };

  return (
    <ProgressContainer className={className}>
      {(label || showValue) && (
        <ProgressLabel>
          {label && <LabelText id={`${id}-label`}>{label}</LabelText>}
          {showValue && !indeterminate && (
            <LabelValue>
              {value.toLocaleString()} / {max.toLocaleString()} ({Math.round(percentage)}%)
            </LabelValue>
          )}
          {indeterminate && <LabelValue>Loading...</LabelValue>}
        </ProgressLabel>
      )}
      <ProgressTrack
        $size={size}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? undefined : (ariaLabel || 'Progress')}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-busy={indeterminate}
      >
        {indeterminate ? (
          <IndeterminateFill
            $variant={variant}
            {...indeterminateAnimation}
          />
        ) : (
          <ProgressFill
            $variant={variant}
            {...fillAnimation}
            {...pulseAnimation}
          />
        )}
      </ProgressTrack>
      {details && details.length > 0 && (
        <ProgressDetails>
          {details.map((detail) => (
            <DetailItem key={detail.label}>
              <DetailValue>{detail.value}</DetailValue>
              <DetailLabel>{detail.label}</DetailLabel>
            </DetailItem>
          ))}
        </ProgressDetails>
      )}
    </ProgressContainer>
  );
});

Progress.displayName = 'Progress';
