'use client';

import { useMemo, type FC, type ReactNode } from 'react';
import styled from 'styled-components';
import { GripVertical, Settings, X } from 'lucide-react';
import { Spinner, Stack, SmallText, Button, IconButton } from '@/components/ui';
import type { WidgetConfig } from '../types';

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

export type { WidgetConfig };

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

const DragHandle = styled.div`
  cursor: grab;
  padding: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;

  &:active {
    cursor: grabbing;
  }
`;

const WidgetContent = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[4]};
  overflow: auto;
`;

const ErrorText = styled(SmallText)`
  color: ${({ theme }) => theme.colors.danger[600]};
`;

const ICON_SIZE = 16;

export const Widget: FC<WidgetProps> = ({
  config,
  onRemove,
  onSettings,
  isEditable,
  isLoading = false,
  error,
  onRetry,
  children,
}) => {
  const content = useMemo(() => {
    if (isLoading) {
      return (
        <Stack align="center" justify="center" style={{ padding: '32px' }} data-testid="widget-loading">
          <Spinner size="md" />
        </Stack>
      );
    }

    if (error) {
      return (
        <Stack align="center" justify="center" gap={3} style={{ padding: '24px', textAlign: 'center' }}>
          <ErrorText>{error}</ErrorText>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Stack>
      );
    }

    return children;
  }, [isLoading, error, onRetry, children]);

  return (
    <WidgetContainer
      data-testid={`widget-${config.id}`}
      data-type={config.type}
      data-editable={isEditable ? 'true' : 'false'}
      $isEditable={isEditable}
    >
      <WidgetHeader>
        <Stack direction="row" align="center" gap={2}>
          {isEditable && (
            <DragHandle data-testid="drag-handle">
              <GripVertical size={ICON_SIZE} />
            </DragHandle>
          )}
          <SmallText style={{ fontWeight: 600 }}>{config.title}</SmallText>
        </Stack>
        <Stack direction="row" align="center" gap={1}>
          <IconButton
            icon={<Settings size={ICON_SIZE} />}
            onClick={onSettings}
            aria-label="Settings"
            title="Settings"
            variant="ghost"
            size="xs"
          />
          <IconButton
            icon={<X size={ICON_SIZE} />}
            onClick={onRemove}
            aria-label="Remove"
            title="Remove"
            variant="ghost"
            size="xs"
          />
        </Stack>
      </WidgetHeader>
      <WidgetContent>{content}</WidgetContent>
    </WidgetContainer>
  );
};

export default Widget;
