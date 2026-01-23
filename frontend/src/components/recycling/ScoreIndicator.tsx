'use client';

import { memo, FC, useState, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';

export type ScoreLevel = 'low' | 'medium' | 'high';
export type ScoreSize = 'sm' | 'md' | 'lg';

export interface ScoreIndicatorProps {
  /** Score value (0-100) */
  value: number;
  /** Label for the score */
  label: string;
  /** Optional tooltip description */
  tooltip?: string;
  /** Compact mode hides the label text */
  compact?: boolean;
  /** Size variant */
  size?: ScoreSize;
  /** Additional CSS class */
  className?: string;
}

const SIZE_CONFIG: Record<ScoreSize, { height: number; fontSize: string; gap: string }> = {
  sm: { height: 4, fontSize: 'xs', gap: '4px' },
  md: { height: 6, fontSize: 'sm', gap: '6px' },
  lg: { height: 8, fontSize: 'md', gap: '8px' },
};

function getScoreLevel(value: number): ScoreLevel {
  if (value < 30) return 'low';
  if (value <= 70) return 'medium';
  return 'high';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const Container = styled.div<{ $size: ScoreSize }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $size }) => SIZE_CONFIG[$size].gap};
  position: relative;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Label = styled.span<{ $size: ScoreSize }>`
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[SIZE_CONFIG[$size].fontSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ScoreValue = styled.span<{ $size: ScoreSize; $level: ScoreLevel }>`
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[SIZE_CONFIG[$size].fontSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $level }) => {
    switch ($level) {
      case 'low':
        return theme.colors.danger[600];
      case 'medium':
        return theme.colors.warning[600];
      case 'high':
        return theme.colors.success[600];
    }
  }};
`;

const Track = styled.div<{ $size: ScoreSize }>`
  position: relative;
  width: 100%;
  height: ${({ $size }) => SIZE_CONFIG[$size].height}px;
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const Fill = styled(motion.div)<{ $level: ScoreLevel }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme, $level }) => {
    switch ($level) {
      case 'low':
        return theme.colors.danger[500];
      case 'medium':
        return theme.colors.warning[500];
      case 'high':
        return theme.colors.success[500];
    }
  }};
`;

const Tooltip = styled(motion.div)`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background-color: ${({ theme }) => theme.colors.neutral[900]};
  color: ${({ theme }) => theme.colors.text.inverse};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${({ theme }) => theme.colors.neutral[900]};
  }
`;

export const ScoreIndicator: FC<ScoreIndicatorProps> = memo(({
  value,
  label,
  tooltip,
  compact = false,
  size = 'md',
  className,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const clampedValue = clampScore(value);
  const level = getScoreLevel(clampedValue);

  const handleMouseEnter = useCallback(() => {
    if (tooltip) {
      setShowTooltip(true);
    }
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const fillAnimation = shouldReduceMotion
    ? { width: `${clampedValue}%` }
    : {
        initial: { width: 0 },
        animate: { width: `${clampedValue}%` },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      };

  return (
    <Container
      $size={size}
      className={className}
      data-testid="score-indicator"
      data-score-level={level}
      data-size={size}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!compact && (
        <LabelRow>
          <Label $size={size}>{label}</Label>
          <ScoreValue $size={size} $level={level}>{clampedValue}</ScoreValue>
        </LabelRow>
      )}

      <Track
        $size={size}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={compact ? `${label}: ${clampedValue}` : undefined}
      >
        <Fill $level={level} {...fillAnimation} />
      </Track>

      {showTooltip && tooltip && (
        <Tooltip
          role="tooltip"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
        >
          {tooltip}
        </Tooltip>
      )}
    </Container>
  );
});

ScoreIndicator.displayName = 'ScoreIndicator';
