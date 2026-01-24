import type { Meta, StoryObj } from '@storybook/react';
import { Settings, Check, AlertTriangle, XCircle, Info, Star } from 'lucide-react';
import { IconBadge } from './IconBadge';

const meta: Meta<typeof IconBadge> = {
  title: 'UI/IconBadge',
  component: IconBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger', 'neutral', 'custom'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof IconBadge>;

export const Default: Story = {
  args: {
    children: <Settings size={20} />,
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: <Info size={20} />,
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: <Check size={20} />,
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: <AlertTriangle size={20} />,
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: <XCircle size={20} />,
  },
};

export const Neutral: Story = {
  args: {
    variant: 'neutral',
    children: <Settings size={20} />,
  },
};

export const CustomColor: Story = {
  args: {
    color: '#9333ea',
    children: <Star size={20} />,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: <Check size={16} />,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: <Check size={20} />,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: <Check size={24} />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <IconBadge variant="primary">
        <Info size={20} />
      </IconBadge>
      <IconBadge variant="success">
        <Check size={20} />
      </IconBadge>
      <IconBadge variant="warning">
        <AlertTriangle size={20} />
      </IconBadge>
      <IconBadge variant="danger">
        <XCircle size={20} />
      </IconBadge>
      <IconBadge variant="neutral">
        <Settings size={20} />
      </IconBadge>
      <IconBadge color="#9333ea">
        <Star size={20} />
      </IconBadge>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <IconBadge size="sm" variant="success">
        <Check size={16} />
      </IconBadge>
      <IconBadge size="md" variant="success">
        <Check size={20} />
      </IconBadge>
      <IconBadge size="lg" variant="success">
        <Check size={24} />
      </IconBadge>
    </div>
  ),
};
