'use client';

import { memo, FC, useCallback } from 'react';
import styled from 'styled-components';
import { X, Filter } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/ui/Stack';
import type { InboxFilters, MessageType } from '@/lib/inbox';
import type { PlatformType } from '@/lib/connectors';

export interface MessageFiltersProps {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
}

const FiltersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-end;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  min-width: 140px;
`;

const FilterLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StyledSelect = styled.select`
  width: 100%;
  height: 36px;
  padding: 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.dark};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'mastodon', label: 'Mastodon' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'threads', label: 'Threads' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'mention', label: 'Mention' },
  { value: 'reply', label: 'Reply' },
  { value: 'dm', label: 'DM' },
  { value: 'comment', label: 'Comment' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

function hasActiveFilters(filters: InboxFilters): boolean {
  return (
    (filters.platform !== undefined && filters.platform !== 'all') ||
    (filters.message_type !== undefined && filters.message_type !== 'all') ||
    filters.is_read !== undefined
  );
}

export const MessageFilters: FC<MessageFiltersProps> = memo(({ filters, onChange }) => {
  const handlePlatformChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as PlatformType | 'all';
      onChange({
        ...filters,
        platform: value,
      });
    },
    [filters, onChange]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as MessageType | 'all';
      onChange({
        ...filters,
        message_type: value,
      });
    },
    [filters, onChange]
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      let is_read: boolean | undefined;

      if (value === 'unread') {
        is_read = false;
      } else if (value === 'read') {
        is_read = true;
      } else {
        is_read = undefined;
      }

      onChange({
        ...filters,
        is_read,
      });
    },
    [filters, onChange]
  );

  const handleClearFilters = useCallback(() => {
    onChange({
      platform: 'all',
      message_type: 'all',
      is_read: undefined,
    });
  }, [onChange]);

  const getStatusValue = () => {
    if (filters.is_read === false) return 'unread';
    if (filters.is_read === true) return 'read';
    return 'all';
  };

  const showClearButton = hasActiveFilters(filters);

  return (
    <FiltersContainer>
      <FilterGroup>
        <FilterLabel htmlFor="platform-filter">Platform</FilterLabel>
        <StyledSelect
          id="platform-filter"
          aria-label="Platform"
          value={filters.platform || 'all'}
          onChange={handlePlatformChange}
        >
          {PLATFORM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StyledSelect>
      </FilterGroup>

      <FilterGroup>
        <FilterLabel htmlFor="type-filter">Type</FilterLabel>
        <StyledSelect
          id="type-filter"
          aria-label="Type"
          value={filters.message_type || 'all'}
          onChange={handleTypeChange}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StyledSelect>
      </FilterGroup>

      <FilterGroup>
        <FilterLabel htmlFor="status-filter">Status</FilterLabel>
        <StyledSelect
          id="status-filter"
          aria-label="Status"
          value={getStatusValue()}
          onChange={handleStatusChange}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StyledSelect>
      </FilterGroup>

      {showClearButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          leftIcon={<X size={16} />}
        >
          Clear filters
        </Button>
      )}
    </FiltersContainer>
  );
});

MessageFilters.displayName = 'MessageFilters';
