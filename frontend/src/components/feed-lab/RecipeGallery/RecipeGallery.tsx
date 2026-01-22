'use client';

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Search, ChevronDown } from 'lucide-react';
import { RecipeCard, Recipe, RecipeCondition } from '../RecipeCard';

export type { Recipe, RecipeCondition };

export interface RecipeGalleryProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onApplyRecipe: (recipe: Recipe) => void;
  viewMode?: 'grid' | 'list';
}

type CategoryFilter = 'all' | 'engagement' | 'filtering' | 'discovery' | 'productivity';
type SortOption = 'name' | 'popularity' | 'weight';

const GalleryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const GalleryHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const GalleryTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SearchWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: ${({ theme }) => theme.spacing[3]};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;

  svg {
    width: 16px;
    height: 16px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]} ${theme.spacing[2]} ${theme.spacing[10]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const FilterDropdown = styled.div`
  position: relative;
`;

const FilterButton = styled.button<{ $isOpen: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  svg {
    width: 16px;
    height: 16px;
    transition: transform ${({ theme }) => theme.transitions.fast};
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 100;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-8px)')};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

const DropdownOption = styled.div<{ $isActive: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary[600] : theme.colors.text.primary};
  background: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary[50] : 'transparent'};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[50]};
  }

  &:first-child {
    border-radius: ${({ theme }) => `${theme.borderRadius.md} ${theme.borderRadius.md} 0 0`};
  }

  &:last-child {
    border-radius: ${({ theme }) => `0 0 ${theme.borderRadius.md} ${theme.borderRadius.md}`};
  }
`;

const SortSelect = styled.select`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`;

const RecipeGrid = styled.div<{ $viewMode: 'grid' | 'list' }>`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};

  ${({ $viewMode, theme }) =>
    $viewMode === 'grid'
      ? `
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      `
      : `
        grid-template-columns: 1fr;
      `}
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[16]};
  text-align: center;
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const categories: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'filtering', label: 'Filtering' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'productivity', label: 'Productivity' },
];

export const RecipeGallery: React.FC<RecipeGalleryProps> = ({
  recipes,
  onSelectRecipe,
  onApplyRecipe,
  viewMode = 'grid',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((recipe) => recipe.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(term) ||
          recipe.description.toLowerCase().includes(term) ||
          (recipe.tags && recipe.tags.some((tag) => tag.toLowerCase().includes(term)))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.popularity ?? 0) - (a.popularity ?? 0);
        case 'weight':
          return Math.abs(b.weight) - Math.abs(a.weight);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [recipes, categoryFilter, searchTerm, sortBy]);

  const handleCategorySelect = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setIsDropdownOpen(false);
  };

  const selectedCategoryLabel =
    categories.find((c) => c.value === categoryFilter)?.label ?? 'All';

  if (recipes.length === 0) {
    return (
      <GalleryContainer
        data-testid="recipe-gallery"
        data-layout={viewMode}
      >
        <GalleryHeader>
          <GalleryTitle>Recipe Gallery</GalleryTitle>
        </GalleryHeader>
        <EmptyState data-testid="recipe-gallery-empty">
          <EmptyTitle>No recipes available</EmptyTitle>
          <EmptyText>Check back later for new templates.</EmptyText>
        </EmptyState>
      </GalleryContainer>
    );
  }

  return (
    <GalleryContainer data-testid="recipe-gallery" data-layout={viewMode}>
      <GalleryHeader>
        <GalleryTitle>Recipe Gallery</GalleryTitle>

        <FilterBar>
          <SearchWrapper>
            <SearchIcon>
              <Search />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search recipes..."
              data-testid="recipe-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchWrapper>

          <FilterDropdown>
            <FilterButton
              data-testid="category-filter"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              $isOpen={isDropdownOpen}
            >
              {selectedCategoryLabel}
              <ChevronDown />
            </FilterButton>
            <DropdownMenu $isOpen={isDropdownOpen}>
              {categories.map((category) => (
                <DropdownOption
                  key={category.value}
                  role="option"
                  $isActive={categoryFilter === category.value}
                  onClick={() => handleCategorySelect(category.value)}
                >
                  {category.label}
                </DropdownOption>
              ))}
            </DropdownMenu>
          </FilterDropdown>

          <SortSelect
            data-testid="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="name">Sort by Name</option>
            <option value="popularity">Sort by Popularity</option>
            <option value="weight">Sort by Weight</option>
          </SortSelect>
        </FilterBar>
      </GalleryHeader>

      {filteredAndSortedRecipes.length === 0 ? (
        <EmptyState data-testid="recipe-gallery-empty">
          <EmptyTitle>No recipes found</EmptyTitle>
          <EmptyText>Try adjusting your search or filter.</EmptyText>
        </EmptyState>
      ) : (
        <RecipeGrid $viewMode={viewMode}>
          {filteredAndSortedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={onSelectRecipe}
              onApply={onApplyRecipe}
            />
          ))}
        </RecipeGrid>
      )}
    </GalleryContainer>
  );
};
