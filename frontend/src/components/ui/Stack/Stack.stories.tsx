import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'UI/Stack',
  component: Stack,
  parameters: {
    layout: 'centered',
  },
  args: {
    direction: 'column',
    gap: 4,
    align: 'stretch',
    justify: 'start',
    wrap: false,
  },
  argTypes: {
    direction: {
      control: { type: 'radio' },
      options: ['column', 'row'],
    },
    gap: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 5, 6, 8],
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'stretch'],
    },
    justify: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'between', 'around'],
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Stack>;

const Box = ({ children, color = '#3b82f6' }: { children: React.ReactNode; color?: string }) => (
  <div
    style={{
      padding: '16px 24px',
      background: color,
      color: 'white',
      borderRadius: '6px',
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const Row: Story = {
  args: {
    direction: 'row',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
};

export const GapSizes: Story = {
  render: () => (
    <Stack direction="row" gap={8}>
      <Stack gap={1}>
        <span style={{ fontSize: '12px', color: '#666' }}>gap=1</span>
        <Box color="#6366f1">A</Box>
        <Box color="#6366f1">B</Box>
        <Box color="#6366f1">C</Box>
      </Stack>
      <Stack gap={2}>
        <span style={{ fontSize: '12px', color: '#666' }}>gap=2</span>
        <Box color="#8b5cf6">A</Box>
        <Box color="#8b5cf6">B</Box>
        <Box color="#8b5cf6">C</Box>
      </Stack>
      <Stack gap={4}>
        <span style={{ fontSize: '12px', color: '#666' }}>gap=4</span>
        <Box color="#a855f7">A</Box>
        <Box color="#a855f7">B</Box>
        <Box color="#a855f7">C</Box>
      </Stack>
      <Stack gap={6}>
        <span style={{ fontSize: '12px', color: '#666' }}>gap=6</span>
        <Box color="#d946ef">A</Box>
        <Box color="#d946ef">B</Box>
        <Box color="#d946ef">C</Box>
      </Stack>
    </Stack>
  ),
};

export const Alignment: Story = {
  render: () => (
    <Stack gap={6}>
      <Stack direction="row" align="start" gap={2} style={{ height: '100px', background: '#f3f4f6', padding: '8px' }}>
        <Box>Start</Box>
        <Box color="#10b981">Align</Box>
      </Stack>
      <Stack direction="row" align="center" gap={2} style={{ height: '100px', background: '#f3f4f6', padding: '8px' }}>
        <Box>Center</Box>
        <Box color="#10b981">Align</Box>
      </Stack>
      <Stack direction="row" align="end" gap={2} style={{ height: '100px', background: '#f3f4f6', padding: '8px' }}>
        <Box>End</Box>
        <Box color="#10b981">Align</Box>
      </Stack>
    </Stack>
  ),
};

export const Justify: Story = {
  render: () => (
    <Stack gap={4} style={{ width: '400px' }}>
      <Stack direction="row" justify="start" gap={2} style={{ background: '#f3f4f6', padding: '8px' }}>
        <Box color="#f59e0b">Start</Box>
        <Box color="#f59e0b">Items</Box>
      </Stack>
      <Stack direction="row" justify="center" gap={2} style={{ background: '#f3f4f6', padding: '8px' }}>
        <Box color="#f59e0b">Center</Box>
        <Box color="#f59e0b">Items</Box>
      </Stack>
      <Stack direction="row" justify="end" gap={2} style={{ background: '#f3f4f6', padding: '8px' }}>
        <Box color="#f59e0b">End</Box>
        <Box color="#f59e0b">Items</Box>
      </Stack>
      <Stack direction="row" justify="between" gap={2} style={{ background: '#f3f4f6', padding: '8px' }}>
        <Box color="#f59e0b">Space</Box>
        <Box color="#f59e0b">Between</Box>
      </Stack>
      <Stack direction="row" justify="around" gap={2} style={{ background: '#f3f4f6', padding: '8px' }}>
        <Box color="#f59e0b">Space</Box>
        <Box color="#f59e0b">Around</Box>
      </Stack>
    </Stack>
  ),
};

export const Wrap: Story = {
  args: {
    direction: 'row',
    wrap: true,
    gap: 2,
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Stack {...args}>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
        <Box>Item 4</Box>
        <Box>Item 5</Box>
        <Box>Item 6</Box>
      </Stack>
    </div>
  ),
};

export const FormLayout: Story = {
  render: () => (
    <Stack gap={4} style={{ width: '300px' }}>
      <Stack gap={1}>
        <label style={{ fontSize: '14px', fontWeight: 500 }}>Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
        />
      </Stack>
      <Stack gap={1}>
        <label style={{ fontSize: '14px', fontWeight: 500 }}>Password</label>
        <input
          type="password"
          placeholder="Enter password"
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
        />
      </Stack>
      <Stack direction="row" justify="between" align="center">
        <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" /> Remember me
        </label>
        <a href="#" style={{ fontSize: '14px', color: '#3b82f6' }}>
          Forgot password?
        </a>
      </Stack>
      <button
        style={{
          padding: '10px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Sign In
      </button>
    </Stack>
  ),
};
