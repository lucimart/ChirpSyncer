import type { Meta, StoryObj } from '@storybook/react';
import { FeedPreview } from './FeedPreview';

const meta: Meta<typeof FeedPreview> = {
  title: 'Components/FeedLab/FeedPreview',
  component: FeedPreview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FeedPreview>;

const mockPosts = [
  {
    id: '1',
    content: 'Just launched our new product! Check it out at example.com #launch #startup',
    author: '@techfounder',
    timestamp: '2 hours ago',
    score: 45,
    appliedRules: [
      { ruleId: 'r1', ruleName: 'Boost Launches', contribution: 30 },
      { ruleId: 'r2', ruleName: 'Startup Content', contribution: 15 },
    ],
  },
  {
    id: '2',
    content: 'Another boring Monday... #mondayblues',
    author: '@randomuser',
    timestamp: '1 hour ago',
    score: -10,
    appliedRules: [
      { ruleId: 'r3', ruleName: 'Demote Complaints', contribution: -10 },
    ],
  },
  {
    id: '3',
    content: 'Great thread on React performance optimization techniques',
    author: '@devexpert',
    timestamp: '30 minutes ago',
    score: 25,
    appliedRules: [
      { ruleId: 'r4', ruleName: 'Boost Tech Content', contribution: 25 },
    ],
  },
  {
    id: '4',
    content: 'Just having coffee and enjoying the weather',
    author: '@casual_poster',
    timestamp: '15 minutes ago',
    score: 0,
    appliedRules: [],
  },
];

export const Default: Story = {
  args: {
    posts: mockPosts,
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};

export const Empty: Story = {
  args: {
    posts: [],
    onPostClick: () => {},
  },
};

export const SinglePost: Story = {
  args: {
    posts: [mockPosts[0]],
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};

export const AllBoosted: Story = {
  args: {
    posts: [
      {
        id: '1',
        content: 'High quality content that matches multiple boost rules',
        author: '@quality_poster',
        timestamp: '1 hour ago',
        score: 75,
        appliedRules: [
          { ruleId: 'r1', ruleName: 'Quality Content', contribution: 40 },
          { ruleId: 'r2', ruleName: 'Verified Author', contribution: 35 },
        ],
      },
      {
        id: '2',
        content: 'Another great post with valuable insights',
        author: '@expert',
        timestamp: '2 hours ago',
        score: 50,
        appliedRules: [
          { ruleId: 'r3', ruleName: 'Expert Content', contribution: 50 },
        ],
      },
    ],
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};

export const AllDemoted: Story = {
  args: {
    posts: [
      {
        id: '1',
        content: 'Spam content trying to sell something',
        author: '@spammer',
        timestamp: '5 minutes ago',
        score: -50,
        appliedRules: [
          { ruleId: 'r1', ruleName: 'Spam Filter', contribution: -30 },
          { ruleId: 'r2', ruleName: 'New Account', contribution: -20 },
        ],
      },
      {
        id: '2',
        content: 'Low effort post',
        author: '@loweffort',
        timestamp: '10 minutes ago',
        score: -15,
        appliedRules: [
          { ruleId: 'r3', ruleName: 'Low Engagement', contribution: -15 },
        ],
      },
    ],
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};

export const NoRulesApplied: Story = {
  args: {
    posts: [
      {
        id: '1',
        content: 'A neutral post that matches no rules',
        author: '@neutral_user',
        timestamp: '1 hour ago',
        score: 0,
        appliedRules: [],
      },
      {
        id: '2',
        content: 'Another post without any rule matches',
        author: '@another_user',
        timestamp: '2 hours ago',
        score: 0,
        appliedRules: [],
      },
    ],
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};

export const ManyRules: Story = {
  args: {
    posts: [
      {
        id: '1',
        content: 'This post matches many different rules for demonstration',
        author: '@multi_match',
        timestamp: '30 minutes ago',
        score: 35,
        appliedRules: [
          { ruleId: 'r1', ruleName: 'Tech Content', contribution: 20 },
          { ruleId: 'r2', ruleName: 'Verified', contribution: 15 },
          { ruleId: 'r3', ruleName: 'High Engagement', contribution: 10 },
          { ruleId: 'r4', ruleName: 'Short Post', contribution: -5 },
          { ruleId: 'r5', ruleName: 'No Media', contribution: -5 },
        ],
      },
    ],
    onPostClick: (post) => console.log('Clicked post:', post.id),
  },
};
