import type { Meta, StoryObj } from '@storybook/react';
import { RefreshCw, Plus, Settings } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Button } from '../Button';

const meta: Meta<typeof PageHeader> = {
  title: 'UI/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    description: 'Overview of your ChirpSyncer activity',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'Settings',
  },
};

export const WithSingleAction: Story = {
  args: {
    title: 'Sync Dashboard',
    description: 'Manage synchronization between platforms',
    actions: (
      <Button>
        <RefreshCw size={18} />
        Sync Now
      </Button>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: 'Connectors',
    description: 'Connect and configure your social media accounts',
    actions: (
      <>
        <Button variant="secondary">
          <Settings size={16} />
          Settings
        </Button>
        <Button>
          <Plus size={16} />
          Add Platform
        </Button>
      </>
    ),
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Platform Configuration & Integration Settings',
    description:
      'Configure how your platforms connect and sync with ChirpSyncer. Manage credentials, sync intervals, and advanced options.',
    actions: <Button variant="secondary">Edit</Button>,
  },
};
