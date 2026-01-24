import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: {
    value: 65,
    max: 100,
    label: 'Progress',
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Progress value={75} label="Primary" variant="primary" />
      <Progress value={75} label="Success" variant="success" />
      <Progress value={75} label="Warning" variant="warning" />
      <Progress value={75} label="Danger" variant="danger" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Progress value={60} label="Small" size="sm" />
      <Progress value={60} label="Medium" size="md" />
      <Progress value={60} label="Large" size="lg" />
    </div>
  ),
};

export const WithoutLabel: Story = {
  args: {
    value: 45,
    showValue: false,
  },
};

export const Animated: Story = {
  args: {
    value: 70,
    label: 'Uploading...',
    animated: true,
    variant: 'primary',
  },
};

export const WithDetails: Story = {
  args: {
    value: 1250,
    max: 5000,
    label: 'Monthly Sync Quota',
    details: [
      { label: 'Used', value: '1,250' },
      { label: 'Remaining', value: '3,750' },
      { label: 'Total', value: '5,000' },
    ],
  },
};

export const CustomMax: Story = {
  args: {
    value: 345,
    max: 1000,
    label: 'Posts synced',
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    label: 'Upload complete',
    variant: 'success',
  },
};

export const LowProgress: Story = {
  args: {
    value: 5,
    label: 'Getting started',
    variant: 'primary',
  },
};

export const DangerZone: Story = {
  args: {
    value: 95,
    label: 'Storage usage',
    variant: 'danger',
  },
};
