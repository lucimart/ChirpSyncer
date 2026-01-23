import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RuleImpactSummary, type RuleImpact } from './RuleImpactSummary';

const meta: Meta<typeof RuleImpactSummary> = {
  title: 'Algorithm/RuleImpactSummary',
  component: RuleImpactSummary,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Summary list showing the top 5 most impactful rules with sorting options, type badges, and click interactions.',
      },
    },
  },
  argTypes: {
    rules: {
      description: 'Array of rule impact data',
    },
    totalPosts: {
      control: 'number',
      description: 'Total posts for calculating percentage bars',
    },
    sortBy: {
      control: 'radio',
      options: ['impact', 'postsAffected'],
      description: 'Sort field (controlled)',
    },
    sortOrder: {
      control: 'radio',
      options: ['asc', 'desc'],
      description: 'Sort direction (controlled)',
    },
    onSortChange: {
      action: 'sortChanged',
      description: 'Callback when sort changes',
    },
    onViewDetails: {
      action: 'viewDetails',
      description: 'Callback when rule details are requested',
    },
    onRuleClick: {
      action: 'ruleClicked',
      description: 'Callback when a rule is clicked',
    },
    onViewAllClick: {
      action: 'viewAllClicked',
      description: 'Callback when view all link is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RuleImpactSummary>;

const mockRules: RuleImpact[] = [
  {
    id: 'rule-1',
    name: 'Boost Followed Users',
    type: 'boost',
    postsAffected: 120,
    averageImpact: 25,
  },
  {
    id: 'rule-2',
    name: 'Demote Spam Content',
    type: 'demote',
    postsAffected: 45,
    averageImpact: -15,
  },
  {
    id: 'rule-3',
    name: 'Filter Blocked Users',
    type: 'filter',
    postsAffected: 10,
  },
  {
    id: 'rule-4',
    name: 'Boost Mutuals',
    type: 'boost',
    postsAffected: 85,
    averageImpact: 18,
  },
  {
    id: 'rule-5',
    name: 'Demote Low Engagement',
    type: 'demote',
    postsAffected: 32,
    averageImpact: -8,
  },
];

export const Default: Story = {
  args: {
    rules: mockRules,
  },
};

export const Empty: Story = {
  args: {
    rules: [],
  },
};

export const WithProgressBars: Story = {
  args: {
    rules: mockRules,
    totalPosts: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows percentage progress bars when totalPosts is provided.',
      },
    },
  },
};

export const SingleRule: Story = {
  args: {
    rules: [mockRules[0]],
  },
};

export const OnlyBoostRules: Story = {
  args: {
    rules: [
      {
        id: 'boost-1',
        name: 'Boost Followed Users',
        type: 'boost',
        postsAffected: 150,
        averageImpact: 30,
      },
      {
        id: 'boost-2',
        name: 'Boost Mutuals',
        type: 'boost',
        postsAffected: 80,
        averageImpact: 20,
      },
      {
        id: 'boost-3',
        name: 'Boost Verified',
        type: 'boost',
        postsAffected: 45,
        averageImpact: 15,
      },
    ],
  },
};

export const OnlyDemoteRules: Story = {
  args: {
    rules: [
      {
        id: 'demote-1',
        name: 'Demote Spam',
        type: 'demote',
        postsAffected: 200,
        averageImpact: -25,
      },
      {
        id: 'demote-2',
        name: 'Demote Low Quality',
        type: 'demote',
        postsAffected: 150,
        averageImpact: -18,
      },
      {
        id: 'demote-3',
        name: 'Demote Ads',
        type: 'demote',
        postsAffected: 80,
        averageImpact: -12,
      },
    ],
  },
};

export const OnlyFilterRules: Story = {
  args: {
    rules: [
      {
        id: 'filter-1',
        name: 'Filter Blocked Users',
        type: 'filter',
        postsAffected: 50,
      },
      {
        id: 'filter-2',
        name: 'Filter Muted Words',
        type: 'filter',
        postsAffected: 30,
      },
      {
        id: 'filter-3',
        name: 'Filter NSFW',
        type: 'filter',
        postsAffected: 15,
      },
    ],
  },
};

export const MixedHighImpact: Story = {
  args: {
    rules: [
      {
        id: 'rule-1',
        name: 'Aggressive Boost',
        type: 'boost',
        postsAffected: 500,
        averageImpact: 50,
      },
      {
        id: 'rule-2',
        name: 'Heavy Demotion',
        type: 'demote',
        postsAffected: 400,
        averageImpact: -45,
      },
      {
        id: 'rule-3',
        name: 'Strict Filter',
        type: 'filter',
        postsAffected: 300,
      },
    ],
    totalPosts: 1000,
  },
  parameters: {
    docs: {
      description: {
        story: 'Rules with very high impact values and post counts.',
      },
    },
  },
};

export const SortedByPostsAffected: Story = {
  args: {
    rules: mockRules,
    sortBy: 'postsAffected',
    sortOrder: 'desc',
  },
};

export const SortedAscending: Story = {
  args: {
    rules: mockRules,
    sortBy: 'impact',
    sortOrder: 'asc',
  },
};

function InteractiveDemo() {
  const [sortBy, setSortBy] = useState<'impact' | 'postsAffected'>('impact');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <RuleImpactSummary
        rules={mockRules}
        totalPosts={500}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        onRuleClick={(ruleId) => setSelectedRule(ruleId)}
        onViewAllClick={() => console.log('View all clicked')}
      />
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px',
        }}
      >
        <p>
          <strong>Sort by:</strong> {sortBy} ({sortOrder})
        </p>
        <p>
          <strong>Selected rule:</strong> {selectedRule ?? 'none'}
        </p>
      </div>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Fully interactive example with controlled sorting and click handling.',
      },
    },
  },
};

export const ManyRules: Story = {
  args: {
    rules: [
      ...mockRules,
      {
        id: 'rule-6',
        name: 'Extra Rule 1',
        type: 'boost',
        postsAffected: 20,
        averageImpact: 5,
      },
      {
        id: 'rule-7',
        name: 'Extra Rule 2',
        type: 'demote',
        postsAffected: 15,
        averageImpact: -3,
      },
      {
        id: 'rule-8',
        name: 'Extra Rule 3',
        type: 'filter',
        postsAffected: 8,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows that only top 5 rules are displayed even with more rules.',
      },
    },
  },
};
