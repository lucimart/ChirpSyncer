'use client';

import { useState, useCallback, useMemo, type FC } from 'react';
import styled, { type DefaultTheme } from 'styled-components';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Button, Stack, SmallText, Caption } from '@/components/ui';
import { type ErrorDefinition, type ErrorSolution, type ErrorSeverity } from '@/lib/errors';

type ThemeColorPath = `colors.${string}.${string}`;

interface SeverityStyle {
  icon: typeof AlertCircle;
  color: ThemeColorPath;
  bgColor: ThemeColorPath;
  borderColor: ThemeColorPath;
}

interface ErrorCardProps {
  error: ErrorDefinition;
  originalError?: string;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
}

const ICON_SIZE = 24;
const SMALL_ICON_SIZE = 14;

const getThemeColor = (theme: DefaultTheme, path: ThemeColorPath): string => {
  const [, category, shade] = path.split('.');
  return theme.colors[category as keyof typeof theme.colors][shade as keyof (typeof theme.colors)[keyof typeof theme.colors]];
};

const severityConfig: Record<ErrorSeverity, SeverityStyle> = {
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
} as const;

const CardContainer = styled.div<{ $severity: ErrorSeverity }>`
  background: ${({ theme, $severity }) => getThemeColor(theme, severityConfig[$severity].bgColor)};
  border: 1px solid ${({ theme, $severity }) => getThemeColor(theme, severityConfig[$severity].borderColor)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const IconWrapper = styled.div<{ $severity: ErrorSeverity }>`
  flex-shrink: 0;
  color: ${({ theme, $severity }) => getThemeColor(theme, severityConfig[$severity].color)};
`;

const Title = styled.h3<{ $severity: ErrorSeverity }>`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $severity }) => getThemeColor(theme, severityConfig[$severity].color)};
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

const TechnicalDetailsWrapper = styled.div`
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

export const ErrorCard: FC<ErrorCardProps> = ({
  error,
  originalError,
  onRetry,
  showTechnicalDetails = true,
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const config = useMemo(() => severityConfig[error.severity], [error.severity]);
  const Icon = config.icon;

  const handleRetry = useCallback(async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  const toggleDetails = useCallback(() => {
    setDetailsExpanded((prev) => !prev);
  }, []);

  const renderSolutionAction = useCallback(
    (solution: ErrorSolution) => {
      if (!solution.action) return null;

      const { type, label, handler } = solution.action;

      if (type === 'link' && typeof handler === 'string') {
        return (
          <ActionLink href={handler}>
            {label}
            <ExternalLink size={SMALL_ICON_SIZE} />
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
            <RefreshCw size={SMALL_ICON_SIZE} />
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
    },
    [handleRetry, isRetrying]
  );

  return (
    <CardContainer $severity={error.severity} role="alert">
      <Stack direction="row" align="start" gap={3}>
        <IconWrapper $severity={error.severity}>
          <Icon size={ICON_SIZE} />
        </IconWrapper>
        <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
          <Title $severity={error.severity}>{error.title}</Title>
          <SmallText style={{ marginBottom: '12px', lineHeight: 1.5 }}>
            {error.description}
          </SmallText>

          {error.solutions.length > 0 && (
            <Stack gap={2} style={{ marginTop: '12px' }}>
              {error.solutions.map((solution, index) => (
                <SolutionItem key={index}>
                  <Stack gap={1} style={{ flex: 1 }}>
                    <SmallText style={{ fontWeight: 500 }}>{solution.title}</SmallText>
                    {solution.description && (
                      <Caption>{solution.description}</Caption>
                    )}
                  </Stack>
                  {renderSolutionAction(solution)}
                </SolutionItem>
              ))}
            </Stack>
          )}

          {showTechnicalDetails && originalError && (
            <TechnicalDetailsWrapper>
              <DetailsToggle onClick={toggleDetails}>
                {detailsExpanded ? (
                  <ChevronUp size={SMALL_ICON_SIZE} />
                ) : (
                  <ChevronDown size={SMALL_ICON_SIZE} />
                )}
                Technical details
              </DetailsToggle>
              {detailsExpanded && (
                <DetailsContent>
                  Error Code: {error.code}
                  {'\n'}
                  Original: {originalError}
                </DetailsContent>
              )}
            </TechnicalDetailsWrapper>
          )}
        </Stack>
      </Stack>
    </CardContainer>
  );
};

export default ErrorCard;
