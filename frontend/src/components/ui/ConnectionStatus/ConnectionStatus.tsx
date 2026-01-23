'use client';

import styled, { keyframes } from 'styled-components';
import { Wifi, WifiOff } from 'lucide-react';
import { useRealtime, ConnectionStatus as ConnectionStatusType } from '@/providers/RealtimeProvider';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const StatusContainer = styled.div<{ $status: ConnectionStatusType }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border: 1px solid transparent;
  background-color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.surface.success.bg;
      case 'connecting':
        return theme.colors.surface.warning.bg;
      case 'error':
        return theme.colors.surface.danger.bg;
      default:
        return theme.colors.surface.neutral.bg;
    }
  }};
  border-color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.surface.success.border;
      case 'connecting':
        return theme.colors.surface.warning.border;
      case 'error':
        return theme.colors.surface.danger.border;
      default:
        return theme.colors.surface.neutral.border;
    }
  }};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.surface.success.text;
      case 'connecting':
        return theme.colors.surface.warning.text;
      case 'error':
        return theme.colors.surface.danger.text;
      default:
        return theme.colors.surface.neutral.text;
    }
  }};
`;

const StatusDot = styled.div<{ $status: ConnectionStatusType }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.success[500];
      case 'connecting':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.danger[500];
      default:
        return theme.colors.neutral[400];
    }
  }};
  animation: ${({ $status }) =>
    $status === 'connecting' ? pulse : 'none'} 1.5s ease-in-out infinite;
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
`;

function getStatusText(status: ConnectionStatusType): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'error':
      return 'Connection error';
    default:
      return 'Disconnected';
  }
}

export interface ConnectionStatusProps {
  showText?: boolean;
  showIcon?: boolean;
}

export function ConnectionStatus({ showText = true, showIcon = false }: ConnectionStatusProps) {
  const { status } = useRealtime();

  return (
    <StatusContainer $status={status}>
      {showIcon ? (
        <StatusIcon>
          {status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
        </StatusIcon>
      ) : (
        <StatusDot $status={status} />
      )}
      {showText && <span>{getStatusText(status)}</span>}
    </StatusContainer>
  );
}
