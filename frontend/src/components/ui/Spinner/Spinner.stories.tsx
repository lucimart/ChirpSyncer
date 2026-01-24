import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';
import { Button } from '../Button';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'white', 'current'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {
    size: 'md',
    color: 'primary',
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="xs" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>xs</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="sm" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>sm</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="md" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>md</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="lg" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>lg</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner size="xl" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>xl</p>
      </div>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      <div style={{ textAlign: 'center' }}>
        <Spinner color="primary" size="lg" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>primary</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Spinner color="secondary" size="lg" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>secondary</p>
      </div>
      <div style={{ textAlign: 'center', background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
        <Spinner color="white" size="lg" />
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'white' }}>white</p>
      </div>
      <div style={{ textAlign: 'center', color: '#dc2626' }}>
        <Spinner color="current" size="lg" />
        <p style={{ marginTop: '8px', fontSize: '12px' }}>current (red)</p>
      </div>
    </div>
  ),
};

export const InButton: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Button variant="primary" disabled>
        <Spinner size="sm" color="white" />
        Loading...
      </Button>
      <Button variant="outline" disabled>
        <Spinner size="sm" color="primary" />
        Saving...
      </Button>
      <Button variant="ghost" disabled>
        <Spinner size="sm" color="secondary" />
        Processing...
      </Button>
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        border: '1px dashed #e5e7eb',
        borderRadius: '8px',
      }}
    >
      <Spinner size="xl" />
      <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading content...</p>
    </div>
  ),
};

export const InlineWithText: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Spinner size="sm" />
      <span>Fetching data...</span>
    </div>
  ),
};
