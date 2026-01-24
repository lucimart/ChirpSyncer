'use client';

import { memo, FC, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  X,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import { ScoreIndicator } from './ScoreIndicator';
import type { RecycleSuggestion, PlatformType } from '@/lib/recycling';
import { AVAILABLE_CONNECTORS } from '@/lib/connectors';

export interface SuggestionCardProps {
  suggestion: RecycleSuggestion;
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onSchedule?: (id: string) => void;
  className?: string;
}

const CardContainer = styled(motion.article)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SuggestionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary[500]}, ${({ theme }) => theme.colors.primary[600]});
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const PlatformFlow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PlatformBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ $color }) => $color};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ArrowIcon = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ContentText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ScoreWrapper = styled.div`
  width: 120px;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const StatusBadge = styled(Badge)<{ $status: 'accepted' | 'dismissed' }>`
  ${({ $status, theme }) =>
    $status === 'accepted'
      ? css`
          background-color: ${theme.colors.success[100]};
          color: ${theme.colors.success[700]};
        `
      : css`
          background-color: ${theme.colors.neutral[100]};
          color: ${theme.colors.neutral[600]};
        `}
`;

function getPlatformInfo(platform: string) {
  const connector = AVAILABLE_CONNECTORS.find((c) => c.platform === platform);
  return connector || { icon: '?', color: '#666', name: platform };
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const SuggestionCard: FC<SuggestionCardProps> = memo(({
  suggestion,
  onAccept,
  onDismiss,
  onSchedule,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { content, suggested_platforms, status, suggested_at } = suggestion;
  const sourcePlatformInfo = getPlatformInfo(content.platform);

  const handleAccept = useCallback(() => {
    onAccept?.(suggestion.id);
  }, [suggestion.id, onAccept]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(suggestion.id);
  }, [suggestion.id, onDismiss]);

  const handleSchedule = useCallback(() => {
    onSchedule?.(suggestion.id);
  }, [suggestion.id, onSchedule]);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { y: -2 },
        whileTap: { scale: 0.99 },
      };

  const isPending = status === 'pending';

  return (
    <CardContainer
      data-testid="suggestion-card"
      className={className}
      {...motionProps}
    >
      <Header>
        <HeaderLeft>
          <SuggestionBadge>
            <Sparkles />
            AI Suggestion
          </SuggestionBadge>

          {!isPending && (
            <StatusBadge $status={status as 'accepted' | 'dismissed'} size="sm">
              {status === 'accepted' ? 'Accepted' : 'Dismissed'}
            </StatusBadge>
          )}
        </HeaderLeft>

        <PlatformFlow>
          <PlatformBadge
            $color={sourcePlatformInfo.color}
            data-testid="source-platform"
          >
            {sourcePlatformInfo.icon} {sourcePlatformInfo.name}
          </PlatformBadge>

          <ArrowIcon data-testid="platform-arrow">
            <ArrowRight />
          </ArrowIcon>

          {suggested_platforms.map((platform) => {
            const platformInfo = getPlatformInfo(platform);
            return (
              <PlatformBadge key={platform} $color={platformInfo.color}>
                {platformInfo.icon} {platformInfo.name}
              </PlatformBadge>
            );
          })}
        </PlatformFlow>
      </Header>

      <ContentText>{content.content}</ContentText>

      <ScoreRow>
        <ScoreWrapper>
          <ScoreIndicator
            value={content.recycle_score}
            label="Recycle Score"
            size="sm"
            tooltip="Overall suitability for recycling"
          />
        </ScoreWrapper>
      </ScoreRow>

      {content.tags.length > 0 && (
        <TagsContainer>
          {content.tags.map((tag) => (
            <Badge key={tag} size="sm" variant="neutral-soft">
              {tag}
            </Badge>
          ))}
        </TagsContainer>
      )}

      <MetaRow>
        <span>Suggested {formatRelativeDate(suggested_at)}</span>
      </MetaRow>

      {isPending && (
        <ActionsRow>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X size={16} />
            Dismiss
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSchedule}
            aria-label="Schedule"
          >
            <Calendar size={16} />
            Schedule
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            aria-label="Accept"
          >
            <Check size={16} />
            Accept
          </Button>
        </ActionsRow>
      )}
    </CardContainer>
  );
});

SuggestionCard.displayName = 'SuggestionCard';
