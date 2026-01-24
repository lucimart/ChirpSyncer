import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { RecipeCard, Recipe } from './RecipeCard';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockRecipe: Recipe = {
  id: 'test-recipe',
  name: 'Test Recipe',
  description: 'A test recipe for unit tests.',
  category: 'engagement',
  type: 'boost',
  conditions: [
    { field: 'engagement', operator: 'gt', value: 100 },
  ],
  weight: 15,
  popularity: 245,
  tags: ['popular', 'viral'],
};

describe('RecipeCard', () => {
  it('renders recipe name and description', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('A test recipe for unit tests.')).toBeInTheDocument();
  });

  it('renders type indicator for boost type', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('type-indicator')).toHaveAttribute('data-type', 'boost');
  });

  it('renders type indicator for demote type', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const demoteRecipe: Recipe = { ...mockRecipe, type: 'demote', weight: -10 };
    renderWithTheme(
      <RecipeCard recipe={demoteRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('type-indicator')).toHaveAttribute('data-type', 'demote');
  });

  it('renders type indicator for filter type', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const filterRecipe: Recipe = { ...mockRecipe, type: 'filter', weight: 0 };
    renderWithTheme(
      <RecipeCard recipe={filterRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('type-indicator')).toHaveAttribute('data-type', 'filter');
  });

  it('renders category badge', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('category-badge')).toHaveTextContent('Engagement');
  });

  it('renders popularity score when provided', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('popularity-score')).toHaveTextContent('245');
  });

  it('does not render popularity score when undefined', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const recipeNoPopularity: Recipe = { ...mockRecipe, popularity: undefined };
    renderWithTheme(
      <RecipeCard recipe={recipeNoPopularity} onClick={onClick} onApply={onApply} />
    );

    expect(screen.queryByTestId('popularity-score')).not.toBeInTheDocument();
  });

  it('renders conditions preview', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('conditions-preview')).toHaveTextContent('1 condition');
  });

  it('renders conditions preview with plural', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const multiConditionRecipe: Recipe = {
      ...mockRecipe,
      conditions: [
        { field: 'engagement', operator: 'gt', value: 100 },
        { field: 'age', operator: 'lt', value: 7 },
      ],
    };
    renderWithTheme(
      <RecipeCard recipe={multiConditionRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('conditions-preview')).toHaveTextContent('2 conditions');
  });

  it('renders positive weight with plus sign', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('weight-indicator')).toHaveTextContent('+15');
  });

  it('renders negative weight correctly', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const negativeRecipe: Recipe = { ...mockRecipe, weight: -10 };
    renderWithTheme(
      <RecipeCard recipe={negativeRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByTestId('weight-indicator')).toHaveTextContent('-10');
  });

  it('renders tags when provided', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    expect(screen.getByText('popular')).toBeInTheDocument();
    expect(screen.getByText('viral')).toBeInTheDocument();
  });

  it('does not render tags when undefined', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    const recipeNoTags: Recipe = { ...mockRecipe, tags: undefined };
    renderWithTheme(
      <RecipeCard recipe={recipeNoTags} onClick={onClick} onApply={onApply} />
    );

    expect(screen.queryByText('popular')).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    fireEvent.click(screen.getByTestId('recipe-card-test-recipe'));

    expect(onClick).toHaveBeenCalledWith(mockRecipe);
  });

  it('calls onApply when Apply button is clicked', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    fireEvent.click(screen.getByText('Apply'));

    expect(onApply).toHaveBeenCalledWith(mockRecipe);
    expect(onClick).not.toHaveBeenCalled(); // stopPropagation
  });

  it('shows selected state', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} isSelected={true} />
    );

    expect(screen.getByTestId('recipe-card-test-recipe')).toHaveAttribute('data-selected', 'true');
  });

  it('shows hover state', () => {
    const onClick = jest.fn();
    const onApply = jest.fn();
    renderWithTheme(
      <RecipeCard recipe={mockRecipe} onClick={onClick} onApply={onApply} />
    );

    const card = screen.getByTestId('recipe-card-test-recipe');
    expect(card).toHaveAttribute('data-hovered', 'false');

    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute('data-hovered', 'true');

    fireEvent.mouseLeave(card);
    expect(card).toHaveAttribute('data-hovered', 'false');
  });
});
