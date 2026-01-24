import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { RecipeDetail } from './RecipeDetail';
import type { Recipe } from '../RecipeCard';

const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('RecipeDetail', () => {
  const mockRecipe: Recipe = {
    id: 'test-recipe',
    name: 'Test Recipe',
    description: 'A test recipe for unit testing',
    type: 'boost',
    conditions: [
      { field: 'engagement', operator: 'gt', value: 100 },
      { field: 'author', operator: 'contains', value: 'verified' },
    ],
    weight: 50,
    category: 'engagement',
    popularity: 85,
  };

  const similarRecipes: Recipe[] = [
    {
      id: 'similar-1',
      name: 'Similar Recipe 1',
      description: 'First similar recipe',
      type: 'boost',
      conditions: [{ field: 'engagement', operator: 'gt', value: 200 }],
      weight: 60,
      category: 'engagement',
      popularity: 70,
    },
    {
      id: 'similar-2',
      name: 'Similar Recipe 2',
      description: 'Second similar recipe',
      type: 'boost',
      conditions: [{ field: 'author', operator: 'equals', value: 'featured' }],
      weight: 40,
      category: 'discovery',
      popularity: 55,
    },
  ];

  const mockOnApply = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnCustomize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recipe name and description', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('A test recipe for unit testing')).toBeInTheDocument();
  });

  it('renders all conditions', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    const conditionsList = screen.getByTestId('conditions-list');
    expect(conditionsList).toBeInTheDocument();
    expect(screen.getByText('engagement')).toBeInTheDocument();
    expect(screen.getByText('greater than')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('author')).toBeInTheDocument();
    expect(screen.getByText('contains')).toBeInTheDocument();
    expect(screen.getByText('verified')).toBeInTheDocument();
  });

  it('displays weight with correct formatting', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    const weightDisplay = screen.getByTestId('weight-display');
    expect(weightDisplay).toHaveTextContent('+50');
  });

  it('displays negative weight correctly', () => {
    const negativeRecipe = { ...mockRecipe, weight: -30 };

    renderWithTheme(
      <RecipeDetail
        recipe={negativeRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    const weightDisplay = screen.getByTestId('weight-display');
    expect(weightDisplay).toHaveTextContent('-30');
  });

  it('allows weight adjustment via slider', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    const slider = screen.getByRole('slider', { name: /adjust weight/i });
    fireEvent.change(slider, { target: { value: '75' } });

    const weightDisplay = screen.getByTestId('weight-display');
    expect(weightDisplay).toHaveTextContent('+75');
  });

  it('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onApply with updated weight when Apply is clicked', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    // Change weight
    const slider = screen.getByRole('slider', { name: /adjust weight/i });
    fireEvent.change(slider, { target: { value: '80' } });

    // Click apply
    fireEvent.click(screen.getByRole('button', { name: /apply recipe/i }));

    expect(mockOnApply).toHaveBeenCalledWith({
      ...mockRecipe,
      weight: 80,
    });
  });

  it('calls onCustomize when Customize is clicked', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /customize/i }));
    expect(mockOnCustomize).toHaveBeenCalledWith(mockRecipe);
  });

  it('shows effect preview section', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    const preview = screen.getByTestId('recipe-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveTextContent(/posts matching the conditions/i);
  });

  it('renders similar recipes when provided', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
        similarRecipes={similarRecipes}
      />
    );

    const similarSection = screen.getByTestId('similar-recipes');
    expect(similarSection).toBeInTheDocument();
    expect(screen.getByText('Similar Recipe 1')).toBeInTheDocument();
    expect(screen.getByText('Similar Recipe 2')).toBeInTheDocument();
  });

  it('does not render similar recipes section when none provided', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
      />
    );

    expect(screen.queryByTestId('similar-recipes')).not.toBeInTheDocument();
  });

  it('does not render similar recipes section when empty array provided', () => {
    renderWithTheme(
      <RecipeDetail
        recipe={mockRecipe}
        onApply={mockOnApply}
        onClose={mockOnClose}
        onCustomize={mockOnCustomize}
        similarRecipes={[]}
      />
    );

    expect(screen.queryByTestId('similar-recipes')).not.toBeInTheDocument();
  });
});
