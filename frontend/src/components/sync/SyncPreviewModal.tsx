'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useSyncPreview } from '@/hooks/useSyncPreview';
import { SyncPreviewList } from './SyncPreviewList';
import styled from 'styled-components';
import type { SyncPreviewItemData } from '@/lib/api';

interface SyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (selectedItems: SyncPreviewItemData[]) => void;
}

const ItemCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FooterActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  gap: ${({ theme }) => theme.spacing[4]};
`;

const LoadingText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  gap: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

export function SyncPreviewModal({ isOpen, onClose, onSync }: SyncPreviewModalProps) {
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

  const handleSyncClick = () => {
    onSync(selectedItems);
  };

  const handleRetry = () => {
    refetch();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingContainer data-testid="sync-preview-loading">
          <Spinner size="md" data-testid="loading-spinner" />
          <LoadingText>Loading preview...</LoadingText>
        </LoadingContainer>
      );
    }

    if (isError) {
      return (
        <ErrorContainer>
          <ErrorMessage>{error?.message || 'Failed to fetch sync preview'}</ErrorMessage>
          <Button variant="secondary" onClick={handleRetry}>
            Retry
          </Button>
        </ErrorContainer>
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
  };

  const renderItemCount = () => {
    if (isLoading || isError) return null;

    if (selectedCount !== totalCount) {
      return <ItemCount>{selectedCount} of {totalCount} items selected</ItemCount>;
    }

    return <ItemCount>{totalCount} items will be synced</ItemCount>;
  };

  const footerContent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
      {renderItemCount()}
      <FooterActions>
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
      </FooterActions>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sync Preview"
      size="lg"
      footer={footerContent}
    >
      {renderContent()}
    </Modal>
  );
}
