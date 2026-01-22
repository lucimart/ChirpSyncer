'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { WhyAmISeeingThis } from './WhyAmISeeingThis';
import type { FeedExplanation } from './WhyAmISeeingThis';

const meta: Meta<typeof WhyAmISeeingThis> = {
  title: 'Components/FeedLab/WhyAmISeeingThis',
  component: WhyAmISeeingThis,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WhyAmISeeingThis>;

const mockExplanation: FeedExplanation = {
  postId: 'post-123',
  baseScore: 50,
  totalScore: 120,
  appliedRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'Boost Quality Content',
      type: 'boost',
      contribution: 45,
      percentage: 37.5,
      matchedConditions: [
        { field: 'engagement', operator: 'greater_than', value: '100' },
        { field: 'author', operator: 'contains', value: 'verified' },
      ],
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Verified Author Bonus',
      type: 'boost',
      contribution: 25,
      percentage: 20.8,
      matchedConditions: [
        { field: 'author', operator: 'equals', value: 'verified' },
      ],
    },
  ],
  feedPosition: 3,
};

const mixedExplanation: FeedExplanation = {
  postId: 'post-456',
  baseScore: 50,
  totalScore: 85,
  appliedRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'High Engagement',
      type: 'boost',
      contribution: 50,
      percentage: 58.8,
      matchedConditions: [
        { field: 'engagement', operator: 'greater_than', value: '500' },
      ],
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Contains External Links',
      type: 'demote',
      contribution: -15,
      percentage: 17.6,
      matchedConditions: [
        { field: 'content', operator: 'contains', value: 'http' },
      ],
    },
  ],
};

const noRulesExplanation: FeedExplanation = {
  postId: 'post-789',
  baseScore: 50,
  totalScore: 50,
  appliedRules: [],
};

export const Default: Story = {
  args: {
    postId: 'post-123',
  },
};

export const WithExplanation: Story = {
  args: {
    postId: 'post-123',
    explanation: mockExplanation,
  },
};

export const Loading: Story = {
  args: {
    postId: 'post-123',
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    postId: 'post-123',
    error: 'Failed to load explanation. Please try again.',
  },
};

export const NoRulesApplied: Story = {
  args: {
    postId: 'post-789',
    explanation: noRulesExplanation,
  },
};

export const MixedRules: Story = {
  args: {
    postId: 'post-456',
    explanation: mixedExplanation,
  },
};

export const WithFeedPosition: Story = {
  args: {
    postId: 'post-123',
    explanation: {
      ...mockExplanation,
      feedPosition: 1,
    },
  },
};

export const ManyRules: Story = {
  args: {
    postId: 'post-many',
    explanation: {
      postId: 'post-many',
      baseScore: 50,
      totalScore: 145,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Quality Content',
          type: 'boost',
          contribution: 40,
          percentage: 27.6,
          matchedConditions: [{ field: 'engagement', operator: 'gt', value: '200' }],
        },
        {
          ruleId: 'rule-2',
          ruleName: 'Verified Author',
          type: 'boost',
          contribution: 30,
          percentage: 20.7,
          matchedConditions: [{ field: 'author', operator: 'equals', value: 'verified' }],
        },
        {
          ruleId: 'rule-3',
          ruleName: 'Trending Topic',
          type: 'boost',
          contribution: 25,
          percentage: 17.2,
          matchedConditions: [{ field: 'content', operator: 'contains', value: '#trending' }],
        },
        {
          ruleId: 'rule-4',
          ruleName: 'External Links',
          type: 'demote',
          contribution: -10,
          percentage: 6.9,
          matchedConditions: [{ field: 'content', operator: 'contains', value: 'http' }],
        },
        {
          ruleId: 'rule-5',
          ruleName: 'Peak Hours',
          type: 'boost',
          contribution: 10,
          percentage: 6.9,
          matchedConditions: [{ field: 'timestamp', operator: 'equals', value: 'peak' }],
        },
      ],
      feedPosition: 5,
    },
  },
};

export const LowScore: Story = {
  args: {
    postId: 'post-low',
    explanation: {
      postId: 'post-low',
      baseScore: 50,
      totalScore: 15,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Spam Filter',
          type: 'demote',
          contribution: -25,
          percentage: 166.7,
          matchedConditions: [{ field: 'content', operator: 'contains', value: 'buy now' }],
        },
        {
          ruleId: 'rule-2',
          ruleName: 'New Account',
          type: 'demote',
          contribution: -10,
          percentage: 66.7,
          matchedConditions: [{ field: 'author', operator: 'lt', value: '30days' }],
        },
      ],
      feedPosition: 50,
    },
  },
};
