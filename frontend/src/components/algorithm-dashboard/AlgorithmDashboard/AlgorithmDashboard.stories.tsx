import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AlgorithmDashboard, type AlgorithmStats } from './AlgorithmDashboard';

const meta: Meta<typeof AlgorithmDashboard> = {
  title: 'Algorithm/AlgorithmDashboard',
  component: AlgorithmDashboard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Main dashboard for algorithm transparency, showing feed composition, active rules, and transparency metrics.',
      },
    },
  },
  argTypes: {
    stats: {
      description: 'Algorithm statistics data',
    },
    isLoading: {
      control: 'boolean',
      description: 'Loading state',
    },
    error: {
      description: 'Error object if fetch failed',
    },
    algorithmEnabled: {
      control: 'boolean',
      description: 'Whether algorithmic sorting is enabled',
    },
    onToggleAlgorithm: {
      action: 'toggled',
      description: 'Callback when algorithm toggle changes',
    },
    onEditRules: {
      action: 'editRules',
      description: 'Callback when edit rules button is clicked',
    },
    onViewRule: {
      action: 'viewRule',
      description: 'Callback when a rule is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof AlgorithmDashboard>;

const mockStats: AlgorithmStats = {
  transparencyScore: 85,
  totalRules: 10,
  activeRules: 7,
  feedComposition: {
    boosted: 30,
    demoted: 15,
    filtered: 5,
    unaffected: 50,
  },
  topRules: [
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
  ],
  lastUpdated: '2025-01-14T10:30:00Z',
};

export const Default: Story = {
  args: {
    stats: mockStats,
    algorithmEnabled: true,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const ErrorState: Story = {
  args: {
    error: new globalThis.Error('Failed to load algorithm statistics. Please try again later.'),
  },
};

export const AlgorithmDisabled: Story = {
  args: {
    stats: mockStats,
    algorithmEnabled: false,
  },
};

export const LowTransparency: Story = {
  args: {
    stats: {
      ...mockStats,
      transparencyScore: 35,
    },
    algorithmEnabled: true,
  },
};

export const HighTransparency: Story = {
  args: {
    stats: {
      ...mockStats,
      transparencyScore: 95,
    },
    algorithmEnabled: true,
  },
};

export const FewRules: Story = {
  args: {
    stats: {
      ...mockStats,
      totalRules: 2,
      activeRules: 1,
      topRules: [
        {
          id: 'rule-1',
          name: 'Boost Followed Users',
          type: 'boost',
          postsAffected: 50,
          averageImpact: 20,
        },
      ],
    },
    algorithmEnabled: true,
  },
};

export const ManyFilteredPosts: Story = {
  args: {
    stats: {
      ...mockStats,
      feedComposition: {
        boosted: 10,
        demoted: 5,
        filtered: 60,
        unaffected: 25,
      },
    },
    algorithmEnabled: true,
  },
};

export const MostlyUnaffected: Story = {
  args: {
    stats: {
      ...mockStats,
      feedComposition: {
        boosted: 5,
        demoted: 5,
        filtered: 5,
        unaffected: 85,
      },
      transparencyScore: 95,
    },
    algorithmEnabled: true,
  },
};

function InteractiveDemo() {
  const [enabled, setEnabled] = useState(true);

  return (
    <AlgorithmDashboard
      stats={mockStats}
      algorithmEnabled={enabled}
      onToggleAlgorithm={setEnabled}
      onEditRules={() => console.log('Edit rules clicked')}
      onViewRule={(ruleId) => console.log('View rule:', ruleId)}
    />
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive example with working toggle.',
      },
    },
  },
};

export const NoStats: Story = {
  args: {
    algorithmEnabled: true,
  },
};
