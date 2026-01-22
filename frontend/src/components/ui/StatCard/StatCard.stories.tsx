import type { Meta, StoryObj } from '@storybook/react';
import { RefreshCw, Calendar, CheckCircle, Key, Users, TrendingUp } from 'lucide-react';
import styled from 'styled-components';
import { StatCard } from './StatCard';

const meta: Meta<typeof StatCard> = {
  title: 'UI/StatCard',
  component: StatCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`;

export const Default: Story = {
  args: {
    value: 1234,
    label: 'Total Users',
    icon: Users,
    color: '#6366F1',
  },
};

export const WithTrendUp: Story = {
  args: {
    value: 8750,
    label: 'Revenue',
    icon: TrendingUp,
    color: '#22c55e',
    trend: { value: 12, direction: 'up' },
  },
};

export const WithTrendDown: Story = {
  args: {
    value: 342,
    label: 'Bounce Rate',
    icon: TrendingUp,
    color: '#ef4444',
    trend: { value: 5, direction: 'down' },
  },
};

export const Centered: Story = {
  args: {
    value: 99,
    label: 'Success Rate',
    variant: 'centered',
  },
};

export const StringValue: Story = {
  args: {
    value: 'Never',
    label: 'Last Sync',
    variant: 'centered',
  },
};

export const DashboardGrid: Story = {
  render: () => (
    <Grid>
      <StatCard
        value={156}
        label="Synced Today"
        icon={RefreshCw}
        color="#22c55e"
      />
      <StatCard
        value={892}
        label="Synced This Week"
        icon={Calendar}
        color="#f59e0b"
      />
      <StatCard
        value={12450}
        label="Total Synced"
        icon={CheckCircle}
        color="#3b82f6"
        trend={{ value: 8, direction: 'up' }}
      />
      <StatCard
        value={4}
        label="Platforms Connected"
        icon={Key}
        color="#8b5cf6"
      />
    </Grid>
  ),
};

export const CenteredGrid: Story = {
  render: () => (
    <Grid>
      <StatCard value={1250} label="Total Synced" variant="centered" />
      <StatCard value={0} label="Pending" variant="centered" />
      <StatCard value="Jan 20" label="Last Sync" variant="centered" />
    </Grid>
  ),
};
