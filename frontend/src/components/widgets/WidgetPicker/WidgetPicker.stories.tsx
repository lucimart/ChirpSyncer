import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { Button } from '@/components/ui';
import { WidgetPicker } from './WidgetPicker';

const meta: Meta<typeof WidgetPicker> = {
  title: 'Widgets/WidgetPicker',
  component: WidgetPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    isOpen: true,
  },
  argTypes: {
    onClose: { action: 'closed' },
    onSelect: { action: 'selected' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof WidgetPicker>;

export const Default: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-picker')).toBeInTheDocument();
    await expect(canvas.getByText('Add Widget')).toBeInTheDocument();
  },
};

export const AllOptions: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('widget-option-stats')).toBeInTheDocument();
    await expect(canvas.getByTestId('widget-option-chart')).toBeInTheDocument();
    await expect(canvas.getByTestId('widget-option-list')).toBeInTheDocument();
  },
};

export const WithSearch: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByTestId('widget-search');
    await userEvent.type(searchInput, 'chart');
    await expect(canvas.getByTestId('widget-option-chart')).toBeInTheDocument();
    await expect(canvas.queryByTestId('widget-option-stats')).not.toBeInTheDocument();
  },
};

export const NoResults: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const searchInput = canvas.getByTestId('widget-search');
    await userEvent.type(searchInput, 'nonexistent');
    await expect(canvas.getByText('No widgets match your search')).toBeInTheDocument();
  },
};

export const SelectingWidget: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const statsOption = canvas.getByTestId('widget-option-stats');
    await userEvent.click(statsOption);
  },
};

const InteractiveTemplate = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <Button onClick={() => setIsOpen(true)}>Open Widget Picker</Button>
      {selected && (
        <div style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: '8px' }}>
          Last selected: <strong>{selected}</strong>
        </div>
      )}
      <WidgetPicker
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(type) => {
          setSelected(type);
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveTemplate />,
  parameters: {
    docs: {
      description: {
        story: 'Click the button to open the picker and select a widget type.',
      },
    },
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'When isOpen is false, the picker is not rendered.',
      },
    },
  },
};
