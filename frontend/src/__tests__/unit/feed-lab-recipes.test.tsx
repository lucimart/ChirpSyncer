/**
 * Feed Lab Recipes Tests (TDD)
 *
 * Tests for RecipeGallery, RecipeCard, and RecipeDetail components
 * Based on UI_UX_INNOVATIONS_IMPLEMENTATION.md spec (P2.2 - Feed Lab Recipes)
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Component imports (to be implemented)
import { RecipeGallery } from '@/components/feed-lab/RecipeGallery';
import { RecipeCard } from '@/components/feed-lab/RecipeCard';
import { RecipeDetail } from '@/components/feed-lab/RecipeDetail';

// Types for Feed Lab Recipes feature
export interface RecipeCondition {
  field: 'author' | 'content' | 'engagement' | 'age' | 'platform';
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex';
  value: string | number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'filtering' | 'discovery' | 'productivity';
  type: 'boost' | 'demote' | 'filter';
  conditions: RecipeCondition[];
  weight: number;
  popularity?: number;
  tags?: string[];
}

// Theme wrapper
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

// Mock recipes
const mockRecipes: Recipe[] = [
  {
    id: 'recipe-1',
    name: 'Boost High Engagement',
    description: 'Prioritize posts with high likes and retweets',
    category: 'engagement',
    type: 'boost',
    conditions: [{ field: 'engagement', operator: 'gt', value: 100 }],
    weight: 50,
    popularity: 85,
    tags: ['popular', 'engagement'],
  },
  {
    id: 'recipe-2',
    name: 'Filter Spam Keywords',
    description: 'Hide posts containing common spam phrases',
    category: 'filtering',
    type: 'filter',
    conditions: [{ field: 'content', operator: 'contains', value: 'buy now' }],
    weight: -100,
    popularity: 72,
    tags: ['spam', 'cleanup'],
  },
  {
    id: 'recipe-3',
    name: 'Discover New Authors',
    description: 'Boost posts from accounts you rarely see',
    category: 'discovery',
    type: 'boost',
    conditions: [{ field: 'author', operator: 'equals', value: 'new' }],
    weight: 30,
    popularity: 45,
    tags: ['discovery'],
  },
  {
    id: 'recipe-4',
    name: 'Fresh Content Only',
    description: 'Prioritize recent posts over older ones',
    category: 'productivity',
    type: 'demote',
    conditions: [{ field: 'age', operator: 'gt', value: 24 }],
    weight: -40,
    popularity: 60,
    tags: ['fresh', 'recent'],
  },
];

// ============================================================================
// RecipeGallery Component Tests
// ============================================================================

describe('RecipeGallery Component', () => {
  const defaultProps = {
    recipes: mockRecipes,
    onSelectRecipe: jest.fn(),
    onApplyRecipe: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders gallery with data-testid="recipe-gallery"', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByTestId('recipe-gallery')).toBeInTheDocument();
    });

    it('renders RecipeCard for each recipe', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByTestId('recipe-card-recipe-1')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-card-recipe-2')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-card-recipe-3')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-card-recipe-4')).toBeInTheDocument();
    });

    it('shows gallery title', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByText(/recipe gallery|recipes|templates/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no recipes', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} recipes={[]} />);

      expect(screen.getByTestId('recipe-gallery-empty')).toBeInTheDocument();
      expect(screen.getByText(/no recipes|no templates/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows category filter', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByTestId('category-filter')).toBeInTheDocument();
    });

    it('filters recipes by category', async () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      const filter = screen.getByTestId('category-filter');
      fireEvent.click(filter);

      const engagementOption = screen.getByRole('option', { name: /engagement/i });
      fireEvent.click(engagementOption);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-card-recipe-1')).toBeInTheDocument();
        expect(screen.queryByTestId('recipe-card-recipe-2')).not.toBeInTheDocument();
      });
    });

    it('shows "All" category option', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      const filter = screen.getByTestId('category-filter');
      fireEvent.click(filter);

      expect(screen.getByRole('option', { name: /all/i })).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('shows search input', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByTestId('recipe-search')).toBeInTheDocument();
    });

    it('filters recipes by search term', async () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      const searchInput = screen.getByTestId('recipe-search');
      fireEvent.change(searchInput, { target: { value: 'spam' } });

      await waitFor(() => {
        expect(screen.getByTestId('recipe-card-recipe-2')).toBeInTheDocument();
        expect(screen.queryByTestId('recipe-card-recipe-1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('shows sort options', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    });

    it('sorts by popularity when selected', async () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      const sortSelect = screen.getByTestId('sort-select');
      fireEvent.change(sortSelect, { target: { value: 'popularity' } });

      await waitFor(() => {
        const cards = screen.getAllByTestId(/^recipe-card-/);
        expect(cards[0]).toHaveAttribute('data-testid', 'recipe-card-recipe-1'); // popularity 85
      });
    });
  });

  describe('Recipe Selection', () => {
    it('calls onSelectRecipe when card is clicked', () => {
      const onSelectRecipe = jest.fn();
      renderWithTheme(<RecipeGallery {...defaultProps} onSelectRecipe={onSelectRecipe} />);

      fireEvent.click(screen.getByTestId('recipe-card-recipe-1'));

      expect(onSelectRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'recipe-1' })
      );
    });
  });

  describe('Grid Layout', () => {
    it('renders in grid layout', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} />);

      const gallery = screen.getByTestId('recipe-gallery');
      expect(gallery).toHaveAttribute('data-layout', 'grid');
    });

    it('supports list view mode', () => {
      renderWithTheme(<RecipeGallery {...defaultProps} viewMode="list" />);

      const gallery = screen.getByTestId('recipe-gallery');
      expect(gallery).toHaveAttribute('data-layout', 'list');
    });
  });
});

// ============================================================================
// RecipeCard Component Tests
// ============================================================================

describe('RecipeCard Component', () => {
  const defaultRecipe: Recipe = mockRecipes[0];
  const defaultProps = {
    recipe: defaultRecipe,
    onClick: jest.fn(),
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="recipe-card-{id}"', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('recipe-card-recipe-1')).toBeInTheDocument();
    });

    it('shows recipe name', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('Boost High Engagement')).toBeInTheDocument();
    });

    it('shows recipe description', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('Prioritize posts with high likes and retweets')).toBeInTheDocument();
    });

    it('shows category badge', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('category-badge')).toBeInTheDocument();
      expect(screen.getByTestId('category-badge')).toHaveTextContent(/engagement/i);
    });

    it('shows type indicator', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('type-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('type-indicator')).toHaveAttribute('data-type', 'boost');
    });
  });

  describe('Preview', () => {
    it('shows conditions preview', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('conditions-preview')).toBeInTheDocument();
    });

    it('shows weight indicator', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('weight-indicator')).toBeInTheDocument();
      expect(screen.getByText(/\+50/)).toBeInTheDocument();
    });
  });

  describe('Popularity', () => {
    it('shows popularity score when available', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByTestId('popularity-score')).toBeInTheDocument();
      expect(screen.getByText(/85/)).toBeInTheDocument();
    });

    it('does not show popularity when not available', () => {
      const noPopularityRecipe = { ...defaultRecipe, popularity: undefined };
      renderWithTheme(<RecipeCard {...defaultProps} recipe={noPopularityRecipe} />);

      expect(screen.queryByTestId('popularity-score')).not.toBeInTheDocument();
    });
  });

  describe('Tags', () => {
    it('shows tags when available', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByText('popular')).toBeInTheDocument();
      expect(screen.getByText('engagement')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = jest.fn();
      renderWithTheme(<RecipeCard {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByTestId('recipe-card-recipe-1'));

      expect(onClick).toHaveBeenCalledWith(defaultRecipe);
    });

    it('shows apply button', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /apply|use/i })).toBeInTheDocument();
    });

    it('calls onApply when apply button is clicked', () => {
      const onApply = jest.fn();
      renderWithTheme(<RecipeCard {...defaultProps} onApply={onApply} />);

      fireEvent.click(screen.getByRole('button', { name: /apply|use/i }));

      expect(onApply).toHaveBeenCalledWith(defaultRecipe);
    });

    it('apply button click does not trigger card click', () => {
      const onClick = jest.fn();
      const onApply = jest.fn();
      renderWithTheme(<RecipeCard {...defaultProps} onClick={onClick} onApply={onApply} />);

      fireEvent.click(screen.getByRole('button', { name: /apply|use/i }));

      expect(onApply).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('shows hover state', async () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      const card = screen.getByTestId('recipe-card-recipe-1');
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(card).toHaveAttribute('data-hovered', 'true');
      });
    });

    it('shows selected state', () => {
      renderWithTheme(<RecipeCard {...defaultProps} isSelected />);

      const card = screen.getByTestId('recipe-card-recipe-1');
      expect(card).toHaveAttribute('data-selected', 'true');
    });

    it('uses correct color for boost type', () => {
      renderWithTheme(<RecipeCard {...defaultProps} />);

      const indicator = screen.getByTestId('type-indicator');
      expect(indicator).toHaveAttribute('data-type', 'boost');
    });

    it('uses correct color for filter type', () => {
      const filterRecipe = mockRecipes[1];
      renderWithTheme(<RecipeCard {...defaultProps} recipe={filterRecipe} />);

      const indicator = screen.getByTestId('type-indicator');
      expect(indicator).toHaveAttribute('data-type', 'filter');
    });

    it('uses correct color for demote type', () => {
      const demoteRecipe = mockRecipes[3];
      renderWithTheme(<RecipeCard {...defaultProps} recipe={demoteRecipe} />);

      const indicator = screen.getByTestId('type-indicator');
      expect(indicator).toHaveAttribute('data-type', 'demote');
    });
  });
});

// ============================================================================
// RecipeDetail Component Tests
// ============================================================================

describe('RecipeDetail Component', () => {
  const defaultRecipe: Recipe = mockRecipes[0];
  const defaultProps = {
    recipe: defaultRecipe,
    onApply: jest.fn(),
    onClose: jest.fn(),
    onCustomize: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with data-testid="recipe-detail"', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByTestId('recipe-detail')).toBeInTheDocument();
    });

    it('shows recipe name as title', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /boost high engagement/i })).toBeInTheDocument();
    });

    it('shows full description', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByText('Prioritize posts with high likes and retweets')).toBeInTheDocument();
    });

    it('shows close button', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('Conditions Display', () => {
    it('shows all conditions', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByTestId('conditions-list')).toBeInTheDocument();
    });

    it('shows condition field', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      const conditionsList = screen.getByTestId('conditions-list');
      expect(within(conditionsList).getByText(/engagement/i)).toBeInTheDocument();
    });

    it('shows condition operator', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByText(/greater than|>/i)).toBeInTheDocument();
    });

    it('shows condition value', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByText(/100/)).toBeInTheDocument();
    });
  });

  describe('Weight Display', () => {
    it('shows weight value', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByTestId('weight-display')).toBeInTheDocument();
      expect(screen.getByTestId('weight-display')).toHaveTextContent(/\+50/);
    });

    it('shows weight slider for preview', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('shows apply button', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByRole('button', { name: /apply recipe/i })).toBeInTheDocument();
    });

    it('shows customize button', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
    });

    it('calls onApply when apply button is clicked', () => {
      const onApply = jest.fn();
      renderWithTheme(<RecipeDetail {...defaultProps} onApply={onApply} />);

      fireEvent.click(screen.getByRole('button', { name: /apply recipe/i }));

      expect(onApply).toHaveBeenCalledWith(defaultRecipe);
    });

    it('calls onCustomize when customize button is clicked', () => {
      const onCustomize = jest.fn();
      renderWithTheme(<RecipeDetail {...defaultProps} onCustomize={onCustomize} />);

      fireEvent.click(screen.getByRole('button', { name: /customize/i }));

      expect(onCustomize).toHaveBeenCalledWith(defaultRecipe);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      renderWithTheme(<RecipeDetail {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Preview Section', () => {
    it('shows preview section', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByTestId('recipe-preview')).toBeInTheDocument();
    });

    it('shows example of how rule affects feed', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      expect(screen.getByText(/preview|example|how it works/i)).toBeInTheDocument();
    });
  });

  describe('Similar Recipes', () => {
    it('shows similar recipes when provided', () => {
      const similarRecipes = [mockRecipes[2]];
      renderWithTheme(<RecipeDetail {...defaultProps} similarRecipes={similarRecipes} />);

      expect(screen.getByTestId('similar-recipes')).toBeInTheDocument();
    });

    it('hides similar recipes section when empty', () => {
      renderWithTheme(<RecipeDetail {...defaultProps} similarRecipes={[]} />);

      expect(screen.queryByTestId('similar-recipes')).not.toBeInTheDocument();
    });
  });

  describe('Customization Preview', () => {
    it('allows adjusting weight before applying', async () => {
      renderWithTheme(<RecipeDetail {...defaultProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });

      await waitFor(() => {
        expect(screen.getByTestId('weight-display')).toHaveTextContent(/\+75/);
      });
    });

    it('applies with modified weight', async () => {
      const onApply = jest.fn();
      renderWithTheme(<RecipeDetail {...defaultProps} onApply={onApply} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });

      fireEvent.click(screen.getByRole('button', { name: /apply recipe/i }));

      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 75 })
      );
    });
  });
});
