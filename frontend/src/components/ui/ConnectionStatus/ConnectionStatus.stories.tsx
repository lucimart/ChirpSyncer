import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionStatus } from './ConnectionStatus';
import { RealtimeProvider } from '@/providers/RealtimeProvider';

const meta: Meta<typeof ConnectionStatus> = {
  title: 'UI/ConnectionStatus',
  component: ConnectionStatus,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <RealtimeProvider>
        <Story />
      </RealtimeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionStatus>;

export const Default: Story = {
  args: {
    showText: true,
    showIcon: false,
  },
};

export const WithIcon: Story = {
  args: {
    showText: true,
    showIcon: true,
  },
};

export const DotOnly: Story = {
  args: {
    showText: false,
    showIcon: false,
  },
};

export const IconOnly: Story = {
  args: {
    showText: false,
    showIcon: true,
  },
};

// Note: To test different connection states, mock the RealtimeProvider
// or use Storybook play functions to simulate state changes
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>With text and dot:</p>
        <ConnectionStatus showText={true} showIcon={false} />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>With text and icon:</p>
        <ConnectionStatus showText={true} showIcon={true} />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Dot only:</p>
        <ConnectionStatus showText={false} showIcon={false} />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>Icon only:</p>
        <ConnectionStatus showText={false} showIcon={true} />
      </div>
    </div>
  ),
};
