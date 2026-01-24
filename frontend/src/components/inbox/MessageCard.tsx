'use client';

import { memo, FC, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Star,
  Archive,
  CheckCircle,
  MessageCircle,
  AtSign,
  Mail,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Stack } from '@/components/ui/Stack';
import type { UnifiedMessage, MessageType } from '@/lib/inbox';
import { AVAILABLE_CONNECTORS } from '@/lib/connectors';

export interface MessageCardProps {
  message: UnifiedMessage;
  onMarkAsRead?: (id: string) => void;
  onToggleStar?: (id: string, starred: boolean) => void;
  onArchive?: (id: string) => void;
  onNavigate?: (url: string) => void;
}

const CardContainer = styled(motion.article)<{ $isRead: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;

  ${({ $isRead, theme }) =>
    !$isRead &&
    css`
      background-color: ${theme.colors.primary[50]};
      border-color: ${theme.colors.primary[200]};
    `}

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const UnreadIndicator = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.spacing[2]};
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary[500]};
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const AuthorName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AuthorHandle = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MessageContent = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  word-break: break-word;

  /* Clamp to 3 lines */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const TimeStamp = styled.time`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ActionsWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[1]};
  flex-shrink: 0;
`;

const PlatformBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ $color }) => $color};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const MESSAGE_TYPE_CONFIG: Record<
  MessageType,
  { label: string; icon: typeof AtSign; variant: 'primary' | 'success' | 'warning' | 'info' }
> = {
  mention: { label: 'Mention', icon: AtSign, variant: 'primary' },
  reply: { label: 'Reply', icon: MessageCircle, variant: 'info' },
  dm: { label: 'DM', icon: Mail, variant: 'warning' },
  comment: { label: 'Comment', icon: MessageSquare, variant: 'success' },
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getPlatformInfo(platform: string) {
  const connector = AVAILABLE_CONNECTORS.find((c) => c.platform === platform);
  return connector || { icon: '?', color: '#666', name: platform };
}

export const MessageCard: FC<MessageCardProps> = memo(
  ({ message, onMarkAsRead, onToggleStar, onArchive, onNavigate }) => {
    const prefersReducedMotion = useReducedMotion();

    const handleCardClick = useCallback(() => {
      onNavigate?.(message.original_url);
    }, [message.original_url, onNavigate]);

    const handleMarkAsRead = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onMarkAsRead?.(message.id);
      },
      [message.id, onMarkAsRead]
    );

    const handleToggleStar = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleStar?.(message.id, !message.is_starred);
      },
      [message.id, message.is_starred, onToggleStar]
    );

    const handleArchive = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onArchive?.(message.id);
      },
      [message.id, onArchive]
    );

    const typeConfig = MESSAGE_TYPE_CONFIG[message.message_type];
    const TypeIcon = typeConfig.icon;
    const platformInfo = getPlatformInfo(message.platform);

    const motionProps = prefersReducedMotion
      ? {}
      : {
          whileHover: { y: -2 },
          whileTap: { scale: 0.99 },
        };

    return (
      <CardContainer
        $isRead={message.is_read}
        onClick={handleCardClick}
        tabIndex={0}
        role="article"
        aria-label={`Message from ${message.author_name}`}
        data-testid="message-card"
        {...motionProps}
      >
        {!message.is_read && <UnreadIndicator data-testid="unread-indicator" />}

        <Avatar
          name={message.author_name}
          src={message.author_avatar}
          size="md"
        />

        <ContentWrapper>
          <Header>
            <AuthorName>{message.author_name}</AuthorName>
            <AuthorHandle>{message.author_handle}</AuthorHandle>
            <PlatformBadge
              $color={platformInfo.color}
              data-testid="platform-badge"
              title={platformInfo.name}
            >
              {platformInfo.icon}
            </PlatformBadge>
          </Header>

          <MessageContent>{message.content}</MessageContent>

          <MetaRow>
            <Badge
              size="sm"
              variant={`${typeConfig.variant}-soft` as 'primary-soft'}
              leftIcon={<TypeIcon size={12} />}
            >
              {typeConfig.label}
            </Badge>
            <TimeStamp data-testid="message-time" dateTime={message.created_at}>
              {getRelativeTime(message.created_at)}
            </TimeStamp>
            <a
              href={message.original_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open original"
            >
              <ExternalLink size={14} />
            </a>
          </MetaRow>
        </ContentWrapper>

        <ActionsWrapper>
          <Stack direction="column" gap={1}>
            {!message.is_read && (
              <IconButton
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                aria-label="Mark as read"
                title="Mark as read"
              >
                <CheckCircle size={18} />
              </IconButton>
            )}

            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleToggleStar}
              aria-label={message.is_starred ? 'Unstar' : 'Star'}
              title={message.is_starred ? 'Unstar' : 'Star'}
              color={message.is_starred ? 'primary' : 'default'}
            >
              <Star size={18} fill={message.is_starred ? 'currentColor' : 'none'} />
            </IconButton>

            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              aria-label="Archive"
              title="Archive"
            >
              <Archive size={18} />
            </IconButton>
          </Stack>
        </ActionsWrapper>
      </CardContainer>
    );
  }
);

MessageCard.displayName = 'MessageCard';
