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
    const surface = theme.colors.surface;
    switch ($status) {
      case 'connected':
        return surface?.success?.bg ?? theme.colors.success[50];
      case 'connecting':
        return surface?.warning?.bg ?? theme.colors.warning[50];
      case 'error':
        return surface?.danger?.bg ?? theme.colors.danger[50];
      default:
        return surface?.neutral?.bg ?? theme.colors.neutral[100];
    }
  }};
  border-color: ${({ $status, theme }) => {
    const surface = theme.colors.surface;
    switch ($status) {
      case 'connected':
        return surface?.success?.border ?? theme.colors.success[200];
      case 'connecting':
        return surface?.warning?.border ?? theme.colors.warning[200];
      case 'error':
        return surface?.danger?.border ?? theme.colors.danger[200];
      default:
        return surface?.neutral?.border ?? theme.colors.neutral[200];
    }
  }};
  color: ${({ $status, theme }) => {
    const surface = theme.colors.surface;
    switch ($status) {
      case 'connected':
        return surface?.success?.text ?? theme.colors.success[800];
      case 'connecting':
        return surface?.warning?.text ?? theme.colors.warning[800];
      case 'error':
        return surface?.danger?.text ?? theme.colors.danger[800];
      default:
        return surface?.neutral?.text ?? theme.colors.neutral[800];
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
