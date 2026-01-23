import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SyncPreviewModal } from './SyncPreviewModal';
import { Button } from '@/components/ui';
import type { SyncPreviewItemData } from '@/lib/api';

// Mock the hook for stories
jest.mock('@/hooks/useSyncPreview', () => ({
  useSyncPreview: () => ({
    items: mockItems,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
    toggleItem: () => {},
    selectAll: () => {},
    deselectAll: () => {},
    selectedItems: mockItems.filter((item) => item.selected),
    selectedCount: mockItems.filter((item) => item.selected).length,
    totalCount: mockItems.length,
  }),
}));

const mockItems: SyncPreviewItemData[] = [
  {
    id: '1',
    content: 'Just shipped a new feature! Really excited about this one. #coding #tech',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    selected: true,
    hasMedia: false,
  },
  {
    id: '2',
    content: 'Great discussion at the conference today about the future of social media',
    sourcePlatform: 'bluesky',
    targetPlatform: 'twitter',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    selected: true,
    hasMedia: true,
    mediaCount: 2,
  },
  {
    id: '3',
    content: 'Thread: Why decentralized social networks matter for the future...',
    sourcePlatform: 'twitter',
    targetPlatform: 'bluesky',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    selected: false,
    hasMedia: false,
  },
];

const meta: Meta<typeof SyncPreviewModal> = {
  title: 'Sync/SyncPreviewModal',
  component: SyncPreviewModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    onClose: { action: 'closed' },
    onSync: { action: 'synced' },
  },
};

export default meta;
type Story = StoryObj<typeof SyncPreviewModal>;

// Interactive wrapper for stories
const ModalWrapper = ({ children }: { children: (props: { open: () => void }) => React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {children({ open: () => setIsOpen(true) })}
      <SyncPreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSync={(items) => {
          console.log('Syncing items:', items);
          setIsOpen(false);
        }}
      />
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ModalWrapper>
      {({ open }) => (
        <Button variant="primary" onClick={open}>
          Open Sync Preview
        </Button>
      )}
    </ModalWrapper>
  ),
};

export const OpenByDefault: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSync: () => {},
  },
};

// Note: Loading and Error states require mocking the hook differently
// In a real scenario, you would use Storybook decorators with MSW or similar

export const LoadingState: Story = {
  render: () => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>Loading state demo - this would show spinner when data is loading.</p>
      <p>In production, the modal displays a centered spinner with &quot;Loading preview...&quot; text.</p>
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>Error state demo - this would show error message with retry button.</p>
      <p>In production, the modal displays error text and a &quot;Retry&quot; button.</p>
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>Empty state demo - shown when no items are available to sync.</p>
      <p>The sync list displays &quot;No items to sync&quot; empty state.</p>
    </div>
  ),
};
