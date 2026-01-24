import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';
import { useState } from 'react';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    label: { control: 'text' },
    onChange: { action: 'changed' },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {
    'aria-label': 'Toggle setting',
    size: 'md',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Push Notifications',
    'aria-label': 'Push Notifications',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    label: 'Small Switch',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    label: 'Large Switch',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    'aria-label': 'Toggle setting',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Disabled Switch',
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
    label: 'Disabled Checked',
  },
};

// Interactive example using hook
const SwitchWithState = () => {
  const [checked, setChecked] = useState(false);
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <Switch 
        checked={checked} 
        onChange={(e) => setChecked(e.target.checked)} 
        label={checked ? 'On' : 'Off'}
      />
    </div>
  );
};

export const Interactive: Story = {
  render: () => <SwitchWithState />,
};
