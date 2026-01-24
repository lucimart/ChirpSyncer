import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { ChartWidget, type ChartDataPoint } from './ChartWidget';

const meta: Meta<typeof ChartWidget> = {
  title: 'Widgets/ChartWidget',
  component: ChartWidget,
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'Chart Widget',
    chartType: 'bar',
    showLegend: false,
  },
  argTypes: {
    chartType: {
      control: { type: 'select' },
      options: ['bar', 'line', 'area'],
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

type Story = StoryObj<typeof ChartWidget>;

const weeklyData: ChartDataPoint[] = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 180 },
  { label: 'Wed', value: 90 },
  { label: 'Thu', value: 250 },
  { label: 'Fri', value: 200 },
  { label: 'Sat', value: 150 },
  { label: 'Sun', value: 80 },
];

const monthlyData: ChartDataPoint[] = [
  { label: 'Jan', value: 4500 },
  { label: 'Feb', value: 3800 },
  { label: 'Mar', value: 5200 },
  { label: 'Apr', value: 4900 },
  { label: 'May', value: 6100 },
];

export const BarChart: Story = {
  args: {
    data: weeklyData,
    title: 'Weekly Activity',
    chartType: 'bar',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('chart-widget')).toBeInTheDocument();
    await expect(canvas.getByTestId('chart-container')).toBeInTheDocument();
  },
};

export const LineChart: Story = {
  args: {
    data: weeklyData,
    title: 'Weekly Trends',
    chartType: 'line',
  },
};

export const AreaChart: Story = {
  args: {
    data: monthlyData,
    title: 'Monthly Performance',
    chartType: 'area',
  },
};

export const WithLegend: Story = {
  args: {
    data: weeklyData,
    title: 'Weekly Activity',
    chartType: 'bar',
    showLegend: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('chart-legend')).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    title: 'No Data Available',
    chartType: 'bar',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('chart-empty')).toBeInTheDocument();
  },
};

export const SmallDataset: Story = {
  args: {
    data: [
      { label: 'A', value: 50 },
      { label: 'B', value: 100 },
    ],
    title: 'Simple Comparison',
    chartType: 'bar',
  },
};

export const AllChartTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ChartWidget data={weeklyData} title="Bar Chart" chartType="bar" />
      <ChartWidget data={weeklyData} title="Line Chart" chartType="line" />
      <ChartWidget data={weeklyData} title="Area Chart" chartType="area" />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};
