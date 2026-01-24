import type { Meta, StoryObj } from '@storybook/react';
import { SyncPreviewList } from './SyncPreviewList';
import type { SyncPreviewItemData } from '@/lib/api';

const meta: Meta<typeof SyncPreviewList> = {
  title: 'Sync/SyncPreviewList',
  component: SyncPreviewList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onToggleItem: { action: 'item toggled' },
    onSelectAll: { action: 'select all' },
    onDeselectAll: { action: 'deselect all' },
    onFilter: { action: 'filter changed' },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SyncPreviewList>;

const createItems = (count: number, selectedIndices: number[] = []): SyncPreviewItemData[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    content: `This is test post number ${i + 1}. It contains some sample content for the sync preview.`,
    sourcePlatform: i % 2 === 0 ? 'twitter' : 'bluesky',
    targetPlatform: i % 2 === 0 ? 'bluesky' : 'twitter',
    timestamp: new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString(),
    selected: selectedIndices.includes(i),
    hasMedia: i % 3 === 0,
    mediaCount: i % 3 === 0 ? (i % 4) + 1 : undefined,
  }));

export const Default: Story = {
  args: {
    items: createItems(5),
  },
};

export const WithSelection: Story = {
  args: {
    items: createItems(5, [0, 2, 4]),
  },
};

export const AllSelected: Story = {
  args: {
    items: createItems(5, [0, 1, 2, 3, 4]),
  },
};

export const NoneSelected: Story = {
  args: {
    items: createItems(5),
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const SingleItem: Story = {
  args: {
    items: createItems(1),
  },
};

export const ManyItems: Story = {
  args: {
    items: createItems(20, [0, 5, 10, 15]),
  },
};

export const AllTwitterSource: Story = {
  args: {
    items: Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      content: `Twitter post ${i + 1} to be synced to Bluesky`,
      sourcePlatform: 'twitter' as const,
      targetPlatform: 'bluesky' as const,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      selected: false,
      hasMedia: false,
    })),
  },
};

export const AllBlueskySource: Story = {
  args: {
    items: Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      content: `Bluesky post ${i + 1} to be synced to Twitter`,
      sourcePlatform: 'bluesky' as const,
      targetPlatform: 'twitter' as const,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      selected: false,
      hasMedia: false,
    })),
  },
};

export const WithMediaItems: Story = {
  args: {
    items: Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1),
      content: `Post with ${i + 1} media attachment(s)`,
      sourcePlatform: 'twitter' as const,
      targetPlatform: 'bluesky' as const,
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      selected: false,
      hasMedia: true,
      mediaCount: i + 1,
    })),
  },
};

export const MixedContent: Story = {
  args: {
    items: [
      {
        id: '1',
        content: 'Just launched our new product! Check it out at example.com #launch #startup',
        sourcePlatform: 'twitter',
        targetPlatform: 'bluesky',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        selected: true,
        hasMedia: true,
        mediaCount: 2,
      },
      {
        id: '2',
        content: 'Great discussion at the conference today about the future of social media',
        sourcePlatform: 'bluesky',
        targetPlatform: 'twitter',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        selected: false,
        hasMedia: false,
      },
      {
        id: '3',
        content: 'Thread: Why decentralized social networks matter for the future of the internet...',
        sourcePlatform: 'twitter',
        targetPlatform: 'bluesky',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        selected: true,
        hasMedia: false,
      },
      {
        id: '4',
        content: 'Beautiful sunset from my balcony today',
        sourcePlatform: 'bluesky',
        targetPlatform: 'twitter',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        selected: false,
        hasMedia: true,
        mediaCount: 1,
      },
    ],
  },
};
