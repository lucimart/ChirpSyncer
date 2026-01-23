'use client';

import { memo, FC, useCallback, ChangeEvent } from 'react';
import styled from 'styled-components';
import { Filter, SortAsc, SortDesc, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Stack } from '@/components/ui/Stack';
import type { ContentFilters, PlatformType } from '@/lib/recycling';

export interface LibraryFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  availableTags?: string[];
  className?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FilterLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`;

const ScoreRange = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const RangeInput = styled.input`
  width: 60px;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ActiveFiltersRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ActiveFiltersLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const SelectWrapper = styled.div`
  min-width: 140px;
`;

const PLATFORM_OPTIONS = [
  { value: '', label: 'All platforms' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'bluesky', label: 'Bluesky' },
];

const SORT_OPTIONS = [
  { value: 'recycle_score', label: 'Recycle Score' },
  { value: 'engagement_score', label: 'Engagement' },
  { value: 'evergreen_score', label: 'Evergreen' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'recycle_count', label: 'Recycle Count' },
];

export const LibraryFilters: FC<LibraryFiltersProps> = memo(({
  filters,
  onFiltersChange,
  availableTags = [],
  className,
}) => {
  const handlePlatformChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      platform: value ? (value as PlatformType) : undefined,
    });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      sort_by: value as ContentFilters['sort_by'],
    });
  }, [filters, onFiltersChange]);

  const toggleSortOrder = useCallback(() => {
    onFiltersChange({
      ...filters,
      sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc',
    });
  }, [filters, onFiltersChange]);

  const handleMinScoreChange = useCallback((
    field: 'min_engagement_score' | 'min_evergreen_score' | 'min_recycle_score',
    value: string
  ) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    onFiltersChange({
      ...filters,
      [field]: numValue && !isNaN(numValue) ? Math.min(100, Math.max(0, numValue)) : undefined,
    });
  }, [filters, onFiltersChange]);

  const handleTagToggle = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange({
      sort_by: 'recycle_score',
      sort_order: 'desc',
    });
  }, [onFiltersChange]);

  const hasActiveFilters = Boolean(
    filters.platform ||
    filters.min_engagement_score ||
    filters.min_evergreen_score ||
    filters.min_recycle_score ||
    (filters.tags && filters.tags.length > 0)
  );

  const activeFilterCount = [
    filters.platform,
    filters.min_engagement_score,
    filters.min_evergreen_score,
    filters.min_recycle_score,
    ...(filters.tags || []),
  ].filter(Boolean).length;

  return (
    <Container data-testid="library-filters" className={className}>
      <FilterRow>
        <FilterGroup>
          <Filter size={16} />
          <FilterLabel>Platform</FilterLabel>
          <SelectWrapper>
            <Select
              value={filters.platform || ''}
              onChange={handlePlatformChange}
              options={PLATFORM_OPTIONS}
              size="sm"
            />
          </SelectWrapper>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Min Engagement</FilterLabel>
          <ScoreRange>
            <RangeInput
              type="number"
              min={0}
              max={100}
              value={filters.min_engagement_score || ''}
              onChange={(e) => handleMinScoreChange('min_engagement_score', e.target.value)}
              placeholder="0"
              aria-label="Minimum engagement score"
            />
          </ScoreRange>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Min Evergreen</FilterLabel>
          <ScoreRange>
            <RangeInput
              type="number"
              min={0}
              max={100}
              value={filters.min_evergreen_score || ''}
              onChange={(e) => handleMinScoreChange('min_evergreen_score', e.target.value)}
              placeholder="0"
              aria-label="Minimum evergreen score"
            />
          </ScoreRange>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Min Recycle</FilterLabel>
          <ScoreRange>
            <RangeInput
              type="number"
              min={0}
              max={100}
              value={filters.min_recycle_score || ''}
              onChange={(e) => handleMinScoreChange('min_recycle_score', e.target.value)}
              placeholder="0"
              aria-label="Minimum recycle score"
            />
          </ScoreRange>
        </FilterGroup>

        <FilterGroup style={{ marginLeft: 'auto' }}>
          <FilterLabel>Sort by</FilterLabel>
          <SelectWrapper>
            <Select
              value={filters.sort_by || 'recycle_score'}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
              size="sm"
            />
          </SelectWrapper>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSortOrder}
            aria-label={filters.sort_order === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            {filters.sort_order === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </Button>
        </FilterGroup>
      </FilterRow>

      {availableTags.length > 0 && (
        <FilterRow>
          <FilterLabel>Tags</FilterLabel>
          <TagsSection data-testid="tag-filters">
            {availableTags.map((tag) => {
              const isSelected = filters.tags?.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? 'primary' : 'neutral-soft'}
                  size="sm"
                  onClick={() => handleTagToggle(tag)}
                  style={{ cursor: 'pointer' }}
                >
                  {tag}
                </Badge>
              );
            })}
          </TagsSection>
        </FilterRow>
      )}

      {hasActiveFilters && (
        <ActiveFiltersRow>
          <ActiveFiltersLabel>
            {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
          </ActiveFiltersLabel>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={14} />
            Clear all
          </Button>
        </ActiveFiltersRow>
      )}
    </Container>
  );
});

LibraryFilters.displayName = 'LibraryFilters';
