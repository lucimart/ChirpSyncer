'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { RecipeDetail } from './RecipeDetail';
import type { Recipe } from '../RecipeCard';

const meta: Meta<typeof RecipeDetail> = {
  title: 'Components/FeedLab/RecipeDetail',
  component: RecipeDetail,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <div style={{ padding: '2rem', background: '#f5f5f5' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RecipeDetail>;

const boostRecipe: Recipe = {
  id: 'boost-quality',
  name: 'Boost Quality Content',
  description: 'Increase visibility of high-quality, engaging posts from verified accounts with strong engagement metrics.',
  type: 'boost',
  conditions: [
    { field: 'engagement', operator: 'gt', value: 100 },
    { field: 'author', operator: 'contains', value: 'verified' },
  ],
  weight: 50,
  category: 'engagement',
  popularity: 85,
};

const filterRecipe: Recipe = {
  id: 'filter-spam',
  name: 'Filter Spam Content',
  description: 'Reduce visibility of low-quality spam posts that contain promotional links or suspicious patterns.',
  type: 'filter',
  conditions: [
    { field: 'content', operator: 'contains', value: 'buy now' },
    { field: 'content', operator: 'regex', value: 'https?://bit\\.ly' },
  ],
  weight: -75,
  category: 'filtering',
  popularity: 92,
};

const similarRecipes: Recipe[] = [
  {
    id: 'similar-1',
    name: 'Boost Viral Content',
    description: 'Increase visibility of viral posts',
    type: 'boost',
    conditions: [{ field: 'engagement', operator: 'gt', value: 1000 }],
    weight: 60,
    category: 'engagement',
    popularity: 78,
  },
  {
    id: 'similar-2',
    name: 'Featured Authors',
    description: 'Boost posts from featured accounts',
    type: 'boost',
    conditions: [{ field: 'author', operator: 'equals', value: 'featured' }],
    weight: 40,
    category: 'discovery',
    popularity: 65,
  },
];

export const Default: Story = {
  args: {
    recipe: boostRecipe,
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
  },
};

export const FilterRecipe: Story = {
  args: {
    recipe: filterRecipe,
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
  },
};

export const WithSimilarRecipes: Story = {
  args: {
    recipe: boostRecipe,
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
    similarRecipes,
  },
};

export const ManyConditions: Story = {
  args: {
    recipe: {
      id: 'complex',
      name: 'Complex Multi-Condition Rule',
      description: 'A rule with many conditions to test layout and scrolling behavior.',
      type: 'boost',
      conditions: [
        { field: 'engagement', operator: 'gt', value: 50 },
        { field: 'author', operator: 'contains', value: 'trusted' },
        { field: 'content', operator: 'contains', value: 'news' },
        { field: 'platform', operator: 'equals', value: 'twitter' },
        { field: 'age', operator: 'lt', value: 24 },
      ],
      weight: 35,
      category: 'discovery',
      popularity: 45,
    },
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
  },
};

export const NegativeWeight: Story = {
  args: {
    recipe: {
      ...filterRecipe,
      weight: -100,
    },
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
  },
};

export const ZeroWeight: Story = {
  args: {
    recipe: {
      ...boostRecipe,
      weight: 0,
    },
    onApply: (recipe) => console.log('Applied recipe:', recipe),
    onClose: () => console.log('Closed'),
    onCustomize: (recipe) => console.log('Customize recipe:', recipe),
  },
};
