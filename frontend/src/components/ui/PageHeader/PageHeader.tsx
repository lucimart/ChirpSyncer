'use client';

import { ReactNode } from 'react';
import styled from 'styled-components';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const Container = styled.div<{ $hasActions: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: ${({ $hasActions }) => ($hasActions ? 'flex-start' : 'stretch')};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-direction: ${({ $hasActions }) => ($hasActions ? 'row' : 'column')};
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const TitleSection = styled.div``;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  flex-shrink: 0;
`;

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Container $hasActions={!!actions} data-testid="page-header">
      <TitleSection>
        <Title>{title}</Title>
        {description && <Description>{description}</Description>}
      </TitleSection>
      {actions && <ActionsContainer>{actions}</ActionsContainer>}
    </Container>
  );
}
