import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { StatsWidget, type StatItem } from './StatsWidget';

const meta: Meta<typeof StatsWidget> = {
  title: 'Widgets/StatsWidget',
  component: StatsWidget,
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Statistics',
    compact: false,
    layout: 'list',
  },
  argTypes: {
    layout: {
      control: { type: 'select' },
      options: ['grid', 'list'],
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof StatsWidget>;

const dashboardStats: StatItem[] = [
  { label: 'Total Posts', value: 1250, change: 48 },
  { label: 'Followers', value: '10.5K', change: 125 },
  { label: 'Engagement Rate', value: '4.2%', change: -0.3 },
  { label: 'Impressions', value: '50K' },
];

export const Default: Story = {
  args: {
    stats: dashboardStats,
    title: 'Dashboard Overview',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('stats-widget')).toBeInTheDocument();
    await expect(canvas.getByText('Total Posts')).toBeInTheDocument();
  },
};

export const GridLayout: Story = {
  args: {
    stats: dashboardStats,
    title: 'Performance Metrics',
    layout: 'grid',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('stats-widget')).toHaveAttribute('data-layout', 'grid');
  },
};

export const Compact: Story = {
  args: {
    stats: dashboardStats,
    title: 'Quick Stats',
    compact: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('stats-widget')).toHaveAttribute('data-compact', 'true');
  },
};

export const CompactGrid: Story = {
  args: {
    stats: dashboardStats,
    title: 'Compact Grid View',
    compact: true,
    layout: 'grid',
  },
};

export const WithPositiveChanges: Story = {
  args: {
    stats: [
      { label: 'Revenue', value: '$12,500', change: 2500 },
      { label: 'Users', value: '8,420', change: 320 },
      { label: 'Orders', value: '156', change: 12 },
    ],
    title: 'Growth Metrics',
  },
};

export const WithNegativeChanges: Story = {
  args: {
    stats: [
      { label: 'Bounce Rate', value: '45%', change: -5 },
      { label: 'Churn', value: '2.1%', change: -0.3 },
      { label: 'Errors', value: '12', change: -8 },
    ],
    title: 'Improvements',
  },
};

export const MixedChanges: Story = {
  args: {
    stats: [
      { label: 'Active Users', value: '2,340', change: 145 },
      { label: 'Session Duration', value: '4m 32s', change: -15 },
      { label: 'Page Views', value: '15.2K' },
      { label: 'Conversion', value: '3.8%', change: 0.5 },
    ],
    title: 'Analytics',
  },
};

export const SingleStat: Story = {
  args: {
    stats: [{ label: 'Total Revenue', value: '$125,000', change: 15000 }],
    title: 'Revenue',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '200px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AllLayouts: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <StatsWidget stats={dashboardStats} title="List Layout" layout="list" />
      <StatsWidget stats={dashboardStats} title="Grid Layout" layout="grid" />
      <StatsWidget stats={dashboardStats} title="Compact List" layout="list" compact />
      <StatsWidget stats={dashboardStats} title="Compact Grid" layout="grid" compact />
    </div>
  ),
};
