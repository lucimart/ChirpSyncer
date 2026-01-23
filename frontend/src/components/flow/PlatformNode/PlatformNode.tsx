'use client';

import { memo, useCallback, useMemo, type FC } from 'react';
import styled, { css } from 'styled-components';
import type { Platform } from '../types';
import {
  PLATFORM_COLORS,
  DEFAULT_COLOR,
  formatRelativeTime,
} from '../constants';

// Re-export for backwards compatibility
export type { Platform };

interface PlatformNodeProps {
  platform: Platform;
  onClick: (platform: Platform) => void;
  isHovered: boolean;
  isSelected: boolean;
}

// Component-specific constants
const ICON_SIZE = 24;

const NodeContainer = styled.div<{
  $platform: string;
  $connected: boolean;
  $isHovered: boolean;
  $isSelected: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 2px solid ${({ $platform }) => PLATFORM_COLORS[$platform] || DEFAULT_COLOR};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.default};
  min-width: 140px;
  position: relative;

  ${({ $isHovered }) =>
    $isHovered &&
    css`
      transform: scale(1.05);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    `}

  ${({ $isSelected, $platform }) =>
    $isSelected &&
    css`
      border-width: 3px;
      background: ${PLATFORM_COLORS[$platform]}10;
    `}

  ${({ $connected }) =>
    !$connected &&
    css`
      opacity: 0.6;
      border-style: dashed;
    `}
`;

const IconWrapper = styled.div<{ $platform: string }>`
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background: ${({ $platform }) => PLATFORM_COLORS[$platform] || DEFAULT_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  color: white;
  font-size: 24px;
`;

const PlatformName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-transform: capitalize;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const PostsCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LastSyncTime = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatusDot = styled.div<{ $connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $connected, theme }) =>
    $connected ? theme.colors.success[500] : theme.colors.neutral[400]};
  position: absolute;
  top: 8px;
  right: 8px;
`;

// Icon components - memoized since they never change
const TwitterIcon: FC = memo(function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
});

const BlueskyIcon: FC = memo(function BlueskyIcon() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} fill="currentColor">
      <path d="M12 2C8.5 5.5 5 9 5 12.5c0 2.5 1.5 4.5 4 5-.5.5-1.5 1-2.5 1.5 2.5.5 5 0 7-.5-3 1-6 1.5-7.5 2 5-1 10-1 13 0-1.5-.5-4.5-1-7.5-2 2 .5 4.5 1 7 .5-1-.5-2-1-2.5-1.5 2.5-.5 4-2.5 4-5C19 9 15.5 5.5 12 2z" />
    </svg>
  );
});

// Platform icon map for O(1) lookup
const PLATFORM_ICONS: Record<string, FC> = {
  twitter: TwitterIcon,
  bluesky: BlueskyIcon,
};

export const PlatformNode: FC<PlatformNodeProps> = memo(function PlatformNode({
  platform,
  onClick,
  isHovered,
  isSelected,
}) {
  const handleClick = useCallback(() => {
    onClick(platform);
  }, [onClick, platform]);

  // Memoize formatted last sync time
  const formattedLastSync = useMemo(
    () => (platform.lastSync ? formatRelativeTime(platform.lastSync) : null),
    [platform.lastSync]
  );

  // Get the icon component for this platform
  const IconComponent = PLATFORM_ICONS[platform.name] ?? BlueskyIcon;

  return (
    <NodeContainer
      data-testid={`platform-node-${platform.id}`}
      data-platform={platform.name}
      data-connected={String(platform.connected)}
      data-hovered={String(isHovered)}
      data-selected={String(isSelected)}
      $platform={platform.name}
      $connected={platform.connected}
      $isHovered={isHovered}
      $isSelected={isSelected}
      onClick={handleClick}
    >
      <StatusDot $connected={platform.connected} />
      <IconWrapper $platform={platform.name} data-testid="platform-icon">
        <IconComponent />
      </IconWrapper>
      <PlatformName>{platform.name}</PlatformName>
      <StatsContainer>
        {platform.postsCount !== undefined && (
          <PostsCount>{platform.postsCount} posts</PostsCount>
        )}
        {formattedLastSync && (
          <LastSyncTime data-testid="last-sync-time">
            Last sync: {formattedLastSync}
          </LastSyncTime>
        )}
      </StatsContainer>
    </NodeContainer>
  );
});
