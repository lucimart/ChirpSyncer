import type { Meta, StoryObj } from '@storybook/react';
import { SyncPreviewItem } from './SyncPreviewItem';
import type { SyncPreviewItemData } from '@/lib/api';

const meta: Meta<typeof SyncPreviewItem> = {
  title: 'Sync/SyncPreviewItem',
  component: SyncPreviewItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onToggle: { action: 'toggled' },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SyncPreviewItem>;

const baseItem: SyncPreviewItemData = {
  id: '1',
  content: 'Just shipped a new feature! Really excited about this one. #coding #tech',
  sourcePlatform: 'twitter',
  targetPlatform: 'bluesky',
  timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  selected: false,
  hasMedia: false,
};

export const Default: Story = {
  args: {
    item: baseItem,
  },
};

export const Selected: Story = {
  args: {
    item: {
      ...baseItem,
      selected: true,
    },
  },
};

export const TwitterToBluesky: Story = {
  args: {
    item: {
      ...baseItem,
      sourcePlatform: 'twitter',
      targetPlatform: 'bluesky',
    },
  },
};

export const BlueskyToTwitter: Story = {
  args: {
    item: {
      ...baseItem,
      id: '2',
      sourcePlatform: 'bluesky',
      targetPlatform: 'twitter',
    },
  },
};

export const WithMedia: Story = {
  args: {
    item: {
      ...baseItem,
      id: '3',
      content: 'Check out this amazing sunset photo I took yesterday!',
      hasMedia: true,
      mediaCount: 1,
    },
  },
};

export const WithMultipleMedia: Story = {
  args: {
    item: {
      ...baseItem,
      id: '4',
      content: 'Here are some photos from my trip to Japan',
      hasMedia: true,
      mediaCount: 4,
    },
  },
};

export const LongContent: Story = {
  args: {
    item: {
      ...baseItem,
      id: '5',
      content:
        'This is a really long post that contains a lot of text. Sometimes people write posts that are quite lengthy and contain multiple sentences. This post demonstrates how the component handles content that exceeds the typical length and needs to be truncated for display purposes.',
    },
  },
};

export const ShortContent: Story = {
  args: {
    item: {
      ...baseItem,
      id: '6',
      content: 'Hello world!',
    },
  },
};

export const RecentTimestamp: Story = {
  args: {
    item: {
      ...baseItem,
      id: '7',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  },
};

export const OldTimestamp: Story = {
  args: {
    item: {
      ...baseItem,
      id: '8',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
};
