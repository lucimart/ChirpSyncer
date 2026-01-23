import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FlowDiagram } from './FlowDiagram';
import type { FlowDiagramData, Platform, SyncConnection } from '../types';

const meta: Meta<typeof FlowDiagram> = {
  title: 'Flow/FlowDiagram',
  component: FlowDiagram,
  parameters: {
    layout: 'padded',
  },
  args: {
    onNodeClick: fn(),
    onEdgeClick: fn(),
    compact: false,
  },
  argTypes: {
    compact: {
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FlowDiagram>;

const twitterPlatform: Platform = {
  id: 'twitter-1',
  name: 'twitter',
  connected: true,
  lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  postsCount: 1250,
};

const blueskyPlatform: Platform = {
  id: 'bluesky-1',
  name: 'bluesky',
  connected: true,
  lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  postsCount: 890,
};

const activeConnection: SyncConnection = {
  id: 'conn-1',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'active',
  direction: 'bidirectional',
  syncCount: 425,
  lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
};

const defaultData: FlowDiagramData = {
  platforms: [twitterPlatform, blueskyPlatform],
  connections: [activeConnection],
};

export const Default: Story = {
  args: {
    data: defaultData,
  },
};

export const ActiveSync: Story = {
  args: {
    data: {
      platforms: [twitterPlatform, blueskyPlatform],
      connections: [
        {
          ...activeConnection,
          status: 'active',
        },
      ],
    },
  },
};

export const PausedSync: Story = {
  args: {
    data: {
      platforms: [twitterPlatform, blueskyPlatform],
      connections: [
        {
          ...activeConnection,
          status: 'paused',
        },
      ],
    },
  },
};

export const ErrorState: Story = {
  args: {
    data: {
      platforms: [twitterPlatform, blueskyPlatform],
      connections: [
        {
          ...activeConnection,
          status: 'error',
        },
      ],
    },
  },
};

export const UnidirectionalSync: Story = {
  args: {
    data: {
      platforms: [twitterPlatform, blueskyPlatform],
      connections: [
        {
          ...activeConnection,
          direction: 'unidirectional',
        },
      ],
    },
  },
};

export const DisconnectedPlatform: Story = {
  args: {
    data: {
      platforms: [
        twitterPlatform,
        { ...blueskyPlatform, connected: false },
      ],
      connections: [],
    },
  },
};

export const Empty: Story = {
  args: {
    data: {
      platforms: [],
      connections: [],
    },
  },
};

export const Compact: Story = {
  args: {
    data: defaultData,
    compact: true,
  },
};

export const MultiplePlatforms: Story = {
  args: {
    data: {
      platforms: [
        twitterPlatform,
        blueskyPlatform,
        {
          id: 'twitter-2',
          name: 'twitter',
          connected: true,
          postsCount: 500,
        },
      ],
      connections: [
        activeConnection,
        {
          id: 'conn-2',
          sourceId: 'bluesky-1',
          targetId: 'twitter-2',
          status: 'paused',
          direction: 'unidirectional',
          syncCount: 100,
        },
      ],
    },
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <FlowDiagram
        data={{
          platforms: [
            { ...twitterPlatform, id: 'tw-active' },
            { ...blueskyPlatform, id: 'bs-active' },
          ],
          connections: [
            { ...activeConnection, id: 'conn-active', sourceId: 'tw-active', targetId: 'bs-active', status: 'active' },
          ],
        }}
        onNodeClick={fn()}
        onEdgeClick={fn()}
      />
      <FlowDiagram
        data={{
          platforms: [
            { ...twitterPlatform, id: 'tw-paused' },
            { ...blueskyPlatform, id: 'bs-paused' },
          ],
          connections: [
            { ...activeConnection, id: 'conn-paused', sourceId: 'tw-paused', targetId: 'bs-paused', status: 'paused' },
          ],
        }}
        onNodeClick={fn()}
        onEdgeClick={fn()}
      />
      <FlowDiagram
        data={{
          platforms: [
            { ...twitterPlatform, id: 'tw-error' },
            { ...blueskyPlatform, id: 'bs-error' },
          ],
          connections: [
            { ...activeConnection, id: 'conn-error', sourceId: 'tw-error', targetId: 'bs-error', status: 'error' },
          ],
        }}
        onNodeClick={fn()}
        onEdgeClick={fn()}
      />
    </div>
  ),
};
