'use client';

import React, { ReactNode } from 'react';
import styled from 'styled-components';
import { Spinner } from '@/components/ui';

export interface WidgetConfig {
  id: string;
  type: 'stats' | 'chart' | 'list' | 'custom';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface WidgetProps {
  config: WidgetConfig;
  onRemove: () => void;
  onSettings: () => void;
  isEditable: boolean;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  children: ReactNode;
}

const WidgetContainer = styled.div<{ $isEditable: boolean }>`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: all ${({ theme }) => theme.transitions.default};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${({ $isEditable, theme }) =>
    $isEditable &&
    `
    border-color: ${theme.colors.primary[300]};
    box-shadow: ${theme.shadows.md};
  `}
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background-color: ${({ theme }) => theme.colors.background.secondary};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const DragHandle = styled.div`
  cursor: grab;
  padding: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;

  &:active {
    cursor: grabbing;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const WidgetTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing[1]};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const WidgetContent = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow: auto;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger[600]};
  margin: 0;
`;

const RetryButton = styled.button`
  background-color: ${({ theme }) => theme.colors.primary[500]};
  color: white;
  border: none;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[600]};
  }
`;

// SVG Icons
const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Widget: React.FC<WidgetProps> = ({
  config,
  onRemove,
  onSettings,
  isEditable,
  isLoading = false,
  error,
  onRetry,
  children,
}) => {
  return (
    <WidgetContainer
      data-testid={`widget-${config.id}`}
      data-type={config.type}
      data-editable={isEditable ? 'true' : 'false'}
      $isEditable={isEditable}
    >
      <WidgetHeader>
        <HeaderLeft>
          {isEditable && (
            <DragHandle data-testid="drag-handle">
              <GripIcon />
            </DragHandle>
          )}
          <WidgetTitle>{config.title}</WidgetTitle>
        </HeaderLeft>
        <HeaderActions>
          <IconButton
            onClick={onSettings}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            onClick={onRemove}
            aria-label="Remove"
            title="Remove"
          >
            <CloseIcon />
          </IconButton>
        </HeaderActions>
      </WidgetHeader>
      <WidgetContent>
        {isLoading ? (
          <LoadingContainer data-testid="widget-loading">
            <Spinner size="md" />
          </LoadingContainer>
        ) : error ? (
          <ErrorContainer>
            <ErrorMessage>{error}</ErrorMessage>
            {onRetry && (
              <RetryButton onClick={onRetry}>Retry</RetryButton>
            )}
          </ErrorContainer>
        ) : (
          children
        )}
      </WidgetContent>
    </WidgetContainer>
  );
};

export default Widget;
