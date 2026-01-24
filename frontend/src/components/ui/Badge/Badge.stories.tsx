import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: {
    children: 'Badge',
    variant: 'default',
    size: 'md',
    dot: false,
    outline: false,
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'primary',
        'success',
        'warning',
        'danger',
        'info',
        'neutral',
        'neutral-soft',
        'success-soft',
        'warning-soft',
        'text',
        'status-success',
        'status-warning',
        'status-danger',
        'status-primary',
      ],
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="neutral-soft">Neutral Soft</Badge>
      <Badge variant="success-soft">Success Soft</Badge>
      <Badge variant="warning-soft">Warning Soft</Badge>
      <Badge variant="text">Text</Badge>
      <Badge variant="status-success">Status Success</Badge>
      <Badge variant="status-warning">Status Warning</Badge>
      <Badge variant="status-danger">Status Danger</Badge>
      <Badge variant="status-primary">Status Primary</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Badge size="xs">X-Small</Badge>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const Dot: Story = {
  args: {
    dot: true,
    children: 'Live',
    variant: 'success',
  },
};

export const Outline: Story = {
  args: {
    outline: true,
    variant: 'primary',
    children: 'Outlined',
  },
};
