import type { Meta, StoryObj } from '@storybook/react';
import { TrendingUp, TrendingDown, Users, MessageSquare, Repeat, Clock } from 'lucide-react';
import { StatsGrid } from './StatsGrid';

const meta: Meta<typeof StatsGrid> = {
  title: 'UI/StatsGrid',
  component: StatsGrid,
  parameters: {
    layout: 'padded',
  },
  args: {
    columns: 'auto',
    minColumnWidth: '180px',
    gap: 'md',
    marginBottom: true,
  },
  argTypes: {
    columns: {
      control: { type: 'select' },
      options: ['auto', 2, 3, 4, 5, 6],
    },
    gap: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof StatsGrid>;

const StatCard = ({
  label,
  value,
  change,
  icon: Icon,
  color = '#3b82f6',
}: {
  label: string;
  value: string;
  change?: string;
  icon?: typeof TrendingUp;
  color?: string;
}) => (
  <div
    style={{
      padding: '20px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#6b7280' }}>{label}</p>
        <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
          {value}
        </p>
        {change && (
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: change.startsWith('+') ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {change.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </p>
        )}
      </div>
      {Icon && (
        <div
          style={{
            padding: '10px',
            background: `${color}15`,
            borderRadius: '8px',
          }}
        >
          <Icon size={20} color={color} />
        </div>
      )}
    </div>
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <StatCard label="Total Posts" value="1,234" change="+12.5%" icon={MessageSquare} />
        <StatCard label="Synced" value="987" change="+8.2%" icon={Repeat} color="#10b981" />
        <StatCard label="Pending" value="247" icon={Clock} color="#f59e0b" />
        <StatCard label="Followers" value="5.2K" change="+3.1%" icon={Users} color="#8b5cf6" />
      </>
    ),
  },
};

export const ThreeColumns: Story = {
  args: {
    columns: 3,
    children: (
      <>
        <StatCard label="Total Posts" value="1,234" icon={MessageSquare} />
        <StatCard label="Synced" value="987" icon={Repeat} color="#10b981" />
        <StatCard label="Pending" value="247" icon={Clock} color="#f59e0b" />
      </>
    ),
  },
};

export const FourColumns: Story = {
  args: {
    columns: 4,
    children: (
      <>
        <StatCard label="Total Posts" value="1,234" />
        <StatCard label="Synced" value="987" />
        <StatCard label="Pending" value="247" />
        <StatCard label="Failed" value="0" />
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    gap: 'sm',
    children: (
      <>
        <StatCard label="Posts" value="1,234" />
        <StatCard label="Synced" value="987" />
        <StatCard label="Pending" value="247" />
        <StatCard label="Failed" value="0" />
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    gap: 'lg',
    children: (
      <>
        <StatCard label="Posts" value="1,234" />
        <StatCard label="Synced" value="987" />
        <StatCard label="Pending" value="247" />
        <StatCard label="Failed" value="0" />
      </>
    ),
  },
};

export const NoMarginBottom: Story = {
  args: {
    marginBottom: false,
    children: (
      <>
        <StatCard label="Posts" value="1,234" />
        <StatCard label="Synced" value="987" />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <p style={{ margin: 0, padding: '16px', background: '#f3f4f6' }}>
          Content immediately after the grid (no margin)
        </p>
      </div>
    ),
  ],
};

export const WiderMinWidth: Story = {
  args: {
    minColumnWidth: '280px',
    children: (
      <>
        <StatCard label="Total Posts" value="1,234" change="+12.5%" icon={MessageSquare} />
        <StatCard label="Synced" value="987" change="+8.2%" icon={Repeat} color="#10b981" />
        <StatCard label="Pending" value="247" icon={Clock} color="#f59e0b" />
      </>
    ),
  },
};

export const DashboardExample: Story = {
  render: () => (
    <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '8px' }}>
      <h2 style={{ margin: '0 0 16px 0' }}>Overview</h2>
      <StatsGrid>
        <StatCard label="Total Posts" value="12,847" change="+12.5%" icon={MessageSquare} />
        <StatCard label="Synced Posts" value="11,234" change="+8.2%" icon={Repeat} color="#10b981" />
        <StatCard label="Pending Sync" value="1,613" icon={Clock} color="#f59e0b" />
        <StatCard label="Total Followers" value="45.2K" change="+5.1%" icon={Users} color="#8b5cf6" />
      </StatsGrid>
      <h3 style={{ margin: '0 0 16px 0' }}>Platform Breakdown</h3>
      <StatsGrid columns={2} marginBottom={false}>
        <StatCard label="Twitter Posts" value="6,423" change="+15.3%" />
        <StatCard label="Bluesky Posts" value="6,424" change="+9.8%" />
      </StatsGrid>
    </div>
  ),
};
