'use client';

import { ReactNode } from 'react';
import styled from 'styled-components';

export interface DetailsItem {
  label: string;
  value: ReactNode;
}

export interface DetailsListProps {
  items: DetailsItem[];
  variant?: 'default' | 'compact';
  className?: string;
}

const Container = styled.div<{ $variant: 'default' | 'compact' }>`
  padding: ${({ theme, $variant }) =>
    $variant === 'compact' ? theme.spacing[2] : theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const Row = styled.div<{ $variant: 'default' | 'compact' }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme, $variant }) =>
    $variant === 'compact' ? `${theme.spacing[1]} 0` : `${theme.spacing[2]} 0`};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`;

const Label = styled.span<{ $variant: 'default' | 'compact' }>`
  font-size: ${({ theme, $variant }) =>
    $variant === 'compact' ? theme.fontSizes.xs : theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Value = styled.span<{ $variant: 'default' | 'compact' }>`
  font-size: ${({ theme, $variant }) =>
    $variant === 'compact' ? theme.fontSizes.xs : theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

export function DetailsList({
  items,
  variant = 'default',
  className,
}: DetailsListProps) {
  return (
    <Container $variant={variant} className={className} data-testid="details-list">
      {items.map((item, index) => (
        <Row key={index} $variant={variant}>
          <Label $variant={variant}>{item.label}</Label>
          <Value $variant={variant}>{item.value}</Value>
        </Row>
      ))}
    </Container>
  );
}
