import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PlatformNode } from './PlatformNode';
import type { Platform } from '../types';

const meta: Meta<typeof PlatformNode> = {
  title: 'Flow/PlatformNode',
  component: PlatformNode,
  parameters: {
    layout: 'centered',
  },
  args: {
    onClick: fn(),
    isHovered: false,
    isSelected: false,
  },
  argTypes: {
    isHovered: {
      control: { type: 'boolean' },
    },
    isSelected: {
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof PlatformNode>;

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

export const Twitter: Story = {
  args: {
    platform: twitterPlatform,
  },
};

export const Bluesky: Story = {
  args: {
    platform: blueskyPlatform,
  },
};

export const Hovered: Story = {
  args: {
    platform: twitterPlatform,
    isHovered: true,
  },
};

export const Selected: Story = {
  args: {
    platform: twitterPlatform,
    isSelected: true,
  },
};

export const HoveredAndSelected: Story = {
  args: {
    platform: twitterPlatform,
    isHovered: true,
    isSelected: true,
  },
};

export const Disconnected: Story = {
  args: {
    platform: {
      ...twitterPlatform,
      connected: false,
    },
  },
};

export const WithoutLastSync: Story = {
  args: {
    platform: {
      id: 'twitter-2',
      name: 'twitter',
      connected: true,
      postsCount: 500,
    },
  },
};

export const WithoutPostsCount: Story = {
  args: {
    platform: {
      id: 'twitter-3',
      name: 'twitter',
      connected: true,
      lastSync: new Date().toISOString(),
    },
  },
};

export const MinimalData: Story = {
  args: {
    platform: {
      id: 'platform-1',
      name: 'twitter',
      connected: true,
    },
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <PlatformNode
        platform={twitterPlatform}
        onClick={fn()}
        isHovered={false}
        isSelected={false}
      />
      <PlatformNode
        platform={twitterPlatform}
        onClick={fn()}
        isHovered={true}
        isSelected={false}
      />
      <PlatformNode
        platform={twitterPlatform}
        onClick={fn()}
        isHovered={false}
        isSelected={true}
      />
      <PlatformNode
        platform={{ ...twitterPlatform, connected: false }}
        onClick={fn()}
        isHovered={false}
        isSelected={false}
      />
    </div>
  ),
};

export const BothPlatforms: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <PlatformNode
        platform={twitterPlatform}
        onClick={fn()}
        isHovered={false}
        isSelected={false}
      />
      <PlatformNode
        platform={blueskyPlatform}
        onClick={fn()}
        isHovered={false}
        isSelected={false}
      />
    </div>
  ),
};
