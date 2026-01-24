import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConditionEditor } from './ConditionEditor';

const meta: Meta<typeof ConditionEditor> = {
  title: 'Components/FeedLab/ConditionEditor',
  component: ConditionEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConditionEditor>;

// Interactive wrapper to demonstrate state changes
const InteractiveConditionEditor = ({
  initialCondition,
}: {
  initialCondition: { field: string; operator: string; value: string | number | boolean };
}) => {
  const [condition, setCondition] = useState(initialCondition);

  return (
    <div>
      <ConditionEditor
        condition={condition}
        onChange={setCondition}
        onRemove={() => alert('Remove clicked')}
      />
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <strong>Current State:</strong>
        <pre>{JSON.stringify(condition, null, 2)}</pre>
      </div>
    </div>
  );
};

export const Default: Story = {
  args: {
    condition: {
      field: 'content',
      operator: 'contains',
      value: '',
    },
    onChange: () => { },
    onRemove: () => { },
  },
};

export const TextCondition: Story = {
  args: {
    condition: {
      field: 'content',
      operator: 'contains',
      value: 'breaking news',
    },
    onChange: () => { },
    onRemove: () => { },
  },
};

export const AuthorCondition: Story = {
  args: {
    condition: {
      field: 'author',
      operator: 'equals',
      value: '@elonmusk',
    },
    onChange: () => { },
    onRemove: () => { },
  },
};

export const NumericCondition: Story = {
  args: {
    condition: {
      field: 'score',
      operator: 'greater_than',
      value: 50,
    },
    onChange: () => { },
    onRemove: () => { },
  },
};

export const TimestampCondition: Story = {
  args: {
    condition: {
      field: 'timestamp',
      operator: 'equals',
      value: '2024-01-15',
    },
    onChange: () => { },
    onRemove: () => { },
  },
};

export const Interactive: Story = {
  render: () => (
    <InteractiveConditionEditor
      initialCondition={{
        field: 'content',
        operator: 'contains',
        value: '',
      }}
    />
  ),
};

export const InteractiveNumeric: Story = {
  render: () => (
    <InteractiveConditionEditor
      initialCondition={{
        field: 'score',
        operator: 'greater_than',
        value: 100,
      }}
    />
  ),
};
