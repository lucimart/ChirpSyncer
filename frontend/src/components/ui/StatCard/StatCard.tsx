'use client';

import { ReactNode, ComponentType } from 'react';
import styled from 'styled-components';
import { Card } from '../Card';

export interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ComponentType<{ size?: number | string }>;
  color?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'centered';
  className?: string;
}

const StyledCard = styled(Card) <{ $variant: 'default' | 'centered' }>`
  display: flex;
  align-items: ${({ $variant }) => ($variant === 'centered' ? 'center' : 'flex-start')};
  justify-content: ${({ $variant }) => ($variant === 'centered' ? 'center' : 'flex-start')};
  flex-direction: ${({ $variant }) => ($variant === 'centered' ? 'column' : 'row')};
  gap: ${({ theme }) => theme.spacing[4]};
  text-align: ${({ $variant }) => ($variant === 'centered' ? 'center' : 'left')};
`;

const IconContainer = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
`;

const Value = styled.div<{ $variant: 'default' | 'centered' }>`
  font-size: ${({ theme, $variant }) =>
    $variant === 'centered' ? theme.fontSizes['3xl'] : theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $variant }) =>
    $variant === 'centered' ? theme.colors.primary[700] : theme.colors.text.primary};
  line-height: 1.2;
`;

const Label = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const TrendBadge = styled.span<{ $direction: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ $direction, theme }) =>
    $direction === 'up' ? theme.colors.success[700] : theme.colors.danger[700]};
  margin-left: ${({ theme }) => theme.spacing[2]};
`;

export function StatCard({
  value,
  label,
  icon: Icon,
  color = '#6366F1',
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <StyledCard
      padding="md"
      $variant={variant}
      className={className}
      data-testid="stat-card"
    >
      {Icon && variant === 'default' && (
        <IconContainer $color={color}>
          <Icon size={24} />
        </IconContainer>
      )}
      <Content>
        <Value $variant={variant}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {trend && (
            <TrendBadge $direction={trend.direction}>
              {trend.direction === 'up' ? '↑' : '↓'}
              {Math.abs(trend.value)}%
            </TrendBadge>
          )}
        </Value>
        <Label>{label}</Label>
      </Content>
    </StyledCard>
  );
}
