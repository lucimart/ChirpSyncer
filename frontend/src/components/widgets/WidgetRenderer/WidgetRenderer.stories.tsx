import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { WidgetRenderer } from './WidgetRenderer';
import type { WidgetConfig } from '../types';

const meta: Meta<typeof WidgetRenderer> = {
  title: 'Widgets/WidgetRenderer',
  component: WidgetRenderer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onItemClick: { action: 'item clicked' },
    onViewAll: { action: 'view all clicked' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WidgetRenderer>;

const baseConfig = {
  position: { x: 0, y: 0 },
  size: { width: 1, height: 1 },
};

export const StatsRenderer: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'stats-render',
      type: 'stats',
      title: 'Performance Metrics',
      data: {
        items: [
          { label: 'Total Posts', value: 1250, change: 48 },
          { label: 'Followers', value: '10.5K', change: 125 },
          { label: 'Engagement', value: '4.2%', change: -0.3 },
        ],
      },
    } as WidgetConfig,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('stats-widget')).toBeInTheDocument();
  },
};

export const ChartRenderer: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'chart-render',
      type: 'chart',
      title: 'Weekly Activity',
      data: {
        data: [
          { label: 'Mon', value: 120 },
          { label: 'Tue', value: 180 },
          { label: 'Wed', value: 90 },
          { label: 'Thu', value: 250 },
          { label: 'Fri', value: 200 },
        ],
        type: 'bar',
      },
    } as WidgetConfig,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('chart-widget')).toBeInTheDocument();
  },
};

export const LineChartRenderer: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'line-chart-render',
      type: 'chart',
      title: 'Monthly Trends',
      data: {
        data: [
          { label: 'Jan', value: 4500 },
          { label: 'Feb', value: 3800 },
          { label: 'Mar', value: 5200 },
          { label: 'Apr', value: 4900 },
          { label: 'May', value: 6100 },
        ],
        type: 'line',
        showLegend: true,
      },
    } as WidgetConfig,
  },
};

export const ListRenderer: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'list-render',
      type: 'list',
      title: 'Recent Activity',
      data: {
        items: [
          { id: '1', title: 'Post synced', subtitle: 'Twitter to Bluesky' },
          { id: '2', title: 'New follower', subtitle: '@johndoe', status: 'success' },
          { id: '3', title: 'Sync pending', subtitle: '3 posts queued', status: 'warning' },
        ],
      },
    } as WidgetConfig,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('list-widget')).toBeInTheDocument();
  },
};

export const ListWithMaxItems: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'list-max',
      type: 'list',
      title: 'Activity Feed',
      data: {
        items: [
          { id: '1', title: 'First item', subtitle: 'Description 1' },
          { id: '2', title: 'Second item', subtitle: 'Description 2' },
          { id: '3', title: 'Third item', subtitle: 'Description 3' },
          { id: '4', title: 'Fourth item', subtitle: 'Description 4' },
          { id: '5', title: 'Fifth item', subtitle: 'Description 5' },
        ],
        maxItems: 3,
      },
    } as WidgetConfig,
    onViewAll: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  },
};

export const InteractiveList: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'interactive-list',
      type: 'list',
      title: 'Click an Item',
      data: {
        items: [
          { id: '1', title: 'Clickable Item 1' },
          { id: '2', title: 'Clickable Item 2' },
        ],
      },
    } as WidgetConfig,
    onItemClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = canvas.getByTestId('list-item-1');
    await userEvent.click(item);
  },
};

export const StatsEmpty: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'stats-empty',
      type: 'stats',
      title: 'Empty Stats',
    } as WidgetConfig,
  },
};

export const ChartEmpty: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'chart-empty',
      type: 'chart',
      title: 'Empty Chart',
    } as WidgetConfig,
  },
};

export const ListEmpty: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'list-empty',
      type: 'list',
      title: 'Empty List',
    } as WidgetConfig,
  },
};

export const CustomWidget: Story = {
  args: {
    config: {
      ...baseConfig,
      id: 'custom',
      type: 'custom',
      title: 'Custom Widget',
    } as WidgetConfig,
  },
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <WidgetRenderer
        config={{
          ...baseConfig,
          id: 'all-stats',
          type: 'stats',
          title: 'Stats',
          data: {
            items: [
              { label: 'Metric 1', value: 100 },
              { label: 'Metric 2', value: 200 },
            ],
          },
        }}
      />
      <WidgetRenderer
        config={{
          ...baseConfig,
          id: 'all-chart',
          type: 'chart',
          title: 'Chart',
          data: {
            data: [
              { label: 'A', value: 50 },
              { label: 'B', value: 100 },
            ],
            type: 'bar',
          },
        }}
      />
      <WidgetRenderer
        config={{
          ...baseConfig,
          id: 'all-list',
          type: 'list',
          title: 'List',
          data: {
            items: [
              { id: '1', title: 'Item 1' },
              { id: '2', title: 'Item 2' },
            ],
          },
        }}
        onItemClick={() => {}}
      />
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: '350px' }}>
        <Story />
      </div>
    ),
  ],
};
