import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RuleBuilder } from './RuleBuilder';

const meta: Meta<typeof RuleBuilder> = {
  title: 'Components/FeedLab/RuleBuilder',
  component: RuleBuilder,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RuleBuilder>;

export const CreateNew: Story = {
  args: {
    onSubmit: (rule) => console.log('Submitted:', rule),
    onCancel: () => console.log('Cancelled'),
  },
};

export const EditExisting: Story = {
  args: {
    onSubmit: (rule) => console.log('Updated:', rule),
    onCancel: () => console.log('Cancelled'),
    initialRule: {
      id: 'existing-rule',
      name: 'Boost Tech Content',
      type: 'boost',
      weight: 50,
      conditions: [
        { field: 'content', operator: 'contains', value: 'javascript' },
        { field: 'author', operator: 'equals', value: '@techguru' },
      ],
      enabled: true,
    },
  },
};

export const DemoteRule: Story = {
  args: {
    onSubmit: (rule) => console.log('Submitted:', rule),
    onCancel: () => console.log('Cancelled'),
    initialRule: {
      id: 'demote-rule',
      name: 'Demote Spam',
      type: 'demote',
      weight: -30,
      conditions: [
        { field: 'content', operator: 'contains', value: 'buy now' },
      ],
      enabled: true,
    },
  },
};

export const FilterRule: Story = {
  args: {
    onSubmit: (rule) => console.log('Submitted:', rule),
    onCancel: () => console.log('Cancelled'),
    initialRule: {
      id: 'filter-rule',
      name: 'Filter Blocked Users',
      type: 'filter',
      weight: 0,
      conditions: [
        { field: 'author', operator: 'equals', value: '@blocked_user' },
      ],
      enabled: true,
    },
  },
};

export const ManyConditions: Story = {
  args: {
    onSubmit: (rule) => console.log('Submitted:', rule),
    onCancel: () => console.log('Cancelled'),
    initialRule: {
      id: 'complex-rule',
      name: 'Complex Rule',
      type: 'boost',
      weight: 75,
      conditions: [
        { field: 'content', operator: 'contains', value: 'breaking' },
        { field: 'author', operator: 'not_contains', value: 'bot' },
        { field: 'score', operator: 'greater_than', value: 100 },
        { field: 'timestamp', operator: 'equals', value: 'today' },
      ],
      enabled: true,
    },
  },
};

// Interactive story showing full workflow
const InteractiveRuleBuilder = () => {
  const [submittedRule, setSubmittedRule] = useState<any>(null);

  return (
    <div>
      <RuleBuilder
        onSubmit={(rule) => {
          setSubmittedRule(rule);
          alert('Rule created successfully!');
        }}
        onCancel={() => alert('Cancelled')}
      />
      {submittedRule && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
          <strong>Submitted Rule:</strong>
          <pre>{JSON.stringify(submittedRule, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveRuleBuilder />,
};
