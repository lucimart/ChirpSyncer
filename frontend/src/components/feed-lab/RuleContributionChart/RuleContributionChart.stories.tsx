import type { Meta, StoryObj } from '@storybook/react';
import { RuleContributionChart } from './RuleContributionChart';

const meta: Meta<typeof RuleContributionChart> = {
  title: 'Components/FeedLab/RuleContributionChart',
  component: RuleContributionChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RuleContributionChart>;

export const Empty: Story = {
  args: {
    contributions: [],
    baseScore: 50,
  },
};

export const SingleBoost: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Boost Quality Content',
        ruleType: 'boost',
        contribution: 30,
      },
    ],
    baseScore: 50,
    totalScore: 80,
  },
};

export const SingleDemote: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Demote Spam',
        ruleType: 'demote',
        contribution: -25,
      },
    ],
    baseScore: 50,
    totalScore: 25,
  },
};

export const MultipleBoosts: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Verified Author',
        ruleType: 'boost',
        contribution: 40,
      },
      {
        ruleId: 'rule-2',
        ruleName: 'High Engagement',
        ruleType: 'boost',
        contribution: 25,
      },
      {
        ruleId: 'rule-3',
        ruleName: 'Trending Topic',
        ruleType: 'boost',
        contribution: 15,
      },
    ],
    baseScore: 50,
    totalScore: 130,
  },
};

export const MultipleDemotes: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Spam Content',
        ruleType: 'demote',
        contribution: -30,
      },
      {
        ruleId: 'rule-2',
        ruleName: 'New Account',
        ruleType: 'demote',
        contribution: -15,
      },
    ],
    baseScore: 50,
    totalScore: 5,
  },
};

export const MixedContributions: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Quality Content',
        ruleType: 'boost',
        contribution: 50,
      },
      {
        ruleId: 'rule-2',
        ruleName: 'External Links',
        ruleType: 'demote',
        contribution: -20,
      },
      {
        ruleId: 'rule-3',
        ruleName: 'Verified Badge',
        ruleType: 'boost',
        contribution: 25,
      },
      {
        ruleId: 'rule-4',
        ruleName: 'Short Post',
        ruleType: 'demote',
        contribution: -10,
      },
    ],
    baseScore: 50,
    totalScore: 95,
  },
};

export const LargeContributions: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Viral Content',
        ruleType: 'boost',
        contribution: 100,
      },
      {
        ruleId: 'rule-2',
        ruleName: 'Featured Author',
        ruleType: 'boost',
        contribution: 75,
      },
    ],
    baseScore: 50,
    totalScore: 225,
  },
};

export const WithInteraction: Story = {
  args: {
    contributions: [
      {
        ruleId: 'rule-1',
        ruleName: 'Tech Content',
        ruleType: 'boost',
        contribution: 35,
      },
      {
        ruleId: 'rule-2',
        ruleName: 'Promotional',
        ruleType: 'demote',
        contribution: -15,
      },
    ],
    baseScore: 50,
    totalScore: 70,
    onRuleHover: (ruleId) => console.log('Hovered:', ruleId),
    onRuleClick: (ruleId) => console.log('Clicked:', ruleId),
  },
};

export const WithExplanationFormat: Story = {
  args: {
    explanation: {
      postId: 'post-123',
      baseScore: 50,
      totalScore: 120,
      appliedRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Quality Boost',
          type: 'boost',
          contribution: 45,
          percentage: 37.5,
          matchedConditions: [
            { field: 'engagement', operator: 'greater_than', value: '100' },
          ],
        },
        {
          ruleId: 'rule-2',
          ruleName: 'Verified Author',
          type: 'boost',
          contribution: 25,
          percentage: 20.8,
          matchedConditions: [
            { field: 'author', operator: 'equals', value: 'verified' },
          ],
        },
      ],
    },
  } as any,
};
