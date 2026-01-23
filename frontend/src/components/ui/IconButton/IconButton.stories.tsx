import type { Meta, StoryObj } from '@storybook/react';
import { Settings, X, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'soft', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
  args: {
    'aria-label': 'Settings',
    children: <Settings size={16} />,
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    'aria-label': 'Close',
    children: <X size={16} />,
  },
};

export const Soft: Story = {
  args: {
    variant: 'soft',
    'aria-label': 'Add',
    children: <Plus size={16} />,
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    'aria-label': 'More options',
    children: <MoreHorizontal size={16} />,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    'aria-label': 'Edit',
    children: <Edit size={14} />,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    'aria-label': 'Edit',
    children: <Edit size={16} />,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    'aria-label': 'Edit',
    children: <Edit size={20} />,
  },
};

export const Disabled: Story = {
  args: {
    'aria-label': 'Disabled',
    disabled: true,
    children: <Settings size={16} />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <IconButton variant="ghost" aria-label="Ghost">
        <X size={16} />
      </IconButton>
      <IconButton variant="soft" aria-label="Soft">
        <Plus size={16} />
      </IconButton>
      <IconButton variant="outline" aria-label="Outline">
        <MoreHorizontal size={16} />
      </IconButton>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <IconButton size="sm" aria-label="Small">
        <Settings size={14} />
      </IconButton>
      <IconButton size="md" aria-label="Medium">
        <Settings size={16} />
      </IconButton>
      <IconButton size="lg" aria-label="Large">
        <Settings size={20} />
      </IconButton>
    </div>
  ),
};

export const ActionButtons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <IconButton variant="ghost" aria-label="Edit">
        <Edit size={16} />
      </IconButton>
      <IconButton variant="ghost" aria-label="Delete">
        <Trash2 size={16} />
      </IconButton>
      <IconButton variant="ghost" aria-label="More">
        <MoreHorizontal size={16} />
      </IconButton>
    </div>
  ),
};
