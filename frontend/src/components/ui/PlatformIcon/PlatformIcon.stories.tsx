import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import { PlatformIcon } from './PlatformIcon';

const meta: Meta<typeof PlatformIcon> = {
  title: 'UI/PlatformIcon',
  component: PlatformIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    color: {
      control: 'color',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PlatformIcon>;

const Row = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

export const Twitter: Story = {
  args: {
    icon: 'T',
    color: '#1DA1F2',
    size: 'md',
  },
};

export const Bluesky: Story = {
  args: {
    icon: 'B',
    color: '#0085FF',
    size: 'md',
  },
};

export const Mastodon: Story = {
  args: {
    icon: 'M',
    color: '#6364FF',
    size: 'md',
  },
};

export const ChirpSyncer: Story = {
  args: {
    icon: 'C',
    color: '#6366F1',
    size: 'md',
  },
};

export const Sizes: Story = {
  render: () => (
    <Row>
      <PlatformIcon icon="T" color="#1DA1F2" size="sm" />
      <PlatformIcon icon="T" color="#1DA1F2" size="md" />
      <PlatformIcon icon="T" color="#1DA1F2" size="lg" />
    </Row>
  ),
};

export const AllPlatforms: Story = {
  render: () => (
    <Row>
      <PlatformIcon icon="T" color="#1DA1F2" />
      <PlatformIcon icon="B" color="#0085FF" />
      <PlatformIcon icon="M" color="#6364FF" />
      <PlatformIcon icon="C" color="#6366F1" />
    </Row>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <Row>
      <PlatformIcon icon="A" color="#ff6b6b" />
      <PlatformIcon icon="B" color="#4ecdc4" />
      <PlatformIcon icon="C" color="#45b7d1" />
      <PlatformIcon icon="D" color="#96ceb4" />
    </Row>
  ),
};
