'use client';

import { useCallback, useMemo, memo, type FC } from 'react';
import styled from 'styled-components';
import { Modal, Button, Spinner, Stack, SmallText } from '@/components/ui';
import { useSyncPreview } from '@/hooks/useSyncPreview';
import { SyncPreviewList } from '../SyncPreviewList';
import type { SyncPreviewItemData } from '@/lib/api';

export interface SyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (selectedItems: SyncPreviewItemData[]) => void;
}

const LOADING_PADDING = '48px';

const ErrorText = styled(SmallText)`
  color: ${({ theme }) => theme.colors.danger[600]};
`;

export const SyncPreviewModal: FC<SyncPreviewModalProps> = memo(({ isOpen, onClose, onSync }) => {
  const {
    items,
    isLoading,
    isError,
    error,
    refetch,
    toggleItem,
    selectAll,
    deselectAll,
    selectedItems,
    selectedCount,
    totalCount,
  } = useSyncPreview();

  const handleSyncClick = useCallback(() => {
    onSync(selectedItems);
  }, [onSync, selectedItems]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <Stack
          align="center"
          justify="center"
          gap={4}
          style={{ padding: LOADING_PADDING }}
          data-testid="sync-preview-loading"
        >
          <Spinner size="md" data-testid="loading-spinner" />
          <SmallText>Loading preview...</SmallText>
        </Stack>
      );
    }

    if (isError) {
      return (
        <Stack
          align="center"
          justify="center"
          gap={4}
          style={{ padding: LOADING_PADDING, textAlign: 'center' }}
        >
          <ErrorText>
            {error?.message || 'Failed to fetch sync preview'}
          </ErrorText>
          <Button variant="secondary" onClick={handleRetry}>
            Retry
          </Button>
        </Stack>
      );
    }

    return (
      <SyncPreviewList
        items={items}
        onToggleItem={toggleItem}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
      />
    );
  }, [isLoading, isError, error?.message, handleRetry, items, toggleItem, selectAll, deselectAll]);

  const itemCountText = useMemo(() => {
    if (isLoading || isError) return null;

    const text =
      selectedCount !== totalCount
        ? `${selectedCount} of ${totalCount} items selected`
        : `${totalCount} items will be synced`;

    return <SmallText>{text}</SmallText>;
  }, [isLoading, isError, selectedCount, totalCount]);

  const footerContent = useMemo(
    () => (
      <Stack direction="row" justify="between" align="center" style={{ width: '100%' }}>
        {itemCountText}
        <Stack direction="row" gap={3}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSyncClick}
            disabled={selectedCount === 0 || isLoading || isError}
          >
            Sync Now
          </Button>
        </Stack>
      </Stack>
    ),
    [itemCountText, onClose, handleSyncClick, selectedCount, isLoading, isError]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sync Preview"
      size="lg"
      footer={footerContent}
    >
      {content}
    </Modal>
  );
});

SyncPreviewModal.displayName = 'SyncPreviewModal';
