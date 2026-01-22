'use client';

import React from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';
import { type ErrorDefinition, type ErrorSolution, type ErrorSeverity } from '@/lib/errors';

interface ErrorCardProps {
  error: ErrorDefinition;
  originalError?: string;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
}

const severityConfig: Record<ErrorSeverity, { icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string }> = {
  critical: {
    icon: AlertCircle,
    color: 'colors.danger.600',
    bgColor: 'colors.danger.50',
    borderColor: 'colors.danger.500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'colors.warning.600',
    bgColor: 'colors.warning.50',
    borderColor: 'colors.warning.500',
  },
  info: {
    icon: Info,
    color: 'colors.primary.600',
    bgColor: 'colors.primary.50',
    borderColor: 'colors.primary.500',
  },
};

const CardContainer = styled.div<{ $severity: ErrorSeverity }>`
  background: ${({ theme, $severity }) => {
    const config = severityConfig[$severity];
    return theme[config.bgColor.split('.')[0]][config.bgColor.split('.')[1]][config.bgColor.split('.')[2]];
  }};
  border: 1px solid ${({ theme, $severity }) => {
    const config = severityConfig[$severity];
    return theme[config.borderColor.split('.')[0]][config.borderColor.split('.')[1]][config.borderColor.split('.')[2]];
  }};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const IconWrapper = styled.div<{ $severity: ErrorSeverity }>`
  flex-shrink: 0;
  color: ${({ theme, $severity }) => {
    const config = severityConfig[$severity];
    return theme[config.color.split('.')[0]][config.color.split('.')[1]][config.color.split('.')[2]];
  }};
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h3<{ $severity: ErrorSeverity }>`
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $severity }) => {
    const config = severityConfig[$severity];
    return theme[config.color.split('.')[0]][config.color.split('.')[1]][config.color.split('.')[2]];
  }};
`;

const Description = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const SolutionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const SolutionItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const SolutionText = styled.div`
  flex: 1;
`;

const SolutionTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SolutionDescription = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const TechnicalDetails = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const DetailsToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  background: none;
  border: none;
  padding: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const DetailsContent = styled.pre`
  margin: ${({ theme }) => theme.spacing[2]} 0 0 0;
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.neutral[900]};
  color: ${({ theme }) => theme.colors.neutral[300]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-family: monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.primary[600]};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

export function ErrorCard({
  error,
  originalError,
  onRetry,
  onDismiss,
  showTechnicalDetails = true,
}: ErrorCardProps) {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  const config = severityConfig[error.severity];
  const Icon = config.icon;
  
  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };
  
  const renderSolutionAction = (solution: ErrorSolution) => {
    if (!solution.action) return null;
    
    const { type, label, handler } = solution.action;
    
    if (type === 'link' && typeof handler === 'string') {
      return (
        <ActionLink href={handler}>
          {label}
          <ExternalLink size={14} />
        </ActionLink>
      );
    }
    
    if (type === 'retry') {
      return (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRetry}
          isLoading={isRetrying}
        >
          <RefreshCw size={14} />
          {label}
        </Button>
      );
    }
    
    if (type === 'button' && typeof handler === 'function') {
      return (
        <Button size="sm" variant="secondary" onClick={() => handler()}>
          {label}
        </Button>
      );
    }
    
    return null;
  };
  
  return (
    <CardContainer $severity={error.severity} role="alert">
      <Header>
        <IconWrapper $severity={error.severity}>
          <Icon size={24} />
        </IconWrapper>
        <Content>
          <Title $severity={error.severity}>{error.title}</Title>
          <Description>{error.description}</Description>
          
          {error.solutions.length > 0 && (
            <SolutionsContainer>
              {error.solutions.map((solution, index) => (
                <SolutionItem key={index}>
                  <SolutionText>
                    <SolutionTitle>{solution.title}</SolutionTitle>
                    {solution.description && (
                      <SolutionDescription>{solution.description}</SolutionDescription>
                    )}
                  </SolutionText>
                  {renderSolutionAction(solution)}
                </SolutionItem>
              ))}
            </SolutionsContainer>
          )}
          
          {showTechnicalDetails && originalError && (
            <TechnicalDetails>
              <DetailsToggle onClick={() => setDetailsExpanded(!detailsExpanded)}>
                {detailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Technical details
              </DetailsToggle>
              {detailsExpanded && (
                <DetailsContent>
                  Error Code: {error.code}
                  {'\n'}
                  Original: {originalError}
                </DetailsContent>
              )}
            </TechnicalDetails>
          )}
        </Content>
      </Header>
    </CardContainer>
  );
}

export default ErrorCard;
