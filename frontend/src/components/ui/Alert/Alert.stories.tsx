import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  args: {
    variant: 'error',
    children: 'Something went wrong. Please try again.',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['error', 'success', 'warning', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Error: Story = {
  args: {
    variant: 'error',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Saved successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'This action is irreversible.',
  },
};

export const InfoAlert: Story = {
  args: {
    variant: 'info',
    children: 'New updates are available.',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'error',
    title: 'Request failed',
    children: 'Please check your credentials and try again.',
  },
};

export const WithIcon: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert variant="error" icon={<AlertCircle size={18} />}>
        Something went wrong.
      </Alert>
      <Alert variant="success" icon={<CheckCircle size={18} />}>
        Everything is up to date.
      </Alert>
      <Alert variant="warning" icon={<AlertTriangle size={18} />}>
        Review required.
      </Alert>
      <Alert variant="info" icon={<Info size={18} />}>
        New feature available.
      </Alert>
    </div>
  ),
};
