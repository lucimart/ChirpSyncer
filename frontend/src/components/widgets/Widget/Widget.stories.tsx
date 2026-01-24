import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { Widget, type WidgetConfig } from './Widget';

const meta: Meta<typeof Widget> = {
  title: 'Widgets/Widget',
  component: Widget,
  parameters: {
    layout: 'centered',
  },
  args: {
    isEditable: false,
    isLoading: false,
  },
  argTypes: {
    onRemove: { action: 'remove' },
    onSettings: { action: 'settings' },
    onRetry: { action: 'retry' },
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

type Story = StoryObj<typeof Widget>;

const defaultConfig: WidgetConfig = {
  id: 'demo-widget',
  type: 'stats',
  title: 'Demo Widget',
  position: { x: 0, y: 0 },
  size: { width: 1, height: 1 },
};

export const Default: Story = {
  args: {
    config: defaultConfig,
    children: (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        Widget content goes here
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-demo-widget')).toBeInTheDocument();
    await expect(canvas.getByText('Demo Widget')).toBeInTheDocument();
  },
};

export const Editable: Story = {
  args: {
    config: defaultConfig,
    isEditable: true,
    children: (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        Drag me around!
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('drag-handle')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    config: defaultConfig,
    isLoading: true,
    children: <div>This content is hidden</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-loading')).toBeInTheDocument();
  },
};

export const WithError: Story = {
  args: {
    config: defaultConfig,
    error: 'Failed to load widget data. Please try again.',
    children: <div>This content is hidden</div>,
  },
};

export const WithErrorAndRetry: Story = {
  args: {
    config: defaultConfig,
    error: 'Connection timeout',
    onRetry: () => {},
    children: <div>This content is hidden</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  },
};

export const Interactive: Story = {
  args: {
    config: {
      ...defaultConfig,
      title: 'Interactive Widget',
    },
    children: (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        Click the settings or remove buttons
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const settingsButton = canvas.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);
  },
};

export const ChartWidget: Story = {
  args: {
    config: {
      ...defaultConfig,
      id: 'chart-widget',
      type: 'chart',
      title: 'Weekly Activity',
    },
    children: (
      <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '16px' }}>
        {[60, 80, 45, 90, 70, 85, 55].map((height, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${height}%`,
              background: 'var(--color-primary-500)',
              borderRadius: '4px 4px 0 0',
            }}
          />
        ))}
      </div>
    ),
  },
};

export const StatsWidget: Story = {
  args: {
    config: {
      ...defaultConfig,
      id: 'stats-widget',
      type: 'stats',
      title: 'Key Metrics',
    },
    children: (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Total Posts</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>1,250</div>
        </div>
        <div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Engagement</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>4.2%</div>
        </div>
      </div>
    ),
  },
};

export const ListWidget: Story = {
  args: {
    config: {
      ...defaultConfig,
      id: 'list-widget',
      type: 'list',
      title: 'Recent Activity',
    },
    children: (
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {['Post synced to Bluesky', 'New follower: @user', 'Scheduled post published'].map((item, i) => (
          <div
            key={i}
            style={{
              padding: '12px',
              background: 'var(--color-background-secondary)',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    ),
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Widget
        config={{ ...defaultConfig, id: 'normal', title: 'Normal' }}
        onRemove={() => {}}
        onSettings={() => {}}
        isEditable={false}
      >
        <div style={{ padding: '16px' }}>Normal content</div>
      </Widget>
      <Widget
        config={{ ...defaultConfig, id: 'editable', title: 'Editable' }}
        onRemove={() => {}}
        onSettings={() => {}}
        isEditable={true}
      >
        <div style={{ padding: '16px' }}>Editable with drag handle</div>
      </Widget>
      <Widget
        config={{ ...defaultConfig, id: 'loading', title: 'Loading' }}
        onRemove={() => {}}
        onSettings={() => {}}
        isEditable={false}
        isLoading={true}
      >
        <div>Hidden</div>
      </Widget>
      <Widget
        config={{ ...defaultConfig, id: 'error', title: 'Error' }}
        onRemove={() => {}}
        onSettings={() => {}}
        isEditable={false}
        error="Something went wrong"
        onRetry={() => {}}
      >
        <div>Hidden</div>
      </Widget>
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
