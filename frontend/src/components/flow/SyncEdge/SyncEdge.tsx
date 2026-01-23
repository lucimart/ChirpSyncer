'use client';

import { memo, useCallback, useMemo, type FC, type CSSProperties } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Badge } from '@/components/ui';
import type { SyncConnection } from '../types';
import {
  STATUS_COLORS,
  STATUS_BADGE_VARIANTS,
  DEFAULT_COLOR,
  formatRelativeTime,
} from '../constants';

// Re-export for backwards compatibility
export type { SyncConnection };

interface SyncEdgeProps {
  connection: SyncConnection;
  onClick: (connection: SyncConnection) => void;
  isHovered: boolean;
}

const BADGE_STYLE: CSSProperties = {
  textTransform: 'capitalize',
  marginBottom: '12px',
};

const flowAnimation = keyframes`
  0% {
    stroke-dashoffset: 20;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const EdgeContainer = styled.div<{
  $status: SyncConnection['status'];
  $isHovered: boolean;
  $animated: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 2px solid ${({ $status }) => STATUS_COLORS[$status] || DEFAULT_COLOR};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  position: relative;

  ${({ $isHovered }) =>
    $isHovered &&
    css`
      transform: scale(1.05);
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    `}
`;

const DirectionIndicator = styled.div<{
  $direction: SyncConnection['direction'];
  $status: SyncConnection['status'];
  $animated: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  svg {
    width: 32px;
    height: 32px;
    color: ${({ $status }) => STATUS_COLORS[$status]};

    ${({ $animated }) =>
      $animated &&
      css`
        .arrow-line {
          stroke-dasharray: 10;
          animation: ${flowAnimation} 0.5s linear infinite;
        }
      `}
  }
`;

const StatsRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const SyncCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LastSync = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;


// Icon components - memoized since they never change
const ArrowRight: FC = memo(function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line className="arrow-line" x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14,6 20,12 14,18" />
    </svg>
  );
});

const ArrowBidirectional: FC = memo(function ArrowBidirectional() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line className="arrow-line" x1="4" y1="12" x2="20" y2="12" />
      <polyline points="8,6 2,12 8,18" />
      <polyline points="16,6 22,12 16,18" />
    </svg>
  );
});

// Direction icons map for O(1) lookup
const DIRECTION_ICONS: Record<SyncConnection['direction'], FC> = {
  unidirectional: ArrowRight,
  bidirectional: ArrowBidirectional,
};

export const SyncEdge: FC<SyncEdgeProps> = memo(function SyncEdge({
  connection,
  onClick,
  isHovered,
}) {
  const handleClick = useCallback(() => {
    onClick(connection);
  }, [onClick, connection]);

  const isAnimated = connection.status === 'active';

  // Memoize formatted last sync time
  const formattedLastSync = useMemo(
    () => (connection.lastSync ? formatRelativeTime(connection.lastSync) : null),
    [connection.lastSync]
  );

  // Get the direction icon component
  const DirectionIcon = DIRECTION_ICONS[connection.direction];

  return (
    <EdgeContainer
      data-testid={`sync-edge-${connection.id}`}
      data-status={connection.status}
      data-hovered={String(isHovered)}
      data-animated={String(isAnimated)}
      $status={connection.status}
      $isHovered={isHovered}
      $animated={isAnimated}
      onClick={handleClick}
    >
      <DirectionIndicator
        data-testid="direction-indicator"
        data-direction={connection.direction}
        $direction={connection.direction}
        $status={connection.status}
        $animated={isAnimated}
      >
        <DirectionIcon />
      </DirectionIndicator>

      <Badge
        variant={STATUS_BADGE_VARIANTS[connection.status]}
        size="xs"
        style={BADGE_STYLE}
      >
        {connection.status}
      </Badge>

      <StatsRow>
        {connection.syncCount !== undefined && (
          <SyncCount>{connection.syncCount} synced</SyncCount>
        )}
        {formattedLastSync && (
          <LastSync data-testid="edge-last-sync">
            {formattedLastSync}
          </LastSync>
        )}
      </StatsRow>
    </EdgeContainer>
  );
});
