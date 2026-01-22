'use client';

import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

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

const ProgressTrack = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  width: 100%;
  height: ${({ $size }) =>
    $size === 'sm' ? '4px' : $size === 'md' ? '8px' : '12px'};
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div<{
  $value: number;
  $variant: 'primary' | 'success' | 'warning' | 'danger';
  $animated: boolean;
}>`
  height: 100%;
  width: ${({ $value }) => `${Math.min(100, Math.max(0, $value))}%`};
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
  transition: width ${({ theme }) => theme.transitions.normal};
  animation: ${({ $animated }) => ($animated ? pulse : 'none')} 1.5s ease-in-out
    infinite;
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

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  details?: Array<{ label: string; value: string | number }>;
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  variant = 'primary',
  size = 'md',
  animated = false,
  details,
}: ProgressProps) {
  const percentage = (value / max) * 100;

  return (
    <ProgressContainer>
      {(label || showValue) && (
        <ProgressLabel>
          {label && <LabelText>{label}</LabelText>}
          {showValue && (
            <LabelValue>
              {value.toLocaleString()} / {max.toLocaleString()} (
              {Math.round(percentage)}%)
            </LabelValue>
          )}
        </ProgressLabel>
      )}
      <ProgressTrack $size={size}>
        <ProgressFill
          $value={percentage}
          $variant={variant}
          $animated={animated}
        />
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
}
