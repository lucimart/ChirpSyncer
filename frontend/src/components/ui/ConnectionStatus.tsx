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
  background-color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.success[50];
      case 'connecting':
        return theme.colors.warning[50];
      case 'error':
        return theme.colors.danger[50];
      default:
        return theme.colors.neutral[100];
    }
  }};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case 'connected':
        return theme.colors.success[700];
      case 'connecting':
        return theme.colors.warning[700];
      case 'error':
        return theme.colors.danger[700];
      default:
        return theme.colors.neutral[600];
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

interface ConnectionStatusProps {
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
