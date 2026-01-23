'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import styled from 'styled-components';
import { WhyAmISeeingThis } from '../WhyAmISeeingThis';
import { formatContribution } from '../shared';
import type { Post } from '../shared';

export type { Post };

interface FeedPreviewProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  /** Maximum height before scrolling. Defaults to 600px */
  maxHeight?: number;
}

const ScrollContainer = styled.div<{ $maxHeight: number }>`
  max-height: ${({ $maxHeight }) => $maxHeight}px;
  overflow-y: auto;
  overflow-x: hidden;

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`;

const VirtualList = styled.div`
  position: relative;
  width: 100%;
`;

const VirtualItem = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 0 4px;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 256px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PostCard = styled.div<{ $isBoosted: boolean }>`
  border: 1px solid ${({ theme, $isBoosted }) =>
    $isBoosted ? theme.colors.primary[400] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: box-shadow ${({ theme }) => theme.transitions.fast};
  background: ${({ theme, $isBoosted }) =>
    $isBoosted ? theme.colors.surface.primary.bg : theme.colors.background.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const AuthorName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Timestamp = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ScoreBadge = styled.div<{ $variant: 'positive' | 'negative' | 'neutral' }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  ${({ theme, $variant }) => {
    switch ($variant) {
      case 'positive':
        return `
          background: ${theme.colors.surface.primary.bg};
          color: ${theme.colors.primary[800]};
        `;
      case 'negative':
        return `
          background: ${theme.colors.surface.danger.bg};
          color: ${theme.colors.danger[800]};
        `;
      default:
        return `
          background: ${theme.colors.background.tertiary};
          color: ${theme.colors.text.primary};
        `;
    }
  }}
`;

const PostContent = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const RulesSection = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-top: ${({ theme }) => theme.spacing[3]};
`;

const RulesLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
`;

const RulesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const RuleBadge = styled.div<{ $variant: 'positive' | 'negative' | 'neutral' }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  ${({ theme, $variant }) => {
    switch ($variant) {
      case 'positive':
        return `
          background: ${theme.colors.surface.success.bg};
          color: ${theme.colors.success[800]};
        `;
      case 'negative':
        return `
          background: ${theme.colors.surface.danger.bg};
          color: ${theme.colors.danger[800]};
        `;
      default:
        return `
          background: ${theme.colors.background.tertiary};
          color: ${theme.colors.text.primary};
        `;
    }
  }}
`;

const NoRulesText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-style: italic;
`;

const WhySection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

function getScoreVariant(score: number): 'positive' | 'negative' | 'neutral' {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function getContributionVariant(contribution: number): 'positive' | 'negative' | 'neutral' {
  if (contribution > 0) return 'positive';
  if (contribution < 0) return 'negative';
  return 'neutral';
}

// Estimated height for each post card
const ESTIMATED_ITEM_SIZE = 220;

// Memoized post card component for better performance
const PostCardItem = React.memo<{
  post: Post;
  onPostClick: (post: Post) => void;
}>(function PostCardItem({ post, onPostClick }) {
  const isBoosted = post.score > 0;
  const appliedRules = post.appliedRules || [];

  const handleWhyClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <PostCard
      data-testid={`post-preview-${post.id}`}
      data-boosted={isBoosted ? 'true' : undefined}
      className={isBoosted ? 'boosted' : undefined}
      onClick={() => onPostClick(post)}
      $isBoosted={isBoosted}
    >
      {/* Header with author and score badge */}
      <PostHeader>
        <AuthorInfo>
          <AuthorName>{post.author}</AuthorName>
          <Timestamp>{post.timestamp}</Timestamp>
        </AuthorInfo>
        <ScoreBadge
          data-testid={`score-badge-${post.id}`}
          $variant={getScoreVariant(post.score)}
        >
          Score: {post.score}
        </ScoreBadge>
      </PostHeader>

      {/* Post content */}
      <PostContent>{post.content}</PostContent>

      {/* Applied rules */}
      <RulesSection>
        {appliedRules.length > 0 ? (
          <div>
            <RulesLabel>Applied Rules:</RulesLabel>
            <RulesList>
              {appliedRules.map((rule) => (
                <RuleBadge
                  key={rule.ruleId}
                  $variant={getContributionVariant(rule.contribution)}
                >
                  {rule.ruleName}: {formatContribution(rule.contribution)}
                </RuleBadge>
              ))}
            </RulesList>
          </div>
        ) : (
          <NoRulesText>No rules applied</NoRulesText>
        )}
      </RulesSection>

      <WhySection onClick={handleWhyClick}>
        <WhyAmISeeingThis postId={post.id} />
      </WhySection>
    </PostCard>
  );
});

export const FeedPreview: React.FC<FeedPreviewProps> = ({
  posts,
  onPostClick,
  maxHeight = 600,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Sort posts by score in descending order with memoization
  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => b.score - a.score),
    [posts]
  );

  // Setup virtualizer
  const virtualizer = useVirtualizer({
    count: sortedPosts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_SIZE,
    overscan: 3, // Render 3 extra items above and below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Empty state
  if (sortedPosts.length === 0) {
    return <EmptyState>No posts to display</EmptyState>;
  }

  // For small lists (< 10 items), use regular rendering for simplicity
  if (sortedPosts.length < 10) {
    return (
      <div>
        {sortedPosts.map((post) => (
          <PostCardItem key={post.id} post={post} onPostClick={onPostClick} />
        ))}
      </div>
    );
  }

  // For larger lists, use virtualization
  return (
    <ScrollContainer ref={parentRef} $maxHeight={maxHeight}>
      <VirtualList
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const post = sortedPosts[virtualItem.index];
          return (
            <VirtualItem
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <PostCardItem post={post} onPostClick={onPostClick} />
            </VirtualItem>
          );
        })}
      </VirtualList>
    </ScrollContainer>
  );
};
