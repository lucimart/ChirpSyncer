import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useState } from 'react';
import { Grid, List, Calendar, Clock, BarChart2, PieChart } from 'lucide-react';
import { ToggleGroup, ToggleGroupProps } from './index';

const meta: Meta<typeof ToggleGroup> = {
  title: 'UI/ToggleGroup',
  component: ToggleGroup,
  parameters: {
    layout: 'centered',
  },
  args: {
    size: 'md',
    variant: 'default',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'pill'],
    },
    options: { control: false },
    value: { control: false },
    onChange: { control: false },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ToggleGroup>;

const timeOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const viewOptions = [
  { value: 'list', label: 'List', icon: <List size={16} /> },
  { value: 'grid', label: 'Grid', icon: <Grid size={16} /> },
];

const chartOptions = [
  { value: 'bar', label: 'Bar', icon: <BarChart2 size={16} /> },
  { value: 'pie', label: 'Pie', icon: <PieChart size={16} /> },
];

// Wrapper component for interactive stories
function InteractiveToggleGroup<T extends string>(
  props: Omit<ToggleGroupProps<T>, 'value' | 'onChange'> & { initialValue: T }
) {
  const [value, setValue] = useState<T>(props.initialValue);
  return <ToggleGroup {...props} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: () => <InteractiveToggleGroup options={timeOptions} initialValue="day" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /day/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /week/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /month/i })).toBeInTheDocument();
  },
};

export const WithIcons: Story = {
  render: () => <InteractiveToggleGroup options={viewOptions} initialValue="list" />,
};

export const PillVariant: Story = {
  render: () => <InteractiveToggleGroup options={timeOptions} initialValue="week" variant="pill" />,
};

export const PillWithIcons: Story = {
  render: () => (
    <InteractiveToggleGroup options={chartOptions} initialValue="bar" variant="pill" />
  ),
};

export const SmallSize: Story = {
  render: () => <InteractiveToggleGroup options={timeOptions} initialValue="day" size="sm" />,
};

export const SmallPill: Story = {
  render: () => (
    <InteractiveToggleGroup options={viewOptions} initialValue="grid" size="sm" variant="pill" />
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>Default variant</p>
        <InteractiveToggleGroup options={timeOptions} initialValue="day" />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>Pill variant</p>
        <InteractiveToggleGroup options={timeOptions} initialValue="week" variant="pill" />
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>Small (sm)</p>
        <InteractiveToggleGroup options={viewOptions} initialValue="list" size="sm" />
      </div>
      <div>
        <p style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>Medium (md) - Default</p>
        <InteractiveToggleGroup options={viewOptions} initialValue="list" size="md" />
      </div>
    </div>
  ),
};

export const InteractiveDemo: Story = {
  render: () => <InteractiveToggleGroup options={timeOptions} initialValue="day" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const weekButton = canvas.getByRole('button', { name: /week/i });

    await userEvent.click(weekButton);
    await expect(weekButton).toBeInTheDocument();
  },
};

export const TimePeriodSelector: Story = {
  render: () => {
    const options = [
      { value: '1h', label: '1H' },
      { value: '24h', label: '24H' },
      { value: '7d', label: '7D' },
      { value: '30d', label: '30D' },
      { value: 'all', label: 'All' },
    ];
    return <InteractiveToggleGroup options={options} initialValue="24h" size="sm" variant="pill" />;
  },
};

export const ViewModeSwitcher: Story = {
  render: () => {
    const options = [
      { value: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
      { value: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
    ];
    return <InteractiveToggleGroup options={options} initialValue="calendar" />;
  },
};

export const StatusFilter: Story = {
  render: () => {
    const options = [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'completed', label: 'Completed' },
      { value: 'archived', label: 'Archived' },
    ];
    return <InteractiveToggleGroup options={options} initialValue="all" variant="pill" />;
  },
};
