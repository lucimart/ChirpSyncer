import type { Meta, StoryObj } from '@storybook/react';
import { RecipeGallery, Recipe } from './RecipeGallery';

const meta: Meta<typeof RecipeGallery> = {
  title: 'Components/FeedLab/RecipeGallery',
  component: RecipeGallery,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RecipeGallery>;

const mockRecipes: Recipe[] = [
  {
    id: 'boost-engagement',
    name: 'Boost High Engagement',
    description: 'Prioritize posts with high engagement metrics.',
    category: 'engagement',
    type: 'boost',
    conditions: [{ field: 'engagement', operator: 'gt', value: 100 }],
    weight: 15,
    popularity: 245,
    tags: ['popular', 'viral'],
  },
  {
    id: 'demote-old',
    name: 'Demote Old Posts',
    description: 'Lower the priority of posts older than a week.',
    category: 'productivity',
    type: 'demote',
    conditions: [{ field: 'age', operator: 'gt', value: 7 }],
    weight: -10,
    popularity: 89,
    tags: ['fresh', 'time-based'],
  },
  {
    id: 'filter-spam',
    name: 'Filter Spam Keywords',
    description: 'Remove posts containing common spam keywords.',
    category: 'filtering',
    type: 'filter',
    conditions: [
      { field: 'content', operator: 'contains', value: 'giveaway' },
      { field: 'content', operator: 'contains', value: 'free bitcoin' },
    ],
    weight: 0,
    popularity: 312,
    tags: ['spam', 'cleanup'],
  },
  {
    id: 'discovery-new',
    name: 'Discover New Voices',
    description: 'Boost posts from accounts you do not follow.',
    category: 'discovery',
    type: 'boost',
    conditions: [{ field: 'author', operator: 'equals', value: 'not_following' }],
    weight: 8,
    popularity: 156,
    tags: ['explore', 'new accounts'],
  },
  {
    id: 'filter-retweets',
    name: 'Hide Retweets',
    description: 'Filter out retweets to see only original content.',
    category: 'filtering',
    type: 'filter',
    conditions: [{ field: 'content', operator: 'regex', value: '^RT @' }],
    weight: 0,
    popularity: 178,
    tags: ['original', 'cleanup'],
  },
  {
    id: 'boost-media',
    name: 'Prioritize Media Posts',
    description: 'Boost posts that include images or videos.',
    category: 'engagement',
    type: 'boost',
    conditions: [{ field: 'content', operator: 'contains', value: 'media' }],
    weight: 10,
    popularity: 203,
    tags: ['media', 'visual'],
  },
];

export const Default: Story = {
  args: {
    recipes: mockRecipes,
    onSelectRecipe: (recipe) => console.log('Selected:', recipe),
    onApplyRecipe: (recipe) => console.log('Applied:', recipe),
    viewMode: 'grid',
  },
};

export const ListView: Story = {
  args: {
    recipes: mockRecipes,
    onSelectRecipe: (recipe) => console.log('Selected:', recipe),
    onApplyRecipe: (recipe) => console.log('Applied:', recipe),
    viewMode: 'list',
  },
};

export const Empty: Story = {
  args: {
    recipes: [],
    onSelectRecipe: (recipe) => console.log('Selected:', recipe),
    onApplyRecipe: (recipe) => console.log('Applied:', recipe),
    viewMode: 'grid',
  },
};

export const SingleRecipe: Story = {
  args: {
    recipes: [mockRecipes[0]],
    onSelectRecipe: (recipe) => console.log('Selected:', recipe),
    onApplyRecipe: (recipe) => console.log('Applied:', recipe),
    viewMode: 'grid',
  },
};

export const ManyRecipes: Story = {
  args: {
    recipes: [
      ...mockRecipes,
      ...mockRecipes.map((r, i) => ({ ...r, id: `${r.id}-copy-${i}`, name: `${r.name} (Copy)` })),
    ],
    onSelectRecipe: (recipe) => console.log('Selected:', recipe),
    onApplyRecipe: (recipe) => console.log('Applied:', recipe),
    viewMode: 'grid',
  },
};
