'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const sizeConfig = {
  sm: {
    iconSize: 32,
    titleSize: 'base',
    descSize: 'sm',
    padding: '24px',
    gap: '12px',
  },
  md: {
    iconSize: 48,
    titleSize: 'lg',
    descSize: 'base',
    padding: '40px',
    gap: '16px',
  },
  lg: {
    iconSize: 64,
    titleSize: 'xl',
    descSize: 'base',
    padding: '64px',
    gap: '20px',
  },
};

const Container = styled.div<{ $size: 'sm' | 'md' | 'lg' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ $size }) => sizeConfig[$size].padding};
  gap: ${({ $size }) => sizeConfig[$size].gap};
  border: 2px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.background.primary};
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Title = styled.h3<{ $size: 'sm' | 'md' | 'lg' }>`
  font-size: ${({ theme, $size }) => 
    theme.fontSizes[sizeConfig[$size].titleSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p<{ $size: 'sm' | 'md' | 'lg' }>`
  font-size: ${({ theme, $size }) => 
    theme.fontSizes[sizeConfig[$size].descSize as keyof typeof theme.fontSizes]};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  max-width: 400px;
`;

const ActionWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  'data-testid': testId,
}: EmptyStateProps) => {
  const iconSize = sizeConfig[size].iconSize;

  return (
    <Container $size={size} data-testid={testId}>
      {Icon && (
        <IconWrapper>
          <Icon size={iconSize} strokeWidth={1.5} />
        </IconWrapper>
      )}
      <Title $size={size}>{title}</Title>
      {description && <Description $size={size}>{description}</Description>}
      {action && <ActionWrapper>{action}</ActionWrapper>}
    </Container>
  );
};

EmptyState.displayName = 'EmptyState';
