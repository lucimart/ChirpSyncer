import type { Meta, StoryObj } from '@storybook/react';
import { ScoreExplainer } from './ScoreExplainer';

const meta: Meta<typeof ScoreExplainer> = {
  title: 'Components/FeedLab/ScoreExplainer',
  component: ScoreExplainer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ScoreExplainer>;

const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  content: 'This is a sample post with some interesting content about tech.',
  author: '@techuser',
  timestamp: '2 hours ago',
  score: 150,
  appliedRules: [],
  ...overrides,
});

export const NoRulesApplied: Story = {
  args: {
    post: createMockPost({ score: 100 }),
  },
};

export const SingleBoostRule: Story = {
  args: {
    post: createMockPost({
      score: 130,
      appliedRules: [
        {
          ruleId: 'boost-1',
          ruleName: 'Boost Tech Content',
          contribution: 30,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'tech' },
          ],
        },
      ],
    }),
  },
};

export const SingleDemoteRule: Story = {
  args: {
    post: createMockPost({
      score: 70,
      appliedRules: [
        {
          ruleId: 'demote-1',
          ruleName: 'Demote Spam',
          contribution: -30,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'buy now' },
          ],
        },
      ],
    }),
  },
};

export const MultipleRules: Story = {
  args: {
    post: createMockPost({
      score: 145,
      appliedRules: [
        {
          ruleId: 'boost-1',
          ruleName: 'Boost Verified Authors',
          contribution: 50,
          matchedConditions: [
            { field: 'author', operator: 'equals', value: 'verified' },
          ],
        },
        {
          ruleId: 'boost-2',
          ruleName: 'Boost High Engagement',
          contribution: 25,
          matchedConditions: [
            { field: 'engagement', operator: 'greater_than', value: '100' },
          ],
        },
        {
          ruleId: 'demote-1',
          ruleName: 'Demote Short Posts',
          contribution: -30,
          matchedConditions: [
            { field: 'content', operator: 'less_than', value: '50' },
          ],
        },
      ],
    }),
  },
};

export const MixedContributions: Story = {
  args: {
    post: createMockPost({
      score: 125,
      appliedRules: [
        {
          ruleId: 'boost-1',
          ruleName: 'Quality Content',
          contribution: 40,
          matchedConditions: [
            { field: 'engagement', operator: 'greater_than', value: '200' },
            { field: 'author', operator: 'contains', value: 'verified' },
          ],
        },
        {
          ruleId: 'demote-1',
          ruleName: 'Contains Links',
          contribution: -15,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'http' },
          ],
        },
      ],
    }),
  },
};

export const HighScore: Story = {
  args: {
    post: createMockPost({
      score: 250,
      appliedRules: [
        {
          ruleId: 'boost-1',
          ruleName: 'Viral Content',
          contribution: 100,
          matchedConditions: [
            { field: 'engagement', operator: 'greater_than', value: '1000' },
          ],
        },
        {
          ruleId: 'boost-2',
          ruleName: 'Featured Author',
          contribution: 50,
          matchedConditions: [
            { field: 'author', operator: 'equals', value: 'featured' },
          ],
        },
      ],
    }),
  },
};

export const LowScore: Story = {
  args: {
    post: createMockPost({
      score: 30,
      appliedRules: [
        {
          ruleId: 'demote-1',
          ruleName: 'Spam Filter',
          contribution: -50,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'promotion' },
          ],
        },
        {
          ruleId: 'demote-2',
          ruleName: 'New Account',
          contribution: -20,
          matchedConditions: [
            { field: 'author', operator: 'less_than', value: '30days' },
          ],
        },
      ],
    }),
  },
};

export const NoMatchedConditions: Story = {
  args: {
    post: createMockPost({
      score: 120,
      appliedRules: [
        {
          ruleId: 'boost-1',
          ruleName: 'General Boost',
          contribution: 20,
        },
      ],
    }),
  },
};
