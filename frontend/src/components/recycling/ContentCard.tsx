'use client';

import { memo, FC, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  RefreshCw,
  Tag,
  ExternalLink,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Stack } from '@/components/ui/Stack';
import { ScoreIndicator } from './ScoreIndicator';
import type { ContentItem, PlatformType } from '@/lib/recycling';
import { AVAILABLE_CONNECTORS } from '@/lib/connectors';

export interface ContentCardProps {
  content: ContentItem;
  onRecycle?: (id: string) => void;
  onEditTags?: (id: string) => void;
  onViewOriginal?: (id: string, platform: PlatformType, postId: string) => void;
  selected?: boolean;
  compact?: boolean;
}

const CardContainer = styled(motion.article)<{ $selected: boolean; $compact: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme, $compact }) => $compact ? theme.spacing[3] : theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $selected, theme }) =>
    $selected &&
    css`
      border-color: ${theme.colors.primary[500]};
      box-shadow: 0 0 0 1px ${theme.colors.primary[500]};
    `}

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

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const PlatformBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $color }) => $color};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const RecycleCountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[700]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const MediaIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  svg {
    width: 14px;
    height: 14px;
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

const ScoresGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const MetaLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const DateText = styled.time`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ActionsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

function getPlatformInfo(platform: string) {
  const connector = AVAILABLE_CONNECTORS.find((c) => c.platform === platform);
  return connector || { icon: '?', color: '#666', name: platform };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateString);
}

export const ContentCard: FC<ContentCardProps> = memo(({
  content,
  onRecycle,
  onEditTags,
  onViewOriginal,
  selected = false,
  compact = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const platformInfo = getPlatformInfo(content.platform);

  const handleRecycle = useCallback(() => {
    onRecycle?.(content.id);
  }, [content.id, onRecycle]);

  const handleEditTags = useCallback(() => {
    onEditTags?.(content.id);
  }, [content.id, onEditTags]);

  const handleViewOriginal = useCallback(() => {
    onViewOriginal?.(content.id, content.platform, content.original_post_id);
  }, [content.id, content.platform, content.original_post_id, onViewOriginal]);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { y: -2 },
        whileTap: { scale: 0.99 },
      };

  return (
    <CardContainer
      $selected={selected}
      $compact={compact}
      data-testid="content-card"
      data-selected={selected}
      data-compact={compact}
      {...motionProps}
    >
      <Header>
        <HeaderLeft>
          <PlatformBadge
            $color={platformInfo.color}
            data-testid="platform-badge"
            title={platformInfo.name}
          >
            {platformInfo.icon}
          </PlatformBadge>

          {content.recycle_count > 0 && (
            <RecycleCountBadge data-testid="recycle-count">
              <RefreshCw />
              {content.recycle_count}
            </RecycleCountBadge>
          )}

          {content.media_urls && content.media_urls.length > 0 && (
            <MediaIndicator data-testid="media-indicator">
              <ImageIcon />
              {content.media_urls.length}
            </MediaIndicator>
          )}
        </HeaderLeft>

        <HeaderRight>
          <ActionsWrapper>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleEditTags}
              aria-label="Edit tags"
              title="Edit tags"
            >
              <Tag size={16} />
            </IconButton>

            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleRecycle}
              aria-label="Recycle"
              title="Recycle"
              color="primary"
            >
              <RefreshCw size={16} />
            </IconButton>

            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleViewOriginal}
              aria-label="View original"
              title="View original"
            >
              <ExternalLink size={16} />
            </IconButton>
          </ActionsWrapper>
        </HeaderRight>
      </Header>

      <ContentText data-testid="content-text">{content.content}</ContentText>

      <ScoresGrid>
        <ScoreIndicator
          value={content.engagement_score}
          label="Engagement"
          size={compact ? 'sm' : 'md'}
          tooltip="How well this content performed based on likes, retweets, and replies"
        />
        <ScoreIndicator
          value={content.evergreen_score}
          label="Evergreen"
          size={compact ? 'sm' : 'md'}
          tooltip="How timeless this content is (not tied to a specific date or event)"
        />
        <ScoreIndicator
          value={content.recycle_score}
          label="Recycle"
          size={compact ? 'sm' : 'md'}
          tooltip="Overall suitability for recycling based on engagement and evergreen scores"
        />
      </ScoresGrid>

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
        <MetaLeft>
          <DateText data-testid="created-date">
            <Calendar />
            {formatDate(content.created_at)}
          </DateText>

          {content.last_recycled_at && (
            <DateText>
              <RefreshCw />
              Last recycled {formatRelativeDate(content.last_recycled_at)}
            </DateText>
          )}
        </MetaLeft>
      </MetaRow>
    </CardContainer>
  );
});

ContentCard.displayName = 'ContentCard';
