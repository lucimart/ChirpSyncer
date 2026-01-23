import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { SelectableCard } from './SelectableCard';

const meta: Meta<typeof SelectableCard> = {
  title: 'UI/SelectableCard',
  component: SelectableCard,
  parameters: {
    layout: 'centered',
  },
  args: {
    selected: false,
    padding: 'md',
  },
  argTypes: {
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
    onClick: { action: 'clicked' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SelectableCard>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 style={{ margin: '0 0 8px 0' }}>Card Title</h3>
        <p style={{ margin: 0, color: '#666' }}>Card description goes here</p>
      </div>
    ),
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    children: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Check size={20} color="#3b82f6" />
        <span>This card is selected</span>
      </div>
    ),
  },
};

export const Interactive: Story = {
  render: function InteractiveCard() {
    const [selected, setSelected] = useState(false);
    return (
      <SelectableCard selected={selected} onClick={() => setSelected(!selected)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selected && <Check size={20} color="#3b82f6" />}
          <span>Click to toggle selection</span>
        </div>
      </SelectableCard>
    );
  },
};

export const PaddingSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SelectableCard padding="sm">
        <span>Small padding (sm)</span>
      </SelectableCard>
      <SelectableCard padding="md">
        <span>Medium padding (md)</span>
      </SelectableCard>
      <SelectableCard padding="lg">
        <span>Large padding (lg)</span>
      </SelectableCard>
      <SelectableCard padding="none">
        <div style={{ padding: '16px', background: '#f3f4f6' }}>No padding (custom inner)</div>
      </SelectableCard>
    </div>
  ),
};

export const CardGroup: Story = {
  render: function CardGroupExample() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const plans = [
      { id: 'free', name: 'Free', price: '$0/mo', features: '100 posts' },
      { id: 'pro', name: 'Pro', price: '$9/mo', features: '1,000 posts' },
      { id: 'enterprise', name: 'Enterprise', price: '$29/mo', features: 'Unlimited posts' },
    ];

    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        {plans.map((plan) => (
          <SelectableCard
            key={plan.id}
            selected={selectedId === plan.id}
            onClick={() => setSelectedId(plan.id)}
            style={{ width: '180px' }}
          >
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 4px 0' }}>{plan.name}</h4>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.25rem' }}>
                {plan.price}
              </p>
              <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>{plan.features}</p>
            </div>
          </SelectableCard>
        ))}
      </div>
    );
  },
};
