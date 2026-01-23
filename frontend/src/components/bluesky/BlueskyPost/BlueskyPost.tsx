'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import { Heart, MessageCircle, Repeat2, Quote, MoreHorizontal, ExternalLink, Link, Share2, Flag, Ban } from 'lucide-react';
import { ATProtoPost, getProfileUrl, getPostUrl } from '@/lib/bluesky';
import { Avatar, DropdownMenu, type DropdownMenuItem } from '@/components/ui';

const PostCard = styled.article`
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PostContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const AuthorRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const DisplayName = styled.a`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Handle = styled.a`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Timestamp = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &::before {
    content: '·';
    margin: 0 ${({ theme }) => theme.spacing[2]};
  }
`;

const PostText = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.5;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const PostImages = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: ${({ $count }) =>
    $count === 1 ? '1fr' : $count === 2 ? '1fr 1fr' : $count === 3 ? '1fr 1fr' : '1fr 1fr'};
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const PostImage = styled.img<{ $span?: boolean }>`
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: cover;
  ${({ $span }) => $span && 'grid-row: span 2;'}
`;

const ExternalEmbed = styled.a`
  display: block;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  text-decoration: none;
  color: inherit;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const EmbedThumb = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const EmbedContent = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
`;

const EmbedTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const EmbedDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EmbedUrl = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ActionButton = styled.button<{ $active?: boolean; $type?: 'reply' | 'repost' | 'like' | 'quote' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[1]};
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ $type, theme }) =>
      $type === 'reply'
        ? theme.colors.primary[500]
        : $type === 'repost'
          ? theme.colors.success[500]
          : $type === 'like'
            ? theme.colors.danger[500]
            : theme.colors.primary[500]};
    background-color: ${({ $type, theme }) =>
      $type === 'reply'
        ? theme.colors.surface.primary.bg
        : $type === 'repost'
          ? theme.colors.surface.success.bg
          : $type === 'like'
            ? theme.colors.surface.danger.bg
            : theme.colors.surface.primary.bg};
  }

  ${({ $active, $type, theme }) =>
    $active &&
    `
    color: ${
      $type === 'like'
        ? theme.colors.danger[500]
        : $type === 'repost'
          ? theme.colors.success[500]
          : theme.colors.primary[500]
    };
  `}

  svg {
    width: 18px;
    height: 18px;
  }
`;

const MoreButton = styled.button`
  padding: ${({ theme }) => theme.spacing[1]};
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.full};

  &:hover {
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
    color: ${({ theme }) => theme.colors.primary[500]};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const DropdownWrapper = styled.div`
  margin-left: auto;
`;

const Labels = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Label = styled.span`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.surface.warning.bg};
  color: ${({ theme }) => theme.colors.surface.warning.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

interface BlueskyPostProps {
  post: ATProtoPost;
  onReply?: (post: ATProtoPost) => void;
  onRepost?: (post: ATProtoPost) => void;
  onLike?: (post: ATProtoPost) => void;
  onQuote?: (post: ATProtoPost) => void;
  onCopyLink?: (post: ATProtoPost) => void;
  onShare?: (post: ATProtoPost) => void;
  onReport?: (post: ATProtoPost) => void;
  onBlock?: (post: ATProtoPost) => void;
  isLiked?: boolean;
  isReposted?: boolean;
}

export function BlueskyPost({
  post,
  onReply,
  onRepost,
  onLike,
  onQuote,
  onCopyLink,
  onShare,
  onReport,
  onBlock,
  isLiked,
  isReposted,
}: BlueskyPostProps) {
  const profileUrl = getProfileUrl(post.author.handle);
  const postUrl = getPostUrl(post.author.handle, post.uri);

  // Memoize dropdown menu items
  const menuItems: DropdownMenuItem[] = useMemo(() => [
    {
      id: 'copy-link',
      label: 'Copy link',
      icon: Link,
      onClick: () => {
        navigator.clipboard.writeText(postUrl);
        onCopyLink?.(post);
      },
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: () => {
        if (navigator.share) {
          navigator.share({
            title: `Post by @${post.author.handle}`,
            text: post.record.text,
            url: postUrl,
          });
        }
        onShare?.(post);
      },
    },
    {
      id: 'open',
      label: 'Open on Bluesky',
      icon: ExternalLink,
      onClick: () => window.open(postUrl, '_blank', 'noopener,noreferrer'),
    },
    {
      id: 'report',
      label: 'Report post',
      icon: Flag,
      danger: true,
      onClick: () => onReport?.(post),
    },
    {
      id: 'block',
      label: 'Block user',
      icon: Ban,
      danger: true,
      onClick: () => onBlock?.(post),
    },
  ], [post, postUrl, onCopyLink, onShare, onReport, onBlock]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <PostCard>
      <PostHeader>
        <Avatar name={post.author.handle} src={post.author.avatar} size="lg" />
        <PostContent>
          <AuthorRow>
            <DisplayName href={profileUrl} target="_blank" rel="noopener noreferrer">
              {post.author.displayName || post.author.handle}
            </DisplayName>
            <Handle href={profileUrl} target="_blank" rel="noopener noreferrer">
              @{post.author.handle}
            </Handle>
            <Timestamp>{formatDate(post.record.createdAt)}</Timestamp>
          </AuthorRow>

          {post.labels && post.labels.length > 0 && (
            <Labels>
              {post.labels.map((label, i) => (
                <Label key={i}>{label.val}</Label>
              ))}
            </Labels>
          )}

          <PostText>{post.record.text}</PostText>

          {post.embed?.images && post.embed.images.length > 0 && (
            <PostImages $count={post.embed.images.length}>
              {post.embed.images.map((img, i) => (
                <PostImage
                  key={i}
                  src={img.fullsize}
                  alt={img.alt}
                  $span={post.embed!.images!.length === 3 && i === 0}
                />
              ))}
            </PostImages>
          )}

          {post.embed?.external && (
            <ExternalEmbed
              href={post.embed.external.uri}
              target="_blank"
              rel="noopener noreferrer"
            >
              {post.embed.external.thumb && (
                <EmbedThumb src={post.embed.external.thumb} alt="" />
              )}
              <EmbedContent>
                <EmbedTitle>{post.embed.external.title}</EmbedTitle>
                <EmbedDescription>{post.embed.external.description}</EmbedDescription>
                <EmbedUrl>
                  <ExternalLink size={12} />
                  {new URL(post.embed.external.uri).hostname}
                </EmbedUrl>
              </EmbedContent>
            </ExternalEmbed>
          )}

          <Actions>
            <ActionButton $type="reply" onClick={() => onReply?.(post)}>
              <MessageCircle />
              {post.replyCount > 0 && formatNumber(post.replyCount)}
            </ActionButton>
            <ActionButton
              $type="repost"
              $active={isReposted}
              onClick={() => onRepost?.(post)}
            >
              <Repeat2 />
              {post.repostCount > 0 && formatNumber(post.repostCount)}
            </ActionButton>
            <ActionButton
              $type="like"
              $active={isLiked}
              onClick={() => onLike?.(post)}
            >
              <Heart />
              {post.likeCount > 0 && formatNumber(post.likeCount)}
            </ActionButton>
            <ActionButton $type="quote" onClick={() => onQuote?.(post)}>
              <Quote />
              {post.quoteCount > 0 && formatNumber(post.quoteCount)}
            </ActionButton>
            <DropdownWrapper>
              <DropdownMenu
                trigger={
                  <MoreButton aria-label="More options">
                    <MoreHorizontal />
                  </MoreButton>
                }
                items={menuItems}
                align="right"
              />
            </DropdownWrapper>
          </Actions>
        </PostContent>
      </PostHeader>
    </PostCard>
  );
}
