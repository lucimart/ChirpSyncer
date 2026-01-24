import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { ListWidget, type ListItem } from './ListWidget';

const meta: Meta<typeof ListWidget> = {
  title: 'Widgets/ListWidget',
  component: ListWidget,
  parameters: {
    layout: 'centered',
  },
  args: {
    title: 'List Widget',
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

type Story = StoryObj<typeof ListWidget>;

const sampleItems: ListItem[] = [
  { id: '1', title: 'Sync completed', subtitle: 'Twitter to Bluesky - 5 posts' },
  { id: '2', title: 'New follower', subtitle: '@johndoe started following you', status: 'success' },
  { id: '3', title: 'Pending review', subtitle: '3 posts awaiting moderation', status: 'warning' },
  { id: '4', title: 'Sync failed', subtitle: 'Rate limit exceeded', status: 'error' },
  { id: '5', title: 'Scheduled post', subtitle: 'Will be published at 3:00 PM', status: 'info' },
];

export const Default: Story = {
  args: {
    items: sampleItems,
    title: 'Recent Activity',
    onItemClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('list-widget')).toBeInTheDocument();
    await expect(canvas.getByText('Sync completed')).toBeInTheDocument();
  },
};

export const WithMaxItems: Story = {
  args: {
    items: sampleItems,
    title: 'Activity Feed',
    onItemClick: () => {},
    maxItems: 3,
    onViewAll: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  },
};

export const Interactive: Story = {
  args: {
    items: sampleItems.slice(0, 3),
    title: 'Click an Item',
    onItemClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstItem = canvas.getByTestId('list-item-1');
    await userEvent.click(firstItem);
  },
};

export const EmptyState: Story = {
  args: {
    items: [],
    title: 'Empty List',
    onItemClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('list-empty')).toBeInTheDocument();
  },
};

export const WithStatusIndicators: Story = {
  args: {
    items: [
      { id: '1', title: 'Success Item', subtitle: 'Operation completed', status: 'success' },
      { id: '2', title: 'Warning Item', subtitle: 'Needs attention', status: 'warning' },
      { id: '3', title: 'Error Item', subtitle: 'Action required', status: 'error' },
      { id: '4', title: 'Info Item', subtitle: 'For your information', status: 'info' },
    ],
    title: 'Status Types',
    onItemClick: () => {},
  },
};

export const LongContent: Story = {
  args: {
    items: [
      {
        id: '1',
        title: 'This is a very long title that might wrap to multiple lines',
        subtitle: 'And this is an equally long subtitle that provides more context about the item',
      },
      {
        id: '2',
        title: 'Another item',
        subtitle: 'Short description',
      },
    ],
    title: 'Long Content',
    onItemClick: () => {},
  },
};

export const NoSubtitles: Story = {
  args: {
    items: [
      { id: '1', title: 'First task' },
      { id: '2', title: 'Second task' },
      { id: '3', title: 'Third task' },
    ],
    title: 'Tasks',
    onItemClick: () => {},
  },
};
