'use client';

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Badge } from '@/components/ui';

export interface SyncConnection {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'active' | 'paused' | 'error';
  lastSync?: string;
  syncCount?: number;
  direction: 'unidirectional' | 'bidirectional';
}

interface SyncEdgeProps {
  connection: SyncConnection;
  onClick: (connection: SyncConnection) => void;
  isHovered: boolean;
}

const statusColors = {
  active: '#22C55E',
  paused: '#EAB308',
  error: '#EF4444',
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
  $status: string;
  $isHovered: boolean;
  $animated: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.tertiary};
  border: 2px solid ${({ $status }) => statusColors[$status as keyof typeof statusColors] || '#ccc'};
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

const DirectionIndicator = styled.div<{ $direction: string; $status: string; $animated: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  svg {
    width: 32px;
    height: 32px;
    color: ${({ $status }) => statusColors[$status as keyof typeof statusColors]};

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


const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line className="arrow-line" x1="4" y1="12" x2="20" y2="12" />
    <polyline points="14,6 20,12 14,18" />
  </svg>
);

const ArrowBidirectional = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line className="arrow-line" x1="4" y1="12" x2="20" y2="12" />
    <polyline points="8,6 2,12 8,18" />
    <polyline points="16,6 22,12 16,18" />
  </svg>
);

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const SyncEdge: React.FC<SyncEdgeProps> = ({
  connection,
  onClick,
  isHovered,
}) => {
  const handleClick = () => {
    onClick(connection);
  };

  const isAnimated = connection.status === 'active';

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
        {connection.direction === 'bidirectional' ? <ArrowBidirectional /> : <ArrowRight />}
      </DirectionIndicator>

      <Badge
        variant={
          connection.status === 'active'
            ? 'status-success'
            : connection.status === 'paused'
              ? 'status-warning'
              : 'status-danger'
        }
        size="xs"
        style={{ textTransform: 'capitalize', marginBottom: '12px' }}
      >
        {connection.status}
      </Badge>

      <StatsRow>
        {connection.syncCount !== undefined && (
          <SyncCount>{connection.syncCount} synced</SyncCount>
        )}
        {connection.lastSync && (
          <LastSync data-testid="edge-last-sync">
            {formatRelativeTime(connection.lastSync)}
          </LastSync>
        )}
      </StatsRow>
    </EdgeContainer>
  );
};
