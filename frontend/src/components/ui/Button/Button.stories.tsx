import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Plus, ArrowRight, Download, Trash2, Settings, Check, Mail } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
    isLoading: false,
    fullWidth: false,
    disabled: false,
    isRound: false,
    disableAnimations: false,
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline', 'soft', 'danger-soft', 'dashed'],
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'icon'],
    },
    leftIcon: { control: false },
    rightIcon: { control: false },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Action',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /primary action/i })).toBeEnabled();
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Soft: Story = {
  args: {
    children: 'Soft Button',
    variant: 'soft',
  },
};

export const DangerSoft: Story = {
  args: {
    children: 'Remove',
    variant: 'danger-soft',
  },
};

export const Dashed: Story = {
  args: {
    children: 'Add Item',
    variant: 'dashed',
    leftIcon: <Plus size={16} />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="soft">Soft</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-soft">Danger Soft</Button>
      <Button variant="dashed">Dashed</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithLeftIcon: Story = {
  args: {
    children: 'Add New',
    leftIcon: <Plus size={16} />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: 'Continue',
    rightIcon: <ArrowRight size={16} />,
  },
};

export const WithBothIcons: Story = {
  args: {
    children: 'Download',
    leftIcon: <Download size={16} />,
    rightIcon: <Check size={16} />,
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Settings',
    children: <Settings size={18} />,
  },
};

export const IconOnlyRound: Story = {
  args: {
    size: 'icon',
    isRound: true,
    'aria-label': 'Send email',
    children: <Mail size={18} />,
  },
};

export const Loading: Story = {
  args: {
    children: 'Saving',
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button')).toBeDisabled();
  },
};

export const LoadingWithText: Story = {
  args: {
    children: 'Submit',
    isLoading: true,
    loadingText: 'Submitting...',
  },
};

export const LoadingVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button isLoading loadingText="Saving...">Save</Button>
      <Button variant="secondary" isLoading>Processing</Button>
      <Button variant="danger" isLoading loadingText="Deleting...">Delete</Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const DisabledVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button disabled>Primary</Button>
      <Button variant="secondary" disabled>Secondary</Button>
      <Button variant="danger" disabled>Danger</Button>
      <Button variant="outline" disabled>Outline</Button>
    </div>
  ),
};

export const WithAnimations: Story = {
  name: 'Interactive (Hover/Click)',
  args: {
    children: 'Hover & Click Me',
  },
  parameters: {
    docs: {
      description: {
        story: 'Buttons have subtle scale animations on hover and click. Try interacting with the button.',
      },
    },
  },
};

export const NoAnimations: Story = {
  args: {
    children: 'No Animations',
    disableAnimations: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Animations can be disabled for specific use cases or when reduced motion is preferred.',
      },
    },
  },
};

export const DestructiveAction: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Button variant="danger" leftIcon={<Trash2 size={16} />}>
        Delete Account
      </Button>
      <Button variant="danger-soft" leftIcon={<Trash2 size={16} />}>
        Remove Item
      </Button>
    </div>
  ),
};
