import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { RecipeGallery, Recipe } from './RecipeGallery';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockRecipes: Recipe[] = [
  {
    id: 'boost-engagement',
    name: 'Boost High Engagement',
    description: 'Prioritize posts with high engagement.',
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
    description: 'Lower the priority of old posts.',
    category: 'productivity',
    type: 'demote',
    conditions: [{ field: 'age', operator: 'gt', value: 7 }],
    weight: -10,
    popularity: 89,
    tags: ['fresh'],
  },
  {
    id: 'filter-spam',
    name: 'Filter Spam',
    description: 'Remove spam posts.',
    category: 'filtering',
    type: 'filter',
    conditions: [{ field: 'content', operator: 'contains', value: 'spam' }],
    weight: 0,
    popularity: 312,
    tags: ['cleanup'],
  },
];

describe('RecipeGallery', () => {
  it('renders gallery with title', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    expect(screen.getByText('Recipe Gallery')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-gallery')).toBeInTheDocument();
  });

  it('renders all recipes', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    expect(screen.getByText('Boost High Engagement')).toBeInTheDocument();
    expect(screen.getByText('Demote Old Posts')).toBeInTheDocument();
    expect(screen.getByText('Filter Spam')).toBeInTheDocument();
  });

  it('renders search input', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    expect(screen.getByTestId('recipe-search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument();
  });

  it('filters recipes by search term', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.change(screen.getByTestId('recipe-search'), {
      target: { value: 'Boost' },
    });

    expect(screen.getByText('Boost High Engagement')).toBeInTheDocument();
    expect(screen.queryByText('Demote Old Posts')).not.toBeInTheDocument();
    expect(screen.queryByText('Filter Spam')).not.toBeInTheDocument();
  });

  it('filters recipes by category', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    // Open category dropdown
    fireEvent.click(screen.getByTestId('category-filter'));

    // Select filtering category
    fireEvent.click(screen.getByText('Filtering'));

    expect(screen.getByText('Filter Spam')).toBeInTheDocument();
    expect(screen.queryByText('Boost High Engagement')).not.toBeInTheDocument();
    expect(screen.queryByText('Demote Old Posts')).not.toBeInTheDocument();
  });

  it('sorts recipes by name (default)', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    const cards = screen.getAllByTestId(/recipe-card-/);
    // Alphabetical: Boost, Demote, Filter
    expect(cards[0]).toHaveTextContent('Boost High Engagement');
    expect(cards[1]).toHaveTextContent('Demote Old Posts');
    expect(cards[2]).toHaveTextContent('Filter Spam');
  });

  it('sorts recipes by popularity', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.change(screen.getByTestId('sort-select'), {
      target: { value: 'popularity' },
    });

    const cards = screen.getAllByTestId(/recipe-card-/);
    // By popularity: Filter (312), Boost (245), Demote (89)
    expect(cards[0]).toHaveTextContent('Filter Spam');
    expect(cards[1]).toHaveTextContent('Boost High Engagement');
    expect(cards[2]).toHaveTextContent('Demote Old Posts');
  });

  it('sorts recipes by weight', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.change(screen.getByTestId('sort-select'), {
      target: { value: 'weight' },
    });

    const cards = screen.getAllByTestId(/recipe-card-/);
    // By absolute weight: Boost (15), Demote (10), Filter (0)
    expect(cards[0]).toHaveTextContent('Boost High Engagement');
    expect(cards[1]).toHaveTextContent('Demote Old Posts');
    expect(cards[2]).toHaveTextContent('Filter Spam');
  });

  it('calls onSelectRecipe when card is clicked', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.click(screen.getByTestId('recipe-card-boost-engagement'));

    expect(onSelectRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'boost-engagement' })
    );
  });

  it('calls onApplyRecipe when Apply button is clicked', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    const applyButtons = screen.getAllByText('Apply');
    fireEvent.click(applyButtons[0]);

    expect(onApplyRecipe).toHaveBeenCalled();
  });

  it('renders empty state when no recipes', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={[]}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    expect(screen.getByTestId('recipe-gallery-empty')).toBeInTheDocument();
    expect(screen.getByText('No recipes available')).toBeInTheDocument();
  });

  it('renders empty state when search has no results', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.change(screen.getByTestId('recipe-search'), {
      target: { value: 'nonexistent recipe' },
    });

    expect(screen.getByTestId('recipe-gallery-empty')).toBeInTheDocument();
    expect(screen.getByText('No recipes found')).toBeInTheDocument();
  });

  it('renders in grid mode by default', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    expect(screen.getByTestId('recipe-gallery')).toHaveAttribute('data-layout', 'grid');
  });

  it('renders in list mode when specified', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
        viewMode="list"
      />
    );

    expect(screen.getByTestId('recipe-gallery')).toHaveAttribute('data-layout', 'list');
  });

  it('searches by tags', () => {
    const onSelectRecipe = jest.fn();
    const onApplyRecipe = jest.fn();
    renderWithTheme(
      <RecipeGallery
        recipes={mockRecipes}
        onSelectRecipe={onSelectRecipe}
        onApplyRecipe={onApplyRecipe}
      />
    );

    fireEvent.change(screen.getByTestId('recipe-search'), {
      target: { value: 'viral' },
    });

    expect(screen.getByText('Boost High Engagement')).toBeInTheDocument();
    expect(screen.queryByText('Filter Spam')).not.toBeInTheDocument();
  });
});
