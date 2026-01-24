import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { WidgetGrid } from './WidgetGrid';
import type { WidgetConfig } from '../types';

const meta: Meta<typeof WidgetGrid> = {
  title: 'Widgets/WidgetGrid',
  component: WidgetGrid,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isLoading: false,
    compact: false,
  },
  argTypes: {
    onLayoutChange: { action: 'layout changed' },
    onRemoveWidget: { action: 'widget removed' },
    onWidgetSettings: { action: 'widget settings' },
    onWidgetItemClick: { action: 'item clicked' },
    onWidgetViewAll: { action: 'view all clicked' },
    onRetry: { action: 'retry' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof WidgetGrid>;

const sampleWidgets: WidgetConfig[] = [
  {
    id: 'stats-1',
    type: 'stats',
    title: 'Performance Metrics',
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    data: {
      items: [
        { label: 'Total Posts', value: 1250, change: 48 },
        { label: 'Followers', value: '10.5K', change: 125 },
        { label: 'Engagement', value: '4.2%', change: -0.3 },
      ],
    },
  },
  {
    id: 'chart-1',
    type: 'chart',
    title: 'Weekly Activity',
    position: { x: 1, y: 0 },
    size: { width: 1, height: 1 },
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
  },
  {
    id: 'list-1',
    type: 'list',
    title: 'Recent Activity',
    position: { x: 2, y: 0 },
    size: { width: 1, height: 1 },
    data: {
      items: [
        { id: '1', title: 'Post synced', subtitle: 'Twitter to Bluesky' },
        { id: '2', title: 'New follower', subtitle: '@johndoe', status: 'success' },
        { id: '3', title: 'Sync pending', subtitle: '3 posts queued', status: 'warning' },
      ],
      maxItems: 5,
    },
  },
];

export const Default: Story = {
  args: {
    widgets: sampleWidgets,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-grid')).toBeInTheDocument();
    await expect(canvas.getByTestId('widget-stats-1')).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  args: {
    widgets: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-grid-empty')).toBeInTheDocument();
    await expect(canvas.getByText('No widgets yet')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    widgets: sampleWidgets,
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByTestId('widget-loading')).toHaveLength(3);
  },
};

export const WithErrors: Story = {
  args: {
    widgets: sampleWidgets,
    widgetErrors: {
      'chart-1': 'Failed to load chart data',
      'list-1': 'Connection timeout',
    },
  },
};

export const CompactMode: Story = {
  args: {
    widgets: sampleWidgets,
    compact: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-grid')).toHaveAttribute('data-compact', 'true');
  },
};

export const EditMode: Story = {
  args: {
    widgets: sampleWidgets,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editButton = canvas.getByRole('button', { name: /edit/i });
    await userEvent.click(editButton);
    await expect(canvas.getByRole('button', { name: /done/i })).toBeInTheDocument();
  },
};

export const AddingWidget: Story = {
  args: {
    widgets: sampleWidgets,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addButton = canvas.getByTestId('add-widget-button');
    await userEvent.click(addButton);
    await expect(canvas.getByTestId('widget-picker')).toBeInTheDocument();
  },
};

const InteractiveTemplate = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(sampleWidgets);

  return (
    <WidgetGrid
      widgets={widgets}
      onLayoutChange={setWidgets}
      onRemoveWidget={(id) => {
        setWidgets((prev) => prev.filter((w) => w.id !== id));
      }}
      onWidgetSettings={(id) => {
        console.log('Settings for:', id);
      }}
      onWidgetItemClick={(widgetId, item) => {
        console.log('Clicked item:', item, 'in widget:', widgetId);
      }}
      onWidgetViewAll={(widgetId) => {
        console.log('View all for:', widgetId);
      }}
    />
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTemplate />,
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive grid. Try adding, removing, and editing widgets.',
      },
    },
  },
};

export const SingleWidget: Story = {
  args: {
    widgets: [sampleWidgets[0]],
  },
};

export const ManyWidgets: Story = {
  args: {
    widgets: [
      ...sampleWidgets,
      {
        id: 'stats-2',
        type: 'stats',
        title: 'Revenue',
        position: { x: 0, y: 1 },
        size: { width: 1, height: 1 },
        data: {
          items: [
            { label: 'Monthly', value: '$12,500', change: 1500 },
            { label: 'Annual', value: '$150K' },
          ],
        },
      },
      {
        id: 'chart-2',
        type: 'chart',
        title: 'Monthly Trends',
        position: { x: 1, y: 1 },
        size: { width: 1, height: 1 },
        data: {
          data: [
            { label: 'Jan', value: 4500 },
            { label: 'Feb', value: 3800 },
            { label: 'Mar', value: 5200 },
            { label: 'Apr', value: 4900 },
          ],
          type: 'line',
        },
      },
    ],
  },
};
