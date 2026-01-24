import type { Meta, StoryObj } from '@storybook/react';
import { RuleList, Rule } from './RuleList';

const meta: Meta<typeof RuleList> = {
  title: 'Components/FeedLab/RuleList',
  component: RuleList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RuleList>;

const mockRules: Rule[] = [
  {
    id: 'rule-1',
    name: 'Boost High Engagement',
    type: 'boost',
    weight: 15,
    conditions: [
      { field: 'engagement', operator: 'gt', value: 100 },
    ],
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Demote Old Posts',
    type: 'demote',
    weight: -10,
    conditions: [
      { field: 'age', operator: 'gt', value: 7 },
    ],
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Filter Spam',
    type: 'filter',
    weight: 0,
    conditions: [
      { field: 'content', operator: 'contains', value: 'giveaway' },
      { field: 'content', operator: 'contains', value: 'free' },
    ],
    enabled: false,
  },
];

export const Default: Story = {
  args: {
    rules: mockRules,
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const SingleRule: Story = {
  args: {
    rules: [mockRules[0]],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
  },
};

export const Empty: Story = {
  args: {
    rules: [],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
  },
};

export const AllDisabled: Story = {
  args: {
    rules: mockRules.map(r => ({ ...r, enabled: false })),
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const BoostRulesOnly: Story = {
  args: {
    rules: [
      {
        id: 'boost-1',
        name: 'Boost Verified Accounts',
        type: 'boost',
        weight: 20,
        conditions: [{ field: 'author', operator: 'equals', value: 'verified' }],
        enabled: true,
      },
      {
        id: 'boost-2',
        name: 'Boost High Engagement',
        type: 'boost',
        weight: 15,
        conditions: [{ field: 'engagement', operator: 'gt', value: 100 }],
        enabled: true,
      },
    ],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const DemoteRulesOnly: Story = {
  args: {
    rules: [
      {
        id: 'demote-1',
        name: 'Demote Old Posts',
        type: 'demote',
        weight: -10,
        conditions: [{ field: 'age', operator: 'gt', value: 7 }],
        enabled: true,
      },
      {
        id: 'demote-2',
        name: 'Demote Low Quality',
        type: 'demote',
        weight: -15,
        conditions: [{ field: 'engagement', operator: 'lt', value: 5 }],
        enabled: true,
      },
    ],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const FilterRulesOnly: Story = {
  args: {
    rules: [
      {
        id: 'filter-1',
        name: 'Filter Spam',
        type: 'filter',
        weight: 0,
        conditions: [
          { field: 'content', operator: 'contains', value: 'giveaway' },
        ],
        enabled: true,
      },
      {
        id: 'filter-2',
        name: 'Filter Retweets',
        type: 'filter',
        weight: 0,
        conditions: [
          { field: 'content', operator: 'regex', value: '^RT @' },
        ],
        enabled: true,
      },
    ],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const ManyRules: Story = {
  args: {
    rules: [
      ...mockRules,
      {
        id: 'rule-4',
        name: 'Boost Media Posts',
        type: 'boost',
        weight: 10,
        conditions: [{ field: 'content', operator: 'contains', value: 'media' }],
        enabled: true,
      },
      {
        id: 'rule-5',
        name: 'Filter Promotional',
        type: 'filter',
        weight: 0,
        conditions: [
          { field: 'content', operator: 'contains', value: '#ad' },
          { field: 'content', operator: 'contains', value: '#sponsored' },
        ],
        enabled: true,
      },
    ],
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    onReorder: (rules) => console.log('Reorder:', rules),
  },
};

export const NoDragDrop: Story = {
  args: {
    rules: mockRules,
    onToggle: (id, enabled) => console.log('Toggle:', id, enabled),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
    // No onReorder - disables drag and drop
  },
};
