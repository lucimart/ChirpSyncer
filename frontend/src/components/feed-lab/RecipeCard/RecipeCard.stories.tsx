import type { Meta, StoryObj } from '@storybook/react';
import { RecipeCard, Recipe } from './RecipeCard';

const meta: Meta<typeof RecipeCard> = {
  title: 'Components/FeedLab/RecipeCard',
  component: RecipeCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RecipeCard>;

const boostRecipe: Recipe = {
  id: 'boost-engagement',
  name: 'Boost High Engagement',
  description: 'Prioritize posts with high engagement metrics (likes, retweets, replies).',
  category: 'engagement',
  type: 'boost',
  conditions: [
    { field: 'engagement', operator: 'gt', value: 100 },
  ],
  weight: 15,
  popularity: 245,
  tags: ['popular', 'viral'],
};

const demoteRecipe: Recipe = {
  id: 'demote-old',
  name: 'Demote Old Posts',
  description: 'Lower the priority of posts older than a week to keep your feed fresh.',
  category: 'productivity',
  type: 'demote',
  conditions: [
    { field: 'age', operator: 'gt', value: 7 },
  ],
  weight: -10,
  popularity: 89,
  tags: ['fresh', 'time-based'],
};

const filterRecipe: Recipe = {
  id: 'filter-spam',
  name: 'Filter Spam Keywords',
  description: 'Remove posts containing common spam keywords and phrases.',
  category: 'filtering',
  type: 'filter',
  conditions: [
    { field: 'content', operator: 'contains', value: 'giveaway' },
    { field: 'content', operator: 'contains', value: 'free bitcoin' },
  ],
  weight: 0,
  popularity: 312,
  tags: ['spam', 'cleanup'],
};

const discoveryRecipe: Recipe = {
  id: 'discovery-new',
  name: 'Discover New Voices',
  description: 'Boost posts from accounts you do not follow to discover new content.',
  category: 'discovery',
  type: 'boost',
  conditions: [
    { field: 'author', operator: 'equals', value: 'not_following' },
  ],
  weight: 8,
  tags: ['explore', 'new accounts'],
};

export const Boost: Story = {
  args: {
    recipe: boostRecipe,
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};

export const Demote: Story = {
  args: {
    recipe: demoteRecipe,
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};

export const Filter: Story = {
  args: {
    recipe: filterRecipe,
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};

export const Selected: Story = {
  args: {
    recipe: boostRecipe,
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: true,
  },
};

export const NoPopularity: Story = {
  args: {
    recipe: discoveryRecipe,
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};

export const NoTags: Story = {
  args: {
    recipe: {
      ...boostRecipe,
      id: 'no-tags',
      tags: undefined,
    },
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};

export const ManyConditions: Story = {
  args: {
    recipe: {
      ...filterRecipe,
      id: 'many-conditions',
      conditions: [
        { field: 'content', operator: 'contains', value: 'spam1' },
        { field: 'content', operator: 'contains', value: 'spam2' },
        { field: 'content', operator: 'contains', value: 'spam3' },
        { field: 'content', operator: 'contains', value: 'spam4' },
        { field: 'content', operator: 'contains', value: 'spam5' },
      ],
    },
    onClick: (recipe) => console.log('Clicked:', recipe),
    onApply: (recipe) => console.log('Applied:', recipe),
    isSelected: false,
  },
};
