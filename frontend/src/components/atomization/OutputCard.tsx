'use client';

import { memo, FC, useState, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Send,
  Calendar,
  Check,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Stack } from '@/components/ui/Stack';
import {
  type AtomizedContent,
  type PlatformType,
  PLATFORM_CONFIG,
  splitIntoThreadParts,
  formatCharCount,
  getCharCountColor,
} from '@/lib/atomization';

export interface OutputCardProps {
  output: AtomizedContent;
  onEdit?: (output: AtomizedContent) => void;
  onPublish?: (outputId: string) => void;
  onSchedule?: (outputId: string) => void;
  isPublishing?: boolean;
}

const CardWrapper = styled(motion.div)<{ $platformColor: string }>`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: ${({ $platformColor }) => $platformColor};
    border-radius: ${({ theme }) => theme.borderRadius.lg} 0 0 ${({ theme }) => theme.borderRadius.lg};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const PlatformInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PlatformIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $color }) => $color};
  color: white;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PlatformName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusBadges = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ContentPreview = styled.div<{ $expanded: boolean }>`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ExpandedContent = styled(motion.div)`
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ThreadItem = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  position: relative;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ThreadNumber = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const CharCount = styled.span<{ $variant: 'default' | 'warning' | 'danger' }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'danger':
        return theme.colors.danger[600];
      case 'warning':
        return theme.colors.warning[600];
      default:
        return theme.colors.text.tertiary;
    }
  }};
  font-variant-numeric: tabular-nums;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

export const OutputCard: FC<OutputCardProps> = memo(
  ({ output, onEdit, onPublish, onSchedule, isPublishing }) => {
    const [expanded, setExpanded] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const platformConfig = PLATFORM_CONFIG[output.platform];
    const isThread = output.format === 'thread';
    const isCarousel = output.format === 'carousel';

    const threadParts = useMemo(() => {
      if (isThread) {
        return splitIntoThreadParts(output.content);
      }
      return [];
    }, [isThread, output.content]);

    const charCount = output.content.length;
    const charCountVariant = getCharCountColor(charCount, platformConfig.charLimit);

    const handleToggleExpand = useCallback(() => {
      setExpanded((prev) => !prev);
    }, []);

    const handleEdit = useCallback(() => {
      onEdit?.(output);
    }, [onEdit, output]);

    const handlePublish = useCallback(() => {
      onPublish?.(output.id);
    }, [onPublish, output.id]);

    const handleSchedule = useCallback(() => {
      onSchedule?.(output.id);
    }, [onSchedule, output.id]);

    const getCountLabel = () => {
      if (isThread) {
        return `${threadParts.length} tweets`;
      }
      if (isCarousel) {
        const slideCount = output.media_urls.length || 1;
        return `${slideCount} slides`;
      }
      return null;
    };

    const countLabel = getCountLabel();

    return (
      <CardWrapper
        $platformColor={platformConfig.color}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        data-testid="output-card"
      >
        <Card padding="md">
          <Header>
            <PlatformInfo>
              <PlatformIcon $color={platformConfig.color} data-testid="platform-icon">
                {platformConfig.icon}
              </PlatformIcon>
              <Stack direction="column" gap={1}>
                <PlatformName>{platformConfig.name}</PlatformName>
                <Badge variant="neutral-soft" size="sm">
                  {output.format}
                </Badge>
              </Stack>
            </PlatformInfo>

            <StatusBadges>
              {output.is_published && (
                <Badge variant="success" size="sm" leftIcon={<Check size={12} />}>
                  Published
                </Badge>
              )}
              {output.scheduled_for && !output.is_published && (
                <Badge variant="warning" size="sm" leftIcon={<Clock size={12} />}>
                  Scheduled
                </Badge>
              )}
              {countLabel && (
                <Badge variant="neutral-soft" size="sm">
                  {countLabel}
                </Badge>
              )}
            </StatusBadges>
          </Header>

          <ContentPreview $expanded={expanded}>
            {isThread ? threadParts[0] : output.content}
          </ContentPreview>

          <AnimatePresence>
            {expanded && isThread && threadParts.length > 1 && (
              <ExpandedContent
                initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, height: 'auto' }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              >
                {threadParts.slice(1).map((part, index) => (
                  <ThreadItem key={index}>
                    <ThreadNumber>{index + 2}/{threadParts.length}</ThreadNumber>
                    {part}
                  </ThreadItem>
                ))}
              </ExpandedContent>
            )}
          </AnimatePresence>

          {(isThread && threadParts.length > 1) && (
            <ExpandButton
              onClick={handleToggleExpand}
              aria-label={expanded ? 'Collapse' : 'Expand'}
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <ChevronUp size={16} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Show all {threadParts.length} tweets
                </>
              )}
            </ExpandButton>
          )}

          <MetaRow>
            {!isThread && (
              <CharCount $variant={charCountVariant} data-testid="char-count">
                {charCount.toLocaleString()} / {platformConfig.charLimit.toLocaleString()} chars
              </CharCount>
            )}
            {isThread && <span />}

            <Actions>
              {onEdit && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  aria-label="Edit"
                  title="Edit content"
                >
                  <Edit3 size={16} />
                </IconButton>
              )}
              {onSchedule && !output.is_published && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Calendar size={14} />}
                  onClick={handleSchedule}
                >
                  Schedule
                </Button>
              )}
              {onPublish && !output.is_published && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Send size={14} />}
                  onClick={handlePublish}
                  isLoading={isPublishing}
                  loadingText="Publishing..."
                >
                  Publish
                </Button>
              )}
            </Actions>
          </MetaRow>
        </Card>
      </CardWrapper>
    );
  }
);

OutputCard.displayName = 'OutputCard';
