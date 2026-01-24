import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    name: 'John Doe',
  },
};

export const WithImage: Story = {
  args: {
    name: 'Jane Smith',
    src: 'https://i.pravatar.cc/150?u=jane',
  },
};

export const SingleName: Story = {
  args: {
    name: 'Admin',
  },
};

export const NoName: Story = {
  args: {},
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Avatar name="XS" size="xs" />
      <Avatar name="SM" size="sm" />
      <Avatar name="MD" size="md" />
      <Avatar name="LG" size="lg" />
      <Avatar name="XL" size="xl" />
    </div>
  ),
};

export const SizesWithImage: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Avatar name="User" size="xs" src="https://i.pravatar.cc/150?u=1" />
      <Avatar name="User" size="sm" src="https://i.pravatar.cc/150?u=2" />
      <Avatar name="User" size="md" src="https://i.pravatar.cc/150?u=3" />
      <Avatar name="User" size="lg" src="https://i.pravatar.cc/150?u=4" />
      <Avatar name="User" size="xl" src="https://i.pravatar.cc/150?u=5" />
    </div>
  ),
};
