import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SyncEdge } from './SyncEdge';
import type { SyncConnection } from '../types';

const meta: Meta<typeof SyncEdge> = {
  title: 'Flow/SyncEdge',
  component: SyncEdge,
  parameters: {
    layout: 'centered',
  },
  args: {
    onClick: fn(),
    isHovered: false,
  },
  argTypes: {
    isHovered: {
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SyncEdge>;

const activeConnection: SyncConnection = {
  id: 'conn-1',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'active',
  direction: 'bidirectional',
  syncCount: 425,
  lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
};

const pausedConnection: SyncConnection = {
  id: 'conn-2',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'paused',
  direction: 'unidirectional',
  syncCount: 150,
  lastSync: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
};

const errorConnection: SyncConnection = {
  id: 'conn-3',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'error',
  direction: 'bidirectional',
  syncCount: 50,
  lastSync: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
};

export const Active: Story = {
  args: {
    connection: activeConnection,
  },
};

export const Paused: Story = {
  args: {
    connection: pausedConnection,
  },
};

export const Error: Story = {
  args: {
    connection: errorConnection,
  },
};

export const Bidirectional: Story = {
  args: {
    connection: activeConnection,
  },
};

export const Unidirectional: Story = {
  args: {
    connection: pausedConnection,
  },
};

export const Hovered: Story = {
  args: {
    connection: activeConnection,
    isHovered: true,
  },
};

export const WithoutLastSync: Story = {
  args: {
    connection: {
      id: 'conn-4',
      sourceId: 'twitter-1',
      targetId: 'bluesky-1',
      status: 'active',
      direction: 'bidirectional',
      syncCount: 100,
    },
  },
};

export const WithoutSyncCount: Story = {
  args: {
    connection: {
      id: 'conn-5',
      sourceId: 'twitter-1',
      targetId: 'bluesky-1',
      status: 'active',
      direction: 'bidirectional',
      lastSync: new Date().toISOString(),
    },
  },
};

export const MinimalData: Story = {
  args: {
    connection: {
      id: 'conn-6',
      sourceId: 'twitter-1',
      targetId: 'bluesky-1',
      status: 'active',
      direction: 'bidirectional',
    },
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <SyncEdge
        connection={activeConnection}
        onClick={fn()}
        isHovered={false}
      />
      <SyncEdge
        connection={pausedConnection}
        onClick={fn()}
        isHovered={false}
      />
      <SyncEdge
        connection={errorConnection}
        onClick={fn()}
        isHovered={false}
      />
    </div>
  ),
};

export const AllDirections: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <SyncEdge
        connection={{ ...activeConnection, direction: 'bidirectional' }}
        onClick={fn()}
        isHovered={false}
      />
      <SyncEdge
        connection={{ ...activeConnection, direction: 'unidirectional' }}
        onClick={fn()}
        isHovered={false}
      />
    </div>
  ),
};

export const HoverComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Normal</p>
        <SyncEdge
          connection={activeConnection}
          onClick={fn()}
          isHovered={false}
        />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Hovered</p>
        <SyncEdge
          connection={activeConnection}
          onClick={fn()}
          isHovered={true}
        />
      </div>
    </div>
  ),
};
